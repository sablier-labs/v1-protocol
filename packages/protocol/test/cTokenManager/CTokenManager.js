const { devConstants } = require("@sablier/dev-utils");
const shouldBehaveLikeCTokenManager = require("./CTokenManager.behavior");

const CERC20Mock = artifacts.require("./CERC20Mock.sol");
const CTokenManager = artifacts.require("./CTokenManager.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");

CERC20Mock.numberFormat = "BigNumber";
CTokenManager.numberFormat = "BigNumber";
ERC20Mock.numberFormat = "BigNumber";

const { INITIAL_EXCHANGE_RATE, STANDARD_SALARY } = devConstants;

contract("CTokenManager", function cTokenManager([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token = await ERC20Mock.new(opts);
    await this.token.mint(alice, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    const cTokenDecimals = 8;
    this.cToken = await CERC20Mock.new(this.token.address, INITIAL_EXCHANGE_RATE.toString(10), cTokenDecimals, opts);
    await this.token.approve(this.cToken.address, STANDARD_SALARY.toString(10), opts);
    await this.cToken.mint(STANDARD_SALARY.toString(10), opts);

    this.cTokenManager = await CTokenManager.new(opts);
  });

  shouldBehaveLikeCTokenManager(alice, bob, carol, eve);
});
