import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import Loader from "../Loader";

import "./primary-button.scss";

class PrimaryButton extends Component {
  renderIcon() {
    const { icon, label } = this.props;

    if (!icon) {
      return <div className="primary-button__spacer-left" />;
    }

    return <img className="primary-button__icon" src={icon} alt={label} />;
  }

  render() {
    const { className, disabled, disabledWhileLoading, label, labelClassName, loading, onClick } = this.props;

    return (
      <button
        className={classnames(["primary-button", className], {
          "primary-button--disabled": disabledWhileLoading && loading,
        })}
        disabled={disabled || loading}
        onClick={() => onClick()}
        type="button"
      >
        {this.renderIcon()}
        {!loading ? (
          <span className={classnames("primary-button__label", labelClassName)}>{label}</span>
        ) : (
          <Loader className="primary-button__loader" />
        )}
        <div className="primary-button__spacer-right" />
      </button>
    );
  }
}

PrimaryButton.propTypes = {
  className: PropTypes.string,
  disabled: PropTypes.bool,
  disabledWhileLoading: PropTypes.bool,
  icon: PropTypes.string,
  label: PropTypes.string.isRequired,
  labelClassName: PropTypes.string,
  loading: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

PrimaryButton.defaultProps = {
  className: "",
  disabled: false,
  disabledWhileLoading: false,
  icon: "",
  labelClassName: "",
  loading: false,
};

export default PrimaryButton;
