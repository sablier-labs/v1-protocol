const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikeStreamedSwap } = require("./StreamedSwap.behaviour");

const CTokenManager = artifacts.require("./CTokenManager.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");
const StreamedSwap = artifacts.require("./StreamedSwap.sol");
const Sablier = artifacts.require("./Sablier.sol");

CTokenManager.numberFormat = "BigNumber";
ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";
StreamedSwap.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { INITIAL_EXCHANGE_RATE, STANDARD_SALARY } = devConstants;

contract("StreamedSwap", function([alice, bob, carol, eve]) {
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

    this.streamedSwap = await StreamedSwap.new(this.sablier.address, opts);
  });

  shouldBehaveLikeStreamedSwap(alice, bob, carol, eve);
});
