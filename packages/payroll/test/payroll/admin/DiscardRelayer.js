const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeDiscardRelayer(alice, bob, carol) {
  describe("discardRelayer", function() {
    const now = new BigNumber(dayjs().unix());

    describe("when the salary exists", function() {
      let salaryId;
      const company = alice;
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      let startTime;
      let stopTime;
      const relayer = carol;
      const opts = { from: company };

      beforeEach(async function() {
        await this.token.approve(this.payroll.address, salary, opts);
        startTime = now.plus(STANDARD_TIME_OFFSET);
        stopTime = startTime.plus(STANDARD_TIME_DELTA);
        const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
        salaryId = result.logs[0].args.salaryId;
      });

      describe("when the relayer is whitelisted", function() {
        it("removes the relayer", async function() {
          await this.payroll.whitelistRelayer(relayer, salaryId, opts);
          await this.payroll.discardRelayer(relayer, salaryId, opts);
          const result = await this.payroll.relayers(relayer, salaryId, opts);
          result.should.be.equal(false);
        });
      });

      describe("when the relayer is not whitelisted", function() {
        it("reverts", async function() {
          await truffleAssert.reverts(
            this.payroll.discardRelayer(relayer, salaryId, opts),
            "relayer is not whitelisted",
          );
        });
      });
    });
  });
}

module.exports = shouldBehaveLikeDiscardRelayer;
