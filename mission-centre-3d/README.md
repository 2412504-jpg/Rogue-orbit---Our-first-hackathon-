# Protect Our Home - Mission Centre 3D

A playable, single-player educational browser game for ages 8-15. This is a new WebGL 3D build with a walkable mission centre, not the earlier dashboard or 2D Field Edition.

This combined edition keeps the expanded mission-planning, spacecraft-check, telemetry and orbital-pass flow from Mission Centre 3D, and adds the richer Fun Mode presentation: a live rotating globe, orbit visuals, launch effects, result confetti, reduced-motion support, and a fixed orbit-target placement bug.

## Play

Extract the ZIP, then open **PLAY.html** in Chrome or Edge. No package installation, account, API key, or server is required. WebGL must be available. For editing in VS Code, open this folder and use Live Server on `index.html`, or run `node server.cjs` and visit http://127.0.0.1:4174.

The opening animation plays muted and holds on its final frame as the start menu fades in. **Skip intro** or Escape opens the menu immediately. Returning from Fun Mode or enabling reduced motion goes straight to the menu. Keep `assets/mission-intro.mp4` beside the game in the extracted `assets` folder so the animation can play offline.

Choose **Start game** or **Continue mission** when progress exists. **Menu** or Escape returns to this screen during play; **Resume mission** keeps your current position and progress. New campaign asks before replacing the save. The interface uses compact mission cards, smaller dialogue panels, and crew role labels only when nearby.

## Controls

- WASD or arrow keys: walk. Shift: run.
- E: talk to a nearby crew member.
- Q / R: orbit the camera. Mouse wheel or + / -: zoom.
- H or Hide HUD: hide mission and label overlays for a clearer view. H or Show HUD restores them.
- Follow player: switch between a following camera and the centre overview.
- Room buttons: automatically walk around obstacles to that crew member.
- Touch direction buttons appear on touch devices.
- Voice & sound: optional browser narration of scripted dialogue and sound effects. Available voices depend on the browser/device.
- Escape or the X: close a conversation. Escape during exploration opens the menu. New campaign in that menu resets only this edition's saved progress after confirmation.

## Playable sequence

1. Meet Ayla in the briefing office. Open the mission plan to check the survey target and required science. Inspect elevation, drainage and connected flood extent, then confirm the target.
2. Walk to Zara in engineering. Choose the payload, power array, radio and frame within the mission budget, launch mass and stowed size limits. Open **CubeSat 101 · Why these parts matter** for the engineering behind those choices.
3. Meet Hamza in the space room. Run the simulated dispenser fit, battery and payload, and ground station checks before launch. Changing parts requires a new check of the design.
4. Confirm release, receive the beacon, and verify telemetry. Use the orbital pass planner and battery forecasts to schedule imaging, downlink, and rest around eclipse, weather, and ground contact.
5. Read Ayla's result and review the flight log. Strong results raise agency trust. Partial results allow continuation, and a failed mission needs a revised plan.
6. Continue through Before the Rain, The Roads Home, and A Shared Sky.

Progress saves in the current browser. File-based browser storage can be restricted; the game still runs when saving is unavailable. No save data is bundled in this download.

## What is modeled

The scene uses actual 3D triangle geometry, perspective projection, depth testing, lighting and animated character joints. The fixed elevated camera provides an easy-to-read adventure view; Q/R changes the viewpoint. The Earth is a rotating shaded sphere with stylized continent geometry and an orbiting satellite. All visual models and characters were created procedurally for this project; no NASA logos, NASA photographs, or third-party game assets are included.

The flood model uses a synthetic 70 by 42 elevation grid inspired by the Swat setting. Drainage follows the steepest of four neighboring cells. Inundation expands from connected river cells below a simplified water surface. Elevations and water levels are model units, not surveyed Swat measurements. It is not a forecast, engineering assessment, or hydraulic flow simulation. No real DEM has been ingested.

The eight passes, energy units, science points, prices and dispenser dimensions are game parameters. The fit check compares the stowed model's length, width and height with the game slot. The bench checks and commissioning use simulated readings. Real orbital tracking, radio licensing, formal flight certification and disposal remain background reading. The three chapters share the simulation rules with different story targets, goals, budgets and starting flood levels.

Effectiveness is delivered science divided by the chapter goal (capped at 100%). Efficiency combines that effectiveness with the proportion of budget and battery remaining. Agency trust changes by +10 for success, -5 for partial results and -15 for failure. Disaster events are scripted, not randomly generated.

## Editable 3D assets and Blender

- `mission-centre.glb`: an actual glTF 2.0 model of the scene, including the rooms, furniture, Earth, satellite, rocket, player and NPCs. Import into Blender with File > Import > glTF 2.0.
- `build_blender_scene.py`: imports that model, adds a camera, lights, softened edges and character idle keyframes, and saves `mission-centre.blend` plus a render when run in Blender 4.5+.
- `scene-source.json`: editable procedural object descriptions.
- `export-model.cjs`: regenerates the GLB from the game's geometry with Node.js.

Blender was not installed in the build environment and the download did not complete. The Blender Python script is provided as unexecuted source; this package does not claim to contain a Blender-rendered image or an already-created `.blend` file. The browser game runs independently of Blender. GLB contains the model at rest; live walking, orbit and launch animations run in `game.js`.

## Development and validation

Run `node validate.cjs` for geometry, navigation, flood connectivity, rising-water, campaign outcome and resource-limit checks. Run `node export-model.cjs`, then `node package.cjs` to regenerate deliverables after editing.

Browser playtesting covered WASD movement, automatic room navigation, crew conversations, flood controls, spacecraft selection, launch, observation/transmission, battery-fault consequences, results and chapter progression. The included checks cover success and failure across all three chapter goals. Reduced-motion settings remove idle movement and shorten launch. The game is intended primarily for desktop; touch controls are provided, but mobile device performance has not been comprehensively tested.

See `SOURCES.md` for references, asset provenance, design decisions and the nine supplied NASA challenge links.

## Fun Mode
Choose Fun Mode on the start screen to play the imported Rogue Orbit six-stage adventure. The mode includes its own animated title globe, satellite orbit, cloud layers, launch smoke and result effects; reduced-motion settings disable those animations. Use Mission centre at the top to return. Main campaign progress stays saved. Keep the complete `fun-mode` folder beside `PLAY.html` when extracting the ZIP.
