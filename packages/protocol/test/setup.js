const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

const chaiSablier = require("./helpers/chai");

chai.should();
chai.use(chaiBigNumber(BigNumber));
chai.use(chaiSablier);

after("Generate coverage report", async () => {
  if (process.env.MODE === "profiler") {
    await global.profilerSubprovider.writeCoverageAsync();
  } else if (process.env.MODE === "coverage") {
    await global.coverageSubprovider.writeCoverageAsync();
  }
});
