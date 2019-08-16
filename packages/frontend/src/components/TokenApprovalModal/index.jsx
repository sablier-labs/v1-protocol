import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import ERC20ABI from "../../abi/erc20";
import Link from "../Link";
import Modal from "../Modal";
import PrimaryButton from "../PrimaryButton";

import { addPendingTx as web3AddPendingTx, selectors as web3Selectors } from "../../redux/ducks/web3connect";
import { getEtherscanAddressLink } from "../../helpers/web3-utils";

import "./token-approval-modal.scss";

const initialState = {
  submissionError: "",
  submitted: false,
};

class TokenApprovalModal extends Component {
  constructor(props) {
    super(props);
    this.state = { ...initialState };
  }

  componentDidUpdate(_prevProps, _prevState) {
    const { submitted, submissionError } = this.state;

    // Trick: we added the redux `approvals` object in the props so that this function
    // gets called when the user gets approved
    if (submitted && !submissionError && !this.isUnapproved()) {
      const { onApproveTokenSuccess } = this.props;
      onApproveTokenSuccess();
    }
  }

  async onSubmit() {
    const { account, addPendingTx, sablierAddress, tokenAddress, web3 } = this.props;
    // Set allowance to maximum value possible so that we don't have to ask the user again
    const allowance = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    let gasPrice = "8000000000";
    try {
      gasPrice = await web3.eth.getGasPrice();
      gasPrice = BN(gasPrice || "0")
        .plus(BN("1000000000"))
        .toString();
      // TODO: handle this error properly
      // eslint-disable-next-line no-empty
    } catch {}
    new web3.eth.Contract(ERC20ABI, tokenAddress).methods
      .approve(sablierAddress, allowance)
      .send({ from: account, gasPrice })
      .once("transactionHash", (transactionHash) => {
        addPendingTx(transactionHash);
        this.setState({ submitted: true });
      })
      .once("error", (err) => {
        this.handleError(err);
      });
  }

  handleError(err) {
    const { t } = this.props;
    this.setState({
      submissionError: err.toString() || t("error"),
      submitted: false,
    });
  }

  isUnapproved() {
    const { account, sablierAddress, selectors, tokenAddress } = this.props;

    const { value: allowance } = selectors().getApprovals(tokenAddress, account, sablierAddress);
    if (allowance.isGreaterThan(0)) {
      return false;
    }

    return true;
  }

  render() {
    const { account, onClose, t, tokenSymbol } = this.props;
    const { submitted, submissionError } = this.state;

    return (
      <Modal
        onClose={() => {
          if (!submitted) {
            onClose();
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
              "primary-button--disabled": submitted,
            })}
            disabled={submitted}
            label={t("approve")}
            loading={submitted}
            onClick={() => this.setState({ submissionError: "" }, () => this.onSubmit())}
          />
        </div>
      </Modal>
    );
  }
}

TokenApprovalModal.propTypes = {
  account: PropTypes.string,
  addPendingTx: PropTypes.func.isRequired,
  // See `componentDidUpdate`
  // eslint-disable-next-line react/no-unused-prop-types
  approvals: PropTypes.shape({}),
  onApproveTokenSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  sablierAddress: PropTypes.string,
  selectors: PropTypes.func.isRequired,
  t: PropTypes.shape({}),
  tokenAddress: PropTypes.string.isRequired,
  tokenSymbol: PropTypes.string.isRequired,
  web3: PropTypes.shape({
    eth: PropTypes.shape({
      Contract: PropTypes.func.isRequired,
      getGasPrice: PropTypes.func.isRequired,
    }),
  }).isRequired,
};

TokenApprovalModal.defaultProps = {
  account: "",
  approvals: "",
  sablierAddress: "",
  t: {},
};

export default connect(
  (state) => ({
    account: state.web3connect.account,
    approvals: state.web3connect.approvals,
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (id) => dispatch(web3AddPendingTx(id)),
    selectors: () => dispatch(web3Selectors()),
  }),
)(withTranslation()(TokenApprovalModal));
