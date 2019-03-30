import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactGA from "react-ga";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import CurrencyInputPanel from "../../shared/CurrencyInputPanel";

import { selectors, addPendingTx } from "../../../redux/ducks/web3connect";

import "./pay-with-sablier.scss";

const INPUT = 0;
const OUTPUT = 1;
class FormItem extends Component {
  render() {
    const { label, name, placeholder, value } = this.props;

    return (
      <div className="pay-with-sablier__form-item">
        <label className="pay-with-sablier__label" htmlFor={name}>
          {label}
        </label>
        <div className="pay-with-sablier__input-box">
          <input className="pay-with-sablier__input" id={name} name={name} placeholder={placeholder} />
        </div>
      </div>
    );
  }
}
class PayWithSablier extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    isConnected: PropTypes.bool.isRequired,
    form: PropTypes.shape({
      token: PropTypes.string.isRequired,
      rate: PropTypes.shape({
        payment: PropTypes.string,
        interval: PropTypes.number,
      }),
      ttl: PropTypes.number,
      recipient: PropTypes.string,
    }),
    sablierAddress: PropTypes.string,
    selectors: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = {
    inputValue: "",
    outputValue: "",
    inputCurrency: "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
    inputAmountB: "",
    lastEditedField: "",
  };

  componentWillMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  validate() {
    const { selectors, account } = this.props;
    const { inputValue, outputValue, inputCurrency, outputCurrency } = this.state;

    let inputError = "";
    let outputError = "";
    let isValid = true;
    let isUnapproved = this.isUnapproved();
    const inputIsZero = BN(inputValue).isZero();
    const outputIsZero = BN(outputValue).isZero();

    if (
      !inputValue ||
      inputIsZero ||
      !outputValue ||
      outputIsZero ||
      !inputCurrency ||
      !outputCurrency ||
      isUnapproved
    ) {
      isValid = false;
    }

    const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);

    if (inputBalance.isLessThan(BN(inputValue * 10 ** inputDecimals))) {
      inputError = this.props.t("insufficientBalance");
    }

    if (inputValue === "N/A") {
      inputError = this.props.t("inputNotValid");
    }

    return {
      inputError,
      outputError,
      isValid: isValid && !inputError && !outputError,
    };
  }

  isUnapproved() {
    const { account, sablierAddress, selectors } = this.props;
    const { inputCurrency, inputValue } = this.state;

    if (!inputCurrency || inputCurrency === "ETH") {
      return false;
    }

    const { value: allowance, label, decimals } = selectors().getApprovals(
      inputCurrency,
      account,
      sablierAddress,
    );

    if (label && allowance.isLessThan(BN(inputValue * 10 ** decimals || 0))) {
      return true;
    }

    return false;
  }

  updateInput = (amount) => {
    this.setState({
      inputValue: amount,
      lastEditedField: INPUT,
    });
  };

  updateOutput = (amount) => {
    this.setState({
      outputValue: amount,
      lastEditedField: OUTPUT,
    });
  };

  renderBalance(currency, balance, decimals) {
    if (!currency || decimals === 0) {
      return "";
    }

    const balanceInput = balance.dividedBy(BN(10 ** decimals)).toFixed(4);
  }

  render() {
    const { account, form, selectors, t } = this.props;
    const { lastEditedField, inputCurrency, inputValue, outputValue } = this.state;
    const estimatedText = `(${t("estimated")})`;

    const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);

    const { inputError, outputError, isValid } = this.validate();

    return (
      <div className="pay-with-sablier">
        <div className="pay-with-sablier__form">
          <div className="pay-with-sablier__form-item">
            <label className="pay-with-sablier__label" htmlFor="token">
              {t("inputToken")}
            </label>
            <CurrencyInputPanel
              title={t("input")}
              description={lastEditedField === OUTPUT ? estimatedText : ""}
              extraText={this.renderBalance(inputCurrency, inputBalance, inputDecimals)}
              onCurrencySelected={(inputCurrency) => this.setState({ inputCurrency })}
              onValueChange={this.updateInput}
              selectedTokens={[inputCurrency]}
              selectedTokenAddress={inputCurrency}
              value={inputValue}
              errorMessage={inputError}
            />
          </div>
          <FormItem label={t("inputTtl")} name="ttl" placeholder="DD/MM/YYYY HH:MM:SS" value={form.ttl} />
          <FormItem label={t("inputRecipient")} name="recipient" placeholder="0x..." value={form.recipient} />
        </div>
        <div className="pay-with-sablier__receipt-box" />
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    balances: state.web3connect.balances,
    form: {
      token: state.form.token,
      rate: {
        payment: state.form.rate.payment,
        interval: state.form.rate.interval,
      },
      ttl: state.form.ttl,
      recipient: state.form.recipient,
    },
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    selectors: () => dispatch(selectors()),
    addPendingTx: (id) => dispatch(addPendingTx(id)),
  }),
)(withTranslation()(PayWithSablier));
