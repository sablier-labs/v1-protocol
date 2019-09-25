const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeCancelSalary(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the salary exists", function() {
    let salaryId;
    const company = alice;
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    let streamId;

    beforeEach(async function() {
      const opts = { from: company };
      await this.token.approve(this.payroll.address, salary, opts);

      const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
      salaryId = Number(result.logs[0].args.salaryId);
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the company", function() {
      const opts = { from: company };

      contextForStreamDidStartButNotEnd(function() {
        it("cancels the salary", async function() {
          await this.payroll.cancelSalary(salaryId, opts);
          await truffleAssert.reverts(this.payroll.getSalary(salaryId), "salary does not exist");
        });

        it("transfers the tokens to the sender of the stream", async function() {
          const balance = await this.token.balanceOf(company);
          await this.payroll.cancelSalary(salaryId, opts);
          const newBalance = await this.token.balanceOf(company);
          const tolerateByAddition = false;
          newBalance.should.tolerateTheBlockTimeVariation(
            balance.minus(FIVE_UNITS).plus(salary),
            STANDARD_SCALE,
            tolerateByAddition,
          );
        });

        it("transfers the tokens to the recipient of the stream", async function() {
          const balance = await this.token.balanceOf(employee);
          await this.payroll.cancelSalary(salaryId, opts);
          const newBalance = await this.token.balanceOf(employee);
          newBalance.should.tolerateTheBlockTimeVariation(balance.plus(FIVE_UNITS), STANDARD_SCALE);
        });

        it("emits a cancelsalary event", async function() {
          const result = await this.payroll.cancelSalary(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelSalary");
        });
      });
    });

    describe("when the caller is the employee", function() {
      const opts = { from: employee };

      contextForStreamDidStartButNotEnd(function() {
        it("cancels the salary", async function() {
          await this.payroll.cancelSalary(salaryId, opts);
          await truffleAssert.reverts(this.payroll.getSalary(salaryId), "salary does not exist");
        });

        it("transfers the tokens to the sender of the stream", async function() {
          const balance = await this.token.balanceOf(company);
          await this.payroll.cancelSalary(salaryId, opts);
          const newBalance = await this.token.balanceOf(company);
          const tolerateByAddition = false;
          newBalance.should.tolerateTheBlockTimeVariation(
            balance.minus(FIVE_UNITS).plus(salary),
            STANDARD_SCALE,
            tolerateByAddition,
          );
        });

        it("transfers the tokens to the recipient of the stream", async function() {
          const balance = await this.token.balanceOf(employee);
          await this.payroll.cancelSalary(salaryId, opts);
          const newBalance = await this.token.balanceOf(employee);
          newBalance.should.tolerateTheBlockTimeVariation(balance.plus(FIVE_UNITS), STANDARD_SCALE);
        });

        it("emits a cancelsalary event", async function() {
          const result = await this.payroll.cancelSalary(streamId, opts);
          truffleAssert.eventEmitted(result, "CancelSalary");
        });
      });
    });

    describe("when the caller is not the company or the employee", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.cancelSalary(salaryId, opts),
          "caller is not the company or the employee",
        );
      });
    });
  });

  describe("when the salary does not exist", function() {
    const recipient = bob;
    const opts = { from: recipient };

    it("reverts", async function() {
      const salaryId = new BigNumber(419863);
      await truffleAssert.reverts(this.payroll.cancelSalary(salaryId, opts), "salary does not exist");
    });
  });
}

module.exports = shouldBehaveLikeCancelSalary;
