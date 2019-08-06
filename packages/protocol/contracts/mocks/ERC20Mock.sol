pragma solidity 0.5.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock class using ERC20
/// @author OpenZeppelin Community - <maintainers@openzeppelin.org>

contract ERC20Mock is ERC20 {
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }

    function transferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function approveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }
}
