import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactTooltip from "react-tooltip";

import FaEnvelope from "../../assets/images/fa-envelope.svg";
import FaTwitterWhite from "../../assets/images/fa-twitter-white.svg";
import FaWhatsappWhite from "../../assets/images/fa-whatsapp-white.svg";
import Modal from "../Modal";

import "./referral-modal.scss";

class ReferralModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      spot: 0,
    };
  }

  componentDidMount() {
    const number = Math.floor(Math.random() * 500) + 100;
    this.setState({
      spot: number,
    });
  }

  onClickTwitter() {
    const { referralUrl } = this.props;
    const text = "Get early access to @SablierHQ";
    const intent = `https://twitter.com/intent/tweet?url=${referralUrl}&text=${text}`;
    window.open(intent, "_blank");
  }

  onClickWhatsapp() {
    const { referralUrl } = this.props;
    const text = encodeURIComponent(`Get early access to Sablier ${referralUrl}`);
    const intent = `https://web.whatsapp.com/send?text=${text}`;
    window.open(intent, "_blank");
  }

  onClickMail() {
    const { referralUrl } = this.props;
    const subject = "Get Early Access to Sablier";
    const body = `It's a decentralized app for real-time salaries ${referralUrl}`;
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto);
  }

  onClickUrl() {
    const { referralUrl } = this.props;
    navigator.clipboard.writeText(referralUrl);

    ReactTooltip.show(this.copyButtonRef);
    setTimeout(() => {
      ReactTooltip.hide(this.copyButtonRef);
    }, 2000);
  }

  render() {
    const { onClose, referralUrl } = this.props;
    const { spot } = this.state;

    return (
      <Modal onClose={() => onClose()}>
        <div className="referral-modal">
          <div className="referral-modal__title-label referral-modal__label">Your spot is reserved</div>
          <div className="referral-modal__number-label referral-modal__label">#{spot}</div>
          <div className="referral-modal__separator" />
          <div className="referral-modal__vip-label referral-modal__label">
            Become a VIP member by inviting your friends
          </div>
          <div
            ref={(ref) => {
              this.copyButtonRef = ref;
            }}
            className="referral-modal__url-container"
            data-for="copyUrlTooltip"
            data-tip="Copied"
          >
            <div onClick={() => this.onClickUrl()} onKeyDown={() => this.onClickUrl()} role="button" tabIndex={-1}>
              {referralUrl}
            </div>
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
              onKeyDown={() => this.onClickTwitter()}
              role="button"
              style={{ backgroundColor: "#38A1F3" }}
              tabIndex={0}
            >
              <img className="referral-modal__social-media-image" alt="Twitter" src={FaTwitterWhite} />
            </div>
            <div
              className="referral-modal__social-media-item"
              onClick={() => this.onClickWhatsapp()}
              onKeyDown={() => this.onClickWhatsapp()}
              role="button"
              style={{ backgroundColor: "#23D366" }}
              tabIndex={0}
            >
              <img className="referral-modal__social-media-image" alt="Twitter" src={FaWhatsappWhite} />
            </div>
            <div
              className="referral-modal__social-media-item"
              onClick={() => this.onClickMail()}
              onKeyDown={() => this.onClickMail()}
              role="button"
              style={{ backgroundColor: "#7D7D7D" }}
              tabIndex={0}
            >
              <img className="referral-modal__social-media-image" alt="Mail" src={FaEnvelope} />
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

ReferralModal.propTypes = {
  onClose: PropTypes.func,
  referralUrl: PropTypes.string.isRequired,
};

ReferralModal.defaultProps = {
  onClose: () => {},
};

export default ReferralModal;
