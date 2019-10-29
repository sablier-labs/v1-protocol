const { chaiPlugin } = require("@sablier/dev-utils");
const traveler = require("ganache-time-traveler");

const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

chai.should();
chai.use(chaiBigNumber(BigNumber));
chai.use(chaiPlugin);

let snapshotId;

beforeEach(async () => {
  const snapshot = await traveler.takeSnapshot();
  snapshotId = snapshot.result;
});

afterEach(async () => {
  await traveler.revertToSnapshot(snapshotId);
});
