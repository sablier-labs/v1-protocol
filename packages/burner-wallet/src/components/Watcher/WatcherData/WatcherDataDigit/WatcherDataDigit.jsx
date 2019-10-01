import React from "react";
import PropTypes from "prop-types";
import "./WatcherDataDigit.scss";

const WatcherDataDigit = (props) => {
  return (
    <div className="WatcherDataDigit" data-size={props.size} data-active={props.active}>
      <p>{parseInt(props.value, 10)}</p>
    </div>
  );
};

WatcherDataDigit.propTypes = {
  size: PropTypes.number,
  value: PropTypes.number.isRequired,
  active: PropTypes.bool,
};

WatcherDataDigit.defaultProps = {
  size: 1,
  active: false,
};

export default WatcherDataDigit;
