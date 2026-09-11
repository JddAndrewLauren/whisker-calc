# whisker-calc

A production-ratio calculator for [Whiskerwood](https://store.steampowered.com/app/2489330/Whiskerwood/),
in the spirit of [FactorioLab](https://factoriolab.github.io/). Pick an item and a target and it tells
you how many of each building the chain needs, down to farm tiles and mined ore, e.g. how many Cotton
Gins per Weaver when making Tailored Clothes, or how many Farms and Bakeries feed 100 Whiskers on Bread.

Recipe data comes straight from the game's own data tables (exported from the Steam install, see
below) and is checked in at `src/data/whiskerwood.json` together with the game version it belongs to.
The [official wiki](https://wiki.hoodedhorse.com/Whiskerwood/) is only used for building links and as a
cross-check; its infoboxes are generated from the same tables but lag behind patches.
Item and building icons are the game's own art as hosted by the wiki (copyright Minakata Dynamics / Hooded
Horse); this is an unofficial fan tool and credits them in its footer.

## What it covers

- Every building with a production recipe (32 buildings, 66 recipes, 70 items), including the Ore Furnace, Water
  Pump, Steam Boiler, Sail Manufactory and Cannon Foundry. Ships and non-goods (research, bugtraps) are
  left out.
- Farms, from the game's crop table: growth 0.10 years (1728 s) for cotton, wheat, tea, peppers and
  trees, 0.05 years (864 s) for berries, flax and mushrooms, at the maximum yield of 2 per tile. How much
  land one 2-worker Farm tends (72 or 36 tiles, from the wiki's Farmer's Almanac) is not in any table and
  lives in `overrides.json`; those recipes carry an "est." tag. Farm steps show both buildings and tiles.
- Four ways to state the target: a rate per minute, a population to feed (one meal per Whisker per
  540-second working day), a number of producing buildings you already own, or a population to feed
  with food of a given quality, which compares every food of that star rating (0-4, from the game's
  meal table) and ranks them by the workers needed, each with its full building tree.
- A "Materials to build" panel summing construction costs from every building's infobox.

Ores, coal, stone, rock salt, potash and guano stop the chain: Mining Camps have no steady rate, so
they are reported as units per minute. Not modeled: catalyst and machinery consumption, the Steam
Boiler's water intake (not part of its recipe row), Woodcutter and Forage Hut (finite wild resources),
Hardtack, Ration Meals and Trinkets (no recipes), and choosing a different producer per consumer.

## Assumptions

- Recipe times in the tables are taken to be for a fully staffed building.
- Speed bonuses stack additively: guild match +50%, catalyst +25%, adjacent Steam Engine +100%,
  plus a free-form extra percentage for traits, food, temperature and the like.
- Farm tiles are land, so a Farmer's Guild bonus reduces Farms needed but not tiles.
- Miners and Whiskers with the Heavy Eater trait eat one extra meal; tea does not count as food.
- Worker counts come from the `maxAgents_contextual` column, which disagrees with the wiki for ten
  buildings; it has not yet been checked in game.
- Choosing a producer (e.g. Cotton Gin vs Flax Spinner for Threads) applies to every consumer of that item.

## Development

```
npm install
npm run dev        # local dev server
npm test           # unit tests (table importer, wiki parser, normalizer, solver, target modes, costs, URL state) and an icon-file check
npm run build      # type-check and build to dist/
npm run icons      # download any icons missing from public/icons (see below)
```

A few tests pin numbers from the live dataset (Tea Roaster tea at 55 s, Netter nets at 377 s) as a tripwire,
so after a balance patch a fresh `npm run import` is expected to need those updated.

The page is styled after the game's HUD (parchment panels on navy) and loads Alegreya SC and Nunito from Google
Fonts, falling back to system fonts offline.

## Refreshing the game data

```
npm run dump      # export the DataTables from the Steam install (needs the game and TableGraph.exe)
npm run import    # rebuild src/data/whiskerwood.json from the newest dump
npm run compare   # show where the wiki disagrees with the tables (network)
```

`npm run dump` reads the game version from `Content/Movies/Version.txt` (set `WHISKERWOOD_DIR` if the
game is not in the default Steam library), runs `TableGraph.exe` from the
[Whiskerwood-Project](https://github.com/Whiskerwood-Modding/Whiskerwood-Project) modding repo
(`Automation/DTDumps/`, plus the newest `Whiskerwood-<version>.usmap`; put them in `tools/tablegraph/`,
which is gitignored) and writes `data/dumps/<version>/DataTableIndex.json`. Dumps are committed so
`npm run import` works without the game and so versions can be diffed. If the mappings are older than the
game, regenerate them with the repo's `jmap_dumper.exe` while the game runs.

`npm run import` turns `GridactorDefs_Sync` (buildings, workers, guild, catalyst, cost),
`AssetLookups/IndustryRecipes` (inputs, outputs, cycle time), `AssetLookups/Crops` and `SystemTunes`
(farm growth and yield) and `ResourceLookup` + `Loc_En` (names, food) into the dataset, applies
`src/data/overrides.json` and records the game version in `gameVersion`. It exits non-zero if a table,
row or English name it relies on is missing.

```
npm run icons
```

Every item and building carries the wiki file name of its icon (`icon`): the importer derives it from the
texture named in `ResourceLookup` (the wiki hosts the same `Tex_*` art) and from the building's name for the
infobox picture; the wiki scraper reads it from the `[[File:...]]` next to each item. `icons` downloads those
files as 64px item and 96px building thumbnails into `public/icons/` (plus `public/favicon.png`, the file
named by `favicon` in `overrides.json`), skipping ones already present (`--force` refetches). Files the wiki
does not have yet (the Nautical Update's cannons, shot, sails and guano, and their buildings) are reported and
left without an icon; a test lists which ids are allowed to lack a PNG.

`npm run scrape` still rebuilds the dataset from the wiki (`gameVersion: "unknown"`), mainly as the
input side of `npm run compare`.

`overrides.json` covers what the tables leave out:

- `itemAliases`: rename items ("Piped Water" -> "Water", "Tailored Cloaks" -> "Tailored Clothes") so
  recipe ids stay stable.
- `buildings`: set `workers`, `guild`, `catalyst` or `cost` for a building id.
- `recipes`: replace `inputs`, `outputs` or `timeSeconds` for a recipe id (`building/output-item`).
- `preferredRecipe`: which recipe is the default producer of an item.
- `farmTiles`: crop display name -> land one Farm tends at base speed.
- `extraBuildings` and `extraRecipes`: hand-authored additions; empty since the tables cover them. A
  recipe may carry `tilesPerBuilding` and a `note` that the UI shows as the source of the numbers.
- `foods`: display name -> quality in stars (0-4) for items the game's meal table does not list; empty
  since `Meals_Lookup` covers every food.
- `itemIcons`: wiki icon file for items whose icon the tables do not name; it only fills gaps.
- `favicon`: the wiki icon file downloaded as the site favicon.

Recipe ids derive from item names, so keep aliases stable once links to the site are in circulation;
`scripts/tables/idStability.test.ts` fails if an id in circulation disappears.

## Tracking game patches

```
npm run patches            # fetch Steam patch posts, merge balance lines into the ledger
npm run patches -- --check # offline; exit 1 while unreviewed lines newer than gameVersion exist
```

`scripts/patch-notes.ts` reads Whiskerwood's community announcements from the Steam news API (no
auth), keeps the announcements whose body parses as a changelog, splits it into version blocks and sections, and
records every Gameplay and Features bullet in `src/data/patch-ledger.json`. Each entry carries the
version, date, text, fuzzy-matched buildings and items, candidate recipe ids with a confidence, any
"from X to Y" / "double" / "by N%" numbers, and a review `status` (`unreviewed`, `needs-verification`,
`applied`, `not-applicable`, `superseded`) with a free-text `resolution`. Entries are keyed by post id
and a short hash of the line's version, section and text (an exact duplicate bullet gets a `-2` suffix);
re-running the fetch refreshes the matches, keeps `status` and `resolution` for unchanged text (a
changed line is reset to `unreviewed` and reported), and never drops an entry.

The ledger is the "what changed since the version we imported" alarm: `--check` fails while unreviewed
lines newer than the dataset's `gameVersion` exist (the wiki scraper leaves that version unknown, so
then every unreviewed line counts). Work the backlog with the `/patch-triage` skill in a Claude Code
session; it is offline, proposes `overrides.json` edits, and flips statuses.

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`. The repository's
Pages source must be set to "GitHub Actions" once.
