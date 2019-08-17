import React, { Component } from "react";
import classnames from "classnames";
// import uuidv4 from "uuid/v4";
import validator from "validator";

import Loader from "../../components/Loader";
import Logotype from "../../assets/images/logotype.png";
import iPhoneScreenshot from "../../assets/images/screenshot.png";
import ReferralModal from "../../components/ReferralModal";

import "./landing.scss";

const initialState = {
  email: "",
  error: "",
  showReferralModal: false,
};

function generateRandomString() {
  return (
    Math.random()
      .toString(36)
      .substring(2, 6) +
    Math.random()
      .toString(36)
      .substring(2, 6)
  );
}

class Landing extends Component {
  constructor(props) {
    super(props);

    this.state = { ...initialState };
  }

  onChangeState(e) {
    this.setState({
      [e.target.name]: e.target.value,
    });
  }

  onSubmit(e) {
    e.preventDefault();

    const { email, loading } = this.state;

    if (loading) {
      return;
    }

    if (!validator.isEmail(email)) {
      this.setState({
        error: "Please enter your email address",
      });
      return;
    }

    this.setState({
      loading: true,
    });
    setTimeout(() => {
      this.emailRef.value = "";
      this.setState({
        loading: false,
        referralUrl: `https://sablier.app/r?=${generateRandomString()}`,
        showReferralModal: true,
      });
    }, 750);
  }

  render() {
    const { error, loading, referralUrl, showReferralModal } = this.state;

    return (
      <div className="landing">
        <div className="landing__header-container">
          <img className="landing__header-container__logo" alt="Logo" src={Logotype} />
          <div className="landing__menu-container">
            <a
              className="landing__menu-item"
              href="https://twitter.com/PaulRBerg/status/1134773451888238592"
              rel="noopener noreferrer"
              target="_blank"
            >
              About
            </a>
            <a className="landing__menu-item" href="https://beta.sablier.app" rel="noopener noreferrer" target="_blank">
              Beta
            </a>
            <a
              className="landing__menu-item"
              href="https://twitter.com/SablierHQ"
              rel="noopener noreferrer"
              target="_blank"
            >
              Twitter
            </a>
            <a className="landing__menu-item" href="https://t.me/sablier" rel="noopener noreferrer" target="_blank">
              Telegram
            </a>
          </div>
        </div>
        <div className="landing__content-container">
          <div className="landing__registration-container">
            <div className="landing__label-container">
              <span className="landing__title-label">
                Earn your <br />
                salary by the minute.
              </span>
              <span className="landing__subtitle-label">
                Paydays don&apos;t make sense any more. Sign up below to have instant access to your earnings through a
                decentralized app built on Ethereum.
              </span>
            </div>
            <div className="landing__form-container">
              <div
                className={classnames("landing__error-container", {
                  "landing__error-container--disabled": !error,
                })}
              >
                {error}
              </div>

              <form className="landing__submit-container" name="Early Access Form" onSubmit={(e) => this.onSubmit(e)}>
                <input
                  className="landing__email-input"
                  name="email"
                  onChange={(value) => this.onChangeState(value)}
                  placeholder="Work Email"
                  ref={(ref) => {
                    this.emailRef = ref;
                  }}
                  required
                  type="email"
                />
                {!loading ? (
                  <input className="landing__submit-button" type="submit" name="submit" value="Get early access" />
                ) : (
                  <div className="landing__submit-button">
                    <Loader className="landing__loader" />
                  </div>
                )}
              </form>
            </div>
          </div>
          <div className="spacer" />
          <div className="landing__device-container">
            <div className="device device-iphone-x">
              <div className="device-frame">
                <img className="device-content" src={iPhoneScreenshot} alt="Screenshot" />
              </div>
              <div className="device-stripe" />
              <div className="device-header" />
              <div className="device-sensors" />
              <div className="device-btns" />
              <div className="device-power" />
            </div>
          </div>
        </div>
        {showReferralModal ? (
          <ReferralModal onClose={() => this.setState({ showReferralModal: false })} referralUrl={referralUrl} />
        ) : null}
      </div>
    );
  }
}

export default Landing;
