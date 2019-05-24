import React, { Component } from "react";
import classnames from "classnames";
import PropTypes from "prop-types";

import EthereumLogo from "../../assets/images/ethereum-logo.svg";
import Modal from "../Modal";
import PrimaryButton from "../../components/PrimaryButton";

import "./modal-with-image.scss";

class ModalWithImage extends Component {
  static propTypes = {
    buttonLabel: PropTypes.string,
    image: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  render() {
    const { buttonLabel, image, label } = this.props;

    return (
      <Modal onClose={() => this.props.onClose()}>
        <div className="modal-with-image">
          <div className="modal-with-image__image-container">
            <img className="modal-with-image__image" alt="Modal" src={image || EthereumLogo} />
          </div>
          <div className="modal-with-image__label-container">
            <span className="modal-with-image__label">{label}</span>
          </div>
          {!buttonLabel ? null : (
            <PrimaryButton
              className={classnames(["modal-with-image__button", "primary-button--black"])}
              label={buttonLabel}
              onClick={() => this.props.onClose()}
            />
          )}
        </div>
      </Modal>
    );
  }
}

export default ModalWithImage;
