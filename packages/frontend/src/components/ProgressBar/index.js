import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./progress-bar.scss";

class ProgressBar extends Component {
  static propTypes = {
    className: PropTypes.string,
    percentage: PropTypes.number.isRequired,
    fillerClassName: PropTypes.string,
  };

  render() {
    const { percentage } = this.props;
    return (
      <div className={classnames("progress-bar", this.props.className)}>
        <div
          className={classnames("progress-bar__filler", this.props.fillerClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
}

export default ProgressBar;
