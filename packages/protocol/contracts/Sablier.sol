pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "./compound/Exponential.sol";
import "./compound/TokenErrorReporter.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/IERC1620.sol";
import "./Types.sol";

/**
 * @title Sablier's Money Streaming Contract
 * @author Sablier
 */

contract Sablier is IERC1620, Ownable, ReentrancyGuard, Exponential, TokenErrorReporter {
    mapping(uint256 => Types.CompoundingStreamVars) private compoundingStreamsVars;
    mapping(address => bool) public cTokens;
    mapping(address => uint256) public earnings;
    Exp public fee;
    uint256 public nonce;
    mapping(uint256 => Types.Stream) public streams;

    event CreateCompoundingStream(
        uint256 indexed streamId,
        uint256 exchangeRate,
        uint256 senderShare,
        uint256 recipientShare
    );
    event DiscardCToken(address indexed cTokenAddress);
    event PayInterest(uint256 streamId, uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest);
    event TakeEarnings(address indexed tokenAddress, uint256 indexed amount);
    event UpdateFee(uint256 indexed fee);
    event WhitelistCToken(address indexed cTokenAddress);

    modifier onlySenderOrRecipient(uint256 streamId) {
        require(
            msg.sender == streams[streamId].sender || msg.sender == streams[streamId].recipient,
            "caller is not the sender or the recipient of the stream"
        );
        _;
    }

    modifier streamExists(uint256 streamId) {
        require(streams[streamId].isEntity, "stream does not exist");
        _;
    }

    modifier compoundingStreamVarsExist(uint256 streamId) {
        require(compoundingStreamsVars[streamId].isEntity, "compounding stream vars do not exist");
        _;
    }

    constructor() public {
        Ownable.initialize(msg.sender);
        nonce = 1;
    }

    /* Admin */

    function whitelistCToken(address cTokenAddress) external onlyOwner {
        require(!cTokens[cTokenAddress], "ctoken is whitelisted");
        require(ICERC20(cTokenAddress).isCToken(), "token is not ctoken");
        cTokens[cTokenAddress] = true;
        emit WhitelistCToken(cTokenAddress);
    }

    function discardCToken(address cTokenAddress) external onlyOwner {
        require(cTokens[cTokenAddress], "ctoken is not whitelisted");
        cTokens[cTokenAddress] = false;
        emit DiscardCToken(cTokenAddress);
    }

    struct UdateFeeLocalVars {
        MathError mathErr;
        uint256 feeMantissa;
    }

    event DebugUpdateFee(uint256 aux, uint256 newFee);

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

    function takeEarnings(address tokenAddress, uint256 amount) external nonReentrant onlyOwner {
        require(cTokens[tokenAddress], "ctoken is not whitelisted");
        require(earnings[tokenAddress] >= amount, "amount exceeds the available balance");
        TakeEarningsLocalVars memory vars;
        (vars.mathErr, earnings[tokenAddress]) = subUInt(earnings[tokenAddress], amount);
        require(vars.mathErr == MathError.NO_ERROR, "earnings subtraction calculation error");
        emit TakeEarnings(tokenAddress, amount);
        require(IERC20(tokenAddress).transfer(msg.sender, amount));
    }

    /* Public View */

    struct BalanceOfLocalVars {
        MathError mathErr;
        uint256 recipientBalance;
        uint256 withdrawalAmount;
        uint256 senderBalance;
    }

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
        if (stream.balance != stream.deposit) {
            (vars.mathErr, vars.withdrawalAmount) = subUInt(stream.deposit, stream.balance);
            require(vars.mathErr == MathError.NO_ERROR, "withdrawal amount calculation error");
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

    struct BalanceOfUnderlyingLocalVars {
        MathError mathErr;
        uint256 underlyingBalanceInitial;
        uint256 recipientBalance;
        uint256 senderBalance;
    }

    function balanceOfUnderlyingWithoutInterest(uint256 streamId, address who)
        public
        streamExists(streamId)
        compoundingStreamVarsExist(streamId)
        returns (uint256 balance)
    {
        Types.Stream memory stream = streams[streamId];
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        BalanceOfUnderlyingLocalVars memory vars;

        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() });
        (vars.mathErr, vars.underlyingBalanceInitial) = mulScalarTruncate(exchangeRateCurrent, stream.deposit);
        require(vars.mathErr == MathError.NO_ERROR, "underyling balance calculation failure");

        uint256 delta = deltaOf(streamId);
        (vars.mathErr, vars.recipientBalance) = mulScalarTruncate(compoundingStreamVars.underlyingRate, delta);
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation failure");

        if (who == stream.recipient) return vars.recipientBalance;
        if (who == stream.sender) {
            (vars.mathErr, vars.senderBalance) = subUInt(vars.underlyingBalanceInitial, vars.recipientBalance);
            require(vars.mathErr == MathError.NO_ERROR, "sender balance calculation failure");
            return vars.senderBalance;
        }
        return 0;
    }

    function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256 delta) {
        Types.Stream memory stream = streams[streamId];
        if (block.timestamp <= stream.startTime) return 0;
        if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;
        return stream.stopTime - stream.startTime;
    }

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

    function getCompoundingStreamVars(uint256 streamId)
        external
        view
        streamExists(streamId)
        returns (uint256 exchangeRateInitial, uint256 senderShare, uint256 recipientShare)
    {
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        return (
            compoundingStreamVars.exchangeRateInitial.mantissa,
            compoundingStreamVars.senderShare.mantissa,
            compoundingStreamVars.recipientShare.mantissa
        );
    }

    /* Public */

    struct CreateStreamLocalVars {
        MathError mathErr;
        uint256 duration;
        uint256 rate;
    }

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
        require(vars.mathErr == MathError.NO_ERROR, "rate calculation failure");

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
        require(vars.mathErr == MathError.NO_ERROR, "nonce calculation failure");

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
        (vars.mathErr, vars.shareSum) = addUInt(senderShare, recipientShare);
        require(vars.mathErr == MathError.NO_ERROR, "share sum calculation failure");
        require(vars.shareSum == 100, "shares do not sum up to 100");

        uint256 streamId = createStream(recipient, deposit, tokenAddress, startTime, stopTime);
        ICERC20 cToken = ICERC20(tokenAddress);
        Exp memory exchangeRateCurrent = Exp({ mantissa: cToken.exchangeRateCurrent() });

        (vars.mathErr, vars.underlyingRate) = mulScalar(exchangeRateCurrent, streams[streamId].rate);
        require(vars.mathErr == MathError.NO_ERROR, "underyling rate calculation failure");

        (vars.mathErr, vars.recipientShare) = mulUInt(recipientShare, 1e16);
        require(vars.mathErr == MathError.NO_ERROR, "recipient share mantissa calculation error");

        (vars.mathErr, vars.senderShare) = mulUInt(senderShare, 1e16);
        require(vars.mathErr == MathError.NO_ERROR, "sender share mantissa calculation error");

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

    /* Internal */

    struct ComputeInterestLocalVars {
        MathError mathErr;
        Exp exchangeRateDelta;
        uint256 underlyingBalanceCurrent;
        uint256 underlyingInterest;
        uint256 netUnderlyingInterest;
        uint256 senderUnderlyingInterest;
        uint256 recipientUnderlyingInterest;
        uint256 sablierUnderlyingInterest;
        uint256 senderInterest;
        uint256 recipientInterest;
        uint256 sablierInterest;
    }

    function computeInterest(uint256 streamId, uint256 amount) internal returns (uint256, uint256, uint256) {
        Types.Stream memory stream = streams[streamId];
        Types.CompoundingStreamVars memory compoundingStreamVars = compoundingStreamsVars[streamId];
        ComputeInterestLocalVars memory vars;

        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() });
        (vars.mathErr, vars.exchangeRateDelta) = subExp(exchangeRateCurrent, compoundingStreamVars.exchangeRateInitial);
        require(vars.mathErr == MathError.NO_ERROR, "exchange rate delta calculation error");

        (vars.mathErr, vars.underlyingInterest) = mulScalarTruncate(vars.exchangeRateDelta, amount);
        require(vars.mathErr == MathError.NO_ERROR, "interest calculation failure");

        // (vars.mathErr, vars.underlyingBalanceCurrent) = mulScalarTruncate(exchangeRateCurrent, stream.balance);
        // require(vars.mathErr == MathError.NO_ERROR, "underlying balance current calculation failure");

        // (vars.mathErr, vars.underlyingInterest) = subUInt(
        //     vars.underlyingBalanceCurrent,
        //     compoundingStreamVars.underlyingBalanceInitial
        // );

        (vars.mathErr, vars.sablierUnderlyingInterest) = mulScalarTruncate(fee, vars.underlyingInterest);
        require(vars.mathErr == MathError.NO_ERROR, "sablier interest calculation failure");

        (vars.mathErr, vars.netUnderlyingInterest) = subUInt(vars.underlyingInterest, vars.sablierUnderlyingInterest);
        require(vars.mathErr == MathError.NO_ERROR, "net interest calculation failure");

        (vars.mathErr, vars.senderUnderlyingInterest) = mulScalarTruncate(
            compoundingStreamVars.senderShare,
            vars.netUnderlyingInterest
        );
        require(vars.mathErr == MathError.NO_ERROR, "sender interest calculation failure");

        (vars.mathErr, vars.recipientUnderlyingInterest) = mulScalarTruncate(
            compoundingStreamVars.recipientShare,
            vars.netUnderlyingInterest
        );
        require(vars.mathErr == MathError.NO_ERROR, "recipient interest calculation failure");

        (vars.mathErr, vars.senderInterest) = divScalarByExpTruncate(
            vars.senderUnderlyingInterest,
            exchangeRateCurrent
        );
        require(vars.mathErr == MathError.NO_ERROR, "sender interest conversion failure");

        (vars.mathErr, vars.recipientInterest) = divScalarByExpTruncate(
            vars.recipientUnderlyingInterest,
            exchangeRateCurrent
        );
        require(vars.mathErr == MathError.NO_ERROR, "recipient interest conversion failure");

        (vars.mathErr, vars.sablierInterest) = divScalarByExpTruncate(
            vars.sablierUnderlyingInterest,
            exchangeRateCurrent
        );
        require(vars.mathErr == MathError.NO_ERROR, "sablier interest conversion failure");

        return (vars.senderInterest, vars.recipientInterest, vars.sablierInterest);
    }

    struct WithdrawFromStreamInternalLocalVars {
        MathError mathErr;
    }

    function withdrawFromStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        WithdrawFromStreamInternalLocalVars memory vars;
        (vars.mathErr, streams[streamId].balance) = subUInt(stream.balance, amount);
        require(vars.mathErr == MathError.NO_ERROR, "stream balance subtraction calculation failure");

        if (streams[streamId].balance == 0) delete streams[streamId];

        require(IERC20(stream.tokenAddress).transfer(stream.recipient, amount), "token transfer failure");
        emit WithdrawFromStream(streamId, stream.recipient, amount);
    }

    struct WithdrawFromCompoundingStreamInternalLocalVars {
        MathError mathErr;
        uint256 netAmountWithoutSenderInterest;
        uint256 netAmount;
    }

    function withdrawFromCompoundingStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];

        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = computeInterest(
            streamId,
            amount
        );

        WithdrawFromCompoundingStreamInternalLocalVars memory vars;
        (vars.mathErr, streams[streamId].balance) = subUInt(stream.balance, amount);
        require(vars.mathErr == MathError.NO_ERROR, "balance calculation failure");

        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation failure");
        if (streams[streamId].balance == 0) {
            delete streams[streamId];
            delete compoundingStreamsVars[streamId];
        }

        (vars.mathErr, vars.netAmountWithoutSenderInterest) = subUInt(amount, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "first net amount calculation failure");

        (vars.mathErr, vars.netAmount) = subUInt(vars.netAmountWithoutSenderInterest, sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "final net amount calculation failure");

        ICERC20 cToken = ICERC20(stream.tokenAddress);
        if (senderInterest > 0)
            require(cToken.transfer(stream.sender, senderInterest), "sender token transfer failure");
        require(cToken.transfer(stream.recipient, vars.netAmount), "recipient token transfer failure");

        emit WithdrawFromStream(streamId, stream.recipient, vars.netAmount);
        emit PayInterest(streamId, senderInterest, recipientInterest, sablierInterest);
    }

    function cancelStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        uint256 senderAmount = balanceOf(streamId, stream.sender);
        uint256 recipientAmount = balanceOf(streamId, stream.recipient);

        delete streams[streamId];

        IERC20 token = IERC20(stream.tokenAddress);
        if (recipientAmount > 0)
            require(token.transfer(stream.recipient, recipientAmount), "recipient token transfer failure");
        if (senderAmount > 0) require(token.transfer(stream.sender, senderAmount), "sender token transfer failure");

        emit CancelStream(streamId, stream.sender, stream.recipient, senderAmount, recipientAmount);
    }

    event DebugCancelCompoundingStreamInternal(
        uint256 balance,
        uint256 senderUnderlyingBalance,
        uint256 recipientUnderlyingBalance,
        uint256 senderBalance,
        uint256 recipientBalance,
        uint256 sablierInterest
    );

    struct CancelCompoundingStreamInternalLocalVars {
        MathError mathErr;
        uint256 senderUnderlyingBalance;
        uint256 recipientUnderlyingBalance;
        uint256 senderBalance;
        uint256 recipientBalance;
    }

    function cancelCompoundingStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = computeInterest(
            streamId,
            stream.balance
        );
        uint256 senderUnderlyingBalanceWithoutInterest = balanceOfUnderlyingWithoutInterest(streamId, stream.sender);
        uint256 recipientUnderlyingBalanceWithoutInterest = balanceOfUnderlyingWithoutInterest(
            streamId,
            stream.recipient
        );

        CancelCompoundingStreamInternalLocalVars memory vars;
        (vars.mathErr, vars.senderUnderlyingBalance) = addUInt(senderUnderlyingBalanceWithoutInterest, senderInterest);
        require(vars.mathErr == MathError.NO_ERROR, "sender underlying balance calculation failure");

        (vars.mathErr, vars.recipientUnderlyingBalance) = addUInt(
            recipientUnderlyingBalanceWithoutInterest,
            recipientInterest
        );
        require(vars.mathErr == MathError.NO_ERROR, "recipient underlying balance calculation failure");

        Exp memory exchangeRateCurrent = Exp({ mantissa: ICERC20(stream.tokenAddress).exchangeRateCurrent() });
        (vars.mathErr, vars.senderBalance) = divScalarByExpTruncate(vars.senderUnderlyingBalance, exchangeRateCurrent);
        require(vars.mathErr == MathError.NO_ERROR, "sender balance calculation failure");

        (vars.mathErr, vars.recipientBalance) = divScalarByExpTruncate(
            vars.recipientUnderlyingBalance,
            exchangeRateCurrent
        );
        require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation failure");

        (vars.mathErr, earnings[stream.tokenAddress]) = addUInt(earnings[stream.tokenAddress], sablierInterest);
        require(vars.mathErr == MathError.NO_ERROR, "earnings addition calculation failure");

        IERC20 token = IERC20(stream.tokenAddress);
        if (vars.senderBalance > 0)
            require(token.transfer(stream.sender, vars.senderBalance), "sender token transfer failure");
        if (vars.recipientBalance > 0)
            require(token.transfer(stream.recipient, vars.recipientBalance), "recipient token transfer failure");

        emit DebugCancelCompoundingStreamInternal(
            stream.balance,
            senderUnderlyingBalanceWithoutInterest,
            recipientUnderlyingBalanceWithoutInterest,
            vars.senderBalance,
            vars.recipientBalance,
            sablierInterest
        );
    }
}
