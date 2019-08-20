pragma solidity 0.5.10;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./interfaces/IERC1620.sol";
import "./Types.sol";

/// @title Sablier - Money Streaming Implementation
/// @author Paul Berg - <paul@sablier.app>

contract Sablier is IERC1620, Ownable {
    using SafeMath for uint256;

    mapping(uint256 => Types.Stream) private streams;
    uint256 public nonce;

    modifier onlyRecipient(uint256 streamId) {
        require(streams[streamId].recipient == msg.sender, "caller is not the recipient of the stream");
        _;
    }

    modifier onlySenderOrRecipient(uint256 streamId) {
        require(
            msg.sender == streams[streamId].sender || msg.sender == streams[streamId].recipient,
            "caller is not the stream or the recipient of the stream"
        );
        _;
    }

    modifier streamExists(uint256 streamId) {
        require(streams[streamId].isEntity, "stream does not exist");
        _;
    }

    constructor() public {
        nonce = 1;
    }

    function balanceOf(uint256 streamId, address who) public view streamExists(streamId) returns (uint256 balance) {
        Types.Stream memory stream = streams[streamId];
        uint256 delta = deltaOf(streamId);
        uint256 streamed = delta.mul(stream.rate);
        if (stream.balance != stream.deposit) {
            streamed = streamed.sub(stream.deposit.sub(stream.balance));
        }
        if (who == stream.recipient) {
            return streamed;
        } else if (who == stream.sender) {
            return stream.balance.sub(streamed);
        } else {
            return 0;
        }
    }

    function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256 delta) {
        Types.Stream memory stream = streams[streamId];

        // before the start of the stream
        if (block.timestamp <= stream.startTime) return 0;

        // during the stream
        if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;

        // after the end of the stream
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

    function create(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)
        external
        returns (uint256 streamId)
    {
        require(recipient != address(0x00), "stream to the zero address");
        require(recipient != address(this), "stream to the contract itself");
        require(recipient != msg.sender, "stream to the caller");
        require(deposit > 0, "deposit is zero");
        require(startTime >= block.timestamp, "start time before block.timestamp");
        require(stopTime > startTime, "stop time before the start time");
        require(deposit.mod(stopTime.sub(startTime)) == 0, "deposit not multiple of time delta");

        streamId = nonce;
        address sender = msg.sender;
        uint256 rate = deposit.div(stopTime.sub(startTime));
        streams[streamId] = Types.Stream({
            balance: deposit,
            deposit: deposit,
            isEntity: true,
            rate: rate,
            recipient: recipient,
            sender: sender,
            startTime: startTime,
            stopTime: stopTime,
            tokenAddress: tokenAddress
        });

        emit Create(streamId, sender, recipient, deposit, tokenAddress, startTime, stopTime);

        nonce = nonce.add(1);
        require(IERC20(tokenAddress).transferFrom(sender, address(this), deposit), "token transfer failure");
    }

    function withdraw(uint256 streamId, uint256 amount) external streamExists(streamId) onlyRecipient(streamId) {
        require(amount > 0, "amount is zero");
        Types.Stream memory stream = streams[streamId];
        uint256 balance = balanceOf(streamId, stream.recipient);
        require(balance >= amount, "withdrawal exceeds the available balance");

        streams[streamId].balance = streams[streamId].balance.sub(amount);
        emit Withdraw(streamId, stream.recipient, amount);
        if (streams[streamId].balance == 0) delete streams[streamId];

        require(IERC20(stream.tokenAddress).transfer(stream.recipient, amount), "token transfer failure");
    }

    function cancel(uint256 streamId) external streamExists(streamId) onlySenderOrRecipient(streamId) {
        Types.Stream memory stream = streams[streamId];
        uint256 senderAmount = balanceOf(streamId, stream.sender);
        uint256 recipientAmount = balanceOf(streamId, stream.recipient);

        emit Cancel(streamId, stream.sender, stream.recipient, senderAmount, recipientAmount);
        delete streams[streamId];

        IERC20 token = IERC20(stream.tokenAddress);
        if (recipientAmount > 0)
            require(token.transfer(stream.recipient, recipientAmount), "recipient token transfer failure");
        if (senderAmount > 0) require(token.transfer(stream.sender, senderAmount), "sender token transfer failure");
    }
}
