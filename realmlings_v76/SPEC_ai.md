**Status: done (built on top of the SPEC_next build, alliances included). See HANDOFF.md, "AI nations".**

# Realmlings: AI nations (separate pass)

These are the user's requirements for computer-controlled nations, from the original spec plus a later addition.

## Lobby: 1 to 8 nations

- The title card gets 7 opponent slots next to the player's own nation, for 8 nations in total.
- Each slot can be set to **Easy**, **Moderate**, **Difficult** or **Closed**.
  - A closed slot spawns no nation, so a game can have anywhere from 1 nation (the player alone) to 8.
  - Difficulties can be mixed freely, for example 6 Easy and 1 Moderate.
- Each AI nation gets its own name, color and flag, drawn from the same pools as the player's: `NATION_COLORS` and `FLAG_EMBLEMS` in features.js. AIs never take the player's color.
- The existing "Rival kingdom" toggle (`#mRival`, `spawnRival` in war.js, owner 2) is replaced by these slots.
- Practice mode stays player-only.

## Behavior by difficulty

- **Easy:** passive and slow to expand. Never holds more than 10 provinces.
- **Moderate:**
  - Expands to 10 provinces, then techs to Mages, then expands to 20 if it can.
  - Declares war only when it thinks it has a 2-to-1 advantage, and looks for weaker nations.
- **Difficult:**
  - Focuses only on expanding, researching and developing.
  - Model it on a hybrid of the old arena's **Arcane Rush** and **Expansionist** AIs (`tools/arena.js`).

## Fairness rules

- AIs treat the player exactly like any other nation. Never single the player out.
- No more than 2 nations may be at war with the player at the same time.

## Things the AIs must play by

They follow the same rules as the player:
- Outposts and the outpost limit, and Tyranny Exhaustion past 10 provinces.
- Army Exhaustion; food upkeep for units and wood upkeep for buildings.
- The research trees, build times, and the 3 Wayfinder / 3 Masons limit.
- Warscore, white peace, seizing at most 5 connected provinces, armies heading home after peace, and movement only through own, unclaimed or at-war land.

There are also wars between AIs, not just against the player: the diplomacy panel and warscore (war.js) currently assume one war between the player and one rival, so they need to handle several nations and several wars at once.

Alliances were only ever built in the simulator (`tools/arena.js`, see "alliance"). Porting them in is optional; ask the user.

## Order of work

This pass should start from the build produced by the **other** conversation (set pieces, bandits, towns, the technology overhaul). If that conversation has finished, ask the user for its final project zip and work from that instead of the files here, so nothing is lost. If you must start from these files, keep changes contained (new files where possible: `ai.js`, `lobby.js`) so the two sets of work can be merged later.
