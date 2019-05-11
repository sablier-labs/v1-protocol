import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import * as Web3Utils from "web3-utils";

import { connect } from "react-redux";
import { CSSTransitionGroup } from "react-transition-group";
import { withTranslation } from "react-i18next";

import FaUserCircle from "../../assets/images/fa-user-circle.svg";
import Modal from "../Modal";

import "./web3-status.scss";

function getEtherscanLink(tx) {
  return `https://etherscan.io/tx/${tx}`;
}

function getText(text, disconnectedText) {
  if (!text || text.length < 42 || !Web3Utils.isHexStrict(text)) {
    return disconnectedText;
  }

  const address = Web3Utils.toChecksumAddress(text);
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

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

  static getDerivedStateFromProps(nextProps, prevState) {
    return prevState;
  }

  onClick = () => {
    if (this.props.pending.length && !this.state.showModal) {
      this.setState({ showModal: true });
    }
  };

  renderPendingTransactions() {
    return this.props.pending.map((transaction) => {
      return (
        <div
          key={transaction}
          className={classnames("pending-modal__transaction-row")}
          onClick={() => window.open(getEtherscanLink(transaction), "_blank")}
        >
          <div className="pending-modal__transaction-label">{transaction}</div>
          <div className="pending-modal--pending-indicator">
            <div className="loader" /> {this.props.t("pending")}
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
    if (!address || address.length < 42 || !Web3Utils.isHexStrict(address)) {
      return null;
    }

    return <img className="web3-status__icon" src={FaUserCircle} alt="Ethereum Wallet" />;
  }

  renderPendingContainer(pendingTransactions, pendingLabel) {
    return (
      <div className="web3-status__pending-container">
        <div className="web3-status__loader" />
        <span className="web3-status__pending-container__label" key="text">
          {pendingTransactions.length} {pendingLabel}
        </span>
      </div>
    );
  }

  render() {
    const { address, confirmed, pending, t } = this.props;
    const hasPendingTransactions = !!pending.length;
    const hasConfirmedTransactions = !!confirmed.length;

    return (
      <div
        className={classnames("web3-status", {
          "web3-status__connected": this.props.isConnected,
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
            : getText(address, t("disconnected"))}
          {this.renderModal()}
        </div>
      </div>
    );
  }
}

export default connect((state) => {
  return {
    address: state.web3connect.account,
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    pending: state.web3connect.transactions.pending,
    confirmed: state.web3connect.transactions.confirmed,
  };
})(withTranslation()(Web3Status));
