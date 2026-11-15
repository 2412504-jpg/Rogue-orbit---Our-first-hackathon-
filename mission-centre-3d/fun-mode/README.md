ROGUE ORBIT — Protect Our Planet | Enhanced 2D Edition

Open index.html in Chrome or Edge. No Node.js, npm, or server needed. Internet may be required for optional Google Fonts; game graphics and code are local.

Improvements: renamed branding, detailed animated Earth, moving cloud layers, satellite tilt and orbit visuals, rocket launch exhaust and smoke, animated flowing flood river, improved interactive map zone feedback. Existing six stages and hints remain.

Flood map is a fictional training scenario, NOT a real-time flood forecast.

This version deliberately contains no .json files. Open index.html directly in a browser.

Home-screen globe: the Earth on the title screen is a live, rotating globe drawn by globe.js (Canvas 2D, no libraries, no image files, works offline). It has a tilted axis, a light side and a dark side with city lights, drifting clouds, an atmosphere glow, an orbit ring with a satellite, and a small pulsing beacon over the Swat mission area. It only runs while the title screen is showing, slows its own quality down on weak machines, and shows a still frame if the player's system asks for reduced motion. If it cannot start, the original flat Earth stays. Tuning values (spin speed, tilt, beacon on/off) are at the top of globe.js.

Motion polish (round 2): the Earth Orbit mission now uses the same live globe (smaller and calmer, only runs on that screen). The title screen has a staggered entrance, slowly drifting planets and an occasional shooting star. The Results screen has a badge pop-in, glow and confetti (effects.js). All of it is switched off when the player's system asks for reduced motion.

Bug fix: updateOrbit() in script.js looked up the orbit stage with the id helper $() using a CSS class selector, which always returned null and threw an error every time the Orbit mission opened or the satellite turned. The scan targets were never placed around the orbit. It now uses document.querySelector('.orbit-stage').

