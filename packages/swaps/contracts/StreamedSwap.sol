pragma solidity ^0.5.11;

import "./SwapProposer.sol";
import "./SwapExecutor.sol";

contract StreamedSwap is SwapProposer, SwapExecutor {
    constructor(address _sablierContractAddress)
        public
        SwapProposer(address(this))
        SwapExecutor(_sablierContractAddress, address(this))
    {}
}
