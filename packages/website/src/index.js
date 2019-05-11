import React from "react";
import ReactDOM from "react-dom";
import ReactGA from "react-ga";

import { ApolloProvider } from "react-apollo";
import { Provider } from "react-redux";

import App from "./App";
import client from "./apollo/client";
import store from "./redux/store";

import "./i18n";
import "core-js/fn/object/assign";
import "sanitize.css/sanitize.css";

import "./styles/index.scss";

if (process.env.NODE_ENV === "production") {
  ReactGA.initialize("UA-xxxxxxxxxx");
}
ReactGA.pageview(window.location.pathname + window.location.search);

ReactDOM.render(
  <Provider store={store}>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </Provider>,
  document.querySelector("#root"),
);
