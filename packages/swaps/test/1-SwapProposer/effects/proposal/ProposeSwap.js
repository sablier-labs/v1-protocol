const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const truffleAssert = require("truffle-assertions");

const {
  STANDARD_RATE_PER_SECOND,
  STANDARD_SALARY,
  STANDARD_TIME_DELTA,
  STANDARD_TIME_OFFSET,
  ZERO_ADDRESS,
} = devConstants;

function shouldBehaveLikeProposeSwap(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the payroll contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      const duration = STANDARD_TIME_DELTA
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token1.approve(this.swapProposer.address, salary, opts);
      });

      it("creates the swap proposal", async function() {
        const result = await this.swapProposer.proposeSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          duration,
          opts,
        );
        const swapId = Number(result.logs[0].args.swapId);
        const proposalObject = await this.swapProposer.contract.methods.getSwapProposal(swapId).call();
        proposalObject.sender.should.be.equal(company);
        proposalObject.recipient.should.be.equal(employee);
        proposalObject.deposit1.should.be.bignumber.equal(salary);
        proposalObject.deposit2.should.be.bignumber.equal(salary);
        proposalObject.tokenAddress1.should.be.equal(this.token1.address);
        proposalObject.tokenAddress2.should.be.equal(this.token2.address);
        proposalObject.duration.should.be.bignumber.equal(duration);
      });

      it("transfers the tokens to the contract", async function() {
        const balance = await this.token1.balanceOf(company);
        await this.swapProposer.proposeSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          duration,
          opts,
        );
        const newBalance = await this.token1.balanceOf(company);
        newBalance.should.be.bignumber.equal(balance.minus(salary));
      });

      it("increases the next swap id", async function() {
        const nextSwapId = await this.swapProposer.nextSwapId();
        await this.swapProposer.proposeSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          duration,
          opts,
        );
        const newNextSwapId = await this.swapProposer.nextSwapId();
        newNextSwapId.should.be.bignumber.equal(nextSwapId.plus(1));
      });

      it("emits a SwapCreation event", async function() {
        const result = await this.swapProposer.proposeSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          duration,
          opts,
        );
        truffleAssert.eventEmitted(result, "SwapProposal");
      });
    });

    describe("when the swap contract does not have enough allowance", function() {
      const employee = bob;
      const duration = (STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token1.approve(this.swapProposer.address, STANDARD_SALARY.minus(5).toString(10), opts);
      });

      describe("when the company has enough tokens", function() {
        const salary = STANDARD_SALARY.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.swapProposer.proposeSwap(
              employee,
              salary,
              salary,
              this.token1.address,
              this.token2.address,
              duration,
              opts,
            ),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });

      describe("when the company does not have enough tokens", function() {
        const salary = STANDARD_SALARY.multipliedBy(2).toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.swapProposer.proposeSwap(
              employee,
              salary,
              salary,
              this.token1.address,
              this.token2.address,
              duration,
              opts,
            ),
            truffleAssert.ErrorType.REVERT,
          );
        });
      });
    });
  });

  describe("when the token contract is not erc20", function() {
    const employee = bob;
    const salary = STANDARD_SALARY.toString(10);
    const duration = STANDARD_TIME_DELTA;

    describe("when the token contract is non-compliant", function() {
      beforeEach(async function() {
        await this.nonStandardERC20Token.nonStandardApprove(this.swapProposer.address, salary, opts);
      });

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.swapProposer.proposeSwap(
            employee,
            salary,
            salary,
            this.nonStandardERC20Token.address,
            this.token2.address,
            duration,
            opts,
          ),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the token contract is the zero address", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.swapProposer.proposeSwap(employee, salary, salary, ZERO_ADDRESS, ZERO_ADDRESS, duration, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });
  });
}

module.exports = shouldBehaveLikeProposeSwap;
