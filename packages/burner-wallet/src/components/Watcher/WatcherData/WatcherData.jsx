import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import WatcherDataDigit from "./WatcherDataDigit/WatcherDataDigit";

import AssetDai from "../../../assets/ic_dai_default.svg";
import Config from "../../../config/Config";

import "./WatcherData.scss";

class WatcherData extends PureComponent {
  configureBalanceComponent = () => {
    // const value = Helper.standardizeNumber(this.props.streamed);

    const parts = String(this.props.streamed.toFixed(7)).split(Config.DEFAULT_DECIMAL_SEPARATOR);
    if (parts.length === 1) parts[1] = "0";

    const BC = [];
    const AC = [];

    // const beforeCommaLand = Math.max(parts[0].length > 3 ? parts[0].length : parts[1].length > 5 ? 3 : 4);
    // const afterCommaLand = Math.max(parts[0].length > 3 ? parts[1].length - 2 * (parts[0].length - 3) : 5, 5);

    let beforeCommaLand = 3;
    let afterCommaLand = 4;

    if (parts[0].length >= beforeCommaLand) {
      const added = parts[0].length - beforeCommaLand;
      beforeCommaLand = parts[0].length;
      afterCommaLand = Math.max(2, afterCommaLand - 2 * added); // for each big digit, we take out 2 small digits
    } else if (parts[1].length > afterCommaLand) {
      const added = parts[1].length - afterCommaLand;
      afterCommaLand = Math.max(parts[1].length, 7);
      beforeCommaLand = Math.max(3, Math.floor(beforeCommaLand - added / 2)); // for each big digit, we take out 2 small digits
    }

    [...Array(beforeCommaLand).keys()].forEach((element) => {
      BC.push({ index: element, size: 1, value: 0, active: false });
    });
    [...Array(afterCommaLand).keys()].forEach((element) => {
      AC.push({ index: element, size: 3, value: 0, active: false });
    });

    parts[0]
      .split("")
      .reverse()
      .forEach((digit, index) => {
        if (index < beforeCommaLand) {
          BC[index].active = true;
          BC[index].value = parseInt(digit, 10);
        }
      });

    parts[1].split("").forEach((digit, index) => {
      if (index < afterCommaLand) {
        AC[index].active = true;
        AC[index].value = parseInt(digit, 10);
      }
    });

    return (
      <>
        {BC.reverse().map((element) => (
          <WatcherDataDigit key={"ac-" + element.index} {...element} />
        ))}
        <div className="separator">
          <p>.</p>
        </div>
        {AC.map((element) => (
          <WatcherDataDigit key={"ac-" + element.index} {...element} />
        ))}
      </>
    );
  };

  render() {
    return (
      <div className="WatcherData">
        <div className="container">
          <div className="content">
            <div className="icon">
              <div className="content">
                <img src={AssetDai} alt="" />
              </div>
            </div>
            <div className="balance">
              <div className="content">{this.configureBalanceComponent()}</div>
            </div>
            <div className="info">
              <div className="content">
                <div className="total">
                  <p>/{this.props.total} DAI in total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

WatcherData.propTypes = {
  streamed: PropTypes.number.isRequired,
  withdrawn: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  streamedPercentage: PropTypes.number.isRequired,
  withdrawnPercentage: PropTypes.number.isRequired,
};

export default WatcherData;
