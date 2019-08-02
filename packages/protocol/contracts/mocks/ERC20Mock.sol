pragma solidity 0.5.10;

import "../zeppelin/ERC20.sol";

/// @dev Mock class using ERC20
/// @author Paul Berg - <hello@paulrberg.com>

contract ERC20Mock is ERC20 {

    constructor(address initialAccount, uint256 initialBalance) public {
        _mint(initialAccount, initialBalance);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function burnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }
}
