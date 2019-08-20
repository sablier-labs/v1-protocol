pragma solidity 0.5.10;

import "./NotERC20.sol";

/// @dev Mock class using NotERC20
/// @author Paul Berg - <paul@sablier.app>

contract NotERC20Mock is NotERC20 {
    function notMint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function notBurn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function notBurnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }

    function notTransferInternal(address from, address to, uint256 value) public {
        _transfer(from, to, value);
    }

    function notApproveInternal(address owner, address spender, uint256 value) public {
        _approve(owner, spender, value);
    }
}
