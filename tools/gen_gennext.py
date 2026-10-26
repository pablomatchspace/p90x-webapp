"""Generate the P90X Generation Next program asset (E33 U161).

Output (committed — program structure only, no personal data):
  src/data/gennext.json   { "workouts": [...], "template": [...] }

Usage: python tools/gen_gennext.py

The source below is transcribed from docs/requirements/gennext-workouts.md,
which records the BODi Workout Calendar PDF (90 cells), the Dumbbell Tracker
PDF (7 workouts) and the video audit (pillars, styles). Neither PDF nor any
video is part of the repo. Self-verifies known facts before writing; fix the
source here, never the JSON.
"""

from __future__ import annotations

import json
import os

from xlsm_common import slugify

OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "gennext.json"
)

# name → (key, style, pillar). Pillars per the Get Started guide's three
# definitions (MOT strength / NPT athleticism / ART recovery) and the videos.
WORKOUTS: dict[str, tuple[str, str, str | None]] = {
    "Push Strength": ("gn-push-strength", "strength", "MOT"),
    "Pull Strength": ("gn-pull-strength", "strength", "MOT"),
    "Upper Body": ("gn-upper-body", "strength", "MOT"),
    "Lower Body": ("gn-lower-body", "strength", "MOT"),
    "Full Body Strength": ("gn-full-body-strength", "strength", "MOT"),
    "Full Body Power": ("gn-full-body-power", "strength", "MOT"),
    "Core Circuit": ("gn-core-circuit", "strength", "MOT"),
    "Plyometrix": ("gn-plyometrix", "completion", "NPT"),
    "Speed and Agility": ("gn-speed-and-agility", "completion", "NPT"),
    "Accel/Decel": ("gn-accel-decel", "completion", "NPT"),
    "Cardio Boxing": ("gn-cardio-boxing", "completion", "NPT"),
    "Active Mobility": ("gn-active-mobility", "completion", "ART"),
    "Active Flexibility": ("gn-active-flexibility", "completion", "ART"),
    "Myofascial Release": ("gn-myofascial-release", "completion", "ART"),
    "Bonus: 5-Min Abs": ("gn-bonus-abs", "bonus", None),
    "Bonus: 5-Min Arms": ("gn-bonus-arms", "bonus", None),
    "Bonus: 5-Min Classic Push-Pull": ("gn-bonus-classic-push-pull", "bonus", None),
    "Bonus: 5-Min Glutes": ("gn-bonus-glutes", "bonus", None),
    "Bonus: 5-Min Shoulders": ("gn-bonus-shoulders", "bonus", None),
}

# Dumbbell Tracker PDF: block → exercises (tracker wording; only "Incline Bench
# press" is re-cased). Blocks 1/2 always have 3 rounds; the finisher's round
# count is the tracker's column count.
TRACKER: dict[str, dict] = {
    "Upper Body": {
        "Block 1": ["Tempo Bench Press", "Strict Arnie Press", "Chest Fly", "Skull Crusher"],
        "Block 2": ["Narrow Supported Row", "Prone Fly", "Supinated Biceps Curl"],
        "Finisher": ["Hammer Curls", "Lateral Raises"],
        "finisher_rounds": 3,
    },
    "Lower Body": {
        "Block 1": [
            "Dual Front Squat",
            "Bulgarian Split Squat (Right Side)",
            "Bulgarian Split Squat (Left Side)",
        ],
        "Block 2": [
            "Romanian Deadlift (RDL)",
            "Lateral Bench Step Downs (Right)",
            "Lateral Bench Step Downs (Left)",
        ],
        "Finisher": ["Alt Lateral Lunges", "Suitcase Deadlift"],
        "finisher_rounds": 3,
    },
    "Push Strength": {
        "Block 1": ["Goblet Squat", "Alternating Step Ups", "Wide Stance Rotational Push"],
        "Block 2": ["Sumo Squats", "Incline Bench Press", "Curtsey Lunges", "Push Press"],
        "Finisher": ["Squat Thruster"],
        "finisher_rounds": 5,
    },
    "Pull Strength": {
        "Block 1": ["Dumbbell Clean", "Hip Thrust on Bench", "Upright Row"],
        "Block 2": ["RDL", "SA Row Right", "SA Row Left", "Pull Over"],
        "Finisher": ["Skier Swing", "Bent Over Reverse Flys"],
        "finisher_rounds": 5,
    },
    "Core Circuit": {
        "Block 1": ["Russian Twist", "Tall Kneeling Alt Halo", "Plank Pull Through"],
        "Block 2": ["Half Kneeling Woodchop R/L", "Butterfly Sit Up"],
        "Finisher": [],
        "finisher_rounds": 0,
    },
    "Full Body Strength": {
        "Block 1": [
            "Squat Thruster",
            "Chest Press to Leg Raise",
            "2 RDL to 2 Bent Over Row",
            "Devil's Press",
        ],
        "Block 2": ["Heel Elevated Squat", "Frontal to Lateral Raise"],
        "Finisher": ["Renegade Row", "Ground to Overhead"],
        "finisher_rounds": 5,
    },
    "Full Body Power": {
        "Block 1": [
            "Glute Swings R",
            "Glute Swings L",
            "Clean to Press R",
            "Clean to Press L",
            "SA Devil's Press R",
            "SA Devil's Press L",
        ],
        "Block 2": ["Single Leg Squat to Bench"],
        "Finisher": ["Heromaker"],
        "finisher_rounds": 5,
    },
}

