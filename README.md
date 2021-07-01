# Sablier [![CircleCI](https://circleci.com/gh/sablierhq/sablier.svg?style=svg)](https://circleci.com/gh/sablierhq/sablier) [![Coverage Status](https://coveralls.io/repos/github/sablierhq/sablier/badge.svg?branch=develop)](https://coveralls.io/github/sablierhq/sablier?branch=develop) [![Styled with Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io) [![Commitizen Friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/) [![License: LGPL3.0](https://img.shields.io/badge/License-LGPL%20v3-008033.svg)](https://opensource.org/licenses/lgpl-3.0)

A protocol for money streaming. A good place to start is our [FAQ](https://faq.sablier.finance), while in-depth documentation
is available at [docs.sablier.finance](https://docs.sablier.finance).

| Package                                                   | Description                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| [`@sablier/dev-utils`](/packages/dev-utils)               | Dev utils to be shared across Sablier projects and packages       |
| [`@sablier/protocol`](/packages/protocol)                 | Money streaming protocol                                          |
| [`@sablier/shared-contracts`](/packages/shared-contracts) | Smart contracts to be shared across Sablier projects and packages |

## Usage :hammer_and_pick:

To compile the smart contracts, bootstrap the monorepo and open the package you'd like to work on. For example, here are the instructions for `@sablier/protocol`:

```bash
$ yarn run bootstrap
$ cd packages/protocol
$ truffle compile --all
$ truffle migrate --reset --network development
```

Alternatively, if you simply want to use our apps, head to [pay.sablier.finance](https://pay.sablier.finance) to create streams and
[app.sablier.finance](https://app.sablier.finance) to withdraw from streams. You'll need an Ethereum wallet and some ERC20 tokens.

## Contributing :raising_hand_woman:

We highly encourage participation from the community to help shape the development of Sablier. If you are interested in
contributing or have any questions, ping us on [Discord](https://discord.gg/KXajCXC).

We use [Yarn](https://yarnpkg.com/) as a dependency manager and [Truffle](https://github.com/trufflesuite/truffle)
as a development environment for compiling, testing, and deploying our contracts. The contracts were written in [Solidity](https://github.com/ethereum/solidity).

### Requirements

- yarn >=1.17.3
- truffle >= 5.0.35
- solidity 0.5.17

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
