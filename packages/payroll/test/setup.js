const chaiEth = require("@sablier/chai-eth");
const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

chai.use(chaiBigNumber(BigNumber));
chai.should();
chai.use(chaiEth);

after("Generate coverage report", async () => {
  if (process.env.MODE === "profiler") {
    await global.profilerSubprovider.writeCoverageAsync();
  } else if (process.env.MODE === "coverage") {
    await global.coverageSubprovider.writeCoverageAsync();
  }
});
