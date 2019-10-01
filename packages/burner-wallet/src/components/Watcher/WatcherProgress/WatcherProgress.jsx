/* eslint-disable max-len */
import React, { PureComponent } from "react";
import PropTypes from "prop-types";
// import "./WatcherProgress.scss";
import ConfigStyle from "./WatcherProgress.scss";

class WatcherProgress extends PureComponent {
  /**
   * To keep the value proportional to 100%, we choose a CIRCUMFERENCE of 100
   */
  static STREAM_WATCHER_CIRCUMFERENCE = 100;

  static STREAM_WATCHER_RADIUS = WatcherProgress.STREAM_WATCHER_CIRCUMFERENCE / (2 * Math.PI);

  static STREAM_WATCHER_DIAMETER = WatcherProgress.STREAM_WATCHER_RADIUS * 2;

  static STREAM_WATCHER_STROKE_WIDTH = 1.2;

  static STREAM_WATCHER_CONTAINER_SPACER = 3; // will get cut in half

  static STREAM_WATCHER_DIVIDER_STROKE_WIDTH = 0.05;

  /**
   * The size of the container will be a bit bigger than the acutal circle, in order to make room for the stroke (will be centered-to-path)
   */

  static STREAM_WATCHER_CONTAINER_WIDTH =
    WatcherProgress.STREAM_WATCHER_DIAMETER + WatcherProgress.STREAM_WATCHER_CONTAINER_SPACER;

  static STREAM_WATCHER_CONTAINER_HEIGHT = WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH;

  /**
   * Starting Point (The starting point of the stroke top-center)
   * X : the middle of the container (same with the center of the circle)
   * Y : this middle of the top space left between the circle and the container
   */

  static STREAM_WATCHER_POINT_START_X = WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH / 2;

  static STREAM_WATCHER_POINT_START_Y =
    (WatcherProgress.STREAM_WATCHER_CONTAINER_HEIGHT - WatcherProgress.STREAM_WATCHER_DIAMETER) / 2;

  static STREAM_WATCHER_POINT_CENTER_X = WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH / 2;

  static STREAM_WATCHER_POINT_CENTER_Y = WatcherProgress.STREAM_WATCHER_POINT_CENTER_X;

  /**
   * For a circle, we'll use 2 arches and stick them together
   * Now, for the inner circle we need to play with the viewbox in order to scale it down
   * (so we keep the calculations from before)
   * Obs: The increase in size delivers a decrease in actual viewing size (fitting more px in a tighter spot)
   */

  static STREAM_WATCHER_INNER_CONTAINER_MARGIN_TO_OUTSIDE =
    WatcherProgress.STREAM_WATCHER_CONTAINER_SPACER / 2 + // the left white space between the primary container and the primary watcher
    WatcherProgress.STREAM_WATCHER_STROKE_WIDTH / 2 + // the stroke width of the primary watcher (the center-to-bottom half)
    WatcherProgress.STREAM_WATCHER_DIVIDER_STROKE_WIDTH * 2 + // the divider's stroke
    WatcherProgress.STREAM_WATCHER_STROKE_WIDTH - // another imaginary 'watcher' for spacing
    0.2; // for good measurement

