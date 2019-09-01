const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const shouldBehaveLikeAddSalary = require("./behaviors/AddSalary.behavior");
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
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isAccruing = false;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        await this.payroll.resetSablierAllowance(this.token.address, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.addSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isAccruing,
          opts,
        );
        salaryId = result.logs[0].args.salaryId;
      });

      it("returns the salary", async function() {
        const result = await this.payroll.getSalary(salaryId, opts);
        result.company.should.be.equal(company);
        result.employee.should.be.equal(employee);
        result.salary.should.be.bignumber.equal(salary);
        result.tokenAddress.should.be.equal(this.token.address);
        result.startTime.should.be.bignumber.equal(startTime);
        result.stopTime.should.be.bignumber.equal(stopTime);
        result.balance.should.be.bignumber.equal(salary);
        result.rate.should.be.bignumber.equal(STANDARD_RATE);
        result.isAccruing.should.be.equal(false);
      });
    });

    describe("when the salary does not exist", function() {
      const company = alice;
      const opts = { from: company };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.getSalary(salaryId, opts), "salary does not exist");
      });
    });
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

  describe("addRelayer", function() {
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isAccruing = false;
      const relayer = carol;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        await this.payroll.resetSablierAllowance(this.token.address, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.addSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isAccruing,
          opts,
        );
        salaryId = result.logs[0].args.salaryId;
      });

      it("adds the relayer", async function() {
        await this.payroll.addRelayer(relayer, salaryId, opts);
        const result = await this.payroll.relayers(relayer, salaryId);
        result.should.be.equal(true);
      });

      describe("when the relayer already exists", function() {
        it("reverts", async function() {
          await this.payroll.addRelayer(relayer, salaryId, opts);
          await truffleAssert.reverts(this.payroll.addRelayer(relayer, salaryId, opts), "relayer exists");
        });
      });
    });

    describe("when the salary does not exist", function() {
      const relayer = carol;
      const opts = { from: alice };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.addRelayer(relayer, salaryId, opts), "salary does not exist");
      });
    });
  });

  describe("removeRelayer", function() {
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isAccruing = false;
      const relayer = carol;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        await this.payroll.resetSablierAllowance(this.token.address, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.addSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isAccruing,
          opts,
        );
        salaryId = result.logs[0].args.salaryId;
      });

      it("removes the relayer", async function() {
        await this.payroll.addRelayer(relayer, salaryId, opts);
        await this.payroll.removeRelayer(relayer, salaryId, opts);
        const result = await this.payroll.relayers(relayer, salaryId);
        result.should.be.equal(false);
      });

      describe("when the relayer does not exist", function() {
        it("reverts", async function() {
          await truffleAssert.reverts(this.payroll.removeRelayer(relayer, salaryId, opts), "relayer does not exist");
        });
      });
    });

    describe("when the salary does not exist", function() {
      const relayer = carol;
      const opts = { from: alice };

      it("reverts", async function() {
        const salaryId = new BigNumber(419863);
        await truffleAssert.reverts(this.payroll.removeRelayer(relayer, salaryId, opts), "salary does not exist");
      });
    });
  });
}

module.exports = {
  shouldBehaveLikePayroll,
};
