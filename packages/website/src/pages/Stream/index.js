import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import ReactGA from "react-ga";
import ReactTooltip from "react-tooltip";

import { connect } from "react-redux";
import { push } from "connected-react-router";
import { withTranslation } from "react-i18next";

import CustomContentProgressBar from "../../components/CustomContentProgressBar";

import FaArrowCircleDown from "../../assets/images/fa-arrow-circle-down.svg";
import FaCalendarAlt from "../../assets/images/fa-calendar-alt.svg";
import FaCalendarCheck from "../../assets/images/fa-calendar-check.svg";
import FaEnvelope from "../../assets/images/fa-envelope.svg";
import FaHeartRate from "../../assets/images/fa-heart-rate.svg";
import FaInboxOut from "../../assets/images/fa-inbox-out.svg";
import FaInfoCircle from "../../assets/images/fa-info-circle.svg";
import FaStopwatch from "../../assets/images/fa-stopwatch.svg";
import FaTachometer from "../../assets/images/fa-tachometer.svg";
import FaTwitterBlack from "../../assets/images/fa-twitter-black.svg";
import PrimaryButton from "../../components/PrimaryButton";
import StopModal from "./StopModal";
import TokenLogo from "../../components/TokenLogo";
import WithdrawModal from "./WithdrawModal";

import { addPendingTx, selectors } from "../../redux/ducks/web3connect";
import { share } from "../../constants/links";

import "react-circular-progressbar/dist/styles.css";
import "./stream.scss";

class Stream extends Component {
  static propTypes = {
    account: PropTypes.string,
    addPendingTx: PropTypes.func.isRequired,
    balances: PropTypes.object.isRequired,
    networkId: PropTypes.number,
    push: PropTypes.func.isRequired,
    sablierAddress: PropTypes.string,
    selectors: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = {
    earned: 0,
    showStopModal: false,
    showWithdrawModal: false,
    streamId: "",
    stopTime: new Date(),
    totalValue: 0,
    withdrawable: 0,
    withdrawn: 0,
  };

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);

