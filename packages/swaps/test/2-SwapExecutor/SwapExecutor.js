const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikeSwapExecutor } = require("./SwapExecutor.behavior");

const CTokenManager = artifacts.require("./CTokenManager.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");
const SwapProposer = artifacts.require("./SwapProposer.sol");
const SwapExecutor = artifacts.require("./SwapExecutor.sol");
const Sablier = artifacts.require("./Sablier.sol");

CTokenManager.numberFormat = "BigNumber";
ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";
SwapProposer.numberFormat = "BigNumber";
SwapExecutor.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { INITIAL_EXCHANGE_RATE, STANDARD_SALARY } = devConstants;

contract("SwapExecutor", function([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token1 = await ERC20Mock.new(opts);
    await this.token1.mint(alice, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    this.token2 = await ERC20Mock.new(opts);
    await this.token2.mint(bob, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    this.nonStandardERC20Token = await NonStandardERC20.new(opts);
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10), opts);

    this.cTokenManager = await CTokenManager.new(opts);
    this.sablier = await Sablier.new(this.cTokenManager.address, opts);

    // Hacky incorrect address in SwapProposer. It should point at a SwapExecutor
    this.swapProposer = await SwapProposer.new(carol, opts);
    this.swapExecutor = await SwapExecutor.new(this.sablier.address, this.swapProposer.address, opts);
  });

  shouldBehaveLikeSwapExecutor(alice, bob, carol, eve);
});
