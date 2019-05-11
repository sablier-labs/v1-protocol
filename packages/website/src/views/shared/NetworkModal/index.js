import React, { Component } from "react";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import EthereumLogo from "../../../assets/images/ethereum-logo.svg";
import Modal from "../Modal";

import "./network-modal.scss";

class NetworkModal extends Component {
  static propTypes = {
    isConnected: PropTypes.bool,
    networkId: PropTypes.number.isRequired,
    subtitle: PropTypes.string,
    title: PropTypes.string,
    web3: PropTypes.object.isRequired,
  };

  state = {
    showModal: false,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const showModal = nextProps.networkId && !nextProps.isConnected;
    if (showModal !== prevState.showModal) {
      return { showModal };
    } else {
      return prevState;
    }
  }

  render() {
    const { t, title, subtitle } = this.props;
    const { showModal } = this.state;

    if (!showModal) {
      return null;
    }

    return (
      <Modal onClose={() => {}}>
        <div className="network-modal">
          <img className="network-modal__image" alt="Warning" src={EthereumLogo} />
          <div className="network-modal__label-container">
            <span className="network-modal__title">{title || t("whoops")}</span>
            <span className="network-modal__subtitle">{subtitle || t("youAreOnTheWrongNetwork")}</span>
          </div>
        </div>
      </Modal>
    );
  }
}

export default connect((state) => ({
  isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
  networkId: state.web3connect.networkId,
  web3: state.web3connect.web3,
}))(withTranslation()(NetworkModal));
