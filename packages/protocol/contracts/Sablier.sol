pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "@sablier/shared-contracts/compound/Exponential.sol";
import "@sablier/shared-contracts/compound/TokenErrorReporter.sol";
import "@sablier/shared-contracts/interfaces/ICERC20.sol";

import "./interfaces/IERC1620.sol";
import "./Types.sol";

/**
 * @title Sablier's Money Streaming
 * @author Sablier
 */
contract Sablier is IERC1620, Ownable, ReentrancyGuard, Exponential, TokenErrorReporter {
    /**
     * @notice Stores information about the initial state of the underlying of the cToken.
     */
    mapping(uint256 => Types.CompoundingStreamVars) private compoundingStreamsVars;

    /**
     * @notice Set of cTokens which can be whitelisted by the administrator.
     */
    mapping(address => bool) public cTokens;

    /**
     * @notice The amount of interest has been accrued per token address.
     */
    mapping(address => uint256) public earnings;

    /**
     * @notice The percentage fee charged by the contract on the accrued interest.
     */
    Exp public fee;

    /**
     * @notice Used to create new stream ids.
     */
    uint256 public nonce;

    /**
     * @notice The stream objects themselves.
     */
    mapping(uint256 => Types.Stream) public streams;

    /**
     * @notice Emits when the administrator discards a cToken.
     */
    event DiscardCToken(address indexed cTokenAddress);

    /**
     * @notice Emits when the administrator discards a cToken.
     */
    event PayInterest(uint256 streamId, uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest);

    /**
     * @notice Emits when the administrator takes the earnings.
     */
    event TakeEarnings(address indexed tokenAddress, uint256 indexed amount);

    /**
     * @notice Emits when the administrator updates the percentage fee.
     */
    event UpdateFee(uint256 indexed fee);

    /**
     * @notice Emits when the administrator whitelists a cToken.
     */
    event WhitelistCToken(address indexed cTokenAddress);

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
     * @dev Throws if `streamId` does not point to a valid stream.
     */
    modifier streamExists(uint256 streamId) {
        require(streams[streamId].isEntity, "stream does not exist");
        _;
    }

    /**
     * @dev Throws if `streamId` does not point to a valid compounding stream.
     */
    modifier compoundingStreamVarsExist(uint256 streamId) {
        require(compoundingStreamsVars[streamId].isEntity, "compounding stream vars do not exist");
        _;
    }

    constructor() public {
        Ownable.initialize(msg.sender);
        nonce = 1;
    }

    /*** Admin Functions ***/

    /**
     * @notice Whitelists a cToken for compounding streams.
     * @dev Throws is `cTokenAddress` is already whitelisted. Throws if
     *  the given address is not a `cToken`.
     * @param cTokenAddress The address of the cToken to whitelist.
     */
    function whitelistCToken(address cTokenAddress) external onlyOwner {
        require(!cTokens[cTokenAddress], "ctoken is whitelisted");
        require(ICERC20(cTokenAddress).isCToken(), "token is not ctoken");
        cTokens[cTokenAddress] = true;
        emit WhitelistCToken(cTokenAddress);
    }

    /**
     * @notice Discards a previously whitelisted cToken.
     * @dev Throws is `cTokenAddress` has not been previously whitelisted.
     * @param cTokenAddress The address of the cToken to discard.
     */
    function discardCToken(address cTokenAddress) external onlyOwner {
        require(cTokens[cTokenAddress], "ctoken is not whitelisted");
        cTokens[cTokenAddress] = false;
        emit DiscardCToken(cTokenAddress);
    }

    struct UdateFeeLocalVars {
        MathError mathErr;
        uint256 feeMantissa;
    }

    /**
     * @notice Updates the Sablier fee.
     * @dev Throws if `newFee` is not lower or equal to 100.
     * @param newFee The new fee as a percentage.
     */
    function updateFee(uint256 newFee) external onlyOwner {
        require(newFee <= 100, "new fee higher than 100%");
        UdateFeeLocalVars memory vars;
        (vars.mathErr, vars.feeMantissa) = mulUInt(newFee, 1e16);
        require(vars.mathErr == MathError.NO_ERROR, "new fee mantissa calculation error");
        fee = Exp({ mantissa: vars.feeMantissa });
        emit UpdateFee(newFee);
    }

    struct TakeEarningsLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Withdraws the earnings for the given token address.
     * @dev Throws if `amount` exceeds the available blance.
     * @param tokenAddress The address of the token contract to withdraw from.
     * @param amount The amount of tokens to withdraw.
     */
    function takeEarnings(address tokenAddress, uint256 amount) external nonReentrant onlyOwner {
        require(cTokens[tokenAddress], "ctoken is not whitelisted");
        require(earnings[tokenAddress] >= amount, "amount exceeds the available balance");

        TakeEarningsLocalVars memory vars;
        (vars.mathErr, earnings[tokenAddress]) = subUInt(earnings[tokenAddress], amount);
        assert(vars.mathErr == MathError.NO_ERROR);

        emit TakeEarnings(tokenAddress, amount);
        require(IERC20(tokenAddress).transfer(msg.sender, amount), "token transfer failure");
    }

    /*** View Functions ***/

    struct BalanceOfLocalVars {
        MathError mathErr;
        uint256 recipientBalance;
        uint256 withdrawalAmount;
        uint256 senderBalance;
    }

    /**
     * @notice Returns the available funds for the given stream id and address.
     * @dev Throws if `streamId` does not point to a valid stream.
     * @param streamId The id of the stream for whom to query the balance.
     * @param who The address for whom to query the balance.
     * @return The total funds allocated to `who`.
     */
    function balanceOf(uint256 streamId, address who) public view streamExists(streamId) returns (uint256) {
        Types.Stream memory stream = streams[streamId];
        BalanceOfLocalVars memory vars;

        uint256 delta = deltaOf(streamId);
        (vars.mathErr, vars.recipientBalance) = mulUInt(delta, stream.rate);
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation error");

        /*
         * If the stream `balance` does not equal the `deposit`, it means there have been withdrawals.
         * We have to subtract the total amount withdrawn from the existing balance of the recipient.
         */
        if (stream.deposit > stream.balance) {
            (vars.mathErr, vars.withdrawalAmount) = subUInt(stream.deposit, stream.balance);
            assert(vars.mathErr == MathError.NO_ERROR);
            (vars.mathErr, vars.recipientBalance) = subUInt(vars.recipientBalance, vars.withdrawalAmount);
            require(vars.mathErr == MathError.NO_ERROR, "recipient balance subtraction calculation error");
        }

        if (who == stream.recipient) return vars.recipientBalance;
        if (who == stream.sender) {
            (vars.mathErr, vars.senderBalance) = subUInt(stream.balance, vars.recipientBalance);
            require(vars.mathErr == MathError.NO_ERROR, "sender balance calculation error");
            return vars.senderBalance;
        }
        return 0;
    }

    struct UnderlyingBalanceWithoutInterestOfLocalVars {
        MathError mathErr;
        Exp underlyingBalanceInitial;
        Exp recipientUnderlyingBalance;
        uint256 balanceWithdrawn;
        Exp underlyingBalanceWithdrawn;
        Exp senderUnderlyingBalance;
    }

    /**
     * @notice Returns the underlying balance for the given stream id and address,
     *  as if there would be no interest-earning scheme.
     * @dev Throws if `streamId` does not point to a valid stream.
     * @param streamId The id of the stream for whom to query the underlying balance.
     * @param who The address for whom to query the balance.
     * @return The underlying balance for `who`.
     */
    function underlyingBalanceWithoutInterestOf(uint256 streamId, address who)
        public
        view
        streamExists(streamId)
        compoundingStreamVarsExist(streamId)
        returns (uint256)
    {
        Types.Stream memory stream = streams[streamId];
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        UnderlyingBalanceWithoutInterestOfLocalVars memory vars;

        /*
         * Calculate how much has been streamed.
         */
        uint256 delta = deltaOf(streamId);
        (vars.mathErr, vars.recipientUnderlyingBalance) = mulScalar(compoundingStreamVars.underlyingRate, delta);
        require(vars.mathErr == MathError.NO_ERROR, "recipient underlying balance calculation error");

        if (who == stream.recipient) {
            /*
             * If the stream `balance` does not equal the `deposit`, it means there have been withdrawals.
             * We have to subtract the total amount withdrawn from the existing balance of the recipient.
             */
            if (stream.deposit > stream.balance) {
                (vars.mathErr, vars.balanceWithdrawn) = subUInt(stream.deposit, stream.balance);
                assert(vars.mathErr == MathError.NO_ERROR);
                (vars.mathErr, vars.underlyingBalanceWithdrawn) = mulScalar(
                    compoundingStreamVars.exchangeRateInitial,
                    vars.balanceWithdrawn
                );
                require(vars.mathErr == MathError.NO_ERROR, "underlying withdrawal balance calculation error");
                (vars.mathErr, vars.recipientUnderlyingBalance) = subExp(
                    vars.recipientUnderlyingBalance,
                    vars.underlyingBalanceWithdrawn
                );
                require(
                    vars.mathErr == MathError.NO_ERROR,
                    "recipient underlying balance subtraction calculation error"
                );
            }

            return truncate(vars.recipientUnderlyingBalance);
        }

        /*
         * The sender gets back what has not been streamed yet.
         */
        if (who == stream.sender) {
            /*
             * Calculate the amount of underlying deposited initially.
             */
            (vars.mathErr, vars.underlyingBalanceInitial) = mulScalar(
                compoundingStreamVars.exchangeRateInitial,
                stream.deposit
            );
            require(vars.mathErr == MathError.NO_ERROR, "underlying balance calculation error");

            (vars.mathErr, vars.senderUnderlyingBalance) = subExp(
                vars.underlyingBalanceInitial,
                vars.recipientUnderlyingBalance
            );
            require(vars.mathErr == MathError.NO_ERROR, "sender balance calculation error");
            return truncate(vars.senderUnderlyingBalance);
        }
        return 0;
    }

    struct BalanceWithoutInterestOfLocalVars {
        MathError mathErr;
        Exp balance;
    }

    /**
     * @notice Returns the balance for the given stream id and address, as if there would
     *  be no interest-earning scheme.
     * @dev We use `exchangeRateCurrent` not `exchangeRateInitial` since we are interested in precisely
     *  the amount of cTokens that convert to the underlying balance without interest now.
     *  Throws if `streamId` does not point to a valid stream.
     * @param streamId The id of the stream for whom to query the underlying balance.
     * @param who The address for whom to query the balance.
     * @return The underlying balance for `who`.
     */
    function balanceWithoutInterestOf(uint256 streamId, address who)
        public
        streamExists(streamId)
        compoundingStreamVarsExist(streamId)
        returns (uint256)
    {
        Types.Stream memory stream = streams[streamId];
        BalanceWithoutInterestOfLocalVars memory vars;

        /**
         * Since we can only infer the balance only without the interest by calculating the underlying balance
         * as if there would be no interest-earning scheme, we have to use `underlyingBalanceWithoutInterestOf`.
         */
        if (who == stream.sender || who == stream.recipient) {
            uint256 underlyingBalanceWithoutInterest = underlyingBalanceWithoutInterestOf(streamId, who);
            (vars.mathErr, vars.balance) = divScalarByExp(
                underlyingBalanceWithoutInterest,
                Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() })
            );
            require(vars.mathErr == MathError.NO_ERROR, "balance conversion failure");
            return truncate(vars.balance);
        }
        return 0;
    }

    /**
     * @notice Returns the smaller time delta between now and the `startTime`, and
     * `stopTime` and `startTime.
     * @dev Throws if `streamId` does not point to a valid stream.
     * @param streamId The id of the stream for whom to query the delta.
     * @return The smaller time delta between now and the `startTime`, and
     * `stopTime` and `startTime.
     */
    function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256 delta) {
        Types.Stream memory stream = streams[streamId];
        if (block.timestamp <= stream.startTime) return 0;
        if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;
        return stream.stopTime - stream.startTime;
    }

    /**
     * @notice Returns the stream object with all its parameters.
     * @dev Throws if `streamId` does not point to a valid stream.
     * @param streamId The id of the stream to query.
     * @return The stream object with all its parameters.
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
            uint256 balance,
            uint256 rate
        )
    {
        Types.Stream memory stream = streams[streamId];
        return (
            stream.sender,
            stream.recipient,
            stream.deposit,
            stream.tokenAddress,
            stream.startTime,
            stream.stopTime,
            stream.balance,
            stream.rate
        );
    }

    /**
     * @notice Returns the compounding stream vars object with all its parameters.
     * @dev Throws if `streamId` does not point to a valid compounding stream.
     * @param streamId The id of the compounding stream to query.
     * @return The compounding stream vars object with all its parameters.
     */
    function getCompoundingStreamVars(uint256 streamId)
        external
        view
        streamExists(streamId)
        compoundingStreamVarsExist(streamId)
        returns (uint256 exchangeRateInitial, uint256 senderShare, uint256 recipientShare)
    {
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        return (
            compoundingStreamVars.exchangeRateInitial.mantissa,
            compoundingStreamVars.senderShare.mantissa,
            compoundingStreamVars.recipientShare.mantissa
        );
    }

    /*** Public Effects & Interactions Functions ***/

    struct CreateStreamLocalVars {
        MathError mathErr;
        uint256 duration;
        uint256 rate;
    }

    /**
     * @notice Creates a new stream
     * @dev Throws if `recipient` is the zero address, the contract itself or `msg.sender`.
     *  Throws if the `deposit` is 0.
     *  Throws if `startTime` is lower or equal to `block.timestamp`.
     *  Throws if `stopTime` is lower than `startTime`.
     *  Throws if the duration calculation has a math error.
     *  Throws if deposit is not a multiple of the time delta.
     *  Throws if the rate calculation has a math error.
     *  Throws if the nonce calculation has a math error.
     *  Throws if the contract is not allowed to transfer more than `deposit` tokens.
     * @param recipient The account towards which the money will be streamed.
     * @param deposit The amount of money to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp of when the stream starts.
     * @param stopTime The unix timestamp of when the stream stops.
     * @return the id of the newly created stream.
     */
    function createStream(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)
        public
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
        require(vars.mathErr == MathError.NO_ERROR, "duration calculation error");
        assert(vars.duration > 0);
        require(deposit % vars.duration == 0, "deposit not multiple of time delta");

        (vars.mathErr, vars.rate) = divUInt(deposit, vars.duration);
        require(vars.mathErr == MathError.NO_ERROR, "rate calculation error");

        uint256 streamId = nonce;
        streams[streamId] = Types.Stream({
            balance: deposit,
            deposit: deposit,
            isEntity: true,
            rate: vars.rate,
            recipient: recipient,
            sender: msg.sender,
            startTime: startTime,
            stopTime: stopTime,
            tokenAddress: tokenAddress
        });

        (vars.mathErr, nonce) = addUInt(nonce, uint256(1));
        require(vars.mathErr == MathError.NO_ERROR, "nonce calculation error");

        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), deposit), "token transfer failure");
        emit CreateStream(streamId, msg.sender, recipient, deposit, tokenAddress, startTime, stopTime);
        return streamId;
    }

    struct CreateCompoundingStreamLocalVars {
        MathError mathErr;
        uint256 shareSum;
        uint256 underlyingBalance;
        Exp underlyingRate;
        uint256 senderShare;
        uint256 recipientShare;
    }

    /**
     * @notice Creates a new compounding stream.
     * @dev Inherits all the security checks from `createStream`, but has more.
     *  Throws if the cToken is not whitelisted.
     *  Throws if `senderShare` and `recipientShare` do not sum up to 100.
     *  Throws if the `underlyingRate` calculation has a math error.
     *  Throws if the `senderShare` mantissa calculation has a math error.
     *  Throws if the `recipientShare` mantissa calculation has a math error.
     * @param recipient The account towards which the money will be streamed.
     * @param deposit The amount of money to be streamed.
     * @param tokenAddress The ERC20 token to use as streaming currency.
     * @param startTime The unix timestamp of when the stream starts.
     * @param stopTime The unix timestamp of when the stream stops.
     * @param senderShare The sender's share of the interest, as a percentage.
     * @param recipientShare The sender's share of the interest, as a percentage.
     * @return the id of the newly created stream.
     */
    function createCompoundingStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime,
        uint256 senderShare,
        uint256 recipientShare
    ) external returns (uint256) {
        require(cTokens[tokenAddress], "ctoken is not whitelisted");
        CreateCompoundingStreamLocalVars memory vars;

        /*
         * Ensure that the interest shares sum up to 100%
         */
        (vars.mathErr, vars.shareSum) = addUInt(senderShare, recipientShare);
        require(vars.mathErr == MathError.NO_ERROR, "share sum calculation error");
        require(vars.shareSum == 100, "shares do not sum up to 100");

        uint256 streamId = createStream(recipient, deposit, tokenAddress, startTime, stopTime);

        /*
         * Calculate how much will be streamed per second, in the underlying equivalent
         */
        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(tokenAddress).exchangeRateCurrent() });
        (vars.mathErr, vars.underlyingRate) = mulScalar(exchangeRateCurrent, streams[streamId].rate);
        require(vars.mathErr == MathError.NO_ERROR, "underyling rate calculation error");

        /*
         * `senderShare` and `recipientShare` will be stored as mantissas, so we have to scale them by 1e16.
         * In Exp terms, 1e16 = 0.01
         */
        (vars.mathErr, vars.senderShare) = mulUInt(senderShare, 1e16);
        require(vars.mathErr == MathError.NO_ERROR, "sender share mantissa calculation error");

        (vars.mathErr, vars.recipientShare) = mulUInt(recipientShare, 1e16);
        require(vars.mathErr == MathError.NO_ERROR, "recipient share mantissa calculation error");

        /*
         * Create and store the compounding stream vars.
         */
        compoundingStreamsVars[streamId] = Types.CompoundingStreamVars({
            exchangeRateInitial: exchangeRateCurrent,
            isEntity: true,
            recipientShare: Exp({ mantissa: vars.recipientShare }),
            senderShare: Exp({ mantissa: vars.senderShare }),
            underlyingRate: vars.underlyingRate
        });

        emit CreateCompoundingStream(streamId, exchangeRateCurrent.mantissa, senderShare, recipientShare);
        return streamId;
    }

    /**
     * @notice Withdraws from an active stream.
     * @dev Throws if `streamId` does not point to an active stream.
     *  Throws if the caller is not the sender or the recipient.
     *  Throws if `amount` exceeds the available balance.
     * @param streamId The id of the stream to withdraw tokens from.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false
     */
    function withdrawFromStream(uint256 streamId, uint256 amount)
        external
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
     * @notice Cancels an active stream.
     * @dev Throws if `streamId` does not point to a valid stream.
     *  Throws if the caller is not the sender or the recipient.
     *  Throws if `amount` exceeds the available balance.
     * @param streamId The id of the stream to cancel.
     * @return bool true=success, otherwise false
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

    struct ComputeInterestLocalVars {
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
     * @notice Computes the interest accrued by keeping `amount` of tokens in the contract.
     * @dev Throws if there is a math error.
     * @return The interest accrued by the sender, the recipeint and sablier, respectively.
     */
    function computeInterest(uint256 streamId, uint256 amount) internal returns (uint256, uint256, uint256) {
        Types.Stream memory stream = streams[streamId];
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        ComputeInterestLocalVars memory vars;

        /*
         * The `exchangeRateDelta` is a key variable here, it leads us to how much interest has been earned
         * since the compounding stream has been created.
         */
        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() });
        if (exchangeRateCurrent.mantissa <= compoundingStreamVars.exchangeRateInitial.mantissa) {
            return (0, 0, 0);
        }
        (vars.mathErr, vars.exchangeRateDelta) = subExp(exchangeRateCurrent, compoundingStreamVars.exchangeRateInitial);
        require(vars.mathErr == MathError.NO_ERROR, "exchange rate delta calculation error");
        /*
         * Calculate how much interest has been earned by holding `amount` in the smart contract.
         */
        (vars.mathErr, vars.underlyingInterest) = mulScalar(vars.exchangeRateDelta, amount);
        require(vars.mathErr == MathError.NO_ERROR, "interest calculation error");

        /*
         * Calculate our share from that interest.
         */
        if (fee.mantissa == 1e18) {
            (vars.mathErr, vars.sablierInterest) = divExp(vars.sablierUnderlyingInterest, exchangeRateCurrent);
            require(vars.mathErr == MathError.NO_ERROR, "sablier interest conversion failure");
            return (0, 0, truncate(vars.sablierInterest));
        } else if (fee.mantissa == 0) {
            vars.sablierUnderlyingInterest = Exp({ mantissa: 0 });
            vars.netUnderlyingInterest = vars.underlyingInterest;
        } else {
            (vars.mathErr, vars.sablierUnderlyingInterest) = mulExp(vars.underlyingInterest, fee);
            require(vars.mathErr == MathError.NO_ERROR, "sablier interest calculation error");
            /*
             * Calculate how much interest is left for the sender and the recipient.
             */
            (vars.mathErr, vars.netUnderlyingInterest) = subExp(
                vars.underlyingInterest,
                vars.sablierUnderlyingInterest
            );
            require(vars.mathErr == MathError.NO_ERROR, "net interest calculation error");
        }

        /*
         * Calculate the sender's share of the interest.
         */
        (vars.mathErr, vars.senderUnderlyingInterest) = mulExp(
            vars.netUnderlyingInterest,
            compoundingStreamVars.senderShare
        );
        require(vars.mathErr == MathError.NO_ERROR, "sender interest calculation error");

        /*
         * Calculate the recipient's share of the interest.
         */
        (vars.mathErr, vars.recipientUnderlyingInterest) = subExp(
            vars.netUnderlyingInterest,
            vars.senderUnderlyingInterest
        );
        require(vars.mathErr == MathError.NO_ERROR, "recipient interest calculation error");

        /*
         * Convert the interest to the equivalent cToken form.
         */
        (vars.mathErr, vars.senderInterest) = divExp(vars.senderUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "sender interest conversion failure");

        (vars.mathErr, vars.recipientInterest) = divExp(vars.recipientUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "recipient interest conversion failure");

        (vars.mathErr, vars.sablierInterest) = divExp(vars.sablierUnderlyingInterest, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "sablier interest conversion failure");

        return (truncate(vars.senderInterest), truncate(vars.recipientInterest), truncate(vars.sablierInterest));
    }

    struct WithdrawFromStreamInternalLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Makes the withdrawal to the recipient of the stream.
     * @dev If stream balance has been depleted to 0, the stream object is deleted
     *  to save gas and optimise contract storage.
     *  Throws if the stream balance calculation has a math error.
     *  Throws if the token transfer fails.
     */
    function withdrawFromStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        WithdrawFromStreamInternalLocalVars memory vars;
        (vars.mathErr, streams[streamId].balance) = subUInt(stream.balance, amount);
        require(vars.mathErr == MathError.NO_ERROR, "stream balance subtraction calculation error");

        if (streams[streamId].balance == 0) delete streams[streamId];

        require(IERC20(stream.tokenAddress).transfer(stream.recipient, amount), "token transfer failure");
        emit WithdrawFromStream(streamId, stream.recipient, amount);
    }

    struct WithdrawFromCompoundingStreamInternalLocalVars {
        MathError mathErr;
        uint256 amountWithoutSenderInterest;
        uint256 netWithdrawalAmount;
    }

    /**
     * @notice Makes the withdrawal to the recipient of the compounding stream and pays the
     *  accrued interest to all parties.
     * @dev If stream balance has been depleted to 0, the stream object to save gas
     *  and optimise contract storage.
     *  Throws if there is a math error.
     *  Throws if the token transfer fails.
     */
    function withdrawFromCompoundingStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        WithdrawFromCompoundingStreamInternalLocalVars memory vars;

        /*
         * Calculate the interest earned by each party for keeping `stream.balance` in the smart contract.
         */
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = computeInterest(
            streamId,
            amount
        );

        /*
         * Calculate the net withdrawal amount by subtracting `senderInterest` and `sablierInterest`.
         * Because the decimal points are lost when we truncate Exp variables, the recipient will earn
         * `recipientInterest` + a tiny weeny amount of interest, max 0.00000001 in ctoken form.
         */
        if (senderInterest > 0) {
            (vars.mathErr, vars.amountWithoutSenderInterest) = subUInt(amount, senderInterest);
            require(vars.mathErr == MathError.NO_ERROR, "amount without sender interest calculation error");
        } else {
            vars.amountWithoutSenderInterest = amount;
        }
        (vars.mathErr, vars.netWithdrawalAmount) = subUInt(vars.amountWithoutSenderInterest, sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "net withdrawal amount calculation error");

        /*
         * Subtract `amount` from the balance of the stream.
         */
        (vars.mathErr, streams[streamId].balance) = subUInt(stream.balance, amount);
        require(vars.mathErr == MathError.NO_ERROR, "balance subtraction calculation error");

        /*
         * Delete the objects from storage if the balance has been depleted to 0.
         */
        if (streams[streamId].balance == 0) {
            delete streams[streamId];
            delete compoundingStreamsVars[streamId];
        }

        /*
         * Add the sablier interest to the earnings for this cToken.
         */
        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation error");

        /*
         * Transfer the tokens to the sender and the recipient.
         */
        ICERC20 cToken = ICERC20(stream.tokenAddress);
        if (senderInterest > 0)
            require(cToken.transfer(stream.sender, senderInterest), "sender token transfer failure");
        require(cToken.transfer(stream.recipient, vars.netWithdrawalAmount), "recipient token transfer failure");

        emit WithdrawFromStream(streamId, stream.recipient, vars.netWithdrawalAmount);
        emit PayInterest(streamId, senderInterest, recipientInterest, sablierInterest);
    }

    /**
     * @notice Cancels the stream and transfers all tokens on pro rata basis.
     * @dev The stream and compounding stream vars objects get deleted to save gas
     *  and optimise contract storage.
     *  Throws if the token transfer fails.
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

    struct CancelCompoundingStreamInternalLocalVars {
        MathError mathErr;
        uint256 senderBalance;
        uint256 recipientBalance;
        uint256 senderAndRecipientBalanceSum;
        uint256 sablierInterest;
    }

    /**
     * @notice Cancels the stream and transfers all tokens on pro rata basis.
     * @dev The stream object gets deleted after this operation to save gas
     *  and optimise contract storage.
     *  Throws if there is a math error.
     *  Throws if the token transfer fails.
     */
    function cancelCompoundingStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];

        /*
         * As if there would be no interest-earning scheme, calculate the underlying balances of the
         * sender and the recipient, but converted to their cToken equivalent. We shall call these
         * "base" balances.
         */
        uint256 senderBaseBalance = balanceWithoutInterestOf(streamId, stream.sender);
        uint256 recipientBaseBalance = balanceWithoutInterestOf(streamId, stream.recipient);

        /*
         * Calculate the interest earned by each party for keeping `stream.balance` in the smart contract.
         */
        (uint256 senderInterest, uint256 recipientInterest, ) = computeInterest(streamId, stream.balance);

        /*
         * Add the base balances to the interest earned by each party
         */
        CancelCompoundingStreamInternalLocalVars memory vars;
        (vars.mathErr, vars.senderBalance) = addUInt(senderBaseBalance, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "sender balance calculation error");

        (vars.mathErr, vars.recipientBalance) = addUInt(recipientBaseBalance, recipientInterest);
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation error");

        /*
         * We switch from cToken to underlying and vice-versa for several times. When we truncate an Exp,
         * the point values after 1e18 to the right are lost. We truncate `senderInterest`, `recipientInterest`
         * and `sablierInterest`, so the sum of `senderBalance`, `recipientBalance` and `sablierInterest` ends up
         * not being equal to`stream.balance`. We fix this by making `sablierInterest` the difference
         * between `stream.balance` and (`senderBalance` + `recipientBalance`).
         */
        (vars.mathErr, vars.senderAndRecipientBalanceSum) = addUInt(vars.senderBalance, vars.recipientBalance);
        require(vars.mathErr == MathError.NO_ERROR, "sender and recipient balance sum calculation error");
        (vars.mathErr, vars.sablierInterest) = subUInt(stream.balance, vars.senderAndRecipientBalanceSum);
        require(vars.mathErr == MathError.NO_ERROR, "sablier interest calculation error");

        /*
         * Add the sablier interest to the earnings for this cToken.
         */
        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], vars.sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation error");

        /*
         * Delete the objects from storage if the balance has been depleted to 0.
         */
        delete streams[streamId];
        delete compoundingStreamsVars[streamId];

        /*
         * Transfer the tokens to the sender and the recipient.
         */
        IERC20 token = IERC20(stream.tokenAddress);
        if (vars.senderBalance > 0)
            require(token.transfer(stream.sender, vars.senderBalance), "sender token transfer failure");
        if (vars.recipientBalance > 0)
            require(token.transfer(stream.recipient, vars.recipientBalance), "recipient token transfer failure");

        emit CancelStream(streamId, stream.sender, stream.recipient, vars.senderBalance, vars.recipientBalance);
        emit PayInterest(streamId, senderInterest, recipientInterest, vars.sablierInterest);
    }
}
