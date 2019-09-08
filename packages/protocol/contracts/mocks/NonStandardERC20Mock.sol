pragma solidity 0.5.10;

import "../test/NonStandardERC20.sol";

/// @dev Mock class using NotERC20
/// @author Paul Razvan Berg - <paul@sablier.app>

contract NonStandardERC20Mock is NonStandardERC20 {
    function nonStandardMint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function nonStandardBurn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function nonStandardBurnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }

    function nonStandardTransferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function nonStandardApproveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }
}
