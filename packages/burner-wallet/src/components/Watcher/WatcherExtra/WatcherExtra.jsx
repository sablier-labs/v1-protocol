import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import "./WatcherExtra.scss";

import ConfigStyle from "../../../config/Config.scss";
import { Helper } from "../../../config/Util";

class WatcherExtra extends PureComponent {
  render() {
    return (
      <div className="WatcherExtra">
        <div className="container">
          <div className="content">
            <div className="info">
              <div className="container">
                <div className="content">
                  <div className="progress" title={this.props.streamedPercentage + "%"}>
                    <div className="content">
                      <div className="title">
                        <div className="content">
                          <p>
                            <span>Streamed:</span>
                            {Helper.standardizeNumber(this.props.streamed)}
                          </p>
                        </div>
                      </div>
                      <div className="line">
                        <div className="content">
                          <svg viewBox="0 0 100 6">
                            <defs>
                              <linearGradient
                                id="gradientSecondary"
                                x1="0%"
                                x2="100%"
                                y1="0%"
                                y2="100%"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop offset="0%" stopColor={ConfigStyle.colorSecondary} stopOpacity="100%" />
                                <stop offset="100%" stopColor={ConfigStyle.colorSecondarySupport} stopOpacity="100%" />
                              </linearGradient>
                            </defs>

                            <path
                              d="M 3 3 97 3"
                              stroke={ConfigStyle.colorBorder}
                              strokeWidth="4.6"
                              strokeLinecap="round"
                            />
                            <path d="M 3 3 97 3" stroke="white" strokeWidth="4" strokeLinecap="round" />
                            <path
                              d="M 3 3 1197 3"
                              fill="none"
                              stroke="url(#gradientSecondary)"
                              strokeWidth="4"
                              strokeDasharray={`${this.props.streamedPercentage}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="progress" title={this.props.withdrawnPercentage + "%"}>
                    <div className="content">
                      <div className="title">
                        <div className="content">
                          <p>
                            <span>Withdrawn:</span>
                            {Helper.standardizeNumber(this.props.withdrawn)}
                          </p>
                        </div>
                      </div>
                      <div className="line">
                        <div className="content">
                          <svg viewBox="0 0 100 6">
                            <defs>
                              <linearGradient
                                id="gradientPrimary"
                                x1="0%"
                                x2="100%"
                                y1="0%"
                                y2="100%"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop offset="0%" stopColor={ConfigStyle.colorPrimary} stopOpacity="100%" />
                                <stop offset="100%" stopColor={ConfigStyle.colorPrimarySupport} stopOpacity="100%" />
                              </linearGradient>
                            </defs>

                            <path
                              d="M 3 3 97 3"
                              stroke={ConfigStyle.colorBorder}
                              strokeWidth="4.6"
                              strokeLinecap="round"
                            />
                            <path d="M 3 3 97 3" stroke="white" strokeWidth="4" strokeLinecap="round" />
                            <path
                              d="M 3 3 1197 3"
                              fill="none"
                              stroke="url(#gradientPrimary)"
                              strokeWidth="4"
                              strokeDasharray={`${this.props.withdrawnPercentage}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="withdrawButton">
              <div className="container">
                <div className="content">
                  <p>
                    <span>Withdraw</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

WatcherExtra.propTypes = {
  streamed: PropTypes.number.isRequired,
  withdrawn: PropTypes.number.isRequired,
  streamedPercentage: PropTypes.number.isRequired,
  withdrawnPercentage: PropTypes.number.isRequired,
};

export default WatcherExtra;
