import React, { Component } from "react";
import PropTypes from "prop-types";

import EthereumLogo from "../../assets/images/ethereum-logo.svg";

const RINKEBY_TOKEN_MAP = {
  "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725": "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
};

const TOKEN_ICON_API = "https://raw.githubusercontent.com/TrustWallet/tokens/master/tokens";
const BAD_IMAGES = {};
export default class TokenLogo extends Component {
  static propTypes = {
    address: PropTypes.string,
    size: PropTypes.string,
    className: PropTypes.string,
  };

  static defaultProps = {
    address: "",
    size: "20px",
    className: "",
  };

  state = {
    error: false,
  };

  render() {
    const { address, size, className } = this.props;
    let path = "";
    const mainAddress = RINKEBY_TOKEN_MAP[address] ? RINKEBY_TOKEN_MAP[address] : address;

    if (mainAddress === "ETH") {
      path = EthereumLogo;
    }

    if (!this.state.error && !BAD_IMAGES[mainAddress] && mainAddress !== "ETH") {
      path = `${TOKEN_ICON_API}/${mainAddress.toLowerCase()}.png`;
    }

    if (!path) {
      return (
        <div className={className} style={{ width: size, fontSize: size }}>
          <span role="img" aria-label="Not Found">
            🤔
          </span>
        </div>
      );
    }

    return (
      <img
        src={path}
        alt="emoji"
        className={className}
        style={{
          width: size,
          height: size,
        }}
        onError={() => {
          this.setState({ error: true });
          BAD_IMAGES[mainAddress] = true;
        }}
      />
    );
  }
}
