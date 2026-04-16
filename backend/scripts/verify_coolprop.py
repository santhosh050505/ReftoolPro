import sys
import json
sys.path.insert(0, '.')
from coolprop_utils import get_fluid
import CoolProp.CoolProp as CP

tests = [
    ('R134a',   5e5),
    ('R407C',   5e5),
    ('R410A',  10e5),
    ('R404A',   5e5),
    ('R290',    3e5),
    ('R1234yf', 5e5),
    ('R1234ze(E)', 5e5),
    ('R717',    5e5),
    ('R744',   30e5),
    ('R32',    10e5),
    ('R22',     5e5),
    ('R600a',   2e5),
]

for ref, p in tests:
    fluid = get_fluid(ref)
    try:
        Tsat = CP.PropsSI('T', 'P', p, 'Q', 1, fluid) - 273.15
        print(f"OK   {ref:<20} fluid={fluid:<40} Tsat={Tsat:.1f}C")
    except Exception as e:
        print(f"FAIL {ref:<20} fluid={fluid:<40} -> {e}")

# Now run a full cycle for R134a to verify coolprop_cycle.py
print("\n--- Full cycle test (R134a, T_levels, SCT=40C, SET=5C) ---")
import subprocess, os

script = os.path.join(os.path.dirname(__file__), 'coolprop_cycle.py')
payload = json.dumps({
    "refrigerant": "R134a",
    "calc_type": "T_levels",
    "T_cond": 40,
    "T_evap": 5,
    "dT_sh": 5,
    "dT_sc": 3,
    "eta_is": 0.75
})
proc = subprocess.run(['python', script], input=payload, capture_output=True, text=True)
if proc.returncode == 0:
    result = json.loads(proc.stdout)
    if 'error' in result:
        print(f"CYCLE FAIL: {result['error']}")
    else:
        pts = result['state_points']
        print(f"CYCLE OK: {len(pts)} state points, COP={result['cycle_info']['COP']}")
        for pt in pts:
            print(f"  {pt['name']:<25} h={pt['x']:.2f} kJ/kg  p={pt['y']:.3f} bar  T={pt['T']:.1f}C")
else:
    print(f"CYCLE PROCESS ERROR: {proc.stderr}")
