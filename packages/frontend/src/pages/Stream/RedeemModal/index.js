import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import DashedLine from "../../../components/DashedLine";
import Modal from "../../../components/Modal";
import PrimaryButton from "../../../components/PrimaryButton";
import SablierABI from "../../../abi/sablier";

import { addPendingTx } from "../../../redux/ducks/web3connect";

import "./redeem-modal.scss";

const initialState = {
  submitted: false,
  submissionError: "",
};

class RedeemModal extends Component {
  static propTypes = {
    account: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onRedeemSuccess: PropTypes.func.isRequired,
    stream: PropTypes.object.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = {
    ...initialState,
  };

  componentDidUpdate(prevProps, prevState) {
    const { stream } = this.props;
    if (this.state.submitted && !this.state.submissionError && !this.props.hasPendingTransactions) {
      const senderAmount = stream.funds.remaining;
      const recipientAmount = stream.funds.paid;
      this.props.onRedeemSuccess(senderAmount, recipientAmount);
    }
  }

  handleError(err) {
    const { t } = this.props;
    this.setState({
      submitted: false,
      submissionError: err.toString() || t("error"),
    });
  }

  onClose() {
    this.props.onClose();
  }

  async onSubmitRedeem() {
    const { account, addPendingTx, sablierAddress, stream, web3 } = this.props;

    let gasPrice = "8000000000";
    try {
      gasPrice = await web3.eth.getGasPrice();
      gasPrice = BN(gasPrice || "0").plus(BN("1000000000")).toString();
    } catch {}
    new web3.eth.Contract(SablierABI, sablierAddress).methods
      .redeemStream(stream.rawStreamId)
      .send({ from: account, gasPrice })
      .once("transactionHash", (transactionHash) => {
        addPendingTx(transactionHash);
        this.setState({ submitted: true });
      })
      .once("error", (err) => {
        this.handleError(err);
      });
  }

  render() {
    const { hasPendingTransactions, stream, t } = this.props;
    const { submissionError } = this.state;

    return (
      <Modal
        onClose={() => {
          if (!hasPendingTransactions) {
            this.onClose();
          }
        }}
      >
        <div className="redeem-modal">
          <span className="redeem-modal__title-label">
            {t("confirm")} {t("action")}
          </span>
          <div className="redeem-modal__separator" />
          <span className="redeem-modal__label">
            {t("redeem.confirm", {
              deposit: stream.funds.deposit,
              paid: stream.funds.paid,
              remaining: stream.funds.remaining,
              tokenSymbol: stream.token.symbol,
            })}
          </span>
          <div className="redeem-modal__funds-container">
            <DashedLine
              className="redeem-modal__dashed-line"
              leftLabel={t("you")}
              rightLabel={`${stream.funds.remaining.toLocaleString()} ${stream.token.symbol}`}
            />
            <DashedLine
              className="redeem-modal__dashed-line"
              leftLabel={t("recipient")}
              rightLabel={`${stream.funds.paid.toLocaleString()} ${stream.token.symbol}`}
            />
          </div>
          <PrimaryButton
            className={classnames(["redeem-modal__button", "primary-button--yellow"])}
            disabled={hasPendingTransactions}
            disabledWhileLoading={true}
            label={t("redeem.verbatim")}
            loading={hasPendingTransactions}
            onClick={() => {
              this.setState({ submissionError: "" }, () => {
                this.onSubmitRedeem();
              });
            }}
          />
          {!submissionError ? null : <div className={classnames("redeem-modal__error-label")}>{submissionError}</div>}
        </div>
      </Modal>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    addPendingTx: PropTypes.func.isRequired,
    hasPendingTransactions: !!state.web3connect.transactions.pending.length,
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (path) => dispatch(addPendingTx(path)),
  }),
)(withTranslation()(RedeemModal));
