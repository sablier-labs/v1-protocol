import React, { Component } from "react";
import CircularProgressBar from "react-circular-progressbar";

class CustomContentProgressBar extends Component {
  render() {
    const { children, ...otherProps } = this.props;
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        <div style={{ position: "absolute" }}>
          <CircularProgressBar {...otherProps} />
        </div>
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default CustomContentProgressBar;
