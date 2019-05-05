import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { CSSTransitionGroup } from "react-transition-group";
import { withTranslation } from "react-i18next";

import FaChevronCircleDown from "../../../assets/images/fa-chevron-circle-down.svg";
import Fuse from "../../../helpers/fuse";
import Modal from "../Modal";
import SearchIcon from "../../../assets/images/magnifying-glass.svg";
import TokenLogo from "../TokenLogo";

import { addApprovalTx } from "../../../redux/ducks/pending";
import { selectors, addPendingTx } from "../../../redux/ducks/web3connect";
import "./token-panel.scss";

const FUSE_OPTIONS = {
  distance: 100,
  includeMatches: false,
  keys: [{ name: "address", weight: 0.8 }, { name: "label", weight: 0.5 }],
  location: 0,
  maxPatternLength: 45,
  minMatchCharLength: 1,
  threshold: 0.0,
  tokenize: true,
};

class TokenPanel extends Component {
  static propTypes = {
    account: PropTypes.string,
    addApprovalTx: PropTypes.func.isRequired,
    addPendingTx: PropTypes.func.isRequired,
    approvals: PropTypes.object.isRequired,
    onSelectToken: PropTypes.func,
    pendingApprovals: PropTypes.object.isRequired,
    selectedTokens: PropTypes.array.isRequired,
    selectedTokenAddress: PropTypes.string,
    selectors: PropTypes.func.isRequired,
    tokenAddresses: PropTypes.shape({
      addresses: PropTypes.array.isRequired,
    }).isRequired,
    tokenName: PropTypes.string.isRequired,
  };

  static defaultProps = {
    selectedTokens: [],
    onSelectToken() {},
    selectedTokenAddress: "",
  };

  state = {
    isShowingModal: false,
    searchQuery: "",
    loadingToken: false,
  };

  createTokenList = () => {
    const { tokenAddresses } = this.props;
    let tokens = tokenAddresses.addresses;
    let tokenList = [];

    for (let i = 0; i < tokens.length; i++) {
      let entry = { value: "", label: "" };
      entry.value = tokens[i][0];
      entry.label = tokens[i][0];
      entry.address = tokens[i][1];
      tokenList.push(entry);
    }

    return tokenList;
  };

  onSelectToken = (address) => {
    this.setState({
      searchQuery: "",
      isShowingModal: false,
    });

    this.props.onSelectToken(address);
  };

  renderTokenList() {
    const tokens = this.createTokenList();
    const { loadingToken, searchQuery } = this.state;
    const { selectedTokens, t } = this.props;

    if (loadingToken) {
      return (
        <div className="token-modal__token-row token-modal__token-row--searching">
          <div className="loader" />
          <div>{t("searchingToken")}</div>
        </div>
      );
    }

    let results;

    if (!searchQuery) {
      results = tokens;
    } else {
      const fuse = new Fuse(tokens, FUSE_OPTIONS);
      results = fuse.search(this.state.searchQuery);
    }

    if (!results.length) {
      return (
        <div className="token-modal__token-row token-modal__token-row--no-results">
          <div>{t("noToken")}</div>
        </div>
      );
    }

    return results.map(({ label, address }) => {
      const isSelected = selectedTokens.indexOf(address) > -1;

      return (
        <div
          key={label}
          className={classnames("token-modal__token-row", {
            "token-modal__token-row--selected": isSelected,
          })}
          onClick={() => this.onSelectToken(address)}
        >
          <TokenLogo className="token-modal__token-logo" address={address} />
          <div className="token-modal__token-logo">{label}</div>
        </div>
      );
    });
  }

  renderModal() {
    if (!this.state.isShowingModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ isShowingModal: false, searchQuery: "" })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear={true}
          transitionLeave={true}
          transitionAppearTimeout={250}
          transitionLeaveTimeout={250}
          transitionEnterTimeout={250}
        >
          <div className="token-modal">
            <div className="token-modal__search-container">
              <input
                type="text"
                placeholder={this.props.t("searchToken")}
                className="token-modal__search-input"
                onChange={(e) => {
                  this.setState({ searchQuery: e.target.value });
                }}
              />
              <img className="token-modal__search-icon" alt="Search Icon" src={SearchIcon} />
            </div>
            <div className="token-modal__token-list">{this.renderTokenList()}</div>
          </div>
        </CSSTransitionGroup>
      </Modal>
    );
  }

  renderPanel() {
    const { renderPanel, selectedTokenAddress, t, tokenName } = this.props;

    if (typeof renderPanel === "function") {
      return renderPanel();
    }

    return (
      <div
        className="token-panel__input-container"
        onClick={() => {
          this.setState({ isShowingModal: true });
        }}
      >
        <div
          className={classnames("token-panel__token-select", {
            "token-panel__token-select--selected": selectedTokenAddress,
          })}
        >
          {selectedTokenAddress ? (
            <TokenLogo className="token-panel__selected-token-logo" address={selectedTokenAddress} />
          ) : null}
          <span>{tokenName || t("selectToken")}</span>
        </div>
        <img className="token-panel__dropdown-icon" src={FaChevronCircleDown} alt="Dropdown Icon" />
      </div>
    );
  }

  render() {
    return (
      <div className="token-panel">
        {this.renderPanel()}
        {this.renderModal()}
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    approvals: state.web3connect.approvals,
    pendingApprovals: state.pending.approvals,
    tokenAddresses: state.addresses.tokenAddresses,
    web3: state.web3connect.web3,
  }),
  (dispatch) => ({
    addApprovalTx: (opts) => dispatch(addApprovalTx(opts)),
    addPendingTx: (opts) => dispatch(addPendingTx(opts)),
    selectors: () => dispatch(selectors()),
  }),
)(withTranslation()(TokenPanel));
