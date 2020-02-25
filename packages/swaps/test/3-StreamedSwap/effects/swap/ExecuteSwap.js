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

function shouldBehaveLikeExecuteSwap(alice, bob) {
  const company = alice;
  const opts = { from: company };
  const now = new BigNumber(dayjs().unix());

  describe("when the token contract is erc20 compliant", function() {
    describe("when the executor contract has enough allowance", function() {
      const employee = bob;
      const salary = STANDARD_SALARY.toString(10);
      const duration = STANDARD_TIME_DELTA;
      const recipientOpts = { from: employee }

      beforeEach(async function() {
        await this.token1.approve(this.streamedSwap.address, salary, opts);
        await this.token2.approve(this.streamedSwap.address, salary, recipientOpts);
        const result = await this.streamedSwap.proposeSwap(
          employee,
          salary,
          salary,
          this.token1.address,
          this.token2.address,
          duration,
          opts,
        );
        this.swapId = Number(result.logs[0].args.swapId);

      });

      it("creates the swap", async function() {
        const result = await this.streamedSwap.executeSwap(this.swapId, recipientOpts);
        const swapObject = await this.streamedSwap.contract.methods.getSwap(this.swapId).call();
        swapObject.sender.should.be.equal(company);
        swapObject.recipient.should.be.equal(employee);
        swapObject.deposit1.should.be.bignumber.equal(salary);
        swapObject.deposit2.should.be.bignumber.equal(salary);
        swapObject.tokenAddress1.should.be.equal(this.token1.address);
        swapObject.tokenAddress2.should.be.equal(this.token2.address);
        
        const stopTime = new BigNumber(swapObject.stopTime)
        const startTime = new BigNumber(swapObject.startTime)
        stopTime.minus(startTime).should.be.bignumber.equal(duration);
      });

      it("transfers the tokens to the contract", async function() {
        const balance = await this.token2.balanceOf(employee);
        await this.streamedSwap.executeSwap(this.swapId, recipientOpts);
        const newBalance = await this.token2.balanceOf(employee);
        newBalance.should.be.bignumber.equal(balance.minus(salary));
      });

      it("emits a SwapCreation event", async function() {
        const result = await this.streamedSwap.executeSwap(this.swapId, recipientOpts);
        truffleAssert.eventEmitted(result, "SwapCreation");
      });
    });

    // describe("when the swap contract does not have enough allowance", function() {
    //   const employee = bob;
    //   const duration = STANDARD_TIME_DELTA;
    //   const recipientOpts = { from: employee }


    //   beforeEach(async function() {
    //     await this.token1.approve(this.swapProposer.address, STANDARD_SALARY.minus(5).toString(10), opts);
    //     await this.token2.approve(this.swapExecutor.address, STANDARD_SALARY.minus(5).toString(10), recipientOpts);
    //   });

    //   describe("when the company has enough tokens", function() {
    //     const salary = STANDARD_SALARY.toString(10);
        

    //     it("reverts", async function() {
    //       const result = await this.swapProposer.proposeSwap(
    //         employee,
    //         salary,
    //         salary,
    //         this.token1.address,
    //         this.token2.address,
    //         duration,
    //         opts,
    //       );
    //       this.swapId = Number(result.logs[0].args.swapId);

    //       await truffleAssert.reverts(
    //         this.swapExecutor.executeSwap(
    //           employee,
    //           salary,
    //           salary,
    //           this.token1.address,
    //           this.token2.address,
    //           duration,
    //           opts,
    //         ),
    //         truffleAssert.ErrorType.REVERT,
    //       );
    //     });
    //   });

    //   describe("when the company does not have enough tokens", function() {
    //     const salary = STANDARD_SALARY.multipliedBy(2).toString(10);

    //     it("reverts", async function() {
    //       const result = await this.swapProposer.proposeSwap(
    //         employee,
    //         salary,
    //         salary,
    //         this.token1.address,
    //         this.token2.address,
    //         duration,
    //         opts,
    //       );
    //       this.swapId = Number(result.logs[0].args.swapId);
    //       await truffleAssert.reverts(
    //         this.streamedSwap.createSwap(
    //           employee,
    //           salary,
    //           salary,
    //           this.token1.address,
    //           this.token2.address,
    //           duration,
    //           opts,
    //         ),
    //         truffleAssert.ErrorType.REVERT,
    //       );
    //     });
    //   });
    // });
  });

  // describe("when the token contract is not erc20", function() {
  //   const employee = bob;
  //   const salary = STANDARD_SALARY.toString(10);
  //   const startTime = now.plus(STANDARD_TIME_OFFSET);
  //   const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  //   describe("when the token contract is non-compliant", function() {
  //     beforeEach(async function() {
  //       await this.nonStandardERC20Token.nonStandardApprove(this.swapProposer.address, salary, opts);
  //       await this.token2.approve(this.streamedSwap.address, salary, {from: employee});
  //     });

  //     it("reverts", async function() {
  //       await truffleAssert.reverts(
  //         this.streamedSwap.createSwap(
  //           employee,
  //           salary,
  //           salary,
  //           this.nonStandardERC20Token.address,
  //           this.token2.address,
  //           startTime,
  //           stopTime,
  //           opts,
  //         ),
  //         truffleAssert.ErrorType.REVERT,
  //       );
  //     });
  //   });

  //   describe("when the token contract is the zero address", function() {
  //     it("reverts", async function() {
  //       await truffleAssert.reverts(
  //         this.streamedSwap.createSwap(employee, salary, salary, ZERO_ADDRESS, ZERO_ADDRESS, startTime, stopTime, opts),
  //         truffleAssert.ErrorType.REVERT,
  //       );
  //     });
  //   });
  // });
}

module.exports = shouldBehaveLikeExecuteSwap;
