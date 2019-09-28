// import React from "react";
// import ReactDOM from "react-dom";
// import "./index.css";
// import App from "./App";

// ReactDOM.render(<App />, document.getElementById("root"));

import React from "react";
import ReactDOM from "react-dom";
import { xdai, dai, eth } from "@burner-wallet/assets";
import BurnerCore from "@burner-wallet/core";
import { InjectedSigner, LocalSigner } from "@burner-wallet/core/signers";
import { InfuraGateway, InjectedGateway, XDaiGateway } from "@burner-wallet/core/gateways";
import Exchange from "@burner-wallet/exchange";
import { xdaiBridge, uniswapDai } from "@burner-wallet/exchange/pairs";
import BurnerUI from "@burner-wallet/ui";
import LegacyPlugin from "@burner-wallet/plugins/legacy";

const core = new BurnerCore({
  signers: [new InjectedSigner(), new LocalSigner()],
  gateways: [new InjectedGateway(), new InfuraGateway(process.env.REACT_APP_INFURA_KEY), new XDaiGateway()],
  assets: [xdai, dai, eth],
});

const exchange = new Exchange({
  pairs: [xdaiBridge, uniswapDai],
});

const BurnerWallet = () => <BurnerUI core={core} plugins={[exchange, new LegacyPlugin()]} />;

ReactDOM.render(<BurnerWallet />, document.getElementById("root"));
