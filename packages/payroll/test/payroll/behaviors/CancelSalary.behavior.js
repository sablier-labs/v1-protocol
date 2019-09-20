const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;

function shouldBehaveLikeCancelSalary(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the salary exists", function() {
    let salaryId;
    const company = alice;
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;
    const isCompounding = false;
    let streamId;

    beforeEach(async function() {
      const opts = { from: company };
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
      streamId = result.logs[0].args.streamId;
    });

    describe("when the caller is the company", function() {
      const opts = { from: company };

      beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("cancels the salary and transfers the tokens on a pro rata basis", async function() {
        const senderBalance = await this.token.balanceOf(company);
        const recipientBalance = await this.token.balanceOf(employee);
        await this.payroll.cancelSalary(salaryId, opts);
        const newSenderBalance = await this.token.balanceOf(company);
        const newRecipientBalance = await this.token.balanceOf(employee);
        const tolerateByAddition = false;
        newSenderBalance.should.tolerateTheBlockTimeVariation(
          senderBalance.minus(FIVE_UNITS).plus(salary),
          STANDARD_SCALE,
          tolerateByAddition,
        );
        newRecipientBalance.should.tolerateTheBlockTimeVariation(recipientBalance.plus(FIVE_UNITS), STANDARD_SCALE);
      });

      it("deletes the salary object", async function() {
        await this.payroll.cancelSalary(salaryId, opts);
        await truffleAssert.reverts(this.payroll.getSalary(salaryId), "salary does not exist");
      });

      it("emits a cancelsalary event", async function() {
        const result = await this.payroll.cancelSalary(streamId, opts);
        truffleAssert.eventEmitted(result, "CancelSalary");
      });
    });

    describe("when the caller is the employee", function() {
      const opts = { from: employee };

      beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("cancels the salary and transfers the tokens on a pro rata basis", async function() {
        const senderBalance = await this.token.balanceOf(company);
        const recipientBalance = await this.token.balanceOf(employee);
        await this.payroll.cancelSalary(salaryId, opts);
        const newSenderBalance = await this.token.balanceOf(company);
        const newRecipientBalance = await this.token.balanceOf(employee);
        const tolerateByAddition = false;
        newSenderBalance.should.tolerateTheBlockTimeVariation(
          senderBalance.plus(salary).minus(FIVE_UNITS),
          STANDARD_SCALE,
          tolerateByAddition,
        );
        newRecipientBalance.should.tolerateTheBlockTimeVariation(recipientBalance.plus(FIVE_UNITS), STANDARD_SCALE);
      });

      it("deletes the salary object", async function() {
        await this.payroll.cancelSalary(salaryId, opts);
        await truffleAssert.reverts(this.payroll.getSalary(salaryId), "salary does not exist");
      });

      it("emits a cancelsalary event", async function() {
        const result = await this.payroll.cancelSalary(streamId, opts);
        truffleAssert.eventEmitted(result, "CancelSalary");
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
