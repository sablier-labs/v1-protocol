import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./dashed-line.scss";

class DashedLine extends Component {
  static propTypes = {
    className: PropTypes.string,
    leftLabel: PropTypes.string.isRequired,
    rightLabel: PropTypes.string.isRequired,
    style: PropTypes.object.isRequired,
  };

  static defaultProps = {
    style: {},
  };

  render() {
    const { className, leftLabel, rightLabel, style } = this.props;

    return (
      <div className={classnames("dashed-line", className)} style={{ ...style }}>
        <span className="dashed-line__left-label">{leftLabel}</span>
        <span className="dashed-line__right-label">{rightLabel}</span>
      </div>
    );
  }
}

export default DashedLine;
