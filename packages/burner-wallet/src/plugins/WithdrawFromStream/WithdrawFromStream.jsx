/* eslint-disable max-classes-per-file */
import React, { Component } from "react";
import MediaQuery from "react-responsive";

import { utils } from "ethers";

import Config from "../../config/Config";
import Loader from "../../components/Loader/Loader";
import SablierABI from "../../abis/Sablier";
import Watcher from "../../components/Watcher/Watcher";

import "./WithdrawFromStream.scss";

function isUndefined(obj) {
  return obj === "undefined" || !obj;
}

class WithdrawFromStream extends Component {
  constructor(props) {
    super(props);

    /**
     * `balance`: the funds currently available to withdraw
     * `streamed`: how much has been streamed towards the recipient, withdrawals included
     * `withdrawn`: how much has been withdrawn so far
     */
    this.state = {
      balance: null,
      intervalId: null,
      loading: true,
      stream: null,
      streamed: null,
      withdrawn: null,
    };

    /* Let's bind the functions */
    this.onClickWithdraw = this.onClickWithdraw.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
  }

  async componentDidMount() {
    const { defaultAccount, match, plugin } = this.props;
    let streamId = localStorage.getItem("streamId");

    /**
     * If the there is no parameter and no stream id in storage, consider the stream as not found.
     * In the actual Sablier dapp, we will have a dashboard where one can see all of their streams.
     */
    if (match.params.id && match.params.id !== streamId) {
      /* If the provided stream id is not yet in storage, save it */
      localStorage.setItem("streamId", match.params.id);
      streamId = match.params.id;
    }

    /* See https://stackoverflow.com/a/19891952/3873510 */
    if (isUndefined(streamId)) {
      console.info("Stream id not provided");
      this.setState({ loading: false });
      return;
    }

    const web3 = plugin.getWeb3();
    const sablier = new web3.eth.Contract(SablierABI, Config.SABLIER_CONTRACT_ADDRESS);
    const stream = await sablier.methods.getStream(streamId).call();

    /* It's possible that the given stream id does not point to any valid stream */
    if (isUndefined(stream)) {
      console.info("Stream not found");
      this.setState({ loading: false });
      return;
    }

    /* Don't let others see your money */
    if (stream.recipient !== defaultAccount) {
      console.info("Stream recipient not the same with the default account");
      this.setState({ loading: false });
      return;
    }

    const withdrawn = stream.deposit.sub(stream.remainingBalance);
    const balance = await sablier.methods.balanceOf(streamId, stream.recipient).call();
    if (isUndefined(balance)) {
      console.error("Error reading the balance of the stream");
      return;
    }

    const streamed = balance.add(withdrawn);
    let intervalId = null;

    /**
     * Update the balance in real-time only if the stream is active. That is, the
     * current time has to be higher than the start time and lower then the stop time.
     */
    const now = utils.bigNumberify(Math.round(new Date().getTime() / 1000));
    if (now.gte(stream.startTime) && now.lte(stream.stopTime)) {
      intervalId = setInterval(this.updateBalance, 1000);
    }
    this.setState({
      balance,
      intervalId,
      loading: false,
      stream,
      streamed,
      withdrawn,
    });
  }

  componentWillUnmount() {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
    }
  }

  async onClickWithdraw() {
    const { actions, defaultAccount, plugin } = this.props;
    const { balance, stream } = this.state;
    const streamId = localStorage.getItem("streamId");

    /* This conditional statement should never result to `true`, but y'know, precaution is key */
    if (
      isUndefined(actions) ||
      isUndefined(defaultAccount) ||
      isUndefined(plugin) ||
      isUndefined(balance) ||
      isUndefined(stream)
    ) {
      return;
    }

    if (balance.isZero()) {
      // eslint-disable-next-line no-alert
      alert("There are no tokens to withdraw from this stream");
      return;
    }

    if (stream.recipient !== defaultAccount) {
      console.info("Stream recipient does not match the default account");
      return;
    }

    const web3 = plugin.getWeb3();
    const sablier = new web3.eth.Contract(SablierABI, Config.SABLIER_CONTRACT_ADDRESS);
    actions.setLoading("Withdrawing...");
    try {
      await sablier.methods.withdrawFromStream(streamId, balance).send({ from: defaultAccount });
      await actions.navigateTo("/");
    } catch (err) {
      console.error("Withdrawal failed with error ", err);
    } finally {
      actions.setLoading(null);
    }
  }

  updateBalance() {
    const { balance, stream, streamed } = this.state;
    if (isUndefined(balance) || isUndefined(stream) || isUndefined(streamed)) {
      return;
    }

    const newBalance = balance.add(stream.ratePerSecond);
    const newStreamed = streamed.add(stream.ratePerSecond);

    if (newStreamed.gte(stream.deposit)) {
      clearInterval(this.state.intervalId);
    }

    this.setState({
      balance: newBalance,
      intervalId: null,
      streamed: newStreamed,
    });
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
            <span>Stream Not Found</span>
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
          <Watcher onClickWithdraw={this.onClickWithdraw} size={450} {...data} />
        </MediaQuery>
        <MediaQuery query="(max-width: 812px)">
          <Watcher onClickWithdraw={this.onClickWithdraw} size={350} {...data} />
        </MediaQuery>
      </Page>
    );
  }
}

export default WithdrawFromStream;
