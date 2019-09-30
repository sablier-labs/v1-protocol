/* eslint-disable class-methods-use-this */
import React from "react";
import PropTypes from "prop-types";

import Config from "../../config/Config";
import Watcher from "../Watcher/Watcher";

const stream = {
  total: 1000,
  streamed: 97,
  withdrawn: 20,

  /**
   * TODO EXPECT TIME IN MILLISECONDS
   */

  time: String(8 * 60 * 60 * 1000),
  timeRemaining: String(6 * 60 * 60 * 1000 - 12 * 1000),

  history: [
    {
      type: Config.STREAM_HISTORY_TYPE_WITHDRAW_AUTO,
      date: "August 1st, 5:05 PM",
      amount: 50,
      url: "https://www.vansoftware.ro",
      id: 3,
    },
    {
      type: Config.STREAM_HISTORY_TYPE_WITHDRAW_MANUAL,
      date: "August 1st, 4:23 PM",
      amount: 100,
      url: "https://www.vansoftware.ro",
      id: 2,
    },
    {
      type: Config.STREAM_HISTORY_TYPE_DEPOSIT,
      date: "August 1st, 9:01 AM",
      amount: 500,
      url: "https://www.vansoftware.ro",
      id: 1,
    },
  ],
  addresses: { from: "0x123addd...e44d", to: "0x123addd...e44d" },
};

const WithdrawFromStream = ({ burnerComponents }) => {
  const { Page } = burnerComponents;
  return (
    <Page className="my-page" title="Withdraw from Stream">
      <Watcher size={450} {...stream} />
    </Page>
  );
};

WithdrawFromStream.propTypes = {
  burnerComponents: PropTypes.shape({
    Page: PropTypes.func.isRequired,
  }).isRequired,
};

export default WithdrawFromStream;
