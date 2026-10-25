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
        if name in TRACKER:
            t = TRACKER[name]
            exercises = []
            for block in ("Block 1", "Block 2", "Finisher"):
                rounds = t["finisher_rounds"] if block == "Finisher" else 3
                for ex in t[block]:
                    exercises.append(
                        {
                            "id": slugify(ex),
                            "name": ex,
                            "rounds": rounds,
                            "secondary": "weight",
                            "agg": "avg",
                            "labels": [{"main": f"R{i + 1}", "secondary": "W"} for i in range(rounds)],
                            "block": block,
                        }
                    )
            w["exercises"] = exercises
        out.append(w)
    return out


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
        "gn-upper-body": 9,
        "gn-lower-body": 8,
        "gn-push-strength": 8,
        "gn-pull-strength": 9,
        "gn-core-circuit": 5,
        "gn-full-body-strength": 8,
        "gn-full-body-power": 8,
    }, lengths
    for w in workouts:
        ids = [e["id"] for e in w.get("exercises", [])]
        assert len(ids) == len(set(ids)), f"duplicate exercise id in {w['key']}"
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
