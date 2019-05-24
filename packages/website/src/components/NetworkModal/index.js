import React, { Component } from "react";

import { withTranslation } from "react-i18next";

import EthereumLogo from "../../assets/images/ethereum-logo.svg";
import Modal from "../Modal";

import "./network-modal.scss";

class NetworkModal extends Component {
  render() {
    const { t } = this.props;

    return (
      <Modal onClose={() => {}}>
        <div className="network-modal">
          <img className="network-modal__image" alt="Warning" src={EthereumLogo} />
          <div className="network-modal__label-container">
            <span className="network-modal__title">{t("whoops")}</span>
            <span className="network-modal__subtitle">{t("youAreOnTheWrongNetwork")}</span>
          </div>
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(NetworkModal);
