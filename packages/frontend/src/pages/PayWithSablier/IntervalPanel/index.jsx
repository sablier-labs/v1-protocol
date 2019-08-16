import React, { Component } from "react";
import classnames from "classnames";
import onClickOutside from "react-onclickoutside";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

import FaChevronCircleDown from "../../../assets/images/fa-chevron-circle-down.svg";

import { INTERVALS } from "../../../constants/time";
import "./interval-panel.scss";

class IntervalPanel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showIntervalDropdown: false,
    };
  }

  onSelectInterval(interval) {
    const { onSelectInterval } = this.props;
    this.setState({ showIntervalDropdown: false });
    onSelectInterval(interval);
  }

  handleClickOutside() {
    this.setState({ showIntervalDropdown: false });
  }

  renderDropdown() {
    const { interval } = this.props;
    const { showIntervalDropdown } = this.state;

    if (!showIntervalDropdown) {
      return null;
    }

    return (
      <div className="interval-dropdown">
        {Object.keys(INTERVALS).map((key, _index) => {
          return (
            <div
              className={classnames("interval-dropdown__row", {
                "interval-dropdown__row--selected": interval === key,
              })}
              key={key}
              onClick={() => this.onSelectInterval(key)}
              onKeyDown={() => this.onSelectInterval(key)}
              role="button"
              tabIndex={0}
            >
              {INTERVALS[key]}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const { className, interval, t } = this.props;
    const { showIntervalDropdown } = this.state;

    return (
      <div
        className={classnames("interval-panel", className)}
        onClick={() => {
          this.setState({ showIntervalDropdown: !showIntervalDropdown });
        }}
        onKeyDown={() => {
          this.setState({ showIntervalDropdown: !showIntervalDropdown });
        }}
        role="button"
        tabIndex={0}
      >
        <span
          className={classnames("interval-panel__interval-label", {
            "interval-panel__interval-label--placeholder": !interval,
          })}
        >
          {INTERVALS[interval] || t("placeholderInterval")}
        </span>
        <img className="interval-panel__dropdown-icon" alt="Dropdown Icon" src={FaChevronCircleDown} />
        {this.renderDropdown()}
      </div>
    );
  }
}

IntervalPanel.propTypes = {
  className: PropTypes.string,
  interval: PropTypes.string,
  onSelectInterval: PropTypes.func.isRequired,
  t: PropTypes.shape({}),
};

IntervalPanel.defaultProps = {
  className: "",
  interval: INTERVALS.minute,
  t: {},
};

export default withTranslation()(onClickOutside(IntervalPanel));
