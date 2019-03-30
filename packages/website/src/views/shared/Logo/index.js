import React from "react";

import LogoWhite from "../../../assets/images/logo-white.svg";
import LogoTypefaceWhite from "../../../assets/images/logo-typeface-white.png";

import "./logo.scss";

export default function Logo(props) {
  return (
    <div className="logo">
      <img className="logo__icon" src={LogoWhite} alt="Logo" />
      <img className="logo__typeface" src={LogoTypefaceWhite} alt="Logo Typeface" />
    </div>
  );
}
