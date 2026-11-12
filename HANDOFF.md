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
  `war.js, equip.js, tech.js, techicons.js, govtech.js, magic.js, menu.js, SFX_DATA (sound effects embedded as base64 from sfx/*.mp3), sound.js, features.js, flags.js, content.js, ai.js, gpc.js, v78.js, swamp.js, wood.js, v95.js, v96.js, save.js`
  (`gpc.js`: most of the v77 gameplay changes; its `stepGPC` runs every unpaused frame.)
  (`v78.js`: most of the v78 graphics / interface / text changes; `stepV78` runs every frame, `setupV78` at game start.)
  (`content.js`: set pieces, Bandit Gangs, towns and civilians, repeatable-tech effects. `ai.js`: the AI nations.)
- **Separate scripts:** `gen.js` (world generator, `RealmGen`), `iso.js` (unit art, `RealmIso`), `buildings.js` and `buildings2.js` (building art, `RealmBuild` / `RealmBuildings`; the Temple art is `B.temple` in buildings2), `swampbld.js` (`SwampBuild`), `woodbld.js` (`WoodBuild`: settlements v91, province buildings v92).

### Publishing

- **Current version: v96** (v96 the user's v96 list: magic repeatables, administration, auto research, cracked stone walls, AI goals, no Total War, white-peace timer, province demands by warscore, alliances rework, bandit waves, resource-bar counters, hotkeys, control groups, rally points, outliner folding, Calm map, Master Builders, dismantling forts; see the v96 section) (previously: v95 unique provinces and bosses, artifacts, Warlock skulls, cooldown bars, peace rework; see the v95 section) (previously: v94 touch-ups: starting units spread out, wider Settings, nation name randomizer) (previously: v93 the Woodlings, phase 3: Champions, two-handing, Elemental magic, the lost travelers; see the v93 section) (previously: v92 the Woodlings, phase 2b: every province building in the Woodling style; see the v92 section) (previously: v91 the Woodlings, phase 2a: their figures, townsfolk, tree houses, outposts, forts and capital) (previously: v90 the Woodlings, phase 1 of 3: see SPEC_woodlings.md and the v90 section) (previously: v89 v89 Save / Continue / Export / Import, version shown on the main menu) (previously: v88 v88 a Multiplayer button on the main menu: Coming Soon) (previously: v87 v87 exploring takes time and routes avoid the fog, Start position option, settings and New Game screen tidy-up; see the v87 section at the end)
- (previously: v86 Swampling fixes, retrofit queue, spell animations) (v85 the Y list) (v84 the Swamplings) (v83)
- **The page is `index.html` (lowercase)**: GitHub Pages only serves that name. (v72 AI nations; v73 lighter bitmap cache; v74 error-proof game loop; v75 province window fix, war, Wayfinder and meeting changes; v76 left column and UI size; v77 the GPC01–GPC31 gameplay list; v78 the GC/IC/T list: graphics, interface and text; v79 the SMA small map additions; v80 Quick queue setting; v81 popup buttons and move marker; v82 the Z list; v83 Earthquake is a 2-minute cast). After each publish, update this line with the version number the publish result reports.
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

## v81: popup buttons and the move marker

- Every popup has an X in its top-right corner (`.pop-x`, it carries the same data attribute as the popup's dismiss action), and Show me / OK buttons: bandit and monster encounters (`#banditPop`, the monster version had no buttons before), set pieces (`#spPop`), discoveries (`#findPop`), travelers (`#travPop`), new nations (`#metPop`: Continue is now OK), the game over box. Decision popups keep their choices instead of an OK: enemy demands (`#demand`: X refuses; a total-victory demand can't be refused, so X hides it and it returns 20 s later), alliance offers (X declines), the school choice (X = decide later). Their Show me leaves the choice open. `lookAtProv` / `lookAtNation` (v78.js) move the camera; a nation is shown at its capital.
- Move orders: `orderGroup` is wrapped in v78.js; each order from the player drops a golden X (`moveMarks`, `drawMoveMarks`) at the clicked point, about one footman across (scales with `UKK`). It swells once in the first 0.3 s and is gone after 1 s (real time, so it also plays while paused).

## v82: the Z list

- **Z1** `stepFortGates` (gpc.js) walls capitals too (stage ≥ 1) once Wooden Walls is researched.
- **Z2** Masons have a Cancel construction button (cell 14, `cancelbuild`) that refunds what was paid. A building that can't be placed when it finishes (the province changed hands, or someone claimed the outpost first) is refunded instead of lost. Refunds still respect the storage limit.
- **Z3** A walking Mason can build: the build button stops him where he stands (`haltUnit`) and he builds there.
- **Z4** `cmdBg` leaves buildings that still need research gray.
- **Z5** `drawRetroBar`: a blue progress bar (with a hammer) above a retrofitting army's health bar.
- **Z6** `nextDesignName` (v78.js): saving over an in-use design counts up in Roman numerals (Footman → II → III …; old names like "Footman II II" become "Footman III").
- **Z7 / Z8 / Z9 / Z14** The minimap toggles are icon buttons: coin (`VIEW.res`, resource badges), hexagon (`VIEW.names`), your coat of arms (`VIEW.realm`, `syncArmsToggle`), striped square (`VIEW.miniColor`, fills nations' provinces with their colors on the minimap in `renderMiniLayer`).
- **Z10** `computeFog`: any province one of your armies stands in is added to `S.known` (stays explored).
- **Z11 / Z12** gpc.js Earthquake section rewritten (`SPELL2`, `startSpell2`, `c.quake.kind`). **Shockwave** (`shock`, every Mage, army cell 10 / Mage cell 11, also in the Ctrl+right-click menu): aim at a neighboring province of a nation at war with the caster; after 120 s the wall on that border is broken (`breakWall`). **Earthquake** (`quake`, tech `earthquake`, Magic Tier III any school, army cell 11 / Mage cell 14): cast in a province your nation occupies; after 120 s (v83; was 30 s) all its buildings (and upgrades / constructions there) and every wall on its borders are destroyed (`quakeStrike`; settlements stay). Enemy casts show the warning flag; the AI casts both (`aiQuake`).
- **Z13** `realmLabelsOf`: the nation-name toggle labels your nation and every nation you have met (over the biggest block of their land you have explored).
- **Z15** Terrascaping (tech `terrascape`, Herbomancy Tier III, needs Speak with the Forest): from the Ctrl+right-click menu on a neighbor across a plain open border, 5 minutes of casting; `terrascape(p, q)` adds trees to `G.sway` along the border with a gap in the middle, sets the edge style to `trees` and `S.paths[i] = 'forest'` (the border stays passable only through that forest path; Arboreal Restoration can close it).


## v84: the Swamplings (a second race)

Not play-tested: the user tests himself. The build was assembled, syntax-checked (`node --check` on every script) and scanned for undefined names (TypeScript, `allowJs`/`checkJs`, codes 2304/2552).

- **Race core** (swamp.js, top): `RACE` (owner → `'realm'` | `'swamp'`), `raceOf(o)`, `isSw(o)`, `techFor(x, race)` (a technology with `x.race` belongs to that race only). `applyRace(race)` runs in `startGame` before `setupGame`: it renames units, buildings, technologies, tree texts and Armory headings for the player's race (originals kept in `ORIG`), rebuilds `BUILD_ORDER` and `CMD[MASON]`, gives Swamplings Mushroom Farming. Humans are now called Realmlings.
- **Menu** (menu.js, game_shell.html): a Race row (`#mRace`) and a small race button beside each opponent slot (R / S / ?), saved as `realm-races`. `spawnAINations(slots, races)` sets `RACE[id]`, `N.race`, and maps family / armor line / school for Swamplings (`swFamily`, `swArmorLine`, `swSchool`).
- **Start**: Swamplings start in a swamp (`setupGame`, `pickAICapital(…, terrain)`), with three Axe Berserkers (`footmanOf(o)`).
- **Art**: iso.js has the Swampling rig (`RealmIso.swamp(o)`: green skin, hunch and back hump, pointed ears, underbite with tusks, glowing red eyes; `crouch` for Berserkers; `log` for the Swampwright; `allFours` + `POSE.running` for the Swampstrider; unit `'ogre'` is drawn 1.55× on foot), axe items, and units `sw-pioneer`, `sw-mason`, `sw-mage` (Warlock), `thug:A`. Every unit is drawn through `drawUnitFor(g, id, owner, moving, …)` → `swArtId`. swampbld.js (`SwampBuild`) draws mud-and-clay huts, every building and the settlements; `settleArt` / `bldArt` pick the art by the owner's race (cache keys carry the race).
- **Buildings**: Ogre Cave = `stable` (needs a mountain border, `mountainBorder`), Thug Den = `market`, Supply Cache = `bank` (+500 of each, `storeOf`), Warlock Tower / Spire / Grand Spire = `magetower`, Hot Springs = `temple` (swamp only). No Granary, Storehouse or roads. Rules in `raceBuildWhy` (player `buildCheck` and `aiBuildWhy` are wrapped).
- **Thugs** (`THUG = 'thug:A'`): trained at a selected Thug Den (`S.selKind = 'market'`), go straight in if there is room (`e.thugs` on the den's extra); `thugin` / `thugout` commands; `denCap(o)` = 2 + Thugging Benefits Program + Stock Options. Gold in `provinceIncome` (`thugGold`): 1 per Thug, ×2 with Highwaymen (`traderoutes`, which for Swamplings needs only the Thug Den: `x.reqSw`) when the den borders another nation, +5% per Thug Guilds (`rep-trade`). AI dens count as full.
- **Swamp bonuses**: `speedMod(u)` (+20% speed in a swamp, Path of Fire) is multiplied into `unitSpeed`; `sideStrength` gives Swamplings +20% damage in swamps and spares their Ogres the cavalry penalty; Swampstrider Stealth has no slowdown in swamps (`stealthFree`). Swamp Taxes (`swampTax`): +1 gold and +2 food per settlement level in swamps.
- **Armory** (equip.js): axes (`fam: 'axe'`, all one-handed, parry like swords), no shields, Staghide / Wyvern-Scaled / Dragonbone armor (10% weaker, 10% faster than their twins), `OGRES` in place of `HORSES` (`mountsFor(race)`; armor ×0.8 on Ogres), dual wielding (`d.off`, half its attack; tech `dualwield`; `offhandRow`). Designs carry `race`; lists, Barracks and retrofits only show your race's designs. Starting designs `d-sw-axe`, `d-sw-spear`, `d-sw-club`, `d-sw-ogre`.
- **Technology** (tech.js): Swampling-only `w-bearded`, `w-battleaxe`, `w-waraxe`, `a-stag*`, `a-wyvern*`, `a-dragon*`, `dualwield`, `thugs2`, `thugs3`, Pyromancy; Realmling-only roads, granary, storehouse, swords, shields, their armor, Herbomancy, `rep-shield`, `rep-harvest`. Renames in `SW_TEXT` (repeatables via `swName` / `swBlurb`). `reqMet(x, st, all, race)`.
- **Pyromancy** (school `pyro`, Swamplings only; magic.js `SCHOOLS.pyro`, `schoolOk`): Fiery Weapons (autocast `AUTO.fiery`, `a.fiery` = chance of double damage per round), Scouting Pyre (`CAST.spyre`, `S.spyres`, `pyreSight` in `computeFog`), Fire / Blazing / Molten Trap (`CAST.ftrap`, `S.ftraps`, springs on an army that enters after it was set, `burnArmy` kills 3 / 6 / 9 Footmen's worth), Path of Fire / Flame / Inferno (`CAST.pfire`, `u.pathFire`), Sacred Pyre (building `pyre`, levels Sacred / Grand, `PYRE`, `pyrePayday` after `payday`; one burns per living Warlock). Per-Warlock cooldowns are stored as `S.cd['spyre' + id]` / `S.cd['pfire' + id]`.
- **Fireball**: Shockwave is called Fireball for Swamplings (`SHOCK(o)` in gpc.js).
- **Travelers**: Swamplings can't recruit them; with an army there they capture them for 30 food each (`travelersChoose('capture')`).
- **Spiked Walls**: Stone Walls for Swamplings, drawn as sharpened stakes (`drawWallEdge`).
- **Known simplifications**: many toasts and the How to Play text still say Wayfinder / Mason / Mage in places; AI Swamplings don't train Thugs (dens count as full) or cast Pyromancy (Sacred Pyres count as income); the civilians' houses are the same for both races.

### v84 follow-ups (same version)

- **Ogres train at the Ogre Cave** itself (`trainable('stable')`, `S.selKind = 'stable'`), no Barracks needed; a Swampling Barracks trains Berserkers only. Ogres are retrofitted at an Ogre Cave (`barracksOk`). AI Swamplings still train Ogres only where a Barracks and an Ogre Cave share a province.
- **Axes**: no parry; each axe blow has a 10% chance to do double damage (`st.crit`, `critBlows` in `sideStrength`). Swords keep their 10% parry.
- **Sacred Pyre is raised by a Warlock** standing on his own (Warlock command cell 13, `pyrebuild`, through `beginExtra`); it is no longer on the Swampwright's build list. Moving cancels it and refunds the wood.
- **Debug buttons** (Settings, row "Debug", for testing only): `#dbgReveal` toggles `S.reveal` (the whole map visible); `#dbgRes` adds 2000 gold, wood and food and raises storage by 2000 each (`S.debugCap`, counted in `storageCap`) so it isn't clamped. Code at the end of swamp.js. Remove before release.
- **Debug: Research all** (`#dbgTech`): marks every non-repeatable technology of your race as researched in all three trees; Magic uses your school, or picks the first school open to your race. Test-only.
- **Art pass**: Ogres (`ogreBody` in iso.js, spec flags `ogreBody`, `noEars`, `blackEyes`, `bigHands` from `swampSpecFor`) are always on all fours, knuckle-walking on huge fists under a humped back, with a big long head (0.91 × 1.17) and black eyes, no shoulder plates or ears; armies pass `walking` to `drawUnitFor` so Ogres run. Crouching Berserkers hold both weapons out at 45° (outward, or forward from the side) so dual-wielded axes don't cover the face. Swampwright skin = Leviathan Ogre (#5a7a80), Swampstrider skin = Swampfeet Ogre (#93b55c).
- **Swampling towns** (content.js): houses in a Swampling province are little mud huts (`SW_HUTS`, drawn with `SwampBuild.hut`; 2 of every 3 thatched in the owner's color); townsfolk there are drawn in forest green, green, light green, teal or brown (`SW_CIV`, chosen by the owner's race at draw time), hunched, with pointed ears and no hats.

## v85: the Y list

Not play-tested by the user yet. Assembled, `node --check`ed, and driven in headless Chromium (menu screens, start, meet popup, flags, 15 minutes fast-forwarded with mixed races, no errors).

- **Y1 Start paused**: `startGame` (menu.js) calls `togglePause()` after setup; the welcome toast says to press Space.
- **Y2 Meet popup "Show me"**: `updateMet` records which Wayfinder met each nation (`metBy`); `showMetScout(o)` (war.js) selects that Wayfinder (or any of yours standing in or next to their land) and flies to him; falls back to `lookAtNation`.
- **Y3 Alliance ended flag**: `endAlliance` pushes `S.allyEnds` (not when you ended it yourself); flag `allyend:<id>` (`flag_alliance_ended.svg`, broken chain), shown 2 minutes (`ALLY_END_SHOW`); left-click flies to their land (or opens Diplomacy), right-click dismisses.
- **Y3 Truce flag**: no seconds and no counter badge any more ("Truce ending soon"), so it no longer redraws every second. Labeled flags get side margins so labels don't overlap (`.nf:has(em)`).
- **Y4 Outliner**: the Workers list headings, the Capital card and the settlement description use the race's unit names (Swampstriders / Swampwrights).
- **Y4b Swampling nation names**: `SW_AI_TITLES` (Clan, Tribe, Legion) and `SW_AI_PLACES` (Bloodtusk, Skullmire…) in ai.js: "Ironjaw Tribe" or "Legion of Skullmire".
- **Y5** `allyWhy`: Realmlings and Swamplings never ally (player and AI).
- **Y6 Menu**: two screens in the title card: `#mMain` (Music, Sound effects, New Game `#mNew`, How to play) and `#mSetup` (seed, nation, race, color, flag, practice, opponents, Start game, Back `#mBack`; Esc goes back). `menuScreen('main' | 'setup')`. The parade above both follows the chosen race; the race is saved again at game start (`racesSave`).
- **Y7 Pause audio**: pausing no longer suspends the audio context or mutes sound effects (`sfx` ignores `S.paused`); music plays at half volume while paused (`musicTarget()` in menu.js). The battle clash loop still stops while paused, since battles are frozen.
- Test hooks: `window.__v85` (`metScout`, `showMetScout`, `meetNation`, `endAlliance`, `nbr`).
- **GitHub Pages:** the page must be named `index.html` (lowercase). v83–v85 wrote `Index.html`, which GitHub treats as a different file, so the site kept serving the old v81 `index.html`. `assemble_game.py` now writes `index.html`.

## v86: Swampling fixes and general changes

Not play-tested by the user yet. Assembled, `node --check`ed, driven in headless Chromium (outliner, command tabs, two armies retrofitting in one Barracks queue, Ogre retrofit at an Ogre Cave, Total Victory pick, sneaking path into a peaceful nation, allied vision, Fiery Weapons in a real battle, screenshots of each spell effect, 30 minutes fast-forwarded per race, no errors).

- **Outliner** (features.js `armiesTabHTML`): Mage section, army rows and the limit tooltip use `UNIT_DEFS[MAGE].name` (Warlocks). magic.js "joined the army" toast too.
- **Command tabs / portraits**: `portrait('army')` draws `footmanOf(ME)` (Axe Berserker for Swamplings), so the Army tab and army rows no longer show a Realmling Footman.
- **Retrofit (gpc.js GPC14, rewritten)**: `RETRO_TIME = 2` s per soldier. The army marches to the nearest site (`retroSite`): Barracks for infantry, Barracks + Stable for Realmling cavalry, **Ogre Cave for Ogres** (`barracksOk(p, o, cav)`; `retroKey` → `'stable:p'` for Swampling cavalry). On arrival `beginRetro` pays and pushes a job `{ kind: design, retro: true, army, n, dur, paid, t0, prov, key }` into that building's **training queue** (`S.queues[key]`); `a.retro` points at the job. One job runs at a time per building; it blocks training there. `stepTraining` calls `finishRetro(q)` when the job ends; `trainTime(kind, q)` returns `q.dur` for jobs. `stepRetrofits` cancels (with refund) when the army moves, fights or leaves, and drops jobs whose army is gone. Cancelling from the queue (`cancelTrain`) clears `a.retro`. The army's bar shows ⏳ while waiting. Resting/healing still happens at a Barracks (`restSite` unchanged).
- **Fiery Weapons**: it always worked, but v78's battle-magic icon wrapper ran before swamp.js set `a.fiery`, so no icon showed. Now the Fiery icon joins `a.mfx`; each round whose blows land double sets `a.fieryHit` (in `sideStrength`) and `drawPyromancy` draws a flame burst with "🔥 ×2"; the battle-end toast counts the double blows (`a.fieryHits`).
- **Fire traps**: confirmed province-wide (any hostile army that enters any part of the province springs it, `stepPyromancy`). The trapped province's border now smoulders (dashed orange) while a trap is set; tech text says "any part of that province".
- **Stealth**: `nationOk` lets a sneaking Wayfinder / Swampstrider (`u.stealth`) enter any nation's land, war or not; `outpostClaimed` doesn't push a sneaking one out.
- **Allies share vision**: `computeFog` adds every province holding an ally's unit or settlement.
- **Total Victory** (war.js `totalPick`): the 5 provinces nearest the winner's capital by walking distance (`walkDistFrom`: Dijkstra over `openNbr`, edge = distance between province centers). Unreachable provinces are skipped; the loser's capital is never taken. Annexing (5 or fewer provinces) unchanged.
- **Spell animations** (gpc.js end): `spellFx(kind, caster, q, edge)` on the strike, drawn by `drawSpellFx` after battle effects: **Fireball** (Swampling Shockwave) arcs to the wall and bursts; **Shockwave** rolls blue rings to the wall, which cracks in a flash; **Earthquake** splits the province with cracks and dust while the ground shakes. While casting, a Warlock's Fireball swells over his head and an Earthquake caster raises occasional dust.
- Test hooks: `window.__v86` (`findPath`, `computeFog`, `spellFx`, `totalPick`, `walkDistFrom`, `retroSite`, `beginRetro`, `finishRetro`).

## v87: exploring, start position, menus

Not play-tested by the user yet. Driven in headless Chromium (route rules, an 8 s explore, an order given mid-explore, start position for both races × Center/Edge/Random on two seeds and on the practice island, menu and settings screenshots, 25–30 minutes fast-forwarded per race, no errors).

- **Routes avoid the fog** (game.js `canEnter(u, q, tgt)`): your Wayfinder / Swampstrider only steps into an unexplored province when it is the one you sent him to (`tgt`, passed by `findPathVia`) or his auto-explore target. Routes never cut across unexplored land; the war rule (any unit may enter an enemy's unexplored land) no longer applies to Wayfinders. Clicking an unexplored province that isn't next to known land: "Explore the land in between first."
- **Exploring takes time**: on stepping into unexplored land he heads for the province's middle (`clampInto(ic)`, around bends via `navRoute`), wherever you clicked, at a pace set so the walk takes `EXPLORE_TIME` = 8 s (`u.exploreSp`). On reaching the middle (`wp.explore`) the province is explored and he stops there. While exploring he takes no direct orders (`exploring(u)`; `order` refuses); a click on him puts the order in his queue for afterwards (a plain click replaces the queue, Shift adds to it).
- **Start position** (New Game screen, `menuOpts.start`, saved as `realm-start`): Center (as before: nearest the middle), Edge (the outermost inland province: never on the coast or a lake), Random (any inland home province with 2+ open borders). Always grassland for Realmlings and swamp for Swamplings; if an island had none, the chosen province is turned into it.
- **Settings**: the debug buttons are now one row of checkboxes (Reveal Map, +Resources, All Tech). +Resources clears itself after adding; All Tech stays ticked and grayed. A Map seed row shows the island's seed (select it to copy). Debug state resets with each new game (`setupGame`).
- **New Game screen**: no title or parade (`.menu-card.setup`), and the card is 50% wider (690 px) so the opponent slots are readable and the flags fit on one row.

## v88: Multiplayer placeholder

- Main menu: a **Multiplayer** button (`#mMulti`, purple, under New Game) opens `#mMultiScreen`: a "Coming Soon" screen with a Back button (`#mMultiBack`; Esc also goes back). `menuScreen('main' | 'setup' | 'multi')`. No multiplayer code yet.

## v89: saving

Not play-tested by the user yet. Tested in headless Chromium: save → reload → Continue gives the same units, buildings, nations, research, wars and stock; a ~25-minute game with walls and wars saved, loaded and saved again matches field by field (only the walking villagers' positions and a house-color counter differ); Export, Import mid-game (reloads the page), Import from the menu, a non-save file, a wrong save format, autosave; play continues after loading with no errors.

- **New file `save.js`** (assembled last, after swamp.js). `GAME_VERSION = 'v89'`: **bump it with every version** (it shows on the main menu and is written into saves). `SAVE_FORMAT = 1`: bump only when old saves can no longer load; a save with another format is refused with a message, a save from another version (same format) loads with a warning.
- **One slot** in localStorage (`realm-save`): Settings → Saved game → **Save**, plus an **autosave every 5 minutes of play** (`AUTOSAVE_EVERY`, game time, unpaused) into the same slot. **Continue** (green, main menu, shown only when a save exists, with nation, play time and date) loads it.
- **Export** (Settings) downloads the game as a `.realmsave` file (JSON); **Import** (Settings) or **Load a save file** (main menu) loads one. Importing during a game stores the file in sessionStorage and reloads the page, then loads it on boot, so it starts clean; a failed load reloads to the menu with the error message.
- **How it works**: the island is rebuilt from its seed exactly as a new game does (`regenerate`, `applyRace`, `setupGame`, `spawnAINations([])`, `setupContent`, `setupV78`), then the saved state replaces it: all of `S`, `NATIONS`, `PLAYERS`, `RACE`, `NATION`, `yields`, `usedNames`, the counters (armies, bandits, monsters, raids, designs, alliance flags), every soldier design ever registered (`ALL_DESIGNS`, recorded by a `registerDesign` wrapper, so old AI designs still work), each border's open/style (walls, gates, opened paths), `G.crossings`, province terrain and the camera. `openNbr` is rebuilt from the borders; caches and panel keys are reset.
- `packGraph` / `unpackGraph`: JSON for the object graph, keeping Maps, Sets, shared objects and loops (e.g. an army and its retrofit job in a Barracks queue stay the same object). References to the map's own objects (`world`, `G` and their arrays) are stored by name. Anything that isn't plain data (pictures, canvases) is dropped and rebuilt.
- **Adding new game state later**: anything kept in `S` (or inside NATIONS/PLAYERS) is saved automatically. New module-level variables that matter to the game (like `armyCounter`) must be added to `makeSave` / `loadSave` by hand.
- Main menu foot shows the version (`#mVer`).
- Test hooks: `window.__save` (`makeSave`, `saveGame`, `loadSave`, `packGraph`, `unpackGraph`, `readSlot`, `ALL_DESIGNS`).

## v90: the Woodlings, phase 1 of 3 (playable race)

The user's full spec and the agreed plan are in **SPEC_woodlings.md**. Phase 2 = art, phase 3 = Champions, two-handing, Elemental magic, lost-travelers event.
Tested in headless Chromium: a Woodling game (forest capital, Scouts / Architects, Woodling AI names), All Tech for each race (Woodlings get Gladius/Rapier/Estoc and their armor, no roads, no axes; Realmlings and Swamplings unchanged), Armory, Scouts' paths through tree borders, forest speed, Community, 29 minutes fast-forwarded against Woodling, Swampling and Realmling AIs, and a Woodling save and load. No errors.

- **New file `wood.js`** (assembled after swamp.js, before save.js). `RACE[o] === 'wood'`, `isWd(o)`. Woodlings are built on the Realmlings: `applyRace('wood')` runs the Swamplings' `applyRace('realm')` first, then lays Woodling names over everything (`WD_WORDS` swaps Mage→Druid, Wayfinder→Scout, Mason→Architect, Marketplace→Bazaar, Mage Tower→Grove (Majestic, Magnificent), Temple→Shrine, Trade Routes→Community in every building, technology and tree text; `WD_TEXT` sets the rest). Originals are kept in `WD_ORIG` and restored for every race change.
- **Race tags can now be lists**: `raceIs(r, race)` (equip.js) is used by `techFor`, `famsFor`, `armorsFor`, `schoolOk`. Granaries, Storehouses and Herbomancy are `['realm', 'wood']`; Necromancy, the Stable, horse techs, The Horde and the cavalry repeatables are `['realm', 'swamp']` (until the Champions arrive). The Swamplings' axe techs are now tagged `'swamp'` (they were untagged, so every race could research them).
- **Equipment**: `FAMILY.thrust` (Dirk, Gladius, Rapier, Estoc: the sword stats tier for tier, Estoc one-handed; parry like swords; `rep-sword` boosts them); armor `spirit` / `mithril` / `ornate` (twins of leather / chain / plate, same numbers); techs `w-gladius`, `w-rapier`, `w-estoc`, `a-spirit2-4`, `a-mithril1-4`, `a-ornate1-4`. `noShields(race)`. Starting designs `d-wd-sword` (Sword Protector), `d-wd-spear`, `d-wd-club`; `footmanOf` gives `d-wd-sword`. The Armory shows no cavalry group or shield row for Woodlings. Weapon drawings for the four blades are in iso.js (and their icon spans in techicons.js).
- **Rules**: forest start (`setupGame` home terrain); in forest +10% speed (`speedMod`) and +20% armor (`applyDamage`, converted through armor → damage reduction); Scouts path through closed tree borders (`pathNbr` wrapper, `treeNbr`); no roads (Architect's command card has no road button); no Hall of Champions yet (`raceBuildWhy`); **Community** (`tradeGold`): each Bazaar +1 gold per payout per other building in its province, +5% per Quality Goods; it needs only the Bazaar (`reqOf` uses `reqSw` for Woodlings too).
- **AI**: slots cycle Realmlings / Swamplings / Woodlings / Random (`RACE_CYCLE`); Random picks among the three; Woodling capitals in forest; family sword → thrust, armor lines → Woodling ones, Necromancy/Pyromancy → Herbomancy or Arcane; `aiRedesign` wrapper (no shields; a placeholder cavalry design that is never trained). Names from `WD_AI_NAMES` ("Moonwatchers", "Hunters of the Dark"…).
- **Art for now**: Realmling figures and buildings; Woodling soldier designs get an olive-purple skin and their armor colors (Spiritweave light gray, Mithril light teal, Ornate light purple). Everything else is phase 2.
- `GAME_VERSION = 'v90'`. Test hooks: `window.__wood`.

## v91: the Woodlings, phase 2a (art: people and settlements)

The user asked for "Woodlings phase 2a"; this session read that as phase 2 (art) split in two: **2a** = the Woodling people and the settlement centerpieces (this version); **2b** = every province building model (Farm with apple trees, Lumber Mill, Gold Mine, Barracks, Bazaar, Granary, hollow-fallen-tree Storehouse, Bank, Forge, Grove / Majestic / Magnificent Grove, the veiled praying Shrine) plus the Hall of Champions model if wanted ahead of phase 3.
Not play-tested by the user yet. Tested in headless Chromium: a Woodling game (menu parade, Armory, outliner portraits), 15 and 20 minutes fast-forwarded with Woodling, Realmling and Swampling AIs (Woodling towns, armies, tree houses and townsfolk on screen), a casting Druid, a save → load round trip, and Realmling and Swampling games for regressions. No errors.

- **Figures** (iso.js, `RealmIso.wood(o)`, spec flag `wood`): `humanoid` draws Woodlings slender and tall (`WD_SX = 0.86`, `WD_SY = 1.24`); the head is drawn unstretched and a little smaller by `woodHead` (long face with a pointed chin, `woodHeadPath`; almond eyes with purple irises and a faint violet glow, `woodFace`; long hair behind and a parted fringe, `woodHairMass`; long ears swept up and back, `woodEar`, drawn over hoods and helms). Woodling headgear in `woodHelm`: `hood` (pointed, long drape, trimmed), `elfhelm` (open-faced, cheek guards, leaf crest; `helmColor`, `helmTrim`, `plume`), `circlet` (band and gem) and `antlers` (a circlet with antlers, for Druids). Plate armor takes `plate` / `plateTrim` colors; Woodling tabards carry a leaf instead of the crown. New held items: `longbow`, `scroll`. A casting Woodling holds the staff out wider (`hands` in `humanoid`) so the arms don't cover the face. Skin palette `RealmIso.WD_SKINS` (olive → purple).
- **Units**: `wd-pioneer` (Scout: green hood and cloak, longbow), `wd-mason` (Architect: auburn hair, gold circlet, teal tabard, hammer and rolled plans), `wd-mage` (Druid: green robe, silver hair, antler circlet, staff). wood.js wraps `swArtId` (`WD_ART`), `mageArtSpec`, `registerMage` and `castUnitId` (`wdCastId`), exactly as the Swamplings do.
- **Soldiers**: `woodSpecFor(d)` in wood.js (wraps `specFor`; the old v90 tint line in equip.js is gone). Spiritweave: light gray, olive skin and dark hair, a tabard from II, circlet and gray cloak from III. Mithril: light teal mail, a leaf-crested pale teal helm, mauve skin. Ornate: light purple plate with pale gold trim, pauldrons from II, a purple cloak from III, silver hair and purple skin. Built-in Woodling designs are re-registered when wood.js loads. Portraits draw Woodlings at 0.44 (they are taller).
- **Armor icons** (techicons.js `armorIcon`): Spiritweave light gray, Mithril light teal, Ornate light purple, with a violet gem from III.
- **Settlements** (new file **woodbld.js**, `WoodBuild`, its own `<script>` after swampbld.js; `settleArt` is wrapped in wood.js). Stave churches after Borgund: staved walls (`walls`), scalloped shingle roofs in tiers (`roof`, a frustum; `staveChurch(g, cx, cy, tiers, spire, opts)`), dragon heads on the eaves (`dragon`), an arcaded gallery round the base (`gallery`), little gables with glowing windows (`gableOn`), carved pointed doorways (`doorway`); draw on a wall face with `onFace(g, 'L' | 'R', …)`. Outpost: a small two-tier church thick with moss (`mossRoof`, `mossLine`), a lantern, a standing stone, ferns and a fairy ring. Fort: a three-tier church with branches and leafy clumps bursting from its tiers, a canopy behind, a hedge, standing stones, banners and a stone path. Capital: a tall gnarled Great Oak trunk (`oakTrunk`) with a doorway and lit windows, great roots over the ground, and the stave church rising out of its top tier on tier, branches spreading from the trunk and between the tiers into a vast canopy that the spire pokes through, fireflies, lanterns, banners and standing stones. Leaves are `clump` / `blobs`. Drawing costs about the same as the Realmling settlements.
- **Towns** (content.js): Woodling homes are hollow trees with a door (`WoodBuild.treeHouse`, six looks incl. autumn gold and lilac crowns; 2 of every 3 doors in the owner's color), cached under `wd…` keys in `houseRoofed`. Woodling townsfolk (`drawWdCiv`) are tall and slender, with long hair, long upward ears, a pointed chin and a purple eye glint, in Woodling skin tones and tunic colors (`WD_CIV_TUNIC`, `WD_CIV_HAIR`).
- **Menu parade** shows the Scout, Architect and Druid for Woodlings.
- **Art preview pages**: `tools/wood_units.html` and `tools/wood_settlements.html` (serve the project folder and open them from `/tools/`) draw the figures in six directions and the three settlements side by side with the Realmling ones.
- `GAME_VERSION = 'v91'`. Test hooks: `window.__wood.woodSpecFor`, `window.__wood.swArtId`.

## v92: the Woodlings, phase 2b (art: province buildings)

The user asked for "Realmlings phase 2b": the second half of the Woodling art (see v91 and SPEC_woodlings.md). Phase 3 (Champions, two-handing, Elemental magic, the lost travelers) is next.
Not play-tested by the user yet. Tested in headless Chromium: every building drawn on the preview page and in a Woodling capital (zoomed in, live-animated, and zoomed out through the `drawArt` cache), 20 minutes fast-forwarded with Woodling AIs (their farms, mills, mines, barracks and granaries drawn in the Woodling style), and Realmling and Swampling games for regressions. No errors.

- **Hook**: wood.js wraps `bldArt` (as it does `settleArt`): for a Woodling owner, any type `WoodBuild.has(type)` is drawn by `WoodBuild.drawOnMap(g, type, idx, t, rise)`; anything else falls back to the old art. Cache keys already carry the race (`woodex|…`). The build menu icons use the same path.
- **woodbld.js**, new section "province buildings": one model per type in `WD` (the Realmling `variant` is ignored; Forge and Grove use the level). Pieces: `staveHall(g, x, y, w, d, h, rh, o)` (tarred stave box, steep shingled gable roof, dragon heads on the ridge ends; `o.door`, `o.wins`, `o.moss`, `o.roof`, `o.tex`, `o.gableWin`, `o.noDragons`), `onL` / `onR` (draw on the plane of a box face), `appleTree`, `wattle`, `stream`, `waterWheel`, `logs`, `planks`, `basket`, `sack`, `stook`, `boulder`, `furnace`, `chimney`, `bladeRack`, `ornateStand`, `spearRack`, `target`, `brazier`, `antlers`, `veiledFigure`, `candle`, `lantern`, `ivy`.
  - **Farm**: an apple orchard (five apple trees, a ladder, baskets of apples) round a little mossy stave cottage, wattle fences.
  - **Lumber Mill**: a stave mill on a stream with a turning water wheel, a log stack, a sawhorse with a log and saw, planks.
  - **Gold Mine**: a mossy hill (a little tree and its roots on top) with a carved pointed stone archway lit from within, teal runes, ivy, rails, a cart of gold, a lantern.
  - **Barracks**: a long stave hall with dragon heads, a spear rack, an archery butt, leaf banners. No shields anywhere (Woodlings bear none).
  - **Stable = Hall of Champions** (drawn now, ready for phase 3; Woodlings still can't build it): a long turf-roofed longhouse with antlers on the gable ends and an antlered skull over the door, braziers, purple banners and a greatsword standing in a stone.
  - **Bazaar**: three stalls with lilac, leaf-green and gold scalloped awnings (potions, apples, cloth), a string of lanterns, a rug and baskets under a tree.
  - **Granary**: a stabbur: a stave storehouse on stone stilts with a jutting upper floor and dragon-headed roof, a ladder, sheaves and sacks.
  - **Storehouse**: a hollow giant fallen tree with a round door cut in its ringed end, a glowing side window, moss, mushrooms, branch stubs, planks and logs.
  - **Bank**: a treasury in a great tree stump: a round gilded door ringed with glowing runes, a little stave cupola with a gold roof on top, a chest and coins.
  - **Forge / Battle Forge / War Forge**: a fieldstone smithy under a shingled stave roof with a glowing pointed furnace, chimneys (1 → 2 → 3), a rack of slim Woodling blades; then a vine-wrapped work shed with the anvil; then a quenching pool, Ornate armor on stands and a standing stone.
  - **Grove / Majestic Grove / Magnificent Grove**: a great tree whose trunk, canopy and ring of rune stones grow at each level (3 → 5 → 7 stones), runes glowing on the trunk, drifting motes; blossoms from Majestic; lanterns in the boughs and a moonlit pool for Magnificent.
  - **Shrine** (Temple): a marble statue of a veiled woman, head bowed and hands pressed together in prayer, on a round two-step plinth under an arch of two living trees, with candles, flowers and an offering bowl.
- **Art preview page**: `tools/wood_buildings.html` (serve the project folder, open from `/tools/`): every Woodling building, both upgrades included; `draw(t, k, true)` draws the Realmling ones for comparison.
- `GAME_VERSION = 'v92'`.

## v93: the Woodlings, phase 3 (Champions, two-handing, Elemental magic, the lost travelers)

The user asked for "Woodlings Phase 3". Not play-tested by the user yet. Tested in headless Chromium: the Champion editor in the Armory, training Champions at a Barracks + Hall of Champions, a battle of two-handed Champions with Rock Armor against 30 raiders (shield soaked, blows land every other round), every Elemental spell (aimed and from the command card), the Grand Elemental fading after 2 minutes, the travelers popup, a computer Woodling with Champions and Rock Armor, 30 minutes fast-forwarded with Woodling AIs, a save/load round trip, and 10-minute regressions for all three races. No errors.

- **Champions** (equip.js): a Woodling `type: 'cav'` design is a Champion (`isChampDesign`, `champStats`). Base `CHAMP` (70 health, speed 0.72, +4 armor, 300 gold, 4 food upkeep); Ornate armor only (Ornate I needs no research, `lockWhy`); no mount, no shield. Weapons `CHAMP_WEAPONS` (in `WEAPONS` with `champ: true`, each with `hp` and `spd`): Champion Sword (start, thrust, 18), Ancient Hammer (blunt 27, +15 hp, slower) and Wrathful Spear (pole 27, faster) with Champion Weaponsmithing (`horse-breeding`), Worldbreaker Axe (axe 42, +10 hp) and Oblivion Blade (thrust 60, +25 hp, slowest, dearest) with Champion Ornate Weaponsmithing (`horse-training`). Attack is 3x a one-handed blade of the same tier. Stats carry `champ: true` and `rough: true` (no cavalry terrain modifiers); `sideMix` leaves them out of `cavFrac`, so spears get no bonus against them. Champion Toughness / Swiftness are `rep-cavhp` / `rep-horsespeed` (now tagged for Woodlings). Starting design `d-wd-champ`. The Armory has a Champion group and editor (`renderChampEditor`).
- **Hall of Champions** = `stable` for Woodlings (tech `stable` now tagged realm/swamp/wood): back on the Architect's list; a Barracks in the same province trains Champions (the Realmling rule); clicking the Hall selects that Barracks. Retrofits go there too. Texts are race-aware (game.js, features.js).
- **Two-handing** (`d.two`, Armory "Grip" row `gripRow`): every other battle round the soldier deals nothing, the next `TWO_BURST` = 2.5x (125% over time). Read the spec's "every other turn 0 damage, then 125% damage" as 125% overall, since the literal reading (62.5% overall) would make it a pure penalty; change `TWO_BURST` to 1.25 for the literal reading. Champions may always; Protectors need **Two-Handed Grip** (`twohand`, Military Tier I, in place of Round Shields). Battle hook: `twoMul(a)` in game.js `sideStrength`; the first round of every battle is the wind-up; heavy blows flash "⚔ ×2.5".
- **Elemental school** (`SCHOOLS.elemental`, Woodlings only; techs in tech.js MAG_TECHS; lines `rock`, `wrocks`, `tportal`, `fspirit`, `gelem`):
  - Rock Armor (T1, autocast `AUTO.rock`): at battle start a stone shield worth 10% of the army's health (`raiseRock`, `a.rock`) soaks damage after armor/parry (`applyDamage` wrapper); 3-minute cooldown per army; stone plates circle the army and a gray bar sits under its health bar. Computer Druids with it use it too.
  - Whispering Rocks (T1): 20 s cast on a mountain border of the Druid's province; both provinces stay visible (`S.wrocks`, through the `pyreSight` wrapper). Up to 3 per living Druid (counted nation-wide).
  - Town Portal (T2): 5 s cast; the Druid (and his army) appear at the capital; 5-minute cooldown per caster (`S.cd['tportal' + id]`).
  - Forest Spirit (T2): 20 s cast on a tree border; both provinces make +25% of every positive resource (`provinceIncome` wrapper, `S.fspirits`). One per living Druid; extras fade, newest first.
  - Grand Elemental (T3): 10 s cast; troop kind `wd-elem` (Oblivion Blade attack, twice a full Champion's health = 190, no armor) joins the caster's army or forms one; `S.gelems` expiry list (2 minutes); 5-minute cooldown per caster. Art: `MON_ART['wd-elem']` (water giant).
  - Targeted spells: command card (one eligible border casts straight away; otherwise aim and click the neighbor, `elemAim` + `pathAimClick` wrapper) or the Ctrl+right-click menu rows. Army spell buttons use cells 4-7 and 9 (`spellButtons` wrapper).
- **Lost travelers** (Woodlings): `showTravPop` / `travelersChoose` wrappers: give directions for +30 research: a Scout there → Government, an army → Military, a Druid → Magic; or leave them.
- **Art** (iso.js): unit type `'champion'` (on foot, drawn 1.42x so ~1.15x a Protector after the cavalry 0.8 the callers apply); `twoHand` pose (left hand on the haft); `antlerHelm` (closed great helm, eye slit with glowing purple eyes, great antlers); items `champsword`, `ancienthammer`, `wrathspear`, `worldaxe`, `oblivion`. Preview page `tools/wood_champions.html`. Icons: `WD_ICONS` (`techIcon` wrapper), grip icons (`equipIcon('grip', …)`).
- **AI**: Woodling `aiRedesign` makes a real Champion design (best Champion weapon and Ornate armor known); Halls get built (Moderate) and Champions trained like cavalry. Woodling AIs may pick Elemental (`swSchool`). Simplification: computer Druids only use Rock Armor.
- Fix: `REP_FAM.axe` (the Swamplings' Axe Mastery never boosted axes).
- `GAME_VERSION = 'v93'`. Test hooks in `window.__wood` (finishRocks, finishSpirit, finishPortal, finishElemental, aimClick, raiseRock, twoMul, champStats, aiRedesign, showTravPop, travelersChoose).

## v94: touch-ups

- **Starting units spread out** (game.js `setupGame`): the Wayfinder and Mason start in slots 3 and 4 (`SLOTS`, far left and far right of the capital), the army in slot 0, so each is easy to pick out and click.
- **Settings window** 20% wider (game_shell.html `.settings`: 420 → 504 px).
- **Nation name randomizer** (New Game screen, 🎲 `#mNatDice` beside `#mNation`; features.js `randomNationName(race)`, `NAME_PARTS`): names in the style of the chosen race ("County of Thornwall", "Bloodtusk Clan" / "Legion of Skullmire", "Moonwatchers" / "Wardens of the Deepwood" / "Ancient Sentinels"), always 24 letters or fewer.
- `GAME_VERSION = 'v94'`.

## v95: unique provinces, bosses and artifacts; Warlock skulls; cooldown bars; peace rework

The user's list (Death Mountain, Desert Oasis, Heart of the Forest; Warlock skulls; reverse progress bars on cooldowns; peace offers). Not play-tested by the user yet. Tested in headless Chromium: the three provinces on several seeds (screenshots), boss fights at 0.9 / 1.0 / 1.1 / 1.2 / 1.5x power with Footmen and Riders (20 trials each), a real boss kill → artifact → save → reload → Continue, every artifact's effect, flying over a mountain border, the cooldown bar, the Country Breakdown, the Warlock skull editor and art, peace rules (white peace locks, surrender, war lockout), 25 minutes fast-forwarded per race with AIs, Woodling Scout pathing (palms block, trees don't), practice mode. No errors.

- **New file `v95.js`** (assembled after wood.js, before save.js). Test hooks: `window.__v95`.
- **Generator** (gen.js `placeUniques`, called by the exported `generateWorld`; practice islands have none): `world.unique = { death, deathGuard, oasis, oasisGuard, heart, heartGuard }` (province indexes, -1 if not placed). Death Mountain: inland, not desert, all borders closed `mountains`, the rest of the island must stay connected. Oasis: an inland desert whose borders become `palms` (new border style) except one entrance; non-desert neighbors are turned into desert (with open borders, the desert rule). Heart: the same with forest and `trees`. Junctions on their corners follow. The guard provinces and their neighbors are kept free of other uniques.
- **Palm trees**: sprites `palm0` / `palm1` (+ `_L`) and the `palms` border/junction style in the assemble_game.py border-band patch (they sway). `treeBorder` and the Woodling `treeNbr` only count `trees`, so Scouts can't pass palms and palms don't allow Lumber Mills.
- **Rules**: `provName` gives the three their names; `rollYields` wrapper (Oasis 10/10/10, Heart 6 gold/20 wood/6 food, every Death Mountain neighbor +5 gold); `towerSight` wrapper shows Death Mountain once any neighbor is visible; `canEnter` adds `bossBlock` (nobody enters Death Mountain; AI nations never path *through* a boss's province, only to it); `pathWhy` refuses tunnels/paths into Death Mountain; capitals (player `setupGame`, AI `pickAICapital`), ruins, lairs, travelers and set pieces avoid `uqSkip()` (uniques, guard provinces and their neighbors).
- **Bosses** (`BOSSES`, `BOSS_SITES`, `spawnBosses` from `setupV78`): one per site, chosen by seed. They are monster armies (`MONSTERS['boss-<id>']`, troop `b-<id>`, `a.boss`, `a.guards`) so Wayfinder reports (`showBanditPop` wrapper), patrols, lair glow and the province tag (`banditTag`) all work. Power: Red/Blue/Gold Dragon 30k/40k/50k, Skeleton King 25k, Walking Inferno 30k, Scarab Army 35k, General Sherman 20k, Ursa Major 25k, Winged Serpent 30k (`atk 30`, `hp = power × 3 / 30`, so `powerOf` shows the number).
  - **Boss fights** (`applyDamage` wrapper): Lanchester by power: each round (`BOSS_K` = 0.045) both sides lose raw strength in proportion to the other's remaining raw strength. Per battle the boss rolls a fortune `b.fortune` (~N(1, 0.1), clamped 0.75–1.25) that scales its damage by f². Result: 1.0x ≈ 55–60% wins, 1.1x ≈ 75–85%, 1.2x ≈ 80–98%, 1.5x ≈ always; fights last 15–40 s.
  - `stepBossHalt`: a moving army that enters a boss's province is stopped there (so it fights). AI armies still clear them through `aiBanditGoal` when twice as strong.
  - Death Mountain art (`drawDeathMountain`): the massif's foot follows the province's own lower borders (its inner polygon from the leftmost corner round the bottom to the rightmost), so it sits inside its ring of border mountains; only the ridge rises above. No name label on purpose (the user wants it to stay mysterious). A river that ran along one of its sides is cut there in `placeUniques` (the river is split into pieces; it seems to flow out from under the mountain), so every side shows border mountains. Nothing opens it: `pathWhy` refuses Underworld Passage / forest paths into it, and `openEdge` refuses any edge of it as a backstop.
  - Art: `MON_ART['b-*']` (dragons from `dragonArt(colors)`, the rest one each), drawn 1.6x bigger (`drawMonster` wrapper).
- **Artifacts** (`ARTIFACTS`, `S.artifacts[owner]`, `S.artVer`, `grantArtifact` from the `banditSlain` wrapper; popup through `queueFind` with `head: 'Artifact!'`; listed in the Country Breakdown, `renderCountry` wrapper, icons `artIcon`). Effects: Red Skull `speedMod` ×1.25; Blue Skull hp ×1.15, Essence of Flame atk +10, Grips of the Beast blunt atk +15 (`artStats`, called from `statsOf` in equip.js for every owner); Gold Skull +50 gold per payout and +2000 gold storage (`computeIncome`, `storageCap`, `aiIncome` wrappers); King's Crown upkeep ×0.8 (`upkeep` wrapper, player); Lidless Eye: every army's province is visible (`towerSight` wrapper); Enchanted Stump +50 wood per payout; **Winged Slippers**: army command `fly` (first free of cells 9/7/6/5/4), aim like Shockwave (`flyAim` + `pathAimClick` wrapper), any neighbor the army may enter except Death Mountain; the army flies over 1.6 s (`a.flyT`, `stepFlights`, wings drawn by the `drawArmy` wrapper); national cooldown `S.cd.fly` = 60 s.
- **Warlock skulls** (Swamplings): techs `skull-cracked` (Magic I), `skull-chipped` (II), `skull-polished` (III), `skull-flawless` (III), any school, race `swamp`. `S.mageGear.skull` (`skull1`–`skull4`, +1/+2/+3/+4 attack, wand only). `mageStats` wrapper (Swamplings never get shield armor now), `mageHands` in swamp.js puts the skull in the left hand, the Armory's Shield row becomes an "Off-hand skull" row (`renderMageEditor` wrapper, capture click handler on `armEl`), `editDesign` / `saveDraft` wrappers keep the skull. Art: iso.js items `skull1`–`skull4` (cracks / a chipped crown / polished glint / green-eyed glow with a gem); icons `skullItemIcon`.
- **Cooldown bars** (`paintCooldowns`, run after `renderCmd` every frame): any command-card button whose action is cooling down gets an orange bar (`.cmd-cd`) that drains, and a dimmed icon (`.cooling`). Sources: `S.cd[k]` and `S.cd[k + casterId]` for `spell:k`, the caster's `<k>Cd` for `mauto:k`, `S.cd.fly`, or `S.cd[id]`. The full length is learned when a cooldown is first seen (`cdSpan`, `trackCooldowns` scans every frame).
- **Peace** (war.js): `maxTake(o)` = 2 × the winner's forts (`fortsHeld`, stage 1 only), at least 1; used by Take provinces, surrender, AI demands and AI-vs-AI peace (Total Victory too: `totalPick` takes `maxTake(winner)` provinces nearest the winner, and `totalTerms` annexes when the loser has no more than that). White peace: not in the first `WAR.whiteAfter` = 180 s, and not for a side with negative warscore. A losing side gets **Surrender** instead (`peaceCheck('surrender')`, `makePeace(w, foe, { kind: 'surrender' })`): the enemy takes `maxTake(enemy)` provinces (`connectedPick`), and the loser can't declare any war for `WAR.surrenderLock` = 600 s (`S.warLock`, `warLockLeft`, checked in `declareWhy`). The automatic stalled-war white peace is unchanged. AIs never surrender to the player (only the player has the button).
- `GAME_VERSION = 'v95'`.


## v96: the user's v96 list

Not play-tested by the user yet. Tested in headless Chromium: every item below driven directly (Armory texts for all three races, the repeatables and cast times, admin limits, Auto research, cracked walls (drawn), dismantling a fort with Delete twice, war flags and the 5-minute white peace, the province picker at +100, alliance rules and the border-fort timer, bandit waves, control groups, F2 hotkey, rally points for the capital (Mason walked there), Master Builders (Mason built Farms on his own), outliner folding, Calm map, Woodling leaf colors, save → reload → Continue keeping the new state), 80-minute AI simulations with Easy/Moderate/Difficult of mixed races, and 40-minute regressions for each player race. No errors.

- **New file `v96.js`** (after v95.js, before save.js). `setupV96(loaded)` runs from `startGame` (menu.js) and `loadSave` (save.js); `stepV96(t, dt)` from `update` (game.js, after v95). New state lives in `S` (saved automatically): `S.autoTech`, `S.wallCrack`, `S.warEver`, `S.rally`, `S.ctrlGroups`, `S.provKeys`, `S.banditNext/banditWaves/banditWave`. `GAME_VERSION = 'v96'`. Test hooks: `window.__v96`.
- **Watch out:** when appending a `// comment` to a line in a patch, make sure the rest of the line isn't swallowed (that bug cost the AI its forts once in this session).
- **Armory naming**: the mage editor (equip.js `renderMageEditor`, `editDesign`, the save toast) uses `UNIT_DEFS[MAGE].name` and the race's tower name: Druids / Grove, Warlocks / Warlock Tower.
- **Druids carry staves only**: no Wands row or Shield row for Woodlings; `crypticwand`, `enigmaticwand` and `rep-wand` are tagged `['realm', 'swamp']`; `druidStaves()` fixes old saves.
- **Magic repeatables** (tech.js `REP_TECHS`): `rep-shockcast` (Swift Shockwave / Swift Fireball, −5% cast time, compounding, any school) and `rep-quakecast` (Swift Earthquake, needs Earthquake), both per nation through `spellTime(k, o)` / `c.quake.T` (gpc.js; `repOf(o, id)` works for the player and AIs). School repeatables at +10% each (compounding): Elemental `rep-gelem` (Deep Waters: Grand Elemental attack and health, via an `artStats` wrapper), `rep-rock` (Bedrock: Rock Armor shield, in `raiseRock`); Herbomancy `rep-skin` (Living Bark); Necromancy `rep-curse` (Lingering Curses); Arcane `rep-stasis` (Frozen Moments, trap duration); Pyromancy `rep-fiery` (Searing Flames, double-blow chance) and `rep-ftrap` (Hotter Coals, `T.mult` on the trap). Skin, curse and fiery boosts are applied in an `onBattleJoin` wrapper (player only, as the AI doesn't cast them).
- **Administration**: `effadmin` (Efficient Administration, Government Tier III, +2 provinces per fort) and `rep-admin` (Expand Administration, +1 per level). `perFort(o)`, `fortsHeldBy(o)`, `provLimit(o)` in govtech.js; `outpostLimit` and `aiOutpostLimit` use them. **Fort Charters III no longer removes the outpost limit** (it only raises the fort limit to 7), otherwise these techs would do nothing after it.
- **Automated research**: an Auto button in each tree's header (`renderTech` wrapper, `S.autoTech`); `autoResearch()` picks the cheapest offered technology when the tree is idle (never a school, Abandon, or anything needing gold). Runs at every payout and once a second.
- **Stone walls take two spell hits**: `spellHitWall(i, by)` (used by Shockwave/Fireball and Earthquake in gpc.js) cracks a stone wall first (`S.wallCrack[i]`), the second hit breaks it. Whether a wall is stone now depends on its builder's research (`wallOwner`, `wallStone`), and `drawWallEdge(g, a, b, f, t, i)` draws each wall by its builder (stone / palisade / Swampling stakes) plus `drawWallCracks`. Raising a wall clears its crack.
- **Dismantle fort**: settlement card cell 3 (`dismantle`, on Delete twice like Destroy): the fort goes back to an outpost, every building in the province is destroyed, its training queues are refunded.
- **AI** (ai.js): `AI_POWER_GOAL` (Easy 4000 from 10 provinces; Moderate 6000 in its new `army` phase at 20 provinces, or after 3 minutes with no land left, then `fill` lifts the province cap; Difficult past 20 provinces builds as much as food allows). `aiFoodCapped(N)` stops training when food income would go negative. Walls: Difficult weights `walls`/`walls2` at 60/50 always, Moderate from 20 provinces. War: `AI_WAR_MARGIN = 1000` more power (as shown) than the target and its allies, on top of the 2-to-1 rule. AIs never upgrade an outpost on an ally's border to a fort.
- **Wars**: no Total Victory (stepOneWar no longer ends a war at 100; the "Total victory" row is gone from Diplomacy). A broken nation's warscore goes to 100 once (`w.broken`). Flags (v96.js `flagList` wrapper, banner SVGs built by `bannerSVG`): `peace100:<war>` "Call for peace" at ±100, and `wpt:<war>` "White peace" with a live countdown in the last 30 s (`WAR_TIMER = 300`, `stepWarTimers`: every war ends in white peace 5 minutes after it began). Both open Diplomacy. Countdown badges are updated in place (`flagCountdowns`) so the flags aren't rebuilt every second.
- **Province demands by warscore** (war.js `demandMax(s)`): 1 province at +50, +1 per 5 more (10 at +95); at +100 up to `max(11, maxTake(winner))` (the winner's cap: 2 per fort it holds); the capital only when that takes every province (annexation, `killNation`). Used by the player's Take provinces (with All / None buttons and a counter), AI demands to the player and AI-vs-AI peace. Surrender still uses `maxTake`.
- **Alliances** (war.js): `alliesOf(o)` (up to `MAX_ALLIES = 2`; `allyOf` returns the first). `allyWhy(a, b)`: same race; neither has a fort (stage 1) on the shared border (`borderFort`); never at war with each other this game (`S.warEver`, recorded in `newWar`); neither has been at war with an ally of the other; not during the truce from a broken alliance (`WAR.allyTruce = 600`). Every ally of a defender joins a declared war. Alliances no longer end when the common threat shrinks; AIs still only seek allies against a common larger neighbor. `stepAllyForts`: a fort on the shared border starts a 60 s countdown (flag `allyfort:<o>`, toast) and then ends the alliance.
- **Bandit waves**: from 30:00, every 3 minutes a bandit gang (power 1000, +300 per wave; `BANDIT_WAVE`) appears in a random unclaimed province (not unique provinces or their guards), with a toast and a `bandits:<n>` flag.
- **Resource bar**: fort count / fort limit (`#r-forts`) and provinces / province limit (`#r-provs`), red when full (`setupBar` / `updateBar` wrappers).
- **Minimap**: your provinces being captured, occupied or with a wall under siege pulse red (`drawMini` wrapper, `siegedProvs`).
- **Hotkeys**: the F2-F4 zoom presets are removed (the user will add zooms back in the Godot version; `zoomPreset` is still in game.js). F2 / F3 / F4 center on a saved province at the current zoom (the capital at first); Shift+F2/F3/F4 saves the selected unit's or province's spot (`S.provKeys`). Control groups: Ctrl (or Cmd, or Alt) + 0–9 saves the selected units, the number selects them, twice within 0.45 s centers on them (`S.ctrlGroups`). The old 1 / 2 debug selection keys are gone. (Some browsers reserve Ctrl+1–9 for tab switching; Alt+number always works.)
- **Rally points**: the training card's Q cell (`rally`; the trainable units move one cell along, `renderTrainCard` wrapper). Click it, then the map (`clickAt` wrapper; on the building itself clears it). New soldiers form their own army and march there, then merge into an army standing at the rally point (`rallyArrivals`); Wayfinders, Masons and Mages walk there. The selected building shows a dashed line and a waving flag in your colors (`drawRally`, via a `drawGame` wrapper).
- **Outliner**: Mage Towers / Groves / Warlock Towers listed in the Armies tab (`towersSec`, `data-mt`); every section heading (Wayfinders, Masons, Provinces, Armies, Mages, Barracks, Towers) has a − / + button to fold its list (`roHead`, `roHidden`, `roToggle`, saved as `realm-rocol`).
- **Calm map** (Settings, `#calmBtn`, `VIEW.calm`): hides villagers and road walkers (`civsShown`) and draws the border trees still in the cached layer (`calmTrees()` in the renderer patch in assemble_game.py).
- **Woodling houses**: a home in the owner's color also wears its leafy crown in that color (woodbld.js `treeHouse`, `shade`).
- **Master Builders** (`autobuild`, Government Tier III+, offered only when every other Tier III Government technology is done; `afterT3`, `tier3Done`; `playerOnly` so AIs never draw it): the Mason card's cell 14 becomes Automate (Cancel construction stays there while he builds by hand). It opens a pick of buildings on the card (`autoPickFor`, `autopick:<type>`); the Mason (`u.auto`) then walks to the nearest of your provinces where `buildCheck` allows that building and builds it, once a second (`stepAutoBuild`), and waits when nothing is left. Click again to turn it off. Implemented with an accessor on `CMD[MASON]` (applyRace's assignments go to its setter).
- **Interface**: a forge icon on the Armory button; the Diplomacy chip shows a dove at peace or crossed swords at war instead of the "At peace" / "War" text; the province menu sits above the minimap again (moved out of `#rcol`, `body.v96-prov`); army power of 2000 and up shows as 2k, 2.5k, 50k (`fmtPow`) on the map, outliner, selection bar, Inspect and Diplomacy.
- **Front and back rows** (added to v96 at the user's request, same version): an army with 6 or more troops (`ROW_MIN`) fights in two rows. `a.back` (kind → count) holds the back row; Mages stand in the back by themselves unless `a.magesFront` (`rowBack`, `rowBackSet`, `rowFront`, `setBack` in v96.js). `sideStrength` (game.js) counts back-row soldiers at half (`rowDeal`; Mages always full). `applyDamage` (game.js) kills front-row soldiers first; once the front row has fallen, damage to the back row is halved (`BACK_TAKE`), including what spills over in the same round. Below 6 troops the army is one line (the saved rows come back if it grows). `combineArmies` keeps rows; split-off and rally-merged armies start with everyone in front. The army card's Rows button (first free cell of 2 / 9 / 7 / 6 / 5 / 4) opens `openRowsMenu`: everyone to the front, or all / half of a kind to the front or back (not during battle). The AI only uses the automatic Mage placement.
- **Late magic for Moderate and Difficult AIs** (same version): normal research and building until 30:00 (`AI_MAGIC_LATE`); if by then the nation has no school (`aiMagicLate(N)`), the `magetower` research weighs 500, `P.wantTower` is on and the tower goes first in `aiNextBuilding` (no wood-upkeep veto). `aiMakeRoomForTower(N)`: when the tower is affordable but every province is full, the nation tears down the building it can best spare (Marketplace, Granary, Storehouse, Bank, Stable, extra Temple, then a Farm or Lumber Mill it can do without), at most once every 30 s. A `spawnAINations` wrapper in v96.js gives Moderate and Difficult nations a random school open to their race (`N.wantSchool`), replacing Difficult's fixed Arcane.
- **Interface touch-ups** (same version): the Armory and Diplomacy buttons are icon-only and half width; the warscore bars are their own panels under the Diplomacy button while at war (`renderDipWars`, click opens Diplomacy on that war); the Armory editor has Weapons / Armor / Horses (Ogres) tabs (`armTabs`, `armTab`); the F5-F7 zoom presets are gone.

