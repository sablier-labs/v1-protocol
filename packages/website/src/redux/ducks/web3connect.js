import React, { Component } from "react";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import Web3 from "web3";

import { connect } from "react-redux";
import { BigNumber as BN } from "bignumber.js";

import ERC20_ABI from "../../abi/erc20";
import ERC20_WITH_BYTES_ABI from "../../abi/erc20_symbol_bytes32";

export const ADD_CONFIRMED_TX = "web3connect/addConfirmedTx";
export const ADD_CONTRACT = "web3connect/addContract";
export const ADD_PENDING_TX = "web3connect/addPendingTx";
export const INITIALIZE = "web3connect/initialize";
export const REMOVE_PENDING_TX = "web3connect/removePendingTx";
export const UPDATE_ETH_BALANCE = "web3connect/updateEthBalance";
export const UPDATE_TOKEN_BALANCE = "web3connect/updateTokenBalance";
export const UPDATE_ACCOUNT = "web3connect/updateAccount";
export const UPDATE_APPROVALS = "web3connect/updateApprovals";
export const UPDATE_BLOCK = "web3connect/updateBlock";
export const UPDATE_BLOCK_TIME_AVERAGE = "web3connect/updateBlockTimeAverage";
export const UPDATE_NETWORK_ID = "web3connect/updateNetworkId";
export const WATCH_APPROVALS = "web3connect/watchApprovals";
export const WATCH_ETH_BALANCE = "web3connect/watchEthBalance";
export const WATCH_TOKEN_BALANCE = "web3connect/watchTokenBalance";

const initialState = {
  account: "",
  approvals: {
    "0x0": {
      TOKEN_OWNER: {
        SPENDER: {},
      },
    },
  },
  balances: {
    ethereum: {},
  },
  block: {
    number: BN(0),
    timestamp: {},
  },
  blockTimeAverage: BN(0),
  contracts: {},
  initialized: false,
  networkId: 0,
  transactions: {
    pending: [],
    confirmed: [],
  },
  watched: {
    balances: {
      ethereum: [],
    },
    approvals: {},
  },
  web3: null,
};

// selectors
export const selectors = () => (dispatch, getState) => {
  const { approvals, balances } = getState().web3connect;

  const getApprovals = (tokenAddress, tokenOwner, spender) => {
    const token = approvals[tokenAddress] || {};
    const owner = token[tokenOwner] || {};

    if (!owner[spender]) {
      dispatch(watchApprovals({ tokenAddress, tokenOwner, spender }));
      return Balance(0);
    }

    return owner[spender];
  };

  const getBalance = (address, tokenAddress) => {
    if (!tokenAddress || tokenAddress === "ETH") {
      const balance = balances.ethereum[address];
      if (!balance) {
        dispatch(watchBalance({ balanceOf: address }));
        return Balance(0, "ETH");
      }
      return balance;
    } else if (tokenAddress) {
      return getTokenBalance(tokenAddress, address);
    }

    return Balance(NaN);
  };

  const getTokenBalance = (tokenAddress, address) => {
    const tokenBalances = balances[tokenAddress] || {};
    const balance = tokenBalances[address];
    if (!balance) {
      dispatch(watchBalance({ balanceOf: address, tokenAddress }));
      return Balance(0);
    }
    return balance;
  };

  return {
    getApprovals,
    getBalance,
    getTokenBalance,
  };
};

const Balance = (value, symbol = "", decimals = 0) => {
  return {
    value: BN(value),
    symbol: symbol.toUpperCase(),
    decimals: +decimals,
  };
};

export const initialize = () => (dispatch, getState) => {
  const { web3connect } = getState();

  return new Promise(async (resolve, reject) => {
    if (web3connect.web3) {
      resolve(web3connect.web3);
      return;
    }

    // @see https://github.com/ethereum/web3.js/issues/2601#issuecomment-493752483
    const options = !process.env.REACT_APP_NETWORK_ID
      ? {}
      : {
          transactionConfirmationBlocks: 1,
        };

    if (typeof window.ethereum !== "undefined") {
      try {
        const web3 = new Web3(window.ethereum, null, options);
        await window.ethereum.enable();
        dispatch({
          type: INITIALIZE,
          payload: web3,
        });
        resolve(web3);
        return;
      } catch (error) {
        console.error("User denied access.");
        dispatch({ type: INITIALIZE });
        reject();
        return;
      }
    }

    if (typeof window.web3 !== "undefined") {
      const web3 = new Web3(window.web3.currentProvider, null, options);
      dispatch({
        type: INITIALIZE,
        payload: web3,
      });
      resolve(web3);
      return;
    }

    dispatch({ type: INITIALIZE });
    reject();
  });
};

