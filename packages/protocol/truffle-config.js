/* eslint-disable no-duplicate-case */
require("dotenv").config();
const { CoverageSubprovider } = require("@0x/sol-coverage");
const { ProfilerSubprovider } = require("@0x/sol-profiler");
const { RevertTraceSubprovider, TruffleArtifactAdapter } = require("@0x/sol-trace");
const HDWalletProvider = require("truffle-hdwallet-provider");
const ProviderEngine = require("web3-provider-engine");
const WebsocketSubprovider = require("web3-provider-engine/subproviders/websocket");
const { toHex, toWei } = require("web3-utils");

const compilerConfig = require("./compiler");

// You must specify MNEMONIC and INFURA_API_KEY in a .env file
function createProvider(network) {
  if (process.env.CI) {
    return {};
  }
  if (!process.env.MNEMONIC) {
    console.log("Please set either your MNEMONIC in a .env file");
    process.exit(1);
  }
  if (!process.env.INFURA_API_KEY) {
    console.log("Please set your INFURA_API_KEY");
    process.exit(1);
  }
  return () => {
    return new HDWalletProvider(process.env.MNEMONIC, `https://${network}.infura.io/v3/` + process.env.INFURA_API_KEY);
  };
}

const defaultFromAddress = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
const isVerbose = true;
const coverageSubproviderConfig = {
  isVerbose,
  ignoreFilesGlobs: ["**/Migrations.sol", "**/interfaces/**", "**/node_modules/**", "**/test/**"],
};

const projectRoot = "";
const truffleArtifactAdapter = new TruffleArtifactAdapter(projectRoot, compilerConfig.solcVersion);
const provider = new ProviderEngine();

let kovanProvider;
let rinkebyProvider;
let ropstenProvider;

if (process.env.MODE) {
  switch (process.env.MODE) {
    case "profile":
      global.profilerSubprovider = new ProfilerSubprovider(truffleArtifactAdapter, defaultFromAddress, isVerbose);
      global.profilerSubprovider.stop();
      provider.addProvider(global.profilerSubprovider);
      break;
    case "coverage":
      global.coverageSubprovider = new CoverageSubprovider(
        truffleArtifactAdapter,
        defaultFromAddress,
        coverageSubproviderConfig,
      );
      provider.addProvider(global.coverageSubprovider);
      break;
    case "trace":
      provider.addProvider(new RevertTraceSubprovider(truffleArtifactAdapter, defaultFromAddress, isVerbose));
      break;
    default:
      kovanProvider = createProvider("kovan");
      rinkebyProvider = createProvider("rinkeby");
      ropstenProvider = createProvider("ropsten");
      break;
  }

  provider.addProvider(new WebsocketSubprovider({ rpcUrl: "http://localhost:8545" }));
  provider.start((err) => {
    if (err !== undefined) {
      console.log("provider started with error:", err);
      process.exit(1);
    }
  });
}

/**
 * HACK: Truffle providers should have `send` function, while `ProviderEngine` creates providers with `sendAsync`,
 * but it can be easily fixed by assigning `sendAsync` to `send`.
 */
provider.send = provider.sendAsync.bind(provider);

const truffleOptions = {};
const compilerSettings = { optimizer: {} };

// We do this because we have to disable the optimizer while covering the contracts
if (process.env.MODE) {
  truffleOptions.provider = provider;
  compilerSettings.optimizer.enabled = false;
} else {
  truffleOptions.host = "127.0.0.1";
  compilerSettings.optimizer.enabled = true;
}

module.exports = {
  compilers: {
    solc: {
      version: compilerConfig.solcVersion,
      settings: {
        ...compilerConfig.compilerSettings,
        ...compilerSettings,
      },
    },
  },
  mocha: {
    bail: true,
    enableTimeouts: false,
  },
  networks: {
    development: {
      ...truffleOptions,
      gas: 6000000,
      gasPrice: toHex(toWei("1", "gwei")),
      network_id: "*", // eslint-disable-line camelcase
      port: 8545,
      skipDryRun: true,
    },
    kovan: {
      provider: kovanProvider,
      gas: 6000000,
      gasPrice: toHex(toWei("10", "gwei")),
      network_id: "42",
      skipDryRun: true,
    },
    rinkeby: {
      provider: rinkebyProvider,
      gas: 6000000,
      gasPrice: toHex(toWei("10", "gwei")),
      network_id: "4",
      skipDryRun: true,
    },
    ropsten: {
      provider: ropstenProvider,
      gas: 6000000,
      gasPrice: toHex(toWei("10", "gwei")),
      network_id: "3",
      skipDryRun: true,
    },
  },
};
