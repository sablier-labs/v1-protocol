pragma solidity 0.5.11;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@sablier/protocol/contracts/CTokenManager.sol";
import "@sablier/shared-contracts/mocks/CERC20Mock.sol";
import "@sablier/shared-contracts/mocks/ERC20Mock.sol";
import "@sablier/shared-contracts/test/EvilERC20.sol";
import "@sablier/shared-contracts/test/NonStandardERC20.sol";

// You might think this file is a bit odd, but let me explain.
// We only use some contracts in our tests, which means Truffle
// will not compile it for us, because it is from an external
// dependency.
//
// We are now left with three options:
// - Copy/paste these contracts
// - Run the tests with `truffle compile --all` on
// - Or trick Truffle by claiming we use it in a Solidity test
//
// You know which one I went for.

contract Imports {
    constructor() public {}
}
