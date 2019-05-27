import gql from "graphql-tag";

export const GET_STREAMS = gql`
  query Streams($owner: String!) {
    streams(first: 100, orderBy: timestamp, orderDirection: desc, where: { owner: $owner }) {
      id
      flow
      owner
      rawStream {
        id
        interval
        payment
        recipient
        redemption {
          id
          recipientAmount
          senderAmount
        }
        sender
        startBlock
        stopBlock
        token {
          id
          decimals
          name
          symbol
        }
        txs {
          id
          block
          event
          timestamp
        }
        withdrawals {
          id
          amount
        }
      }
      timestamp
    }
  }
`;

export const GET_STREAM = gql`
  query Stream($streamId: ID!) {
    stream(id: $streamId) {
      id
      flow
      rawStream {
        id
        interval
        payment
        recipient
        redemption {
          id
          recipientAmount
          senderAmount
        }
        sender
        startBlock
        stopBlock
        token {
          id
          decimals
          name
          symbol
        }
        txs {
          id
          block
          event
          timestamp
        }
        withdrawals {
          id
          amount
        }
      }
    }
  }
`;