    const id = this.props.match.params.id;
    this.setState({ streamId: id });
  }

  goToDashboard() {
    const { push } = this.props;
    push("/dashboard");
  }

  onClickGoToDashboard() {
    this.goToDashboard();
  }

  onClickInviteYourFriends() {
    const { t } = this.props;
    const subject = encodeURIComponent(t("mailto.subject"));
    const body = encodeURIComponent(t("mailto.body"));
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto);
  }

  onClickStopAndWithdraw() {
    console.log("onClickStopAndWithdraw");
    this.setState({ showStopModal: true });
  }

  onClickTweetAboutSablier() {
    const { t } = this.props;
    const intent = `https://twitter.com/intent/tweet?url=${share.sablier}&text=${t("shareTwitterText")}`;
    window.open(intent, "_blank");
  }

  renderBalances() {
    const { t } = this.props;
    return (
      <div className="stream__balance-container">
        <div className="stream__balance-item">
          <div className="stream__balance-item__separator" />
          <div className="stream__balance-item__label-container">
            <span className="stream__balance-item__title-label">{t("earnedSoFar")}</span>
            <div className="stream__balance-item__value-container">
              <span className="stream__balance-item__value-label">594 DAI</span>
              <TokenLogo
                className="stream__balance-item__token-logo"
                address="0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725"
                size="32px"
              />
            </div>
          </div>
        </div>
        <div className="stream__balance-item" style={{ marginTop: "48px" }}>
          <div className="stream__balance-item__separator" />
          <div className="stream__balance-item__label-container">
            <span className="stream__balance-item__title-label">{t("totalValue")}</span>
            <div className="stream__balance-item__value-container">
              <span className="stream__balance-item__value-label">1,800 DAI</span>
              <TokenLogo
                className="stream__balance-item__token-logo"
                address="0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725"
                size="32px"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderStat(id, value, icon, tooltip) {
    const { t } = this.props;
    return (
      <div className="stream__stats-item">
        <div className="stream__stats-item__icon-container">
          <img className="stream__stats-item__icon" alt={t(id)} src={icon} />
        </div>
        <div className="stream__stats-item__label-container">
          <span className="stream__stats-item__title-label">{t(id)}</span>
          <span className="stream__stats-item__value-label">{value}</span>
        </div>
        <div className="spacer" />
        <div className="stream__stats-item__info-icon-container" data-tip={tooltip}>
          <img className="stream__stats-item__info-icon" alt={t("info")} src={FaInfoCircle} />
          <ReactTooltip className="stream__stats-item__tooltip" effect="solid" multiline={true} type="dark" />
        </div>
      </div>
    );
  }

  renderStream() {
    const { t } = this.props;

    const percentage = "33";

    return (
      <div className="stream__left-container">
        <div className="stream__stream-container">
          <div className="stream__circular-progress-bar-container">
            <CustomContentProgressBar className="stream__circular-progress-bar" percentage={percentage} strokeWidth={6}>
              <span className="stream__circular-progress-bar-percentage-label">{percentage}%</span>
              <span className="stream__circular-progress-bar-label">{t("streamed")}</span>
            </CustomContentProgressBar>
          </div>
          {this.renderBalances()}
        </div>
        <div className="stream__separator" />
        <div className="stream__stats-container">
          {this.renderStat("flow", "Incoming", FaArrowCircleDown, t("tooltip.flow"))}
          {this.renderStat("rate", "18 DAI per hour", FaHeartRate, t("tooltip.rate"))}
          {this.renderStat("age", "1 day 9 hours", FaCalendarAlt, t("tooltip.age"))}
          {this.renderStat("remaining", "2 days 19 hours", FaCalendarCheck, t("tooltip.remaining"))}
        </div>
      </div>
    );
  }

  renderActions() {
    const { t } = this.props;

    return (
      <div className="stream__action-container">
        <span className="stream__title-label">{t("action", { count: 3 })}</span>
        <div className="stream__button-container">
          <PrimaryButton
            classNames={classnames(["stream__button", "stream__action-container-button", "primary-button--white"])}
            icon={FaTachometer}
            label={t("goDashboard")}
            labelClassNames={classnames("primary-button__label--black")}
            onClick={() => this.onClickGoToDashboard()}
          />
          <PrimaryButton
            classNames={classnames(["stream__button", "stream__action-container-button"])}
            icon={FaInboxOut}
            label={t("withdraw")}
            onClick={() => this.setState({ showWithdrawModal: true })}
          />
          <PrimaryButton
            classNames={classnames(["stream__button", "stream__action-container-button", "primary-button--yellow"])}
            icon={FaStopwatch}
            label={t("stopAndWithdraw")}
            onClick={() => this.setState({ showStopModal: true })}
          />
        </div>
      </div>
    );
  }

  renderSocials() {
    const { t } = this.props;

    return (
      <div className="stream__social-container">
        <span className="stream__title-label">{t("social")}</span>
        <div className="stream__button-container">
          <PrimaryButton
            classNames={classnames(["stream__button", "stream__action-container-button", "primary-button--white"])}
            icon={FaTwitterBlack}
            label={t("tweetAboutSablier")}
            labelClassNames={classnames("primary-button__label--black")}
            onClick={() => this.onClickTweetAboutSablier()}
          />
          <PrimaryButton
            classNames={classnames(["stream__button", "stream__action-container-button", "primary-button--white"])}
            icon={FaEnvelope}
            label={t("inviteYourFriends")}
            labelClassNames={classnames("primary-button__label--black")}
            onClick={() => this.onClickInviteYourFriends()}
          />
        </div>
      </div>
    );
  }

  render() {
    const { earned, showStopModal, showWithdrawModal, stopTime, totalValue, withdrawable, withdrawn } = this.state;

    const tokenName = "DAI";
    return (
      <div className="stream">
        {this.renderStream()}
        <div className="stream__right-container">
          {this.renderActions()}
          {this.renderSocials()}
        </div>
        {!showWithdrawModal ? null : (
          <WithdrawModal
            earned={earned}
            onClose={() => this.setState({ showWithdrawModal: false })}
            tokenName={tokenName}
            withdrawable={withdrawable}
            withdrawn={withdrawn}
          />
        )}
        {!showStopModal ? null : (
          <StopModal
            stopTime={stopTime}
            onClose={() => this.setState({ showStopModal: false })}
            tokenName={tokenName}
            totalValue={totalValue}
            withdrawable={withdrawable}
          />
        )}
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    balances: state.web3connect.balances,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    networkId: state.web3connect.networkId,
    sablierAddress: state.addresses.sablierAddress,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addPendingTx: (id) => dispatch(addPendingTx(id)),
    push: (path) => dispatch(push(path)),
    selectors: () => dispatch(selectors()),
  }),
)(withTranslation()(Stream));
