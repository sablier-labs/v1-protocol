import React, { Component } from "react";
import CircularProgressBar from "react-circular-progressbar";

class CustomCircularProgressBar extends Component {
  render() {
    const { children, ...otherProps } = this.props;
    return (
      // <div
      //   style={{
      //     position: "relative",
      //     width: "100%",
      //     height: "100%",
      //   }}
      // >
      <div>
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
          }}
        >
          <CircularProgressBar {...otherProps} />
        </div>
        <div
          style={{
            height: "100%",
            width: "100%",
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "absolute",
          }}
        >
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default CustomCircularProgressBar;
