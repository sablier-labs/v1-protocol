const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

chai.should();
chai.use(chaiBigNumber(BigNumber));

after("Generate coverage report", async () => {
  if (process.env.MODE === "profiler") {
    await global.profilerSubprovider.writeCoverageAsync();
  } else if (process.env.MODE === "coverage") {
    await global.coverageSubprovider.writeCoverageAsync();
  }
});
