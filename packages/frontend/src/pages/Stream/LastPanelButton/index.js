import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { withTranslation } from "react-i18next";

import FaInboxOut from "../../../assets/images/fa-inbox-out.svg";
import FaStopwatch from "../../../assets/images/fa-stopwatch.svg";
import PrimaryButton from "../../../components/PrimaryButton";

import { StreamFlow, StreamStatus } from "../../../classes/stream";

class LastPanelButton extends Component {
  static propTypes = {
    onClickRedeem: PropTypes.func.isRequired,
    onClickWithdraw: PropTypes.func.isRequired,
    stream: PropTypes.object.isRequired,
  };

  render() {
    const { stream, t } = this.props;

    let callback;
    let icon;
    let label;

    if (stream.flow === StreamFlow.IN.name) {
      if ([StreamStatus.CREATED.name, StreamStatus.ACTIVE.name, StreamStatus.ENDED.name].includes(stream.status)) {
        callback = this.props.onClickWithdraw;
        icon = FaInboxOut;
        label = t("withdraw.verbatim");
      } else {
        return null;
      }
    } else if (stream.flow === StreamFlow.OUT.name) {
      if (stream.status === StreamStatus.CREATED.name || stream.status === StreamStatus.ACTIVE.name) {
        callback = this.props.onClickRedeem;
        icon = FaStopwatch;
        label = t("redeem.verbatim");
      } else {
        return null;
      }
    }

    return (
      <div>
        <PrimaryButton
          className={classnames(["stream__panel-container-button", "stream__button", "primary-button--yellow"])}
          icon={icon}
          label={label}
          onClick={() => callback()}
        />
      </div>
    );
  }
}

export default connect((state) => ({
  account: state.web3connect.account,
}))(withTranslation()(LastPanelButton));
