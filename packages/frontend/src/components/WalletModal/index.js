import React from "react";
import UAParser from "ua-parser-js";

import { useTranslation } from "react-i18next";

import BraveLogo from "../../assets/images/brave-logo.svg";
import CoinbaseWalletLogo from "../../assets/images/coinbase-wallet-logo.png";
import MetaMaskLogo from "../../assets/images/metamask-logo.svg";
import Modal from "../Modal";
import TrustLogo from "../../assets/images/trust-wallet-logo.svg";

import { wallets } from "../../constants/links";

import "./wallet-modal.scss";

const ua = new UAParser(window.navigator.userAgent);

function getTrustLink() {
  const os = ua.getOS();

  if (os.name === "Android") {
    return wallets.trust.android;
  }

  if (os.name === "iOS") {
    return wallets.trust.ios;
  }
}

function getCoinbaseWalletLink() {
  const os = ua.getOS();

  if (os.name === "Android") {
    return wallets.coinbase.android;
  }

  if (os.name === "iOS") {
    return wallets.coinbase.ios;
  }
}

function getBraveLink() {
  const os = ua.getOS();

  if (os.name === "Android") {
    return wallets.brave.android;
  }

  if (os.name === "iOS") {
    return wallets.brave.ios;
  }

  return wallets.brave.desktop;
}

function getMetamaskLink() {
  return wallets.metamask.chrome;
}

function isMobile() {
  return ua.getDevice().type === "mobile";
}

export default () => {
  const { t } = useTranslation();
  return (
    <Modal onClose={() => {}}>
      <div className="wallet-modal">
        <div className="wallet-modal__image-container">
          {isMobile()
            ? [
                <img
                  src={CoinbaseWalletLogo}
                  alt="Coinbase Wallet"
                  className="wallet-modal__image"
                  key="coinbase-wallet"
                  onClick={() => window.open(getCoinbaseWalletLink(), "_blank")}
                />,
                <img
                  src={TrustLogo}
                  alt="Trust Wallet"
                  className="wallet-modal__image"
                  key="trust"
                  onClick={() => window.open(getTrustLink(), "_blank")}
                  style={{ marginLeft: "24px" }}
                />,
              ]
            : [
                <img
                  src={MetaMaskLogo}
                  alt="MetaMask"
                  className="wallet-modal__image"
                  key="metamask"
                  onClick={() => window.open(getMetamaskLink(), "_blank")}
                />,
                <img
                  src={BraveLogo}
                  alt="Brave"
                  className="wallet-modal__image"
                  key="brave"
                  onClick={() => window.open(getBraveLink(), "_blank")}
                  style={{ marginLeft: "24px" }}
                />,
              ]}
        </div>
        <div className="wallet-modal__label-container">
          <span className="wallet-modal__title">{t("noWallet.title")}</span>
          <span className="wallet-modal__subtitle">{isMobile() ? t("noWallet.mobile") : t("noWallet.desktop")}</span>
        </div>
      </div>
    </Modal>
  );
};
