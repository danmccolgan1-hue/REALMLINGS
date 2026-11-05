# Realmlings: handoff for the next conversation

Realmlings is a Stellaris / Anbennar-lite fantasy RTS in a cartoon style, played in the browser.
The live build is the published artifact **Realmlings Playtest**:
https://claude.ai/artifact/JDKKiwqrMhuaBoEAdBDMSV.

**Read `CLAUDE.md` first.** Always use American spelling (armor, defense, color, center…) in code, comments, UI text and reports.

## Status

- `SPEC_next.md` (set pieces, Bandit Gangs, towns, the technology overhaul) is done and live.
- `SPEC_ai.md` (AI nations) is done and live, alliances included (the user asked for them). See "AI nations" below.
- This project folder was rebuilt from the live page: its files reassemble into a byte-identical copy of the published build before the AI pass.

## How the game is built

`python3 assemble_game.py` (run inside this folder) writes `realmlings_play.html`, one self-contained page.

- **Shell:** `game_shell.html` holds the HTML, the CSS and the How to Play text.
- **Renderer:** lines 130–581 of `page.html` (do not change that file's line count of 690). `assemble_game.py` patches this slice with string replacements (`R(old, new)`, each must match exactly once).
- **Game code:** `game.js`, with these files inserted before `fit(); setupBar(); bootMenu();`, all inside one IIFE in strict mode:
  `war.js, equip.js, tech.js, techicons.js, govtech.js, magic.js, menu.js, SFX_DATA (sound effects embedded as base64 from sfx/*.mp3), sound.js, features.js, flags.js, content.js, ai.js`
  (`content.js`: set pieces, Bandit Gangs, towns and civilians, repeatable-tech effects. `ai.js`: the AI nations.)
- **Separate scripts:** `gen.js` (world generator, `RealmGen`), `iso.js` (unit art, `RealmIso`), `buildings.js` and `buildings2.js` (building art, `RealmBuild` / `RealmBuildings`; the Temple art is `B.temple` in buildings2).

### Publishing

- **Current version: v76** (v72 AI nations; v73 lighter bitmap cache; v74 error-proof game loop; v75 province window fix, war, Wayfinder and meeting changes; v76 left column and UI size). After each publish, update this line with the version number the publish result reports.
- Name project zips with that version, e.g. `realmlings_v76.zip`.

- Publish `realmlings_play.html` to the URL above (pass it as `url`; read the artifact first, since it is from an earlier conversation).
- Music lives at `music/tavern.mp3` and is already published with the artifact. Files left out of a publish are kept, so it only needs re-sending if it changes.
- Sound effects are embedded in the page (so they work in every browser and from a saved file); `sfx/` is the source.

### Testing

- Playwright and Chromium are preinstalled.
- Serve the folder with `python3 -m http.server 8766` and open `http://localhost:8766/realmlings_play.html`.
- In the page:
  - click `#mStart` to start a game; `#mPractice` toggles Practice mode (10 provinces, player only);
  - `window.__realm` exposes the state `S`, the world `G`/`world` and many helpers;
  - `window.__realm2` exposes the govtech helpers;
  - `window.__realm3.dirtyMap()` redraws territory and fog after you poke state;
  - `window.__sfx` and `window.__music` expose sound and music.
- Google Fonts can't load in the sandbox, so screenshots show fallback fonts. Mojibake in local screenshots (Â·, âžœ) comes from http.server only and is fine when published.

## Key systems (where to look)

- **Map:**
  - `WORLD_K = 2` scales the generated world.
  - Provinces have `pts` (outline), `inner` (open ground) and `ic` (center).
  - Border bands (mountains, trees, ruins as stones only, wide rivers) and blended terrain are in the `assemble_game.py` patches.
  - The nation's territory band and the zoomed-out outline are `drawTerritory` / `drawTerritoryTop` in game.js.
- **Economy:**
  - Payout every `TICK = 10` s.
  - Upkeep: units pay food only, buildings pay wood only, no gold upkeep.
  - `BUILD_DEFS` in game.js (Temple included).
  - Build times come from `buildTime(type)`: 30 s, or 60 s for Forge and Mage Tower.
  - Building plots are scattered per province by `bslotOf(p, slot)`.
- **Units:**
  - `mkUnit`; Wayfinders and Masons get names from `cuteName()` in features.js.
  - Limit of 3 Wayfinders and 3 Masons (`UNIT_LIMIT`).
  - Free movement inside a province: `order(u, target, quiet, pt)`, `orderGroup(target, append, pt)`, `clampInto`, `formation`.
  - Queue cap is 10 (`QUEUE_MAX`).
  - Right-click moves; Ctrl+right-click opens the survey/build menu (`openBuildMenu`).
- **Armies:**
  - `troops` is a map of design id to count; designs are in equip.js (`addDesign`, `DSTATS`, `UNIT_DEFS[designId]`).
  - `unitSpeed(u)` already takes the slowest troop, but check combined armies.
  - Battles live in game.js (`stepBattles`, `applyDamage`).
  - Raiders use `owner = RAIDERS (3)`, which is useful for the Bandit Gangs.
  - The rival kingdom is war.js (`spawnRival`, owner 2); the AI pass will replace or extend it.
- **Technology:**
  - tech.js holds `TECHS`, `MIL_TECHS` and `MAG_TECHS`.
  - `drawOptions` picks the offered options; `UPGRADE_TECHS` are always offered.
  - Costs: `techCost`, with Government costs doubled (`GOV_COST_MULT`).
  - Research rate: `techRate(tree)`; temples add +2 Government.
  - Icons come from techicons.js (`techIcon`).
  - The research panel folds its options and the researched list (`techShow`, `techDoneOpen`).
- **Magic:**
  - magic.js holds `CAST`, `LINES`, `lvl(line)`.
  - Harvest is a continuous cast: `HARVEST_PCT`, `harvestFood`.
  - Grave Robbing and Trading are the resource spells (`RES_SPELL`, `RES_YIELD`).
  - Paths and tunnels: `startPath`, plus the aim button `xpath` in features.js.
- **Command card:**
  - `CMD`, `cmdInfo`, `cmdUse` in game.js.
  - New actions go through `extraCmdInfo` / `extraCmdUse` in features.js (dismiss, destroy, road, inspect, retrofit, xpath).
  - Grid hotkeys (`GRID_KEYS`: QWER / ASDF / ZXCV / UIOP) are in features.js.
- **UI:**
  - The outliner (`renderRoster`) has Workers, Provinces and Armies tabs.
  - Province menu: `provMenu`.
  - Notification flags: flags.js, shown under the Research bar.
  - Settings menu: gear in the top left (sound.js bottom).
  - Nation name, color and flag: features.js (`NATION`, `flagSVG`), shown in the top left.
- **Fonts:**
  - Cinzel Decorative for display text, Cinzel for UI text.
  - Grenze Gotisch for outliner names.
  - Every window has square corners and thin 1px outlines.
- **Simulator:** `tools/arena.js` is the old AI arena, with 8 personalities (Expansionist, Arcane Rush, …). It uses the OLD economy and is useful as a reference for the AI pass.

## Files

- `realmlings_play.html` is the latest built page (v69).
- `SPEC_next.md` is the user's feature list to implement.
- `flags/` holds the notification flag SVGs.
- `tools/` holds the simulator, video and sound tools.

## AI nations

- **Lobby** (menu.js): 7 opponent slots (`menuOpts.slots`, saved in localStorage `realm-slots`), each Easy / Moderate / Difficult / Closed. Practice mode spawns none. `spawnAINations(slots)` runs in `startGame` after `setupGame`, before `setupContent`.
- **Owners:** player `ME = 1`, raiders `3`, AI nations `4`–`10` (`AI_IDS`). `NATIONS[id]` (war.js) holds each AI's state; `PLAYERS[id]` its name and color. The old single rival (owner 2, `spawnRival`) is gone.
- **Wars** (war.js): `S.wars` is a list of pairwise wars `{ a, b, base, active, parent, … }`; `warscore(w, side)`; `hostile(a, b)` checks raiders or `atWar`. Occupations live in `S.occ` (province → occupier). `declareWhy` enforces truces, alliances, the 50 gold fee and `WAR.maxVsPlayer = 2`. A war joined through an alliance has `parent`; ending the parent ends it. `makePeace(w, winner, terms)`; AI-vs-AI peace is `aiPeace` (the side ahead dictates at +50 / +100). AI demands to the player: `checkAIDemands` / `aiDemand`.
- **Alliances** (war.js, from the arena): one ally each, against a common neighbor at least 25% larger than both; `stepAlliances` every 5 s forms and ends them. AIs offer the player an alliance (popup in `#demand`, `offerAlliance`); the player can propose or end one in Diplomacy.
- **Diplomacy panel:** a list of met nations (`S.met`) and a per-nation view (declare, ally, or the war and its peace terms). The chip shows every war against the player.
- **AI brain** (ai.js): real Wayfinders, Masons and armies, its own stock, research (`N.tech`, `N.rep`) and survey knowledge (`N.surveyed`). `stepAI` runs every frame; each nation thinks every 1–3 s (`AI_DIFF`). `aiPlan` sets wants by difficulty; `aiMasons` (outposts vs `aiNextBuilding`), `aiWayfinders`, `aiTrain`, `aiFortUp`, `aiArmyOrders`, `aiConsiderWar` (Moderate only: 2-to-1 against the weakest neighbor). `aiPayday` runs from `payday`. Soldiers come from `aiRedesign` (best researched gear in the nation's weapon family).
- **Shared code made owner-aware:** outpost/building completion, `cancelBuild` refunds, arrowslits and moats (`techOf(owner, id)`), Wayfinder deaths, bandit bounties, battle colors, the Workers list and minimap borders (explored land only).
- **Testing:** `window.__ai.step(seconds)` fast-forwards the game (10 updates per second, no drawing); 40 minutes take about 8 s. `window.__realm.S.reveal = true` lifts the fog. Finished settlements and buildings are drawn from a bitmap cache (`drawArt`) when zoomed out and for other nations' towns.
- **Known simplifications:** AIs don't build roads or walls, don't cast battle spells (their money spells and Harvest are applied as income), and Military repeatables don't boost their soldiers.
- **Errors never stop the game (v74):** `frame()` wraps `frameBody()` in try/catch and always schedules the next frame; each per-frame step in `update()` runs through `run(name, f)`; `payday` is guarded too. `reportError(e, where)` shows one toast per distinct error and logs to `window.__errors` (ask the user to read it out from the browser console if something goes wrong). `kick()` is now a no-op: it used to start an extra copy of the loop for players with "reduce motion" turned on.

## v75 changes

- **Province window** was broken since v72 (it still read the old `S.war.at`); fixed. Grep for `S.war.` if anything similar turns up.
- **Meeting** (war.js `updateMet` / `meetNation`): explored land, or a player Wayfinder standing in a province bordering theirs. A popup (`#metPop`) pauses the game until Continue; several meetings queue.
- **Capture progress** (war.js `stepWar`, game.js `stepBattles` / `endBattle`): a battle saves the capture in `b.prog`; progress is frozen during a battle and while the capturer's army repositions; the capturer winning restores it, losing clears it.
- **Total Victory** is automatic at ±100 (`stepOneWar`): `totalPick` (5 provinces; connected ones first, else the loser's land nearest the winner as one block; annex if 5 or fewer), a minute of the loser's gold income (`income.gold` or `N.income.gold` × 6) from its treasury, and `grantResearch` (100 points in each unlocked tree). It is no longer a peace term or an AI demand.
- **Enemy fog**: `canEnter` lets the player's units enter unexplored provinces owned by a nation at war with them.
- **Wayfinders at war** (govtech.js `stepScouts`, every owner): flee to `lastProv`; `markUntil` = 15 s after arriving; caught again while marked (or with nowhere to run) sets `doomAt` = 5 s; a friendly army in the province saves him.
- **Mushroom Farming** (`mushroom`, Government Tier II, needs Advanced Farms): farms in swamps (`farmLand` in govtech.js).
- **Armies tab** lists your Barracks (`barracksSec` in features.js); click selects it for training, double-click flies there.

## v76 changes

- **Left column** (`#lcol`, under the nation badge): the Armory button and the Diplomacy chip (`#dip`, now laid out vertically with one named row per war). The Diplomacy panel opens beside the column. The Research button stays alone in the top-center bar.
- **UI size** (Settings slider `#uiSize`, 70–150%, saved as `realm-ui`): sets the CSS variable `--ui`, used as `zoom` on every HUD panel and window (the selector list is just above "square corners everywhere" in game_shell.html). The map canvas and the drag box are not zoomed. Anything placed at mouse coordinates divides by `uiZ()` (build menu, plot menu, tooltip). A new HUD element must be added to that selector list to scale.