# E36: what the app logs and the order focus mode plays it — the videos
# (docs/requirements/gennext-workouts.md §1–§6). Per workout: blocks of
# (block, rounds, circuits[, bookend]). A circuit plays round by round (every
# move once, then again); Full Body Power's Block 1 is three clusters played
# one after another. A bookend row logs its round 1 before the block and its
# round 2 after it (Full Body Strength's buy-in / cash-out AMRAP). Tracker
# moves keep their tracker names (= exercise ids already in logged data).
W, BW, SEC = "weight", "mod", None  # R×W · reps + modified reps · seconds held
VIDEO: dict[str, list[tuple]] = {
    "Push Strength": [
        ("Block 1", 3, [[("Goblet Squat", W), ("Narrow to Wide Push-Up", BW),
                         ("Alternating Step Ups", W), ("Wide Stance Rotational Push", W)]]),
        ("Block 2", 3, [[("Sumo Squats", W), ("Incline Bench Press", W),
                         ("Curtsey Lunges", W), ("Push Press", W)]]),
        # "multiples of two" ladder: rung N = round N, 5 rungs (tracker)
        ("Finisher", 5, [[("Squat Thruster", W), ("Diamond Push-Up", BW), ("Bench Dip", BW)]]),
    ],
    "Pull Strength": [
        ("Block 1", 3, [[("Pull-Up", BW), ("Dumbbell Clean", W),
                         ("Hip Thrust on Bench", W), ("Upright Row", W)]]),
        ("Block 2", 3, [[("RDL", W), ("SA Row Right", W), ("SA Row Left", W), ("Pull Over", W)]]),
        ("Finisher", 5, [[("Chin-Up", BW), ("Skier Swing", W), ("Bent Over Reverse Flys", W)]]),
    ],
    "Upper Body": [
        ("Block 1", 3, [[("Tempo Bench Press", W), ("Strict Arnie Press", W),
                         ("Chest Fly", W), ("Skull Crusher", W)]]),
        ("Block 2", 3, [[("Wide Grip Pull-Up", BW), ("Narrow Supported Row", W),
                         ("Prone Fly", W), ("Supinated Biceps Curl", W)]]),
        # EMOM: A push-ups + hammer curls, B bench dips + lateral raises, C burpee pull-ups
        ("Finisher", 3, [[("Push-Ups", BW), ("Hammer Curls", W), ("Bench Dips", BW),
                          ("Lateral Raises", W), ("Burpee Pull-Ups", BW)]]),
    ],
    "Lower Body": [
        ("Block 1", 3, [[("Dual Front Squat", W), ("Bulgarian Split Squat (Right Side)", W),
                         ("Bulgarian Split Squat (Left Side)", W), ("Jump Squat", BW)]]),
        ("Block 2", 3, [[("Romanian Deadlift (RDL)", W), ("Lateral Bench Step Downs (Right)", W),
                         ("Lateral Bench Step Downs (Left)", W), ("Skater to Broad Jump", BW)]]),
        ("Finisher", 3, [[("Alt Lateral Lunges", W), ("Suitcase Deadlift", W), ("Gorilla Burpees", BW)]]),
    ],
    "Full Body Strength": [
        ("Block 1", 3, [[("Squat Thruster", W), ("Chest Press to Leg Raise", W),
                         ("2 RDL to 2 Bent Over Row", W), ("Devil's Press", W)]]),
        ("Block 2", 3, [[("Negative Pull-Up", BW), ("Tempo Push-Up", BW),
                         ("Heel Elevated Squat", W), ("Frontal to Lateral Raise", W)]]),
        # video runs 3 rounds (tracker printed 5)
        ("Finisher", 3, [[("Renegade Row", W), ("Ground to Overhead", W), ("X Sit-Up", BW)]],
         "Buy-In / Cash-Out AMRAP (rounds)"),
    ],
    "Full Body Power": [
        ("Block 1", 3, [
            [("Glute Swings R", W), ("Glute Swings L", W), ("Hollow Hold (sec)", SEC)],
            [("Clean to Press R", W), ("Clean to Press L", W), ("Low Plank Reach", BW)],
            [("SA Devil's Press R", W), ("SA Devil's Press L", W), ("Unilateral V-Sit", BW)],
        ]),
        # 10-min accumulator: one lap = one round, capped at the schema's 5
        ("Block 2", 5, [[("Chin-Up", BW), ("Decline Push-Up", BW), ("Single Leg Squat to Bench", W)]]),
        # EMOM: video runs 3 rounds (tracker printed 5)
        ("Finisher", 3, [[("Heromaker", W), ("Box Jumps", BW)]]),
    ],
    # No video in the folder yet — tracker only (E33)
    "Core Circuit": [
        ("Block 1", 3, [[("Russian Twist", W), ("Tall Kneeling Alt Halo", W), ("Plank Pull Through", W)]]),
        ("Block 2", 3, [[("Half Kneeling Woodchop R/L", W), ("Butterfly Sit Up", W)]]),
    ],
}

