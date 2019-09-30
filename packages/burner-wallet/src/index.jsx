import React from "react";
import ReactDOM from "react-dom";
import ReactGA from "react-ga";

import "./index.css";
import App from "./App";

if (process.env.NODE_ENV === "production") {
  ReactGA.initialize("UA-107325747-8");
} else {
  ReactGA.initialize("test", { testMode: true });
}

ReactDOM.render(<App />, document.getElementById("root"));
