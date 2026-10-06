import os

ML = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT = os.path.dirname(ML)
RAW = os.path.join(ML, "data", "raw")
DATA = os.path.join(ML, "data")
REPORTS = os.path.join(ML, "reports")
OUT = os.path.join(ML, "outputs")
APP_RISK = os.path.join(ROOT, "public", "data", "risk")

LAT, LON = 28.63, 77.22  # New Delhi (Connaught Place)
TZ = "Asia/Kolkata"
SEED = 26083

for d in (RAW, REPORTS, OUT):
    os.makedirs(d, exist_ok=True)
