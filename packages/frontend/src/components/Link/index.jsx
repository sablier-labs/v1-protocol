/* eslint-disable jsx-a11y/anchor-has-content */
import React from "react";
import PropTypes from "prop-types";
import validator from "validator";

import { Link as LinkImport } from "react-router-dom";

const Link = ({ to, ...otherProps }) => {
  return validator.isURL(to) ? <a href={to} {...otherProps} /> : <LinkImport to={to} {...otherProps} />;
};

Link.propTypes = {
  to: PropTypes.string.isRequired,
};

export default Link;
