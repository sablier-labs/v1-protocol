## Contracts

This package contains the Ethereum smart contracts for the Sablier protocol. We use [Truffle](https://github.com/trufflesuite/truffle)
as a development environment for compiling, testing, and deploying our contracts. They were written in [Solidity](https://github.com/ethereum/solidity).

## Pre Requisites

```bash
$ yarn global add truffle
$ yarn global add ganache-cli
```

## Usage

```bash
truffle compile --all
truffle migrate --network development
```

Make sure to have a running [Ganache](https://truffleframework.com/ganache) instance in the background.

## Contributing

We highly encourage participation from the community to help shape the development of Sablier. If you are interested in
contributing or have any questions, please ping us on [Twitter](https://twitter.com/sablierhq).

### Install Modules

```bash
$ yarn install
```

### Clean

```bash
$ yarn clean
```

### Lint

```bash
$ yarn lint
```

### Test

```bash
$ yarn test
```

### Coverage

```bash
$ yarn coverage
```
