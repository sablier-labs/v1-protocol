module.exports = {
  AUTH_BOTH: "only the sender or the recipient of the stream can perform this action",
  AUTH_RECIPIENT: "only the stream recipient is allowed to perform this action",
  AUTH_SENDER: "only the stream sender is allowed to perform this action",
  BLOCK_DELTA: "the block difference needs to be higher than the payment interval",
  BLOCK_DELTA_MULTIPLICITY: "the block difference needs to be a multiple of the payment interval",
  BLOCK_START: "the start block needs to be higher than the current block number",
  BLOCK_STOP: "the stop block needs to be higher than the start block",
  CONTRACT_ALLOWANCE: "contract not allowed to transfer enough tokens",
  CONTRACT_EXISTENCE: "token contract address needs to be provided",
  INSOLVENCY: "not enough funds",
  STREAM_EXISTENCE: "stream doesn't exist",
  TERMS_NOT_CHANGED: "stream has these terms already",
};
