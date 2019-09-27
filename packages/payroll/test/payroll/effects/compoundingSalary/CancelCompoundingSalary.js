const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SCALE_CTOKEN,
  STANDARD_SCALE_INTEREST,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_SUPPLY_AMOUNT,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function runTests() {
  contextForStreamDidStartButNotEnd(function() {
    const streamedAmount = FIVE_UNITS_CTOKEN.toString(10);

    it("cancels the compounding salary", async function() {
      await this.payroll.cancelSalary(this.salaryId, this.opts);
      await truffleAssert.reverts(this.payroll.getSalary(this.salaryId), "salary does not exist");
      await truffleAssert.reverts(this.sablier.getCompoundingStream(this.streamId), "stream does not exist");
    });

    it("transfers the tokens and pays the interest to the company", async function() {
      const balance = await this.cToken.balanceOf(this.company, this.opts);
      const { senderInterest: companyInterest } = await this.sablier.contract.methods
        .interestOf(this.streamId, streamedAmount)
        .call();
      await this.payroll.cancelSalary(this.streamId, this.opts);
      const newBalance = await this.cToken.balanceOf(this.company, this.opts);
      const tolerateByAddition = false;
      newBalance.should.tolerateTheBlockTimeVariation(
        balance
          .minus(streamedAmount)
          .plus(this.salary)
          .plus(companyInterest),
        STANDARD_SCALE_CTOKEN,
        tolerateByAddition,
      );
    });

    it("transfers the tokens and pays the interest to the employee", async function() {
      const balance = await this.cToken.balanceOf(this.employee, this.opts);
      const { senderInterest, sablierInterest } = await this.sablier.contract.methods
        .interestOf(this.streamId, streamedAmount)
        .call();
      await this.payroll.cancelSalary(this.streamId, this.opts);
      const netWithdrawalAmount = new BigNumber(streamedAmount).minus(senderInterest).minus(sablierInterest);
      const newBalance = await this.cToken.balanceOf(this.employee, this.opts);
      newBalance.should.tolerateTheBlockTimeVariation(balance.plus(netWithdrawalAmount), STANDARD_SCALE_CTOKEN);
    });

    it("pays the interest to the sablier contract", async function() {
      const earnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
      const balance = await this.cToken.balanceOf(this.sablier.address, this.opts);
      const { remainingBalance } = await this.sablier.contract.methods.getStream(this.salaryId).call();
      const { sablierInterest } = await this.sablier.contract.methods.interestOf(this.streamId, streamedAmount).call();
      await this.payroll.cancelSalary(this.streamId, this.opts);
      const newEarnings = await this.sablier.getEarnings(this.cToken.address, this.opts);
      const newBalance = await this.cToken.balanceOf(this.sablier.address, this.opts);
      newEarnings.should.tolerateTheBlockTimeVariation(earnings.plus(sablierInterest), STANDARD_SCALE_INTEREST);
      // The company and the employee's interests are included in `stream.remainingBalance`,
      // so we don't subtract them again
      newBalance.should.tolerateTheBlockTimeVariation(
        balance.minus(remainingBalance).plus(sablierInterest),
        STANDARD_SCALE_INTEREST,
      );
    });

    it("emits a cancelsalary event", async function() {
      const result = await this.payroll.cancelSalary(this.streamId, this.opts);
      await truffleAssert.eventEmitted(result, "CancelSalary");
    });
  });
}

function shouldBehaveLikeCancelCompoundingSalary(alice, bob, eve) {
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);
  const companySharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
  const employeeSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

  beforeEach(async function() {
    this.company = alice;
    this.employee = bob;
    this.salary = STANDARD_SALARY_CTOKEN.toString(10);
  });

  describe("when the salary exists", function() {
    beforeEach(async function() {
      this.opts = { from: this.company };
      await this.cTokenManager.whitelistCToken(this.cToken.address, this.opts);
      await this.cToken.approve(this.payroll.address, this.salary, this.opts);
      const result = await this.payroll.createCompoundingSalary(
        this.employee,
        this.salary,
        this.cToken.address,
        startTime,
        stopTime,
        companySharePercentage,
        employeeSharePercentage,
        this.opts,
      );
      this.salaryId = Number(result.logs[0].args.salaryId);
      this.streamId = Number(result.logs[0].args.streamId);
      await this.token.approve(this.cToken.address, STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
      await this.cToken.supplyUnderlying(STANDARD_SUPPLY_AMOUNT.toString(10), this.opts);
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

module.exports = shouldBehaveLikeCancelCompoundingSalary;
