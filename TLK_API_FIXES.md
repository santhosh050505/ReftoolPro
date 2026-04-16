# TLK Energy API Integration - Fixes Applied

## Problem
The enthalpy values (x-axis) on the P-h diagram were incorrect. The API was returning correct values (e.g., 389.11 kJ/kg), but the application was displaying local calculation values (e.g., 457.2 kJ/kg).

## Root Causes Identified

### 1. **Route Ordering Issue** ✅ FIXED
- The `/tlk-proxy` route was placed **after** the authentication middleware
- The `/:id` route was catching `/tlk-proxy` before it could reach the proxy handler
- **Fix**: Moved `/tlk-proxy` route **before** `router.use(auth.verifyUser)`

### 2. **Data Flow Issues** ✅ FIXED
- API data wasn't being properly merged into plotData state
- Missing error handling in the API fetch process
- **Fix**: Added proper try-catch blocks and explicit state updates

### 3. **Logging for Debugging** ✅ ADDED
- Added comprehensive logging throughout the data flow:
  - `[TLK API]` - API request and response logging
  - `[ThermoplotPage]` - State update logging
  - `[ChartData]` - Data source detection logging

## Changes Made

### Backend (`calculationRoutes.js`)
```javascript
// Moved to TOP of file, before auth middleware
router.get('/tlk-proxy', calculationController.proxyTlkCalculation);
```

### Backend (`calculationController.js`)
- Added `axios` import
- Created `proxyTlkCalculation` function to forward TLK API requests

### Frontend (`thermoApiService.js`)
- Changed API URL from direct TLK to backend proxy
- Added detailed logging for request/response
- Properly map API response fields (x→h, y→p, T→t)

### Frontend (`ThermoplotPage.jsx`)
- Added loading state management
- Enhanced error handling in useEffect
- Added detailed console logging
- Fixed dependency array in useEffect

## Expected Behavior

When you click "Plot Diagram":

1. **Console logs** should show:
   ```
   [ThermoplotPage] Fetching diagram data from API...
   [TLK API] Requesting cycle data via proxy: http://localhost:5000/...
   [TLK API] Raw response: { state_points: [...], cycle_info: {...} }
   [TLK API] Mapped state_points: [{ h: 389.11, p: 3.0, t: 19.76, ... }]
   [ThermoplotPage] Updated plotData: { state_points: [...] }
   [ChartData] Using data source: API state_points
   [ChartData] First point enthalpy: 389.11
   ```

2. **Cycle Summary** should display:
   ```
   Evaporator Inlet: 3.00 bar, 19.8 °C, 389.1 kJ/kg  ← Correct!
   ```

3. **P-h Diagram** should match TLK Energy reference tool

## Testing Steps

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Refresh the page** (Ctrl+F5)
3. Open **Developer Console** (F12)
4. Click **"Plot Diagram"**
5. Check console logs for `[TLK API]` and `[ChartData]` messages
6. Verify enthalpy values match TLK Energy reference

## Troubleshooting

If enthalpy is still incorrect:

1. Check console for errors
2. Verify backend is running (`npm run dev` in backend folder)
3. Check if `/tlk-proxy` route is accessible:
   - Open: `http://localhost:5000/api/calculations/tlk-proxy?refrigerant=R600a&calc_type=p_levels&p_cond=12&p_evap=3&dT_sh=0&dT_sc=0&eta_is=1`
   - Should return JSON with `state_points` array
### 4. **Local Precision Improvements** ✅ FIXED
- Updated `calculatePointEnthalpy` to use data from local JSON files if the API is unavailable.
- This ensures enthalpy values always match the vapor dome even in fallback mode.
- Improved name matching for "Condensation" and "Evaporation" rows.

### 5. **Robustness to User Input** ✅ FIXED
- The app now automatically swaps Condensation and Evaporation pressures if the user enters them backwards, ensuring a valid cycle is always plotted.
