# Handoff: first pass over the patch ledger

Goal: work the 287 unreviewed lines in `src/data/patch-ledger.json` so `npm run patches -- --check`
becomes a meaningful alarm, and so lines that describe mechanics the calculator assumes (day
length, catalyst and guild bonuses, farm yields) are queued for in-game verification.

## Context to load

- `.claude/skills/patch-triage/SKILL.md` is the procedure; run `/patch-triage`.
- The dataset is table-derived at `gameVersion 0.7.206.0`, so every recipe number in lines at or
  below that version is already applied by construction. Most of the pass is classifying lines as
  `applied` ("covered by tables import 0.7.206.0"), `not-applicable` (trade, taxes, housing, ships,
  UI, pollution) or `needs-verification` (assumptions). Expect few if any `overrides.json` edits.
- Lines worth flagging `needs-verification` for workstream C: Patch #15 "work days increase from 6 to
  7 minutes" (the calculator uses a 540 s day = 7 min work + 2 min night per SystemTunes), Patch #17
  steam boiler and steam engine changes, Patch #2 fertilizer yield, anything about catalysts.

## Decisions that need the user

Each classification is a judgement call, which is why this is a session and not a sub-agent. Batches
of ~20 lines; oldest version first.
