/* eslint-disable no-await-in-loop */
const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const {
  FIVE_UNITS_CTOKEN,
  STANDARD_RECIPIENT_SHARE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SABLIER_FEE,
  STANDARD_SENDER_SHARE,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
} = devConstants;

function shouldBehaveLikeTakeEarnings(alice, bob, eve) {
  const admin = alice;

  describe("when the caller is the admin", function() {
    const opts = { from: admin };

    describe("when the fee is not zero", function() {
      beforeEach(async function() {
        await this.sablier.updateFee(STANDARD_SABLIER_FEE);
      });

      describe("when the ctoken is whitelisted", function() {
        beforeEach(async function() {
          await this.sablier.whitelistCToken(this.cToken.address, opts);
        });

        describe("when the amount does not exceed the available balance", function() {
          let streamId;
          const recipient = bob;
          const deposit = STANDARD_SALARY_CTOKEN.toString(10);
          const senderShare = STANDARD_SENDER_SHARE;
          const recipientShare = STANDARD_RECIPIENT_SHARE;
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
              senderShare,
              recipientShare,
              opts,
            );
            streamId = Number(result.logs[0].args.streamId);
            // Advancing the block number simulates earning interest on Compound
            for (let i = 0; i < 5; i += 1) {
              await traveler.advanceBlock();
            }
            await traveler.advanceBlockAndSetTime(
              now
                .plus(STANDARD_TIME_OFFSET)
                .plus(5)
                .toNumber(),
            );
          });

          it("takes the earnings", async function() {
            const withdrawalAmount = FIVE_UNITS_CTOKEN;
            await this.sablier.withdrawFromStream(streamId, withdrawalAmount, opts);
            const balance = await this.cToken.balanceOf(admin);
            const earningsAmount = await this.sablier.earnings(this.cToken.address);
            await this.sablier.takeEarnings(this.cToken.address, earningsAmount, opts);
            const newBalance = await this.cToken.balanceOf(admin);
            balance.should.be.bignumber.equal(newBalance.minus(earningsAmount));
          });

          afterEach(async function() {
            await traveler.advanceBlockAndSetTime(now.toNumber());
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

      describe("when the ctoken is not whitelisted", function() {
        const amount = new BigNumber(8123101);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.sablier.takeEarnings(this.cToken.address, amount, opts),
            "ctoken is not whitelisted",
          );
        });
      });
    });

    describe("when the fee is zero", function() {});
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
