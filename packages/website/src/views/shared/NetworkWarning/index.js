import React, { Component } from "react";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import EthereumLogo from "../../../assets/images/ethereum-logo.svg";
import Modal from "../Modal";

import { networkNamesToIds } from "../../../constants/networks";

import "./network-warning.scss";

class NetworkWarning extends Component {
  static propTypes = {
    initialized: PropTypes.bool.isRequired,
    networkId: PropTypes.number.isRequired,
    subtitle: PropTypes.string,
    title: PropTypes.string,
    web3: PropTypes.object.isRequired,
  };

  state = {
    showModal: false,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const showModal =
      nextProps.initialized &&
      nextProps.networkId !== 0 &&
      nextProps.networkId !== networkNamesToIds.mainnet &&
      nextProps.networkId !== networkNamesToIds.rinkeby;
    if (showModal !== prevState.showModal) {
      return { showModal };
    } else {
      return null;
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
        <div className="network-warning">
          <img className="network-warning__image" alt="Warning" src={EthereumLogo} />
          <div className="network-warning__label-container">
            <span className="network-warning__title">{title || t("whoops")}</span>
            <span className="network-warning__subtitle">{subtitle || t("youAreOnTheWrongNetwork")}</span>
          </div>
        </div>
      </Modal>
    );
  }
}

export default connect((state) => ({
  initialized: state.web3connect.initialized,
  networkId: state.web3connect.networkId,
  web3: state.web3connect.web3,
}))(withTranslation()(NetworkWarning));
