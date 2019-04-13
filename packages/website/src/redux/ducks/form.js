import { intervalBlocks } from "../../constants/time";
import { getDaiAddressForNetworkId } from "../../constants/addresses";
import { networkNamesToIds } from "../../constants/networks";

const DAI = getDaiAddressForNetworkId(networkNamesToIds.mainnet);

// Payloads
const UPDATE_TOKEN = "app/form/token";
const UPDATE_RATE_PAYMENT = "app/form/rate/payment";
const UPDATE_RATE_INTERVAL = "app/form/rate/interval";
const UPDATE_TTL = "app/form/ttl";
const UPDATE_RECIPIENT = "app/form/recipient";

// States
const getInitialState = () => {
  return {
    token: DAI,
    rate: {
      payment: "",
      interval: intervalBlocks.minute,
    },
    ttl: 0,
    recipient: "",
  };
};

// Reducer
export default function reducer(state = getInitialState(), payload = {}) {
  switch (payload.type) {
    case UPDATE_TOKEN:
      return {
        ...state,
        token: payload.token,
      };
    case UPDATE_RATE_PAYMENT:
      return {
        ...state,
        rate: payload.rate,
      };
    default:
      return state;
  }
}

// payload Creators
export function loadForm() {
  return {};
}

export function setToken(token) {
  return { type: UPDATE_TOKEN, token };
}

export function setRatePayment(payment) {
  return { type: UPDATE_RATE_PAYMENT, payment };
}

export function setRateInterval(interval) {
  return { type: UPDATE_RATE_INTERVAL, interval };
}

export function setTtl(ttl) {
  return { type: UPDATE_TTL, ttl };
}

export function setRecipient(recipient) {
  return { type: UPDATE_RECIPIENT, recipient };
}
