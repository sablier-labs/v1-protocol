import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import Slider from "rc-slider/lib/Slider";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import DashedLine from "../../../components/DashedLine";
import Modal from "../../../components/Modal";
import PrimaryButton from "../../../components/PrimaryButton";

import "rc-slider/assets/index.css";
import "./withdraw-modal.scss";

const initialState = {
  amountToWithdraw: 0,
};

class WithdrawModal extends Component {
  static propTypes = {
    hasPendingTransactions: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    stream: PropTypes.object.isRequired,
  };

  state = { ...initialState };

  static getDerivedStateFromProps(nextProps, prevState) {
    const initialAmountToWithdraw = Math.floor(nextProps.stream.funds.withdrawable / 2);
    const amountToWithdraw = prevState.amountToWithdraw || initialAmountToWithdraw;

    if (amountToWithdraw !== prevState.amountToWithdraw) {
      return { amountToWithdraw };
    } else {
      return prevState;
    }
  }

  onClickWithdraw() {
    const { amountToWithdraw } = this.state;
    this.props.onSubmit(amountToWithdraw);
  }

  onClose() {
    this.resetState();
    this.props.onClose();
  }

  resetState() {
    this.setState(initialState);
  }

  render() {
    const { hasPendingTransactions, stream, t } = this.props;
    const { amountToWithdraw } = this.state;

    const isWithdrawable = stream.funds.withdrawable !== 0;
    const disabled = !isWithdrawable || hasPendingTransactions;

    const sliderStep = Math.min(stream.funds.withdrawable, 0.1);
    return (
      <Modal
        onClose={() => {
          if (!hasPendingTransactions) {
            this.onClose();
          }
        }}
      >
        <div className="withdraw-modal">
          <span className="withdraw-modal__title-label">{t("selectAmount")}</span>
          <div className="withdraw-modal__separator" />
          <div className="withdraw-modal__funds-container">
            <DashedLine
              className="withdraw-modal__dashed-line"
              leftLabel={t("earnedSoFar")}
              rightLabel={`${stream.funds.paid.toLocaleString()} ${stream.token.symbol}`}
            />
            <DashedLine
              className="withdraw-modal__dashed-line"
              leftLabel={t("withdrawnSoFar")}
              rightLabel={`${stream.funds.withdrawn.toLocaleString()} ${stream.token.symbol}`}
            />
            <DashedLine
              className="withdraw-modal__dashed-line"
              leftLabel={t("youCanWithdrawUpTo")}
              rightLabel={`${stream.funds.withdrawable.toLocaleString()} ${stream.token.symbol}`}
            />
          </div>
          <Slider
            className="withdraw-modal__slider"
            defaultValue={amountToWithdraw}
            disabled={disabled}
            max={stream.funds.withdrawable}
            min={sliderStep}
            onChange={(value) => this.setState({ amountToWithdraw: value })}
            step={sliderStep}
          />
          <PrimaryButton
            className={classnames("withdraw-modal__button", "primary-button--yellow", {
              "primary-button--disabled": disabled,
            })}
            disabled={disabled}
            label={`${t("withdraw.verbatim")} ${amountToWithdraw} ${stream.token.symbol}`}
            loading={hasPendingTransactions}
            onClick={() => this.onClickWithdraw()}
          />
        </div>
      </Modal>
    );
  }
}

export default connect((state) => ({
  hasPendingTransactions: !!state.web3connect.transactions.pending.length,
}))(withTranslation()(WithdrawModal));
