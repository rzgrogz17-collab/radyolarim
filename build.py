import json, glob

all_stations = []
for f in sorted(glob.glob("src/*.json")):
    with open(f, encoding="utf-8") as fh:
        all_stations += json.load(fh)

with open("stations.json", "w", encoding="utf-8") as out:
    json.dump(all_stations, out, ensure_ascii=False, separators=(",", ":"))

print(f"{len(all_stations)} radyo birlestirildi")
