module.exports = {
  compileCommand: "node --max-old-space-size=4096 ../node_modules/.bin/truffle compile --network coverage",
  copyPackages: ["@openzeppelin/contracts-ethereum-package"],
  norpc: true,
  skipFiles: ["compound", "contracts/Migrations.sol", "interfaces", "mocks", "test"],
  testCommand: "node --max-old-space-size=4096 ../node_modules/.bin/truffle test --network coverage",
};
