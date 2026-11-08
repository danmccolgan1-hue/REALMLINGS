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
  `war.js, equip.js, tech.js, techicons.js, govtech.js, magic.js, menu.js, SFX_DATA (sound effects embedded as base64 from sfx/*.mp3), sound.js, features.js, flags.js, content.js, ai.js, gpc.js, v78.js`
  (`gpc.js`: most of the v77 gameplay changes; its `stepGPC` runs every unpaused frame.)
  (`v78.js`: most of the v78 graphics / interface / text changes; `stepV78` runs every frame, `setupV78` at game start.)
  (`content.js`: set pieces, Bandit Gangs, towns and civilians, repeatable-tech effects. `ai.js`: the AI nations.)
- **Separate scripts:** `gen.js` (world generator, `RealmGen`), `iso.js` (unit art, `RealmIso`), `buildings.js` and `buildings2.js` (building art, `RealmBuild` / `RealmBuildings`; the Temple art is `B.temple` in buildings2).

### Publishing

- **Current version: v80** (v72 AI nations; v73 lighter bitmap cache; v74 error-proof game loop; v75 province window fix, war, Wayfinder and meeting changes; v76 left column and UI size; v77 the GPC01–GPC31 gameplay list; v78 the GC/IC/T list: graphics, interface and text; v79 the SMA small map additions; v80 Quick queue setting). After each publish, update this line with the version number the publish result reports.
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

- `realmlings_play.html` is the latest built page (v78).
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

## v77 changes (the user's GPC list; GPC = Gameplay Change)

The user tests each change himself; nothing here was play-tested. The build was only assembled, syntax-checked and scanned for undefined names.

