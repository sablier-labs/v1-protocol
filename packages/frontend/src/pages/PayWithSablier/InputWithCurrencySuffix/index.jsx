import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

const initialState = {
  label: "",
  suffix: "",
  value: null,
};

class InputWithCurrencySuffix extends Component {
  constructor(props) {
    super(props);

    this.state = { ...initialState };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.suffix !== prevState.suffix) {
      return { suffix: nextProps.suffix };
    }
    return prevState;
  }

  onChange(e) {
    const { onChange, suffix } = this.props;
    let { value } = e.target;
    value = value.replace(" ", "");
    value = value.replace(suffix, "");

    if (value.startsWith("0") && /^(0|0\.(.)*)$/.test(value) === false) {
      value = "";
    }

    if (value.startsWith("-")) {
      value = "";
    }

    let label;
    // Match only integers or float formatted like $a.$b
    // e.g. 10.50 is okay, 10.50.50 is not
    if (/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(value)) {
      label = `${value} ${suffix}`;
    } else {
      value = "";
      label = "";
    }

    this.setState({
      label,
    });
    onChange(value, label);
  }

  /**
   * @dev The backspace character needs to be handled discretionarily because we want to
   *      clear one digit from the number, not the last letter of the token label.
   */
  onKeyDownPaymentRate(e) {
    if (e.keyCode !== 8) {
      return;
    }
    e.preventDefault();
    const { onChange, suffix } = this.props;
    let { value } = e.target;
    value = value.replace(" ", "");
    value = value.replace(suffix, "");
    value = value.substr(0, value.length - 1);
    const label = value ? `${value} ${suffix}` : "";
    this.setState({ label });
    onChange(value, label);
  }

  render() {
    const { className, id, name, suffix, type } = this.props;
    const { label } = this.state;

    return (
      <input
        autoComplete="off"
        className={classnames(className)}
        id={id}
        name={name}
        onChange={(e) => this.onChange(e)}
        onKeyDown={(e) => this.onKeyDownPaymentRate(e)}
        placeholder={`0 ${suffix}`}
        spellCheck={false}
        type={type || "text"}
        value={label}
      />
    );
  }
}

InputWithCurrencySuffix.propTypes = {
  className: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  suffix: PropTypes.string.isRequired,
  type: PropTypes.string,
};

InputWithCurrencySuffix.defaultProps = {
  className: "",
  id: "",
  name: "",
  type: "",
};

export default InputWithCurrencySuffix;
