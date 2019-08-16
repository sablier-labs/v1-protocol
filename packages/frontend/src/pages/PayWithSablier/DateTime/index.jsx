import React, { Component } from "react";
import classnames from "classnames";
import dayjs from "dayjs";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

import DatePicker from "../MyReactDatePicker";
import Modal from "../../../components/Modal";

import { formatTime } from "../../../helpers/format-utils";
import { isDayJs, isIntervalShorterThanADay } from "../../../helpers/time-utils";
import { INTERVAL_MINUTES } from "../../../constants/time";

import "react-datepicker/dist/react-datepicker.css";
import "./datetime.scss";

class SablierDateTime extends Component {
  constructor(props) {
    super(props);
    this.inputRef = React.createRef();
    this.state = {
      showModal: false,
      showTimeSelect: false,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const showTimeSelect = nextProps.name === "startTime" || isIntervalShorterThanADay(nextProps.interval);
    if (showTimeSelect !== prevState.showTimeSelect) {
      return { showTimeSelect };
    }
    return null;
  }

  onClose(newTime) {
    const { onSelectTime } = this.props;
    this.setState({ showModal: false });
    this.inputRef.current.blur();
    if (newTime) {
      onSelectTime(newTime);
    }
  }

  onSelectTime(time) {
    const { minTime, onSelectTime, selectedTime } = this.props;
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

    onSelectTime(newTime);
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
    const { className, inputClassName, name, placeholder, selectedTime, t } = this.props;

    return (
      <div className={classnames("sablier-datetime", className)}>
        <input
          autoComplete="off"
          className={classnames("sablier-datetime__input", inputClassName)}
          id={name}
          name={name}
          onFocus={() => this.setState({ showModal: true })}
          placeholder={placeholder || t("selectTime")}
          readOnly
          ref={this.inputRef}
          value={isDayJs(selectedTime) ? formatTime(t, selectedTime, { prettyPrint: true }) : ""}
        />
        {this.renderModal()}
      </div>
    );
  }
}

SablierDateTime.propTypes = {
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  interval: PropTypes.string.isRequired,
  maxTime: PropTypes.shape({
    toDate: PropTypes.func.isRequired,
  }),
  minTime: PropTypes.shape({
    hour: PropTypes.func.isRequired,
    isAfter: PropTypes.func.isRequired,
    toDate: PropTypes.func.isRequired,
  }),
  name: PropTypes.string.isRequired,
  onSelectTime: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  selectedTime: PropTypes.shape({
    hour: PropTypes.func.isRequired,
    minute: PropTypes.func.isRequired,
    toDate: PropTypes.func.isRequired,
  }),
  t: PropTypes.shape({}),
};

SablierDateTime.defaultProps = {
  className: "",
  inputClassName: "",
  maxTime: null,
  minTime: null,
  placeholder: "",
  selectedTime: null,
  t: {},
};

export default withTranslation()(SablierDateTime);
