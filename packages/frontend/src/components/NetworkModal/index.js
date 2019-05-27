import React from "react";

import { useTranslation } from "react-i18next";

import EthereumLogo from "../../assets/images/ethereum-logo.svg";
import Modal from "../Modal";

import "./network-modal.scss";

export default () => {
  const { t } = useTranslation();
  const networkName = process.env.REACT_APP_NETWORK_NAME || "Main Ethereum Network";

  return (
    <Modal onClose={() => {}}>
      <div className="network-modal">
        <img className="network-modal__image" alt="Warning" src={EthereumLogo} />
        <div className="network-modal__label-container">
          <span className="network-modal__title">{t("wrongNetwork.title")}</span>
          <span className="network-modal__subtitle">
            {t("wrongNetwork.subtitle", {
              networkName,
            })}
          </span>
        </div>
      </div>
    </Modal>
  );
};
