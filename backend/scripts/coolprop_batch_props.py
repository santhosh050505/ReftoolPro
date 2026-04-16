"""
coolprop_batch_props.py
───────────────────────
Accepts a JSON payload:
  {
    "refrigerant": "R513A",          // or "R454B"
    "points": [
      {"p": 17.7, "t": 65.0},       // pressure in bar, temperature in °C
      {"p": 17.7, "t": 40.0},
      ...
    ]
  }

Returns:
  {
    "status": "success",
    "refrigerant": "R513A",
    "results": [
      {"h": 460.2, "s": 1823.4, "d": 28.58, "status": "ok"},
      ...
    ]
  }

Mixture strings (mole fractions derived from mass fractions):
  R513A  → HEOS::R134a[0.467]&R1234yf[0.533]
  R454B  → HEOS::R32[0.829]&R1234yf[0.171]
"""

import sys
import json
import CoolProp.CoolProp as CP

MIXTURE_MAP = {
    "R513A": "HEOS::R134a[0.467]&R1234yf[0.533]",
    "R454B": "HEOS::R32[0.829]&R1234yf[0.171]",
}


def get_fluid_string(refrigerant: str) -> str:
    key = refrigerant.strip().upper()
    return MIXTURE_MAP.get(key, f"HEOS::{refrigerant.strip()}")


def compute_point(fluid: str, p_bar: float, t_c: float, is_dew: bool = False, quality: float = None) -> dict:
    """
    Compute H, S, D at a given (pressure, temperature) state.
    """
    p_pa = p_bar * 1e5
    t_k  = t_c + 273.15
    try:
        # If quality is explicitly provided, use (P, Q)
        if quality is not None:
            h = CP.PropsSI("H", "P", p_pa, "Q", quality, fluid)
            s = CP.PropsSI("S", "P", p_pa, "Q", quality, fluid)
            d = CP.PropsSI("D", "P", p_pa, "Q", quality, fluid)
            return {
                "h": round(h / 1000.0, 4),
                "s": round(s, 4),
                "d": round(d, 4),
                "status": "ok"
            }

        # Otherwise use (P, T). 
        # For mixtures, (P, T) fails inside the dome and can be ambiguous at saturation.
        try:
            # Check saturation temperature
            # Bubble temperature (Q=0)
            t_bubble = CP.PropsSI("T", "P", p_pa, "Q", 0, fluid)
            # Dew temperature (Q=1)
            t_dew = CP.PropsSI("T", "P", p_pa, "Q", 1, fluid)

            # If T is between bubble and dew (with a small margin), it's two-phase.
            # CoolProp HEOS fails (P, T) in two-phase.
            if t_bubble - 0.01 <= t_k <= t_dew + 0.01:
                # Use is_dew to decide quality if at saturation
                q = 1.0 if is_dew else 0.0
                h = CP.PropsSI("H", "P", p_pa, "Q", q, fluid)
                s = CP.PropsSI("S", "P", p_pa, "Q", q, fluid)
                d = CP.PropsSI("D", "P", p_pa, "Q", q, fluid)
            else:
                h = CP.PropsSI("H", "P", p_pa, "T", t_k, fluid)
                s = CP.PropsSI("S", "P", p_pa, "T", t_k, fluid)
                d = CP.PropsSI("D", "P", p_pa, "T", t_k, fluid)
        except:
            # Fallback to direct (P, T) if saturation check fails
            h = CP.PropsSI("H", "P", p_pa, "T", t_k, fluid)
            s = CP.PropsSI("S", "P", p_pa, "T", t_k, fluid)
            d = CP.PropsSI("D", "P", p_pa, "T", t_k, fluid)

        return {
            "h":      round(h / 1000.0, 4),   # kJ/kg
            "s":      round(s, 4),              # J/(kg·K)
            "d":      round(d, 4),              # kg/m³
            "status": "ok"
        }
    except Exception as exc:
        return {"h": 0, "s": 0, "d": 0, "status": "error", "message": str(exc)}


def calculate_batch_props(params: dict) -> dict:
    refrigerant = params.get("refrigerant", "R513A")
    fluid       = get_fluid_string(refrigerant)
    points      = params.get("points", [])

    results = []
    for pt in points:
        p_bar = float(pt.get("p", 0))
        t_c   = float(pt.get("t", 0))
        is_dew = bool(pt.get("is_dew", False))
        quality = pt.get("quality")
        if quality is not None: quality = float(quality)
        results.append(compute_point(fluid, p_bar, t_c, is_dew, quality))

    return {
        "status":       "success",
        "refrigerant":  refrigerant,
        "fluid_string": fluid,
        "source":       "coolprop-mixture",
        "results":      results
    }


if __name__ == "__main__":
    try:
        raw    = sys.stdin.read()
        params = json.loads(raw) if raw.strip() else {}
        result = calculate_batch_props(params)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}))
