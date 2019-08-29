const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeAddSalary(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the payroll contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const isAccruing = false;

      beforeEach(async function() {
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
      });

      describe("when the sablier contract has enough allowance", function() {
        beforeEach(async function() {
          await this.token.approve(this.payroll.address, STANDARD_SALARY.toString(10), opts);
          await this.payroll.resetSablierAllowance(this.token.address, opts);
        });

        it("adds the salary", async function() {
          const balance = await this.token.balanceOf(company);
          await this.payroll.addSalary(employee, salary, this.token.address, startTime, stopTime, isAccruing, opts);
          const newBalance = await this.token.balanceOf(company);
          balance.should.be.bignumber.equal(newBalance.plus(STANDARD_SALARY));
        });

        it("increases the salary nonce", async function() {
          const nonce = await this.sablier.nonce();
          await this.payroll.addSalary(employee, salary, this.token.address, startTime, stopTime, isAccruing, opts);
          const newNonce = await this.sablier.nonce();
          nonce.should.be.bignumber.equal(newNonce.minus(1));
        });

        it("emits an addsalary event", async function() {
          const result = await this.payroll.addSalary(
            employee,
            salary,
            this.token.address,
            startTime,
            stopTime,
            isAccruing,
            opts,
          );
          truffleAssert.eventEmitted(result, "AddSalary");
        });
      });

      describe("when the sablier contract does not have enough allowance", function() {
        beforeEach(async function() {
          await this.token.approve(this.payroll.address, STANDARD_SALARY.toString(10), opts);
        });

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.addSalary(employee, salary, this.token.address, startTime, stopTime, isAccruing, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });
    });

    describe("when the payroll contract does not have enough allowance", function() {
      const employee = bob;
      let startTime;
      let stopTime;
      const isAccruing = false;

      beforeEach(async function() {
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        await this.token.approve(this.payroll.address, STANDARD_SALARY.minus(5).toString(10), opts);
      });

      describe("when the company has enough tokens", function() {
        const salary = STANDARD_SALARY.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.addSalary(employee, salary, this.token.address, startTime, stopTime, isAccruing, opts),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });

      describe("when the company does not have enough tokens", function() {
        const salary = STANDARD_SALARY.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.addSalary(employee, salary, this.token.address, startTime, stopTime, isAccruing, opts),
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
    const isAccruing = false;

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
          this.payroll.addSalary(
            employee,
            salary,
            this.nonStandardERC20Token.address,
            startTime,
            stopTime,
            isAccruing,
            opts,
          ),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the token contract is the zero address", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.addSalary(employee, salary, ZERO_ADDRESS, startTime, stopTime, isAccruing, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });
  });
}

module.exports = shouldBehaveLikeAddSalary;
