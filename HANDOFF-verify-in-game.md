# Handoff: in-game verification harness (workstream C)

Goal: measure real production rates in Whiskerwood on purpose-built fixture saves and compare them
with the calculator's predictions, so the assumptions in `src/calc` (fully staffed cycle times,
additive speed bonuses, 540 s day, farm tiles, boiler water) are verified rather than guessed.

## Context to load

- The approved plan: `~/.claude/plans/the-official-wiki-can-hashed-bentley.md`, section "C. In-game
  verification harness". It lists the reflected class/property names (from
  `Whiskerwood-Project/Automation/diff.hpp`, 0.7.205), the spike order, the fixture mod layout, the
  probe log format and the driver design. Follow it; it was written against the real headers.
- Memory notes `whiskerwood-game-internals` and `whisker-calc-data-source-decisions` in
  `~/.claude/projects/-mnt-c-Users-john-orca-projects-whisker-calc/memory/`.
- Repo state: dataset comes from the game's DataTables (`data/dumps/0.7.206.0/`, `npm run import`);
  recipes to verify are in `src/data/whiskerwood.json`; predictions come from `src/calc/solve.ts`
  (`ratePerBuilding`, `buildingSpeed`) and `src/calc/target.ts` (`DAY_MINUTES = 9`).

## Member items, in order

1. Spike (a): install UE4SS experimental-latest (`UE4SS_v3.0.1-1131-ga8ab88e1.zip`, "Added support for
   UE 5.6") into `C:\Program Files (x86)\Steam\steamapps\common\Whiskerwood\Whiskerwood\Binaries\Win64\`,
   copy `zCustomGameConfigs\Whiskerwood\UE4SS_Signatures\`, set `GuiConsoleEnabled=1` etc., disable the
   three Workshop paks (TurboBoost, FasterEarthworks, FasterMining edit the tables being measured),
   launch via Steam. Pass: `UE4SS.log` shows 5.6, `FindAllOf("GridActor")` non-empty.
2. Spike (b): confirm the object map in Live View; read the `steamboiler_C` CDO's `UBoiler` defaults
   (answers the boiler water question). Record everything in `docs/game-internals.md`.
3. Spike (c): from Lua call `Arco_GiveResource`, `Arco_UnlockAll`, `Arco_NoCost`, `ModAPI:LogMessage`,
   write a jsonl under `Saved\Logs`.
4. Spike (d): `UArcoGameInstance::EnterPlay` from the main menu, set speed, watch 3 day rollovers at
   1x/5x/20x; note what pauses (end-of-day report, tax ship day 2, pirates day 6).
5. Then: `tools/game/mods/whisker-lab/` Lua mod, `tools/game/run_fixture.py`, `scripts/verify/predict.ts`,
   fixtures `bakery-bread`, `fishing-dock-fish`, `farm-wheat` (+ `-36tiles`), reports under
   `reports/0.7.206/`, skill `.claude/skills/verify-in-game/SKILL.md`.
6. While in game: open a Blacksmith and a Mill and count worker slots. The tables say 2 and 3; the
   wiki says 3 and 2. Ten buildings differ (see `npm run compare`).

## Decisions that need the user

- Being at the machine: the game takes the screen and the DLL injector modifies the install.
- Disable Steam Cloud for the app while iterating (fixture saves named `zz-lab <id>` otherwise upload).
- Whether catalyst turns out to be a bonus-output mechanic (tables hint at one bonus cycle in four); if
  so `src/calc/speed.ts` needs an output multiplier, not a speed bonus.

## Nothing to commit from C yet

No repo code exists for C; the plan says no code before spikes a-d pass.
