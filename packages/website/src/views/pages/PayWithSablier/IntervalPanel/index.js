import React, { Component } from "react";
import classnames from "classnames";
import onClickOutside from "react-onclickoutside";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

import FaChevronCircleDown from "../../../../assets/images/fa-chevron-circle-down.svg";

import { intervalStringValues } from "../../../../constants/time";
import "./interval-panel.scss";

class IntervalPanel extends Component {
  static propTypes = {
    classNames: PropTypes.string,
    interval: PropTypes.string,
    onSelectInterval: PropTypes.func.isRequired,
  };

  state = {
    showIntervalDropdown: false,
  };

  handleClickOutside() {
    this.setState({ showIntervalDropdown: false });
  }

  onSelectInterval(interval) {
    this.setState({ showIntervalDropdown: false });
    this.props.onSelectInterval(interval);
  }

  renderDropdown() {
    const { interval } = this.props;
    const { showIntervalDropdown } = this.state;

    if (!showIntervalDropdown) {
      return null;
    }

    return (
      <div className="interval-dropdown">
        {Object.keys(intervalStringValues).map((key, index) => {
          return (
            <div
              className={classnames("interval-dropdown__row", {
                "interval-dropdown__row--selected": interval === key,
              })}
              key={index}
              onClick={() => this.onSelectInterval(key)}
            >
              {intervalStringValues[key]}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const { classNames, interval, t } = this.props;
    return (
      <div
        className={classnames("interval-panel", classNames)}
        onClick={() => {
          this.setState({ showIntervalDropdown: !this.state.showIntervalDropdown });
        }}
      >
        <span
          className={classnames("interval-panel__interval-label", {
            "interval-panel__interval-label--placeholder": !interval,
          })}
        >
          {intervalStringValues[interval] || t("placeholderInterval")}
        </span>
        <img className="interval-panel__dropdown-icon" alt="Dropdown Icon" src={FaChevronCircleDown} />
        {this.renderDropdown()}
      </div>
    );
  }
}

export default withTranslation()(onClickOutside(IntervalPanel));
