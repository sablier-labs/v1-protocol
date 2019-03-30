import React from "react";
import ReactDOM from "react-dom";
import ReactGA from "react-ga";

import { Provider } from "react-redux";

import App from "./views/App";
import store from "./redux/store"

import "./i18n";
// import "bootstrap/dist/css/bootstrap.min.css";
import "sanitize.css/sanitize.css";
import "./styles/index.scss";

if (process.env.NODE_ENV === "production") {
  ReactGA.initialize("UA-xxxxxxxxxx");
}
ReactGA.pageview(window.location.pathname + window.location.search);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.querySelector("#root"),
);
