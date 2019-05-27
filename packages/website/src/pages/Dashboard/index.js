import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";
import ReactGA from "react-ga";
import ReactTable from "react-table";

import { connect } from "react-redux";
import { push } from "connected-react-router";
import { Query } from "react-apollo";
import { withTranslation } from "react-i18next";

import FaExternalLink from "../../assets/images/fa-external-link.svg";
import FaPlus from "../../assets/images/fa-plus.svg";
import Link from "../../components/Link";
import Loader from "../../components/Loader";
import ProgressBar from "../../components/ProgressBar";

import { GET_STREAMS } from "../../apollo/queries";
import { Parser } from "../../classes/parser";
import { selectors, watchBalance } from "../../redux/ducks/web3connect";
import { StreamFlow } from "../../classes/stream";

import "react-table/react-table.css";
import "./dashboard.scss";

class Dashboard extends Component {
  static propTypes = {
    account: PropTypes.string,
    block: PropTypes.shape({
      number: PropTypes.object.isRequired,
      timestamp: PropTypes.object.isRequired,
    }),
    push: PropTypes.func.isRequired,
    selectors: PropTypes.func.isRequired,
    watchBalance: PropTypes.func.isRequired,
  };

  componentDidMount() {
    ReactGA.pageview(window.location.pathname + window.location.search);
  }

  renderTable(streams) {
    const { account, block, t } = this.props;

    const cellData = streams.map((stream) => {
      const parser = new Parser(stream, account, block, t);
      return parser.parse();
    });

    return (
      <ReactTable
        className={classnames(["dashboard__table", "-highlight"])}
        columns={[
          {
            accessor: "flow",
            headerStyle: {
              marginLeft: "8px",
            },
            maxWidth: 100,
            style: {
              marginLeft: "8px",
            },
            Header: () => {
              return <span className="dashboard__header-label">{t("flow")}</span>;
            },
            Cell: (row) => {
              return (
                <div
                  className={classnames("dashboard__cell__flow-container", {
                    "dashboard__cell__flow-container--in": row.value === StreamFlow.IN.name,
                    "dashboard__cell__flow-container--out": row.value === StreamFlow.OUT.name,
                  })}
                >
                  <div className="dashboard__cell__flow-label">{t(`${row.value.toLowerCase()}`)}</div>
                </div>
              );
            },
          },
          {
            accessor: "status",
            // maxWidth: 120,
            Header: () => {
              return <span className="dashboard__header-label">{t("status")}</span>;
            },
            Cell: (row) => {
              return row.value.charAt(0) + row.value.slice(1).toLowerCase();
            },
          },
          {
            accessor: "rate",
            Header: () => {
              return <span className="dashboard__header-label">{t("rate")}</span>;
            },
            Cell: (row) => {
              return <div className="dashboard__cell__label">{row.value}</div>;
            },
          },
          {
            accessor: "from.short",
            Header: () => {
              return <span className="dashboard__header-label">{t("from")}</span>;
            },
            Cell: (row) => {
              return <div className="dashboard__cell__label">{row.value}</div>;
            },
          },
          {
            accessor: "to.short",
            Header: () => {
              return <span className="dashboard__header-label">{t("to")}</span>;
            },
            Cell: (row) => {
              return <div className="dashboard__cell__label">{row.value}</div>;
            },
          },
          {
            accessor: "funds.paid",
            maxWidth: 70,
            Header: () => {
              return <span className="dashboard__header-label">{t("funds")}</span>;
            },
            Cell: (row) => {
              return (
                <div className="dashboard__cell__label">
                  {row.value} {row.original.token.symbol}
                </div>
              );
            },
          },
          {
            accessor: "funds.ratio",
            Header: null,
            Cell: (row) => {
              return <ProgressBar className="dashboard__cell__progress-bar" percentage={row.value} />;
            },
          },
          {
            accessor: "startTime",
            minWidth: 140,
            Header: () => {
              return <span className="dashboard__header-label">{t("startTime")}</span>;
            },
            Cell: (row) => {
              return (
                <div className={classnames(["dashboard__cell__label", "dashboard__cell__time-label"])}>{row.value}</div>
              );
            },
          },
          {
            accessor: "stopTime",
            minWidth: 140,
            Header: () => {
              return <span className="dashboard__header-label">{t("stopTime")}</span>;
            },
            Cell: (row) => {
              return (
                <div className={classnames(["dashboard__cell__label", "dashboard__cell__time-label"])}>{row.value}</div>
              );
            },
          },
          {
            accessor: "link",
            maxWidth: 100,
            Header: () => {
              return <span className="dashboard__header-label">{t("link")}</span>;
            },
            Cell: (row) => {
              return (
                <Link target="_blank" to={row.value}>
                  <img className="dashboard__cell__external-link" alt="External Link" src={FaExternalLink} />
                </Link>
              );
            },
          },
        ]}
        data={cellData}
        defaultPageSize={99999}
        getTdProps={(state, rowInfo, column, instance) => {
          return {
            onClick: (e, handleOriginal) => {
              if (column.id !== "link") {
                const cellDataItem = cellData[rowInfo.index];
                this.props.push(`/stream/${cellDataItem.rawStreamId}`);
              }
            },
          };
        }}
        minRows={0}
        noDataText=""
        resizable={false}
        showPagination={false}
        sortable={false}
      />
    );
  }

  render() {
    const { account, t } = this.props;
    return (
      <div className="dashboard">
        <div className="dashboard__title-label">{t("dashboard")}</div>
        <Link className="dashboard__plus-icon-container" to={"/"}>
          <img className="dashboard__plus-icon" alt="New Stream" src={FaPlus} />
        </Link>
        <Query query={GET_STREAMS} variables={{ owner: account }}>
          {({ loading, error, data }) => {
            return (
              <div>
                {!loading ? null : <Loader className="dashboard__loader" delay={100} />}
                {!error ? null : <div className="dashboard__no-data">{t("error")}</div>}
                {loading || (data && data.streams && data.streams.length !== 0) ? null : (
                  <div className="dashboard__no-data">{t("noData")}</div>
                )}
                {this.renderTable(data.streams || [])}
              </div>
            );
          }}
        </Query>
      </div>
    );
  }
}

export default connect(
  (state) => ({
    account: state.web3connect.account,
    block: state.web3connect.block,
  }),
  (dispatch) => ({
    push: (path) => dispatch(push(path)),
    selectors: () => dispatch(selectors()),
    watchBalance: ({ balanceOf, tokenAddress }) => dispatch(watchBalance({ balanceOf, tokenAddress })),
  }),
)(withTranslation()(Dashboard));
