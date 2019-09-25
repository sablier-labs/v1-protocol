pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/**
 * @title Non Standard ERC20
 * @dev Forked from OpenZeppelin's ERC20
 * @author Sablier
 */

contract NonStandardERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    event NonStandardTransfer(address indexed from, address indexed to, uint256 value);

    event NonStandardApproval(address indexed owner, address indexed spender, uint256 value);

    function nonStandardTotalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function nonStandardBalanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function nonStandardTransfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function nonStandardAllowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
    function nonStandardApprove(address spender, uint256 value) public returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function nonStandardTransferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount));
        return true;
    }

    function nonStandardIncreaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }

    function nonStandardDecreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue));
        return true;
    }

    function nonStandardMint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: nonStandardTransfer from the zero address");
        require(recipient != address(0), "ERC20: nonStandardTransfer to the zero address");

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit NonStandardTransfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit NonStandardTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 value) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _totalSupply = _totalSupply.sub(value);
        _balances[account] = _balances[account].sub(value);
        emit NonStandardTransfer(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        require(owner != address(0), "ERC20: nonStandardApprove from the zero address");
        require(spender != address(0), "ERC20: nonStandardApprove to the zero address");

        _allowances[owner][spender] = value;
        emit NonStandardApproval(owner, spender, value);
    }

    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount));
    }
}
