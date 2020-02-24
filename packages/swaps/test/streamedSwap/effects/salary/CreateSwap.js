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

function shouldBehaveLikeCreateSwap(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the payroll contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token1.approve(this.streamedSwap.address, salary, opts);
        await this.token2.approve(this.streamedSwap.address, salary, { from: employee });
      });

      it("creates the swap", async function() {
        const result = await this.streamedSwap.createSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          startTime,
          stopTime,
          opts,
        );
        const swapId = Number(result.logs[0].args.swapId);
        const salaryObject = await this.streamedSwap.contract.methods.getSwap(swapId).call();
        salaryObject.sender.should.be.equal(company);
        salaryObject.recipient.should.be.equal(employee);
        salaryObject.deposit1.should.be.bignumber.equal(salary);
        salaryObject.deposit2.should.be.bignumber.equal(salary);
        salaryObject.tokenAddress1.should.be.equal(this.token1.address);
        salaryObject.tokenAddress2.should.be.equal(this.token2.address);
        salaryObject.startTime.should.be.bignumber.equal(startTime);
        salaryObject.stopTime.should.be.bignumber.equal(stopTime);
      });

      it("transfers the tokens to the contract", async function() {
        const balance = await this.token1.balanceOf(company);
        await this.streamedSwap.createSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          startTime,
          stopTime,
          opts,
        );
        const newBalance = await this.token1.balanceOf(company);
        newBalance.should.be.bignumber.equal(balance.minus(salary));
      });

      it("increases the next swap id", async function() {
        const nextSwapId = await this.streamedSwap.nextSwapId();
        await this.streamedSwap.createSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          startTime,
          stopTime,
          opts,
        );
        const newNextSwapId = await this.streamedSwap.nextSwapId();
        newNextSwapId.should.be.bignumber.equal(nextSwapId.plus(1));
      });

      it("emits a SwapCreation event", async function() {
        const result = await this.streamedSwap.createSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          startTime,
          stopTime,
          opts,
        );
        truffleAssert.eventEmitted(result, "SwapCreation");
      });
    });

    describe("when the swap contract does not have enough allowance", function() {
      const employee = bob;
      const startTime = now.plus(STANDARD_TIME_OFFSET);
      const stopTime = startTime.plus(STANDARD_TIME_DELTA);

      beforeEach(async function() {
        await this.token1.approve(this.streamedSwap.address, STANDARD_SALARY.minus(5).toString(10), opts);
        await this.token2.approve(this.streamedSwap.address, STANDARD_SALARY.minus(5).toString(10), opts);

      });

      describe("when the company has enough tokens", function() {
        const salary = STANDARD_SALARY.toString(10);

        it("reverts", async function() {
          await truffleAssert.reverts(
            this.streamedSwap.createSwap(
              employee,
              salary,
              salary,
              this.token1.address,
              this.token2.address,
              startTime,
              stopTime,
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
            this.streamedSwap.createSwap(
              employee,
              salary,
              salary,
              this.token1.address,
              this.token2.address,
              startTime,
              stopTime,
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
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    describe("when the token contract is non-compliant", function() {
      beforeEach(async function() {
        await this.nonStandardERC20Token.nonStandardApprove(this.streamedSwap.address, salary, opts);
        await this.token2.approve(this.streamedSwap.address, salary, {from: employee});
      });

      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.createSwap(
            employee,
            salary,
            salary,
            this.nonStandardERC20Token.address,
            this.token2.address,
            startTime,
            stopTime,
            opts,
          ),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });

    describe("when the token contract is the zero address", function() {
      it("reverts", async function() {
        await truffleAssert.reverts(
          this.streamedSwap.createSwap(employee, salary, salary, ZERO_ADDRESS, ZERO_ADDRESS, startTime, stopTime, opts),
          truffleAssert.ErrorType.REVERT,
        );
      });
    });
  });
}

module.exports = shouldBehaveLikeCreateSwap;
