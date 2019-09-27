const { chaiPlugin } = require("@sablier/dev-utils");
const traveler = require("ganache-time-traveler");

const BigNumber = require("bignumber.js");
const chai = require("chai");
const chaiBigNumber = require("chai-bignumber");

chai.should();
chai.use(chaiBigNumber(BigNumber));
chai.use(chaiPlugin);

let snapshot;
let snapshotId;

before(async () => {
  snapshot = await traveler.takeSnapshot();
  snapshotId = snapshot.result;
});

after(async () => {
  await traveler.revertToSnapshot(snapshotId);
});
