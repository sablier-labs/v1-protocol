import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import ReactGA from "react-ga";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { isAddress } from "web3-utils";
import { push as routerPush } from "connected-react-router";
import { withApollo } from "react-apollo";
import { withTranslation } from "react-i18next";

import DashedLine from "../../components/DashedLine";
import FaExclamationMark from "../../assets/images/fa-exclamation-mark.svg";
import InputWithCurrencySuffix from "./InputWithCurrencySuffix";
import IntervalPanel from "./IntervalPanel";
import PrimaryButton from "../../components/PrimaryButton";
import SablierABI from "../../abi/sablier";
import SablierDateTime from "./DateTime";
import TokenApprovalModal from "../../components/TokenApprovalModal";
import TokenPanel from "../../components/TokenPanel";

import { ACCEPTED_TOKENS, DEFAULT_TOKEN_SYMBOL } from "../../constants/addresses";
import {
  addPendingTx as web3AddPendingTx,
  selectors as web3Selectors,
  watchApprovals as web3WatchApprovals,
  watchBalance as web3WatchBalance,
} from "../../redux/ducks/web3connect";
import { formatDuration, roundToDecimalPoints } from "../../helpers/format-utils";
import { GET_LAST_RAW_STREAM } from "../../apollo/subscriptions";
import { getMinStartTime, getMinutesForInterval, isDayJs, isIntervalShorterThanADay } from "../../helpers/time-utils";
import { MAINNET_BLOCK_TIME_AVERAGE, INTERVAL_MINUTES, INTERVALS } from "../../constants/time";

import "./pay-with-sablier.scss";

const initialState = {
  deposit: 0,
  duration: 0,
  interval: "",
  minTime: undefined,
  payment: null,
  paymentLabel: "",
  recipient: "",
  tokenAddress: "",
  tokenSymbol: DEFAULT_TOKEN_SYMBOL,
  showTokenApprovalModal: false,
  startTime: undefined,
  stopTime: undefined,
  submitted: false,
  submissionError: "",
};
class PayWithSablier extends Component {
  constructor(props) {
    super(props);

    this.state = { ...initialState };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { account, isConnected, sablierAddress, tokenAddresses, watchBalance, watchApprovals } = nextProps;
    const { tokenAddress, tokenSymbol } = prevState;

    const defaultTokenAddress = tokenAddresses.addresses.find((address) => address[0] === DEFAULT_TOKEN_SYMBOL)[1];
    const minTime = prevState.minTime || getMinStartTime();
    const startTime = prevState.startTime || minTime;

    if (!isConnected) {
      return prevState;
    }

    if (isAddress(account)) {
      watchBalance({ balanceOf: account, tokenAddress: defaultTokenAddress });
      watchApprovals({ spender: sablierAddress, tokenAddress: defaultTokenAddress, tokenOwner: account });
    }

    if (
      (defaultTokenAddress !== tokenAddress && tokenSymbol === DEFAULT_TOKEN_SYMBOL) ||
      minTime !== prevState.minTime ||
      startTime !== prevState.startTime
    ) {
      return { minTime, startTime, tokenAddress: defaultTokenAddress };
    }

    return prevState;
  }

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  static getBlockDeltaForInterval(interval) {
    const minutes = getMinutesForInterval(interval);
    const blockTimeAverageMinutes = MAINNET_BLOCK_TIME_AVERAGE.dividedBy(BN(60));
    return minutes.dividedBy(blockTimeAverageMinutes);
  }

  onChangePayment(value, label) {
    this.setState({ payment: value, paymentLabel: label }, () => this.recalcState());
  }

