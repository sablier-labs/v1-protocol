const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_DELTA, STANDARD_TIME_OFFSET } = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeWithdrawFromSalary(alice, bob, carol, eve) {
  const now = new BigNumber(dayjs().unix());

  describe("when the salary exists", function() {
    let salaryId;
    const company = alice;
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    let streamId;
    const relayer = carol;

    beforeEach(async function() {
      const opts = { from: company };
      await this.token.approve(this.payroll.address, salary, opts);
      const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
      salaryId = Number(result.logs[0].args.salaryId);
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the caller is the employee", function() {
      const opts = { from: employee };

      contextForStreamDidStartButNotEnd(function() {
        describe("when the withdrawal amount is within the available balance", function() {
          it("makes the withdrawal", async function() {
            const balance = await this.token.balanceOf(employee);
            await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            const newBalance = await this.token.balanceOf(employee);
            newBalance.should.be.bignumber.equal(balance.plus(FIVE_UNITS));
          });

          it("emits a withdrawfromsalary event", async function() {
            const result = await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            truffleAssert.eventEmitted(result, "WithdrawFromSalary");
          });

          it("decreases the stream balance", async function() {
            const balance = await this.sablier.balanceOf(streamId, employee);
            await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            const newBalance = await this.sablier.balanceOf(streamId, employee);
            newBalance.should.tolerateTheBlockTimeVariation(balance.minus(FIVE_UNITS), STANDARD_SCALE);
          });
        });

        describe("when the withdrawal amount is not within the available balance", function() {
          const withdrawalAmount = FIVE_UNITS.multipliedBy(2).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.payroll.withdrawFromSalary(salaryId, withdrawalAmount, opts),
              "amount exceeds the available balance",
            );
          });
        });
      });
    });

    describe("when the caller is a relayer", function() {
      const opts = { from: relayer };

      contextForStreamDidStartButNotEnd(function() {
        beforeEach(async function() {
          await this.payroll.whitelistRelayer(relayer, salaryId, { from: company });
        });

        describe("when the withdrawal amount is within the available balance", function() {
          it("makes the withdrawal", async function() {
            const balance = await this.token.balanceOf(employee);
            await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            const newBalance = await this.token.balanceOf(employee);
            newBalance.should.be.bignumber.equal(balance.plus(FIVE_UNITS));
          });

          it("emits a withdrawfromsalary event", async function() {
            const result = await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            truffleAssert.eventEmitted(result, "WithdrawFromSalary");
          });

          it("decreases the stream balance", async function() {
            const balance = await this.sablier.balanceOf(streamId, employee);
            await this.payroll.withdrawFromSalary(salaryId, FIVE_UNITS, opts);
            const newBalance = await this.sablier.balanceOf(streamId, employee);
            newBalance.should.tolerateTheBlockTimeVariation(balance.minus(FIVE_UNITS), STANDARD_SCALE);
          });
        });

        describe("when the withdrawal amount is not within the available balance", function() {
          const withdrawalAmount = FIVE_UNITS.multipliedBy(2).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(
              this.payroll.withdrawFromSalary(salaryId, withdrawalAmount, opts),
              "amount exceeds the available balance",
            );
          });
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
