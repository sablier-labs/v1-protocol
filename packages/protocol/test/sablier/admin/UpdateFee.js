const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const truffleAssert = require("truffle-assertions");

const { STANDARD_SABLIER_FEE } = devConstants;

function shouldBehaveLikeUpdateFee(alice, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the fee is a valid percentage", function() {
      const newFee = STANDARD_SABLIER_FEE;

      it("updates the fee", async function() {
        await this.sablier.updateFee(newFee, opts);
        const result = await this.sablier.fee();
        // The new fee is a mantissa
        result.should.be.bignumber.equal(newFee.multipliedBy(1e16));
      });
    });

    describe("when the fee is not a valid percentage", function() {
      it("reverts", async function() {
        const newFee = new BigNumber(110);
        await truffleAssert.reverts(this.sablier.updateFee(newFee, opts), "fee percentage higher than 100%");
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };
    const newFee = STANDARD_SABLIER_FEE;

    it("reverts", async function() {
      await truffleAssert.reverts(this.sablier.updateFee(newFee, opts), truffleAssert.ErrorType.REVERT);
    });
  });
}

module.exports = shouldBehaveLikeUpdateFee;
