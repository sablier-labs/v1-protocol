pragma solidity 0.5.10;

import "./ERC20.sol";

/// @title ERC20Mintable
/// @author OpenZeppelin Community - <maintainers@openzeppelin.org>
/// @dev ERC20 minting logic.

contract ERC20Mintable is ERC20 {
    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value) public returns (bool) {
        _mint(to, value);
        return true;
    }
}
