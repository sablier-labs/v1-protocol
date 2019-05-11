import React, { Component } from "react";
import MediaQuery from "react-responsive";

import { connect } from "react-redux";
import { ConnectedRouter } from "connected-react-router";
import { Redirect } from "react-router-dom";
import { Route, Switch } from "react-router";

import Dashboard from "./pages/Dashboard";
import Header from "./components/Header";
import NetworkModal from "./components/NetworkModal";
import PayWithSablier from "./pages/PayWithSablier";
import Stream from "./pages/Stream";

import { history } from "./redux/store";
import { setAddresses } from "./redux/ducks/addresses";
import { Web3Connect, startWatching, initialize } from "./redux/ducks/web3connect";

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
    if (!this.props.initialized) {
      return <noscript />;
    }

    return (
      <div id="app-container">
        <MediaQuery query="(min-width: 768px)">
          <Header />
        </MediaQuery>
        <Web3Connect />
        <ConnectedRouter className="app-container" history={history}>
          <Switch>
            <Route exact path="/" component={PayWithSablier} />
            <Route exact path="/dashboard" component={Dashboard} />
            <Route exact path="/stream/:id?" component={Stream} />
            <Redirect exact to="/" />
          </Switch>
          <NetworkModal />
        </ConnectedRouter>
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    initialized: state.web3connect.initialized,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    setAddresses: (networkId) => dispatch(setAddresses(networkId)),
    initialize: () => dispatch(initialize()),
    startWatching: () => dispatch(startWatching()),
  }),
)(App);
