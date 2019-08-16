/* eslint-disable no-case-declarations */
import dayjs from "dayjs";

import { BigNumber as BN } from "bignumber.js";
import { toChecksumAddress } from "web3-utils";

import StreamFlow from "./stream/flow";
import StreamStatus from "./stream/status";

import { MAINNET_BLOCK_TIME_AVERAGE } from "../constants/time";
import { formatDuration, formatTime, roundToDecimalPoints } from "../helpers/format-utils";
import { getEtherscanTransactionLink } from "../helpers/web3-utils";
import { getUnitValue } from "../helpers/token-utils";
import { roundTimeAroundHour } from "../helpers/time-utils";

export const initialState = {
  flow: "",
  from: "",
  funds: {
    deposit: 0,
    paid: 0,
    ratio: 0,
    remaining: 0,
    withdrawable: 0,
    withdrawn: 0,
  },
  link: "",
  rate: "",
  rawStreamId: "",
  redemption: null,
  startTime: "",
  status: "",
  stopTime: "",
  to: "",
  token: {
    address: "",
    symbol: "",
  },
};

/**
 * Class to handle actions related to streams stored in the subgraph
 */
export class Parser {
  constructor(stream, account, block, translations) {
    this.account = toChecksumAddress(account);
    this.block = block;
    this.translations = translations;

    // See the following
    // - https://stackoverflow.com/questions/13104494/does-javascript-pass-by-reference
    // eslint-disable-next-line max-len
    // - https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript/5344074#5344074
    this.stream = JSON.parse(JSON.stringify(stream));
    this.stream.rawStream.interval = new BN(stream.rawStream.interval);
    this.stream.rawStream.payment = new BN(stream.rawStream.payment);
    this.stream.rawStream.recipient = toChecksumAddress(stream.rawStream.recipient);
    this.stream.rawStream.sender = toChecksumAddress(stream.rawStream.sender);
    this.stream.rawStream.startBlock = new BN(stream.rawStream.startBlock);
    this.stream.rawStream.stopBlock = new BN(stream.rawStream.stopBlock);

    // Highly important function, but also really tricky. In the subgraph, it is not possible to continuously
    // update the status based on the current block number (smart contracts cannot act like cron jobs).
    // Therefore, it is up to the client to compute the status based on the current block number.
    let status = StreamStatus.UNDEFINED.name;
    if (!stream.rawStream.redemption) {
      if (block.number.isLessThan(this.stream.rawStream.startBlock)) {
        status = StreamStatus.CREATED.name;
      } else if (
        block.number.isGreaterThanOrEqualTo(this.stream.rawStream.startBlock) &&
        block.number.isLessThanOrEqualTo(this.stream.rawStream.stopBlock)
      ) {
        status = StreamStatus.ACTIVE.name;
      } else {
        status = StreamStatus.ENDED.name;
      }
    } else {
      // Humans would arguably understand better the concept of a stream being "Ended" when
      // that stream has successfully paid the recipient all the funds deposited initially.
      // eslint-disable-next-line no-lonely-if
      if (stream.rawStream.redemption.senderAmount === 0) {
        status = StreamStatus.ENDED.name;
      } else {
        status = StreamStatus.REDEEMED.name;
      }
    }
    this.stream.rawStream.status = status;
  }

  static getMinutesForBlockDelta(blockDelta) {
    const seconds = Parser.getSecondsForBlockDelta(blockDelta);
    return BN(seconds.dividedBy(BN(60)).toFixed(0));
  }

  static getSecondsForBlockDelta(blockDelta) {
    return blockDelta.multipliedBy(MAINNET_BLOCK_TIME_AVERAGE);
  }

  static getTimeForBlockDelta(blockDelta, forPast = true) {
    const seconds = Parser.getSecondsForBlockDelta(blockDelta);
    let time = dayjs();
    if (forPast) {
      time = time.subtract(seconds, "second");
    } else {
      time = time.add(seconds, "second");
    }
    return roundTimeAroundHour(time);
  }

