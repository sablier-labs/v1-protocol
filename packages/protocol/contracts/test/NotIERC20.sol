pragma solidity ^0.5.0;

/// @dev Forked from OpenZeppelin's IERC20
/// @author Paul Berg - <hello@paulrberg.com>

interface NotIERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function notTotalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function notBalanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `NotTransfer` event.
     */
    function notTransfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through `notTransferFrom`. This is
     * zero by default.
     *
     * This value changes when `notApprove` or `notTransferFrom` are called.
     */
    function notAllowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the notAllowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * > Beware that changing an notAllowance with this method brings the risk
     * that someone may use both the old and the new notAllowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's notAllowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an `NotApproval` event.
     */
    function notApprove(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * notAllowance mechanism. `amount` is then deducted from the caller's
     * notAllowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `NotTransfer` event.
     */
    function notTransferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event NotTransfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the notAllowance of a `spender` for an `owner` is set by
     * a call to `notApprove`. `value` is the new notAllowance.
     */
    event NotApproval(address indexed owner, address indexed spender, uint256 value);
}
