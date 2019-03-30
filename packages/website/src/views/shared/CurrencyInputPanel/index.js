import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import { BigNumber as BN } from "bignumber.js";
import { connect } from "react-redux";
import { CSSTransitionGroup } from "react-transition-group";
import { withRouter } from "react-router-dom";
import { withTranslation } from "react-i18next";

import FaChevronCircleDown from "../../../assets/images/fa-chevron-circle-down.svg";
import Fuse from "../../../helpers/fuse";
import Modal from "../Modal";
import SearchIcon from "../../../assets/images/magnifying-glass.svg";
import TokenLogo from "../TokenLogo";

import { addApprovalTx } from "../../../redux/ducks/pending";
import { addToken } from "../../../redux/ducks/addresses";
import { selectors, addPendingTx } from "../../../redux/ducks/web3connect";
import "./currency-input-panel.scss";

const FUSE_OPTIONS = {
  includeMatches: false,
  threshold: 0.0,
  tokenize: true,
  location: 0,
  distance: 100,
  maxPatternLength: 45,
  minMatchCharLength: 1,
  keys: [{ name: "address", weight: 0.8 }, { name: "label", weight: 0.5 }],
};

const TOKEN_ADDRESS_TO_LABEL = { "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359": "DAI" };

class CurrencyInputPanel extends Component {
  static propTypes = {
    account: PropTypes.string,
    description: PropTypes.string,
    disableTokenSelect: PropTypes.bool,
    disableUnlock: PropTypes.bool,
    errorMessage: PropTypes.string,
    extraText: PropTypes.string,
    filteredTokens: PropTypes.arrayOf(PropTypes.string),
    onCurrencySelected: PropTypes.func,
    onValueChange: PropTypes.func,
    renderInput: PropTypes.func,
    selectedTokenAddress: PropTypes.string,
    selectedTokens: PropTypes.array.isRequired,
    selectors: PropTypes.func.isRequired,
    title: PropTypes.string,
    tokenAddresses: PropTypes.shape({
      addresses: PropTypes.array.isRequired,
    }).isRequired,
    value: PropTypes.string,
  };

  static defaultProps = {
    selectedTokens: ["0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"],
    filteredTokens: [],
    onCurrencySelected() {},
    onValueChange() {},
    selectedTokenAddress: "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
  };

  state = {
    isShowingModal: false,
    searchQuery: "",
    loadingToken: false,
  };

  createTokenList = () => {
    const { filteredTokens, tokenAddresses } = this.props;
    let tokens = tokenAddresses.addresses;
    let tokenList = [];

    for (let i = 0; i < tokens.length; i++) {
      let entry = { value: "", label: "" };
      entry.value = tokens[i][0];
      entry.label = tokens[i][0];
      entry.address = tokens[i][1];
      tokenList.push(entry);
      TOKEN_ADDRESS_TO_LABEL[tokens[i][1]] = tokens[i][0];
    }

    return tokenList.filter(({ address }) => !filteredTokens.includes(address));
  };

  onTokenSelect = (address) => {
    this.setState({
      searchQuery: "",
      isShowingModal: false,
    });

    this.props.onCurrencySelected(address);
  };

  renderTokenList() {
    const tokens = this.createTokenList();
    const { loadingToken, searchQuery } = this.state;
    const {
      disableTokenSelect,
      selectedTokens,
      t
    } = this.props;

    if (loadingToken) {
      return (
        <div className="token-modal__token-row token-modal__token-row--searching">
          <div className="loader" />
          <div>{t("searchingToken")}</div>
        </div>
      );
    }

    if (disableTokenSelect) {
      return;
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
        <div className="token-modal__token-row token-modal">
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
          onClick={() => this.onTokenSelect(address)}
        >
          <TokenLogo className="token-modal__token-logo" address={address} />
          <div className="token-modal__token-label">{label}</div>
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
          transitionAppearTimeout={200}
          transitionLeaveTimeout={200}
          transitionEnterTimeout={200}
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
              <img src={SearchIcon} className="token-modal__search-icon" alt="Search Icon" />
            </div>
            <div className="token-modal__token-list">{this.renderTokenList()}</div>
          </div>
        </CSSTransitionGroup>
      </Modal>
    );
  }

  renderInput() {
    const { disableTokenSelect, renderInput, selectedTokenAddress, t } = this.props;

    if (typeof renderInput === "function") {
      return renderInput();
    }

    return (
      <div
        className="currency-input-panel__input-row"
        onClick={() => {
          if (!disableTokenSelect) {
            this.setState({ isShowingModal: true });
          }
        }}
      >
        <div
          className={classnames("currency-input-panel__currency-select", {
            "currency-input-panel__currency-select--selected": selectedTokenAddress,
            "currency-input-panel__currency-select--disabled": disableTokenSelect,
          })}
        >
          {selectedTokenAddress ? (
            <TokenLogo className="currency-input-panel__selected-token-logo" address={selectedTokenAddress} />
          ) : null}
          <span>{TOKEN_ADDRESS_TO_LABEL[selectedTokenAddress] || t("selectToken")}</span>
        </div>
        <img className="currency-input-panel__dropdown-icon" src={FaChevronCircleDown} alt="Dropdown Icon" />
      </div>
    );
  }

  render() {
    return (
      <div className="currency-input-panel">
        {this.renderInput()}
        {this.renderModal()}
      </div>
    );
  }
}

export default withRouter(
  connect(
    (state) => ({
      factoryAddress: state.addresses.factoryAddress,
      tokenAddresses: state.addresses.tokenAddresses,
      contracts: state.contracts,
      account: state.web3connect.account,
      approvals: state.web3connect.approvals,
      transactions: state.web3connect.transactions,
      web3: state.web3connect.web3,
      pendingApprovals: state.pending.approvals,
    }),
    (dispatch) => ({
      selectors: () => dispatch(selectors()),
      addToken: (opts) => dispatch(addToken(opts)),
      addPendingTx: (opts) => dispatch(addPendingTx(opts)),
      addApprovalTx: (opts) => dispatch(addApprovalTx(opts)),
    }),
  )(withTranslation()(CurrencyInputPanel)),
);
