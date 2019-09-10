const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeCreateSalary = require("./behaviors/CreateSalary.behavior");
const shouldBehaveLikeCancelSalary = require("./behaviors/CancelSalary.behavior");
const shouldBehaveLikeWithdrawFromSalary = require("./behaviors/WithdrawFromSalary.behavior");

const { STANDARD_RATE, STANDARD_SALARY, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;

function shouldBehaveLikePayroll(alice, bob, carol, eve) {
  let snapshotId;

  beforeEach(async () => {
    const snapshot = await traveler.takeSnapshot();
    snapshotId = snapshot.result;
  });

  afterEach(async () => {
    await traveler.revertToSnapshot(snapshotId);
  });

  describe("getSalary", function() {
    describe("when the salary does not exist", function() {
      const company = alice;
      const opts = { from: company };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.getSalary(salaryId, opts), "salary does not exist");
      });
    });
  });

  describe("createSalary", function() {
    shouldBehaveLikeCreateSalary(alice, bob);
  });

  describe("cancelSalary", function() {
    shouldBehaveLikeCancelSalary(alice, bob, eve);
  });

  describe("withdrawFromSalary", function() {
    shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve);
  });

  describe("whitelistRelayer", function() {
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isCompounding = false;
      const relayer = carol;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.createSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isCompounding,
          opts,
        );
        salaryId = result.logs[0].args.salaryId;
      });

      describe("when the relayer is not whitelisted", function() {
        it("whitelists the relayer", async function() {
          await this.payroll.whitelistRelayer(relayer, salaryId, opts);
          const result = await this.payroll.relayers(relayer, salaryId, opts);
          result.should.be.equal(true);
        });
      });

      describe("when the relayer is whitelisted", function() {
        it("reverts", async function() {
          await this.payroll.whitelistRelayer(relayer, salaryId, opts);
          await truffleAssert.reverts(this.payroll.whitelistRelayer(relayer, salaryId, opts), "relayer is whitelisted");
        });
      });
    });

    describe("when the salary does not exist", function() {
      const relayer = carol;
      const opts = { from: alice };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.whitelistRelayer(relayer, salaryId, opts), "salary does not exist");
      });
    });
  });

  describe("discardRelayer", function() {
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isCompounding = false;
      const relayer = carol;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.createSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isCompounding,
          opts,
        );
        salaryId = result.logs[0].args.salaryId;
      });

      describe("when the relayer is whitelisted", function() {
        it("removes the relayer", async function() {
          await this.payroll.whitelistRelayer(relayer, salaryId, opts);
          await this.payroll.discardRelayer(relayer, salaryId, opts);
          const result = await this.payroll.relayers(relayer, salaryId, opts);
          result.should.be.equal(false);
        });
      });

      describe("when the relayer is not whitelisted", function() {
        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.discardRelayer(relayer, salaryId, opts),
            "relayer is not whitelisted",
          );
        });
      });
    });

    describe("when the salary does not exist", function() {
      const relayer = carol;
      const opts = { from: alice };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.discardRelayer(relayer, salaryId, opts), "salary does not exist");
      });
    });
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
