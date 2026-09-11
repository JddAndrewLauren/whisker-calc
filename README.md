# whisker-calc

A production-ratio calculator for [Whiskerwood](https://store.steampowered.com/app/2489330/Whiskerwood/),
in the spirit of [FactorioLab](https://factoriolab.github.io/). Pick an item and a target and it tells
you how many of each building the chain needs, down to farm tiles and mined ore, e.g. how many Cotton
Gins per Weaver when making Tailored Clothes, or how many Farms and Bakeries feed 100 Whiskers on Bread.

Recipe data comes from the [official wiki](https://wiki.hoodedhorse.com/Whiskerwood/) and is checked in
at `src/data/whiskerwood.json`. Item and building icons are the game's own art as hosted by the wiki
(copyright Minakata Dynamics / Hooded Horse); this is an unofficial fan tool and credits them in its footer.

## What it covers

- Every wiki building with a recipe table (27 buildings), including the Ore Furnace.
- Farms, from the wiki's Farmer's Almanac: a 2-worker Farm tends about 72 tiles of cotton, wheat, tea or
  peppers (growth 0.10 years = 1728 s) or 36 tiles of berries, flax, mushrooms or trees (0.05 years =
  864 s; trees 1728 s), at the maximum yield of 2 per tile. Farm steps show both buildings and tiles.
- Water Pump and Steam Boiler, with estimated rates (the wiki gives hints only). They are marked "est."
  in the table and are one-line edits in `overrides.json`.
- Three ways to state the target: a rate per minute, a population to feed (one meal per Whisker per
  540-second working day), or a number of producing buildings you already own.
- A "Materials to build" panel summing construction costs from every building's infobox.

Ores, coal, stone, rock salt and potash stop the chain: Mining Camps have no steady rate, so they are
reported as units per minute. Not modeled: catalyst and machinery consumption (no wiki numbers),
Woodcutter and Forage Hut (finite wild resources), Hardtack, Ration Meals, Trinkets and guano (no
recipes), and choosing a different producer per consumer.

## Assumptions

- Recipe times on the wiki are taken to be for a fully staffed building.
- Speed bonuses stack additively: guild match +50%, catalyst +25%, adjacent Steam Engine +100%,
  plus a free-form extra percentage for traits, food, temperature and the like.
- Farm tiles are land, so a Farmer's Guild bonus reduces Farms needed but not tiles.
- Miners and Whiskers with the Heavy Eater trait eat one extra meal; tea does not count as food.
- Where the wiki disagrees with itself the building page wins (Fishing Dock: 1 Fish per 21 s, not the
  overview table's 2 per 89 s).
- Choosing a producer (e.g. Cotton Gin vs Flax Spinner for Threads) applies to every consumer of that item.

## Development

```
npm install
npm run dev        # local dev server
npm test           # unit tests (parser, normalizer, solver, target modes, costs, URL state) and an icon-file check
npm run build      # type-check and build to dist/
npm run icons      # download any icons missing from public/icons (see below)
```

The page is styled after the game's HUD (parchment panels on navy) and loads Alegreya SC and Nunito from Google
Fonts, falling back to system fonts offline.

## Refreshing the wiki data

```
npm run scrape
npm run icons
```

`scrape` fetches the building pages listed in `scripts/wiki/buildings.ts`, parses their recipe tables (any
table with a production-time cell) and infoboxes, applies `src/data/overrides.json`, and rewrites
`src/data/whiskerwood.json`. It exits non-zero and lists the offending cells if the wiki layout changes.
Requests go through `curl` because the wiki's Cloudflare protection challenges Node's built-in fetch.

Every item and building in the dataset carries the wiki file name of its icon (`icon`), taken from the
`[[File:...]]` next to it in the recipe tables and from the infobox picture. `icons` downloads those files
as 64px item and 96px building thumbnails into `public/icons/` (plus `public/favicon.png`, the file named
by `favicon` in `overrides.json`), skipping ones already present (`--force` refetches). It refuses to run
while any entry has no icon, and a test fails if any entry has no PNG, so run both after a scrape adds items.

`overrides.json` fixes things the wiki gets wrong or leaves out:

- `itemAliases`: rename items after title-casing ("Iron" -> "Iron Bars", "Copper" -> "Copper Ore").
- `buildings`: set `workers`, `guild`, `catalyst` or `cost` for a building id (the Oil Press infobox labels its
  Iron Bars icon as Machinery, so its cost is overridden; "Plank" and "Wood" are aliased to Planks and Logs).
- `recipes`: replace `inputs`, `outputs` or `timeSeconds` for a recipe id (`building/output-item`).
- `preferredRecipe`: which recipe is the default producer of an item.
- `extraBuildings` and `extraRecipes`: buildings with no recipe table on the wiki (Farm, Water Pump,
  Steam Boiler), each with the wiki file name of its picture (`icon`). A recipe may carry
  `tilesPerBuilding` (farm land at base speed) and a `note` that the UI shows as the source of the numbers.
- `foods`: items that satisfy hunger, offered in the "to feed" mode.
- `itemIcons`: wiki icon file for items that never appear with an icon in a scraped table (Water, Steam,
  and Tea Leaves, which only enters through a recipe override). It only fills gaps: the scraper warns
  when an entry clashes with an icon the wiki shows, and about any item still without one.
- `favicon`: the wiki icon file downloaded as the site favicon.

Recipe ids derive from item names, so keep aliases stable once links to the site are in circulation.

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`. The repository's
Pages source must be set to "GitHub Actions" once.
