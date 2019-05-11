import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import Modal from "../../../components/Modal";
import PrimaryButton from "../../../components/PrimaryButton";

import { addPendingTx } from "../../../redux/ducks/web3connect";
import { formatTime } from "../../../helpers/format-utils";

import "./stop-modal.scss";

class StopModal extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
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


  onClickStopAndWithdraw() {
    this.onClose();
  }

  onClose() {
    this.props.onClose();
  }

  render() {
    const { stopTime, t, tokenName, totalValue, withdrawable } = this.props;

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
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (opts) => dispatch(addPendingTx(opts)),
  }),
)(withTranslation()(StopModal));