# Workout Calendar PDF, Monday → Sunday. Week 13 has no Sunday (90 days).
CALENDAR: list[list[str]] = [
    ["Push Strength", "Plyometrix", "Upper Body", "Active Mobility", "Lower Body", "Cardio Boxing", "Myofascial Release"],
    ["Pull Strength", "Cardio Boxing", "Lower Body", "Active Mobility", "Upper Body", "Plyometrix", "Myofascial Release"],
    ["Push Strength", "Plyometrix", "Upper Body", "Active Mobility", "Lower Body", "Cardio Boxing", "Myofascial Release"],
    ["Speed and Agility", "Active Mobility", "Core Circuit", "Active Flexibility", "Cardio Boxing", "Core Circuit", "Myofascial Release"],
    ["Full Body Strength", "Accel/Decel", "Pull Strength", "Active Flexibility", "Full Body Power", "Speed and Agility", "Myofascial Release"],
    ["Full Body Power", "Speed and Agility", "Push Strength", "Active Flexibility", "Full Body Strength", "Accel/Decel", "Myofascial Release"],
    ["Full Body Strength", "Accel/Decel", "Pull Strength", "Active Flexibility", "Full Body Power", "Speed and Agility", "Myofascial Release"],
    ["Active Flexibility", "Core Circuit", "Cardio Boxing", "Active Mobility", "Core Circuit", "Speed and Agility", "Myofascial Release"],
    ["Upper Body", "Plyometrix", "Push Strength", "Active Flexibility", "Lower Body", "Cardio Boxing", "Myofascial Release"],
    ["Full Body Strength", "Accel/Decel", "Pull Strength", "Active Mobility", "Full Body Power", "Speed and Agility", "Myofascial Release"],
    ["Lower Body", "Cardio Boxing", "Pull Strength", "Active Flexibility", "Upper Body", "Plyometrix", "Myofascial Release"],
    ["Full Body Power", "Speed and Agility", "Push Strength", "Active Mobility", "Full Body Strength", "Accel/Decel", "Myofascial Release"],
    ["Active Flexibility", "Core Circuit", "Cardio Boxing", "Active Mobility", "Core Circuit", "Speed and Agility"],
]
RECOVERY_WEEKS = {4, 8, 13}


def phase_of(week: int) -> int:
    return 1 if week <= 4 else 2 if week <= 8 else 3


def build_workouts() -> list[dict]:
    out = []
    for name, (key, style, pillar) in WORKOUTS.items():
        w: dict = {"key": key, "name": name, "style": style}
        if pillar:
            w["pillar"] = pillar
        if name in VIDEO:
            w["exercises"], w["focusOrder"] = build_exercises(VIDEO[name])
        out.append(w)
    return out


