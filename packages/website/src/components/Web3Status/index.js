import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { CSSTransitionGroup } from "react-transition-group";
import { isHexStrict, toChecksumAddress } from "web3-utils";
import { withTranslation } from "react-i18next";

import FaUserCircle from "../../assets/images/fa-user-circle.svg";
import Loader from "../Loader";
import Modal from "../Modal";

import { getEtherscanTransactionLink } from "../../helpers/web3-utils";

import "./web3-status.scss";

class Web3Status extends Component {
  static propTypes = {
    isConnected: PropTypes.bool,
    address: PropTypes.string,
  };

  static defaultProps = {
    isConnected: false,
    address: "Disconnected",
  };

  state = {
    showModal: false,
  };

  onClick = () => {
    if (this.props.pending.length && !this.state.showModal) {
      this.setState({ showModal: true });
    }
  };

  renderPendingTransactions() {
    const { pending, t } = this.props;
    return pending.map((txhash) => {
      return (
        <div
          key={txhash}
          className={classnames("pending-modal__transaction-row")}
          onClick={() => window.open(getEtherscanTransactionLink(txhash), "_blank")}
        >
          <div className="pending-modal__transaction-label">{txhash}</div>
          <div className="pending-modal--pending-indicator">
            <Loader />
            {t("pending")}
          </div>
        </div>
      );
    });
  }

  renderModal() {
    if (!this.state.showModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ showModal: false })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear={true}
          transitionLeave={true}
          transitionAppearTimeout={200}
          transitionLeaveTimeout={200}
          transitionEnterTimeout={200}
        >
          <div className="pending-modal">
            <div className="pending-modal__transaction-list">
              <div className="pending-modal__header">Transactions</div>
              {this.renderPendingTransactions()}
            </div>
          </div>
        </CSSTransitionGroup>
      </Modal>
    );
  }

  renderIcon(address) {
    if (!address || address.length < 42 || !isHexStrict(address)) {
      return null;
    }

    return <img className="web3-status__icon" src={FaUserCircle} alt="Ethereum Wallet" />;
  }

  renderLabel(text, disconnectedText) {
    if (!text || text.length < 42 || !isHexStrict(text)) {
      return <span className="web3-status__label">disconnectedText</span>;
    }

    const address = toChecksumAddress(text);
    return (
      <span className="web3-status__label">
        {address.substring(0, 6)}...{address.substring(38)}
      </span>
    );
  }

  renderPendingContainer(pendingTransactions, pendingLabel) {
    return (
      <div className="web3-status__pending-container">
        <Loader className="web3-status__loader" />
        <span className="web3-status__pending-container__label" key="text">
          {pendingTransactions.length} {pendingLabel}
        </span>
      </div>
    );
  }

  render() {
    const { address, confirmed, isConnected, pending, t } = this.props;
    const hasPendingTransactions = !!pending.length;
    const hasConfirmedTransactions = !!confirmed.length;

    return (
      <div
        className={classnames("web3-status", {
          "web3-status__connected": isConnected,
          "web3-status--pending": hasPendingTransactions,
          "web3-status--confirmed": hasConfirmedTransactions,
        })}
        onClick={this.onClick}
      >
        {hasPendingTransactions ? null : this.renderIcon(address)}
        <div
          className={classnames("web3-status__container", {
            "web3-status__container--pending": hasPendingTransactions,
          })}
        >
          {hasPendingTransactions
            ? this.renderPendingContainer(pending, t("pending"))
            : this.renderLabel(address, t("disconnected"))}
          {this.renderModal()}
        </div>
      </div>
    );
  }
}

export default connect((state) => {
  return {
    address: state.web3connect.account,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    pending: state.web3connect.transactions.pending,
    confirmed: state.web3connect.transactions.confirmed,
  };
})(withTranslation()(Web3Status));
