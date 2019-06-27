import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactTooltip from "react-tooltip";

import FaEnvelope from "../../assets/images/fa-envelope.svg";
import FaTwitterWhite from "../../assets/images/fa-twitter-white.svg";
import FaWhatsappWhite from "../../assets/images/fa-whatsapp-white.svg";
import Modal from "../Modal";

import "./referral-modal.scss";

class ReferralModal extends Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    referralUrl: PropTypes.string.isRequired,
  };

  static defaultProps = {
    onClose: () => {},
  };

  state = {
    spot: 0,
  };

  componentDidMount() {
    const number = Math.floor(Math.random() * 500) + 100;
    this.setState({
      spot: number,
    });
  }

  onClickTwitter() {
    const text = "Get early access to @SablierApp";
    const intent = `https://twitter.com/intent/tweet?url=${this.props.referralUrl}&text=${text}`;
    window.open(intent, "_blank");
  }

  onClickWhatsapp() {
    const text = encodeURIComponent(`Get early access to Sablier ${this.props.referralUrl}`);
    const intent = `https://web.whatsapp.com/send?text=${text}`;
    window.open(intent, "_blank");
  }

  onClickMail() {
    const subject = "Get Early Access to Sablier";
    const body = `It's an app that allows you to earn your salary by the minute ${this.props.referralUrl}`;
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto);
  }

  onClickUrl() {
    navigator.clipboard.writeText(this.props.referralUrl);

    ReactTooltip.show(this.copyButtonRef);
    setTimeout(() => {
      ReactTooltip.hide(this.copyButtonRef);
    }, 2000);
  }

  render() {
    return (
      <Modal onClose={() => this.props.onClose()}>
        <div className="referral-modal">
          <div className="referral-modal__title-label referral-modal__label">Your spot is reserved</div>
          <div className="referral-modal__number-label referral-modal__label">#{this.state.spot}</div>
          <div className="referral-modal__separator" />
          <div className="referral-modal__vip-label referral-modal__label">
            Become a VIP member by inviting your friends
          </div>
          <div
            ref={(ref) => (this.copyButtonRef = ref)}
            className="referral-modal__url-container"
            data-for="copyUrlTooltip"
            data-tip={"Copied"}
          >
            <div onClick={() => this.onClickUrl()}>{this.props.referralUrl}</div>
            <ReactTooltip
              className="referral-modal__tooltip"
              effect="solid"
              event="none"
              id="copyUrlTooltip"
              type="dark"
            />
          </div>
          <div className="referral-modal__social-media-container">
            <div
              className="referral-modal__social-media-item"
              onClick={() => this.onClickTwitter()}
              style={{ backgroundColor: "#38A1F3" }}
            >
              <img className="referral-modal__social-media-image" alt="Twitter" src={FaTwitterWhite} />
            </div>
            <div
              className="referral-modal__social-media-item"
              onClick={() => this.onClickWhatsapp()}
              style={{ backgroundColor: "#23D366" }}
            >
              <img className="referral-modal__social-media-image" alt="Twitter" src={FaWhatsappWhite} />
            </div>
            <div
              className="referral-modal__social-media-item"
              onClick={() => this.onClickMail()}
              style={{ backgroundColor: "#7D7D7D" }}
            >
              <img className="referral-modal__social-media-image" alt="Mail" src={FaEnvelope} />
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

export default ReferralModal;
