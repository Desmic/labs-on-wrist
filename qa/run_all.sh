#!/bin/sh
# One command for every check. Needs a running preview: npx vite preview --port 4173
#   sh qa/run_all.sh [outdir]          (takes about an hour on a CPU-only machine)
# Exits non-zero if anything fails.
set -u
OUT=${1:-qa-out}; mkdir -p "$OUT"
QA=$(dirname "$0")
fail=0
python3 "$QA/verify2.py" "$OUT/desktop" 1280 800 > "$OUT/desktop.log" 2>&1 || fail=1
python3 "$QA/verify2.py" "$OUT/mobile" 390 844 > "$OUT/mobile.log" 2>&1 || fail=1
for v in desktop mobile; do
  n=$(python3 "$QA/flags.py" "$OUT/$v/report.json" | grep -v '^ERRORS: \[\]$' | wc -l)
  echo "$v layout/placement flags: $n"; [ "$n" -eq 0 ] || fail=1
done
python3 -u "$QA/motion.py" "$OUT/motion" 1280 800 > "$OUT/motion.log" 2>&1 || fail=1
python3 "$QA/motion_check.py" "$OUT/motion.log" || fail=1
POS="ch1:0.35,ch2:0.50,ch3:0.30,ch12:0.30" NOSHIMMER=1 python3 -u "$QA/motion.py" "$OUT/motion-m" 390 844 > "$OUT/motion-m.log" 2>&1 || fail=1
python3 "$QA/motion_check.py" "$OUT/motion-m.log" || fail=1
[ $fail -eq 0 ] && echo "ALL CHECKS PASSED" || echo "CHECKS FAILED"
exit $fail
