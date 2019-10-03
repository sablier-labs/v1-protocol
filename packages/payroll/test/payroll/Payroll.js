const { devConstants } = require("@sablier/dev-utils");
const { shouldBehaveLikePayroll } = require("./Payroll.behavior");

const CERC20Mock = artifacts.require("./CERC20Mock.sol");
const CTokenManager = artifacts.require("./CTokenManager.sol");
const ERC20Mock = artifacts.require("./ERC20Mock.sol");
const NonStandardERC20 = artifacts.require("./NonStandardERC20.sol");
const Payroll = artifacts.require("./Payroll.sol");
const Sablier = artifacts.require("./Sablier.sol");

CERC20Mock.numberFormat = "BigNumber";
CTokenManager.numberFormat = "BigNumber";
ERC20Mock.numberFormat = "BigNumber";
NonStandardERC20.numberFormat = "BigNumber";
Payroll.numberFormat = "BigNumber";
Sablier.numberFormat = "BigNumber";

const { INITIAL_EXCHANGE_RATE, STANDARD_SALARY } = devConstants;

contract("Payroll", function([alice, bob, carol, eve]) {
  beforeEach(async function() {
    const opts = { from: alice };
    this.token = await ERC20Mock.new(opts);
    await this.token.mint(alice, STANDARD_SALARY.multipliedBy(3).toString(10), opts);

    const cTokenDecimals = 8;
    this.cToken = await CERC20Mock.new(this.token.address, INITIAL_EXCHANGE_RATE.toString(10), cTokenDecimals, opts);
    await this.token.approve(this.cToken.address, STANDARD_SALARY.toString(10), opts);
    await this.cToken.mint(STANDARD_SALARY.toString(10), opts);

    this.nonStandardERC20Token = await NonStandardERC20.new(opts);
    this.nonStandardERC20Token.nonStandardMint(alice, STANDARD_SALARY.toString(10), opts);

    this.cTokenManager = await CTokenManager.new(opts);
    this.sablier = await Sablier.new(this.cTokenManager.address, opts);
    this.payroll = await Payroll.new(opts);

    // See https://github.com/trufflesuite/truffle/issues/737#issuecomment-454892913
    const ownerAddress = alice;
    const signerAddress = alice;
    const sablierAddress = this.sablier.address;
    await this.payroll.methods["initialize(address,address,address)"](
      ownerAddress,
      signerAddress,
      sablierAddress,
      opts,
    );
  });

  shouldBehaveLikePayroll(alice, bob, carol, eve);
});
