<p align="center"><img src="https://i.imgur.com/CGFvZW3.png" width="280px"/></p>

<p align="center">Sablier is a decentralised app for continuous payments on Ethereum. Read this <a href="https://medium.com/sablier-app/introducing-sablier-continuous-payments-on-ethereum-c2bf04446d31" target="_blank">article</a> to find our more about our mission. Check out a demo video <a href="https://www.youtube.com/watch?v=2onYeCwAY3c" target="_blank">here</a>.</p>

<p align="center">
  <a href="https://app.netlify.com/sites/infallible-visvesvaraya-6d594e/deploys">
    <img src="https://api.netlify.com/api/v1/badges/7a05c307-d1c2-43c0-b914-691dc1fa3104/deploy-status">
  </a>
  <a href="https://prettier.io">
    <img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" alt="Styled with Prettier">
  </a>
  <a href="http://commitizen.github.io/cz-cli/">
    <img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly">
  </a>
  <a href="https://twitter.com/SablierHQ">
    <img src="https://img.shields.io/badge/chat-twitter-38A1F3.svg?style=flat" alt="Twitter"/>
  </a>
  <a href="https://www.gnu.org/licenses/lgpl-3.0">
    <img src="https://img.shields.io/badge/License-LGPL%20v3-008033.svg" alt="License: LGPL v3">
  </a>
</p>

---

## Packages :package:

Sablier is maintained as a monorepo with multiple sub packages. Please find a comprehensive list below.

### Deployed Packages

| Package                                     | Version                                                                                                         | Description                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [`@sablier/dev-utils`](/packages/dev-utils) | [![npm](https://img.shields.io/npm/v/@sablier/dev-utils.svg)](https://www.npmjs.com/package/@sablier/dev-utils) | Dev utils to be shared across Sablier projects and packages |
| [`@sablier/protocol`](/packages/protocol)   | [![npm](https://img.shields.io/npm/v/@sablier/protocol.svg)](https://www.npmjs.com/package/@sablier/protocol)   | Sablier solidity smart contracts & tests                    |

### Private Packages

| Package                                   | Description  |
| ----------------------------------------- | ------------ |
| [`@sablier/frontend`](/packages/frontend) | Frontend app |
| [`@sablier/landing`](/packages/landing)   | Landing page |

## Usage :hammer_and_pick:

If you simply want to check out the beta dapp, you should head to [beta.sablier.app](https://beta.sablier.app)!

If you want to run it locally:

```bash
$ cd packages/frontend
$ yarn install
```

If you want to test Sablier on Rinkeby, make sure to create a `.env` file and mirror the contents of
`.env.example`. In that file, you can also include any other variables and they will be set in `process.env`.

Finally:

```bash
$ yarn run start
```

You will also need some testnet DAI, which you can get by calling the `mint` method of this [contract](https://rinkeby.etherscan.io/address/0x8ad3aa5d5ff084307d28c8f514d7a193b2bfe725/).

For all other commands, check out the contribution guide below.

## Contributing :raising_hand_woman:

We highly encourage participation from the community to help shape the development of Sablier. If you are interested in
contributing or have any questions, please ping us on [Twitter](https://twitter.com/SablierHQ).

We use [Yarn](https://yarnpkg.com/) as a dependency manager and [Truffle](https://github.com/trufflesuite/truffle)
as a development environment for compiling, testing, and deploying our contracts. The contracts were written in [Solidity](https://github.com/ethereum/solidity).

### Requirements

- yarn >=1.15.2
- truffle >= 5.0.19
- solidity >=0.5.0 <0.6.0

### Pre Requisites

Make sure you are using Yarn >=1.15.2. To install using homebrew:

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
