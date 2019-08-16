import React, { Component } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { CSSTransitionGroup } from "react-transition-group";

import "./modal.scss";

const modalRoot = document.querySelector("#modal-root");

class Modal extends Component {
  render() {
    const { children, onClose } = this.props;
    return ReactDOM.createPortal(
      <div>
        <CSSTransitionGroup
          transitionName="modal-container"
          transitionAppear
          transitionLeave
          transitionAppearTimeout={200}
          transitionLeaveTimeout={200}
          transitionEnterTimeout={200}
        >
          <div
            className="modal-container"
            onClick={onClose}
            onKeyDown={onClose}
            key="modal"
            role="button"
            tabIndex={0}
          />
        </CSSTransitionGroup>
        {children}
      </div>,
      modalRoot,
    );
  }
}

Modal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default Modal;
