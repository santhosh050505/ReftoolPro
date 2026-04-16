import CoolProp.CoolProp as CP

REFRIGERANT_MAP = {
    "R12": "R12", "12": "R12",
    "R22": "R22", "22": "R22",
    "R23": "R23", "23": "R23",
    "R32": "R32", "32": "R32",
    "R125": "R125", "125": "R125",
    "R134a": "R134a", "134a": "R134a", "134": "R134a",
    "R141b": "R141b", "141b": "R141b",
    "R245fa": "R245fa", "245fa": "R245fa",
    "R290": "n-Propane", "290": "n-Propane",
    "R404A": "R404A", "404A": "R404A", "404": "R404A",
    "R407C": "R407C", "407C": "R407C",
    "R410A": "R410A", "410A": "R410A", "410": "R410A",
    "R454B": "HEOS::R32[0.829]&R1234yf[0.171]", "454B": "HEOS::R32[0.829]&R1234yf[0.171]",
    "R454C": "HEOS::R32[0.375]&R1234yf[0.625]", "454C": "HEOS::R32[0.375]&R1234yf[0.625]",
    "R513A": "HEOS::R134a[0.467]&R1234yf[0.533]", "513A": "HEOS::R134a[0.467]&R1234yf[0.533]",
    "R600a": "IsoButane", "600a": "IsoButane", "600": "IsoButane",
    "R601": "n-Pentane", "601": "n-Pentane",
    "R601a": "Isopentane", "601a": "Isopentane",
    "R717": "Ammonia", "717": "Ammonia",
    "R718": "Water", "718": "Water",
    "R744": "CarbonDioxide", "744": "CarbonDioxide",
    "R1233zd(E)": "R1233zd(E)", "1233zd": "R1233zd(E)",
    "R1234yf": "R1234yf", "1234yf": "R1234yf",
    "R1234ze(E)": "R1234ze(E)", "1234ze": "R1234ze(E)",
    "R1270": "Propylene", "1270": "Propylene",
    "R1336mzz(Z)": "R1336mzz(Z)", "1336mzz": "R1336mzz(Z)"
}

def get_fluid(name):
    """Returns the CoolProp fluid string for a common name."""
    if not name:
        return "HEOS::R134a"
    
    # Normalize case/format
    norm_name = name.strip()
    
    # Check map
    cp_name = REFRIGERANT_MAP.get(norm_name, norm_name)
    
    # Check case-insensitive map if first hit fails
    if cp_name == norm_name:
        for k, v in REFRIGERANT_MAP.items():
            if k.lower() == norm_name.lower():
                cp_name = v
                break

    if "::" in cp_name:
        return cp_name
    
    return f"HEOS::{cp_name}"
