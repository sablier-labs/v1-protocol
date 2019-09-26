const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS.toString(10);

    it("cancels the salary", async function() {
      await this.payroll.cancelSalary(this.salaryId, this.opts);
      await truffleAssert.reverts(this.payroll.getSalary(this.salaryId), "salary does not exist");
    });

    it("transfers the tokens to the sender of the stream", async function() {
      const balance = await this.token.balanceOf(this.company);
      await this.payroll.cancelSalary(this.salaryId, this.opts);
      const newBalance = await this.token.balanceOf(this.company);
      const tolerateByAddition = false;
      newBalance.should.tolerateTheBlockTimeVariation(
        balance.minus(streamedAmount).plus(this.salary),
        STANDARD_SCALE,
        tolerateByAddition,
      );
    });

    it("transfers the tokens to the recipient of the stream", async function() {
      const balance = await this.token.balanceOf(this.employee);
      await this.payroll.cancelSalary(this.salaryId, this.opts);
      const newBalance = await this.token.balanceOf(this.employee);
      newBalance.should.tolerateTheBlockTimeVariation(balance.plus(streamedAmount), STANDARD_SCALE);
    });

    it("emits a cancelsalary event", async function() {
      const result = await this.payroll.cancelSalary(this.streamId, this.opts);
      truffleAssert.eventEmitted(result, "CancelSalary");
    });
  });
}

function shouldBehaveLikeCancelSalary(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    this.company = alice;
    this.employee = bob;
    this.salary = STANDARD_SALARY.toString(10);
  });

  describe("when the salary exists", function() {
    beforeEach(async function() {
      this.opts = { from: this.company };
      await this.token.approve(this.payroll.address, this.salary, this.opts);
      const result = await this.payroll.createSalary(
        this.employee,
        this.salary,
        this.token.address,
        startTime,
        stopTime,
        this.opts,
      );
      this.salaryId = Number(result.logs[0].args.salaryId);
      this.streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the company", function() {
      beforeEach(async function() {
        this.opts = { from: this.company };
      });

      runTests();
    });

    describe("when the caller is the employee", function() {
      beforeEach(async function() {
        this.opts = { from: this.company };
      });

      runTests();
    });

    describe("when the caller is not the company or the employee", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.cancelSalary(this.salaryId, opts),
          "caller is not the company or the employee",
        );
      });
    });
  });

  describe("when the salary does not exist", function() {
    const opts = { from: alice };

    it("reverts", async function() {
      const salaryId = new BigNumber(419863);
      await truffleAssert.reverts(this.payroll.cancelSalary(salaryId, opts), "salary does not exist");
    });
  });
}

module.exports = shouldBehaveLikeCancelSalary;
