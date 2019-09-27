pragma solidity 0.5.11;

/**
 * @title CTokenManager Interface
 * @author Sablier
 */
interface ICTokenManager {
    /**
     * @notice Emits when the owner discards a cToken.
     */
    event DiscardCToken(address indexed tokenAddress);

    /**
     * @notice Emits when the owner whitelists a cToken.
     */
    event WhitelistCToken(address indexed tokenAddress);

    function whitelistCToken(address tokenAddress) external;

    function discardCToken(address tokenAddress) external;

    function isCToken(address tokenAddress) external view returns (bool);
}
