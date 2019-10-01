/* eslint-disable max-classes-per-file */
import React, { Component } from "react";
import MediaQuery from "react-responsive";

import { utils } from "ethers";

import Config from "../../config/Config";
import Loader from "../../components/Loader/Loader";
import SablierABI from "../../abis/Sablier";
import Watcher from "../../components/Watcher/Watcher";

import "./WithdrawFromStream.scss";

class WithdrawFromStream extends Component {
  constructor(props) {
    super(props);

    this.state = {
      balance: null,
      loading: true,
      stream: null,
      streamed: null,
      withdrawn: null,
    };
  }

  async componentDidMount() {
    const { defaultAccount, match, plugin } = this.props;
    let streamId = localStorage.getItem("streamId");

    /* If the there is no parameter and no stream id in storage, return "Not Found" */
    if (match.params.id && match.params.id !== streamId) {
      /* If the provided stream id is not yet in storage, save it */
      localStorage.setItem("streamId", match.params.id);
      streamId = match.params.id;
    }

    /* See https://stackoverflow.com/a/19891952/3873510 */
    if (typeof streamId === "undefined" || !streamId) {
      console.info("Stream not found");
      this.setState({ loading: false });
      return;
    }

    const web3 = plugin.getWeb3();
    const sablier = new web3.eth.Contract(SablierABI, Config.SABLIER_CONTRACT_ADDRESS);
    const stream = await sablier.methods.getStream(streamId).call();

    /* We don't allow others to see your money */
    if (stream.recipient !== defaultAccount) {
      console.info("Stream recipient not the same with the default account");
      this.setState({ loading: false });
      return;
    }

    const withdrawn = stream.deposit.sub(stream.remainingBalance);
    const balance = await sablier.methods.balanceOf(streamId, stream.recipient).call();
    const streamed = balance.add(withdrawn);

    this.setState({
      balance,
      loading: false,
      stream,
      streamed,
      withdrawn,
    });
  }

  async onClickWithdraw() {
    const { defaultAccount, plugin } = this.props;
    const { balance, stream } = this.state;
    const streamId = localStorage.getItem("streamId");

    if (!stream || !streamId) {
      return;
    }

    const web3 = plugin.getWeb3();
    const sablier = new web3.eth.Contract(SablierABI, Config.SABLIER_CONTRACT_ADDRESS);
    const result = await sablier.methods.withdrawFromStream(streamId, balance).send({ from: defaultAccount });
    console.log({ result });
  }

  render() {
    const { burnerComponents } = this.props;
    const { Page } = burnerComponents;
    const { loading, stream, streamed, withdrawn } = this.state;

    if (loading) {
      return (
        <Page title="Withdraw">
          <div className="WithdrawFromStreamContainer">
            <Loader delay={250} />
          </div>
        </Page>
      );
    }

    if (!stream) {
      return (
        <Page title="Withdraw">
          <div className="WithdrawFromStreamContainer">
            <span>Not Found</span>
          </div>
        </Page>
      );
    }

    /* Assume the token has 18 decimals */
    const data = {
      total: Number(utils.formatUnits(stream.deposit, 18)),
      streamed: Number(utils.formatUnits(streamed, 18)),
      withdrawn: Number(utils.formatUnits(withdrawn, 18)),
    };

    return (
      <Page title="Withdraw">
        <MediaQuery query="(min-width: 812px)">
          <Watcher onClickWithdraw={() => this.onClickWithdraw()} size={450} {...data} />
        </MediaQuery>
        <MediaQuery query="(max-width: 812px)">
          <Watcher onClickWithdraw={() => this.onClickWithdraw()} size={350} {...data} />
        </MediaQuery>
      </Page>
    );
  }
}

export default WithdrawFromStream;
