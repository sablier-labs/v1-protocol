pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";

/// @dev Mock class using ERC20
/// @author Sablier

contract EvilERC20 is ERC20 {
    bool shouldDisableTransfer;
    bool shouldDisableTransferFrom;

    constructor() public {
        shouldDisableTransfer = false;
        shouldDisableTransferFrom = false;
    }

    function setShouldDisableTransfer(bool value) external {
        shouldDisableTransfer = value;
    }

    function setShouldDisableTransferFrom(bool value) external {
        shouldDisableTransferFrom = value;
    }

    /**
     * @dev Transfers token to a specified address, unless `shouldDisableTransfer` is `true`.
     * @param to The address to transfer to.
     * @param value The amount to be transferred.
     */
    function transfer(address to, uint256 value) public returns (bool) {
        if (shouldDisableTransfer) {
            return false;
        }
        return super.transfer(to, value);
    }

    /**
     * @dev Transfer tokens from one address to another unless `shouldDisableTransferFrom` is `true`.
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        if (shouldDisableTransferFrom) {
            return false;
        }
        return super.transferFrom(from, to, value);
    }

    /**
     * @dev Allows anyone to mint tokens to any address
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
