const { devConstants } = require("@sablier/dev-utils");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeDiscardRelayer = require("./admin/DiscardRelayer");
const shouldBehaveLikeWhitelistRelayer = require("./admin/WhitelistRelayer");

const shouldBehaveLikeGetSalary = require("./view/GetSalary");

const shouldBehaveLikeCreateSalary = require("./effects/salary/CreateSalary");
const shouldBehaveLikeCreateCompoundingSalary = require("./effects/compoundingSalary/CreateCompoundingSalary");
const shouldBehaveLikeWithdrawFromSalary = require("./effects/salary/WithdrawFromSalary");
const shouldBehaveLikeCancelSalary = require("./effects/salary/CancelSalary");
const shouldBehaveLikeCancelCompoundingSalary = require("./effects/compoundingSalary/CancelCompoundingSalary");

const Payroll = artifacts.require("./Payroll.sol");
const { ZERO_ADDRESS } = devConstants;

function shouldBehaveLikePayroll(alice, bob, carol, eve) {
  describe("initialization", function() {
    it("reverts when the owner is the zero address", async function() {
      const opts = { from: alice };
      const payroll = await Payroll.new(opts);

      const ownerAddress = ZERO_ADDRESS;
      const signerAddress = alice;
      const sablierAddress = this.sablier.address;

      await truffleAssert.reverts(
        payroll.methods["initialize(address,address,address)"](ownerAddress, signerAddress, sablierAddress, opts),
        "owner is the zero address",
      );
    });

    it("reverts when the signer is the zero address", async function() {
      const opts = { from: alice };
      const payroll = await Payroll.new(opts);

      const ownerAddress = alice;
      const signerAddress = ZERO_ADDRESS;
      const sablierAddress = this.sablier.address;

      await truffleAssert.reverts(
        payroll.methods["initialize(address,address,address)"](ownerAddress, signerAddress, sablierAddress, opts),
        "signer is the zero address",
      );
    });

    it("reverts when the sablier contract is the zero address", async function() {
      const opts = { from: alice };
      const payroll = await Payroll.new(opts);

      const ownerAddress = alice;
      const signerAddress = alice;
      const sablierAddress = ZERO_ADDRESS;

      await truffleAssert.reverts(
        payroll.methods["initialize(address,address,address)"](ownerAddress, signerAddress, sablierAddress, opts),
        "sablier contract is the zero address",
      );
    });
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
