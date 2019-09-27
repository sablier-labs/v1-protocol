const traveler = require("ganache-time-traveler");

const shouldBehaveLikeDiscardRelayer = require("./admin/DiscardRelayer");
const shouldBehaveLikeWhitelistRelayer = require("./admin/WhitelistRelayer");

const shouldBehaveLikeGetSalary = require("./view/GetSalary");

const shouldBehaveLikeCreateSalary = require("./effects/salary/CreateSalary");
const shouldBehaveLikeCreateCompoundingSalary = require("./effects/compoundingSalary/CreateCompoundingSalary");
const shouldBehaveLikeWithdrawFromSalary = require("./effects/salary/WithdrawFromSalary");
const shouldBehaveLikeCancelSalary = require("./effects/salary/CancelSalary");
const shouldBehaveLikeCancelCompoundingSalary = require("./effects/compoundingSalary/CancelCompoundingSalary");

function shouldBehaveLikePayroll(alice, bob, carol, eve) {
  let snapshotId;

  beforeEach(async () => {
    const snapshot = await traveler.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async () => {
    await traveler.revertToSnapshot(snapshotId);
  });

  describe("admin functions", function() {
    describe("whitelistRelayer", function() {
      shouldBehaveLikeWhitelistRelayer(alice, bob, carol);
    });

    describe("discardRelayer", function() {
      shouldBehaveLikeDiscardRelayer(alice, bob, carol);
    });
  });

  describe("view functions", function() {
    describe("getSalary", function() {
      shouldBehaveLikeGetSalary(alice);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createSalary", function() {
      shouldBehaveLikeCreateSalary(alice, bob);
    });

    describe("createCompoundingSalary", function() {
      shouldBehaveLikeCreateCompoundingSalary(alice, bob);
    });

    /**
     * We don't run tests for compounding stream withdrawals because they behave exactly the same as normal stream
     * withdrawals, from the point of view of the payroll proxy.
     */
    describe("withdrawFromSalary", function() {
      shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve);
    });

    describe("cancelSalary", function() {
      shouldBehaveLikeCancelSalary(alice, bob, eve);
    });

    describe("cancelCompoundingSalary", function() {
      shouldBehaveLikeCancelCompoundingSalary(alice, bob, eve);
    });
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
