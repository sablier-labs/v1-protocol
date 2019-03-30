import chronos from "../../constants/chronos";

// Payloads
const TOKEN = "app/form/token";
const RATE = "app/form/rate";
const TTL = "app/form/ttl";
const RECIPIENT = "app/form/recipient";

// States
const getInitialState = () => {
  return {
    token: "DAI",
    rate: {
      payment: "",
      interval: chronos.minute
    },
    ttl: 0,
    recipient: ""
  };
};

// Reducer
export default function reducer(state = getInitialState(), payload = {}) {
  switch (payload.type) {
    case TOKEN:
      return {
        ...state,
        token: payload.token,
      };
    case RATE:
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
  return { type: TOKEN, token };
}

export function setRate(rate) {
  return { type: RATE, rate };
}

export function setTtl(ttl) {
  return { type: TTL, ttl };
}

export function setRecipient(recipient) {
  return { type: RECIPIENT, recipient };
}
