import React, { Component } from "react";
import classnames from "classnames";
import DatePicker from "../MyReactDatePicker";
import dayjs from "dayjs";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

import Modal from "../Modal";

import { formatTime } from "../../../helpers/format-utils";
import { isDayJs, isIntervalShorterThanADay } from "../../../helpers/time-utils";
import { intervalMins } from "../../../constants/time";

import "react-datepicker/dist/react-datepicker.css";
import "./datetime.scss";
class SablierDateTime extends Component {
  static propTypes = {
    classNames: PropTypes.string,
    inputClassNames: PropTypes.string,
    interval: PropTypes.string.isRequired,
    maxTime: PropTypes.object,
    minTime: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    onSelectTime: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    value: PropTypes.object.isRequired,
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

  onClose() {
    this.setState({ showModal: false });
    this.inputRef.current.blur();
  }

  onSelectTime(time) {
    const { value: previouslySelectedTime } = this.props;
    const newTime = dayjs(time);

    if (
      isDayJs(previouslySelectedTime) &&
      (previouslySelectedTime.hour() !== newTime.hour() || previouslySelectedTime.minute() !== newTime.minute())
    ) {
      this.onClose();
    }

    if (!isDayJs(previouslySelectedTime) && (newTime.hour() !== 0 || newTime.minute() !== 0)) {
      this.onClose();
    }

    this.props.onSelectTime(newTime);
  }

  renderModal() {
    const { maxTime, minTime, value } = this.props;
    const { showModal, showTimeSelect } = this.state;

    if (!showModal) {
      return null;
    }

    const maxDate = isDayJs(maxTime) ? maxTime.toDate() : undefined;
    const minDate = isDayJs(minTime) ? minTime.toDate() : undefined;
    const selectedDate = isDayJs(value) ? value.toDate() : undefined;

    return (
      <Modal onClose={() => this.onClose()}>
        <DatePicker
          calendarClassName="sablier-datetime-modal"
          excludeOutOfBoundsTimes
          inline
          maxDate={maxDate}
          minDate={minDate}
          onChange={(value) => this.onSelectTime(value)}
          onClickOutside={() => this.onClose()}
          selected={selectedDate}
          showTimeSelect={showTimeSelect}
          dateFormat="h:mm aa"
          timeIntervals={intervalMins.hour}
          withPortal
        />
      </Modal>
    );
  }

  render() {
    const { classNames, inputClassNames, name, placeholder, value, t } = this.props;

    return (
      <div className={classnames("sablier-datetime", classNames)}>
        <input
          autoComplete="off"
          className={classnames("sablier-datetime__input", inputClassNames)}
          id={name}
          name={name}
          onFocus={() => this.setState({ showModal: true })}
          placeholder={placeholder || t("selectTime")}
          readOnly={true}
          ref={this.inputRef}
          value={isDayJs(value) ? formatTime(t, value) : ""}
        />
        {this.renderModal()}
      </div>
    );
  }
}

export default withTranslation()(SablierDateTime);
