pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";

import "../compound/EIP20Interface.sol";

/**
 * @title CERC20 Mock
 * @author Sablier
 * @dev See https://compound.finance/developers
 */
contract CERC20Mock is ERC20 {
    using SafeMath for uint256;

    /**
     * @notice Indicator that this is a CToken contract (for inspection)
     */
    bool public constant isCToken = true;

    /**
     * @notice Block number that interest started to increase from
     */
    uint256 public initialBlockNumber;

    /**
     * @notice Initial exchange rate used when minting the first CTokens (used when totalSupply = 0)
     */
    uint256 public initialExchangeRate;

    /**
     * @notice Underlying asset for this CToken
     */
    address public underlying;

    /**
     * @notice EIP-20 token decimals for this token
     */
    uint256 public decimals;

    /**
     * @notice Construct a new money market
     * @param underlying_ The address of the underlying asset
     * @param initialExchangeRate_ The initial exchange rate, scaled by 1e18
     * @param decimals_ ERC-20 decimal precision of this token
     */
    constructor(address underlying_, uint256 initialExchangeRate_, uint256 decimals_) public {
        initialBlockNumber = block.number;
        underlying = underlying_;
        initialExchangeRate = initialExchangeRate_;
        decimals = decimals_;
        EIP20Interface(underlying).totalSupply(); // Sanity check the underlying
    }

    /*** User Interface ***/

    /**
     * @notice Get the underlying balance of the `owner`
     * @dev This also accrues interest in a transaction
     * @param owner The address of the account to query
     * @return The amount of underlying owned by `owner`
     */
    function balanceOfUnderlying(address owner) public view returns (uint256) {
        uint256 underlyingBalance = EIP20Interface(underlying).balanceOf(address(this));
        if (balanceOf(owner) == 0) return 0;
        return (totalSupply().mul(1e18).div(balanceOf(owner))).mul(underlyingBalance).div(1e18);
    }

    /**
     * @notice Accrue interest then return the up-to-date exchange rate
     * @return Calculated exchange rate scaled by 1e18
     */
    function exchangeRateCurrent() public view returns (uint256) {
        uint256 totalUnderlying = EIP20Interface(underlying).balanceOf(address(this));
        uint256 tokenValueExp = initialExchangeRate;
        if (totalSupply() > 0 && totalUnderlying > 0) {
            totalUnderlying = totalUnderlying.mul(1e18);
            tokenValueExp = totalUnderlying.div(totalSupply());
        }
        return tokenValueExp;
    }

    /**
     * @notice Sender supplies assets into the market and receives cTokens in exchange
     * @dev Accrues interest whether or not the operation succeeds, unless reverted
     * @param mintAmount The amount of the underlying asset to supply
     * @return true=success, otherwise a failure
     */
    function mint(uint256 mintAmount) external returns (bool) {
        uint256 mintedTokens = (mintAmount.mul(1e18)).div(exchangeRateCurrent());
        _mint(msg.sender, mintedTokens);
        return EIP20Interface(underlying).transferFrom(msg.sender, address(this), mintAmount);
    }

    /**
     * @notice Sender supplies underlying to the money market
     * @dev This is just a mock
     * @param supplyAmount The amount of underlying to supply
     * @return true=success, otherwise a failure
     */
    function supplyUnderlying(uint256 supplyAmount) external returns (bool) {
        return EIP20Interface(underlying).transferFrom(msg.sender, address(this), supplyAmount);
    }

    /**
     * @notice Sender redeems cTokens in exchange for a specified amount of underlying asset
     * @dev This is just a mock
     * @param redeemAmount The amount of underlying to redeem
     * @return true=success, otherwise a failure
     */
    function redeemUnderlying(uint256 redeemAmount) external returns (bool) {
        uint256 redeemTokens = redeemAmount.mul(1e18).div(exchangeRateCurrent());
        _burn(msg.sender, redeemTokens);
        return EIP20Interface(underlying).transfer(msg.sender, redeemAmount);
    }
}
