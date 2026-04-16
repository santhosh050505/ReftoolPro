"""
coolprop_mixture_cycle.py
─────────────────────────
4-point refrigeration cycle calculator for pseudo-pure refrigerants that are
not natively in CoolProp.  Uses HEOS mixture strings so that all properties
are calculated from first-principles rather than look-up tables.

Supported refrigerants
──────────────────────
  R513A   →  HEOS::R134a[0.467]&R1234yf[0.533]
             (43.1 % R134a + 56.9 % R1234yf by mass;
              mole fractions: R134a 0.467, R1234yf 0.533)

  R454B   →  HEOS::R32[0.829]&R1234yf[0.171]
             (68.9 % R32 + 31.1 % R1234yf by mass;
              mole fractions: R32 0.829, R1234yf 0.171)

State-point convention (matches existing JS calculator)
────────────────────────────────────────────────────────
  Point 1  –  Condenser Inlet  (Discharge Gas)  : superheated @ P_cond, T_discharge
  Point 2  –  Condenser Outlet (Liquid)          : subcooled   @ P_cond, T_liquid
  Point 3  –  Evaporator Inlet (Flash Mix)       : two-phase   @ P_evap, h = h2
  Point 4  –  Evaporator Outlet (Suction Gas)    : superheated @ P_evap, T_suction

Note on HEOS two-phase calculations
────────────────────────────────────
CoolProp cannot back-calculate T from (P, H) for HEOS mixtures in the two-phase
region (it raises a phase-envelope error).  For Point 3 we therefore:
  1. Look up h_liq = H(P_evap, Q=0)  and  h_vap = H(P_evap, Q=1)
  2. Derive  quality q = (h3 − h_liq) / (h_vap − h_liq)   [clamped 0–1]
  3. Obtain T, S, D via (P_evap, Q=q)
"""

import sys
import json
import CoolProp.CoolProp as CP

# ── Mixture strings ───────────────────────────────────────────────────────────
MIXTURE_MAP = {
    "R513A": "HEOS::R134a[0.467]&R1234yf[0.533]",
    "R454B": "HEOS::R32[0.829]&R1234yf[0.171]",
}


def get_fluid_string(refrigerant: str) -> str:
    key = refrigerant.strip().upper()
    if key in MIXTURE_MAP:
        return MIXTURE_MAP[key]
    return f"HEOS::{refrigerant.strip()}"


def sp(prop, s1, v1, s2, v2, fluid):
    """Thin wrapper around PropsSI with a descriptive error message."""
    try:
        return CP.PropsSI(prop, s1, v1, s2, v2, fluid)
    except Exception as exc:
        raise RuntimeError(
            f"PropsSI('{prop}', '{s1}'={v1:.4g}, '{s2}'={v2:.4g}, "
            f"fluid='{fluid}') → {exc}"
        )


