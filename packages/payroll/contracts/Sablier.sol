pragma solidity 0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

// File: contracts/interfaces/IERC1620.sol

pragma solidity 0.5.10;

/// @title ERC-1620 Money Streaming Standard
/// @author Paul Razvan Berg - <paul@sablier.app>
/// @dev See https://github.com/ethereum/eips/issues/1620

interface IERC1620 {
    /// @dev This emits when streams are successfully created.
    event Create(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    );

    /// @dev This emits when the receiver of a stream withdraws a portion or all their available
    ///  funds from an ongoing stream, without stopping it. Note that we don't emit both the
    //   sender and the recipient's balance because only the recipient can withdraw.
    event Withdraw(uint256 indexed streamId, address indexed recipient, uint256 amount);

    /// @dev This emits when a stream is successfully redeemed and
    ///  all involved parties get their share of the available funds.
    event Cancel(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderAmount,
        uint256 recipientAmount
    );

    /// @notice Creates a new stream between `sender` and `recipient`.
    /// @dev Throws unless the contract is allowed to transfer more than `deposit` tokens.
    ///  Throws if `startTime` is lower or equal to `block.timestamp`.
    ///  Throws if `stopTime` is lower than `startTime`.
    /// @param recipient The stream recipient or the payee.
    /// @param deposit How much money it's streamed from sender to recipient.
    /// @param tokenAddress The token contract.
    /// @param startTime The start time of the stream.
    /// @param stopTime The stop time of the stream.
    function create(address recipient, uint256 deposit, address tokenAddress, uint256 startTime, uint256 stopTime)
        external
        returns (uint256 streamId);

    /// @notice Withdraws all or a portion of the available funds.
    /// @dev If the stream ended and the recipient withdraws the deposit in full, the stream object
    ///  is deleted after this operation to save gas for the user and optimise contract storage.
    ///  Throws if `streamId` doesn't point to a valid stream.
    ///  Throws if `msg.sender` is not the recipient of the given `streamId`
    /// @param streamId The stream to withdraw from
    /// @param funds The amount of money to withdraw
    function withdraw(uint256 streamId, uint256 funds) external;

    /// @notice Distributes the funds to the sender and the recipient.
    /// @dev The stream object gets deleted after this operation to save gas
    ///  for the user and optimise contract storage.
    ///  Throws if `streamId` points to an invalid stream.
    ///  Throws if `msg.sender` is not either the sender or the recipient.
    ///  of the given `streamId`.
    /// @param streamId The stream to stop.
    function cancel(uint256 streamId) external;

    /// @notice Returns available funds for the given stream id and address
    /// @dev Streams assigned to the zero address are considered invalid, and
    ///  this function throws for queries about the zero address.
    /// @param streamId The stream for whom to query the balance
    /// @param who The address for whom to query the balance
    /// @return The total funds available to `who` to withdraw
    function balanceOf(uint256 streamId, address who) external view returns (uint256 balance);

    /// @notice Returns the full stream data
    /// @dev Throws if `streamId` points to an invalid stream.
    /// @param streamId The stream to return data for
    function getStream(uint256 streamId)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 deposit,
            address token,
            uint256 startTime,
            uint256 stopTime,
            uint256 balance,
            uint256 rate
        );
}

// File: contracts/Types.sol

pragma solidity 0.5.10;

library Types {
    struct Stream {
        uint256 balance;
        uint256 deposit;
        bool isEntity;
        uint256 rate;
        address recipient;
        address sender;
        uint256 startTime;
        uint256 stopTime;
        address tokenAddress;
    }
}

// File: contracts/Sablier.sol

pragma solidity 0.5.10;

/// @title Sablier - Money Streaming Implementation
/// @author Paul Razvan Berg - <paul@sablier.app>

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

    function withdraw(uint256 streamId, uint256 amount)
        external
        streamExists(streamId)
        onlySenderOrRecipient(streamId)
    {
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
