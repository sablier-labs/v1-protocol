pragma solidity 0.5.11;

import "@sablier/shared-contracts/interfaces/ICERC20.sol";
import "@sablier/shared-contracts/lifecycle/OwnableWithoutRenounce.sol";

import "./interfaces/ICTokenManager.sol";

/**
 * @title CTokenManager
 * @author Sablier
 */
contract CTokenManager is ICTokenManager, OwnableWithoutRenounce {
    /*** Storage Properties ***/

    /**
     * @notice Mapping of cTokens which can be used
     */
    mapping(address => bool) private cTokens;

    /*** Contract Logic Starts Here */

    constructor() public {
        OwnableWithoutRenounce.initialize(msg.sender);
    }

    /*** Owner Functions ***/

    /**
     * @notice Whitelists a cToken for compounding streams.
     * @dev Throws if the caller is not the owner of the contract.
     *  Throws is the token is whitelisted.
     *  Throws if the given address is not a `cToken`.
     * @param tokenAddress The address of the cToken to whitelist.
     */
    function whitelistCToken(address tokenAddress) external onlyOwner {
        require(!isCToken(tokenAddress), "cToken is whitelisted");
        require(ICERC20(tokenAddress).isCToken(), "token is not cToken");
        cTokens[tokenAddress] = true;
        emit WhitelistCToken(tokenAddress);
    }

    /**
     * @notice Discards a previously whitelisted cToken.
     * @dev Throws if the caller is not the owner of the contract.
     *  Throws if token is not whitelisted.
     * @param tokenAddress The address of the cToken to discard.
     */
    function discardCToken(address tokenAddress) external onlyOwner {
        require(isCToken(tokenAddress), "cToken is not whitelisted");
        cTokens[tokenAddress] = false;
        emit DiscardCToken(tokenAddress);
    }

    /*** View Functions ***/
    /**
     * @notice Checks if the given token address is one of the whitelisted cTokens.
     * @param tokenAddress The address of the token to check.
     * @return bool true=it is cToken, otherwise false.
     */
    function isCToken(address tokenAddress) public view returns (bool) {
        return cTokens[tokenAddress];
    }
}
