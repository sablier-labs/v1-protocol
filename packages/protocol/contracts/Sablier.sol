pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "./compound/Exponential.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/IERC1620.sol";
import "./Types.sol";

/// @title Sablier - Money Streaming Implementation
/// @author Paul Razvan Berg - <paul@sablier.app>

contract Sablier is IERC1620, Ownable, ReentrancyGuard, Exponential {
    using SafeMath for uint256;

    mapping(uint256 => Types.Compound) private compounds;
    mapping(address => bool) public cTokens;
    mapping(address => uint256) public earnings;
    uint256 public fee;
    uint256 public nonce;
    mapping(uint256 => Types.Stream) private streams;

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

    function updateFee(uint256 newFee) external onlyOwner {
        require(newFee <= 100, "new fee higher than 100%");
        fee = newFee;
        emit UpdateFee(newFee);
    }

    function takeEarnings(address tokenAddress, uint256 amount) external nonReentrant onlyOwner {
        require(cTokens[tokenAddress], "ctoken is not whitelisted");
        require(earnings[tokenAddress] >= amount, "amount exceeds the available balance");

        earnings[tokenAddress] = earnings[tokenAddress].sub(amount);
        emit TakeEarnings(tokenAddress, amount);
        require(IERC20(tokenAddress).transfer(msg.sender, amount));
    }

    /* Public View */

    function balanceOf(uint256 streamId, address who) public view streamExists(streamId) returns (uint256 balance) {
        Types.Stream memory stream = streams[streamId];
        uint256 delta = deltaOf(streamId);
        uint256 streamed = delta.mul(stream.rate);
        if (stream.balance != stream.deposit) streamed = streamed.sub(stream.deposit.sub(stream.balance));
        if (who == stream.recipient) return streamed;
        if (who == stream.sender) return stream.balance.sub(streamed);
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

    function getCompoundForStream(uint256 streamId)
        external
        view
        streamExists(streamId)
        returns (uint256 exchangeRate, uint256 senderShare, uint256 recipientShare)
    {
        Types.Compound memory compound = compounds[streamId];
        return (compound.exchangeRate, compound.senderShare, compound.recipientShare);
    }

    /* Public */

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
        require(deposit.mod(stopTime.sub(startTime)) == 0, "deposit not multiple of time delta");

        uint256 streamId = nonce;
        streams[streamId] = Types.Stream({
            balance: deposit,
            deposit: deposit,
            isEntity: true,
            rate: deposit.div(stopTime.sub(startTime)),
            recipient: recipient,
            sender: msg.sender,
            startTime: startTime,
            stopTime: stopTime,
            tokenAddress: tokenAddress
        });
        nonce = nonce.add(1);
        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), deposit), "token transfer failure");

        emit CreateStream(streamId, msg.sender, recipient, deposit, tokenAddress, startTime, stopTime);
        return streamId;
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
        require(senderShare.add(recipientShare) == 100, "shares do not sum up to 100%");

        uint256 streamId = createStream(recipient, deposit, tokenAddress, startTime, stopTime);
        uint256 exchangeRate = ICERC20(tokenAddress).exchangeRateCurrent();
        compounds[streamId] = Types.Compound({
            exchangeRate: exchangeRate,
            isEntity: true,
            recipientShare: recipientShare,
            senderShare: senderShare
        });

        emit CreateCompoundingStream(streamId, exchangeRate, senderShare, recipientShare);
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

        if (!compounds[streamId].isEntity) {
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
        if (!compounds[streamId].isEntity) {
            cancelStreamInternal(streamId);
        } else {
            cancelCompoundingStreamInternal(streamId);
        }
        return true;
    }

    /* Internal */

    function calculateAndSplitInterest(uint256 streamId, uint256 amount) internal returns (uint256, uint256, uint256) {
        Types.Stream memory stream = streams[streamId];
        Types.Compound memory compound = compounds[streamId];

        // Compute exchange rate delta
        ICERC20 cToken = ICERC20(stream.tokenAddress);
        uint256 exchangeRateCurrent = cToken.exchangeRateCurrent();
        require(exchangeRateCurrent > 0, "exchange rate current is 0");
        uint256 exchangeRateDelta = exchangeRateCurrent.sub(compound.exchangeRate);

        // How much interest has the withdrawal amount generated
        uint256 underlyingInterest = amount.mul(exchangeRateDelta);
        uint256 interest = underlyingInterest.mul(1e18).div(exchangeRateCurrent);

        return splitInterest(streamId, interest);
    }

    event DebugInterest(
        uint256 netInterest,
        uint256 senderInterest,
        uint256 recipientInterest,
        uint256 sablierInterest
    );

    function splitInterest(uint256 streamId, uint256 interest) internal returns (uint256, uint256, uint256) {
        Types.Compound memory compound = compounds[streamId];
        uint256 sablierInterest = interest.mul(fee).div(100);
        uint256 netInterest = interest.sub(sablierInterest);
        uint256 senderInterest = netInterest.mul(compound.senderShare).div(100);
        uint256 recipientInterest = netInterest.mul(compound.recipientShare).div(100);
        // emit DebugInterest(netInterest, senderInterest, recipientInterest, sablierInterest);
        // assert(senderInterest.add(recipientInterest) == netInterest);
        return (senderInterest, recipientInterest, sablierInterest);
    }

    function withdrawFromStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];

        streams[streamId].balance = streams[streamId].balance.sub(amount);
        if (streams[streamId].balance == 0) delete streams[streamId];

        require(IERC20(stream.tokenAddress).transfer(stream.recipient, amount), "token transfer failure");
        emit WithdrawFromStream(streamId, stream.recipient, amount);
    }

    function withdrawFromCompoundingStreamInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];

        // Compute and distribute the interest according to the pre-determined rules
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = calculateAndSplitInterest(
            streamId,
            amount
        );

        // Update storage
        earnings[stream.tokenAddress] = earnings[stream.tokenAddress].add(sablierInterest);
        streams[streamId].balance = streams[streamId].balance.sub(amount);
        if (streams[streamId].balance == 0) {
            delete streams[streamId];
            delete compounds[streamId];
        }

        // Distribute the tokens
        ICERC20 cToken = ICERC20(stream.tokenAddress);
        uint256 netAmount = amount.sub(senderInterest).sub(sablierInterest);
        if (senderInterest > 0)
            require(cToken.transfer(stream.sender, senderInterest), "sender token transfer failure");
        require(cToken.transfer(stream.recipient, netAmount), "recipient token transfer failure");

        emit WithdrawFromStream(streamId, stream.recipient, netAmount);
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

    event DebugCancelCompoundingStreamInternal(uint256 senderNetAmount, uint256 recipientNetAmount);

    function cancelCompoundingStreamInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        uint256 balance = stream.balance;
        uint256 senderBalance = balanceOf(streamId, stream.sender);
        uint256 recipientBalance = balanceOf(streamId, stream.recipient);

        // Compute and distribute the interest according to the pre-determined rules
        (uint256 senderInterest, uint256 recipientInterest, uint256 sablierInterest) = calculateAndSplitInterest(
            streamId,
            balance
        );
        uint256 senderNetAmount = senderBalance.sub(sablierInterest.div(2));
        uint256 recipientNetAmount = recipientBalance.sub(sablierInterest.div(2));

        // Update storage
        earnings[stream.tokenAddress] = earnings[stream.tokenAddress].add(sablierInterest);
        delete streams[streamId];
        delete compounds[streamId];

        // Distribute the tokens
        IERC20 token = IERC20(stream.tokenAddress);
        if (recipientNetAmount > 0)
            require(token.transfer(stream.recipient, recipientNetAmount), "recipient token transfer failure");
        if (senderNetAmount > 0)
            require(token.transfer(stream.sender, senderNetAmount), "sender token transfer failure");

        emit CancelStream(streamId, stream.sender, stream.recipient, senderNetAmount, recipientNetAmount);
        emit PayInterest(streamId, senderInterest, recipientInterest, sablierInterest);
        emit DebugCancelCompoundingStreamInternal(senderNetAmount, recipientNetAmount);
    }
}
