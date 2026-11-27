"""Summarise verify.py report into problems."""
import sys, json
r = json.load(open(sys.argv[1]))
print("ERRORS:", r["errors"][:10])
SEAT_OK = 40  # vertices of cushion contact allowed
for f in r["frames"]:
    tag = f"{f['sec']}@{f['p']:.2f}"
    c = f["check"]
    for o in c["overlaps"]: print(tag, "LABEL OVER TEXT:", o)
    for o in c["offRight"]: print(tag, "TEXT OFF RIGHT EDGE:", o)
    for g in f["figs"]:
        pose = g["pose"]
        # floor contact
        if pose in ("stand", "cup", "sip", "check", "window") and (g["minY"] < 0.0 or g["minY"] > 0.06):
            print(tag, f"FIG{g['idx']} {pose}: feet not on floor (minY {g['minY']})")
        if pose == "sit" and g["minY"] < 0.0:
            print(tag, f"FIG{g['idx']} sit: feet below floor (minY {g['minY']})")
        for k, n in g["hits"].items():
            allowed = 0
            if pose == "lie" and k.startswith("RoundedBoxGeometry@-3.40,0.4"): allowed = 30  # mattress contact
            if pose in ("sit", "bedEdge") and "0.44" in k: allowed = SEAT_OK
            if pose == "bedEdge" and k.startswith("RoundedBoxGeometry@-3.40"): allowed = 120  # sitting on the bed
            if pose == "lie" and "-3.07" in k: allowed = 10  # pillow
            if n > allowed: print(tag, f"FIG{g['idx']} {pose}: {n} pts inside {k}")
