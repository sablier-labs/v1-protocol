const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

function shouldBehaveLikeGetSalary(alice) {
  describe("when the salary does not exist", function() {
    const company = alice;
    const opts = { from: company };

    it("reverts", async function() {
      const salaryId = new BigNumber(419863);
      await truffleAssert.reverts(this.payroll.getSalary(salaryId, opts), "salary does not exist");
    });
  });
}

module.exports = shouldBehaveLikeGetSalary;
