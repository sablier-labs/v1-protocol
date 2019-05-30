import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import ReactGA from "react-ga";
import ReactTooltip from "react-tooltip";

import { connect } from "react-redux";
import { push } from "connected-react-router";
import { Query } from "react-apollo";
import { withTranslation } from "react-i18next";

import CustomCircularProgressBar from "./CustomCircularProgressBar";
import FaArrowCircleDown from "../../assets/images/fa-arrow-circle-down.svg";
import FaArrowCircleUp from "../../assets/images/fa-arrow-circle-up.svg";
import FaCalendarAlt from "../../assets/images/fa-calendar-alt.svg";
import FaCalendarCheck from "../../assets/images/fa-calendar-check.svg";
import FaEnvelope from "../../assets/images/fa-envelope.svg";
import FaExclamationSquare from "../../assets/images/fa-exclamation-square.svg";
import FaHeartRate from "../../assets/images/fa-heart-rate.svg";
import FaInfoCircle from "../../assets/images/fa-info-circle.svg";
import FaPaste from "../../assets/images/fa-paste.svg";
import FaPlus from "../../assets/images/fa-plus.svg";
import FaShieldCheck from "../../assets/images/fa-shield-check.svg";
import FaTachometer from "../../assets/images/fa-tachometer.svg";
import FaTwitterBlack from "../../assets/images/fa-twitter-black.svg";
import Link from "../../components/Link";
import links from "../../constants/links";
import LastPanelButton from "./LastPanelButton";
import Loader from "../../components/Loader";
import ModalWithImage from "../../components/ModalWithImage";
import PrimaryButton from "../../components/PrimaryButton";
import RedeemModal from "./RedeemModal";
import TokenLogo from "../../components/TokenLogo";
import WithdrawModal from "./WithdrawModal";

import { GET_STREAM } from "../../apollo/queries";
import { getEtherscanAddressLink } from "../../helpers/web3-utils";
import { Parser } from "../../classes/parser";
import { StreamFlow, StreamStatus } from "../../classes/stream";

import "react-circular-progressbar/dist/styles.css";
import "./stream.scss";

const StatItem = ({ icon, label, tooltip, value }) => (
  <div className="stream__stats-item">
    <div className="stream__stats-item__icon-container">
      <img className="stream__stats-item__icon" alt={label} src={icon} />
    </div>
    <div className="stream__stats-item__label-container">
      <span className="stream__stats-item__title-label">{label}</span>
      <span className="stream__stats-item__value-label">{value}</span>
    </div>
    <div className="spacer" />
    <div className="stream__stats-item__info-icon-container" data-for="stats-tooltip" data-tip={tooltip}>
      <img className="stream__stats-item__info-icon" alt="Info" src={FaInfoCircle} />
    </div>
  </div>
);

const StatItemWithLink = ({ icon, label, link, tooltip, value }) => (
  <div className="stream__stats-item" style={{ marginTop: "0px" }}>
    <div className="stream__stats-item__icon-container">
      <img className="stream__stats-item__icon" alt={label} src={icon} />
    </div>
    <div className="stream__stats-item__label-container">
      <span className="stream__stats-item__title-label">{label}</span>
      <Link className="stream__stats-item__value-label" target="_blank" to={link}>
        {value}
      </Link>
    </div>
    <div className="spacer" />
    <div className="stream__stats-item__info-icon-container" data-for="stats-tooltip" data-tip={tooltip}>
      <img className="stream__stats-item__info-icon" alt="Info" src={FaInfoCircle} />
    </div>
  </div>
);

const Funds = ({ downLabel, stream, topLabel }) => (
  <div className="stream__funds-container">
    <div className="stream__funds-item">
      <div className="stream__funds-item__separator" />
      <div className="stream__funds-item__label-container">
        <span className="stream__funds-item__title-label">{topLabel}</span>
        <div className="stream__funds-item__value-container">
          <span className="stream__funds-item__value-label">
            {stream.funds.paid.toLocaleString()} {stream.token.symbol}
          </span>
          <TokenLogo className="stream__funds-item__token-logo" address={stream.token.address} size="32px" />
        </div>
      </div>
    </div>
    <div className="stream__funds-item" style={{ marginTop: "48px" }}>
      <div className="stream__funds-item__separator" />
      <div className="stream__funds-item__label-container">
        <span className="stream__funds-item__title-label">{downLabel}</span>
        <div className="stream__funds-item__value-container">
          <span className="stream__funds-item__value-label">
            {stream.funds.deposit.toLocaleString() || "0"} {stream.token.symbol}
          </span>
          <TokenLogo className="stream__funds-item__token-logo" address={stream.token.address} size="32px" />
        </div>
      </div>
    </div>
  </div>
);

