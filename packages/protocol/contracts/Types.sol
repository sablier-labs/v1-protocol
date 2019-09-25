pragma solidity 0.5.11;

import "@sablier/shared-contracts/compound/Exponential.sol";

/**
 * @title Sablier Types
 * @author Sablier
 */
library Types {
    struct Stream {
        uint256 deposit;
        uint256 ratePerSecond;
        uint256 remainingBalance;
        uint256 startTime;
        uint256 stopTime;
        address recipient;
        address sender;
        address tokenAddress;
        bool isEntity;
    }

    struct CompoundingStreamVars {
        Exponential.Exp exchangeRateInitial;
        Exponential.Exp senderShare;
        Exponential.Exp recipientShare;
        bool isEntity;
    }
}
