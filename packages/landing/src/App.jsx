import React from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";

import Landing from "./pages/Landing";

export default () => {
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
};
