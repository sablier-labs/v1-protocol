import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import ERC20ABI from "../../abi/erc20";
import Link from "../Link";
import Modal from "../Modal";
import PrimaryButton from "../PrimaryButton";

import { addPendingTx } from "../../redux/ducks/web3connect";
import { getEtherscanAddressLink } from "../../helpers/web3-utils";

import "./token-approval-modal.scss";

const initialState = {
  submissionError: "",
  submitted: false,
};

class TokenApprovalModal extends Component {
  static defaultProps = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    hasPendingTransactions: PropTypes.bool.isRequired,
    onApproveTokenSuccess: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    sablierAddress: PropTypes.string,
    tokenAddress: PropTypes.string.isRequired,
    tokenSymbol: PropTypes.string.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = {
    ...initialState,
  };

  componentDidUpdate(prevProps, prevState) {
    if (this.state.submitted && !this.state.submissionError && !this.props.hasPendingTransactions) {
      this.props.onApproveTokenSuccess();
    }
  }

  handleError(err) {
    const { t } = this.props;
    this.setState({
      submissionError: err.toString() || t("error"),
      submitted: false,
    });
  }

  onSubmit() {
    const { account, addPendingTx, sablierAddress, tokenAddress, web3 } = this.props;
    // Set allowance to maximum value possible so that we don't have to ask the user again
    const allowance = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    new web3.eth.Contract(ERC20ABI, tokenAddress).methods
      .approve(sablierAddress, allowance)
      .send({ from: account })
      .once("transactionHash", (transactionHash) => {
        addPendingTx(transactionHash);
        this.setState({ submitted: true });
      })
      .once("error", (err) => {
        this.handleError(err);
      });
  }

  render() {
    const { account, hasPendingTransactions, t, tokenSymbol } = this.props;
    const { submissionError } = this.state;

    return (
      <Modal
        onClose={() => {
          if (!hasPendingTransactions) {
            this.props.onClose();
          }
        }}
      >
        <div className="token-approval-modal">
          <span className="token-approval-modal__title-label">{t("approveToken")}</span>
          <div className="token-approval-modal__separator" />
          <span className="token-approval-modal__label">{t("tokenApproval.confirm", { tokenSymbol })}:</span>
          <Link
            className="token-approval-modal__address-container"
            target="_blank"
            to={getEtherscanAddressLink(account)}
          >
            {account}
          </Link>
          {!submissionError ? null : <span className="token-approval-modal__error-label">{submissionError}</span>}
          <PrimaryButton
            className={classnames("token-approval-modal__button", {
              "primary-button--disabled": hasPendingTransactions,
            })}
            disabled={hasPendingTransactions}
            label={t("approve")}
            loading={hasPendingTransactions}
            onClick={() => this.setState({ submissionError: "" }, () => this.onSubmit())}
          />
        </div>
      </Modal>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    hasPendingTransactions: !!state.web3connect.transactions.pending.length,
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (id) => dispatch(addPendingTx(id)),
  }),
)(withTranslation()(TokenApprovalModal));
