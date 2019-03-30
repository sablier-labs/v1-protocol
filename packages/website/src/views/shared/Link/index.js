/* eslint-disable jsx-a11y/anchor-has-content */
import * as React from 'react';
import { Link as LinkImport } from 'react-router-dom';
import validator from 'validator';

const Link = ({to, ...otherProps}) => (
  validator.isURL(to)
    ? (
      <a
        href={to}
        {...otherProps}
      />
    ) : (
      <LinkImport
        to={to}
        {...otherProps}
      />
    )
);

export default Link;
