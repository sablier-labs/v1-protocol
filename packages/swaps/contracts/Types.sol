pragma solidity 0.5.11;

/**
 * @title Sablier Types
 * @author Sablier
 */
library SwapTypes {
    struct AtomicSwapProposal {
        address sender;
        address recipient;
        address tokenAddress1;
        address tokenAddress2;
        uint256 deposit1;
        uint256 deposit2;
        uint256 duration;
        bool isEntity;
    }

    struct AtomicSwap {
        address sender;
        address recipient;
        address tokenAddress1;
        address tokenAddress2;
        uint256 streamId1;
        uint256 streamId2;
        uint256 startTime;
        uint256 stopTime;
        bool isEntity;
    }
}
