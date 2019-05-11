import React, { Component } from "react";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import Link from "../Link";
import Logo from "../Logo";
import Web3Status from "../Web3Status";

import "./header.scss";
import links from "../../constants/links";

class Header extends Component {
  static propTypes = {
    currentAddress: PropTypes.string,
    isConnected: PropTypes.bool.isRequired,
  };

  render() {
    const { t } = this.props;

    return (
      <div className="header">
        <Logo />
        <div className="header__menu">
          <div className="header__link-container">
            <Link className="header__link-item" to={links.menu.docs} target="_blank">
              {t("docs")}
            </Link>
            <Link className="header__link-item" to={links.menu.github} target="_blank">
              GitHub
            </Link>
            <Link className="header__link-item" to={links.menu.twitter} target="_blank">
              Twitter
            </Link>
          </div>
          <Web3Status />
        </div>
      </div>
    );
  }
}

export default connect((state) => ({
  currentAddress: state.web3connect.account,
  initialized: state.web3connect.initialized,
  isConnected: !!state.web3connect.account,
  web3: state.web3connect.web3,
  networkId: state.web3connect.networkId,
}))(withTranslation()(Header));
