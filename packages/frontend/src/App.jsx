import React, { Component } from "react";

import { connect } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import { Redirect } from "react-router-dom";
import { Route, Switch } from "react-router";
import { withTranslation } from "react-i18next";

import Dashboard from "./pages/Dashboard";
import FaBan from "./assets/images/fa-ban.svg";
import Header from "./components/Header";
import MediaQuery from "react-responsive";
import NetworkModal from "./components/NetworkModal";
import PayWithSablier from "./pages/PayWithSablier";
import Stream from "./pages/Stream";
import WalletModal from "./components/WalletModal";

import { history } from "./redux/store";
import { setAddresses } from "./redux/ducks/addresses";
import { Web3Connect, startWatching, initialize } from "./redux/ducks/web3connect";
import ModalWithImage from "./components/ModalWithImage";

class App extends Component {
  componentDidMount() {
    const { initialize, startWatching } = this.props;
    initialize().then(startWatching);
  }

  componentWillUpdate() {
    const { web3, setAddresses } = this.props;

    if (this.hasSetNetworkId || !web3 || !web3.eth || !web3.eth.net || !web3.eth.net.getId) {
      return;
    }

    web3.eth.net.getId((err, networkId) => {
      if (!err && !this.hasSetNetworkId) {
        setAddresses(networkId);
        this.hasSetNetworkId = true;
      }
    });
  }

  render() {
    const { initialized, networkId, t, web3 } = this.props;
    if (!initialized) {
      return <noscript />;
    }

    const hasSetNetworkId = this.hasSetNetworkId;
    // eslint-disable-next-line eqeqeq
    const hasCorrectNetworkId = networkId == (process.env.REACT_APP_NETWORK_ID || 1);
    return (
      <div id="app-container">
        <MediaQuery query="(min-width: 812px)">
          <Web3Connect />
          <ConnectedRouter className="app-container" history={history}>
            <Header />
            <Switch>
              <Route exact path="/" component={PayWithSablier} />
              <Route exact path="/dashboard" component={Dashboard} />
              <Route exact path="/stream/:rawStreamId?" component={Stream} />
              <Redirect exact to="/" />
            </Switch>
            {initialized && web3 && hasSetNetworkId && !hasCorrectNetworkId ? <NetworkModal /> : null}
            {initialized && !web3 ? <WalletModal /> : null}
          </ConnectedRouter>
        </MediaQuery>
        <MediaQuery query="(max-width: 812px)">
          <ModalWithImage buttonLabel={t("okay")} image={FaBan} label={t("mobileBan")} onClose={() => {}} />
        </MediaQuery>
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    initialized: state.web3connect.initialized,
    // eslint-disable-next-line eqeqeq
    networkId: state.web3connect.networkId,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    setAddresses: (networkId) => dispatch(setAddresses(networkId)),
    initialize: () => dispatch(initialize()),
    startWatching: () => dispatch(startWatching()),
  }),
)(withTranslation()(App));
