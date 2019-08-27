const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, ONE_UNIT, STANDARD_SALARY, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET, ZERO_ADDRESS } = devConstants;

function shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the salary exists", function() {
    let salaryId;
    const company = alice;
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    let startTime;
    let stopTime;
    const isAccruing = false;
    let streamId;
    const relayer = carol;

    beforeEach(async function() {
      const opts = { from: company };
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
      streamId = result.logs[0].args.streamId;
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

      describe("when the withdrawal amount is within the available balance", function() {
        it("makes the withdrawal", async function() {
          const balance = await this.token.balanceOf(employee);
          await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          const newBalance = await this.token.balanceOf(employee);
          balance.should.bignumber.satisfy(function(num) {
            return (
              num.isEqualTo(newBalance.minus(FIVE_UNITS)) || num.isEqualTo(newBalance.minus(FIVE_UNITS).plus(ONE_UNIT))
            );
          });
        });

        it("emits a withdrawfromsalary event", async function() {
          const result = await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          truffleAssert.eventEmitted(result, "WithdrawFromSalary");
        });

        it("decreases the stream balance", async function() {
          const balance = await this.sablier.balanceOf(streamId, employee);
          await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          const newBalance = await this.sablier.balanceOf(streamId, employee);
          balance.should.bignumber.satisfy(function(num) {
            return (
              num.isEqualTo(newBalance.plus(FIVE_UNITS)) || num.isEqualTo(newBalance.plus(FIVE_UNITS).plus(ONE_UNIT))
            );
          });
        });
      });

      describe("when the withdrawal amount is not within the available balance", function() {
        const amount = FIVE_UNITS.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.withdrawFromSalary(salaryId, amount, opts),
            "withdrawal exceeds the available balance",
          );
        });
      });
    });

    describe("when the caller is a relayer", function() {
      const opts = { from: relayer };

      beforeEach(async function() {
        await this.payroll.addRelayer(relayer, salaryId, { from: company });
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      describe("when the withdrawal amount is within the available balance", function() {
        it("makes the withdrawal", async function() {
          const balance = await this.token.balanceOf(employee);
          await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          const newBalance = await this.token.balanceOf(employee);
          balance.should.bignumber.satisfy(function(num) {
            return (
              num.isEqualTo(newBalance.minus(FIVE_UNITS)) || num.isEqualTo(newBalance.minus(FIVE_UNITS).plus(ONE_UNIT))
            );
          });
        });

        it("emits a withdrawfromsalary event", async function() {
          const result = await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          truffleAssert.eventEmitted(result, "WithdrawFromSalary");
        });

        it("decreases the stream balance", async function() {
          const balance = await this.sablier.balanceOf(streamId, employee);
          await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
          const newBalance = await this.sablier.balanceOf(streamId, employee);
          balance.should.bignumber.satisfy(function(num) {
            return (
              num.isEqualTo(newBalance.plus(FIVE_UNITS)) || num.isEqualTo(newBalance.plus(FIVE_UNITS).plus(ONE_UNIT))
            );
          });
        });
      });

      describe("when the withdrawal amount is not within the available balance", function() {
        const amount = FIVE_UNITS.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.withdrawFromSalary(salaryId, amount, opts),
            "withdrawal exceeds the available balance",
          );
        });
      });
    });

    describe("when the caller is not the employee or a relayer", function() {
      const opts = { from: eve };

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts),
          "caller is not the employee or a relayer",
        );
      });
    });
  });

  describe("when the salary does not exist", function() {
    const employee = bob;
    const opts = { from: employee };

    it("reverts", async function() {
      const salaryId = new BigNumber(419863);
      await truffleAssert.reverts(this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts), "salary does not exist");
    });
  });
}

module.exports = shouldBehaveLikeWithdrawFromSalary;
