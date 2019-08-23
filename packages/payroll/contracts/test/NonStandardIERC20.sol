pragma solidity ^0.5.0;

/// @dev Forked from OpenZeppelin's IERC20
/// @author Paul Berg - <paul@sablier.app>

interface NonStandardIERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function nonStandardTotalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function nonStandardBalanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `NonStandardTransfer` event.
     */
    function nonStandardTransfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through `nonStandardTransferFrom`. This is
     * zero by default.
     *
     * This value changes when `nonStandardApprove` or `nonStandardTransferFrom` are called.
     */
    function nonStandardAllowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the nonStandardAllowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * > Beware that changing an nonStandardAllowance with this method brings the risk
     * that someone may use both the old and the new nonStandardAllowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's nonStandardAllowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an `NonStandardApproval` event.
     */
    function nonStandardApprove(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * nonStandardAllowance mechanism. `amount` is then deducted from the caller's
     * nonStandardAllowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a `NonStandardTransfer` event.
     */
    function nonStandardTransferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event NonStandardTransfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the nonStandardAllowance of a `spender` for an `owner` is set by
     * a call to `nonStandardApprove`. `value` is the new nonStandardAllowance.
     */
    event NonStandardApproval(address indexed owner, address indexed spender, uint256 value);
}
