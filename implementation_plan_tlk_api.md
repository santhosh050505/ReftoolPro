# Implementation Plan: TLK Energy API Integration (Revised)

This plan outlines the steps to integrate the TLK Energy API into the RefTools-Pro application for cycle plotting by updating the existing `thermoApiService`.

## 1. Goal
Replace the current mock implementation in `thermoApiService.js` with a live call to the TLK Energy API to fetch accurate thermodynamic state points.

## 2. API Format
- **URL**: `https://tlk-energy.de/api/cycle_calculation`
- **Method**: `GET`
- **Parameters**:
    - `refrigerant`: Code like `R600a`.
    - `calc_type`: `p_levels` or `temp_levels`.
    - `p_cond` / `T_cond`: Condensation value.
    - `p_evap` / `T_evap`: Evaporation value.
    - `dT_sh`: Superheating.
    - `dT_sc`: Subcooling.
    - `eta_is`: Compressor Efficiency (decimal).

## 3. Implementation Steps

### Step 3.1: Update `ProjectDashboard.jsx`
- Modify `handleGeneratePlot` to include the project's mode (`stateCycle`) in the `sessionStorage` data. This allows the plot page and service to know whether to use `p_levels` or `temp_levels`.

### Step 3.2: Update `thermoApiService.js`
- Rewrite `fetchDiagramData(calculations, stateCycle)`:
    1. Parse the `calculations` array to extract values for each state cycle type.
    2. Convert pressure to absolute Bar and temperature to Celsius if needed.
    3. Clean the refrigerant name (e.g., "R600a (Isobutane)" -> "R600a").
    4. Call the TLK API using `axios` or `fetch`.
    5. Fallback to the local calculation if the API fails or if data is missing.

### Step 3.3: Update `ThermoplotPage.jsx`
- Pass the `stateCycle` mode from `plotData` to the `fetchDiagramData` call.

## 4. Mapping Details (State Cycle -> API Param)

| Our "State Cycle" Type | Parameter Mapping |
| --- | --- |
| Condensation Pressure | `p_cond` |
| Evaporation Pressure | `p_evap` |
| Condensation Temperature | `T_cond` |
| Evaporation Temperature | `T_evap` |
| Superheating | `dT_sh` |
| Subcooling | `dT_sc` |
| Compressor Efficiency | `eta_is` |
| Liquid temperature | (Ignored) |

## 5. Potential Issues & Solutions
- **CORS**: If the TLK API doesn't allow cross-origin requests from localhost, we might need a proxy or handle it on the backend. (I'll try direct call first as it's a public tool).
- **Refrigerant Names**: Ensure the API matches our names. I'll use a mapping or extraction logic.

## 6. Next Actions
1. Modify `ProjectDashboard.jsx` to pass the project mode.
2. Implement the API call in `thermoApiService.js`.
3. Test the plotting functionality.
