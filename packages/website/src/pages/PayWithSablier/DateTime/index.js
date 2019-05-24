import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

import DatePicker from "../../../components/MyReactDatePicker";
import Modal from "../../../components/Modal";

import { formatTime } from "../../../helpers/format-utils";
import { isDayJs, isIntervalShorterThanADay } from "../../../helpers/time-utils";
import { INTERVAL_MINUTES } from "../../../constants/time";

import "react-datepicker/dist/react-datepicker.css";
import "./datetime.scss";
class SablierDateTime extends Component {
  static propTypes = {
    className: PropTypes.string,
    inputClassNames: PropTypes.string,
    interval: PropTypes.string.isRequired,
    maxTime: PropTypes.object,
    minTime: PropTypes.object,
    name: PropTypes.string.isRequired,
    onSelectTime: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    selectedTime: PropTypes.object,
  };

  state = {
    showModal: false,
    showTimeSelect: false,
  };

  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const showTimeSelect = nextProps.name === "startTime" || isIntervalShorterThanADay(nextProps.interval);
    if (showTimeSelect !== prevState.showTimeSelect) {
      return { showTimeSelect };
    } else {
      return null;
    }
  }

  onClose(newTime) {
    this.setState({ showModal: false });
    this.inputRef.current.blur();
    if (newTime) {
      this.props.onSelectTime(newTime);
    }
  }

  onSelectTime(time) {
    const { minTime, selectedTime } = this.props;
    let newTime = dayjs(time);

    if (
      isDayJs(selectedTime) &&
      (selectedTime.hour() !== newTime.hour() || selectedTime.minute() !== newTime.minute())
    ) {
      this.onClose(newTime);
      return;
    }

    if (!isDayJs(selectedTime)) {
      if (minTime.isAfter(newTime)) {
        newTime = minTime.hour(newTime.hour()).minute(newTime.minute());
      }
      this.onClose(newTime);
      return;
    }

    this.props.onSelectTime(newTime);
  }

  renderModal() {
    const { maxTime, minTime, selectedTime } = this.props;
    const { showModal, showTimeSelect } = this.state;

    if (!showModal) {
      return null;
    }

    const maxDate = isDayJs(maxTime) ? maxTime.toDate() : undefined;
    const minDate = isDayJs(minTime) ? minTime.toDate() : undefined;
    const selectedDate = isDayJs(selectedTime) ? selectedTime.toDate() : undefined;

    return (
      <Modal onClose={() => this.onClose()}>
        <DatePicker
          calendarClassName="sablier-datetime-modal"
          excludeOutOfBoundsTimes
          inline
          maxDate={maxDate}
          minDate={minDate}
          onChange={(time) => this.onSelectTime(time)}
          onClickOutside={() => this.onClose()}
          selected={selectedDate}
          showTimeSelect={showTimeSelect}
          dateFormat="h:mm aa"
          timeIntervals={INTERVAL_MINUTES.hour}
          withPortal
        />
      </Modal>
    );
  }

  render() {
    const { className, inputClassNames, name, placeholder, selectedTime, t } = this.props;

    return (
      <div className={classnames("sablier-datetime", className)}>
        <input
          autoComplete="off"
          className={classnames("sablier-datetime__input", inputClassNames)}
          id={name}
          name={name}
          onFocus={() => this.setState({ showModal: true })}
          placeholder={placeholder || t("selectTime")}
          readOnly={true}
          ref={this.inputRef}
          value={isDayJs(selectedTime) ? formatTime(t, selectedTime, { prettyPrint: true }) : ""}
        />
        {this.renderModal()}
      </div>
    );
  }
}

export default withTranslation()(SablierDateTime);
