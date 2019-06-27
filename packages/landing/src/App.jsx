import React, { Component } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";

import Landing from "./pages/Landing";

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div>
          <Switch>
            <Route path="/" component={Landing} />
            <Redirect exact to="/" />
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