export const watchBalance = ({ balanceOf, tokenAddress }) => (dispatch, getState) => {
  if (!balanceOf) {
    return;
  }

  const { web3connect } = getState();
  const { watched } = web3connect;

  if (!tokenAddress) {
    if (watched.balances.ethereum.includes(balanceOf)) {
      return;
    }
    dispatch({
      type: WATCH_ETH_BALANCE,
      payload: balanceOf,
    });
    setTimeout(() => dispatch(sync()), 0);
  } else if (tokenAddress) {
    if (watched.balances[tokenAddress] && watched.balances[tokenAddress].includes(balanceOf)) {
      return;
    }
    dispatch({
      type: WATCH_TOKEN_BALANCE,
      payload: {
        tokenAddress,
        balanceOf,
      },
    });
    setTimeout(() => dispatch(sync()), 0);
  }
};

export const watchApprovals = ({ tokenAddress, tokenOwner, spender }) => (dispatch, getState) => {
  const {
    web3connect: { watched },
  } = getState();
  const token = watched.approvals[tokenAddress] || {};
  const owner = token[tokenOwner] || [];
  if (owner.includes(spender)) {
    return;
  }
  return dispatch({
    type: WATCH_APPROVALS,
    payload: {
      tokenAddress,
      tokenOwner,
      spender,
    },
  });
};

export const addPendingTx = (txId) => ({
  type: ADD_PENDING_TX,
  payload: txId,
});

export const updateApprovals = ({ tokenAddress, tokenOwner, spender, balance }) => ({
  type: UPDATE_APPROVALS,
  payload: {
    tokenAddress,
    tokenOwner,
    spender,
    balance,
  },
});

