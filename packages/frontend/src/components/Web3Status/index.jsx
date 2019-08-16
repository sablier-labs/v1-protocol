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
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
  }

  onClick = () => {
    const { pending } = this.props;
    const { showModal } = this.state;
    if (pending.length && !showModal) {
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
          onKeyDown={() => window.open(getEtherscanTransactionLink(txhash), "_blank")}
          role="button"
          tabIndex={0}
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
    const { showModal } = this.state;
    if (!showModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ showModal: false })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear
          transitionLeave
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

  // eslint-disable-next-line class-methods-use-this
  renderIcon(address) {
    if (!address || address.length < 42 || !isHexStrict(address)) {
      return null;
    }

    return <img className="web3-status__icon" src={FaUserCircle} alt="Ethereum Wallet" />;
  }

  renderLabel(text) {
    const { t } = this.props;
    if (!text || text.length < 42 || !isHexStrict(text)) {
      return <span className="web3-status__label">{t("disconnected")}</span>;
    }

    const address = toChecksumAddress(text);
    return (
      <span className="web3-status__label">
        {address.substring(0, 6)}...{address.substring(38)}
      </span>
    );
  }

  // eslint-disable-next-line class-methods-use-this
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
        onKeyDown={this.onClick}
        role="button"
        tabIndex={0}
      >
        {hasPendingTransactions ? null : this.renderIcon(address)}
        <div
          className={classnames("web3-status__container", {
            "web3-status__container--pending": hasPendingTransactions,
          })}
        >
          {hasPendingTransactions ? this.renderPendingContainer(pending, t("pending")) : this.renderLabel(address)}
          {this.renderModal()}
        </div>
      </div>
    );
  }
}

Web3Status.propTypes = {
  address: PropTypes.string,
  confirmed: PropTypes.shape([]),
  isConnected: PropTypes.bool,
  pending: PropTypes.shape([]),
  t: PropTypes.shape({}),
};

Web3Status.defaultProps = {
  address: "Disconnected",
  confirmed: [],
  isConnected: false,
  pending: [],
  t: {},
};

export default connect((state) => {
  return {
    address: state.web3connect.account,
    confirmed: state.web3connect.transactions.confirmed,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    pending: state.web3connect.transactions.pending,
  };
})(withTranslation()(Web3Status));
