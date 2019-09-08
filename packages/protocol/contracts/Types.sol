pragma solidity 0.5.10;

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

    struct Compound {
        uint256 exchangeRate;
        bool isEntity;
        uint256 senderShare;
        uint256 recipientShare;
    }
}
