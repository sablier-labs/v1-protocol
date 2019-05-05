import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import Modal from "../../../shared/Modal";
import PrimaryButton from "../../../shared/PrimaryButton";

import { addPendingTx } from "../../../../redux/ducks/web3connect";
import { formatTime } from "../../../../helpers/format-utils";

import "./stop-modal.scss";

const initialState = {
  showModal: false,
};

class StopModal extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    showModal: PropTypes.bool.isRequired,
    stopTime: PropTypes.object.isRequired,
    streams: PropTypes.array.isRequired,
    tokenName: PropTypes.string.isRequired,
    totalValue: PropTypes.number.isRequired,
    web3: PropTypes.object.isRequired,
    withdrawable: PropTypes.number.isRequired,
  };

  static defaultProps = {
    streams: [],
  };

  state = {
    ...initialState,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const showModal = nextProps.isConnected && nextProps.showModal;
    if (showModal !== prevState.showModal) {
      return { showModal };
    } else {
      return prevState;
    }
  }

  onClickStopAndWithdraw() {
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
    const { stopTime, t, tokenName, totalValue, withdrawable } = this.props;
    const { showModal } = this.state;

    if (!showModal) {
      return null;
    }

    const isWithdrawable = withdrawable !== 0;
    return (
      <Modal onClose={() => this.onClose()}>
        <div className="stop-modal">
          <span className="stop-modal__title-label">
            {t("confirm")} {t("action")}
          </span>
          <div className="stop-modal__separator" />
          <span className="stop-modal__label">
            {t("stopAndWithdrawWarning", {
              withdrawableLabel: `${withdrawable} ${tokenName}`,
              leftoverIncomeLabel: `${totalValue - withdrawable} ${tokenName}`,
              stopTimeLabel: formatTime(t, dayjs(stopTime), false),
            })}
          </span>
          <PrimaryButton
            classNames={classnames([
              "stop-modal__button",
              "primary-button--yellow",
              {
                "primary-button--disabled": !isWithdrawable,
              },
            ])}
            onClick={() => this.onClickStopAndWithdraw()}
            label={`${t("stopAndWithdraw")} ${withdrawable} ${tokenName}`}
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
  }),
)(withTranslation()(StopModal));
