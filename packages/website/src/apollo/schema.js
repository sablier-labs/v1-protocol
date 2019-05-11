import gql from "graphql-tag";

export const typeDefs = gql`
  extend type Stream {
    id: ID!
    sender: String
    recipient: String
    tokenAddress: String
    startBlock: Number
    stopBlock: Number
    payment: Number
    interval: Number
    status: String
    # balance: Balance @derivedFrom(field: "stream")
    # txs: [Transaction] @derivedFrom(field: "stream")
  }

  extend type Balance {
    id: ID!
    contract: Number
    sender: String
    # stream: String
    recipient: String
  }

  extend type Transaction {
    id: ID!
    block: Number
    event: String
    # stream: String
    timestamp: Number
  }
`;