  parseAddresses() {
    const { stream, translations } = this;
    const { flow, rawStream } = stream;
    const { recipient, sender } = rawStream;

    if (flow === StreamFlow.IN.name) {
      return {
        from: {
          long: sender,
          short: `${sender.substring(0, 6)}...${sender.substring(38)}`,
        },
        to: {
          long: translations("you"),
          short: translations("you"),
        },
      };
    }

    if (flow === StreamFlow.OUT.name) {
      return {
        from: {
          long: translations("you"),
          short: translations("you"),
        },
        to: {
          long: recipient,
          short: `${recipient.substring(0, 6)}...${recipient.substring(38)}`,
        },
      };
    }

    return {
      from: {
        long: "",
        short: "",
      },
      to: {
        long: "",
        short: "",
      },
    };
  }

  parseFunds() {
    const { stream, block } = this;
    const { rawStream } = stream;
    const { interval, payment, startBlock, stopBlock, token, withdrawals } = rawStream;

    const totalBlockDeltaBN = stopBlock.minus(startBlock);
    const depositBN = totalBlockDeltaBN.dividedBy(interval).multipliedBy(payment);
    const depositValue = getUnitValue(depositBN, token.decimals);

    let blockDeltaBN;
    switch (rawStream.status) {
      case StreamStatus.ACTIVE.name:
        blockDeltaBN = block.number.minus(startBlock);
        const modulusBN = blockDeltaBN.modulo(interval);
        blockDeltaBN = blockDeltaBN.minus(modulusBN);
        break;
      case StreamStatus.REDEEMED.name:
        const redemptionBlockNumber = rawStream.txs[rawStream.txs.length - 1].block;
        const redemptionBlockNumberBN = new BN(redemptionBlockNumber);
        if (redemptionBlockNumberBN.isLessThanOrEqualTo(startBlock)) {
          blockDeltaBN = new BN(0);
        } else {
          blockDeltaBN = redemptionBlockNumberBN.minus(startBlock);
        }
        break;
      case StreamStatus.ENDED.name:
        blockDeltaBN = stopBlock.minus(startBlock);
        break;
      default:
        return {
          deposit: depositValue,
          paid: 0,
          ratio: 0,
          remaining: depositValue,
          withdrawable: 0,
          withdrawn: 0,
        };
    }

    const paidBN = blockDeltaBN.dividedBy(interval).multipliedBy(payment);
    const paidValue = getUnitValue(paidBN, token.decimals);
    const remainingBN = depositBN.minus(paidBN);
    const remainingValue = getUnitValue(remainingBN, token.decimals);

    const ratioBN = paidBN.dividedBy(depositBN).multipliedBy(new BN(100));
    const ratioValue = roundToDecimalPoints(ratioBN.toNumber(), 0);

    let withdrawnBN = new BN(0);
    withdrawals.forEach((withdrawal) => {
      withdrawnBN = withdrawnBN.plus(new BN(withdrawal.amount));
    });
    const withdrawnValue = getUnitValue(withdrawnBN, token.decimals);

    const withdrawableBN = paidBN.minus(withdrawnBN);
    const withdrawableValue = getUnitValue(withdrawableBN, token.decimals);

    return {
      deposit: depositValue,
      paid: paidValue,
      ratio: ratioValue,
      remaining: remainingValue,
      withdrawable: withdrawableValue,
      withdrawn: withdrawnValue,
    };
  }

  parseRate() {
    const { stream, translations } = this;
    const { rawStream } = stream;

    // TODO: use the Etherscan API to calculate time and be loose with off-by-one errors.
    // At the moment, the string interval won't be resolved lest the MAINNET_BLOCK_TIME_AVERAGE is
    // 15 seconds.
    const paymentBN = new BN(rawStream.payment);
    const payment = getUnitValue(paymentBN, rawStream.token.decimals);
    const minutes = this.getMinutesForBlockDelta(rawStream.interval);

    const formattedInterval = formatDuration(translations, minutes)
      .replace(`1 ${translations("month")}`, translations("month"))
      .replace(`1 ${translations("day")}`, translations("day"))
      .replace(`1 ${translations("hour")}`, translations("hour"))
      .replace(`1 ${translations("min")}`, translations("min"));
    return `${payment} ${rawStream.token.symbol}/ ${formattedInterval.toLowerCase()}`;
  }

