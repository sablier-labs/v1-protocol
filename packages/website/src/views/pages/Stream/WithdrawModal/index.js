import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import Slider from "rc-slider/lib/Slider";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import Modal from "../../../shared/Modal";
import PrimaryButton from "../../../shared/PrimaryButton";

import { addPendingTx, selectors } from "../../../../redux/ducks/web3connect";
import { roundToDecimalPlaces } from "../../../../helpers/format-utils";

import "rc-slider/assets/index.css";
import "./withdraw-modal.scss";

const initialState = {
  amountToWithdraw: 0,
  earned: 0,
  showModal: false,
  withdrawable: 0,
  withdrawn: 0,
};

class WithdrawModal extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    earned: PropTypes.number.isRequired,
    isConnected: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    selectors: PropTypes.func.isRequired,
    showModal: PropTypes.bool.isRequired,
    tokenName: PropTypes.string.isRequired,
    web3: PropTypes.object.isRequired,
    withdrawn: PropTypes.number.isRequired,
  };

  state = { ...initialState };

  static getDerivedStateFromProps(nextProps, prevState) {
    const earned = nextProps.earned;
    const withdrawable = nextProps.withdrawable;
    const withdrawn = nextProps.withdrawn;
    const showModal = nextProps.isConnected && nextProps.showModal;

    if (
      earned !== prevState.earned ||
      withdrawn !== prevState.withdrawn ||
      !withdrawable !== prevState.withdrawable ||
      showModal !== prevState.showModal
    ) {
      const amountToWithdraw = prevState.amountToWithdraw || roundToDecimalPlaces(withdrawable / 2, 2);
      return { amountToWithdraw, earned, showModal, withdrawable, withdrawn };
    } else {
      return prevState;
    }
  }

  onClickWithdraw() {
    this.onClose();
  }

  onClose() {
    const { onClose } = this.props;
    this.resetState();
    onClose();
  }

  resetState() {
    this.setState(initialState);
  }

  render() {
    const { t, tokenName } = this.props;
    const { amountToWithdraw, earned, showModal, withdrawable, withdrawn } = this.state;

    if (!showModal) {
      return null;
    }

    const isWithdrawable = withdrawable !== 0;
    const sliderStep = Math.min(roundToDecimalPlaces(withdrawable, 2), 1);
    return (
      <Modal onClose={() => this.onClose()}>
        <div className="withdraw-modal">
          <span className="withdraw-modal__title-label">{t("selectAmount")}</span>
          <div className="withdraw-modal__separator" />
          <div className="withdraw-modal__stats-container">
            <div className="withdraw-modal__dashed-line">
              <span className="withdraw-modal__dashed-line-left">{t("withdrawnSoFar")}</span>
              <span className="withdraw-modal__dashed-line-right">
                {roundToDecimalPlaces(withdrawn, 3).toLocaleString()} {tokenName}
              </span>
            </div>
            <div className="withdraw-modal__dashed-line">
              <span className="withdraw-modal__dashed-line-left">{t("earnedSoFar")}</span>
              <span className="withdraw-modal__dashed-line-right">
                {roundToDecimalPlaces(earned, 3).toLocaleString()} {tokenName}
              </span>
            </div>
            <div className="withdraw-modal__dashed-line">
              <span className="withdraw-modal__dashed-line-left">{t("youCanWithdrawUpTo")}</span>
              <span className="withdraw-modal__dashed-line-right">
                {roundToDecimalPlaces(withdrawable, 3).toLocaleString()} {tokenName}
              </span>
            </div>
          </div>
          {!isWithdrawable ? null : (
            <Slider
              className="withdraw-modal__slider"
              defaultValue={amountToWithdraw}
              max={withdrawable}
              min={sliderStep}
              onChange={(value) => this.setState({ amountToWithdraw: value })}
              step={sliderStep}
            />
          )}
          <PrimaryButton
            classNames={classnames("withdraw-modal__button", {
              "primary-button--disabled": !isWithdrawable,
            })}
            disabled={!isWithdrawable}
            label={`${t("withdraw")} ${amountToWithdraw} ${tokenName}`}
            onClick={() => this.onClickWithdraw()}
          />
        </div>
      </Modal>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (opts) => dispatch(addPendingTx(opts)),
    selectors: () => dispatch(selectors()),
  }),
)(withTranslation()(WithdrawModal));
