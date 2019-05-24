import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./loader.scss";

class Loader extends Component {
  static propTypes = {
    className: PropTypes.string,
    delay: PropTypes.number,
  };

  static defaultProps = {
    delay: 0,
  };

  state = {
    hidden: true,
  };

  componentDidMount() {
    const { delay } = this.props;

    if (delay === 0) {
      this.setState({ hidden: false });
    }

    this.timeout = setTimeout(() => {
      this.setState({ hidden: false });
    }, delay);
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    const { className } = this.props;
    const { hidden } = this.state;

    if (hidden) {
      return null;
    }

    return <div className={classnames(["loader", className])} />;
  }
}

export default Loader;
