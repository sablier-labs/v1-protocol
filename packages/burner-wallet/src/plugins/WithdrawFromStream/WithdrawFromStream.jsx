/* eslint-disable react/sort-comp */
import React, { Component } from "react";
import MediaQuery from "react-responsive";

import { utils } from "ethers";

import Loader from "../../components/Loader/Loader";
import SablierABI from "../../abis/Sablier";
import Watcher from "../../components/Watcher/Watcher";

import "./WithdrawFromStream.scss";

const SABLIER_CONTRACT_ADDRESS = "0xE46AE47F2A81A571E234C0Acb5717D0653F22b30";

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

  componentDidMount() {
    if (this.state.loading) {
      this.fetchStream();
    }
  }

  componentDidUpdate(oldProps) {
    if (this.state.loading || oldProps.defaultAccount !== this.props.defaultAccount) {
      this.fetchStream();
    }
  }

  componentWillUnmount() {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
    }
  }

  async fetchStream() {
    const { defaultAccount, match, plugin } = this.props;
    let streamId = localStorage.getItem("streamId");

    try {
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
        throw new Error("Stream id not provided");
      }

      const web3 = plugin.getWeb3();
      const sablier = new web3.eth.Contract(SablierABI, SABLIER_CONTRACT_ADDRESS);
      const stream = await sablier.methods.getStream(streamId).call();

      /* It's possible that the given stream id does not point to any valid stream */
      if (isUndefined(stream)) {
        throw new Error("Stream not found");
      }

      /* Don't let others see your money */
      if (stream.recipient !== defaultAccount) {
        throw new Error("Stream recipient not the same with the default account");
      }

      const withdrawn = stream.deposit.sub(stream.remainingBalance);
      const balance = await sablier.methods.balanceOf(streamId, stream.recipient).call();
      if (isUndefined(balance)) {
        throw new Error("Error reading the balance of the stream");
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
        stream,
        streamed,
        withdrawn,
      });
    } catch (err) {
      console.error(err);
    } finally {
      this.setState({ loading: false });
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
    const sablier = new web3.eth.Contract(SablierABI, SABLIER_CONTRACT_ADDRESS);
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