export const sync = () => async (dispatch, getState) => {
  const { getBalance, getApprovals } = dispatch(selectors());
  const web3 = await dispatch(initialize());
  const {
    account,
    block,
    blockTimeAverage,
    contracts,
    networkId,
    transactions: { pending },
    watched,
  } = getState().web3connect;

  // Sync Account
  const accounts = await web3.eth.getAccounts();
  if (account !== accounts[0]) {
    dispatch({ type: UPDATE_ACCOUNT, payload: accounts[0] });
    dispatch(watchBalance({ balanceOf: accounts[0] }));
  }

  // Sync Network Id
  if (!networkId) {
    dispatch({
      type: UPDATE_NETWORK_ID,
      payload: await web3.eth.net.getId(),
    });
  }

  // Sync Block
  const currentBlock = await web3.eth.getBlock("latest");
  if (currentBlock) {
    currentBlock.number = BN(currentBlock.number || 0);
    currentBlock.timestamp = dayjs.unix(currentBlock.timestamp || 0);
    if (!block.number.isEqualTo(currentBlock.number)) {
      dispatch({
        type: UPDATE_BLOCK,
        payload: {
          number: currentBlock.number,
          timestamp: currentBlock.timestamp,
        },
      });
    }

    // Sync Block Time Average
    if (!block.number.isEqualTo(currentBlock.number) && blockTimeAverage.isEqualTo(BN(0))) {
      const recentBlockNumber = currentBlock.number.minus(BN(1)).toNumber();
      const { timestamp: recentTimestamp } = await web3.eth.getBlock(recentBlockNumber);
      const oldBlockNumber = currentBlock.number.minus(BN(1001)).toNumber();
      const { timestamp: olderTimestamp } = await web3.eth.getBlock(oldBlockNumber);

      const delta = dayjs
        .unix(recentTimestamp)
        .subtract(dayjs.unix(olderTimestamp))
        .unix();
      const deltaBN = BN(delta / 1000);
      dispatch({
        type: UPDATE_BLOCK_TIME_AVERAGE,
        payload: deltaBN,
      });
    }
  }

  // Sync Ethereum Balances
  watched.balances.ethereum.forEach(async (address) => {
    const balance = await web3.eth.getBalance(address);
    const { value } = getBalance(address);

    if (value.isEqualTo(BN(balance))) {
      return;
    }

    dispatch({
      type: UPDATE_ETH_BALANCE,
      payload: {
        balance: Balance(balance, "ETH", 18),
        balanceOf: address,
      },
    });
  });

  // Sync Token Balances
  Object.keys(watched.balances).forEach((tokenAddress) => {
    if (tokenAddress === "ethereum") {
      return;
    }

    const contract = contracts[tokenAddress] || new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const contractBytes32 = contracts[tokenAddress] || new web3.eth.Contract(ERC20_WITH_BYTES_ABI, tokenAddress);

    if (!contracts[tokenAddress]) {
      dispatch({
        type: ADD_CONTRACT,
        payload: {
          address: tokenAddress,
          contract: contract,
        },
      });
    }

    const watchlist = watched.balances[tokenAddress] || [];
    watchlist.forEach(async (address) => {
      const tokenBalance = getBalance(address, tokenAddress);
      const balance = await contract.methods.balanceOf(address).call();
      const decimals = tokenBalance.decimals || (await contract.methods.decimals().call());
      let symbol = tokenBalance.symbol;
      try {
        symbol =
          symbol ||
          (await contract.methods
            .symbol()
            .call()
            .catch());
      } catch (e) {
        try {
          symbol =
            symbol ||
            web3.utils.hexToString(
              await contractBytes32.methods
                .symbol()
                .call()
                .catch(),
            );
        } catch (err) {}
      }
      symbol = symbol || "";

      if (tokenBalance.value.isEqualTo(BN(balance)) && tokenBalance.symbol && tokenBalance.decimals) {
        return;
      }

      dispatch({
        type: UPDATE_TOKEN_BALANCE,
        payload: {
          tokenAddress,
          balanceOf: address,
          balance: Balance(balance, symbol, decimals),
        },
      });
    });
  });

  // Sync Approvals
  Object.entries(watched.approvals).forEach(([tokenAddress, token]) => {
    const contract = contracts[tokenAddress] || new web3.eth.Contract(ERC20_ABI, tokenAddress);
    const contractBytes32 = contracts[tokenAddress] || new web3.eth.Contract(ERC20_WITH_BYTES_ABI, tokenAddress);

    Object.entries(token).forEach(([tokenOwnerAddress, tokenOwner]) => {
      if (!tokenOwnerAddress) {
        return;
      }
      tokenOwner.forEach(async (spenderAddress) => {
        const approvalBalance = getApprovals(tokenAddress, tokenOwnerAddress, spenderAddress);
        const balance = await contract.methods.allowance(tokenOwnerAddress, spenderAddress).call();
        const decimals = approvalBalance.decimals || (await contract.methods.decimals().call());
        let symbol = approvalBalance.symbol;
        try {
          symbol = symbol || (await contract.methods.symbol().call());
        } catch (e) {
          try {
            symbol = symbol || web3.utils.hexToString(await contractBytes32.methods.symbol().call());
          } catch (err) {}
        }
        symbol = symbol || "";

        if (approvalBalance.symbol && approvalBalance.value.isEqualTo(BN(balance))) {
          return;
        }

        dispatch(
          updateApprovals({
            tokenAddress,
            tokenOwner: tokenOwnerAddress,
            spender: spenderAddress,
            balance: Balance(balance, symbol, decimals),
          }),
        );
      });
    });
  });

  // Sync Pending Transactions
  pending.forEach(async (txId) => {
    try {
      const data = (await web3.eth.getTransactionReceipt(txId)) || {};

      // If data is an empty obj, then it's still pending.
      if (!("status" in data)) {
        return;
      }

      dispatch({
        type: REMOVE_PENDING_TX,
        payload: txId,
      });

      if (data.status) {
        dispatch({
          type: ADD_CONFIRMED_TX,
          payload: txId,
        });
      } else {
        // TODO: dispatch ADD_REJECTED_TX
      }
    } catch (err) {
      dispatch({
        type: REMOVE_PENDING_TX,
        payload: txId,
      });
      // TODO: dispatch ADD_REJECTED_TX
    }
  });
};

