<p align="center"><img src="https://i.imgur.com/q6UHTt1.png" width="280px"/></p>

<p align="center">Sablier is the protocol for real-time finance on Ethereum. Read this <a href="https://medium.com/@PaulRBerg/the-protocol-for-real-time-finance-on-ethereum-5a5350db16ae" target="_blank">article</a> to find out more about what we're up to.</p>

<p align="center">
  <a href="https://circleci.com/gh/sablierhq/sablier" alt="CircleCI">
    <img src="https://circleci.com/gh/sablierhq/sablier.svg?style=svg">
  </a>
  <a href="https://docs.openzeppelin.com/">
    <img src="https://img.shields.io/badge/built%20with-OpenZeppelin-3677FF" alt="Built with OpenZeppelin">
  </a>
  <a href="https://coveralls.io/github/sablierhq/sablier?branch=develop">
    <img src="https://coveralls.io/repos/github/sablierhq/sablier/badge.svg?branch=develop" alt="Coverage Status"/>
  </a>
  <a href="https://prettier.io">
    <img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" alt="Styled with Prettier">
  </a>
  <a href="http://commitizen.github.io/cz-cli/">
    <img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly">
  </a>
  <a href="https://www.gnu.org/licenses/lgpl-3.0">
    <img src="https://img.shields.io/badge/License-LGPL%20v3-008033.svg" alt="License: LGPL v3">
  </a>
</p>

---

## Packages :package:

Sablier is maintained as a monorepo with multiple sub packages. Please find a comprehensive list below.

### Deployed Packages

| Package                                                   | Version                                                                                                                       | Description                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@sablier/payroll`](/packages/payroll)                   | [![npm](https://img.shields.io/npm/v/@sablier/payroll.svg)](https://www.npmjs.com/package/@sablier/payroll)                   | Payroll proxy                                                     |
| [`@sablier/protocol`](/packages/protocol)                 | [![npm](https://img.shields.io/npm/v/@sablier/protocol.svg)](https://www.npmjs.com/package/@sablier/protocol)                 | Money streaming protocol                                          |
| [`@sablier/swaps`](/packages/swaps)                       | [![npm](https://img.shields.io/npm/v/@sablier/swaps.svg)](https://www.npmjs.com/package/@sablier/swaps)                       | Streamed swaps of tokens                                          |
| [`@sablier/shared-contracts`](/packages/shared-contracts) | [![npm](https://img.shields.io/npm/v/@sablier/shared-contracts.svg)](https://www.npmjs.com/package/@sablier/shared-contracts) | Smart contracts to be shared across Sablier projects and packages |

### Private Packages

| Package                                     | Description                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`@sablier/dev-utils`](/packages/dev-utils) | [![npm](https://img.shields.io/npm/v/@sablier/dev-utils.svg)](https://www.npmjs.com/package/@sablier/dev-utils) | Dev utils to be shared across Sablier projects and packages |

## Contracts :memo:

Find the addresses for our smart contracts below. They have been audited by [Quantstamp](https://github.com/sablierhq/sablier/tree/audit-v2) and [ConsenSys
Diligence](https://github.com/sablierhq/sablier/tree/audit-v1).

### Ethereum Mainnet

| Name          | Description                      | Address                                                                                                               |
| ------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CTokenManager | Whitelist and discard cTokens    | [0x342A6596F50b4Db7c3246C0F4eFb1f06843d7405](https://etherscan.io/address/0x342A6596F50b4Db7c3246C0F4eFb1f06843d7405) |
| Payroll       | Proxy used in our web interfaces | [0xbd6a40Bb904aEa5a49c59050B5395f7484A4203d](https://etherscan.io/address/0xbd6a40Bb904aEa5a49c59050B5395f7484A4203d) |
| Sablier       | Money streaming engine           | [0xA4fc358455Febe425536fd1878bE67FfDBDEC59a](https://etherscan.io/address/0xA4fc358455Febe425536fd1878bE67FfDBDEC59a) |

### Ethereum Testnets

These are Goerli, Kovan, Rinkeby and Ropsten. Each contract has the same address on all testnets.

| Name          | Description                      | Address                                                                                                                     |
| ------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CTokenManager | Whitelist and discard cTokens    | [0xEE5dfDf2e98FdC572786b9E5649cB8Cc93D47a19](https://kovan.etherscan.io/address/0xEE5dfDf2e98FdC572786b9E5649cB8Cc93D47a19) |
| Payroll       | Proxy used in our web interfaces | [0x7ee114C3628Ca90119fC699f03665bF9dB8f5faF](https://kovan.etherscan.io/address/0x7ee114C3628Ca90119fC699f03665bF9dB8f5faF) |
| Sablier       | Money streaming engine           | [0xc04Ad234E01327b24a831e3718DBFcbE245904CC](https://kovan.etherscan.io/address/0xc04Ad234E01327b24a831e3718DBFcbE245904CC) |

## Usage :hammer_and_pick:

If you just want to use the dapps, head to [pay.sablier.finance](https://pay.sablier.finance) to create streams and
[app.sablier.finance](https://app.sablier.finance) to withdraw from streams. You'll need an Ethereum wallet and some ERC20 tokens to interact
with the dapps.

To check out and compile the smart contracts, bootstrap the monorepo and head to each individual package as presented
above. For example, these are the instructions for `@sablier/protocol`:

```bash
$ yarn run bootstrap
$ cd packages/protocol
$ truffle compile --all
$ truffle migrate --reset --network development
```

## Contributing :raising_hand_woman:

We highly encourage participation from the community to help shape the development of Sablier. If you are interested in
contributing or have any questions, ping us on [Twitter](https://twitter.com/sablierhq) or [Telegram](https://t.me/sablier);

We use [Yarn](https://yarnpkg.com/) as a dependency manager and [Truffle](https://github.com/trufflesuite/truffle)
as a development environment for compiling, testing, and deploying our contracts. The contracts were written in [Solidity](https://github.com/ethereum/solidity).

### Requirements

- yarn >=1.17.3
- truffle >= 5.0.35
- solidity 0.5.11

### Pre Requisites

Make sure you are using Yarn >=1.17.3 To install using homebrew:

```bash
$ brew install yarn
```

Then install dependencies:

```bash
$ yarn install
```

### Watch

To re-build all packages on change:

```bash
$ yarn watch
```

### Clean

To clean all packages:

```bash
$ yarn clean
```

To clean a specific package:

```bash
$ PKG=@sablier/protocol yarn clean
```

### Lint

To lint all packages:

```bash
$ yarn lint
```

To lint a specific package:

```bash
$ PKG=@sablier/protocol yarn lint
```

### Prettier

To run prettier on all packages:

```bash
$ yarn prettier
```

Prettier cannot be run on individual packages.

### Test

To run all tests:

```bash
$ yarn test
```

To run tests in a specific package:

```bash
$ PKG=@sablier/protocol yarn test
```
