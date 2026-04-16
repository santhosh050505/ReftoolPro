import sys
import json
import CoolProp.CoolProp as CP
from coolprop_utils import get_fluid

def calculate_cycle(params):
    try:
        refrigerant = params.get('refrigerant', 'R134a')
        fluid = get_fluid(refrigerant)
        print(f"DEBUG: Using fluid {fluid}", file=sys.stderr)
        
        calc_type = params.get('calc_type', 'p_levels')
        dT_sh = float(params.get('dT_sh', 0)) # K
        dT_sc = float(params.get('dT_sc', 0)) # K
        eta_is = float(params.get('eta_is', 0.7))
        
        if calc_type == 'p_levels':
            # BUG #5 FIXED: params.get() returns None if key is missing; float(None) raises TypeError
            p_cond = float(params.get('p_cond') or 0) * 1e5  # bar to Pa
            p_evap = float(params.get('p_evap') or 0) * 1e5  # bar to Pa
            if p_cond <= 0 or p_evap <= 0:
                return {"error": "p_cond and p_evap must be positive non-zero values for p_levels mode"}
            
            # Get Saturation temperatures at these pressures
            T_cond_sat = CP.PropsSI('T', 'P', p_cond, 'Q', 0, fluid)
            T_evap_sat = CP.PropsSI('T', 'P', p_evap, 'Q', 1, fluid)
        else:
            T_cond_sat = float(params.get('T_cond')) + 273.15 # C to K
            T_evap_sat = float(params.get('T_evap')) + 273.15 # C to K
            
            # Get Saturation pressures at these temperatures
            p_cond = CP.PropsSI('P', 'T', T_cond_sat, 'Q', 0, fluid)
            p_evap = CP.PropsSI('P', 'T', T_evap_sat, 'Q', 1, fluid)

        # --- STATE POINTS ---
        
        # State 1: Compressor Inlet (Evaporator Outlet)
        T1 = T_evap_sat + dT_sh
        p1 = p_evap
        h1 = CP.PropsSI('H', 'T', T1, 'P', p1, fluid)
        s1 = CP.PropsSI('S', 'T', T1, 'P', p1, fluid)
        d1 = CP.PropsSI('D', 'T', T1, 'P', p1, fluid)
        
        # State 2: Compressor Outlet
        p2 = p_cond
        # Isentropic state 2s
        h2s = CP.PropsSI('H', 'P', p2, 'S', s1, fluid)
        # Actual state 2 using isentropic efficiency
        h2 = h1 + (h2s - h1) / eta_is
        T2 = CP.PropsSI('T', 'P', p2, 'H', h2, fluid)
        s2 = CP.PropsSI('S', 'P', p2, 'H', h2, fluid)
        d2 = CP.PropsSI('D', 'P', p2, 'H', h2, fluid)
        
        # State 3: Condenser Outlet (Expansion Valve Inlet)
        T3 = T_cond_sat - dT_sc
        p3 = p_cond
        h3 = CP.PropsSI('H', 'T', T3, 'P', p3, fluid)
        s3 = CP.PropsSI('S', 'T', T3, 'P', p3, fluid)
        d3 = CP.PropsSI('D', 'T', T3, 'P', p3, fluid)
        
        # State 4: Expansion Valve Outlet (Evaporator Inlet)
        p4 = p_evap
        h4 = h3 # Isenthalpic expansion
        T4 = CP.PropsSI('T', 'P', p4, 'H', h4, fluid)
        s4 = CP.PropsSI('S', 'P', p4, 'H', h4, fluid)
        d4 = CP.PropsSI('D', 'P', p4, 'H', h4, fluid)

        # --- Cycle Info ---
        dh_evap = (h1 - h4) # J/kg
        dh_cond = (h2 - h3) # J/kg
        dw_comp = (h2 - h1) # J/kg
        
        COP = dh_evap / dw_comp if dw_comp > 0 else 0
        EER = COP * 3.412 # Approximate conversion if needed, but usually just reported as COP
        
        state_points = [
            {"id": 1, "name": "Evaporator Inlet", "x": h4/1000.0, "y": p4/1e5, "T": T4-273.15, "d": d4, "s": s4},
            {"id": 2, "name": "Compressor Inlet", "x": h1/1000.0, "y": p1/1e5, "T": T1-273.15, "d": d1, "s": s1},
            {"id": 3, "name": "Compressor Outlet", "x": h2/1000.0, "y": p2/1e5, "T": T2-273.15, "d": d2, "s": s2},
            {"id": 4, "name": "Condenser Outlet", "x": h3/1000.0, "y": p3/1e5, "T": T3-273.15, "d": d3, "s": s3},
            # Add a point to close the loop on the chart? 
            # Usually the frontend connects them 1-2-3-4-1
        ]
        
        result = {
            "cycle_info": {
                "dh_evap": dh_evap,   # J/kg — divide by 1000 on frontend for kJ/kg
                "dh_cond": dh_cond,   # J/kg — divide by 1000 on frontend for kJ/kg
                "COP": round(COP, 3),
                "EER": round(EER, 3),
                "dw_comp": dw_comp    # J/kg
            },
            "state_points": state_points
        }
        
        return result

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            params = {}
        else:
            params = json.loads(input_data)
        
        res = calculate_cycle(params)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
