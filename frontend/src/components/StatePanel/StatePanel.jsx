import React from "react";
import "./StatePanel.css";

const placeholder = {
  name: "R134a",
  pressure: "3.2",
  temperature: "-5.0",
  dewOrBubble: "Dew",
  phase: "Saturated"
};

const StatePanel = () => (
  <div className="state-panel">
    <div className="state-panel-title">{placeholder.name}</div>
    <div className="state-panel-row">
      <div className="state-panel-label">Pressure</div>
      <div className="state-panel-value glow">{placeholder.pressure} <span className="unit">bar(g)</span></div>
    </div>
    <div className="state-panel-row">
      <div className="state-panel-label">Temperature</div>
      <div className="state-panel-value glow">{placeholder.temperature} <span className="unit">°C</span></div>
    </div>
    <div className="state-panel-row">
      <div className="state-panel-label">{placeholder.dewOrBubble}</div>
    </div>
    <div className="state-panel-phase {placeholder.phase.toLowerCase()}">
      {placeholder.phase}
    </div>
  </div>
);

export default StatePanel;
