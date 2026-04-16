// Dropdown.jsx

import React, { useState } from "react";
import "./Dropdown.css";
import RefrigerantDrawer from "../RefrigerantDrawer/RefrigerantDrawer";

const refrigerants = [
  "R134a",
  "R404A",
  "R407C",
  "R410A",
  "R22",
  "CO₂",
  "R32",
  "R1234yf"
];

const Dropdown = ({ selected: selectedProp, onChange }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(selectedProp || "R407C");

  // Handle external change
  React.useEffect(() => {
    if (selectedProp && selectedProp !== selected) {
      setSelected(selectedProp);
    }
  }, [selectedProp]);

  const handleSelect = (opt) => {
    setSelected(opt);
    setDrawerOpen(false);
    if (onChange) onChange(opt);
  };

  return (
    <>
      <div className={`dropdown danfoss-bar`}
        tabIndex={0}
      >
        <div
          className="dropdown-bar"
          onClick={() => setDrawerOpen(true)}
        >
          <span className="dropdown-selected-text">{selected}</span>
          <span className="dropdown-menu-icon">☰</span>
        </div>
      </div>
      <RefrigerantDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSelect}
        selected={selected}
      />
    </>
  );
};

export default Dropdown;