  constructor(props) {
    super(props);
    this.state = {
      streamedPercentage: 0,
      withdrawnPercentage: 0,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const obj = { ...prevState };
    if (nextProps.withdrawnPercentage > prevState.withdrawnPercentage + 0.5)
      obj.withdrawnPercentage = nextProps.withdrawnPercentage;
    if (nextProps.streamedPercentage > prevState.streamedPercentage + 0.5)
      obj.streamedPercentage = nextProps.streamedPercentage;

    return obj;
  }

  render() {
    return (
      <div className="WatcherProgress">
        <svg
          viewBox={`0 0 ${WatcherProgress.STREAM_WATCHER_CONTAINER_HEIGHT} ${WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH} `}
        >
          <defs>
            <linearGradient id="primaryGradient" gradientTransform="rotate(90)" gradientUnits="userSpaceOnUse">
              <stop offset="0%" style={{ stopColor: ConfigStyle.colorPrimary, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: ConfigStyle.colorPrimarySupport, stopOpacity: 1 }} />
            </linearGradient>

            <linearGradient id="secondaryGradient" gradientTransform="rotate(90)" gradientUnits="userSpaceOnUse">
              <stop offset="0%" style={{ stopColor: ConfigStyle.colorSecondary, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: ConfigStyle.colorSecondarySupport, stopOpacity: 1 }} />
            </linearGradient>

            <circle
              id="backgroundDrawingClip"
              cx={WatcherProgress.STREAM_WATCHER_POINT_CENTER_X}
              cy={WatcherProgress.STREAM_WATCHER_POINT_CENTER_Y}
              r={WatcherProgress.STREAM_WATCHER_RADIUS - WatcherProgress.STREAM_WATCHER_STROKE_WIDTH / 2}
              fill="white"
              stroke={ConfigStyle.colorBorder}
              strokeWidth={WatcherProgress.STREAM_WATCHER_DIVIDER_STROKE_WIDTH}
            />
          </defs>

          <circle
            cx={WatcherProgress.STREAM_WATCHER_POINT_CENTER_X}
            cy={WatcherProgress.STREAM_WATCHER_POINT_CENTER_Y}
            r={WatcherProgress.STREAM_WATCHER_RADIUS + WatcherProgress.STREAM_WATCHER_STROKE_WIDTH / 2}
            fill="white"
            stroke={ConfigStyle.colorBorder}
            strokeWidth={WatcherProgress.STREAM_WATCHER_DIVIDER_STROKE_WIDTH}
          />

          <circle
            cx={WatcherProgress.STREAM_WATCHER_POINT_CENTER_X}
            cy={WatcherProgress.STREAM_WATCHER_POINT_CENTER_Y}
            r={WatcherProgress.STREAM_WATCHER_RADIUS - WatcherProgress.STREAM_WATCHER_STROKE_WIDTH / 2}
            fill="white"
            stroke={ConfigStyle.colorBorder}
            strokeWidth={WatcherProgress.STREAM_WATCHER_DIVIDER_STROKE_WIDTH}
          />

          <path
            d={`
                  M ${WatcherProgress.STREAM_WATCHER_POINT_START_X} ${WatcherProgress.STREAM_WATCHER_POINT_START_Y}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 ${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 -${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  `}
            fill="none"
            stroke={ConfigStyle.colorBackground}
            strokeWidth={`${WatcherProgress.STREAM_WATCHER_STROKE_WIDTH}`}
            strokeDasharray="0,100"
            strokeLinecap="round"
            className="watcherProgressAnimatorStream"
          />

          <path
            d={`
                  M ${WatcherProgress.STREAM_WATCHER_POINT_START_X} ${WatcherProgress.STREAM_WATCHER_POINT_START_Y}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 ${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 -${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  `}
            fill="none"
            stroke="url(#secondaryGradient)"
            strokeWidth={`${WatcherProgress.STREAM_WATCHER_STROKE_WIDTH}`}
            strokeDasharray={`${Math.max(this.state.streamedPercentage, 1)}, 100`}
            strokeLinecap="round"
            className="watcherProgressStreamed"
          />
          <svg
            viewBox={`
                -${WatcherProgress.STREAM_WATCHER_INNER_CONTAINER_MARGIN_TO_OUTSIDE}
                -${WatcherProgress.STREAM_WATCHER_INNER_CONTAINER_MARGIN_TO_OUTSIDE}
                ${WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH +
                  WatcherProgress.STREAM_WATCHER_INNER_CONTAINER_MARGIN_TO_OUTSIDE * 2}
                ${WatcherProgress.STREAM_WATCHER_CONTAINER_WIDTH +
                  WatcherProgress.STREAM_WATCHER_INNER_CONTAINER_MARGIN_TO_OUTSIDE * 2}
                `}
          >
            <path
              d={`
            M ${WatcherProgress.STREAM_WATCHER_POINT_START_X} ${WatcherProgress.STREAM_WATCHER_POINT_START_Y}
            a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 ${WatcherProgress.STREAM_WATCHER_DIAMETER}
            a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 -${WatcherProgress.STREAM_WATCHER_DIAMETER}
            `}
              fill="none"
              stroke={ConfigStyle.colorBackground}
              strokeWidth={`${WatcherProgress.STREAM_WATCHER_STROKE_WIDTH + 0.2}`}
              strokeDasharray="0,100"
              strokeLinecap="round"
              className="watcherProgressAnimatorWithdraw"
            />

            <path
              d={`
                  M ${WatcherProgress.STREAM_WATCHER_POINT_START_X} ${WatcherProgress.STREAM_WATCHER_POINT_START_Y}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 ${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  a ${WatcherProgress.STREAM_WATCHER_RADIUS} ${WatcherProgress.STREAM_WATCHER_RADIUS} 0 0 1 0 -${WatcherProgress.STREAM_WATCHER_DIAMETER}
                  `}
              fill="none"
              stroke="url(#primaryGradient)"
              strokeWidth={`${WatcherProgress.STREAM_WATCHER_STROKE_WIDTH + 0.2}`}
              strokeDasharray={`${this.state.withdrawnPercentage}, 100`}
              strokeLinecap="round"
              className="watcherProgressWithdrawn"
            />
          </svg>
        </svg>
      </div>
    );
  }
}

WatcherProgress.propTypes = {
  streamedPercentage: PropTypes.number.isRequired,
  withdrawnPercentage: PropTypes.number.isRequired,
};

export default WatcherProgress;
