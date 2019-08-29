pragma solidity 0.5.10;

/// @dev Forked from OpenZeppelin's ERC20
/// @author Paul Razvan Berg - <paul@sablier.app>

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "./NonStandardIERC20.sol";

contract NonStandardERC20 is NonStandardIERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    /**
     * @dev See `IERC20.nonStandardTotalSupply`.
     */
    function nonStandardTotalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See `IERC20.nonStandardBalanceOf`.
     */
    function nonStandardBalanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See `IERC20.nonStandardTransfer`.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function nonStandardTransfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See `IERC20.nonStandardAllowance`.
     */
    function nonStandardAllowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See `IERC20.nonStandardApprove`.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function nonStandardApprove(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev See `IERC20.nonStandardTransferFrom`.
     *
     * Emits an `NonStandardApproval` event indicating the updated nonStandardAllowance. This is not
     * required by the EIP. See the note at the beginning of `ERC20`;
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `value`.
     * - the caller must have nonStandardAllowance for `sender`'s tokens of at least
     * `amount`.
     */
    function nonStandardTransferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount));
        return true;
    }

    /**
     * @dev Atomically increases the nonStandardAllowance granted to `spender` by the caller.
     *
     * This is an alternative to `nonStandardApprove` that can be used as a mitigation for
     * problems described in `IERC20.nonStandardApprove`.
     *
     * Emits an `NonStandardApproval` event indicating the updated nonStandardAllowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function nonStandardIncreaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }

    /**
     * @dev Atomically decreases the nonStandardAllowance granted to `spender` by the caller.
     *
     * This is an alternative to `nonStandardApprove` that can be used as a mitigation for
     * problems described in `IERC20.nonStandardApprove`.
     *
     * Emits an `NonStandardApproval` event indicating the updated nonStandardAllowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have nonStandardAllowance for the caller of at least
     * `subtractedValue`.
     */
    function nonStandardDecreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue));
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to `nonStandardTransfer`, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a `NonStandardTransfer` event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: nonStandardTransfer from the zero address");
        require(recipient != address(0), "ERC20: nonStandardTransfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit NonStandardTransfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a `NonStandardTransfer` event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit NonStandardTransfer(address(0), account, amount);
    }

    /**
     * @dev Destoys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a `NonStandardTransfer` event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit NonStandardTransfer(account, address(0), value);
    }

    /**
     * @dev Sets `amount` as the nonStandardAllowance of `spender` over the `owner`s tokens.
     *
     * This is internal function is equivalent to `nonStandardApprove`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an `NonStandardApproval` event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 value) internal {
        require(owner != address(0), "ERC20: nonStandardApprove from the zero address");
        require(spender != address(0), "ERC20: nonStandardApprove to the zero address");

        _allowances[owner][spender] = value;
        emit NonStandardApproval(owner, spender, value);
    }

    /**
     * @dev Destoys `amount` tokens from `account`.`amount` is then deducted
     * from the caller's nonStandardAllowance.
     *
     * See `_burn` and `_approve`.
     */
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount));
    }
}
