pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "@sablier/shared-contracts/compound/Exponential.sol";
import "@sablier/shared-contracts/interfaces/ICERC20.sol";
import "@sablier/shared-contracts/lifecycle/OwnableWithoutRenounce.sol";
import "@sablier/shared-contracts/lifecycle/PausableWithoutRenounce.sol";

import "./interfaces/ICTokenManager.sol";
import "./interfaces/IERC1620.sol";
import "./Types.sol";

/**
 * @title Sablier's Money Streaming
 * @author Sablier
 */
contract Sablier is IERC1620, OwnableWithoutRenounce, PausableWithoutRenounce, Exponential, ReentrancyGuard {
    /*** Storage Properties ***/

    /**
     * @notice In Exp terms, 1e18 is 1, or 100%
     */
    uint256 constant hundredPercent = 1e18;

    /**
     * @notice In Exp terms, 1e16 is 0.01, or 1%
     */
    uint256 constant onePercent = 1e16;

    /**
     * @notice Stores information about the initial state of the underlying of the cToken.
     */
    mapping(uint256 => Types.CompoundingStreamVars) private compoundingStreamsVars;

    /**
     * @notice An instance of CTokenManager, responsible for whitelisting and discarding cTokens.
     */
    ICTokenManager public cTokenManager;

    /**
     * @notice The amount of interest has been accrued per token address.
     */
    mapping(address => uint256) private earnings;

    /**
     * @notice The percentage fee charged by the contract on the accrued interest.
     */
    Exp public fee;

    /**
     * @notice Counter for new stream ids.
     */
    uint256 public nextStreamId;

    /**
     * @notice The stream objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.Stream) private streams;

    /*** Events ***/

    /**
     * @notice Emits when a compounding stream is successfully created.
     */
    event CreateCompoundingStream(
        uint256 indexed streamId,
        uint256 exchangeRate,
        uint256 senderSharePercentage,
        uint256 recipientSharePercentage
    );

    /**
     * @notice Emits when the owner discards a cToken.
     */
    event PayInterest(
        uint256 indexed streamId,
        uint256 senderInterest,
        uint256 recipientInterest,
        uint256 sablierInterest
    );

    /**
     * @notice Emits when the owner takes the earnings.
     */
    event TakeEarnings(address indexed tokenAddress, uint256 indexed amount);

    /**
     * @notice Emits when the owner updates the percentage fee.
     */
    event UpdateFee(uint256 indexed fee);

    /*** Modifiers ***/

    /**
     * @dev Throws if the caller is not the sender of the recipient of the stream.
     */
    modifier onlySenderOrRecipient(uint256 streamId) {
        require(
            msg.sender == streams[streamId].sender || msg.sender == streams[streamId].recipient,
            "caller is not the sender or the recipient of the stream"
        );
        _;
    }

    /**
     * @dev Throws if the provided id does not point to a valid stream.
     */
    modifier streamExists(uint256 streamId) {
        require(streams[streamId].isEntity, "stream does not exist");
        _;
    }

    /**
     * @dev Throws if the provided id does not point to a valid compounding stream.
     */
    modifier compoundingStreamExists(uint256 streamId) {
        require(compoundingStreamsVars[streamId].isEntity, "compounding stream does not exist");
        _;
    }

    /*** Contract Logic Starts Here */

    constructor(address cTokenManagerAddress) public {
        require(cTokenManagerAddress != address(0x00), "cTokenManager contract is the zero address");
        OwnableWithoutRenounce.initialize(msg.sender);
        PausableWithoutRenounce.initialize(msg.sender);
        cTokenManager = ICTokenManager(cTokenManagerAddress);
        nextStreamId = 1;
    }

    /*** Owner Functions ***/

    struct UpdateFeeLocalVars {
        MathError mathErr;
        uint256 feeMantissa;
    }

    /**
     * @notice Updates the Sablier fee.
     * @dev Throws if the caller is not the owner of the contract.
     *  Throws if `feePercentage` is not lower or equal to 100.
     * @param feePercentage The new fee as a percentage.
     */
    function updateFee(uint256 feePercentage) external onlyOwner {
        require(feePercentage <= 100, "fee percentage higher than 100%");
        UpdateFeeLocalVars memory vars;

        /* `feePercentage` will be stored as a mantissa, so we scale it up by one percent in Exp terms. */
        (vars.mathErr, vars.feeMantissa) = mulUInt(feePercentage, onePercent);
        /*
         * `mulUInt` can only return MathError.INTEGER_OVERFLOW but we control `onePercent`
         * and we know `feePercentage` is maximum 100.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        fee = Exp({ mantissa: vars.feeMantissa });
        emit UpdateFee(feePercentage);
    }

    struct TakeEarningsLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Withdraws the earnings for the given token address.
     * @dev Throws if `amount` exceeds the available balance.
     * @param tokenAddress The address of the token to withdraw earnings for.
     * @param amount The amount of tokens to withdraw.
     */
    function takeEarnings(address tokenAddress, uint256 amount) external onlyOwner nonReentrant {
        require(cTokenManager.isCToken(tokenAddress), "cToken is not whitelisted");
        require(amount > 0, "amount is zero");
        require(earnings[tokenAddress] >= amount, "amount exceeds the available balance");

        TakeEarningsLocalVars memory vars;
        (vars.mathErr, earnings[tokenAddress]) = subUInt(earnings[tokenAddress], amount);
        /*
         * `subUInt` can only return MathError.INTEGER_UNDERFLOW but we know `earnings[tokenAddress]`
         * is at least as big as `amount`.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        emit TakeEarnings(tokenAddress, amount);
        require(IERC20(tokenAddress).transfer(msg.sender, amount), "token transfer failure");
    }

    /*** View Functions ***/

    /**
     * @notice Returns the compounding stream with all its properties.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream to query.
     * @return The stream object.
     */
    function getStream(uint256 streamId)
        external
        view
        streamExists(streamId)
        returns (
            address sender,
            address recipient,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 remainingBalance,
            uint256 ratePerSecond
        )
    {
        sender = streams[streamId].sender;
        recipient = streams[streamId].recipient;
        deposit = streams[streamId].deposit;
        tokenAddress = streams[streamId].tokenAddress;
        startTime = streams[streamId].startTime;
        stopTime = streams[streamId].stopTime;
        remainingBalance = streams[streamId].remainingBalance;
        ratePerSecond = streams[streamId].ratePerSecond;
    }

    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `startTime` or
     *  between `stopTime` and `startTime, whichever is smaller. If `block.timestamp` is before
     *  `startTime`, it returns 0.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256 delta) {
        Types.Stream memory stream = streams[streamId];
        if (block.timestamp <= stream.startTime) return 0;
        if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;
        return stream.stopTime - stream.startTime;
    }

    struct BalanceOfLocalVars {
        MathError mathErr;
        uint256 recipientBalance;
        uint256 withdrawalAmount;
        uint256 senderBalance;
    }

    /**
     * @notice Returns the available funds for the given stream id and address.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream for which to query the balance.
     * @param who The address for which to query the balance.
     * @return The total funds allocated to `who` as uint256.
     */
    function balanceOf(uint256 streamId, address who) public view streamExists(streamId) returns (uint256 balance) {
        Types.Stream memory stream = streams[streamId];
        BalanceOfLocalVars memory vars;

        uint256 delta = deltaOf(streamId);
        (vars.mathErr, vars.recipientBalance) = mulUInt(delta, stream.ratePerSecond);
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation error");

        /*
         * If the stream `balance` does not equal `deposit`, it means there have been withdrawals.
         * We have to subtract the total amount withdrawn from the amount of money that has been
         * streamed until now.
         */
        if (stream.deposit > stream.remainingBalance) {
            (vars.mathErr, vars.withdrawalAmount) = subUInt(stream.deposit, stream.remainingBalance);
            assert(vars.mathErr == MathError.NO_ERROR);
            (vars.mathErr, vars.recipientBalance) = subUInt(vars.recipientBalance, vars.withdrawalAmount);
            /* `withdrawalAmount` cannot and should not be bigger than `recipientBalance`. */
            assert(vars.mathErr == MathError.NO_ERROR);
        }

        if (who == stream.recipient) return vars.recipientBalance;
        if (who == stream.sender) {
            (vars.mathErr, vars.senderBalance) = subUInt(stream.remainingBalance, vars.recipientBalance);
            /* `recipientBalance` cannot and should not be bigger than `remainingBalance`. */
            assert(vars.mathErr == MathError.NO_ERROR);
            return vars.senderBalance;
        }
        return 0;
    }

    /**
     * @notice Checks if the provided id points to a valid compounding stream.
     * @param streamId The id of the compounding stream to check.
     * @return bool true=if it is a compounding stream, otherwise false.
     */
    function isCompoundingStream(uint256 streamId) public view returns (bool) {
        return compoundingStreamsVars[streamId].isEntity;
    }

    /**
     * @notice Returns the compounding stream object with all its properties.
     * @dev Throws if the id does not point to a valid compounding stream.
     * @param streamId The id of the compounding stream to query.
     * @return The compounding stream object.
     */
    function getCompoundingStream(uint256 streamId)
        external
        view
        streamExists(streamId)
        compoundingStreamExists(streamId)
        returns (
            address sender,
            address recipient,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 remainingBalance,
            uint256 ratePerSecond,
            uint256 exchangeRateInitial,
            uint256 senderSharePercentage,
            uint256 recipientSharePercentage
        )
    {
        sender = streams[streamId].sender;
        recipient = streams[streamId].recipient;
        deposit = streams[streamId].deposit;
        tokenAddress = streams[streamId].tokenAddress;
        startTime = streams[streamId].startTime;
        stopTime = streams[streamId].stopTime;
        remainingBalance = streams[streamId].remainingBalance;
        ratePerSecond = streams[streamId].ratePerSecond;
        exchangeRateInitial = compoundingStreamsVars[streamId].exchangeRateInitial.mantissa;
        senderSharePercentage = compoundingStreamsVars[streamId].senderShare.mantissa;
        recipientSharePercentage = compoundingStreamsVars[streamId].recipientShare.mantissa;
    }

    struct InterestOfLocalVars {
        MathError mathErr;
        Exp exchangeRateDelta;
        Exp underlyingInterest;
        Exp netUnderlyingInterest;
        Exp senderUnderlyingInterest;
        Exp recipientUnderlyingInterest;
        Exp sablierUnderlyingInterest;
        Exp senderInterest;
        Exp recipientInterest;
        Exp sablierInterest;
    }

    /**
     * @notice Computes the interest accrued while the money has been streamed. Returns (0, 0, 0) if
     *  the stream is either not a compounding stream or it does not exist.
     * @dev Throws if there is a math error. We do not assert the calculations which involve the current
     *  exchange rate, because we can't know what value we'll get back from the cToken contract.
     * @param streamId The id of the compounding stream for which to calculate the interest.
     * @param amount The amount of money with respect to which to calculate the interest.
     * @return The interest accrued by the sender, the recipient and sablier, respectively, as uint256s.
     */
    function interestOf(uint256 streamId, uint256 amount)
        public
        streamExists(streamId)
        returns (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest)
    {
        if (!compoundingStreamsVars[streamId].isEntity) {
            return (0, 0, 0);
        }
        Types.Stream memory stream = streams[streamId];
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        InterestOfLocalVars memory vars;

        /*
         * The exchange rate delta is a key variable, since it leads us to how much interest has been earned
         * since the compounding stream was created.
         */
        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() });
        if (exchangeRateCurrent.mantissa <= compoundingStreamVars.exchangeRateInitial.mantissa) {
            return (0, 0, 0);
        }
        (vars.mathErr, vars.exchangeRateDelta) = subExp(exchangeRateCurrent, compoundingStreamVars.exchangeRateInitial);
        assert(vars.mathErr == MathError.NO_ERROR);

        /* Calculate how much interest has been earned by holding `amount` in the smart contract. */
        (vars.mathErr, vars.underlyingInterest) = mulScalar(vars.exchangeRateDelta, amount);
        require(vars.mathErr == MathError.NO_ERROR, "interest calculation error");

        /* Calculate our share from that interest. */
        if (fee.mantissa == hundredPercent) {
            (vars.mathErr, vars.sablierInterest) = divExp(vars.underlyingInterest, exchangeRateCurrent);
            require(vars.mathErr == MathError.NO_ERROR, "sablier interest conversion error");
            return (0, 0, truncate(vars.sablierInterest));
        } else if (fee.mantissa == 0) {
            vars.sablierUnderlyingInterest = Exp({ mantissa: 0 });
            vars.netUnderlyingInterest = vars.underlyingInterest;
        } else {
            (vars.mathErr, vars.sablierUnderlyingInterest) = mulExp(vars.underlyingInterest, fee);
            require(vars.mathErr == MathError.NO_ERROR, "sablier interest calculation error");

            /* Calculate how much interest is left for the sender and the recipient. */
            (vars.mathErr, vars.netUnderlyingInterest) = subExp(
                vars.underlyingInterest,
                vars.sablierUnderlyingInterest
            );
            /*
             * `subUInt` can only return MathError.INTEGER_UNDERFLOW but we know that `sablierUnderlyingInterest`
             * is less or equal than `underlyingInterest`, because we control the value of `fee`.
             */
            assert(vars.mathErr == MathError.NO_ERROR);
        }

        /* Calculate the sender's share of the interest. */
        (vars.mathErr, vars.senderUnderlyingInterest) = mulExp(
            vars.netUnderlyingInterest,
            compoundingStreamVars.senderShare
        );
        require(vars.mathErr == MathError.NO_ERROR, "sender interest calculation error");

        /* Calculate the recipient's share of the interest. */
        (vars.mathErr, vars.recipientUnderlyingInterest) = subExp(
            vars.netUnderlyingInterest,
            vars.senderUnderlyingInterest
        );
        /*
         * `subUInt` can only return MathError.INTEGER_UNDERFLOW but we know that `senderUnderlyingInterest`
         * is less or equal than `netUnderlyingInterest`, because `senderShare` is bounded between 1e16 and 1e18.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        /* Convert the interest to the equivalent cToken denomination. */
        (vars.mathErr, vars.senderInterest) = divExp(vars.senderUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "sender interest conversion error");

        (vars.mathErr, vars.recipientInterest) = divExp(vars.recipientUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "recipient interest conversion error");

        (vars.mathErr, vars.sablierInterest) = divExp(vars.sablierUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "sablier interest conversion error");

        /* Truncating the results means losing everything on the last 1e18 positions of the mantissa */
        return (truncate(vars.senderInterest), truncate(vars.recipientInterest), truncate(vars.sablierInterest));
    }

    /**
     * @notice Returns the amount of interest that has been accrued for the given token address.
     * @param tokenAddress The address of the token to get the earnings for.
     * @return The amount of interest as uint256.
     */
    function getEarnings(address tokenAddress) external view returns (uint256) {
        require(cTokenManager.isCToken(tokenAddress), "token is not cToken");
        return earnings[tokenAddress];
    }

    /*** Public Effects & Interactions Functions ***/

    struct CreateStreamLocalVars {
        MathError mathErr;
        uint256 duration;
        uint256 ratePerSecond;
    }

    /**
     * @notice Creates a new stream funded by `msg.sender` and paid towards `recipient`.
     * @dev Throws if paused.
     *  Throws if the recipient is the zero address, the contract itself or the caller.
     *  Throws if the deposit is 0.
     *  Throws if the start time is before `block.timestamp`.
     *  Throws if the stop time is before the start time.
     *  Throws if the duration calculation has a math error.
     *  Throws if the deposit is smaller than the duration.
     *  Throws if the deposit is not a multiple of the duration.
     *  Throws if the rate calculation has a math error.
     *  Throws if the next stream id calculation has a math error.
     *  Throws if the contract is not allowed to transfer enough tokens.
     *  Throws if there is a token transfer failure.
     * @param recipient The address towards which the money is streamed.
     * @param deposit The amount of money to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @return The uint256 id of the newly created stream.
     */
    function createStream(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)
        public
        whenNotPaused
        returns (uint256)
    {
        require(recipient != address(0x00), "stream to the zero address");
        require(recipient != address(this), "stream to the contract itself");
        require(recipient != msg.sender, "stream to the caller");
        require(deposit > 0, "deposit is zero");
        require(startTime >= block.timestamp, "start time before block.timestamp");
        require(stopTime > startTime, "stop time before the start time");

        CreateStreamLocalVars memory vars;
        (vars.mathErr, vars.duration) = subUInt(stopTime, startTime);
        /* `subUInt` can only return MathError.INTEGER_UNDERFLOW but we know `stopTime` is higher than `startTime`. */
        assert(vars.mathErr == MathError.NO_ERROR);

        /* Without this, the rate per second would be zero. */
        require(deposit >= vars.duration, "deposit smaller than time delta");

        /* This condition avoids dealing with remainders */
        require(deposit % vars.duration == 0, "deposit not multiple of time delta");

        (vars.mathErr, vars.ratePerSecond) = divUInt(deposit, vars.duration);
        /* `divUInt` can only return MathError.DIVISION_BY_ZERO but we know `duration` is not zero. */
        assert(vars.mathErr == MathError.NO_ERROR);

        /* Create and store the stream object. */
        uint256 streamId = nextStreamId;
        streams[streamId] = Types.Stream({
            remainingBalance: deposit,
            deposit: deposit,
            isEntity: true,
            ratePerSecond: vars.ratePerSecond,
            recipient: recipient,
            sender: msg.sender,
            startTime: startTime,
            stopTime: stopTime,
            tokenAddress: tokenAddress
        });

        /* Increment the next stream id. */
        (vars.mathErr, nextStreamId) = addUInt(nextStreamId, uint256(1));
        require(vars.mathErr == MathError.NO_ERROR, "next stream id calculation error");

        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), deposit), "token transfer failure");
        emit CreateStream(streamId, msg.sender, recipient, deposit, tokenAddress, startTime, stopTime);
        return streamId;
    }

    struct CreateCompoundingStreamLocalVars {
        MathError mathErr;
        uint256 shareSum;
        uint256 underlyingBalance;
        uint256 senderShareMantissa;
        uint256 recipientShareMantissa;
    }

    /**
     * @notice Creates a new compounding stream funded by `msg.sender` and paid towards `recipient`.
     * @dev Inherits all security checks from `createStream`.
     *  Throws if the cToken is not whitelisted.
     *  Throws if the sender share percentage and the recipient share percentage do not sum up to 100.
     *  Throws if the the sender share mantissa calculation has a math error.
     *  Throws if the the recipient share mantissa calculation has a math error.
     * @param recipient The address towards which the money is streamed.
     * @param deposit The amount of money to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @param senderSharePercentage The sender's share of the interest, as a percentage.
     * @param recipientSharePercentage The recipient's share of the interest, as a percentage.
     * @return The uint256 id of the newly created compounding stream.
     */
    function createCompoundingStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        uint256 senderSharePercentage,
        uint256 recipientSharePercentage
    ) external whenNotPaused returns (uint256) {
        require(cTokenManager.isCToken(tokenAddress), "cToken is not whitelisted");
        CreateCompoundingStreamLocalVars memory vars;

        /* Ensure that the interest shares sum up to 100%. */
        (vars.mathErr, vars.shareSum) = addUInt(senderSharePercentage, recipientSharePercentage);
        require(vars.mathErr == MathError.NO_ERROR, "share sum calculation error");
        require(vars.shareSum == 100, "shares do not sum up to 100");

        uint256 streamId = createStream(recipient, deposit, tokenAddress, startTime, stopTime);

        /*
         * `senderSharePercentage` and `recipientSharePercentage` will be stored as mantissas, so we scale them up
         * by one percent in Exp terms.
         */
        (vars.mathErr, vars.senderShareMantissa) = mulUInt(senderSharePercentage, onePercent);
        /*
         * `mulUInt` can only return MathError.INTEGER_OVERFLOW but we control `onePercent` and
         * we know `senderSharePercentage` is maximum 100.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.recipientShareMantissa) = mulUInt(recipientSharePercentage, onePercent);
        /*
         * `mulUInt` can only return MathError.INTEGER_OVERFLOW but we control `onePercent` and
         * we know `recipientSharePercentage` is maximum 100.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        /* Create and store the compounding stream vars. */
        uint256 exchangeRateCurrent = ICERC20(tokenAddress).exchangeRateCurrent();
        compoundingStreamsVars[streamId] = Types.CompoundingStreamVars({
            exchangeRateInitial: Exp({ mantissa: exchangeRateCurrent }),
            isEntity: true,
            recipientShare: Exp({ mantissa: vars.recipientShareMantissa }),
            senderShare: Exp({ mantissa: vars.senderShareMantissa })
        });

        emit CreateCompoundingStream(streamId, exchangeRateCurrent, senderSharePercentage, recipientSharePercentage);
        return streamId;
    }

    /**
     * @notice Withdraws from the contract to the recipient's account.
     * @dev Throws if the id does not point to a valid stream.
     *  Throws if the caller is not the sender or the recipient of the stream.
     *  Throws if the amount exceeds the available balance.
     *  Throws if there is a token transfer failure.
     * @param streamId The id of the stream to withdraw tokens from.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function withdrawFromStream(uint256 streamId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        streamExists(streamId)
        onlySenderOrRecipient(streamId)
        returns (bool)
    {
        require(amount > 0, "amount is zero");
        Types.Stream memory stream = streams[streamId];
        uint256 balance = balanceOf(streamId, stream.recipient);
        require(balance >= amount, "amount exceeds the available balance");

        if (!compoundingStreamsVars[streamId].isEntity) {
            withdrawFromStreamInternal(streamId, amount);
        } else {
            withdrawFromCompoundingStreamInternal(streamId, amount);
        }
        return true;
    }

    /**
     * @notice Cancels the stream and transfers the tokens back on a pro rata basis.
     * @dev Throws if the id does not point to a valid stream.
     *  Throws if the caller is not the sender or the recipient of the stream.
     *  Throws if there is a token transfer failure.
     * @param streamId The id of the stream to cancel.
     * @return bool true=success, otherwise false.
     */
    function cancelStream(uint256 streamId)
        external
        nonReentrant
        streamExists(streamId)
        onlySenderOrRecipient(streamId)
        returns (bool)
    {
        if (!compoundingStreamsVars[streamId].isEntity) {
            cancelStreamInternal(streamId);
        } else {
            cancelCompoundingStreamInternal(streamId);
        }
        return true;
    }

    /*** Internal Effects & Interactions Functions ***/

    struct WithdrawFromStreamInternalLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Makes the withdrawal to the recipient of the stream.
     * @dev If the stream balance has been depleted to 0, the stream object is deleted
     *  to save gas and optimise contract storage.
     *  Throws if the stream balance calculation has a math error.
     *  Throws if there is a token transfer failure.
     */
    function withdrawFromStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        WithdrawFromStreamInternalLocalVars memory vars;
        (vars.mathErr, streams[streamId].remainingBalance) = subUInt(stream.remainingBalance, amount);
        /**
         * `subUInt` can only return MathError.INTEGER_UNDERFLOW but we know that `remainingBalance` is at least
         * as big as `amount`. See the `require` check in `withdrawFromInternal`.
         */
        assert(vars.mathErr == MathError.NO_ERROR);

        if (streams[streamId].remainingBalance == 0) delete streams[streamId];

        require(IERC20(stream.tokenAddress).transfer(stream.recipient, amount), "token transfer failure");
        emit WithdrawFromStream(streamId, stream.recipient, amount);
    }

    struct WithdrawFromCompoundingStreamInternalLocalVars {
        MathError mathErr;
        uint256 amountWithoutSenderInterest;
        uint256 netWithdrawalAmount;
    }

    /**
     * @notice Withdraws to the recipient's account and pays the accrued interest to all parties.
     * @dev If the stream balance has been depleted to 0, the stream object to save gas and optimise
     *  contract storage.
     *  Throws if there is a math error.
     *  Throws if there is a token transfer failure.
     */
    function withdrawFromCompoundingStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        WithdrawFromCompoundingStreamInternalLocalVars memory vars;

        /* Calculate the interest earned by each party for keeping `stream.balance` in the smart contract. */
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = interestOf(streamId, amount);

        /*
         * Calculate the net withdrawal amount by subtracting `senderInterest` and `sablierInterest`.
         * Because the decimal points are lost when we truncate Exponentials, the recipient will implicitly earn
         * `recipientInterest` plus a tiny-weeny amount of interest, max 2e-8 in cToken denomination.
         */
        (vars.mathErr, vars.amountWithoutSenderInterest) = subUInt(amount, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "amount without sender interest calculation error");
        (vars.mathErr, vars.netWithdrawalAmount) = subUInt(vars.amountWithoutSenderInterest, sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "net withdrawal amount calculation error");

        /* Subtract `amount` from the remaining balance of the stream. */
        (vars.mathErr, streams[streamId].remainingBalance) = subUInt(stream.remainingBalance, amount);
        require(vars.mathErr == MathError.NO_ERROR, "balance subtraction calculation error");

        /* Delete the objects from storage if the remaining balance has been depleted to 0. */
        if (streams[streamId].remainingBalance == 0) {
            delete streams[streamId];
            delete compoundingStreamsVars[streamId];
        }

        /* Add the sablier interest to the earnings for this cToken. */
        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation error");

        /* Transfer the tokens to the sender and the recipient. */
        ICERC20 cToken = ICERC20(stream.tokenAddress);
        if (senderInterest > 0)
            require(cToken.transfer(stream.sender, senderInterest), "sender token transfer failure");
        require(cToken.transfer(stream.recipient, vars.netWithdrawalAmount), "recipient token transfer failure");

        emit WithdrawFromStream(streamId, stream.recipient, vars.netWithdrawalAmount);
        emit PayInterest(streamId, senderInterest, recipientInterest, sablierInterest);
    }

    /**
     * @notice Cancels the stream and transfers the tokens back on a pro rata basis.
     * @dev The stream and compounding stream vars objects get deleted to save gas
     *  and optimise contract storage.
     *  Throws if there is a token transfer failure.
     */
    function cancelStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        uint256 senderBalance = balanceOf(streamId, stream.sender);
        uint256 recipientBalance = balanceOf(streamId, stream.recipient);

        delete streams[streamId];

        IERC20 token = IERC20(stream.tokenAddress);
        if (recipientBalance > 0)
            require(token.transfer(stream.recipient, recipientBalance), "recipient token transfer failure");
        if (senderBalance > 0) require(token.transfer(stream.sender, senderBalance), "sender token transfer failure");

        emit CancelStream(streamId, stream.sender, stream.recipient, senderBalance, recipientBalance);
    }

    struct CancelCompoundingStreamInternal {
        MathError mathErr;
        uint256 netSenderBalance;
        uint256 recipientBalanceWithoutSenderInterest;
        uint256 netRecipientBalance;
    }

    /**
     * @notice Cancels the stream, transfers the tokens back on a pro rata basis and pays the accrued
     * interest to all parties.
     * @dev Importantly, the money that has not been streamed yet is not considered chargeable.
     *  All the interest generated by that underlying will be returned to the sender.
     *  Throws if there is a math error.
     *  Throws if there is a token transfer failure.
     */
    function cancelCompoundingStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        CancelCompoundingStreamInternal memory vars;

        /*
         * The sender gets back all the money that has not been streamed so far. By that, we mean both
         * the underlying amount and the interest generated by it.
         */
        uint256 senderBalance = balanceOf(streamId, stream.sender);
        uint256 recipientBalance = balanceOf(streamId, stream.recipient);

        /* Calculate the interest earned by each party for keeping `recipientBalance` in the smart contract. */
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = interestOf(
            streamId,
            recipientBalance
        );

        /*
         * We add `senderInterest` to `senderBalance` to calculate the net balance for the sender.
         * After this, the rest of the function is similar to `withdrawFromCompoundingStreamInternal`, except
         * we add the sender's share of the interest generated by `recipientBalance` to `senderBalance`.
         */
        (vars.mathErr, vars.netSenderBalance) = addUInt(senderBalance, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "net sender balance calculation error");

        /*
         * Calculate the net withdrawal amount by subtracting `senderInterest` and `sablierInterest`.
         * Because the decimal points are lost when we truncate Exponentials, the recipient will implicitly earn
         * `recipientInterest` plus a tiny-weeny amount of interest, max 2e-8 in cToken denomination.
         */
        (vars.mathErr, vars.recipientBalanceWithoutSenderInterest) = subUInt(recipientBalance, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance without sender interest calculation error");
        (vars.mathErr, vars.netRecipientBalance) = subUInt(vars.recipientBalanceWithoutSenderInterest, sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "net recipient balance calculation error");

        /* Add the sablier interest to the earnings attributed to this cToken. */
        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation error");

        /* Delete the objects from storage. */
        delete streams[streamId];
        delete compoundingStreamsVars[streamId];

        /* Transfer the tokens to the sender and the recipient. */
        IERC20 token = IERC20(stream.tokenAddress);
        if (vars.netSenderBalance > 0)
            require(token.transfer(stream.sender, vars.netSenderBalance), "sender token transfer failure");
        if (vars.netRecipientBalance > 0)
            require(token.transfer(stream.recipient, vars.netRecipientBalance), "recipient token transfer failure");

        emit CancelStream(streamId, stream.sender, stream.recipient, vars.netSenderBalance, vars.netRecipientBalance);
        emit PayInterest(streamId, senderInterest, recipientInterest, sablierInterest);
    }
}
