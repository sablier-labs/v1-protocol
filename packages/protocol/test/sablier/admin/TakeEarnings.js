/* eslint-disable no-await-in-loop */
const { devConstants, mochaContexts } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SABLIER_FEE,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_SUPPLY_AMOUNT,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;
const { contextForStreamDidStartButNotEnd } = mochaContexts;

function shouldBehaveLikeTakeEarnings(alice, bob, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    beforeEach(async function() {
      await this.sablier.updateFee(STANDARD_SABLIER_FEE);
    });

    describe("when the cToken is whitelisted", function() {
      beforeEach(async function() {
        await this.cTokenManager.whitelistCToken(this.cToken.address, opts);
      });

      describe("when the amount does not exceed the available balance", function() {
        let streamId;
        const recipient = bob;
        const deposit = STANDARD_SALARY_CTOKEN.toString(10);
        const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
        const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;
        const now = new BigNumber(dayjs().unix());
        const startTime = now.plus(STANDARD_TIME_OFFSET);
        const stopTime = startTime.plus(STANDARD_TIME_DELTA);

        beforeEach(async function() {
          await this.cToken.approve(this.sablier.address, deposit, opts);
          const result = await this.sablier.createCompoundingStream(
            recipient,
            deposit,
            this.cToken.address,
            startTime,
            stopTime,
            senderSharePercentage,
            recipientSharePercentage,
            opts,
          );
          streamId = Number(result.logs[0].args.streamId);
          await this.token.approve(this.cToken.address, STANDARD_SUPPLY_AMOUNT.toString(10), opts);
          await this.cToken.supplyUnderlying(STANDARD_SUPPLY_AMOUNT.toString(10), opts);
        });

        describe("when the amount is not zero", function() {
          const amount = FIVE_UNITS_CTOKEN.toString(10);

          contextForStreamDidStartButNotEnd(function() {
            it("takes the earnings", async function() {
              await this.sablier.withdrawFromStream(streamId, amount, opts);
              const balance = await this.cToken.balanceOf(admin, opts);
              const earningsAmount = await this.sablier.getEarnings(this.cToken.address);
              await this.sablier.takeEarnings(this.cToken.address, earningsAmount, opts);
              const newBalance = await this.cToken.balanceOf(admin, opts);
              balance.should.be.bignumber.equal(newBalance.minus(earningsAmount));
            });
          });
        });

        describe("when the amount is zero", function() {
          const amount = new BigNumber(0).toString(10);

          it("reverts", async function() {
            await truffleAssert.reverts(this.sablier.takeEarnings(this.cToken.address, amount, opts), "amount is zero");
          });
        });
      });

      describe("when the amount exceeds the available balance", function() {
        const amount = new BigNumber(8123101);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.takeEarnings(this.cToken.address, amount, opts),
            "amount exceeds the available balance",
          );
        });
      });
    });

    describe("when the cToken is not whitelisted", function() {
      const amount = new BigNumber(8123101);

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.sablier.takeEarnings(this.cToken.address, amount, opts),
          "cToken is not whitelisted",
        );
      });
    });
  });

  describe("when the caller is not the admin", function() {
    const opts = { from: eve };
    const amount = new BigNumber(8123101);

    it("reverts", async function() {
      await truffleAssert.reverts(
        this.sablier.takeEarnings(this.cToken.address, amount, opts),
        truffleAssert.ErrorType.REVERT,
      );
    });
  });
}

module.exports = shouldBehaveLikeTakeEarnings;
