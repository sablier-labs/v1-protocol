const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  STANDARD_RATE_PER_SECOND,
  STANDARD_SALARY,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
  ZERO_ADDRESS,
} = devConstants;

function shouldBehaveLikeCreateSalary(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the payroll contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
      });

      it("creates the salary", async function() {
        const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
        const salaryId = Number(result.logs[0].args.salaryId);
        const salaryObject = await this.payroll.contract.methods.getSalary(salaryId).call();
        salaryObject.company.should.be.equal(company);
        salaryObject.employee.should.be.equal(employee);
        salaryObject.salary.should.be.bignumber.equal(salary);
        salaryObject.tokenAddress.should.be.equal(this.token.address);
        salaryObject.startTime.should.be.bignumber.equal(startTime);
        salaryObject.stopTime.should.be.bignumber.equal(stopTime);
        salaryObject.remainingBalance.should.be.bignumber.equal(salary);
        salaryObject.rate.should.be.bignumber.equal(STANDARD_RATE_PER_SECOND);
      });

      it("transfers the tokens to the contract", async function() {
        const balance = await this.token.balanceOf(company);
        await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
        const newBalance = await this.token.balanceOf(company);
        newBalance.should.be.bignumber.equal(balance.minus(salary));
      });

      it("increases the next salary id", async function() {
        const nextSalaryId = await this.payroll.nextSalaryId();
        await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
        const newNextSalaryId = await this.payroll.nextSalaryId();
        newNextSalaryId.should.be.bignumber.equal(nextSalaryId.plus(1));
      });

      it("emits a createsalary event", async function() {
        const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
        truffleAssert.eventEmitted(result, "CreateSalary");
      });
    });

    describe("when the payroll contract does not have enough allowance", function() {
      const employee = bob;
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, STANDARD_SALARY.minus(5).toString(10), opts);
      });

      describe("when the company has enough tokens", function() {
        const salary = STANDARD_SALARY.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });

      describe("when the company does not have enough tokens", function() {
        const salary = STANDARD_SALARY.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });
    });
  });

  describe("when the token contract is not erc20", function() {
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    describe("when the token contract is non-compliant", function() {
      beforeEach(async function() {
        await this.nonStandardERC20Token.nonStandardApprove(this.payroll.address, salary, opts);
      });

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.createSalary(employee, salary, this.nonStandardERC20Token.address, startTime, stopTime, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the token contract is the zero address", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.createSalary(employee, salary, ZERO_ADDRESS, startTime, stopTime, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });
  });
}

module.exports = shouldBehaveLikeCreateSalary;
