const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SALARY, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeWhitelistRelayer(alice, bob, carol) {
  const now = new BigNumber(dayjs().unix());

  describe("when the salary exists", function() {
    let salaryId;
    const company = alice;
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);
    const relayer = carol;
    const opts = { from: company };

    beforeEach(async function() {
      await this.token.approve(this.payroll.address, salary, opts);
      const result = await this.payroll.createSalary(employee, salary, this.token.address, startTime, stopTime, opts);
      salaryId = result.logs[0].args.salaryId;
    });

    describe("when the relayer is not whitelisted", function() {
      it("whitelists the relayer", async function() {
        await this.payroll.whitelistRelayer(relayer, salaryId, opts);
        const result = await this.payroll.relayers(relayer, salaryId, opts);
        result.should.be.equal(true);
      });
    });

    describe("when the relayer is whitelisted", function() {
      it("reverts", async function() {
        await this.payroll.whitelistRelayer(relayer, salaryId, opts);
        await truffleAssert.reverts(this.payroll.whitelistRelayer(relayer, salaryId, opts), "relayer is whitelisted");
      });
    });
  });

  describe("when the salary does not exist", function() {
    const relayer = carol;
    const opts = { from: alice };

    it("reverts", async function() {
      const salaryId = new BigNumber(419863);
      await truffleAssert.reverts(this.payroll.whitelistRelayer(relayer, salaryId, opts), "salary does not exist");
    });
  });
}

module.exports = shouldBehaveLikeWhitelistRelayer;
