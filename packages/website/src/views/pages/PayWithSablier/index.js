import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import ReactGA from "react-ga";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { push } from "connected-react-router";
import { withTranslation } from "react-i18next";

import FaExclamationMark from "../../../assets/images/fa-exclamation-mark.svg";
import InputWithCurrencySuffix from "../../shared/InputWithCurrencySuffix";
import IntervalPanel from "./IntervalPanel";
import PrimaryButton from "../..//shared/PrimaryButton";
import SablierABI from "../../../abi/sablier";
import SablierDateTime from "./DateTime";
import TokenPanel from "../../shared/TokenPanel";

import { acceptedTokens, getDaiAddressForNetworkId, getTokenLabelForAddress } from "../../../constants/addresses";
import { addPendingTx, selectors, watchBalance } from "../../../redux/ducks/web3connect";
import { intervalMins, intervalStringValues } from "../../../constants/time";
import { formatDuration, roundToDecimalPlaces } from "../../../helpers/format-utils";
import { getMinsForInterval, intervalToBlocks, isDayJs, timeToBlockNumber } from "../../../helpers/time-utils";
import { retry } from "../../../helpers/promise-utils";

import "./pay-with-sablier.scss";

const initialState = {
  deposit: 0,
  duration: 0,
  enableDepositButton: false,
  interval: "",
  minTime: {},
  payment: null,
  paymentLabel: "",
  recipient: "0x574B4756606715Fb35f112ae8283b8a16319c895",
  token: "",
  tokenName: "DAI",
  startTime: {},
  stopTime: {},
  submitted: false,
  submittedError: "",
};
class PayWithSablier extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    balances: PropTypes.object.isRequired,
    isConnected: PropTypes.bool.isRequired,
    networkId: PropTypes.number,
    push: PropTypes.func.isRequired,
    sablierAddress: PropTypes.string,
    selectors: PropTypes.func.isRequired,
    watchBalance: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = { ...initialState };

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);

    const minTime = this.roundTime(dayjs());
    this.setState({ minTime, startTime: minTime });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { account, networkId, watchBalance } = nextProps;
    const { token, tokenName } = prevState;
    const dai = getDaiAddressForNetworkId(networkId);
    if (tokenName === "DAI" && dai !== token) {
      watchBalance({ balanceOf: account, tokenAddress: dai });
      return { token: dai };
    } else {
      return prevState;
    }
  }

  goToStream(txHash) {
    const { push } = this.props;
    push(`/stream/${txHash}`);
  }

  isUnapproved() {
    const { account, sablierAddress, selectors } = this.props;
    const { token } = this.state;
    const inputValue = 0; // TODO

    if (!token || token === "ETH") {
      return false;
    }

    const { value: allowance, label, decimals } = selectors().getApprovals(token, account, sablierAddress);

    if (label && allowance.isLessThan(BN(inputValue * 10 ** decimals || 0))) {
      return true;
    }

    return false;
  }

  onChangePayment(value, label) {
    this.setState({ payment: value, paymentLabel: label }, () => this.recalcState());
  }

  onChangeState(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  onSelectInterval(interval) {
    this.setState({ interval }, () => this.recalcState());
  }

  onSelectStartTime(startTime) {
    this.setState({ startTime }, () => this.recalcState());
  }

  onSelectStopTime(stopTime) {
    this.setState({ stopTime }, () => this.recalcState());
  }

  onSelectToken(token) {
    const { account, networkId, watchBalance } = this.props;
    const tokenName = getTokenLabelForAddress(networkId, token);

    watchBalance({ balanceOf: account, tokenAddress: token });
    this.setState({ token, tokenName });
  }

  onSubmitError(err) {
    this.setState({ submitted: false, submittedError: err.toString() });
  }

  async onSubmit() {
    const { account, addPendingTx, sablierAddress, selectors, web3 } = this.props;
    const { interval, payment, recipient, startTime, stopTime, token } = this.state;

    if (
      this.isTokenInvalid() ||
      this.isPaymentInvalid() ||
      this.isIntervalInvalid() ||
      this.isTimesInvalid() ||
      this.isRecipientInvalid()
    ) {
      return;
    }

    let startBlock = 0;
    let stopBlock = 0;
    try {
      [startBlock, stopBlock] = await retry(() => {
        return Promise.all([timeToBlockNumber(web3, startTime), timeToBlockNumber(web3, stopTime)]);
      });
    } catch (err) {
      this.onSubmitError(err);
    }

    const { decimals } = selectors().getBalance(account, token);
    const paymentWei = BN(payment)
      .multipliedBy(10 ** decimals)
      .toFixed(0);
    const intervalBlocks = intervalToBlocks(interval);

    new web3.eth.Contract(SablierABI, sablierAddress).methods
      .create(account, recipient, token, startBlock, stopBlock, paymentWei, intervalBlocks)
      .send({ from: account })
      .on("transactionHash", (transactionHash) => {
        addPendingTx(transactionHash);
      })
      .on("confirmation", (confirmationNumber, receipt) => {
        this.goToStream(receipt.transactionHash);
      })
      .on("error", (err) => {
        this.onSubmitError(err);
      });
  }

  recalcDeposit() {
    const { duration, interval, payment, startTime, stopTime, token } = this.state;
    if (interval && payment && token && isDayJs(startTime) && isDayJs(stopTime)) {
      const minutes = intervalMins[interval];
      const deposit = roundToDecimalPlaces((duration / minutes) * payment, 3);
      this.setState({ deposit });
    }
  }

  // We enforce a minimum interval of 60 mins because Sablier streams work by scheduling a starting
  // block that is always in the future. If the Ethereum transaction is not processed in timely manner
  // by miners or the user simply is in idle mode for too long, the stream will be rejected because the
  // Ethereum network's current block number is higher than the a priori set value.
  recalcState() {
    const { interval, payment, startTime, stopTime: previousStopTime, token } = this.state;

    let stopTime = previousStopTime;
    let duration = 0;
    if (isDayJs(previousStopTime)) {
      if (getMinsForInterval(interval) >= intervalMins.day) {
        const startTimeH = startTime.hour();
        const startTimeM = startTime.minute();
        stopTime = previousStopTime.hour(startTimeH).minute(startTimeM);
      }
      const startTimeUnix = startTime.unix();
      const stopTimeUnix = stopTime.unix();
      duration = Math.max((stopTimeUnix - startTimeUnix) / 60, 0);
    }

    let deposit = 0;
    if (interval && payment && token && isDayJs(startTime) && isDayJs(stopTime)) {
      const paymentValue = Math.max(payment, 0);
      const minutes = intervalMins[interval];
      deposit = roundToDecimalPlaces((duration / minutes) * paymentValue, 3);
    }

    this.setState({ deposit, duration, startTime, stopTime });
  }

  resetState() {
    this.setState(initialState);
  }

  // Round up to the closest interval, with the following caveat: we're actually offsetting ny
  // 5 mins + the interval. That is, if the current interval ends in the following 5 mins, we just
  // exclude it to avoid highly probable errors.
  roundTime(time) {
    const coefficient = 1000 * 60 * intervalMins.hour;
    let roundedTime = dayjs(Math.ceil(time.valueOf() / coefficient) * coefficient);
    if (
      dayjs()
        .add(5, "minute")
        .isAfter(roundedTime)
    ) {
      roundedTime = roundedTime.add(coefficient, "millisecond");
    }
    return roundedTime;
  }

  toggleDepositButton() {
    const { web3 } = this.props;
    const { token, interval, payment, startTime, stopTime, recipient } = this.state;

    if (
      !token ||
      !payment ||
      interval === 0 ||
      !isDayJs(startTime) ||
      !isDayJs(stopTime) ||
      !web3.utils.isAddress(recipient)
    ) {
      this.setState({ enableDepositButton: false });
    } else {
      this.setState({ enableDepositButton: true });
    }
  }

  isTokenInvalid() {
    const { t } = this.props;
    const { tokenName, submitted } = this.state;

    if (!tokenName && !submitted) {
      return false;
    }

    if (!acceptedTokens.includes(tokenName)) {
      return t("errors.tokenNotAccepted");
    }

    return false;
  }

  renderTokenError() {
    let error = this.isTokenInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderToken() {
    const { t } = this.props;
    const { token, tokenName } = this.state;

    return (
      <div className="pay-with-sablier__form-item" style={{ marginTop: "0" }}>
        <label className="pay-with-sablier__form-item-label" htmlFor="token">
          {t("input.token")}
        </label>
        {this.renderTokenError()}
        <TokenPanel
          onSelectToken={(token) => this.onSelectToken(token)}
          selectedTokens={[token]}
          selectedTokenAddress={token}
          tokenName={tokenName}
        />
      </div>
    );
  }

  isPaymentInvalid() {
    const { t } = this.props;
    const { payment, paymentLabel, submitted, tokenName } = this.state;

    if (submitted && !payment && !paymentLabel) {
      return t("errors.paymentInvalid");
    }

    const paymentStr = paymentLabel.replace(" ", "").replace(tokenName, "");
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

    return false;
  }

  isIntervalInvalid() {
    const { t } = this.props;
    const { interval, submitted } = this.state;

    if (!interval && !submitted) {
      return false;
    }

    if (!Object.keys(intervalStringValues).includes(interval)) {
      return t("errors.intervalInvalid");
    }

    return false;
  }

  renderRateError() {
    let error = this.isPaymentInvalid() || this.isIntervalInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderRate() {
    const { t } = this.props;
    const { interval, tokenName } = this.state;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="payment">
          {t("input.rate")}
        </label>
        {this.renderRateError(t)}
        <div className="pay-with-sablier__horizontal-container">
          <div className="pay-with-sablier__input-container-halved">
            <InputWithCurrencySuffix
              classNames={classnames("pay-with-sablier__input", {
                "pay-with-sablier__input--invalid": this.isPaymentInvalid(),
              })}
              id="payment"
              name="payment"
              onChange={(value, label) => this.onChangePayment(value, label)}
              suffix={tokenName}
              type="text"
            />
          </div>
          <span className="pay-with-sablier__horizontal-container__separator">{t("per")}</span>
          <IntervalPanel
            classNames={classnames("pay-with-sablier__input-container-halved", {
              "pay-with-sablier__input--invalid": this.isIntervalInvalid(),
            })}
            interval={interval}
            onSelectInterval={(interval) => this.onSelectInterval(interval)}
          />
        </div>
      </div>
    );
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

    const minutes = getMinsForInterval(interval);
    if (duration && duration < minutes) {
      return t("errors.durationLowerThanInterval");
    }

    return false;
  }

  renderTimesError() {
    let error = this.isTimesInvalid();

    if (!error) {
      return null;
    }

    return <div className="pay-with-sablier__error-label">{error}</div>;
  }

  renderTimes() {
    const { t } = this.props;
    const { interval, minTime, startTime, stopTime } = this.state;

    const minutes = getMinsForInterval(interval);
    const stopTimeMinTime = isDayJs(startTime)
      ? startTime.add(Math.max(minutes, intervalMins.hour), "minute")
      : startTime;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="startTime">
          {t("input.dates")}
        </label>
        {this.renderTimesError()}
        <div className="pay-with-sablier__horizontal-container">
          <SablierDateTime
            classNames={classnames("pay-with-sablier__input-container-halved")}
            inputClassNames={classnames("pay-with-sablier__input", {
              "pay-with-sablier__input--invalid": this.isTimesInvalid(),
            })}
            interval={interval}
            minTime={minTime}
            maxTime={stopTime}
            name="startTime"
            onSelectTime={(date) => this.onSelectStartTime(date)}
            placeholder={t("startTime")}
            selectedTime={startTime}
          />
          <SablierDateTime
            classNames={classnames("pay-with-sablier__input-container-halved")}
            inputClassNames={classnames("pay-with-sablier__input", {
              "pay-with-sablier__input--invalid": this.isTimesInvalid(),
            })}
            interval={interval}
            minTime={stopTimeMinTime}
            name="stopTime"
            onSelectTime={(date) => this.onSelectStopTime(date)}
            placeholder={t("stopTime")}
            selectedTime={stopTime}
          />
        </div>
      </div>
    );
  }

  isRecipientInvalid() {
    const { account, t, web3 } = this.props;
    const { recipient, submitted } = this.state;

    if (!recipient && !submitted) {
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

  renderRecipientError() {
    let error = this.isRecipientInvalid();

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
    const { t } = this.props;
    const { deposit, duration, enableDepositButton, submittedError, tokenName } = this.state;

    const depositLabel = deposit ? `${deposit.toLocaleString()} ${tokenName}` : `0 ${tokenName}`;

    return (
      <div className="pay-with-sablier__receipt-container">
        <span className="pay-with-sablier__receipt-top-label">{t("depositing")}</span>
        <span className="pay-with-sablier__receipt-deposit-label">{depositLabel}</span>
        <div className="pay-with-sablier__receipt-dashed-line" style={{ marginTop: "24px" }}>
          <span className="pay-with-sablier__receipt-dashed-line-left">{t("duration")}</span>
          <span className="pay-with-sablier__receipt-dashed-line-right">{formatDuration(t, duration)}</span>
        </div>
        <div className="pay-with-sablier__receipt-dashed-line">
          <span className="pay-with-sablier__receipt-dashed-line-left">{t("ourFee")}</span>
          <span className="pay-with-sablier__receipt-dashed-line-right">{t("none")}</span>
        </div>
        <PrimaryButton
          classNames={classnames([
            "pay-with-sablier__button",
            "pay-with-sablier__receipt-warning-button",
            "primary-button--white",
          ])}
          disabled={true}
          icon={FaExclamationMark}
          label={t("betaWarning")}
          labelClassNames={classnames("primary-button__label--black")}
          onClick={() => {}}
        />
        <PrimaryButton
          classNames={classnames("pay-with-sablier__button", "pay-with-sablier__receipt-deposit-button")}
          disabled={!enableDepositButton}
          label={t("streamMoney")}
          onClick={() => this.setState({ submitted: true, submittedError: "" }, () => this.onSubmit())}
        />
        <div
          className={classnames("pay-with-sablier__receipt-deposit-error-label", {
            "pay-with-sablier__error-label": submittedError ? true : false,
          })}
        >
          {submittedError || ""}
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="pay-with-sablier">
        {this.renderForm()}
        {this.renderReceipt()}
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    balances: state.web3connect.balances,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    networkId: state.web3connect.networkId,
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (id) => dispatch(addPendingTx(id)),
    push: (path) => dispatch(push(path)),
    selectors: () => dispatch(selectors()),
    watchBalance: ({ balanceOf, tokenAddress }) => dispatch(watchBalance({ balanceOf, tokenAddress })),
  }),
)(withTranslation()(PayWithSablier));
