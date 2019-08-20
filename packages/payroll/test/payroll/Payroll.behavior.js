const traveler = require("ganache-time-traveler");

const shouldBehaveLikeAddSalary = require("./behaviors/AddSalary.behavior");
const shouldBehaveLikeCancelSalary = require("./behaviors/CancelSalary.behavior");
const shouldBehaveLikeWithdrawFromSalary = require("./behaviors/WithdrawFromSalary.behavior");

function shouldBehaveLikePayroll(alice, bob, carol, eve) {
  let snapshotId;

  beforeEach(async () => {
    const snapshot = await traveler.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async () => {
    await traveler.revertToSnapshot(snapshotId);
  });

  describe("addSalary", function() {
    shouldBehaveLikeAddSalary(alice, bob);
  });

  describe("cancelSalary", function() {
    shouldBehaveLikeCancelSalary(alice, bob, eve);
  });

  describe("withdrawFromSalary", function() {
    shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve);
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
