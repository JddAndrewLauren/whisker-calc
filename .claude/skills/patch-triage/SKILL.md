---
name: patch-triage
description: Triage unreviewed Whiskerwood patch-note lines in src/data/patch-ledger.json against the calculator dataset and propose overrides.json edits. Use when the user says "triage patches", "review the patch ledger", or invokes /patch-triage.
---

# Patch triage

Work the balance-line backlog that `npm run patches` collected, entirely offline.

## Procedure

1. Run `npm run patches -- --check` (no network). Read `src/data/patch-ledger.json`,
   `src/data/whiskerwood.json` (note `gameVersion` and `source`) and `src/data/overrides.json`.
2. Take `unreviewed` entries oldest version first, in batches of about 20. Show the batch as a table:
   id, version, confidence, top recipe, text.
3. Classify every line:
   - **not-applicable**: the calculator does not model it (trade values, taxes, warehouse capacity or
     cost, housing, construction time, ships, cannons, ferries, decorations, steam-engine consumption,
     pollution, UI, map generation). Resolution: one clause saying why.
   - **applied**: the dataset already reflects it. When `source` is `tables` and the line's version is
     at or below `gameVersion`, every recipe number is already in the tables, so a line whose
     `recipes[0]` is a table-derived recipe is applied by construction; say "covered by tables
     import <gameVersion>". Otherwise compare `numbers.to` (or the factor) with the current
     `timeSeconds`, input/output `qty` or building `cost` and say "dataset already reflects vX".
   - **proposed edit**: the dataset differs. Propose the exact `overrides.json` change
     (`recipes["netter/fishing-nets"].timeSeconds = 377`, `buildings[...].cost`, ...). Only after the
     user accepts and the edit is written, mark `applied` with "overrides.json: <path> = <value>".
   - **superseded**: a later line changes the same field again. Resolution: "by <later id>".
   - **needs-verification**: mapping or magnitude is unclear ("Halve fish production by shore
     fishing"), or the line is about an assumption the calculator makes rather than a number it
     stores (day length, catalyst or guild bonuses, farm tiles). Resolution: "verify in game: <what
     to measure>".
4. Edit only `src/data/overrides.json` and, in the ledger, only `status` and `resolution`. Never touch
   `text`, `entities`, `numbers`, `recipes` or `id`, never delete an entry.
5. Finish with `npm run patches -- --check` and `npm test`. List the edits. Remind the user that
   `npm run import` (or `npm run scrape`) regenerates `whiskerwood.json` from the new overrides.

## Must not

- Fetch anything: no `npm run patches` without `--check`, no `curl`, `fetch`, WebFetch or WebSearch.
- Invent numbers that are not in the line text or the dataset.
- Mark `applied` when neither the dataset nor overrides contain the value.
- Hand-edit `src/data/whiskerwood.json` or change `gameVersion`.
