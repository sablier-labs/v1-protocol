/* eslint-disable no-duplicate-case */
require("dotenv").config();
const { CoverageSubprovider } = require("@0x/sol-coverage");
const { ProfilerSubprovider } = require("@0x/sol-profiler");
const { RevertTraceSubprovider, TruffleArtifactAdapter } = require("@0x/sol-trace");
const { GanacheSubprovider } = require("@0x/subproviders");
const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const ProviderEngine = require("web3-provider-engine");
const { toWei, toHex } = require("web3-utils");

const compilerConfig = require("./compiler");

// Get the address of the first account in Ganache
async function getFirstAddress() {
  const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  const addresses = await web3.eth.getAccounts();
  return addresses[0];
}

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

const defaultFromAddress = getFirstAddress();
const isVerbose = true;
const coverageSubproviderConfig = {
  isVerbose,
  ignoreFilesGlobs: [
    "**/Migrations.sol",
    "**/interfaces/**",
    "**/mocks/**",
    "**/node_modules/**",
    "**/test/**",
    "**/zeppelin/**",
  ],
};

const projectRoot = "";
const artifactAdapter = new TruffleArtifactAdapter(projectRoot, compilerConfig.solcVersion);
const provider = new ProviderEngine();

let kovanProvider;
let rinkebyProvider;
let ropstenProvider;

switch (process.env.MODE) {
  case "profile":
    global.profilerSubprovider = new ProfilerSubprovider(artifactAdapter, defaultFromAddress, isVerbose);
    global.profilerSubprovider.stop();
    provider.addProvider(global.profilerSubprovider);
    break;
  case "coverage":
    global.coverageSubprovider = new CoverageSubprovider(
      artifactAdapter,
      defaultFromAddress,
      coverageSubproviderConfig,
    );
    provider.addProvider(global.coverageSubprovider);
    break;
  case "trace":
    provider.addProvider(new RevertTraceSubprovider(artifactAdapter, defaultFromAddress, isVerbose));
    break;
  default:
    // Due to some strange error, contracts do not get deployed when using the ganache subprovider
    // required by the 0x tools
    kovanProvider = createProvider("kovan");
    rinkebyProvider = createProvider("rinkeby");
    ropstenProvider = createProvider("ropsten");
    break;
}

if (process.env.MODE) {
  provider.addProvider(new GanacheSubprovider());
  provider.start((err) => {
    if (err !== undefined) {
      console.log(err);
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
  plugins: ["truffle-security"],
};
