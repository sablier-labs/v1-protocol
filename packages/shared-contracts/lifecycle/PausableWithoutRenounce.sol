pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "./PauserRoleWithoutRenounce.sol";

/**
 * @title PausableWithoutRenounce
 * @author Sablier
 * @notice Fork of OpenZeppelin's Pausable, a contract module which allows children to implement an
 *  emergency stop mechanism that can be triggered by an authorized account, but with the `renouncePauser`
 *  function removed to avoid fat-finger errors.
 *  We inherit from `Context` to keep this contract compatible with the Gas Station Network.
 * See https://github.com/OpenZeppelin/openzeppelin-contracts-ethereum-package/blob/master/contracts/lifecycle/Pausable.sol
 * See https://docs.openzeppelin.com/contracts/2.x/gsn#_msg_sender_and_msg_data
 */
contract PausableWithoutRenounce is Initializable, Context, PauserRoleWithoutRenounce {
    /**
     * @dev Emitted when the pause is triggered by a pauser (`account`).
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by a pauser (`account`).
     */
    event Unpaused(address account);

    bool private _paused;

    /**
     * @dev Initializes the contract in unpaused state. Assigns the Pauser role
     * to the deployer.
     */
    function initialize(address sender) public initializer {
        PauserRoleWithoutRenounce.initialize(sender);
        _paused = false;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    /**
     * @dev Called by a pauser to pause, triggers stopped state.
     */
    function pause() public onlyPauser whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Called by a pauser to unpause, returns to normal state.
     */
    function unpause() public onlyPauser whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}
