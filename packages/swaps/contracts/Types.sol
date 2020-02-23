pragma solidity 0.5.11;

/**
 * @title Sablier Types
 * @author Sablier
 */
library SwapTypes {
    struct AtomicSwap {
        address sender;
        address recipient;
        address tokenAddress1;
        address tokenAddress2;
        uint256 streamId1;
        uint256 streamId2;
        bool isEntity;
    }
}
