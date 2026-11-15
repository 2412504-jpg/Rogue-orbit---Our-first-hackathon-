# Sources, decisions and asset provenance

## Design reference actually consulted

Unity / Two Point Studios, **Expanding the Two Point universe**:
https://unity.com/blog/expanding-the-two-point-universe

Applied lessons: a legible core loop, rooms with specific purposes, approachable scale, and lighting that draws the eye to exhibits. In this game those become briefing -> spacecraft workshop -> launch -> operations -> reflection; three distinct interiors; rounded crew members; and a cyan Earth exhibit. This is an original implementation, not a recreation of Two Point's assets or software. The commercial game's full production toolchain was not inspected or replicated.

## Technical references

- Blender official Windows installation documentation: https://docs.blender.org/manual/en/4.5/getting_started/installing/windows.html
- Blender glTF import/export API documentation: https://docs.blender.org/api/main/bpy.ops.export_scene.html
- Blender official release directory was checked for a portable installation: https://download.blender.org/release/Blender4.5/

Blender installation did not complete; `build_blender_scene.py` is unexecuted source. No external renderer, Figma design, Copilot output, Kenney assets, downloaded textures or image-generation outputs were used in this new edition. Native WebGL, Canvas 2D, Web Audio, browser speech synthesis, local storage, Node.js and PowerShell packaging were used. `index.html` optionally loads the Nunito font from Google Fonts; standalone `PLAY.html` uses local system fonts and has no font-network dependency.

## Where things are implemented

The title screen plays the team-supplied Gemini animation (`assets/mission-intro.mp4`) and uses its closing frame behind the menu. The clip is separate from the procedural mission environment.

| Requirement | Implementation |
| --- | --- |
| Walkable 3D centre | `game.js`: meshes, perspective camera, depth testing, player input and colliders |
| Animated crew | `game.js`: joint-based character movement; `style.css`: idle/blinking dialogue portraits |
| Round Earth | `game.js`: smooth sphere and original stylized continent meshes |
| Flood education | `game.js`: synthetic DEM, channel seeds, steepest-neighbor drainage and connected inundation |
| Engineering trade-offs | `game.js`: spacecraft cost, mass, battery, radio, radar and protection rules |
| Story and consequences | `game.js`: three chapter definitions, crew dialogue, mission stages, trust and results |
| Editable model | `export-model.cjs`, `mission-centre.glb`, `scene-source.json` |
| Blender handoff | `build_blender_scene.py` |
| Verification | `validate.cjs` and browser playtests |

## Nine challenge resources supplied by the team

Resource 7 informs the main campaign from mission planning through closeout. The other entries are preserved as project references. No NASA imagery or logos appear in the game.

1. Design and Develop Science Missions
   https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf
2. General Mission Analysis Tool (GMAT)
   https://software.nasa.gov/software/GSC-19468-1
3. Concept Maturity Levels (CMLs)
   https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl%3A2014%2F44299
4. Mission Design Lab (MDL)
   https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/
5. NASA Mission Viz
   https://nasa.github.io/mission-viz/
6. Build It Yourself - NASA Webb Telescope Game
   https://science.nasa.gov/mission/webb/game-build-it-yourself/
7. CubeSat 101 - Basic Concepts and Processes
   https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf
   See the campaign mapping below for the sections applied to gameplay.
8. Visualize a Space Mission Using Virtual Reality
   https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/
9. Canadian Space Agency - Digital Games and Activities
   https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp

## CubeSat 101 in the campaign

The [NASA-hosted guide](https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf) provides the engineering concepts. In-game reference links open relevant PDF pages.

| Campaign stage | Sections | What the player does |
| --- | --- | --- |
| Ayla's briefing | §§2.1–2.3, concept, funding and feasibility | Confirms the survey target, reviews the science goal, and considers budget reserve. The synthetic elevation grid is a separate game model. |
| Zara's workshop | §§1.1–1.2, 2.4, 4.1–4.4 and 6.4–6.7, plus Appendix C (pp. 70–71) | Makes payload, power, radio and frame decisions. Checks credits, mass and folded dimensions before approval. The guide explains standard units, pointing, onboard storage, and downlink. |
| Hamza's readiness review | §§2.10–2.14 and 6.9, ground testing, readiness and integration | Verifies dispenser fit, runs a battery-powered payload test, and checks a command and reply with the ground station. Launch requires all three results. A design change clears the checks. |
| First contact | §§2.13–2.16, 6.9.1 and Appendix C (p. 70) | Confirms release, receives the beacon and verifies telemetry before collecting mission science. |
| Orbital passes | §§2.4, 2.10 and 2.16, design, ground station and operations | Plans around sunlight, eclipse and contact windows. Forecasts battery after each available action, stores observations onboard and downlinks them during contact. |
| Ayla's report | §§2.11, 2.16 and 6.1, records, operations and debris mitigation | Reviews recorded actions, battery and delivered science, then revises or advances. Reads how real teams plan for end of life. |

The game simulates its own mission timeline, dimensions, budgets, power values and radio schedule. Launch paperwork, regulatory permissions, environmental qualification, orbit propagation and disposal are covered as context or references.

Fun Mode: imported from user-provided RogueOrbit_2D_Earth_Centered (1).zip, 15 November 2026. Original HTML, CSS and JavaScript retained; added navigation to the mission centre. Flood values remain fictional classroom examples.
