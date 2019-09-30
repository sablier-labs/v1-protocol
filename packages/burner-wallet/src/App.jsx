/* eslint-disable class-methods-use-this, max-classes-per-file */
import React from "react";
import BurnerCore from "@burner-wallet/core";
import BurnerUI from "@burner-wallet/ui";

import { dai, eth, xdai } from "@burner-wallet/assets";
import { InjectedSigner, LocalSigner } from "@burner-wallet/core/signers";
import { InfuraGateway, InjectedGateway, XDaiGateway } from "@burner-wallet/core/gateways";

import ConfigStyle from "./config/Config.scss";
import WithdrawFromStream from "./components/WithdrawFromStream/WithdrawFromStream";

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
  initializePlugin(pluginContext) {
    pluginContext.addPage("/withdraw-from-stream", WithdrawFromStream);
    pluginContext.addHomeButton("Withdraw from Stream", "/withdraw-from-stream");
  }
}

class FollowUsOnTwitterPlugin {
  initializePlugin(pluginContext) {
    pluginContext.addHomeButton("Follow @SablierHQ", "/follow-us");
  }
}

function BurnerWallet() {
  return (
    <BurnerUI
      core={core}
      plugins={[new WithdrawFromStreamPlugin(), new FollowUsOnTwitterPlugin()]}
      theme={theme}
      title="Sablier"
    />
  );
}

export default BurnerWallet;
