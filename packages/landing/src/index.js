import React from "react";
import ReactDOM from "react-dom";
import ReactGA from "react-ga";

import "sanitize.css/sanitize.css";
import "./vendor/devices.min.css";
import "./styles/index.scss";

import App from "./App";

if (process.env.NODE_ENV === "production") {
  ReactGA.initialize("UA-107325747-8");
} else {
  ReactGA.initialize("test", { testMode: true });
}
ReactGA.pageview(window.location.pathname + window.location.search);

ReactDOM.render(<App />, document.querySelector("#root"));
