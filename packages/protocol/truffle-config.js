require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

// Create a `.env` file by following `.env.example`
const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.log("Please set your MNEMONIC in a .env file");
  process.exit(1);
}

function createProvider(network) {
  if (process.env.CI) {
    return {};
  }
  if (!process.env.INFURA_API_KEY) {
    console.log("Please set your INFURA_API_KEY");
    process.exit(1);
  }
  return () => {
    return new HDWalletProvider(mnemonic, "wss://" + network + ".infura.io/ws/v3/" + process.env.INFURA_API_KEY);
  };
}

module.exports = {
  compilers: {
    solc: {
      version: "0.5.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  mocha: {
    bail: true,
    enableTimeouts: false,
  },
  networks: {
    arbitrum: {
      provider: createProvider("arbitrum-mainnet"),
      network_id: "42161",
      networkCheckTimeout: 1000000,
      skipDryRun: true,
      timeoutBlocks: 500,
    },
    avalanche: {
      provider: () => new HDWalletProvider(mnemonic, "https://api.avax.network/ext/bc/C/rpc"),
      gas: "6000000",
      network_id: "43114",
      networkCheckTimeout: 1000000,
      skipDryRun: true,
      timeoutBlocks: 500,
    },
    development: {
      host: "127.0.0.1",
      gas: "6000000",
      network_id: "*",
      port: "8545",
      skipDryRun: true,
    },
    goerli: {
      provider: createProvider("goerli"),
      gas: "6000000",
      network_id: "5",
      skipDryRun: true,
    },
    mainnet: {
      provider: createProvider("mainnet"),
      network_id: "1",
      skipDryRun: true,
    },
    kovan: {
      provider: createProvider("kovan"),
      gas: "6000000",
      network_id: "42",
      skipDryRun: true,
    },
    optimism: {
      provider: createProvider("optimism-mainnet"),
      network_id: "10",
      networkCheckTimeout: 1000000,
      skipDryRun: true,
      timeoutBlocks: 500,
    },
    rinkeby: {
      provider: createProvider("rinkeby"),
      gas: "6000000",
      network_id: "4",
      skipDryRun: true,
    },
    ropsten: {
      provider: createProvider("ropsten"),
      gas: "6000000",
      network_id: "3",
      skipDryRun: true,
    },
  },
  plugins: ["solidity-coverage"],
};
