import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import Loader from "../Loader";

import "./primary-button.scss";

class PrimaryButton extends Component {
  static propTypes = {
    className: PropTypes.string,
    disabled: PropTypes.bool,
    disabledWhileLoading: PropTypes.bool,
    icon: PropTypes.string,
    label: PropTypes.string.isRequired,
    labelClassName: PropTypes.string,
    loading: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
  };

  static defaultProps = {
    disabledWhileLoading: false,
  };
  
  renderIcon() {
    const { icon, label } = this.props;

    if (!icon) {
      return <div className="primary-button__spacer-left" />;
    }

    return <img className="primary-button__icon" src={icon} alt={label} />;
  }

  render() {
    const { disabled, disabledWhileLoading, label, loading, onClick } = this.props;

    return (
      <button
        className={classnames(["primary-button", this.props.className], {
          "primary-button--disabled": disabledWhileLoading && loading,
        })}
        disabled={disabled || loading}
        onClick={() => onClick()}
      >
        {this.renderIcon()}
        {!loading ? (
          <span className={classnames("primary-button__label", this.props.labelClassName)}>{label}</span>
        ) : (
          <Loader className="primary-button__loader" />
        )}
        <div className="primary-button__spacer-right" />
      </button>
    );
  }
}

export default PrimaryButton;
