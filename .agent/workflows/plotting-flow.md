---
description: Data Flow from Project Dashboard to Graph Plotting (CoolProp Integration)
---

# Workflow: Point Plotting in RefTools-Pro

This workflow describes how a thermodynamic cycle is calculated and plotted, starting from the user input in the Project Dashboard to the final rendering on the Plotly chart.

## 1. Frontend: Input & Trigger
- **Location**: `frontend/src/pages/ProjectDashboard/ProjectDashboard.jsx`
- **Action**: User clicks the "Generate Plot" button.
- **Process**:
    1. The `handleGeneratePlot` function collects all calculation rows (Condensation, Evaporation, Superheating, etc.).
    2. It stores the project data and the current `stateCycle` (Pressure vs Temperature mode) in `sessionStorage`.
    3. The application navigates to `/thermoplot`.

## 2. Frontend: Service Call
- **Location**: `frontend/src/services/thermoApiService.js`
- **Function**: `fetchDiagramData(calculations, stateCycle)`
- **Process**:
    1. Normalizes the refrigerant name (e.g., "R134a").
    2. Maps project rows to standard parameters (`p_cond`, `p_evap`, `dT_sh`, etc.).
    3. Sends a `GET` request to the backend: `/api/calculations/tlk-proxy`.

## 3. Backend: Bridge to CoolProp
- **Location**: `backend/controllers/calculationController.js`
- **Function**: `proxyTlkCalculation`
- **Process**:
    1. Receives the parameters via query string.
    2. Spawns a Python child process to run the `coolprop_cycle.py` script.
    3. Passes the parameters to the script via `stdin`.

## 4. Backend: CoolProp Calculation (The Engine)
- **Location**: `backend/scripts/coolprop_cycle.py`
- **Process**:
    1. Uses the `CoolProp.PropsSI` library to calculate thermodynamic states.
    2. **State 1 (Inlet)**: Saturation point based on Evaporation level + Superheating.
    3. **State 2 (Outlet)**: Compressor work calculation using Isentropic Efficiency.
    4. **State 3 (Condenser)**: Saturation point based on Condensation level - Subcooling.
    5. **State 4 (Expansion)**: Isenthalpic (constant enthalpy) expansion back to Evaporation pressure.
    6. Returns a JSON object containing `state_points` (h, p, T, s, d).

## 5. Frontend: Chart Rendering
- **Location**: `frontend/src/pages/ThermoplotPage/ThermoplotPage.jsx`
- **Process**:
    1. Receives the `state_points` array from the service.
    2. Maps the data for Plotly:
        - `x` axis = Enthalpy (`h`)
        - `y` axis = Pressure (`p`) (Logarithmic scale)
    3. Combines the cycle trace with the **Vapor Dome** trace (fetched from local JSON data).
    4. Plotly renders the lines and points on the `log(P)-h` diagram.

## Summary Diagram
`Project Table (UI)` -> `thermoApiService` -> `calcController (Node)` -> `coolprop_cycle.py (Python/CoolProp)` -> `Plotly Chart (UI)`
