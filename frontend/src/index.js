import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from 'react-router-dom';
import App from "./App";
import { initializeConsoleControl } from "./utils/consoleControl";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/controls.css";
import "./styles/buttons.css";

// Initialize console control (disables all logs in production)
initializeConsoleControl();

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Router>
    <App />
  </Router>
);
