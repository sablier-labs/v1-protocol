import React, { Component } from "react";
import MediaQuery from "react-responsive";

import { connect } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import { Redirect } from "react-router-dom";
import { Route, Switch } from "react-router";
import { withTranslation } from "react-i18next";

import Dashboard from "./pages/Dashboard";
import FaBan from "./assets/images/fa-ban.svg";
import Header from "./components/Header";
import NetworkModal from "./components/NetworkModal";
import PayWithSablier from "./pages/PayWithSablier";
import Stream from "./pages/Stream";
import WalletModal from "./components/WalletModal";

import { history } from "./redux/store";
import { setAddresses as web3SetAddresses } from "./redux/ducks/addresses";
import {
  Web3Connect,
  startWatching as web3StartWatching,
  initialize as web3Initialize,
} from "./redux/ducks/web3connect";
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

  renderModals() {
    const { initialized, networkId, web3 } = this.props;
    // eslint-disable-next-line eqeqeq
    const hasCorrectNetworkId = networkId == (process.env.REACT_APP_NETWORK_ID || 1);

    if (initialized && web3 && this.hasSetNetworkId && !hasCorrectNetworkId) {
      return <NetworkModal />;
    }
    if (initialized && !web3) {
      return <WalletModal />;
    }
    return null;
  }

  render() {
    const { initialized, t } = this.props;
    if (!initialized) {
      return <noscript />;
    }

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
            {this.renderModals()}
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
    setAddresses: (networkId) => dispatch(web3SetAddresses(networkId)),
    initialize: () => dispatch(web3Initialize()),
    startWatching: () => dispatch(web3StartWatching()),
  }),
)(withTranslation()(App));
