import React from "react";

import LogoWhite from "../../../assets/images/logo-white.svg";
import LogoTypefaceWhite from "../../../assets/images/logo-typeface-white.png";

import "./logo.scss";

export default function Logo(props) {
  return (
    <div className="logo">
      <img className="logo__icon" alt="Logo" src={LogoWhite} />
      <img className="logo__typeface" alt="Logo Typeface" src={LogoTypefaceWhite} />
    </div>
  );
}
