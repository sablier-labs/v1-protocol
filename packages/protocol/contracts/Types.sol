pragma solidity 0.5.10;

import "./compound/Exponential.sol";

library Types {
    struct Stream {
        uint256 balance;
        uint256 deposit;
        bool isEntity;
        uint256 rate;
        address recipient;
        address sender;
        uint256 startTime;
        uint256 stopTime;
        address tokenAddress;
    }

    struct CompoundingStreamVars {
        Exponential.Exp exchangeRateInitial;
        bool isEntity;
        Exponential.Exp senderShare;
        Exponential.Exp recipientShare;
        Exponential.Exp underlyingRate;
    }
}
