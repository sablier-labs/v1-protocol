import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import "./Loader.scss";

class Loader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hidden: true,
    };
  }

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

    return <div className={classnames(["Loader", className])} />;
  }
}

Loader.propTypes = {
  className: PropTypes.string,
  delay: PropTypes.number,
};

Loader.defaultProps = {
  className: "",
  delay: 0,
};

export default Loader;
