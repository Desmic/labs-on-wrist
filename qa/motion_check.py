"""Pass/fail thresholds for motion.py output (one JSON line per test)."""
import sys, json
HOLD_MM = 1.0     # worst bone acceleration with the scroll still (vibration). Before the fix it was ~300.
SHIMMER_PCT = 0.05  # share of pixels flickering frame to frame
POP = 3.0         # a frame's step vs. the larger of its neighbours'
# Chapters made of streams of moving points (7: data rings, 9: lab streams): rows of dots travelling past pixels read
# as frame-to-frame change by design. Checked by eye on consecutive frames (qa/frames.py, 27 Nov 2026): steady, no twinkle.
SHIMMER_ALLOW = {"ch7": 4.0, "ch9": 4.0}
bad = 0
for line in open(sys.argv[1]):
    if not line.startswith("{"): continue
    r = json.loads(line)
    h = max([v["accRmsMm"] for v in r["hold"].values()] or [0])
    p = max([v["popRatio"] for v in r["scrub"].values()] or [0])
    s = r.get("shimmerPct", 0)
    ok = h <= HOLD_MM and p <= POP and s <= SHIMMER_ALLOW.get(r["name"].split("-")[0], SHIMMER_PCT)
    bad += not ok
    print(f"{'ok  ' if ok else 'FAIL'} {r['name']:9s} station {r['station']} vibration {h:.2f} mm  pop {p:.2f}  shimmer {s}%")
sys.exit(1 if bad else 0)
