const traveler = require("ganache-time-traveler");

const shouldBehaveLikeDiscardRelayer = require("./admin/DiscardRelayer");
const shouldBehaveLikeWhitelistRelayer = require("./admin/WhitelistRelayer");

const shouldBehaveLikeGetSalary = require("./view/GetSalary");

const shouldBehaveLikeCreateSalary = require("./effects/salary/CreateSalary");
const shouldBehaveLikeWithdrawFromSalary = require("./effects/salary/WithdrawFromSalary");
const shouldBehaveLikeCancelSalary = require("./effects/salary/CancelSalary");

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
    // describe("acceptRelayedCall", function() {
    //   shouldBehaveLikeAcceptRelayedCall(alice, bob, carol, eve);
    // });

    describe("getSalary", function() {
      shouldBehaveLikeGetSalary(alice);
    });
  });

  describe("effects & interactions functions", function() {
    describe("createSalary", function() {
      shouldBehaveLikeCreateSalary(alice, bob);
    });

    describe("withdrawFromSalary", function() {
      shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve);
    });

    describe("cancelSalary", function() {
      shouldBehaveLikeCancelSalary(alice, bob, eve);
    });
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
