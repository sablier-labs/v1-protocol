const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikeSwapProposer } = require("./SwapProposer.behaviour");

const SwapProposer = artifacts.require("./SwapProposer.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");

SwapProposer.numberFormat = "BigNumber";
ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";

const { STANDARD_SALARY } = devConstants;

contract("SwapProposer", function([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token1 = await ERC20Mock.new(opts);
    await this.token1.mint(alice, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    this.token2 = await ERC20Mock.new(opts);
    await this.token2.mint(bob, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    this.nonStandardERC20Token = await NonStandardERC20.new(opts);
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10), opts);

    // We don't need a proper SwapExecutor, just give approvals to carol
    this.swapProposer = await SwapProposer.new(carol, opts);
  });

  shouldBehaveLikeSwapProposer(alice, bob, carol, eve);
});
