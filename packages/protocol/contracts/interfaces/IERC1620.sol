pragma solidity 0.5.10;

/// @title ERC-1620 Money Streaming Standard
/// @author Paul Berg - <hello@paulrberg.com>
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