def calculate_mixture_cycle(params: dict) -> dict:
    try:
        refrigerant  = params.get("refrigerant", "R513A")
        fluid        = get_fluid_string(refrigerant)

        # ── temperatures  (°C → K) ───────────────────────────────────────────
        sct          = float(params.get("sct",              45))
        set_temp     = float(params.get("set",               7))
        discharge_t  = float(params.get("dischargeTempRef", sct      + 20))
        suction_t    = float(params.get("suctionTempRef",   set_temp +  5))
        liquid_t     = float(params.get("liquidTempRef",    sct))

        T_sct       = sct        + 273.15
        T_set       = set_temp   + 273.15
        T_discharge = discharge_t + 273.15
        T_suction   = suction_t  + 273.15
        T_liquid    = liquid_t   + 273.15

        # ── saturation pressures (Pa) ─────────────────────────────────────────
        # Bubble line (Q=0) for condensation side
        # Dew   line (Q=1) for evaporation side
        P_cond = sp("P", "T", T_sct, "Q", 0, fluid)
        P_evap = sp("P", "T", T_set, "Q", 1, fluid)

        if P_cond <= 0 or P_evap <= 0:
            return {"status": "error",
                    "message": "Non-positive saturation pressure — check SCT/SET inputs."}

        # ── Point 1: Condenser Inlet – superheated vapour @ P_cond, T_discharge ─
        h1 = sp("H", "P", P_cond, "T", T_discharge, fluid)   # J/kg
        s1 = sp("S", "P", P_cond, "T", T_discharge, fluid)   # J/(kg·K)
        d1 = sp("D", "P", P_cond, "T", T_discharge, fluid)   # kg/m³

        # ── Point 2: Condenser Outlet – subcooled liquid @ P_cond, T_liquid ──
        h2 = sp("H", "P", P_cond, "T", T_liquid, fluid)
        s2 = sp("S", "P", P_cond, "T", T_liquid, fluid)
        d2 = sp("D", "P", P_cond, "T", T_liquid, fluid)

        # ── Point 3: Evaporator Inlet – isenthalpic expansion (h3 = h2) ──────
        # CoolProp HEOS cannot invert T from (P, H) in two-phase for mixtures.
        # Solution: compute quality from saturation enthalpy boundaries, then
        # use (P, Q) to retrieve all other properties.
        h3      = h2
        h_liq_e = sp("H", "P", P_evap, "Q", 0, fluid)
        h_vap_e = sp("H", "P", P_evap, "Q", 1, fluid)
        q3      = max(0.0, min(1.0, (h3 - h_liq_e) / (h_vap_e - h_liq_e)))

        # Temperature at the flash point (bubble temperature = SET by definition)
        T3 = sp("T", "P", P_evap, "Q", 0, fluid)   # K — bubble temp ≈ SET
        s3 = sp("S", "P", P_evap, "Q", q3, fluid)
        d3 = sp("D", "P", P_evap, "Q", q3, fluid)

        # ── Point 4: Evaporator Outlet – superheated vapour @ P_evap, T_suction ─
        h4 = sp("H", "P", P_evap, "T", T_suction, fluid)
        s4 = sp("S", "P", P_evap, "T", T_suction, fluid)
        d4 = sp("D", "P", P_evap, "T", T_suction, fluid)

        # ── Performance ───────────────────────────────────────────────────────
        dh_evap = (h4 - h3) / 1000.0    # kJ/kg
        dh_cond = (h1 - h2) / 1000.0    # kJ/kg
        dw_comp = (h1 - h4) / 1000.0    # kJ/kg  (positive when h1 > h4)
        COP     = dh_evap / dw_comp if dw_comp > 0 else 0

        cycle_points = [
            {
                "name":            "Condenser Inlet (Discharge Gas)",
                "type":            "discharge",
                "temperature":     discharge_t,
                "pressure":        round(P_cond / 1e5, 4),
                "saturationTemp":  sct,
                "properties": {
                    "enthalpy_kj_per_kg": round(h1 / 1000.0, 4),
                    "entropy_J_per_kgK":  round(s1, 4),
                    "density_kg_per_m3":  round(d1, 4),
                    "status": "coolprop-mixture"
                }
            },
            {
                "name":            "Condenser Outlet (Liquid)",
                "type":            "liquid",
                "temperature":     liquid_t,
                "pressure":        round(P_cond / 1e5, 4),
                "saturationTemp":  sct,
                "properties": {
                    "enthalpy_kj_per_kg": round(h2 / 1000.0, 4),
                    "entropy_J_per_kgK":  round(s2, 4),
                    "density_kg_per_m3":  round(d2, 4),
                    "status": "coolprop-mixture"
                }
            },
            {
                "name":            "Evaporator Inlet (Flash Mix)",
                "type":            "average",
                "temperature":     round(T3 - 273.15, 4),
                "pressure":        round(P_evap / 1e5, 4),
                "saturationTemp":  set_temp,
                "quality":         round(q3, 4),
                "properties": {
                    "enthalpy_kj_per_kg": round(h3 / 1000.0, 4),
                    "entropy_J_per_kgK":  round(s3, 4),
                    "density_kg_per_m3":  round(d3, 4),
                    "status": "coolprop-mixture"
                }
            },
            {
                "name":            "Evaporator Outlet (Suction Gas)",
                "type":            "suction",
                "temperature":     suction_t,
                "pressure":        round(P_evap / 1e5, 4),
                "saturationTemp":  set_temp,
                "properties": {
                    "enthalpy_kj_per_kg": round(h4 / 1000.0, 4),
                    "entropy_J_per_kgK":  round(s4, 4),
                    "density_kg_per_m3":  round(d4, 4),
                    "status": "coolprop-mixture"
                }
            }
        ]

        return {
            "status":       "success",
            "refrigerant":  refrigerant,
            "fluid_string": fluid,
            "source":       "coolprop-mixture",
            "inputs": {
                "sct":             sct,
                "set":             set_temp,
                "dischargeTempRef": discharge_t,
                "suctionTempRef":  suction_t,
                "liquidTempRef":   liquid_t
            },
            "saturationPressures": {
                "psat_at_sct": round(P_cond / 1e5, 4),
                "psat_at_set": round(P_evap / 1e5, 4)
            },
            "cyclePoints":       cycle_points,
            "cycleProperties": {
                "condenseringCapacity": round(dh_cond, 4),
                "evaporatingCapacity":  round(dh_evap, 4),
                "compressorWork":       round(dw_comp, 4),
                "COP":                  round(COP,     4)
            }
        }

    except Exception as exc:
        return {"status": "error", "message": str(exc)}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        raw    = sys.stdin.read()
        params = json.loads(raw) if raw.strip() else {}
        result = calculate_mixture_cycle(params)
        print(json.dumps(result))
    except Exception as exc:
        print(json.dumps({"status": "error", "message": str(exc)}))
