pragma solidity 0.5.10;

/// @title cERC20 interface
/// @author Paul Berg - <paul@sablier.app>
/// @dev See https://compound.finance/developers

interface ICERC20 {
    function approve(address spender, uint256 value) external returns (bool);
    function getCash() external returns (uint256);
    function mint(uint256 mintAmount) external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
}
