/* global web3 */
const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

chai.use(chaiBigNumber(BigNumber));
chai.should();

web3.extend({
  property: "evm",
  methods: [
    {
      name: "mine",
      call: "evm_mine",
      params: 0,
    },
  ],
});

web3.utils.advanceBlock = async (count) => {
  const promises = [];
  for (let i = 0; i < count; i += 1) {
    promises.push(web3.evm.mine());
  }
  await Promise.all(promises);
};

after("Generate coverage report", async () => {
  if (process.env.MODE === "profiler") {
    await global.profilerSubprovider.writeCoverageAsync();
  } else if (process.env.MODE === "coverage") {
    await global.coverageSubprovider.writeCoverageAsync();
  }
});
