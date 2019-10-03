import React from "react";

import TwitterLogo from "../../assets/twitter_logo.png";

import "./FollowUsOnTwitter.scss";

function FollowUsOnTwitter({ burnerComponents }) {
  const { Page } = burnerComponents;

  return (
    <Page title="Follow Us">
      <div className="FollowUsOnTwitterContainer">
        <a href="https://twitter.com/sablierhq" rel="noopener noreferrer" target="_blank">
          <img src={TwitterLogo} alt="Twitter Logo" width="188px" height="188px" />
        </a>
      </div>
    </Page>
  );
}

export default FollowUsOnTwitter;
