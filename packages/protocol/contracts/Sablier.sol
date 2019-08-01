pragma solidity 0.5.9;

import "./interfaces/IERC1620.sol";
import "./zeppelin/IERC20.sol";
import "./zeppelin/SafeMath.sol";

/// @title Sablier - ERC Money Streaming Implementation
/// @author Paul Berg - <hello@paulrberg.com>

contract Sablier is IERC1620 {
    using SafeMath for uint256;

    /**
     * Types
     */
    struct Timeframe {
        uint256 start;
        uint256 stop;
    }

    struct Rate {
        uint256 payment;
        uint256 interval;
    }

    struct Stream {
        address sender;
        address recipient;
        address tokenAddress;
        Timeframe timeframe;
        Rate rate;
        uint256 balance;
    }

    /**
     * Storage
     */
    mapping(uint256 => Stream) private streams;
    uint256 private streamNonce;
    mapping(uint256 => mapping(address => bool)) private updates;

    /**
     * Events
     */
    event CreateStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address tokenAddress,
        uint256 startBlock,
        uint256 stopBlock,
        uint256 payment,
        uint256 interval,
        uint256 deposit
    );

    event WithdrawFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event RedeemStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderAmount,
        uint256 recipientAmount
    );

    event ConfirmUpdate(
        uint256 indexed streamId,
        address indexed confirmer,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    event RevokeUpdate(
        uint256 indexed streamId,
        address indexed revoker,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    event ExecuteUpdate(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address newTokenAddress,
        uint256 newStopBlock,
        uint256 newPayment,
        uint256 newInterval
    );

    /*
    * Modifiers
    */
    modifier onlyRecipient(uint256 _streamId) {
        require(
            streams[_streamId].recipient == msg.sender,
            "only the stream recipient is allowed to perform this action"
        );
        _;
    }

    modifier onlySenderOrRecipient(uint256 _streamId) {
        require(
            msg.sender == streams[_streamId].sender ||
            msg.sender == streams[_streamId].recipient,
            "only the sender or the recipient of the stream can perform this action"
        );
        _;
    }

    modifier streamExists(uint256 _streamId) {
        require(
            streams[_streamId].sender != address(0x0), "stream doesn't exist");
        _;
    }

    modifier updateConfirmed(uint256 _streamId, address _addr) {
        require(
            updates[_streamId][_addr] == true,
            "msg.sender has not confirmed the update"
        );
        _;
    }

    /**
     * Functions
     */
    constructor() public {
        streamNonce = 1;
    }

    function balanceOf(uint256 _streamId, address _addr)
    public
    view
    streamExists(_streamId)
    returns (uint256 balance)
    {
        Stream memory stream = streams[_streamId];
        uint256 deposit = depositOf(_streamId);
        uint256 delta = deltaOf(_streamId);
        uint256 funds = delta.div(stream.rate.interval).mul(stream.rate.payment);

        if (stream.balance != deposit)
            funds = funds.sub(deposit.sub(stream.balance));

        if (_addr == stream.recipient) {
            return funds;
        } else if (_addr == stream.sender) {
            return stream.balance.sub(funds);
        } else {
            return 0;
        }
    }

    function getStream(uint256 _streamId)
    public
    view
    streamExists(_streamId)
    returns (
        address sender,
        address recipient,
        address tokenAddress,
        uint256 balance,
        uint256 startBlock,
        uint256 stopBlock,
        uint256 payment,
        uint256 interval
    )
    {
        Stream memory stream = streams[_streamId];
        return (
            stream.sender,
            stream.recipient,
            stream.tokenAddress,
            stream.balance,
            stream.timeframe.start,
            stream.timeframe.stop,
            stream.rate.payment,
            stream.rate.interval
        );
    }

    function getUpdate(uint256 _streamId, address _addr)
    public
    view
    streamExists(_streamId)
    returns (bool active)
    {
        return updates[_streamId][_addr];
    }

    function createStream(
        address _sender,
        address _recipient,
        address _tokenAddress,
        uint256 _startBlock,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
        public
    {
        verifyTerms(
            _tokenAddress,
            _startBlock,
            _stopBlock,
            _interval
        );

        // only ERC20 tokens can be streamed
        uint256 deposit = _stopBlock.sub(_startBlock).div(_interval).mul(_payment);
        IERC20 tokenContract = IERC20(_tokenAddress);
        uint256 allowance = tokenContract.allowance(_sender, address(this));
        require(allowance >= deposit, "contract not allowed to transfer enough tokens");

        // create and log the stream if the deposit is okay
        streams[streamNonce] = Stream({
            balance : deposit,
            sender : _sender,
            recipient : _recipient,
            tokenAddress : _tokenAddress,
            timeframe : Timeframe(_startBlock, _stopBlock),
            rate : Rate(_payment, _interval)
        });
        emit CreateStream(
            streamNonce,
            _sender,
            _recipient,
            _tokenAddress,
            _startBlock,
            _stopBlock,
            _payment,
            _interval,
            deposit
        );
        streamNonce = streamNonce.add(1);

        // apply Checks-Effects-Interactions
        require(tokenContract.transferFrom(_sender, address(this), deposit), "initial deposit failed");
    }

    function withdrawFromStream(
        uint256 _streamId,
        uint256 _amount
    )
    public
    streamExists(_streamId)
    onlyRecipient(_streamId)
    {
        Stream memory stream = streams[_streamId];
        uint256 availableFunds = balanceOf(_streamId, stream.recipient);
        require(availableFunds >= _amount, "not enough funds");

        streams[_streamId].balance = streams[_streamId].balance.sub(_amount);
        emit WithdrawFromStream(_streamId, stream.recipient, _amount);

        // saving gas
        if (streams[_streamId].balance == 0) {
            delete streams[_streamId];
            updates[_streamId][stream.sender] = false;
            updates[_streamId][stream.recipient] = false;
        }

        // saving gas by checking beforehand
        if (_amount > 0)
            require(IERC20(stream.tokenAddress).transfer(stream.recipient, _amount), "erc20 transfer failed");
    }

    function redeemStream(uint256 _streamId)
    public
    streamExists(_streamId)
    onlySenderOrRecipient(_streamId)
    {
        Stream memory stream = streams[_streamId];
        uint256 senderAmount = balanceOf(_streamId, stream.sender);
        uint256 recipientAmount = balanceOf(_streamId, stream.recipient);
        emit RedeemStream(
            _streamId,
            stream.sender,
            stream.recipient,
            senderAmount,
            recipientAmount
        );

        // saving gas
        delete streams[_streamId];
        updates[_streamId][stream.sender] = false;
        updates[_streamId][stream.recipient] = false;

        IERC20 tokenContract = IERC20(stream.tokenAddress);
        // saving gas by checking beforehand
        if (recipientAmount > 0)
            require(tokenContract.transfer(stream.recipient, recipientAmount), "erc20 transfer failed");
        if (senderAmount > 0)
            require(tokenContract.transfer(stream.sender, senderAmount), "erc20 transfer failed");
    }

    function confirmUpdate(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
    public
    streamExists(_streamId)
    onlySenderOrRecipient(_streamId)
    {
        onlyNewTerms(
            _streamId,
            _tokenAddress,
            _stopBlock,
            _payment,
            _interval
        );
        verifyTerms(
            _tokenAddress,
            block.number,
            _stopBlock,
            _interval
        );

        emit ConfirmUpdate(
            _streamId,
            msg.sender,
            _tokenAddress,
            _stopBlock,
            _payment,
            _interval
        );
        updates[_streamId][msg.sender] = true;

        executeUpdate(
            _streamId,
            _tokenAddress,
            _stopBlock,
            _payment,
            _interval
        );
    }

    function revokeUpdate(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
        public
        updateConfirmed(_streamId, msg.sender)
    {
        emit RevokeUpdate(
            _streamId,
            msg.sender,
            _tokenAddress,
            _stopBlock,
            _payment,
            _interval
        );
        updates[_streamId][msg.sender] = false;
    }

    /**
     * Private
     */
    function deltaOf(uint256 _streamId)
    private
    view
    returns (uint256 delta)
    {
        Stream memory stream = streams[_streamId];
        uint256 startBlock = stream.timeframe.start;
        uint256 stopBlock = stream.timeframe.stop;

        // before the start of the stream
        if (block.number <= startBlock)
            return 0;

        // during the stream
        if (block.number <= stopBlock)
            return block.number - startBlock;

        // after the end of the stream
        return stopBlock - startBlock;
    }

    function depositOf(uint256 _streamId)
    private
    view
    returns (uint256 funds)
    {
        Stream memory stream = streams[_streamId];
        return stream.timeframe.stop
            .sub(stream.timeframe.start)
            .div(stream.rate.interval)
            .mul(stream.rate.payment);
    }

    function onlyNewTerms(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
    private
    view
    returns (bool valid)
    {
        require(
            streams[_streamId].tokenAddress != _tokenAddress ||
            streams[_streamId].timeframe.stop != _stopBlock ||
            streams[_streamId].rate.payment != _payment ||
            streams[_streamId].rate.interval != _interval,
            "stream has these terms already"
        );
        return true;
    }

    function verifyTerms(
        address _tokenAddress,
        uint256 _startBlock,
        uint256 _stopBlock,
        uint256 _interval
    )
    private
    view
    returns (bool valid)
    {
        require(
            _tokenAddress != address(0x0),
            "token contract address needs to be provided"
        );
        require(
            _startBlock >= block.number,
            "the start block needs to be higher than the current block number"
        );
        require(
            _stopBlock > _startBlock,
            "the stop block needs to be higher than the start block"
        );
        uint256 delta = _stopBlock - _startBlock;
        require(
            delta >= _interval,
            "the block difference needs to be higher than the payment interval"
        );
        require(
            delta.mod(_interval) == 0,
            "the block difference needs to be a multiple of the payment interval"
        );
        return true;
    }

    function executeUpdate(
        uint256 _streamId,
        address _tokenAddress,
        uint256 _stopBlock,
        uint256 _payment,
        uint256 _interval
    )
        private
        streamExists(_streamId)
    {
        Stream memory stream = streams[_streamId];
        if (updates[_streamId][stream.sender] == false)
            return;
        if (updates[_streamId][stream.recipient] == false)
            return;

        // adjust stop block
        uint256 remainder = _stopBlock.sub(block.number).mod(_interval);
        uint256 adjustedStopBlock = _stopBlock.sub(remainder);
        emit ExecuteUpdate(
            _streamId,
            stream.sender,
            stream.recipient,
            _tokenAddress,
            adjustedStopBlock,
            _payment,
            _interval
        );
        updates[_streamId][stream.sender] = false;
        updates[_streamId][stream.recipient] = false;

        redeemStream(_streamId);
        createStream(
            stream.sender,
            stream.recipient,
            _tokenAddress,
            block.number,
            adjustedStopBlock,
            _payment,
            _interval
        );
    }
}
