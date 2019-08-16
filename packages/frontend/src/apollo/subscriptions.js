/* eslint-disable import/prefer-default-export */
import gql from "graphql-tag";

export const GET_LAST_RAW_STREAM = gql`
  subscription LastRawStream($blockNumber: BigInt!, $sender: String!) {
    rawStreams(first: 1, where: { sender: $sender, startBlock_gte: $blockNumber }) {
      id
      startBlock
    }
  }
`;
