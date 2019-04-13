import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import ReactGA from "react-ga";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import FaExclamationMark from "../../../assets/images/fa-exclamation-mark.svg";
import IntervalPanel from "../../shared/IntervalPanel";
import PrimaryButton from "../..//shared/PrimaryButton";
import SablierABI from "../../../abi/sablier";
import SablierDateTime from "../../shared/DateTime";
import TokenPanel from "../../shared/TokenPanel";

import { acceptedTokens, getDaiAddressForNetworkId, getTokenLabelForAddress } from "../../../constants/addresses";
import { addPendingTx, selectors } from "../../../redux/ducks/web3connect";
import { intervalMins, intervalStringValues } from "../../../constants/time";
import { formatDuration, roundToDecimalPlaces } from "../../../helpers/format-utils";
import { getMinsForIntervalKey, isDayJs, timeToBlockNumber } from "../../../helpers/time-utils";

import "./pay-with-sablier.scss";

const initialState = {
  deposit: 0,
  duration: 0,
  enableDepositButton: false,
  interval: "",
  minTime: {},
  payment: null,
  paymentLabel: "",
  recipient: "",
  token: "",
  tokenName: "DAI",
  startTime: {},
  stopTime: {},
  submitted: false,
};
class PayWithSablier extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    isConnected: PropTypes.bool.isRequired,
    networkId: PropTypes.number,
    sablierAddress: PropTypes.string,
    selectors: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = { ...initialState };

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);

    const minTime = this.roundTime(dayjs());
    this.setState({ minTime, startTime: minTime });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { networkId } = nextProps;
    const { token, tokenName } = prevState;
    const dai = getDaiAddressForNetworkId(networkId);
    if (tokenName === "DAI" && dai !== token) {
      return { token: dai };
    } else {
      return null;
    }
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

  onChangePaymentRate(e) {
    const { tokenName } = this.state;
    let paymentStr = e.target.value;
    paymentStr = paymentStr.replace(" ", "");
    paymentStr = paymentStr.replace(tokenName, "");

    if (paymentStr.startsWith("0") && /^(0|0\.(.)*)$/.test(paymentStr) === false) {
      paymentStr = "";
    }

    if (paymentStr.startsWith("-")) {
      paymentStr = "";
    }

    let paymentLabel;
    // Match only integers or float formatted like $a.$b
    // e.g. 10.50 is okay, 10.50.50 is not
    if (/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(paymentStr)) {
      paymentLabel = `${paymentStr} ${tokenName}`;
    } else {
      paymentStr = "";
      paymentLabel = "";
    }

    this.setState(
      {
        payment: parseFloat(paymentStr),
        paymentLabel: paymentLabel,
      },
      () => this.recalcState(),
    );
  }

  onChangeState(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  /**
   * @dev The backspace character needs to be handled discretionarily because we want to
   *      clear one digit from the number, not the last letter of the token label.
   */
  onKeyDownPaymentRate(e) {
    if (e.keyCode !== 8) {
      return;
    }
    e.preventDefault();
    const { tokenName } = this.state;
    let paymentStr = e.target.value;
    paymentStr = paymentStr.replace(" ", "");
    paymentStr = paymentStr.replace(tokenName, "");
    paymentStr = paymentStr.substr(0, paymentStr.length - 1);
    const paymentLabel = paymentStr ? `${paymentStr} ${tokenName}` : "";
    this.setState(
      {
        payment: parseFloat(paymentStr),
        paymentLabel,
      },
      () => this.recalcState(),
    );
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
    const { networkId } = this.props;
    const tokenName = getTokenLabelForAddress(networkId, token);

    this.setState({
      token,
      tokenName,
    });
  }

  async onSubmit() {
    console.log("Hi Mom");
    const { account, addPendingTx, sablierAddress, web3 } = this.props;
    const { deposit, interval, recipient, startTime, stopTime, token } = this.state;
    if (
      !this.isTokenInvalid() ||
      !this.isPaymentInvalid() ||
      !this.isIntervalInvalid() ||
      !this.isTimesInvalid() ||
      !this.isRecipientInvalid()
    ) {
      this.setState({ submitted: true });
      return;
    }

    console.log("Hello There");

    try {
      const { decimals } = selectors().getBalance(account, token);
      const startBlock = await timeToBlockNumber(web3, startTime);
      const stopBlock = await timeToBlockNumber(web3, stopTime);
      const payment = BN(deposit)
        .multipliedBy(10 ** decimals)
        .toFixed(0);
      const data = await new web3.eth.Contract(SablierABI, sablierAddress).methods
        .create(account, recipient, token, startBlock, stopBlock, payment, interval)
        .send({ from: account });
      addPendingTx(data);
      this.resetState();
    } catch (err) {
      // TODO: show error when this happens
      console.log("Failed with error:", err);
    }
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
      if (getMinsForIntervalKey(interval) >= intervalMins.day) {
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
      return t("errorTokenNotAccepted");
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
          {t("inputToken")}
        </label>
        {this.renderTokenError()}
        <TokenPanel
          onSelectToken={(token) => this.onSelectToken(token)}
          selectedCurrencies={[token]}
          selectedTokenAddress={token}
          title={t("input")}
          tokenName={tokenName}
        />
      </div>
    );
  }

  isPaymentInvalid() {
    const { t } = this.props;
    const { payment, paymentLabel, submitted, tokenName } = this.state;

    if (submitted && !payment && !paymentLabel) {
      return t("errorPaymentInvalid");
    }

    const paymentStr = paymentLabel.replace(" ", "").replace(tokenName, "");
    const parts = paymentStr.split(".");

    if (parts.length < 2) {
      if (payment < 0) {
        return t("errorPaymentZero");
      }
    } else {
      // Disallow 0 values and more than 3 decimal points
      if (paymentStr.startsWith("0.0") && paymentStr % 1 === 0) {
        return t("errorPaymentZero");
      }
      if (parts[1].length > 3) {
        return t("errorPaymentDecimals");
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
      return t("errorIntervalInvalid");
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
    const { paymentLabel, interval, tokenName } = this.state;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="payment">
          {t("inputRate")}
        </label>
        {this.renderRateError(t)}
        <div className="pay-with-sablier__horizontal-container">
          <div className="pay-with-sablier__input-container-halved">
            <input
              autoComplete="off"
              className={classnames("pay-with-sablier__input", {
                "pay-with-sablier__input--invalid": this.isPaymentInvalid(),
              })}
              id="payment"
              name="payment"
              onChange={(e) => this.onChangePaymentRate(e)}
              onKeyDown={(e) => this.onKeyDownPaymentRate(e)}
              placeholder={`0 ${tokenName}`}
              spellCheck={false}
              type="text"
              value={paymentLabel}
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
      return t("errorStopTimeInvalid");
    }

    if (isDayJs(startTime) && isDayJs(stopTime)) {
      if (stopTime.isBefore(startTime)) {
        return t("errorStopTimeLowerThanStartTime");
      }
    }

    const minutes = getMinsForIntervalKey(interval);
    if (duration && duration < minutes) {
      return t("errorDurationLowerThanInterval");
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

    const minutes = getMinsForIntervalKey(interval);
    const stopTimeMinTime = isDayJs(startTime)
      ? startTime.add(Math.max(minutes, intervalMins.hour), "minute")
      : startTime;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__form-item-label" htmlFor="startTime">
          {t("inputDates")}
        </label>
        {this.renderTimesError()}
        <div className="pay-with-sablier__horizontal-container">
          <SablierDateTime
            classNames={classnames("pay-with-sablier__input-container-halved")}
            inputClassNames={classnames("pay-with-sablier__input")}
            interval={interval}
            minTime={minTime}
            maxTime={stopTime}
            name="startTime"
            onSelectTime={(date) => this.onSelectStartTime(date)}
            placeholder={t("startTime")}
            value={startTime}
          />
          <SablierDateTime
            classNames={classnames("pay-with-sablier__input-container-halved")}
            inputClassNames={classnames("pay-with-sablier__input")}
            interval={interval}
            minTime={stopTimeMinTime}
            name="stopTime"
            onSelectTime={(date) => this.onSelectStopTime(date)}
            placeholder={t("stopTime")}
            value={stopTime}
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
      return t("errorRecipientInvalid");
    }
    if (account === recipient) {
      return t("errorRecipientSelf");
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
          {t("inputRecipient")}
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
    const { deposit, duration, enableDepositButton, tokenName } = this.state;

    const depositLabel = deposit ? `${deposit.toLocaleString()} ${tokenName}` : `0 ${tokenName}`;

    return (
      <div className="pay-with-sablier__receipt-container">
        <span className="pay-with-sablier__receipt-top-label">{t("depositing")}</span>
        <span className="pay-with-sablier__receipt-deposit-label">{depositLabel}</span>
        <div className="pay-with-sablier__receipt-line-item" style={{ marginTop: "24px" }}>
          <span className="pay-with-sablier__receipt-line-item-left">{t("duration")}</span>
          <span className="pay-with-sablier__receipt-line-item-right">{formatDuration(t, duration)}</span>
        </div>
        <div className="pay-with-sablier__receipt-line-item">
          <span className="pay-with-sablier__receipt-line-item-left">{t("ourFee")}</span>
          <span className="pay-with-sablier__receipt-line-item-right">{t("none")}</span>
        </div>
        <PrimaryButton
          classNames={classnames(["pay-with-sablier__receipt-warning-button", "primary-button--white"])}
          icon={FaExclamationMark}
          label={t("betaWarning")}
          labelClassNames={classnames("primary-button__label--black", "primary-button__label--no-transform")}
        />
        <PrimaryButton
          classNames={classnames("pay-with-sablier__receipt-deposit-button")}
          disabled={!enableDepositButton}
          label={t("streamMoney")}
          onClick={() => this.onSubmit()}
        />
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
    selectors: () => dispatch(selectors()),
  }),
)(withTranslation()(PayWithSablier));
