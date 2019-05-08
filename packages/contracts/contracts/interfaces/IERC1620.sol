pragma solidity >=0.5.0 <0.6.0;

/// @title ERC-1620 Money Streaming Standard
/// @dev See https://github.com/ethereum/eips/issues/1620

interface IERC1620 {

    /// @dev This emits when streams are successfully created and added
    ///  in the mapping object.
    event CreateStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address tokenAddress,
        uint256 startBlock,
        uint256 stopBlock,
        uint256 payment,
        uint256 interval
    );

    /// @dev This emits when the receiver of a stream withdraws a portion
    ///  or all of their available funds from an ongoing stream, without
    ///  stopping it. Note that we don't keep track of both the sender and
    ///  the recipient's balance because only the recipient can withdraw
    ///  while the stream is active.
    event WithdrawFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 funds
    );

    /// @dev This emits when a stream is successfully redeemed and
    ///  all involved parties get their share of the available funds.
    event RedeemStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    /// @dev This emits when an update is successfully committed by
    ///  one of the involved parties.
    event ConfirmUpdate(
        uint256 indexed streamId,
        address indexed confirmer,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    /// @dev This emits when one of the involved parties revokes
    ///  a proposed update to the stream.
    event RevokeUpdate(
        uint256 indexed streamId,
        address indexed revoker,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    /// @dev This emits when an update (that is, modifications to
    ///  payment rate, starting or stopping block) is successfully
    ///  approved by all involved parties.
    event ExecuteUpdate(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    /// @notice Creates a new stream between `msg.sender` and `_recipient`
    /// @dev Throws unless `msg.value` is exactly
    ///  `_payment * ((_stopBlock - _startBlock) / _interval)`.
    ///  Throws if `_startBlock` is not higher than `block.number`.
    ///  Throws if `_stopBlock` is not higher than `_startBlock`.
    ///  Throws if the total streaming duration `_stopBlock - _startBlock`
    ///  is not a multiple of `_interval`.
    /// @param _recipient The stream sender or the payer
    /// @param _recipient The stream recipient or the payee
    /// @param _tokenAddress The token contract address
    /// @param _startBlock The starting time of the stream
    /// @param _stopBlock The stopping time of the stream
    /// @param _payment How much money moves from sender to recipient
    /// @param _interval How often the `payment` moves from sender to recipient
    function createStream(
        address _sender,
        address _recipient,
        address _tokenAddress,
        uint256 _startBlock,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
    external;

    /// @notice Withdraws all or a fraction of the available funds
    /// @dev Throws if `_streamId` doesn't point to a valid stream.
    ///  Throws if `msg.sender` is not the recipient of the given `streamId`
    /// @param _streamId The stream to withdraw from
    /// @param _funds The amount of money to withdraw
    function withdrawFromStream(
        uint256 _streamId,
        uint256 _funds
    )
    external;

    /// @notice Redeems the stream by distributing the funds to the sender and the recipient
    /// @dev Throws if `_streamId` doesn't point to a valid stream.
    ///  Throws unless `msg.sender` is either the sender or the recipient
    ///  of the given `streamId`.
    /// @param _streamId The stream to stop
    function redeemStream(
        uint256 _streamId
    )
    external;

    /// @notice Signals one party's willingness to update the stream
    /// @dev Throws if `_streamId` doesn't point to a valid stream.
    ///  Not executed prior to everyone agreeing to the new terms.
    ///  In terms of validation, it works exactly the same as the `createStream` function.
    /// @param _streamId The stream to update
    /// @param _tokenAddress The token contract address
    /// @param _stopBlock The new stopping time of the stream
    /// @param _payment How much money moves from sender to recipient
    /// @param _interval How often the `payment` moves from sender to recipient
    function confirmUpdate(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
    external;

    /// @notice Revokes an update proposed by one of the involved parties
    /// @dev Throws if `_streamId` doesn't point to a valid stream. The parameters
    ///  are merely for logging purposes.
    function revokeUpdate(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
    external;

    /// @notice Returns available funds for the given stream id and address
    /// @dev Streams assigned to the zero address are considered invalid, and
    ///  this function throws for queries about the zero address.
    /// @param _streamId The stream for whom to query the balance
    /// @param _addr The address for whom to query the balance
    /// @return The total funds available to `addr` to withdraw
    function balanceOf(
        uint256 _streamId,
        address _addr
    )
    external
    view
    returns (
        uint256 balance
    );

    /// @notice Returns the full stream data
    /// @dev Throws if `_streamId` doesn't point to a valid stream.
    /// @param _streamId The stream to return data for
    function getStream(
        uint256 _streamId
    )
    external
    view
    returns (
        address _sender,
        address _recipient,
        address _tokenAddress,
        uint256 _balance,
        uint256 _startBlock,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    );
}
