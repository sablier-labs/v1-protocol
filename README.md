<p align="center"><img src="https://i.imgur.com/q6UHTt1.png" width="280px"/></p>

<p align="center">Sablier is a decentralised app for continuous salaries on Ethereum. Read <a href="https://medium.com/sablier-app/introducing-sablier-continuous-payments-on-ethereum-c2bf04446d31" target="_blank">this article</a> to find out more about our mission. For a demo, see <a href="https://www.youtube.com/watch?v=2onYeCwAY3c" target="_blank">this video</a>.</p>

<p align="center">
  <a href="https://circleci.com/gh/sablierhq/sablier" alt="CircleCI">
    <img src="https://circleci.com/gh/sablierhq/sablier.svg?style=svg">
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

## Warning :rotating_light:

Please take note that this is experimental, beta software and is provided on an "as is" and "as available" basis. We do
not give any warranties and will not be liable for any loss, direct or indirect through continued use of this codebase.

## Packages :package:

Sablier is maintained as a monorepo with multiple sub packages. Please find a comprehensive list below.

### Deployed Packages

| Package                                                   | Version                                                                                                                       | Description                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@sablier/payroll`](/packages/payroll)                   | [![npm](https://img.shields.io/npm/v/@sablier/payroll.svg)](https://www.npmjs.com/package/@sablier/payroll)                   | Payroll proxy                                                     |
| [`@sablier/protocol`](/packages/protocol)                 | [![npm](https://img.shields.io/npm/v/@sablier/protocol.svg)](https://www.npmjs.com/package/@sablier/protocol)                 | Money streaming protocol                                          |
| [`@sablier/shared-contracts`](/packages/shared-contracts) | [![npm](https://img.shields.io/npm/v/@sablier/shared-contracts.svg)](https://www.npmjs.com/package/@sablier/shared-contracts) | Smart contracts to be shared across Sablier projects and packages |

### Private Packages

| Package                                     | Description                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`@sablier/dev-utils`](/packages/dev-utils) | [![npm](https://img.shields.io/npm/v/@sablier/dev-utils.svg)](https://www.npmjs.com/package/@sablier/dev-utils) | Dev utils to be shared across Sablier projects and packages |

## Usage :hammer_and_pick:

To check out and compile the smart contracts for yourself, head to each individual package as presented
above. For example, here are the instructions for `@sablier/protocol`:

```bash
cd packages/protocol
truffle compile --all
truffle migrate --reset --network development
```

## Contributing :raising_hand_woman:

We highly encourage participation from the community to help shape the development of Sablier. If you are interested in
contributing or have any questions, please ping us on [Twitter](https://twitter.com/SablierHQ) or [Telegram](https://t.me/sablier);

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

### Test

To run all tests:

```bash
$ yarn test
```

To run tests in a specific package:

```bash
$ PKG=@sablier/protocol yarn test
```
