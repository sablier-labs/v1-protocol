import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import randomWords from "random-words";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import FaPlus from "../../../assets/images/fa-plus.svg";
import Link from "../../shared/Link";

import "./dashboard.scss";

class Dashboard extends Component {
  static propTypes = {
    account: PropTypes.string,
    streams: PropTypes.array.isRequired,
  };

  static defaultProps = {
    streams: ["Foo", "Bar", "Baz", "Lorem"],
  };

  renderList() {
    const { streams } = this.props;

    if (!streams || streams.length === 0) {
      // TODO: add 404
      return null;
    }

    return streams.map((stream, index) => {
      return (
        <div key={index}>
          <div className="dashboard__row">
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
            <span className="dashboard__row__label">{randomWords(1)}</span>
          </div>
          <div className={classnames(["dashboard__separator", "dashboard__row__separator"])} />
        </div>
      );
    });
  }

  render() {
    const { t } = this.props;

    return (
      <div className="dashboard">
        <div className="dashboard__title-label">{t("dashboard")}</div>
        <Link className="dashboard__plus-icon-container" to={"/"}>
          <img className="dashboard__plus-icon" alt="New Stream" src={FaPlus} />
        </Link>
        <div className="dashboard__header-label-container">
          <span className="dashboard__header-label">{t("flow")}</span>
          <span className="dashboard__header-label">{t("rate")}</span>
          <span className="dashboard__header-label">{t("from")}</span>
          <span className="dashboard__header-label">{t("to")}</span>
          <span className="dashboard__header-label">{t("funds")}</span>
          <span className="dashboard__header-label">{t("age")}</span>
          <span className="dashboard__header-label">{t("remaining")}</span>
        </div>
        <div className="dashboard__separator" style={{ marginTop: "16px" }} />
        <div className="dashboard__row-container">{this.renderList()}</div>
      </div>
    );
  }
}

export default connect()(withTranslation()(Dashboard));
