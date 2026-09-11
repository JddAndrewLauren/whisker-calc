# whisker-calc

A production-ratio calculator for [Whiskerwood](https://store.steampowered.com/app/2489330/Whiskerwood/),
in the spirit of [FactorioLab](https://factoriolab.github.io/). Pick an item and a target rate and it
tells you how many of each building the chain needs, e.g. how many Cotton Gins per Weaver when making
Tailored Clothes.

Recipe data comes from the [official wiki](https://wiki.hoodedhorse.com/Whiskerwood/) and is checked in
at `src/data/whiskerwood.json`.

## Assumptions

- Recipe times on the wiki are taken to be for a fully staffed building.
- Speed bonuses stack additively: guild match +50%, catalyst +25%, adjacent Steam Engine +100%,
  plus a free-form extra percentage for traits, food, temperature and the like.
- Farms, mines, foraging, water and steam have no fixed rate on the wiki, so the chain stops at those
  items and reports how many units per minute you need.
- Choosing a producer (e.g. Cotton Gin vs Flax Spinner for Threads) applies to every consumer of that item.

## Development

```
npm install
npm run dev        # local dev server
npm test           # unit tests (parser, normalizer, solver, URL state)
npm run build      # type-check and build to dist/
```

## Refreshing the wiki data

```
npm run scrape
```

This fetches the 26 building pages listed in `scripts/wiki/buildings.ts`, parses their Recipes tables and
infoboxes, applies `src/data/overrides.json`, and rewrites `src/data/whiskerwood.json`. It exits non-zero
and lists the offending cells if the wiki layout changes. Requests go through `curl` because the wiki's
Cloudflare protection challenges Node's built-in fetch.

`overrides.json` fixes things the wiki gets wrong or leaves out:

- `itemAliases`: rename items after title-casing ("Iron" -> "Iron Bars").
- `buildings`: set `workers`, `guild` or `catalyst` for a building id.
- `recipes`: replace `inputs`, `outputs` or `timeSeconds` for a recipe id (`building/output-item`).
- `preferredRecipe`: which recipe is the default producer of an item.

Recipe ids derive from item names, so keep aliases stable once links to the site are in circulation.

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`. The repository's
Pages source must be set to "GitHub Actions" once.