const initialState = {
  hasShownRedeemWarning: false,
  lastWithdrawalAmount: 0,
  redemptionSenderAmount: 0,
  showRedeemModal: false,
  showRedeemSuccessModal: false,
  showRedeemWarningModal: false,
  showWithdrawModal: false,
  showWithdrawSuccessModal: false,
  submissionError: "",
};

class Stream extends Component {
  static propTypes = {
    account: PropTypes.string,
    block: PropTypes.shape({
      number: PropTypes.object.isRequired,
      timestamp: PropTypes.object.isRequired,
    }),
    push: PropTypes.func.isRequired,
    web3: PropTypes.object.isRequired,
  };

  state = { ...initialState };

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  onClickCopyLink() {
    const { match } = this.props;
    const link = `${links.share.sablier}${match.url}`;
    navigator.clipboard.writeText(link);

    ReactTooltip.show(this.copyLinkButtonContainerRef);
    setTimeout(() => {
      ReactTooltip.hide(this.copyLinkButtonContainerRef);
    }, 2000);
  }

  onClickInviteYourFriends() {
    const { t } = this.props;
    const subject = encodeURIComponent(t("mailto.subject"));
    const body = [t("heya"), "👋", encodeURIComponent("\r\n\r\n"), encodeURIComponent(t("mailto.body"))].join("");
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto);
  }

  onClickRedeem() {
    this.setState({ showRedeemModal: true, submissionError: "" });
  }

  onClickTweetAboutSablier() {
    const { t } = this.props;
    const intent = `https://twitter.com/intent/tweet?url=${links.share.sablier}&text=${t("shareTwitterText")}`;
    window.open(intent, "_blank");
  }

  onClickWithdraw() {
    this.setState({ showWithdrawModal: true, submissionError: "" });
  }

  onRedeemSuccess(senderAmount, refetch) {
    this.setState(
      {
        redemptionSenderAmount: senderAmount,
        showRedeemModal: false,
        showRedeemSuccessModal: true,
      },
      () => refetch(),
    );
  }

  onWithdrawSuccess(amount, refetch) {
    this.setState(
      {
        lastWithdrawalAmount: amount,
        showWithdrawModal: false,
        showWithdrawSuccessModal: true,
      },
      () => refetch(),
    );
  }

  renderLeftContainer(stream) {
    const { t } = this.props;

    let topLabel = "";
    let downLabel = "";
    if (stream.flow === StreamFlow.IN.name) {
      if (stream.status !== StreamStatus.REDEEMED.name) {
        topLabel = t("earnedSoFar");
        downLabel = t("totalDeposit");
      } else {
        topLabel = t("earned");
        downLabel = t("redeemedByPayer");
      }
    } else if (stream.flow === StreamFlow.OUT.name) {
      if (stream.status !== StreamStatus.REDEEMED.name) {
        topLabel = t("paidSoFar");
        downLabel = t("totalDeposit");
      } else {
        topLabel = t("paid");
        downLabel = t("redeemed");
      }
    }

    return (
      <div className="stream__left-container">
        <div className="stream__stream-container">
          <div className="stream__circular-progress-bar-container">
            <CustomCircularProgressBar
              className="stream__circular-progress-bar"
              percentage={stream.funds.ratio}
              strokeWidth={6}
            >
              <span className="stream__circular-progress-bar-percentage-label">{stream.funds.ratio}%</span>
              <span className="stream__circular-progress-bar-label">{t("streamed")}</span>
            </CustomCircularProgressBar>
          </div>
          <Funds downLabel={downLabel} stream={stream} topLabel={topLabel} />
        </div>
        <div className="stream__separator" />
        <div className="stream__stats-container">
          {stream.flow === StreamFlow.IN.name ? (
            <StatItemWithLink
              label={t("from")}
              icon={FaArrowCircleDown}
              link={getEtherscanAddressLink(stream.from.long)}
              tooltip={t("tooltip.counterparty")}
              value={stream.from.short}
            />
          ) : (
            <StatItemWithLink
              label={t("to")}
              icon={FaArrowCircleUp}
              link={getEtherscanAddressLink(stream.to.long)}
              tooltip={t("tooltip.counterparty")}
              value={stream.to.short}
            />
          )}
          <StatItem label={t("rate")} icon={FaHeartRate} tooltip={t("tooltip.rate")} value={stream.rate} />
          <StatItem
            label={t("startTime")}
            icon={FaCalendarAlt}
            tooltip={t("tooltip.startTime")}
            value={stream.startTime}
          />
          <StatItem
            label={t("stopTime")}
            icon={FaCalendarCheck}
            tooltip={t("tooltip.stopTime")}
            value={stream.stopTime}
          />
          <ReactTooltip className="stream__tooltip" effect="solid" id="stats-tooltip" multiline={true} type="dark" />
        </div>
      </div>
    );
  }

  renderPanel(stream) {
    const { t } = this.props;
    const { submissionError } = this.state;

    return (
      <div className="stream__panel-container">
        <span className="stream__title-label">{t("panel")}</span>
        <div className="stream__button-container">
          <PrimaryButton
            className={classnames(["stream__panel-container-button", "stream__button", "primary-button--white"])}
            icon={FaTachometer}
            label={t("goDashboard")}
            labelClassName={classnames("primary-button__label--black")}
            onClick={() => this.props.push("/dashboard")}
          />
          <PrimaryButton
            className={classnames(["stream__panel-container-button", "stream__button"])}
            icon={FaPlus}
            label={t("newStream")}
            onClick={() => this.props.push("/")}
          />
          <LastPanelButton
            onClickRedeem={() => this.onClickRedeem()}
            onClickWithdraw={() => this.onClickWithdraw()}
            stream={stream}
          />
        </div>
        {!submissionError ? null : <div className={classnames("stream__error-label")}>{submissionError}</div>}
      </div>
    );
  }

  renderShare() {
    const { t } = this.props;

    return (
      <div className="stream__share-container">
        <span className="stream__title-label">{t("share")}</span>
        <div className="stream__button-container">
          <div
            ref={(ref) => (this.copyLinkButtonContainerRef = ref)}
            data-for="copyLinkButtonTooltip"
            data-tip={"Copied"}
          >
            <PrimaryButton
              className={classnames(["stream__panel-container-button", "stream__button", "primary-button--white"])}
              icon={FaPaste}
              label={t("copyLink")}
              labelClassName={classnames("primary-button__label--black")}
              onClick={() => this.onClickCopyLink()}
            />{" "}
            <ReactTooltip
              className="stream__tooltip"
              effect="solid"
              event="none"
              id="copyLinkButtonTooltip"
              multiline={true}
              type="dark"
            />
          </div>
          <PrimaryButton
            className={classnames(["stream__panel-container-button", "stream__button", "primary-button--white"])}
            icon={FaTwitterBlack}
            label={t("tweetAboutSablier")}
            labelClassName={classnames("primary-button__label--black")}
            onClick={() => this.onClickTweetAboutSablier()}
          />
          <PrimaryButton
            className={classnames(["stream__panel-container-button", "stream__button", "primary-button--white"])}
            icon={FaEnvelope}
            label={t("inviteYourFriends")}
            labelClassName={classnames("primary-button__label--black")}
            onClick={() => this.onClickInviteYourFriends()}
          />
        </div>
      </div>
    );
  }

  renderRightContainer(stream) {
    return (
      <div className="stream__right-container">
        {this.renderPanel(stream)}
        {this.renderShare()}
      </div>
    );
  }

  renderRedeemModal(stream, refetch) {
    const { t } = this.props;
    const { showRedeemModal, showRedeemSuccessModal } = this.state;

    return (
      <div>
        {!showRedeemModal ? null : (
          <RedeemModal
            onClose={() => this.setState({ showRedeemModal: false })}
            onRedeemSuccess={(senderAmount, recipientAmount) => this.onRedeemSuccess(senderAmount, refetch)}
            stream={stream}
          />
        )}
        {!showRedeemSuccessModal ? null : (
          <ModalWithImage
            buttonLabel={t("goBack")}
            image={FaShieldCheck}
            label={t("redeem.success", {
              senderAmount: this.state.redemptionSenderAmount,
              tokenSymbol: stream.token.symbol,
            })}
            onClose={() =>
              this.setState({
                redemptionSenderAmount: 0,
                showRedeemSuccessModal: false,
              })
            }
          />
        )}
      </div>
    );
  }

  renderRedeemWarning(stream) {
    const { t } = this.props;
    const { hasShownRedeemWarning } = this.state;

    if (hasShownRedeemWarning) {
      return null;
    }

    if (stream.flow !== StreamFlow.IN.name || stream.status !== StreamStatus.REDEEMED.name) {
      return null;
    }

    return (
      <ModalWithImage
        buttonLabel={t("gotcha")}
        image={FaExclamationSquare}
        label={t("redeem.warning", {
          redemptionTime: stream.redemption.time,
        })}
        onClose={() =>
          this.setState({
            hasShownRedeemWarning: true,
          })
        }
      />
    );
  }

  renderWithdrawModal(stream, refetch) {
    const { t } = this.props;
    const { showWithdrawModal, showWithdrawSuccessModal } = this.state;

    return (
      <div>
        {!showWithdrawModal ? null : (
          <WithdrawModal
            onClose={() => this.setState({ showWithdrawModal: false })}
            onWithdrawSuccess={(amount) => this.onWithdrawSuccess(amount, refetch)}
            stream={stream}
          />
        )}
        {!showWithdrawSuccessModal ? null : (
          <ModalWithImage
            buttonLabel={t("goBack")}
            image={FaShieldCheck}
            label={t("withdraw.success", {
              amount: this.state.lastWithdrawalAmount,
              tokenSymbol: stream.token.symbol,
            })}
            onClose={() =>
              this.setState({
                lastWithdrawalAmount: 0,
                showWithdrawSuccessModal: false,
              })
            }
          />
        )}
      </div>
    );
  }

  render() {
    const { account, block, match, t } = this.props;
    const streamId = `${account.toLowerCase()}/${match.params.rawStreamId}`;

    // Note that we are not polling the GraphQL server (we could do it by setting the `pollInterval` prop).
    // The reason for that is that it causes unexpected behaviour with the value of `loading` - it's set to
    // true and never set to false again. A corollary from this is that the current balance of the stream
    // is computed in the client, which could lead to inconsistencies when withdrawing or redeeming (although unlikely).
    // @see https://github.com/apollographql/react-apollo/issues/1931
    return (
      <Query query={GET_STREAM} variables={{ streamId }}>
        {({ loading, error, data, refetch }) => {
          // @see https://github.com/apollographql/react-apollo/issues/2575
          if (loading && !data.stream) return <Loader className="stream__loader" delay={100} />;
          if (error) return <div className="stream__no-data">{t("error")}</div>;
          if (!data || !data.stream) return <div className="stream__no-data">{t("noData")}</div>;

          const parser = new Parser(data.stream, account, block, t);
          const stream = parser.parse();
          console.log({ data, stream })
          return (
            <div className="stream">
              {this.renderLeftContainer(stream)}
              <div className="spacer" />
              {this.renderRightContainer(stream)}
              {this.renderRedeemModal(stream, refetch)}
              {this.renderRedeemWarning(stream)}
              {this.renderWithdrawModal(stream, refetch)}
            </div>
          );
        }}
      </Query>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    block: state.web3connect.block,
    // eslint-disable-next-line eqeqeq
    isConnected: !!state.web3connect.account && state.web3connect.networkId == (process.env.REACT_APP_NETWORK_ID || 1),
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    push: (path) => dispatch(push(path)),
  }),
)(withTranslation()(Stream));
