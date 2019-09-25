pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

/**
 * @title OwnableWithoutRenounce
 * @author Sablier
 * @dev Fork of OpenZeppelin's Ownable contract, which provides basic authorization control.
 *  Here, we remove the `renounceOwnership` function to avoid fat-finger errors.
 * See https://github.com/OpenZeppelin/openzeppelin-contracts-ethereum-package/blob/master/contracts/ownership/Ownable.sol
 * See https://forum.openzeppelin.com/t/contract-request-ownable-without-renounceownership/1400
 */
contract OwnableWithoutRenounce is Initializable, Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    function initialize(address sender) public initializer {
        _owner = sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @return the address of the owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
     * @return true if `msg.sender` is the owner of the contract.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    uint256[50] private ______gap;
}
