import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { connect } from "react-redux";
import { CSSTransitionGroup } from "react-transition-group";
import { withTranslation } from "react-i18next";

import FaChevronCircleDown from "../../assets/images/fa-chevron-circle-down.svg";
import Fuse from "../../helpers/fuse";
import Loader from "../Loader";
import Modal from "../Modal";
import SearchIcon from "../../assets/images/magnifying-glass.svg";
import TokenLogo from "../TokenLogo";

import { addApprovalTx } from "../../redux/ducks/pending";
import { selectors, addPendingTx } from "../../redux/ducks/web3connect";
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
  constructor(props) {
    super(props);
    this.state = {
      isShowingModal: false,
      searchQuery: "",
      loadingToken: false,
    };
  }

  onSelectTokenAddress(address) {
    this.setState({
      searchQuery: "",
      isShowingModal: false,
    });

    const { onSelectTokenAddress } = this.props;
    onSelectTokenAddress(address);
  }

  createTokenList() {
    const { tokenAddresses } = this.props;
    const tokens = tokenAddresses.addresses;
    const tokenList = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const entry = { value: "", label: "" };
      [entry.value, entry.address] = tokens[i];
      entry.label = entry.value;
      tokenList.push(entry);
    }

    return tokenList;
  }

  renderTokenList() {
    const tokens = this.createTokenList();
    const { loadingToken, searchQuery } = this.state;
    const { selectedTokens, t } = this.props;

    if (loadingToken) {
      return (
        <div className="token-modal__token-row token-modal__token-row--searching">
          <Loader />
          <div>{t("searchingToken")}</div>
        </div>
      );
    }

    let results;

    if (!searchQuery) {
      results = tokens;
    } else {
      const fuse = new Fuse(tokens, FUSE_OPTIONS);
      results = fuse.search(searchQuery);
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
          onClick={() => this.onSelectTokenAddress(address)}
          onKeyDown={() => this.onSelectTokenAddress(address)}
          role="button"
          tabIndex={0}
        >
          <TokenLogo className="token-modal__token-logo" address={address} />
          <div className="token-modal__token-logo">{label}</div>
        </div>
      );
    });
  }

  renderModal() {
    const { isShowingModal } = this.state;
    const { t } = this.props;
    if (!isShowingModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ isShowingModal: false, searchQuery: "" })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear
          transitionLeave
          transitionAppearTimeout={250}
          transitionLeaveTimeout={250}
          transitionEnterTimeout={250}
        >
          <div className="token-modal">
            <div className="token-modal__search-container">
              <input
                type="text"
                placeholder={t("searchToken")}
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
    const { selectedTokenAddress, t, tokenSymbol } = this.props;

    return (
      <div
        className="token-panel__input-container"
        onClick={() => {
          this.setState({ isShowingModal: true });
        }}
        onKeyDown={() => {
          this.setState({ isShowingModal: true });
        }}
        role="button"
        tabIndex={0}
      >
        <div
          className={classnames("token-panel__token-select", {
            "token-panel__token-select--selected": selectedTokenAddress,
          })}
        >
          {selectedTokenAddress ? (
            <TokenLogo className="token-panel__selected-token-logo" address={selectedTokenAddress} />
          ) : null}
          <span>{tokenSymbol || t("selectToken")}</span>
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

TokenPanel.propTypes = {
  approvals: PropTypes.shape({}).isRequired,
  onSelectTokenAddress: PropTypes.func,
  pendingApprovals: PropTypes.shape({}).isRequired,
  selectedTokens: PropTypes.shape([]),
  selectedTokenAddress: PropTypes.string,
  t: PropTypes.shape({}),
  tokenAddresses: PropTypes.shape({
    addresses: PropTypes.array.isRequired,
  }).isRequired,
  tokenSymbol: PropTypes.string.isRequired,
};

TokenPanel.defaultProps = {
  onSelectTokenAddress() {},
  selectedTokens: [],
  selectedTokenAddress: "",
  t: {},
};

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
