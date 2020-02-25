pragma solidity ^0.5.11;

// Sablier protocol
import "@sablier/protocol/contracts/Sablier.sol";

import "./SwapExecutor.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import { SwapTypes } from "./Types.sol";

contract SwapProposer is Ownable, CarefulMath, ReentrancyGuard {
    /**
     * @notice Counter for new stream ids.
     */
    uint256 public nextSwapId;

    /**
     * @notice The swap objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => SwapTypes.AtomicSwapProposal) private swapProposals;

    /**
     * @dev Throws if the provided id does not point to a valid swap proposal.
     */
    modifier proposalExists(uint256 swapId) {
        require(swapProposals[swapId].isEntity, "swap proposal does not exist");
        _;
    }

    /**
     * @dev Throws if the caller is not a recipient of the swap's streams.
     */
    modifier onlySenderOrRecipient(uint256 swapId) {
        require(
            msg.sender == swapProposals[swapId].sender || msg.sender == swapProposals[swapId].recipient,
            "caller is not the sender or recipient"
        );
        _;
    }

    event SwapProposal(
        uint256 indexed swapId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit1,
        uint256 deposit2,
        address tokenAddress1,
        address tokenAddress2,
        uint256 duration
    );

    /**
     * @notice Emits when a swap proposal is successfully cancelled and sender's tokens are refunded.
     */
    event CancelProposal(uint256 indexed swapId);

    SwapExecutor public swapExecutor;

    constructor(address _swapExecutorAddress) public {
        require(_swapExecutorAddress != address(0x00), "SwapExecutor contract address is zero address.");
        swapExecutor = SwapExecutor(_swapExecutorAddress);
    }

    /*********************************
     * @notice - Streamed Atomic Swap
     *********************************/

    function proposeSwap(
        address recipient,
        uint256 deposit1,
        uint256 deposit2,
        address tokenAddress1,
        address tokenAddress2,
        uint256 duration
    ) public returns (uint256) {
        /***
         * @notice - Integrate createStreamedSwap()
         ***/

        require(tokenAddress1 != tokenAddress2, "Can't swap token for itself.");
        require(recipient != address(this), "stream to the contract itself");

        // Pull in deposit from sender
        require(IERC20(tokenAddress1).transferFrom(msg.sender, address(this), deposit1), "token transfer failure");

        // Allow executor contract to spend tokens
        require(IERC20(tokenAddress1).approve(address(swapExecutor), deposit1), "token approval failure");

        /* Create and store the swap proposal object. */
        uint256 swapId = nextSwapId;
        swapProposals[swapId] = SwapTypes.AtomicSwapProposal({
            sender: msg.sender,
            recipient: recipient,
            tokenAddress1: tokenAddress1,
            tokenAddress2: tokenAddress2,
            deposit1: deposit1,
            deposit2: deposit2,
            duration: duration,
            isEntity: true
        });

        emit SwapProposal(swapId, msg.sender, recipient, deposit1, deposit2, tokenAddress1, tokenAddress2, duration);

        /* Increment the next swap id. */
        MathError mathErr;
        (mathErr, nextSwapId) = addUInt(swapId, uint256(1));

        require(mathErr == MathError.NO_ERROR, "next swap id calculation error");

        return swapId;
    }

    function cancelProposedSwap(uint256 swapId)
        public
        nonReentrant
        proposalExists(swapId)
        onlySenderOrRecipient(swapId)
        returns (bool)
    {
        /***
         * @notice - Integrate createStreamedSwap()
         ***/

        SwapTypes.AtomicSwapProposal memory swap = swapProposals[swapId];

        // Return deposit to sender
        require(IERC20(swap.tokenAddress1).transfer(swap.sender, swap.deposit1), "token transfer failure");

        // Delete proposal as no longer necessary
        delete swapProposals[swapId];

        emit CancelProposal(swapId);
        return true;
    }

    /*** View Functions ***/

    /**
     * @notice Returns the compounding stream with all its properties.
     * @dev Throws if the id does not point to a valid streamedSwap.
     * @param swapId The id of the stream to query.
     * @return The swap object.
     */
    function getSwapProposal(uint256 swapId)
        public
        view
        proposalExists(swapId)
        returns (
            address sender,
            address recipient,
            uint256 deposit1,
            uint256 deposit2,
            address tokenAddress1,
            address tokenAddress2,
            uint256 duration
        )
    {
        SwapTypes.AtomicSwapProposal memory swapProposal = swapProposals[swapId];
        sender = swapProposal.sender;
        recipient = swapProposal.recipient;
        deposit1 = swapProposal.deposit1;
        deposit2 = swapProposal.deposit2;
        tokenAddress1 = swapProposal.tokenAddress1;
        tokenAddress2 = swapProposal.tokenAddress2;
        duration = swapProposal.duration;
    }
}