LABEL_SECONDARY = {W: "W", BW: "M"}


def exercise(name: str, kind: str | None, block: str, rounds: int) -> dict:
    e: dict = {"id": slugify(name), "name": name, "rounds": rounds}
    if kind is not None:
        e["secondary"] = kind
    e["agg"] = "avg"
    e["labels"] = [
        {"main": f"R{i + 1}", **({"secondary": LABEL_SECONDARY[kind]} if kind else {})}
        for i in range(rounds)
    ]
    e["block"] = block
    return e


def build_exercises(blocks: list[tuple]) -> tuple[list[dict], list[list]]:
    """Catalog rows in video order, plus focus mode's (exercise id, round) play order."""
    exercises: list[dict] = []
    order: list[list] = []
    for block, rounds, circuits, *bookend in blocks:
        if bookend:
            row = exercise(bookend[0], None, block, 2)
            row["labels"] = [{"main": "Buy-in"}, {"main": "Cash-out"}]
            exercises.append(row)
            order.append([row["id"], 0])
        for circuit in circuits:
            exercises.extend(exercise(n, kind, block, rounds) for n, kind in circuit)
            order.extend([slugify(n), r] for r in range(rounds) for n, _ in circuit)
        if bookend:
            order.append([row["id"], 1])
    return exercises, order


def build_template() -> list[dict]:
    days = []
    for w, week in enumerate(CALENDAR, start=1):
        for name in week:
            days.append(
                {
                    "day": len(days) + 1,
                    "week": w,
                    "phase": phase_of(w),
                    "recovery": w in RECOVERY_WEEKS,
                    "workouts": [WORKOUTS[name][0]],
                }
            )
    return days


def verify(workouts: list[dict], template: list[dict]) -> list[str]:
    """Known-fact assertions (E33 US-161 AC)."""
    keys = {w["key"] for w in workouts}
    assert len(template) == 90, len(template)
    assert [len(wk) for wk in CALENDAR] == [7] * 12 + [6], "week 13 has six days"
    for d in template:
        assert d["workouts"][0] in keys, d
    assert template[0]["workouts"] == ["gn-push-strength"], template[0]
    assert template[37]["workouts"] == ["gn-push-strength"], "week 6 Wednesday is Push Strength"
    assert template[89]["workouts"] == ["gn-speed-and-agility"], template[89]
    assert all(template[w * 7 + 6]["workouts"] == ["gn-myofascial-release"] for w in range(12))
    counts = {k: sum(1 for d in template if d["workouts"][0] == k) for k in sorted(keys)}
    assert sum(counts.values()) == 90
    lengths = {w["key"]: len(w["exercises"]) for w in workouts if "exercises" in w}
    assert lengths == {
        "gn-upper-body": 13,
        "gn-lower-body": 11,
        "gn-push-strength": 11,
        "gn-pull-strength": 11,
        "gn-core-circuit": 5,
        "gn-full-body-strength": 12,
        "gn-full-body-power": 14,
    }, lengths
    for w in workouts:
        ids = [e["id"] for e in w.get("exercises", [])]
        assert len(ids) == len(set(ids)), f"duplicate exercise id in {w['key']}"
        pairs = sorted(map(tuple, w.get("focusOrder", [])))
        expected = sorted((e["id"], r) for e in w.get("exercises", []) for r in range(e["rounds"]))
        assert pairs == expected, f"focusOrder must play every round once in {w['key']}"
        assert all(e["rounds"] <= 5 for e in w.get("exercises", [])), "schema caps rounds at 5"
    # Every Dumbbell Tracker move is still logged, in its block, as R×W (its id is in user data)
    for name, t in TRACKER.items():
        rows = {e["name"]: e for w in workouts if w["name"] == name for e in w["exercises"]}
        for block in ("Block 1", "Block 2", "Finisher"):
            for ex in t[block]:
                assert rows[ex]["block"] == block and rows[ex]["secondary"] == "weight", (name, ex)
    assert all(k.startswith("gn-") for k in keys)
    return [f"{k}: {n} days" for k, n in counts.items() if n]


def main() -> None:
    workouts = build_workouts()
    template = build_template()
    for note in verify(workouts, template):
        print(note)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"workouts": workouts, "template": template}, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("wrote", OUT_PATH)


if __name__ == "__main__":
    main()