  onChangeState(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  onSelectTokenAddress(tokenAddress) {
    const { account, sablierAddress, tokenAddressesToSymbols, watchBalance, watchApprovals } = this.props;
    watchBalance({ balanceOf: account, tokenAddress });
    watchApprovals({ spender: sablierAddress, tokenAddress, tokenOwner: account });
    const tokenSymbol = tokenAddressesToSymbols[tokenAddress];
    this.setState({ tokenAddress, tokenSymbol });
  }

  async onSubmit() {
    const { account, addPendingTx, balances, sablierAddress, t, web3 } = this.props;
    const { interval, payment, recipient, tokenAddress } = this.state;

    if (
      this.isTokenInvalid() ||
      this.isPaymentInvalid() ||
      this.isIntervalInvalid() ||
      this.isTimesInvalid() ||
      this.isRecipientInvalid() ||
      this.isDepositInvalid()
    ) {
      return;
    }

    if (this.isUnapproved()) {
      this.setState({ showTokenApprovalModal: true });
      return;
    }

    if (!balances || !balances[tokenAddress]) {
      this.handleError(new Error(t("errors.default")));
      return;
    }

    const { startBlock, stopBlock } = this.getStartAndStopBlock();
    const { decimals } = balances[tokenAddress][account];
    const adjustedPayment = new BN(payment).multipliedBy(10 ** decimals).toFixed(0);
    const intervalInBlocks = this.getBlockDeltaForInterval(interval)
      .toNumber()
      .toFixed(0);

    let gasPrice = "8000000000";
    try {
      gasPrice = await web3.eth.getGasPrice();
      gasPrice = BN(gasPrice || "0")
        .plus(BN("1000000000"))
        .toString();
      // eslint-disable-next-line no-empty
    } catch {}
    new web3.eth.Contract(SablierABI, sablierAddress).methods
      .createStream(account, recipient, tokenAddress, startBlock, stopBlock, adjustedPayment, intervalInBlocks)
      .send({ from: account, gasPrice })
      .once("transactionHash", (transactionHash) => {
        addPendingTx(transactionHash);
        this.subscribeToRawStreamId();
      })
      .once("error", (err) => {
        this.handleError(err);
      });
  }

  getBlockDeltaFromNow(time) {
    const { block } = this.props;
    const now = block.timestamp.unix();
    const delta = Math.abs(time.subtract(now, "second").unix());
    const deltaInBlocks = BN(delta).dividedBy(MAINNET_BLOCK_TIME_AVERAGE);
    return BN(block.number.plus(deltaInBlocks).toFixed(0));
  }

  getStartAndStopBlock() {
    const { interval, startTime, stopTime } = this.state;
    const startBlock = this.getBlockDeltaFromNow(startTime);
    const intervalInBlocks = PayWithSablier.getBlockDeltaForInterval(interval);
    const intervalCount = BN(stopTime.subtract(startTime.unix(), "second").unix()) // get unix delta
      .dividedBy(60) // get minutes
      .dividedBy(getMinutesForInterval(interval)); // get count of intervals
    const stopBlock = BN(startBlock.plus(intervalInBlocks.multipliedBy(intervalCount)).toFixed(0));
    return {
      startBlock: startBlock.toNumber(),
      stopBlock: stopBlock.toNumber(),
    };
  }

  handleError(err) {
    const { t } = this.props;
    this.setState({ submitted: false, submissionError: err.toString() || t("error") });
  }

  isDepositInvalid() {
    const { web3 } = this.props;
    const { deposit, interval, payment, recipient, startTime, stopTime, tokenAddress } = this.state;

    if (
      !tokenAddress ||
      !payment ||
      interval === 0 ||
      !isDayJs(startTime) ||
      !isDayJs(stopTime) ||
      !web3.utils.isAddress(recipient) ||
      !deposit
    ) {
      return true;
    }
    return false;
  }

  isUnapproved() {
    const { account, sablierAddress, selectors } = this.props;
    const { deposit, tokenAddress } = this.state;

    if (!tokenAddress || tokenAddress === "ETH") {
      return false;
    }

    const { value: allowance, decimals } = selectors().getApprovals(tokenAddress, account, sablierAddress);
    const depositBN = new BN(deposit).multipliedBy(10 ** decimals);
    if (allowance.isGreaterThan(depositBN)) {
      return false;
    }

    return true;
  }

  recalcDeposit() {
    const { duration, interval, payment, startTime, stopTime, tokenAddress } = this.state;
    if (interval && payment && tokenAddress && isDayJs(startTime) && isDayJs(stopTime)) {
      const minutes = INTERVAL_MINUTES[interval];
      const deposit = roundToDecimalPoints((duration / minutes) * payment, 3);
      this.setState({ deposit });
    }
  }

  // We enforce a minimum interval of 60 mins because Sablier streams work by scheduling a starting
  // block that is always in the future. If the Ethereum transaction is not processed in timely manner
  // by miners or the user simply is in idle mode for too long, the stream will be rejected because the
  // Ethereum network's current block number is higher than the a priori set value.
  recalcState() {
    const { interval, payment, startTime, stopTime: previousStopTime, tokenAddress } = this.state;

    let stopTime = previousStopTime;
    let duration = 0;
    if (isDayJs(previousStopTime)) {
      if (!isIntervalShorterThanADay(interval)) {
        const startTimeH = startTime.hour();
        const startTimeM = startTime.minute();
        stopTime = previousStopTime.hour(startTimeH).minute(startTimeM);
      }
      const startTimeUnix = startTime.unix();
      const stopTimeUnix = stopTime.unix();
      duration = Math.max((stopTimeUnix - startTimeUnix) / 60, 0);
    }

    let deposit = 0;
    if (interval && payment && tokenAddress && isDayJs(startTime) && isDayJs(stopTime)) {
      const paymentValue = Math.max(payment, 0);
      const minutes = INTERVAL_MINUTES[interval];
      deposit = roundToDecimalPoints((duration / minutes) * paymentValue, 3);
    }

    this.setState({ deposit, duration, startTime, stopTime });
  }

  resetState() {
    this.setState(initialState);
  }

  subscribeToRawStreamId() {
    const { account, block, client, push, t } = this.props;

    // eslint-disable-next-line max-len
    // @see https://stackoverflow.com/questions/45113394/how-do-i-create-a-graphql-subscription-with-apollo-client-in-vanilla-js
    this.subscriptionObserver = client
      .subscribe({
        query: GET_LAST_RAW_STREAM,
        variables: { blockNumber: block.number.toNumber(), sender: account.toLowerCase() },
      })
      .subscribe({
        next({ data }) {
          if (data && data.rawStreams) {
            push(`/stream/${data.rawStreams[0].id}`);
          }
        },
        error(_err) {
          this.setState({
            submitted: false,
            submissionError: t("error"),
          });
        },
      });
  }

  isTokenInvalid() {
    const { t } = this.props;
    const { tokenSymbol } = this.state;

    if (!ACCEPTED_TOKENS.includes(tokenSymbol)) {
      return t("errors.tokenNotAccepted");
    }

    return false;
  }

  isPaymentInvalid() {
    const { account, balances, t } = this.props;
    const { deposit, payment, paymentLabel, submitted, tokenAddress, tokenSymbol } = this.state;

    const paymentStr = paymentLabel.replace(" ", "").replace(tokenSymbol, "");
    const parts = paymentStr.split(".");

    if (parts.length < 2) {
      if (payment < 0) {
        return t("errors.paymentZero");
      }
    } else {
      // Disallow 0 values and more than 3 decimal points
      if (paymentStr.startsWith("0.0") && paymentStr % 1 === 0) {
        return t("errors.paymentZero");
      }
      if (parts[1].length > 3) {
        return t("errors.paymentDecimals");
      }
    }

    if (balances && balances[tokenAddress] && balances[tokenAddress][account]) {
      const { decimals, value } = balances[tokenAddress][account];
      const depositBN = new BN(deposit).multipliedBy(10 ** decimals);

      if (depositBN.isGreaterThan(balances[tokenAddress][account].value)) {
        return t("errors.paymentInsufficientBalance", {
          balance: roundToDecimalPoints(value.dividedBy(10 ** decimals), 2),
          tokenSymbol,
        });
      }
    }

    if (submitted && !payment && !paymentLabel) {
      return t("errors.paymentInvalid");
    }

    return false;
  }

  isIntervalInvalid() {
    const { t } = this.props;
    const { interval, submitted } = this.state;

    if (!submitted && !interval) {
      return false;
    }

    if (!Object.keys(INTERVALS).includes(interval)) {
      return t("errors.intervalInvalid");
    }

    return false;
  }

  isTimesInvalid() {
    const { t } = this.props;
    const { duration, interval, startTime, stopTime, submitted } = this.state;

    if (submitted && !isDayJs(stopTime)) {
      return t("errors.stopTimeInvalid");
    }

    if (isDayJs(startTime) && isDayJs(stopTime)) {
      if (stopTime.isBefore(startTime)) {
        return t("errors.stopTimeLowerThanStartTime");
      }
    }

    const minutes = getMinutesForInterval(interval).toNumber();
    if (duration && duration < minutes) {
      return t("errors.durationLowerThanInterval");
    }

    return false;
  }

  isRecipientInvalid() {
    const { account, t, web3 } = this.props;
    const { recipient, submitted } = this.state;

    if (!submitted && !recipient) {
      return false;
    }

    if (!web3.utils.isAddress(recipient)) {
      return t("errors.recipientInvalid");
    }
    if (account === recipient) {
      return t("errors.recipientSelf");
    }

    return false;
  }

  renderTokenError() {
    const error = this.isTokenInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderToken() {
    const { t } = this.props;
    const { tokenAddress, tokenSymbol } = this.state;

    return (
      <div className="pay-with-sablier__form-item" style={{ marginTop: "0" }}>
        <label className="pay-with-sablier__form-item-label" htmlFor="token">
          {t("input.token")}
        </label>
        {this.renderTokenError()}
        <TokenPanel
          onSelectTokenAddress={(selectedTokenAddress) => this.onSelectTokenAddress(selectedTokenAddress)}
          selectedTokens={[tokenAddress]}
          selectedTokenAddress={tokenAddress}
          tokenSymbol={tokenSymbol}
        />
      </div>
    );
  }

  renderTimesError() {
    const error = this.isTimesInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderTimes() {
    const { t } = this.props;
    const { interval, minTime, startTime, stopTime } = this.state;

    const minutes = getMinutesForInterval(interval).toNumber();
    const stopTimeMinTime = isDayJs(startTime)
      ? startTime.add(Math.max(minutes, INTERVAL_MINUTES.hour), "minute")
      : startTime;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="startTime">
          {t("input.times")}
        </label>
        {this.renderTimesError()}
        <div className="pay-with-sablier__horizontal-container">
          <SablierDateTime
            className={classnames("pay-with-sablier__input-container-halved")}
            inputClassName={classnames("pay-with-sablier__input", {
              "pay-with-sablier__input--invalid": this.isTimesInvalid(),
            })}
            interval={interval}
            minTime={minTime}
            maxTime={stopTime}
            name="startTime"
            onSelectTime={(selectedStartTime) =>
              this.setState({ startTime: selectedStartTime }, () => this.recalcState())
            }
            placeholder={t("startTime")}
            selectedTime={startTime}
          />
          <SablierDateTime
            className={classnames("pay-with-sablier__input-container-halved")}
            inputClassName={classnames("pay-with-sablier__input", {
              "pay-with-sablier__input--invalid": this.isTimesInvalid(),
            })}
            interval={interval}
            minTime={stopTimeMinTime}
            name="stopTime"
            onSelectTime={(selectedStopTime) => this.setState({ stopTime: selectedStopTime }, () => this.recalcState())}
            placeholder={t("stopTime")}
            selectedTime={stopTime}
          />
        </div>
      </div>
    );
  }

  renderRateError() {
    const error = this.isPaymentInvalid() || this.isIntervalInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderRate() {
    const { t } = this.props;
    const { interval, tokenSymbol } = this.state;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="payment">
          {t("input.rate")}
        </label>
        {this.renderRateError(t)}
        <div className="pay-with-sablier__horizontal-container">
          <div className="pay-with-sablier__input-container-halved">
            <InputWithCurrencySuffix
              className={classnames("pay-with-sablier__input", {
                "pay-with-sablier__input--invalid": this.isPaymentInvalid(),
              })}
              id="payment"
              name="payment"
              onChange={(value, label) => this.onChangePayment(value, label)}
              suffix={tokenSymbol}
              type="text"
            />
          </div>
          <span className="pay-with-sablier__horizontal-container__separator">{t("per")}</span>
          <IntervalPanel
            className={classnames("pay-with-sablier__input-container-halved", {
              "pay-with-sablier__input--invalid": this.isIntervalInvalid(),
            })}
            interval={interval}
            onSelectInterval={(selectedInterval) =>
              this.setState({ interval: selectedInterval }, () => this.recalcState())
            }
          />
        </div>
      </div>
    );
  }

  renderRecipientError() {
    const error = this.isRecipientInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderRecipient() {
    const { t } = this.props;
    const { recipient } = this.state;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="recipient">
          {t("input.recipient")}
        </label>
        {this.renderRecipientError()}
        <div className={classnames("pay-with-sablier__input-container")}>
          <input
            className={classnames("pay-with-sablier__input", {
              "pay-with-sablier__input--invalid": this.isRecipientInvalid(),
            })}
            id="recipient"
            name="recipient"
            onChange={this.onChangeState.bind(this)}
            placeholder="0x..."
            spellCheck={false}
            type="string"
            value={recipient}
          />
        </div>
      </div>
    );
  }

  renderForm() {
    return (
      <div className="pay-with-sablier__form">
        {this.renderToken()}
        {this.renderRate()}
        {this.renderTimes()}
        {this.renderRecipient()}
      </div>
    );
  }

  renderReceipt() {
    const { hasPendingTransactions, t } = this.props;
    const { deposit, duration, submitted, submissionError, tokenSymbol } = this.state;

    const isDepositInvalid = this.isDepositInvalid();
    return (
      <div className="pay-with-sablier__receipt">
        <span className="pay-with-sablier__receipt__top-label">{t("depositing")}</span>
        <span className="pay-with-sablier__receipt__deposit-label">
          {deposit.toLocaleString() || "0"} {tokenSymbol}
        </span>
        <DashedLine
          className="pay-with-sablier__receipt__dashed-line"
          leftLabel={t("duration")}
          rightLabel={formatDuration(t, duration)}
          style={{ marginTop: "24px" }}
        />
        <DashedLine className="pay-with-sablier__receipt__dashed-line" leftLabel={t("ourFee")} rightLabel={t("none")} />
        <PrimaryButton
          className={classnames([
            "pay-with-sablier__button",
            "pay-with-sablier__receipt__warning-button",
            "primary-button--white",
          ])}
          disabled
          icon={FaExclamationMark}
          label={t("betaWarning")}
          labelClassName={classnames("primary-button__label--black")}
          onClick={() => {}}
        />
        <PrimaryButton
          className={classnames("pay-with-sablier__button", "pay-with-sablier__receipt__deposit-button")}
          disabled={isDepositInvalid}
          label={t("streamMoney")}
          loading={hasPendingTransactions && submitted}
          onClick={() =>
            this.setState(
              {
                submitted: true,
                submissionError: "",
              },
              () => this.onSubmit(),
            )
          }
        />
        <div
          className={classnames("pay-with-sablier__receipt__deposit-error-label", {
            // eslint-disable-next-line no-unneeded-ternary
            "pay-with-sablier__error-label": submissionError ? true : false,
          })}
        >
          {submissionError || ""}
        </div>
      </div>
    );
  }

  renderTokenApprovalModal() {
    const { account } = this.props;
    const { showTokenApprovalModal, tokenAddress, tokenSymbol } = this.state;

    if (!showTokenApprovalModal) {
      return null;
    }

    return (
      <TokenApprovalModal
        account={account}
        onApproveTokenSuccess={() => this.setState({ showTokenApprovalModal: false })}
        onClose={() => this.setState({ showTokenApprovalModal: false })}
        tokenAddress={tokenAddress}
        tokenSymbol={tokenSymbol}
      />
    );
  }

  render() {
    return (
      <div className="pay-with-sablier">
        {this.renderForm()}
        {this.renderReceipt()}
        {this.renderTokenApprovalModal()}
      </div>
    );
  }
}

PayWithSablier.propTypes = {
  account: PropTypes.string,
  addPendingTx: PropTypes.func.isRequired,
  balances: PropTypes.shape({}).isRequired,
  block: PropTypes.shape({
    number: PropTypes.object.isRequired,
    timestamp: PropTypes.object.isRequired,
  }),
  client: PropTypes.shape({
    subscribe: PropTypes.func.isRequired,
  }).isRequired,
  hasPendingTransactions: PropTypes.bool,
  isConnected: PropTypes.bool.isRequired,
  push: PropTypes.func.isRequired,
  sablierAddress: PropTypes.string,
  selectors: PropTypes.func.isRequired,
  t: PropTypes.shape({}),
  tokenAddresses: PropTypes.shape({
    addresses: PropTypes.array.isRequired,
  }).isRequired,
  tokenAddressesToSymbols: PropTypes.shape({}).isRequired,
  watchApprovals: PropTypes.func.isRequired,
  watchBalance: PropTypes.func.isRequired,
  web3: PropTypes.shape({
    eth: PropTypes.shape({
      Contract: PropTypes.func.isRequired,
      getGasPrice: PropTypes.func.isRequired,
    }),
    utils: PropTypes.shape({
      isAddress: PropTypes.func.isRequired,
    }),
  }).isRequired,
};

PayWithSablier.defaultProps = {
  account: "",
  block: {},
  hasPendingTransactions: false,
  sablierAddress: "",
  t: {},
};

export default connect(
  (state) => ({
    account: state.web3connect.account,
    addresses: state.addresses,
    balances: state.web3connect.balances,
    block: state.web3connect.block,
    hasPendingTransactions: !!state.web3connect.transactions.pending.length,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    sablierAddress: state.addresses.sablierAddress,
    tokenAddresses: state.addresses.tokenAddresses,
    tokenAddressesToSymbols: state.addresses.tokenAddressesToSymbols,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (id) => dispatch(web3AddPendingTx(id)),
    push: (path) => dispatch(routerPush(path)),
    selectors: () => dispatch(web3Selectors()),
    watchApprovals: ({ spender, tokenAddress, tokenOwner }) =>
      dispatch(web3WatchApprovals({ spender, tokenAddress, tokenOwner })),
    watchBalance: ({ balanceOf, tokenAddress }) => dispatch(web3WatchBalance({ balanceOf, tokenAddress })),
  }),
)(withTranslation()(withApollo(PayWithSablier)));
