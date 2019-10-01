import React from "react";
import BurnerCore from "@burner-wallet/core";
import BurnerUI from "@burner-wallet/ui";

import { dai, eth, xdai } from "@burner-wallet/assets";
import { InjectedSigner, LocalSigner } from "@burner-wallet/core/signers";
import { InfuraGateway, InjectedGateway, XDaiGateway } from "@burner-wallet/core/gateways";

import ConfigStyle from "./config/Config.scss";
import FollowUsOnTwitter from "./plugins/FollowUsOnTwitter/FollowUsOnTwitter";
import WithdrawFromStream from "./plugins/WithdrawFromStream/WithdrawFromStream";

const core = new BurnerCore({
  signers: [new InjectedSigner(), new LocalSigner()],
  gateways: [new InjectedGateway(), new InfuraGateway(process.env.REACT_APP_INFURA_KEY), new XDaiGateway()],
  assets: [xdai, dai, eth],
});

const theme = {
  accentColor: ConfigStyle.colorSecondary,
  homeButtonColor: ConfigStyle.colorPrimary,
  paperBackground: ConfigStyle.colorBackground,
};
class WithdrawFromStreamPlugin {
  constructor() {
    this.pluginContext = null;
  }

  initializePlugin(pluginContext) {
    this.pluginContext = pluginContext;

    pluginContext.addPage("/stream/:id?", WithdrawFromStream);
    pluginContext.addHomeButton("Withdraw", "/stream");

    pluginContext.addPage("/follow-us", FollowUsOnTwitter);
    pluginContext.addHomeButton("Follow Us", "/follow-us");
  }

  getWeb3() {
    const mainnetId = "1";
    return this.pluginContext.getWeb3(mainnetId);
  }
}

function BurnerWallet() {
  return <BurnerUI core={core} plugins={[new WithdrawFromStreamPlugin()]} theme={theme} title="Sablier" />;
}

export default BurnerWallet;
