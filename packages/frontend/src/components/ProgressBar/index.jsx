import React from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./progress-bar.scss";

const ProgressBar = (props) => {
  const { className, fillerClassName, percentage } = props;

  return (
    <div className={classnames("progress-bar", className)}>
      <div className={classnames("progress-bar__filler", fillerClassName)} style={{ width: `${percentage}%` }} />
    </div>
  );
};

ProgressBar.propTypes = {
  className: PropTypes.string,
  percentage: PropTypes.number.isRequired,
  fillerClassName: PropTypes.string,
};

ProgressBar.defaultProps = {
  className: "",
  fillerClassName: "",
};

export default ProgressBar;