export const startWatching = () => async (dispatch, getState) => {
  const { account } = getState().web3connect;
  const timeout = !account ? 1000 : 5000;

  dispatch(sync());
  setTimeout(() => dispatch(startWatching()), timeout);
};

export default function web3connectReducer(state = initialState, { type, payload }) {
  switch (type) {
    case ADD_CONFIRMED_TX:
      if (state.transactions.confirmed.includes(payload)) {
        return state;
      }

      return {
        ...state,
        transactions: {
          ...state.transactions,
          confirmed: [...state.transactions.confirmed, payload],
        },
      };
    case ADD_CONTRACT:
      return {
        ...state,
        contracts: {
          ...state.contracts,
          [payload.address]: payload.contract,
        },
      };
    case ADD_PENDING_TX:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          pending: [...state.transactions.pending, payload],
        },
      };
    case INITIALIZE:
      return {
        ...state,
        web3: payload,
        initialized: true,
      };
    case REMOVE_PENDING_TX:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          pending: state.transactions.pending.filter((id) => id !== payload),
        },
      };
    case UPDATE_ACCOUNT:
      return {
        ...state,
        account: payload,
      };
    case UPDATE_APPROVALS:
      const erc20 = state.approvals[payload.tokenAddress] || {};
      const erc20Owner = erc20[payload.tokenOwner] || {};

      return {
        ...state,
        approvals: {
          ...state.approvals,
          [payload.tokenAddress]: {
            ...erc20,
            [payload.tokenOwner]: {
              ...erc20Owner,
              [payload.spender]: payload.balance,
            },
          },
        },
      };
    case UPDATE_BLOCK:
      return {
        ...state,
        block: {
          ...state.block,
          number: payload.number,
          timestamp: payload.timestamp,
        },
      };
    case UPDATE_BLOCK_TIME_AVERAGE:
      return {
        ...state,
        blockTimeAverage: payload,
      };
    case UPDATE_ETH_BALANCE:
      return {
        ...state,
        balances: {
          ...state.balances,
          ethereum: {
            ...state.balances.ethereum,
            [payload.balanceOf]: payload.balance,
          },
        },
      };
    case UPDATE_NETWORK_ID:
      return { ...state, networkId: payload };
    case UPDATE_TOKEN_BALANCE:
      const tokenBalances = state.balances[payload.tokenAddress] || {};
      return {
        ...state,
        balances: {
          ...state.balances,
          [payload.tokenAddress]: {
            ...tokenBalances,
            [payload.balanceOf]: payload.balance,
          },
        },
      };
    case WATCH_APPROVALS:
      const token = state.watched.approvals[payload.tokenAddress] || {};
      const tokenOwner = token[payload.tokenOwner] || [];

      return {
        ...state,
        watched: {
          ...state.watched,
          approvals: {
            ...state.watched.approvals,
            [payload.tokenAddress]: {
              ...token,
              [payload.tokenOwner]: [...tokenOwner, payload.spender],
            },
          },
        },
      };
    case WATCH_ETH_BALANCE:
      return {
        ...state,
        watched: {
          ...state.watched,
          balances: {
            ...state.watched.balances,
            ethereum: [...state.watched.balances.ethereum, payload],
          },
        },
      };
    case WATCH_TOKEN_BALANCE:
      const { watched } = state;
      const { balances } = watched;
      const watchlist = balances[payload.tokenAddress] || [];

      return {
        ...state,
        watched: {
          ...watched,
          balances: {
            ...balances,
            [payload.tokenAddress]: [...watchlist, payload.balanceOf],
          },
        },
      };
    default:
      return state;
  }
}

// Connect Component
export class _Web3Connect extends Component {
  static propTypes = {
    initialize: PropTypes.func.isRequired,
  };

  static defaultProps = {
    initialize() {},
  };

  componentDidMount() {
    this.props.initialize().then(this.props.startWatching());
  }

  render() {
    return <noscript />;
  }
}

export const Web3Connect = connect(
  ({ web3connect }) => ({
    web3: web3connect.web3,
  }),
  (dispatch) => ({
    initialize: () => dispatch(initialize()),
    startWatching: () => dispatch(startWatching()),
  }),
)(_Web3Connect);
