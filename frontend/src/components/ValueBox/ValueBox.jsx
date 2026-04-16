import React from "react";
import "./ValueBox.css";

const ValueBox = ({ label, value, unit }) => (
  <div className="value-box">
    <div className="value-box-label">{label}</div>
    <div className="value-box-value">{value}</div>
    <div className="value-box-unit">{unit}</div>
  </div>
);

export default ValueBox;
