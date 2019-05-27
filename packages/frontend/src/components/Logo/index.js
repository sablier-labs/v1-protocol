import React from "react";

import Link from "../Link";
import LogoWhite from "../../assets/images/logo-white.svg";
import LogoTypefaceWhite from "../../assets/images/logo-typeface-white.png";

import "./logo.scss";

export default () => {
  return (
    <Link className="logo" to="/">
      <img className="logo__icon" alt="Logo" src={LogoWhite} />
      <img className="logo__typeface" alt="Logo Typeface" src={LogoTypefaceWhite} />
    </Link>
  );
};
