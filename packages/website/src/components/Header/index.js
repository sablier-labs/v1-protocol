import React, { Component } from "react";

import { withTranslation } from "react-i18next";

import Link from "../Link";
import Logo from "../Logo";
import Web3Status from "../Web3Status";

import "./header.scss";
import links from "../../constants/links";

class Header extends Component {
  render() {
    const { t } = this.props;

    return (
      <div className="header">
        <Logo />
        <div className="header__menu">
          <div className="header__link-container">
            <Link className="header__link" to={"/dashboard"}>
              {t("dashboard")}
            </Link>
            <Link className="header__link" to={links.menu.github} target="_blank">
              GitHub
            </Link>
            <Link className="header__link" to={links.menu.twitter} target="_blank">
              Twitter
            </Link>
          </div>
          <Web3Status />
        </div>
      </div>
    );
  }
}

export default withTranslation()(Header);