  parseRedemption() {
    const { stream, translations } = this;
    const { rawStream } = stream;

    if (rawStream.status !== StreamStatus.REDEEMED.name) {
      return {};
    }

    const { timestamp } = rawStream.txs[rawStream.txs.length - 1];
    const redemptionTime = formatTime(translations, dayjs.unix(timestamp));

    return {
      ...rawStream.redemption,
      time: redemptionTime,
    };
  }

  parseTimes() {
    const { stream, block, translations } = this;
    const { rawStream } = stream;
    const { startBlock, stopBlock } = rawStream;

    const blockNumberBN = new BN(block.number);
    const intervalInMinutes = this.getMinutesForBlockDelta(rawStream.interval);
    let startTime;
    let stopTime;

    // Not using the `status` here because start and stop times are independent of it
    // Before the start of the stream
    if (block.number.isLessThanOrEqualTo(startBlock)) {
      const startBlockDelta = startBlock.minus(block.number);
      const startDate = this.getTimeForBlockDelta(startBlockDelta, false);
      startTime = formatTime(translations, startDate, { minimumInterval: intervalInMinutes, prettyPrint: true });

      const stopBlockDelta = stopBlock.minus(block.number);
      const stopDate = this.getTimeForBlockDelta(stopBlockDelta, false);
      stopTime = formatTime(translations, stopDate, { minimumInterval: intervalInMinutes, prettyPrint: true });
    }
    // During the stream
    else if (block.number.isLessThanOrEqualTo(stopBlock)) {
      const startBlockDelta = blockNumberBN.minus(startBlock);
      const startMinutes = this.getMinutesForBlockDelta(startBlockDelta);
      const startDuration = formatDuration(translations, startMinutes, intervalInMinutes).toLowerCase();
      startTime = `${startDuration} ${translations("ago").toLowerCase()}`;

      const stopBlockDelta = stopBlock.minus(block.number);
      const stopMinutes = this.getMinutesForBlockDelta(stopBlockDelta);
      const stopDuration = formatDuration(translations, stopMinutes, intervalInMinutes).toLowerCase();
      stopTime = `${stopDuration} ${translations("left").toLowerCase()}`;
    }
    // After the end of the stream
    else {
      const startBlockDelta = blockNumberBN.minus(startBlock);
      const startDate = this.getTimeForBlockDelta(startBlockDelta, true);
      startTime = formatTime(translations, startDate, { minimumInterval: intervalInMinutes, prettyPrint: true });

      const stopBlockDelta = blockNumberBN.minus(stopBlock);
      const stopDate = this.getTimeForBlockDelta(stopBlockDelta, true);
      stopTime = formatTime(translations, stopDate, { minimumInterval: intervalInMinutes, prettyPrint: true });
    }

    return { startTime, stopTime };
  }

  parse() {
    const { stream } = this;
    const { flow, rawStream } = stream;
    const { id, status, token, txs } = rawStream;

    const funds = this.parseFunds();
    const { from, to } = this.parseAddresses();
    const link = getEtherscanTransactionLink(txs[0].id);
    const rate = this.parseRate();
    const redemption = this.parseRedemption();
    const { startTime, stopTime } = this.parseTimes();
    const tokenAddress = toChecksumAddress(token.id);

    return {
      flow: flow.toUpperCase(),
      from,
      funds,
      link,
      rate,
      rawStreamId: id,
      redemption,
      to,
      startTime,
      status,
      stopTime,
      token: {
        address: tokenAddress,
        decimals: token.decimals,
        symbol: token.symbol,
      },
    };
  }
}