- **GPC01** Tyranny Exhaustion is gone (govtech, ai, flags, bar, How to Play).
- **GPC02/03** Notification flags (flags.js): the green plot flag needs a free Mason (`freeMasons`, `unitStatus === 'idle'`); left-click flies to the open plot; right-click dismisses a flag until its reason goes away and comes back (`flagDismissed`). Research flags open Research.
- **GPC04** `revealOwnedResources` (gpc.js, once a second): every claimed province you can see counts as surveyed; AI nations learn all claimed provinces.
- **GPC05** Masons won't path into provinces with known hostile armies (`masonDanger` in `canEnter`) and flee like Wayfinders (`stepScouts` handles both; Masons also run from Bandit Gangs).
- **GPC05b** (unnumbered line) `outpostClaimed(p, by)` from outpost completion: other nations' Wayfinders there withdraw (`exiting`, `exitTo`) to `lastProv` if it is their own or an enemy's at war, else to their capital.
- **GPC06** `topUpOptions(tree)` keeps every tree at `techOptions()` choices, also while researching (tech.js `availTechs`).
- **GPC07** Set pieces hidden until surveyed; `showSetpiecePop` (`#spPop`) on discovery; a building-sized landmark (`drawSetpieceArt`) at `spSpot(p)` (houses keep clear of it).
- **GPC08** Horde: 10+ cavalry, ×1.3 health (`HORDE_MIN`, `HORDE_HP`).
- **GPC09** `apprentice` (Magic Tier I, any school): +1 Mage (`mageCap`, AI too).
- **GPC10** Fort limit starts at 1 (`FORT_LIMIT = [1, 3, 5, 7]`). The Wall Gates tech and Mason gate-building are removed: every wall has a gate, `S.gateOwn` (linkKey → `{ home, owner }`), `gateCtl(k)` = the home province's occupier or owner (so a captured fort's gates switch sides), else the raiser. `raiseWall(p, q, owner, home)` is the shared wall builder; `wallsVer` invalidates `wallsAt`. `pathNbr(u, a, siege)` adds own gates and, for armies when `siege` is set, hostile walls; `findPath` tries without sieges first. **Sieges** (new, so walled forts stay capturable): `siegeHold` in the movement loop stops an army 34 units short of a hostile wall (`u.sieging`), `stepSiege` wears `S.wallHp` down at battle-damage rate, `breakWall` opens the border. `stepFortGates` walls each open border of every fort whose owner has `walls` (once per border, `S.fortWalled`; never a neighbor's last open border, never magic paths). **Earthquake** (`u.quake`, separate from the school spells): any Mage, 30 s, from land the caster controls or unclaimed land; command card (`quake`, army cell 11 / Mage cell 14), aim via `pathAim` + `quakeAim`, and a Ctrl+right-click row. Casts by nations at war with you add `S.quakes` → an "Earthquake at …" flag (`flag_earthquake.svg`, label under the flag). AI Mage armies at war cast it (`aiQuake`).
- **GPC11** `horse-breeding` requires `stable`; `reqMet(x, st, all)` accepts requirements from other trees (AI passes `N.tech`).
- **GPC12** `powerOf(a)` / `nationPower(o)` (rawStrength × 10) shown in the Armies list, selection line, Inspect and Diplomacy. `aiConsiderWar` (Moderate and Difficult; Easy stays peaceful): 2× `defPower` of a bordering nation → `N.warPlan`, declares 60 s later if it still holds; warns the player.
- **GPC13** Military tech costs ×2 (`MIL_COST_MULT`, `treeCostMult`); Battle Forge needs two Tier I Military techs (`forgeReady`).
- **GPC14** Retrofit: 10 s per soldier at an own, unoccupied Barracks (with a Stable for cavalry); `retrofitArmies` sends the army (`retroWant`), `beginRetro` pays, `stepRetrofits` finishes or refunds; error sound if no Barracks.
- **GPC15** Rest: standing still at an own Barracks heals wounds over 5 s per wounded soldier (`stepRest`, `woundedUnits`); Rest button (army cell 8) marches to the nearest.
- **GPC16** `declareWhy` requires `nationsBorder(att, def)`.
- **GPC17** Roads only between two of your own provinces.
- **GPC18** Far-Seeing Wayfinders add what they see to `S.known` for good.
- **GPC19/20** `rep-masons`, `rep-wayfinders` (Government repeatables) raise `unitLimit` (AI too).
- **GPC21** `RETREAT_LOCK = 10` s at the start of every battle.
- **GPC22** Occupied provinces are visible to the occupier (`computeFog`).
- **GPC23** `nationOk` allows a truce partner's land; `evictStrays` (once a second) marches units home from land they may no longer be in.
- **GPC24** `navRoute(prov, a, b)`: waypoints across a province's open ground (cached `navNodes`, Dijkstra) replace the detour through the middle; `order` now builds walks with `walkHops`.
- **GPC25** Truce 8 minutes.
- **GPC26** `retreatHome(a)`: retreat walks to the capital (or the reachable province nearest it), first step enemy-free, no sieges; `u.retreatHome` blocks orders and selection until arrival.
- **GPC27** `brokenNation(o)`: every province occupied and no army → Total Victory for the foe.
- **GPC28** Arrowslits: a volley every 10 s that kills one Footman (`arrowDmg`), none while the fort is occupied.
- **GPC29** Lumber Mill: +4 wood, no upkeep.
- **GPC30** (first) `takeable(p, winner)`: no peace deal takes a province occupied by a third nation; Total Victory takes up to 5 takeable non-capital provinces, and annexes only if nothing is held by a third nation.
- **GPC30** (second, listed as GPC31 in replies) `trainTime(kind)`: Wayfinders/Masons 12 s, soldiers 18 s, Mages 30 s.

### v77 follow-ups (same version)

- **Walls:** no cut-off rule anywhere (every wall has a gate). A siege takes `SIEGE_TIME = 120` s per wall whatever the army size (`stepSiege` counts each wall once). Broken walls go into `S.brokenWalls` (linkKey → old `{ home, owner }`); at peace, selecting a fort or capital shows Rebuild walls (`rewalls` on the settlement card, `rebuildWalls(p)`, 15 s via `S.rewallJobs` / `stepRewalls`, refunded if a war starts, `REWALL_COST` 50 wood per wall). Masons can't rebuild them. Armies need `SIEGE_MIN = 6` soldiers to siege (`pathNbr`, `siegeHold`, `stepSiege`).
- **Rest:** 5 s for every soldier in the army (`woundedUnits` now returns the head count).
- **Garrison Charters** (`rep-forts`): cost never rises (`FLAT_REPS`, player and AI) and it is sticky once offered (`STICKY_TECHS`; `topUpOptions` adds sticky ones first).
- **Truce flag:** `truce:<id>` with `flag_truce.svg` (dove on red) in the last 30 s of a truce with you (`TRUCE_WARN`); left-click flies to that nation's land.

## v78 changes (the user's GC / IC / T list: graphics, interface, text)

Tested in headless Chromium (screenshots of each feature, 12 minutes fast-forwarded with AI nations, no errors); the user play-tests himself.

- **GC01** `drawArmy` (game.js) draws up to 10 soldiers in ranks (`armyFigures` in v78.js shares them out by kind, at least one of each; infantry front, Mages, cavalry back).
- **GC02 / GC15** Roaming Monsters (`MONSTERS`, `spawnMonsters` from `setupV78`, 7% of free provinces not next to a capital): Walking Ents (forest/grassland), Zombies (swamp/grassland), Jackal-men (desert). They are bandit gangs (`bandit: true`, `monster: kind`, owner `RAIDERS`) with troop kinds `m-ent`, `m-zombie`, `m-jackal` (DSTATS / UNIT_DEFS in v78.js). Art: `MON_ART`, hooked in by wrapping `RealmIso.drawUnitAt`, so portraits, battles and armies all draw them. Bandits and monsters patrol the edges of their own province (`stepPatrols`: own movement, not `u.moving`, so battles start normally; they stop when an enemy army is in the province).
- **GC03** Glove cursor: CSS data-URL SVG in game_shell.html (`body:not(.in-menu)`), hotspot 12 5; aim modes still set `cv.style.cursor`.
- **GC04 / GC05** Toggles above the minimap (`.mini-togs`, `VIEW.names` / `VIEW.realm`, saved as `realm-view`): `drawProvLabels` draws province names under the resource badge and your nation's name over its largest connected block (shown from about the F4 zoom outward).
- **GC06** No dotted lines to province centers (hover preview, moving units' routes, survey-queue trails); the numbered queue markers stay.
- **GC07** Roads have no dashed center line (`strokeRoad`); `roadWalkerItems` puts 2–3 folk walking each way on every visible road (hidden while a province is in danger).
- **GC08** Casting circle in `drawMagic` (magic.js): glowing disc, two rings, runes, rising motes; bigger for long casts.
- **GC09** `BUILD_BG` / `cmdBg` color the Mason's build buttons (and build-menu thumbnails) via `--bbg`; Outpost (and the Fort upgrade) gray. Storehouse (not in the list) is a wood brown.
- **GC10 / GC11 / GC12** Under each army its power (`drawArmyPower`); its banner carries the owner's flag (`drawArmyFlag`, flag images cached in `flagCache`; bandits a brown crossed-swords flag; monsters none); a thin health bar above (`armyHp`: in battle against the health it started with). The Armies tab shows power as a badge (`.ro-pow`).
- **GC13** Command-card buttons with `info.glow` (autocast on, auto-survey on) get `.cmd-btn.glow`.
- **GC14** Notification flag `upg` (`flag_upgrade.svg`, `findUpgradable`): an outpost that can become a Fort, or a Forge / Mage Tower whose next level is researched and affordable.
- **GC16** `UKK = unitK()` (set each frame in `drawGame`): units, their rings and battle figures 1.5×, easing to 2.25× at the F4 zoom (`f4Z`, measured around the capital in `setupV78`).
- **GC17** Far-Seeing Wayfinders, Arcane Scouts towers and Arcane Vision see through `openNbr` only (not trees, mountains, ruins or walls).
- **GC18** `drawLairGlow`: burgundy glowing border on provinces with seen bandits or monsters.
- **GC19** `civDanger(p)` (content.js): occupied, being captured, a battle, or a hostile army in the province. Civilians run home and stay inside (`cv.inside`) until it clears.
- **GC20** `selRing`: glowing, strongly pulsing ring with a ripple.
- **GC21** `onBattleJoin` / `onBattleEnd` are wrapped: `a.mfx` lists the battle spells that fired; `drawMagicFx` shows their icons over the army during the battle and 15 s after.
- **GC22** iso.js `castPose` (spec): both hands over the head, staff high, `castBolts` lightning at the tip (green Herbomancy, black Necromancy, pink Arcane). `castUnitId(u)` makes the casting variant of the Mage.
- **GC23** `drawSelProvs`: the province of every selected unit is softly lit.
- **GC24** Houses: 2 of every 3 in a province (`h.n % 3 !== 2`) have a roof in the owner's color (`houseSprite(v, roof)`).
- **GC25** `coastChains` joins coast segments into lines, so the sea band cut from the fog follows corners (round joins, square ends) instead of leaving notches.
- **IC01** Inspect opens `#inspWin` (`openInspect`): name (renamable), soldiers, power, health, and per kind its Mainhand / Offhand / Armor (and Mount) icons.
- **IC02** Click the nation badge: `#countryWin` (`toggleCountry`, `renderCountry`): leader portrait placeholder, provinces by stage and terrain, gross income, upkeep from buildings and from units, net, and the war record `S.warLog` (wrappers on `newWar`, `endWar`, `makePeace`, `killNation`).
- **IC03** Dismiss / Destroy are on Delete (twice); the cell shows "Del" and P no longer triggers them.
- **IC04** `SP_FOUND_TEXT` with the Wayfinder's name and the province; set pieces show only after one of your Wayfinders surveys the province (`S.spFound`) or once it is yours (`spKnown`).
- **IC05** Split on an army with several kinds opens `openSplitMenu`: split in half, split off all of a kind, or half of a kind (`splitKind`).
- **IC06** The Armory's redraw key leaves the name out (typing no longer loses focus); focus and caret are restored if it does redraw.
- **IC07** `#gtime` clock (game time, grays when paused) at the left of the top-right buttons.
- **IC08** Provinces tab "Hide full" (`VIEW.hideFull`).
- **T01 / T02** Schools are named Herbomancy and Necromancy (ids stay `life` / `death`).
- **T03** ✎ buttons (`data-rename`): the selection bar (single unit or army), the Inspect window and the province menu header open `#renamePop`. Province names live in `S.provRename` (used by `provName`); names are cleaned of `< > & "`.

## v79 changes (the user's SMA list: small map additions), all in v78.js unless noted

- **SMA01 Lost bands of travelers** (`S.travelers`, `placeTravelers`, `stepTravelers`, `drawTravelers`): about one per 40 provinces (at least 2), never next to a capital, never with bandits/monsters or the ruins. They amble about their province (cart, campfire, "?"). When a unit of yours stands still in their province, `#travPop` pauses the game: share 20 food each (they join an army there as Footmen, or form one), rob them for 30 gold each (needs an army there), or leave them (they ask again next time you come).
- **SMA02 Forgotten Treasure** (`surveyFinds`, `S.finds`): the first time your Wayfinder surveys a desert, a seeded 1-in-8 roll; +200 gold (`TREASURE_GOLD`), a popup (`#findPop`, queued behind any set piece popup) and a half-buried chest landmark.
- **SMA03 Roaming Monsters**: `MONSTERS` now has one terrain each (Ents forest, Zombies swamp, Jackal-men desert) and equally likely group sizes (1/2/3, 2/4/6, 3/6). Stats come from the starting designs (Ent = 2× Rider attack and health, Zombie = ½ Footman, Jackal-man = `designStats` Long Sword + Chain I). Loot per kill (`monsterLoot`, called from `applyDamage`): Ent 100 wood, Zombie 20 gold, Jackal-man 30 gold, to the side fighting them (no 50 gold bounty for monsters). `spawnLairs` (called from `setupV78`; the old bandit roll in `setupContent` is gone): 1/7 chance per province, none in a starting capital or next to one, none in the ruins; grassland always bandits, other terrain 50% bandits / 50% the local monster.
- **SMA04 Intact Ruins** (`placeRuins`, `drawRuinsArt`): one swamp province per map (not next to a capital or on a set piece), visible once explored. Your Wayfinder's survey grants a random unresearched Tier I Government technology (`grantTech`), or 3 minutes of Government research (`addResearch`) if none is left. tech.js: an idle tree's saved points are no longer cut back below a windfall.

## v80: Quick queue setting

Settings has a "Quick queue" toggle (`#qqBtn`, `VIEW.quickQueue`, saved in `realm-view`, off by default). When on, a plain right-click on a province opens the survey / build menu (`openBuildMenu`, from `clickAt` in game.js) if only Wayfinders and Masons are selected; Ctrl+right-click still works as before, and with armies or Mages in the selection right-click still moves. The menu's Explore / Move here entries walk without surveying or building.
