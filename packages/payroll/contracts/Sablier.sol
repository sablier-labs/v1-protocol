
// File: @openzeppelin/contracts/math/SafeMath.sol

pragma solidity ^0.5.0;

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, "SafeMath: division by zero");
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0, "SafeMath: modulo by zero");
        return a % b;
    }
}

// File: @openzeppelin/contracts/ownership/Ownable.sol

pragma solidity ^0.5.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be aplied to your functions to restrict their use to
 * the owner.
 */
contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// File: @openzeppelin/contracts/token/ERC20/IERC20.sol

pragma solidity ^0.5.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see `ERC20Detailed`.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `Transfer` event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through `transferFrom`. This is
     * zero by default.
     *
     * This value changes when `approve` or `transferFrom` are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * > Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an `Approval` event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `Transfer` event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to `approve`. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: contracts/interfaces/IERC1620.sol

pragma solidity 0.5.10;

/// @title ERC-1620 Money Streaming Standard
/// @author Paul Berg - <paul@sablier.app>
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
            "caller is not the sender or the recipient of the stream"
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

    function withdraw(uint256 streamId, uint256 amount) external streamExists(streamId) onlySenderOrRecipient(streamId) {
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
