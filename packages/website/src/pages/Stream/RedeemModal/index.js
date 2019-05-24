import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import DashedLine from "../../../components/DashedLine";
import Modal from "../../../components/Modal";
import PrimaryButton from "../../../components/PrimaryButton";

import "./redeem-modal.scss";

class RedeemModal extends Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    stream: PropTypes.object.isRequired,
  };

  onClickRedeem() {
    const { stream } = this.props;
    const senderAmount = stream.funds.remaining;
    const recipientAmount = stream.funds.paid;
    this.props.onSubmit(senderAmount, recipientAmount);
  }

  onClose() {
    this.props.onClose();
  }

  render() {
    const { hasPendingTransactions, stream, t } = this.props;

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
            className={classnames(["redeem-modal__button", "primary-button--yellow"], {
              "primary-button--disabled": hasPendingTransactions,
            })}
            disabled={hasPendingTransactions}
            onClick={() => this.onClickRedeem()}
            label={t("redeem.verbatim")}
            loading={hasPendingTransactions}
          />
        </div>
      </Modal>
    );
  }
}

export default connect((state) => ({
  hasPendingTransactions: !!state.web3connect.transactions.pending.length,
}))(withTranslation()(RedeemModal));
