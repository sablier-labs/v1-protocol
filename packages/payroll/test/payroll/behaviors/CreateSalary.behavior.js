const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_RATE, STANDARD_SALARY, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeCreateSalary(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the payroll contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isCompounding = false;

      beforeEach(async function() {
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
      });

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, STANDARD_SALARY.toString(10), opts);
      });

      it("creates the salary", async function() {
        const result = await this.payroll.createSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isCompounding,
          opts,
        );
        // We have to force-call the `getSalary` method via the web3.eth.Contract api, otherwise
        // solidity-coverage will turn it into a state-changing method
        const onchainSalary = await this.payroll.contract.methods
          .getSalary(Number(result.logs[0].args.salaryId))
          .call();
        onchainSalary.company.should.be.equal(company);
        onchainSalary.employee.should.be.equal(employee);
        onchainSalary.salary.should.be.bignumber.equal(salary);
        onchainSalary.tokenAddress.should.be.equal(this.token.address);
        onchainSalary.startTime.should.be.bignumber.equal(startTime);
        onchainSalary.stopTime.should.be.bignumber.equal(stopTime);
        onchainSalary.balance.should.be.bignumber.equal(salary);
        onchainSalary.rate.should.be.bignumber.equal(STANDARD_RATE);
        onchainSalary.isCompounding.should.be.equal(false);
      });

      it("increases the token balance", async function() {
        const balance = await this.token.balanceOf(company);
        await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, isCompounding, opts);
        const newBalance = await this.token.balanceOf(company);
        balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY));
      });

      it("increases the salary nonce", async function() {
        const nonce = await this.sablier.nonce();
        await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, isCompounding, opts);
        const newNonce = await this.sablier.nonce();
        nonce.should.be.bignumber.equal(newNonce.minus(1));
      });

      it("emits an createsalary event", async function() {
        const result = await this.payroll.createSalary(
          employee,
          salary,
          this.token.address,
          startTime,
          stopTime,
          isCompounding,
          opts,
        );
        truffleAssert.eventEmitted(result, "CreateSalary");
      });
    });

    describe("when the payroll contract does not have enough allowance", function() {
      const employee = bob;
      let startTime;
      let stopTime;
      const isCompounding = false;

      beforeEach(async function() {
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        await this.token.approve(this.payroll.address, STANDARD_SALARY.minus(5).toString(10), opts);
      });

      describe("when the company has enough tokens", function() {
        const salary = STANDARD_SALARY.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, isCompounding, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });

      describe("when the company does not have enough tokens", function() {
        const salary = STANDARD_SALARY.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, isCompounding, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });
    });
  });

  describe("when the token contract is not erc20", function() {
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;
    const isCompounding = false;

    beforeEach(async function() {
      startTime = now.plus(STANDARD_TIME_OFFSET);
      stopTime = startTime.plus(STANDARD_TIME_DELTA);
    });

    describe("when the token contract is non-compliant", function() {
      beforeEach(async function() {
        await this.nonStandardERC20Token.nonStandardApprove(this.payroll.address, STANDARD_SALARY.toString(10), opts);
      });

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.createSalary(
            employee,
            salary,
            this.nonStandardERC20Token.address,
            startTime,
            stopTime,
            isCompounding,
            opts,
          ),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the token contract is the zero address", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.createSalary(employee, salary, ZERO_ADDRESS, startTime, stopTime, isCompounding, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });
  });
}

module.exports = shouldBehaveLikeCreateSalary;
