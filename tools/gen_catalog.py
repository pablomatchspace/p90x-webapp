"""Generate the app's static program assets from the P90Xcel workbook.

Outputs (committed — they contain program structure, no personal data):
  src/data/catalog.json    workouts + exercises with entry kinds
  src/data/templates.json  classic + lean 90-day sequences

Usage: python tools/gen_catalog.py "<path to P90X .xlsm>"

The workbook itself is NOT part of the repo; this script is re-run manually
if the source ever changes. Self-verifies against known P90X facts and fails
on any unrecognized structure (PRD US-010).
"""

from __future__ import annotations

import json
import os
import sys

from xlsm_common import (
    ARX_SHEET,
    COMPLETION_SHEETS,
    STRENGTH_SHEETS,
    arx_exercises,
    extract_schedule,
    load_books,
    parse_exercises,
    slugify,
)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data")

WORKOUT_DISPLAY = {
    "chest-back": "Chest & Back",
    "plyometrics": "Plyometrics",
    "shoulders-arms": "Shoulders & Arms",
    "yoga-x": "Yoga X",
    "legs-back": "Legs & Back",
    "kenpo-x": "Kenpo X",
    "core-synergistics": "Core Synergistics",
    "chest-shoulders-triceps": "Chest, Shoulders & Triceps",
    "back-biceps": "Back & Biceps",
    "ab-ripper-x": "Ab Ripper X",
    "cardio-x": "Cardio X",
    "x-stretch": "X Stretch",
    "rest": "Rest or X Stretch",
}


def build_catalog(wb_v, wb_f) -> dict:
    workouts: dict[str, dict] = {}

    strength_defs: dict[str, list] = {}
    for sheet_name, key in STRENGTH_SHEETS.items():
        defs = parse_exercises(wb_v[sheet_name], wb_f[sheet_name])
        if key in strength_defs:
            # CORE SYNERGISTICS vs (LEAN): must be the same workout definition
            existing = [(d.id, d.rounds, d.secondary, d.agg) for d in strength_defs[key]]
            incoming = [(d.id, d.rounds, d.secondary, d.agg) for d in defs]
            if existing != incoming:
                raise ValueError(f"{sheet_name}: exercise list differs from primary {key} sheet")
            continue
        strength_defs[key] = defs

    for key, defs in strength_defs.items():
        workouts[key] = {
            "key": key,
            "name": WORKOUT_DISPLAY[key],
            "style": "strength",
            "exercises": [
                {
                    "id": d.id,
                    "name": d.name,
                    "rounds": d.rounds,
                    **({"secondary": d.secondary} if d.secondary else {}),
                    "agg": d.agg,
                    "labels": d.labels,
                }
                for d in defs
            ],
        }

    for _sheet, key in COMPLETION_SHEETS.items():
        workouts[key] = {"key": key, "name": WORKOUT_DISPLAY[key], "style": "completion"}
    workouts["x-stretch"] = {"key": "x-stretch", "name": WORKOUT_DISPLAY["x-stretch"], "style": "completion"}
    workouts["rest"] = {"key": "rest", "name": WORKOUT_DISPLAY["rest"], "style": "rest"}

    arx = [
        {"id": slugify(name), "name": name, "rounds": 1, "agg": "sum", "labels": [{"main": "Reps"}]}
        for _row, name in arx_exercises(wb_v[ARX_SHEET])
    ]
    workouts["ab-ripper-x"] = {
        "key": "ab-ripper-x",
        "name": WORKOUT_DISPLAY["ab-ripper-x"],
        "style": "arx",
        "exercises": arx,
    }

    ordered = [workouts[k] for k in WORKOUT_DISPLAY if k in workouts]
    return {"workouts": ordered}


def build_templates(wb_v, wb_f) -> dict:
    schedule = extract_schedule(wb_v, wb_f)
    program_days = [d for d in schedule.days if d.classic is not None]

    def to_template(selector) -> list[dict]:
        days = []
        for i, day in enumerate(program_days):
            n = i + 1
            week = (n - 1) // 7 + 1
            phase = 1 if week <= 4 else 2 if week <= 8 else 3
            days.append(
                {
                    "day": n,
                    "week": week,
                    "phase": phase,
                    "recovery": week in (4, 8, 13),
                    "workouts": selector(day),
                }
            )
        return days

    return {
        "classic": to_template(lambda d: d.classic),
        "lean": to_template(lambda d: d.lean),
    }


def verify(catalog: dict, templates: dict) -> list[str]:
    """Known-P90X-facts assertions (PRD US-010 AC)."""
    notes = []
    keys = {w["key"] for w in catalog["workouts"]}
    for template_name in ("classic", "lean"):
        days = templates[template_name]
        assert len(days) == 90, f"{template_name}: {len(days)} days"
        for d in days:
            for k in d["workouts"]:
                assert k in keys, f"{template_name} day {d['day']}: unknown workout {k}"
    classic = templates["classic"]
    assert classic[0]["workouts"] == ["chest-back", "ab-ripper-x"], classic[0]
    assert classic[1]["workouts"] == ["plyometrics"], classic[1]
    assert classic[6]["workouts"] == ["rest"], classic[6]
    lean = templates["lean"]
    assert lean[0]["workouts"] == ["core-synergistics"], lean[0]
    assert lean[1]["workouts"] == ["cardio-x"], lean[1]

    rest_days = sum(1 for d in classic if d["workouts"] == ["rest"])
    notes.append(f"classic rest days: {rest_days}")
    arx_days = sum(1 for d in classic if "ab-ripper-x" in d["workouts"])
    notes.append(f"classic ARX-paired days: {arx_days}")
    cb = next(w for w in catalog["workouts"] if w["key"] == "chest-back")
    assert len(cb["exercises"]) == 12, f"chest-back exercises: {len(cb['exercises'])}"
    bb = next(w for w in catalog["workouts"] if w["key"] == "back-biceps")
    strip = next(e for e in bb["exercises"] if e["id"] == "strip-set-curls")
    assert strip["rounds"] == 4 and strip["agg"] == "avg", strip
    notes.append(f"workouts in catalog: {len(catalog['workouts'])}")
    for w in catalog["workouts"]:
        if "exercises" in w:
            notes.append(f"  {w['key']}: {len(w['exercises'])} exercises")
    return notes


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    wb_v, wb_f = load_books(sys.argv[1])
    catalog = build_catalog(wb_v, wb_f)
    templates = build_templates(wb_v, wb_f)
    for note in verify(catalog, templates):
        print(note)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, data in (("catalog.json", catalog), ("templates.json", templates)):
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print("wrote", path)


if __name__ == "__main__":
    main()
