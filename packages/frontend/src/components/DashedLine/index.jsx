import React from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./dashed-line.scss";

const DashedLine = (props) => {
  const { className, leftLabel, rightLabel, style } = props;
  return (
    <div className={classnames("dashed-line", className)} style={{ ...style }}>
      <span className="dashed-line__left-label">{leftLabel}</span>
      <span className="dashed-line__right-label">{rightLabel}</span>
    </div>
  );
};

DashedLine.propTypes = {
  className: PropTypes.string,
  leftLabel: PropTypes.string.isRequired,
  rightLabel: PropTypes.string.isRequired,
  style: PropTypes.shape({
    marginBottom: PropTypes.string,
    marginTop: PropTypes.string,
  }),
};

DashedLine.defaultProps = {
  className: "",
  style: {},
};

export default DashedLine;
