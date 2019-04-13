import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

// import { withTranslation } from "react-i18next";

import "./primary-button.scss";

class PrimaryButton extends Component {
  static propTypes = {
    classNames: PropTypes.string,
    disabled: PropTypes.bool,
    icon: PropTypes.string,
    label: PropTypes.string.isRequired,
    labelClassNames: PropTypes.string,
    onClick: PropTypes.func,
  };

  renderIcon() {
    const { icon, label } = this.props;

    if (!icon) {
      return <div className="primary-button__spacer-left" />;
    }

    return <img className="primary-button__icon" src={icon} alt={label} />;
  }

  render() {
    const { label, onClick } = this.props;

    return (
      <button
        className={classnames("primary-button", this.props.classNames)}
        disabled={false}
        onClick={() => onClick()}
      >
        {this.renderIcon()}
        <span className={classnames("primary-button__label", this.props.labelClassNames)}>{label}</span>
        <div className="primary-button__spacer-right" />
      </button>
    );
  }
}

export default PrimaryButton;
