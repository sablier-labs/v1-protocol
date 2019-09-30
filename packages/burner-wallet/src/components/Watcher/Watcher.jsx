import React, { Component } from "react";
import PropTypes from "prop-types";

import WatcherData from "./WatcherData/WatcherData";
import WatcherExtra from "./WatcherExtra/WatcherExtra";
import WatcherProgress from "./WatcherProgress/WatcherProgress";

import "./Watcher.scss";

class Watcher extends Component {
  computeData = () => {
    const data = { ...this.props };
    data.totalPercentage = 100;
    data.streamedPercentage = (this.props.streamed * 100) / this.props.total;
    data.withdrawnPercentage = (this.props.withdrawn * 100) / this.props.total;
    return data;
  };

  render() {
    const data = this.computeData();

    return (
      <div className="Watcher">
        <div className="container" style={{ width: this.props.size }}>
          <div className="content">
            <div className="top">
              <div className="content" style={{ width: this.props.size - 20, height: this.props.size - 20 }}>
                <WatcherProgress {...data} />
                <WatcherData {...data} />
              </div>
            </div>
            <div className="bottom">
              <div className="content">
                <WatcherExtra {...data} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Watcher.propTypes = {
  total: PropTypes.number.isRequired,
  streamed: PropTypes.number.isRequired,
  withdrawn: PropTypes.number.isRequired,

  time: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  timeRemaining: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

  size: PropTypes.number,
};

Watcher.defaultProps = {
  size: 450,
};

export default Watcher;
