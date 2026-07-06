"""Convert a P90Xcel workbook into the app's import file.

Usage:
    python tools/convert_xlsm.py "<path to .xlsm>" [-o p90x-data.json]

The output contains PERSONAL DATA (weights, body fat, workout history).
It is written next to the repo root by default and is gitignored — never
commit it (PRD decision D3). Prints a verification report; exits non-zero
on unrecognized workbook structure instead of guessing.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys

from xlsm_common import (
    ARX_SHEET,
    COMPLETION_SHEETS,
    STRENGTH_SHEETS,
    arx_columns,
    arx_exercises,
    as_date,
    cell,
    detect_blocks,
    detect_completion_blocks,
    extract_schedule,
    load_books,
    parse_exercises,
    slugify,
)

SCHEMA_VERSION = 1
IN_TO_M = 0.0254
LB_TO_KG = 0.45359237


def num(value) -> float | None:
    return float(value) if isinstance(value, (int, float)) else None


def read_settings(wb_v) -> dict:
    ws = wb_v["SETUP"]
    program_raw = cell(ws, 7, 3)
    units_raw = cell(ws, 15, 3)
    imperial = isinstance(units_raw, str) and "inch" in units_raw.lower()

    def length(v):
        n = num(v)
        return None if n is None else round(n * IN_TO_M, 4) if imperial else n

    def mass(v):
        n = num(v)
        return None if n is None else round(n * LB_TO_KG, 3) if imperial else n

    gender_raw = cell(ws, 17, 3)
    start = as_date(cell(ws, 9, 3))
    if start is None:
        raise ValueError("SETUP!C9: no start date found")

    return {
        "program": "lean" if str(program_raw).strip().lower() == "lean" else "classic",
        "startDate": start,
        "units": "imperial" if imperial else "metric",
        "gender": "female" if str(gender_raw).strip().lower() == "female" else "male",
        "age": num(cell(ws, 22, 3)),
        "height": length(cell(ws, 23, 3)),
        "startWeight": mass(cell(ws, 24, 3)),
        "startBodyFat": num(cell(ws, 25, 3)),
        "limits": {
            "weight": mass(cell(ws, 32, 3)),
            "bodyFat": num(cell(ws, 33, 3)),
            "bmi": num(cell(ws, 34, 3)),
        },
        "targets": {
            "leanMassIncrease": mass(cell(ws, 37, 3)),
            "bodyFat": num(cell(ws, 38, 3)),
        },
        "scoring": {
            "penaltyDivisor": num(cell(ws, 44, 3)) or 2,
            "penaltyOn": bool(num(cell(ws, 45, 3))),
            "chairFactor": num(cell(ws, 47, 3)) or 2,
            "rwDivisor": num(cell(ws, 49, 3)) or 10,
        },
    }


def convert(path: str) -> tuple[dict, list[str]]:
    report: list[str] = []
    wb_v, wb_f = load_books(path)
    settings = read_settings(wb_v)
    program = settings["program"]
    report.append(f"program: {program}, start {settings['startDate']}, units {settings['units']}")

    schedule = extract_schedule(wb_v, wb_f)
    program_days = [d for d in schedule.days if d.classic is not None]
    date_to_day: dict[str, tuple[str, list[str]]] = {}
    for i, day in enumerate(program_days):
        day_id = f"d{i + 1:03d}"
        keys = day.classic if program == "classic" else day.lean
        date_to_day[day.date] = (day_id, keys or [])
    report.append(
        f"schedule: {len(program_days)} program days "
        f"({program_days[0].date} .. {program_days[-1].date}), "
        f"{len(schedule.skip_dates)} skipped: {', '.join(schedule.skip_dates) or 'none'}"
    )

    now = dt.datetime.now().isoformat(timespec="seconds")
    ops = [
        {"id": f"import-skip-{i + 1}", "kind": "skip", "date": date, "createdAt": now}
        for i, date in enumerate(schedule.skip_dates)
    ]

    workout_logs: dict[str, dict] = {}
    warnings: list[str] = []

    def add_session(key: str, session: dict) -> None:
        workout_logs.setdefault(key, {"sessions": []})["sessions"].append(session)

    def day_for(date: str, key: str, context: str) -> str | None:
        hit = date_to_day.get(date)
        if hit is None:
            warnings.append(f"{context}: date {date} not on the schedule — skipped")
            return None
        day_id, keys = hit
        if key not in keys:
            warnings.append(f"{context}: {key} not scheduled on {date} — attached anyway")
        return day_id

    # ---- strength sheets -------------------------------------------------
    seen_keys: set[str] = set()
    for sheet_name, key in STRENGTH_SHEETS.items():
        ws_v, ws_f = wb_v[sheet_name], wb_f[sheet_name]
        defs = parse_exercises(ws_v, ws_f)
        n_sessions = n_values = 0
        for start_col in detect_blocks(ws_v):
            date = as_date(cell(ws_v, 5, start_col))
            if date is None:
                continue  # block belongs to the other program variant / unused
            label_raw = cell(ws_v, 4, start_col)
            annotation = None
            if isinstance(label_raw, str) and not label_raw.strip().isdigit():
                annotation = label_raw.strip()
            entries: dict[str, dict] = {}
            for d in defs:
                rounds = []
                any_value = False
                for r in d.rows:
                    main = num(cell(ws_v, r, start_col + 1))
                    secondary = num(cell(ws_v, r, start_col + 3))
                    if main is not None or secondary is not None:
                        any_value = True
                    rounds.append({"main": main, "secondary": secondary})
                if any_value:
                    entries[d.id] = {"rounds": rounds}
                    n_values += 1
            if not entries and annotation is None:
                continue
            day_id = day_for(date, key, f"{sheet_name} block {date}")
            if day_id is None:
                continue
            session: dict = {"programDayId": day_id}
            if annotation:
                session["annotation"] = annotation
            if entries:
                session["entries"] = entries
            add_session(key, session)
            n_sessions += 1
        if key not in seen_keys:
            seen_keys.add(key)
        report.append(f"{sheet_name}: {n_sessions} sessions, {n_values} exercise entries")

    # ---- cardio-style sheets --------------------------------------------
    status_map = {"YES": "yes", "NO": "no", "NOT YET": "not-yet"}
    for sheet_name, key in COMPLETION_SHEETS.items():
        ws_v = wb_v[sheet_name]
        n_sessions = 0
        for block in detect_completion_blocks(ws_v):
            for col in block["cols"]:
                date = as_date(cell(ws_v, block["date_row"], col))
                if date is None:
                    continue
                status_raw = cell(ws_v, block["status_row"], col)
                status = status_map.get(str(status_raw).strip().upper()) if status_raw else None
                notes_raw = cell(ws_v, block["notes_row"], col)
                notes = str(notes_raw).strip() if isinstance(notes_raw, str) and notes_raw.strip() else None
                if (status is None or status == "not-yet") and notes is None:
                    continue  # untouched prefill
                day_id = day_for(date, key, f"{sheet_name} {date}")
                if day_id is None:
                    continue
                session = {"programDayId": day_id, "status": status or "not-yet"}
                if notes:
                    session["notes"] = notes
                add_session(key, session)
                n_sessions += 1
        report.append(f"{sheet_name}: {n_sessions} sessions")

    # ---- Ab Ripper X ------------------------------------------------------
    ws_arx = wb_v[ARX_SHEET]
    arx_defs = [(row, slugify(name)) for row, name in arx_exercises(ws_arx)]
    n_sessions = 0
    for col in arx_columns(ws_arx):
        date = as_date(cell(ws_arx, 6, col))
        if date is None:
            continue
        entries = {}
        for row, ex_id in arx_defs:
            reps = num(cell(ws_arx, row, col))
            if reps is not None:
                entries[ex_id] = {"rounds": [{"main": reps, "secondary": None}]}
        if not entries:
            continue
        day_id = day_for(date, "ab-ripper-x", f"AB RIPPER X {date}")
        if day_id is None:
            continue
        add_session("ab-ripper-x", {"programDayId": day_id, "entries": entries})
        n_sessions += 1
    report.append(f"AB RIPPER X: {n_sessions} sessions")

    # ---- body log ----------------------------------------------------------
    body_log = [
        {k: v for k, v in row.items()}
        for row in schedule.body_rows
    ]
    report.append(f"body log: {len(body_log)} entries")

    # ---- notes -------------------------------------------------------------
    notes_parts: list[str] = []
    if "YOUR NOTES" in wb_v.sheetnames:
        ws_notes = wb_v["YOUR NOTES"]
        for row in range(1, ws_notes.max_row + 1):
            v = cell(ws_notes, row, 1)
            if isinstance(v, str) and v.strip():
                notes_parts.append(v.strip())

    state = {
        "schemaVersion": SCHEMA_VERSION,
        "settings": settings,
        "scheduleOps": ops,
        "workoutLogs": workout_logs,
        "bodyLog": body_log,
        "quotes": {"disabledIds": [], "custom": []},
        "notes": "\n".join(notes_parts),
    }

    if warnings:
        report.append(f"WARNINGS ({len(warnings)}):")
        report.extend(f"  ! {w}" for w in warnings)
    return state, report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsm", help="path to the P90Xcel workbook")
    parser.add_argument("-o", "--out", default="p90x-data.json")
    args = parser.parse_args()

    state, report = convert(args.xlsm)
    print("\n".join(report))
    out = os.path.abspath(args.out)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nwrote {out}")
    print("REMINDER: this file contains personal data - do not commit it.")
    if any(line.startswith("WARNINGS") for line in report):
        sys.exit(2)


if __name__ == "__main__":
    main()
