const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  ONE_PERCENT_MANTISSA,
  STANDARD_RATE_PER_SECOND_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;

/**
 * We do not tests all the logical branches as in `CreateSalary.js`, because these are unit tests.
 * The `createCompoundingSalary` method uses `createStream`, so if that fails with non-compliant erc20
 * or insufficient allowances, this must fail too.
 */
function shouldBehaveLikeCreateCompoundingSalary(alice, bob) {
  const company = alice;
  const employee = bob;
  const salary = STANDARD_SALARY_CTOKEN.toString(10);
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    await this.cToken.approve(this.payroll.address, salary, opts);
  });

  describe("when the cToken is whitelisted", function() {
    beforeEach(async function() {
      await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
    });

    describe("when interest shares are valid", function() {
      const companySharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
      const employeeSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

      it("creates the compounding salary", async function() {
        const result = await this.payroll.createCompoundingSalary(
          employee,
          salary,
          this.cToken.address,
          startTime,
          stopTime,
          companySharePercentage,
          employeeSharePercentage,
          opts,
        );
        const exchangeRateInitial = new BigNumber(await this.cToken.contract.methods.exchangeRateCurrent().call());

        const salaryId = Number(result.logs[0].args.salaryId);
        const salaryObject = await this.payroll.contract.methods.getSalary(salaryId).call();
        salaryObject.company.should.be.equal(company);
        salaryObject.employee.should.be.equal(employee);
        salaryObject.salary.should.be.bignumber.equal(salary);
        salaryObject.tokenAddress.should.be.equal(this.cToken.address);
        salaryObject.startTime.should.be.bignumber.equal(startTime);
        salaryObject.stopTime.should.be.bignumber.equal(stopTime);
        salaryObject.remainingBalance.should.be.bignumber.equal(salary);
        salaryObject.rate.should.be.bignumber.equal(STANDARD_RATE_PER_SECOND_CTOKEN);

        // Implementing `getCompoundingSalary` yields a "Stack Too Deep" error
        const streamId = Number(result.logs[0].args.streamId);
        const compoundingStreamObject = await this.sablier.contract.methods.getCompoundingStream(streamId).call();
        compoundingStreamObject.exchangeRateInitial.should.be.bignumber.equal(exchangeRateInitial);
        compoundingStreamObject.senderSharePercentage.should.be.bignumber.equal(
          companySharePercentage.multipliedBy(ONE_PERCENT_MANTISSA),
        );
        compoundingStreamObject.recipientSharePercentage.should.be.bignumber.equal(
          employeeSharePercentage.multipliedBy(ONE_PERCENT_MANTISSA),
        );
      });

      it("transfers the tokens to the contract", async function() {
        const balance = await this.cToken.balanceOf(company);
        await this.payroll.createCompoundingSalary(
          employee,
          salary,
          this.cToken.address,
          startTime,
          stopTime,
          companySharePercentage,
          employeeSharePercentage,
          opts,
        );
        const newBalance = await this.cToken.balanceOf(company);
        newBalance.should.be.bignumber.equal(balance.minus(salary));
      });

      it("increases the next salary id", async function() {
        const nextSalaryId = await this.payroll.nextSalaryId();
        await this.payroll.createCompoundingSalary(
          employee,
          salary,
          this.cToken.address,
          startTime,
          stopTime,
          companySharePercentage,
          employeeSharePercentage,
          opts,
        );
        const newNextSalaryId = await this.payroll.nextSalaryId();
        newNextSalaryId.should.be.bignumber.equal(nextSalaryId.plus(1));
      });

      it("emits a createsalary event", async function() {
        const result = await this.payroll.createCompoundingSalary(
          employee,
          salary,
          this.cToken.address,
          startTime,
          stopTime,
          companySharePercentage,
          employeeSharePercentage,
          opts,
        );
        truffleAssert.eventEmitted(result, "CreateSalary");
      });
    });

    describe("when interest shares are not valid", function() {
      const companySharePercentage = new BigNumber(40);
      const employeeSharePercentage = new BigNumber(140);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.createCompoundingStream(
            employee,
            salary,
            this.cToken.address,
            startTime,
            stopTime,
            companySharePercentage,
            employeeSharePercentage,
            opts,
          ),
          "shares do not sum up to 100",
        );
      });
    });
  });

  describe("when the cToken is not whitelisted", function() {
    const companySharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
    const employeeSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.payroll.createCompoundingSalary(
          employee,
          salary,
          this.cToken.address,
          startTime,
          stopTime,
          companySharePercentage,
          employeeSharePercentage,
          opts,
        ),
        "cToken is not whitelisted",
      );
    });
  });
}

module.exports = shouldBehaveLikeCreateCompoundingSalary;
