import sys
import json
import CoolProp.CoolProp as CP
from coolprop_utils import get_fluid

def get_properties(params):
    try:
        refrigerant = params.get('refrigerant', 'R134a')
        fluid = get_fluid(refrigerant)
        
        print(f"DEBUG Props: Using fluid {fluid}", file=sys.stderr)
        
        # We need two independent properties. 
        # Usually we have P and T.
        p = float(params.get('p')) * 1e5 if params.get('p') else None # bar to Pa
        t = float(params.get('t')) + 273.15 if params.get('t') else None # C to K
        q = float(params.get('q')) if params.get('q') is not None else None
        
        if p and t:
            # Check if it's subcooled, superheated or saturation
            tsat = CP.PropsSI('T', 'P', p, 'Q', 0, fluid)
            if abs(t - tsat) < 0.05:
                # Close to saturation. Use quality if provided, else assume liquid for small negative diff
                quality = q if q is not None else (1.0 if t >= tsat else 0.0)
                h = CP.PropsSI('H', 'P', p, 'Q', quality, fluid)
                s = CP.PropsSI('S', 'P', p, 'Q', quality, fluid)
                d = CP.PropsSI('D', 'P', p, 'Q', quality, fluid)
            else:
                h = CP.PropsSI('H', 'P', p, 'T', t, fluid)
                s = CP.PropsSI('S', 'P', p, 'T', t, fluid)
                d = CP.PropsSI('D', 'P', p, 'T', t, fluid)
        elif p and q is not None:
            h = CP.PropsSI('H', 'P', p, 'Q', q, fluid)
            t = CP.PropsSI('T', 'P', p, 'Q', q, fluid)
            s = CP.PropsSI('S', 'P', p, 'Q', q, fluid)
            d = CP.PropsSI('D', 'P', p, 'Q', q, fluid)
        else:
            return {"error": "Need at least P and T or P and Q"}

        return {
            "h": h / 1000.0, # J/kg to kJ/kg
            "s": s,
            "d": d,
            "t": t - 273.15,
            "p": p / 1e5
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        params = json.loads(input_data) if input_data else {}
        res = get_properties(params)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
