// ToggleSwitch.jsx
import React from "react";
import "./ToggleSwitch.css";

const ToggleSwitch = ({ label, on = false, onChange }) => {
	return (
		<div className="toggle-switch">
			{label && <span className="toggle-label">{label}</span>}
			<div
				className={`toggle-track ${on ? "on" : "off"}`}
				onClick={() => onChange && onChange()}
				role="switch"
				aria-checked={on}
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onChange && onChange();
					}
				}}
			>
				<div className="toggle-knob" />
			</div>
		</div>
	);
};

export default ToggleSwitch;
