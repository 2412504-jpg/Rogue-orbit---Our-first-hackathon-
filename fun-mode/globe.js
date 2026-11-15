/* ROGUE ORBIT — live rotating globe for the home screen.
   Pure Canvas 2D. No libraries, no image files, no network. Open index.html and it runs.

   How it works
   - A 2048x1024 Earth texture (continents, biomes, ice, coastal shallows) is painted once at start-up
     from hand-written lon/lat outlines, plus a cloud layer and a city-lights layer.
   - Every pixel of the sphere is mapped to a longitude/latitude once (for the tilted axis).
     After that a frame only needs to shift longitude, so spinning is cheap.
   - Lighting is fixed in screen space (sun at upper left), so the day/night line stays put while
     the planet turns underneath it.
   - The loop only runs while the home screen is showing, pauses when the tab is hidden,
     and shows a still frame when the visitor prefers reduced motion.
   If anything fails, the original SVG Earth stays in place. */
(function () {
  'use strict';

  var glow = document.querySelector('.earth-glow');
  var home = document.getElementById('home');
  if (!glow || !home || !document.createElement('canvas').getContext) return;

  /* ---------- tuning ---------- */
  var SPIN_DEG_PER_SEC = 9;      // one full turn in 40 seconds
  var CLOUD_EXTRA = 1.16;        // clouds drift a little faster than the ground
  var START_LON = 100;           // degrees east at the centre when the screen opens
  var STILL_LON = 76;            // framing for reduced-motion (Pakistan in view)
  var TILT_ROLL = 21 * Math.PI / 180;   // axis leans to the right
  var TILT_PITCH = 17 * Math.PI / 180;  // north pole tips toward the viewer
  var SAT_DEG_PER_SEC = 20;
  var MAX_GLOBE_PX = 560;
  var SWAT = { lon: 72.4, lat: 34.8 };  // mission area, shown as a small beacon
  var SHOW_BEACON = true;

  var TAU = Math.PI * 2, D2R = Math.PI / 180;
  var TEX_W = 2048, TEX_H = 1024, CLOUD_W = 1024, CLOUD_H = 512;
  var LIGHT = (function () { var x = -0.52, y = 0.48, z = 0.70, l = Math.sqrt(x * x + y * y + z * z); return { x: x / l, y: y / l, z: z / l }; })();

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- coastline data (lon, lat pairs) ---------- */
  var NORTH_AMERICA = [-168,66,-162,70,-156,71.3,-141,69.7,-128,70,-115,68,-108,68,-96,68.5,-94,72,-86,70,-82,69,-90,64,-94,60,-93,58,-88,56.5,-82,55,-82,52,-79,51.5,-79,55,-77,60,-72,61.5,-68,60,-65,60,-62,57,-58,54,-56,52,-60,50,-66,49,-65,46,-61,45.5,-66,43.8,-70,43,-70,41.6,-74,40.5,-76,38,-76,35,-78,33.5,-81,31,-80,27,-80,25.2,-82,26,-82.8,28.5,-85,29.7,-89,30,-90,29,-94,29.5,-97,27.5,-97.5,24,-97.8,22,-96,19,-94.5,18.2,-91,18.8,-90.5,21,-87,21.5,-87.5,18,-88.5,15.8,-84,15.7,-83.2,14,-83.5,11,-82,9,-79.5,9.5,-77.5,8.5,-79,7.5,-80.5,7.3,-82.8,8.2,-85.7,10,-87.5,13,-91.5,14,-94.5,16,-97,15.8,-101,17.2,-105.5,19.8,-105.5,22.5,-110,23,-112,25,-114.5,28.5,-117,32.5,-120.5,34.5,-123.5,39,-124.3,43,-124,47,-123,49,-127,51,-130,54.5,-134,58,-140,59.8,-147,61,-152,59,-158,57,-163,55,-158,58.5,-161,59.5,-165,61,-165,64];
  var SOUTH_AMERICA = [-77,8.5,-75.5,10.5,-72,12,-71.5,10.5,-68,10.6,-64,10.5,-61,10.5,-60,8.5,-57,6,-53,5.5,-51,4,-50,1.5,-48,-1,-44,-2.5,-40,-3,-35.5,-5.5,-35,-9,-37.5,-12.5,-39,-17.5,-40,-20.5,-43,-23,-46,-24,-48.5,-26,-48.5,-28.5,-50,-31,-52.5,-34,-55,-35,-57,-35,-58,-38,-62,-39,-62.5,-41,-65,-41,-64.5,-43,-66,-45,-67.5,-46.5,-66,-48,-69,-51,-68.5,-52.5,-70,-54,-68,-55,-72,-54,-74,-52,-75.5,-47,-74,-43,-73.5,-38,-71.5,-33,-71.5,-28,-70.5,-24,-70,-18.5,-75,-15,-77,-12,-79,-8,-81,-5,-80,-2,-80,0.5,-78.5,2,-77.5,4,-77.5,7];
  var AFRICA = [-5.9,35.8,-2,35.1,3,36.8,10,37.2,11,35,10,33.5,15,32.3,20,32.5,20,30.5,25,31.8,32,31.2,32.5,30,33.5,27,35.5,24,37.5,19,39,15.5,41.5,13.5,43,12,44,10.5,48,11.2,51,11.8,51,10,48,5,44,1,41.5,-2,39.5,-5,39,-8,40.5,-11,40.5,-15,37,-18,35,-20,35.5,-24,33,-25.5,32.7,-28.5,30,-31.5,27,-33.5,23,-34.2,20,-34.8,18.4,-34,17.5,-30.5,15,-26.5,14.5,-22.5,13,-18,12,-14,13.5,-11,12.5,-6,9,-1,9.5,3.5,6,4.3,3,6.3,-1,5,-4.5,5.2,-7.5,4.4,-11,6.8,-13.5,9.5,-16.5,12.2,-17.2,14.7,-16.5,19,-17,21,-16,24,-13,27.7,-10,29.8,-9.8,31.5,-8.5,33.5,-6.8,34.2];
  var EURASIA = [-5.4,36.1,-9,37,-9.5,39,-9,43,-1.5,43.5,-1.5,46,-4.5,48.5,-1.5,49,1.5,50.5,4,51.5,7,53.5,8.5,55.5,8,57,10.5,57.7,10.5,55,12,54.5,14,54,19,54.5,21,57,24,57.5,24,59.5,29,60,23,60,21.5,61,21.5,64,25,65.5,22,65.8,17.5,62.5,18.5,60.5,16,56.5,12.5,56,11,59,8,58.2,5.5,59,5,62,10,64,14,67.5,19,70,25,71,31,70,33,69.3,41,67,34,66.5,37,64,40,64.5,44,66,44,68.5,53,68.5,60,69,66,69,68,72,73,72.5,80,73.5,87,75,100,77,104,77.7,113,74,120,73,130,71,140,72.5,150,71.5,160,69.7,170,70,180,69,180,65,178,64.5,172,64,177,62.5,171,60,163,59.5,163,56,156,51,156,57,162,61,155,59.5,143,59,136,54.5,141,52.5,140,48,135,43.5,131,42.5,129.5,41,128,38.5,129.5,36,126.5,34.5,126,37.5,125,39.5,121.5,39,121.5,40.5,118,39,119,37.5,122,37,120,35,121.5,32,122,30,120,26.5,116.5,23,113,22,110,21,108,21.5,106,19.5,108.5,15.5,109,12,105,8.7,105,10,100.5,13.5,100.5,9.5,101,6.5,103.5,2,104,1.3,101,3,98.5,8.5,98.5,13,97.5,16.5,94.5,16.5,94,19,92,21.5,90,22,87,21,85,19.5,81,16,80,13,80,10,78,8.3,76.5,9,75,12.5,73,17.5,72.8,21,70,20.8,68.5,23.5,66.5,25.4,62,25.2,57.5,25.8,56.5,27,54,26.8,51,28,48.5,30,49.5,27.5,51.5,25,52,24,54.5,24.2,56.2,26,56.4,24.5,59.5,22.5,58.5,20.5,55,17.2,52,16,48,14,45,12.8,43.3,13,42.8,16,41,19.5,39,22,37,26,35,28.2,34.9,29.5,35,31,35.5,33.5,36,35,36,36.7,34.5,36.8,32,36.2,30,36.3,28,36.7,27,37.5,26.5,38.5,26.2,40,25,40.8,23,40.2,24,38,23,36.5,21.7,36.8,21.2,38.3,20.2,39.7,19.5,41,19.5,42.2,18,42.6,15.5,44.5,14,45.3,13.5,45.7,12.3,45.3,12.4,44.2,13.6,43.5,14.3,42.2,16,41.9,18.5,40.3,17.2,39.4,16.5,38.9,16,38,15.7,38.1,15.8,40,14.5,40.7,12.5,41.7,11,42.5,10.2,43.9,8.8,44.4,7.6,43.8,5.4,43.3,3.5,43.2,3.1,42,0.9,41,0.2,39.8,-0.3,38.8,-0.7,37.6,-2.2,36.7,-4.5,36.7];
  var AUSTRALIA = [113.5,-22,114,-26,115,-34,118,-35,123,-34,126,-32.5,131,-31.5,134,-32.8,137,-35,138,-34,138.2,-35.7,140,-37.8,144,-38.5,146,-39,148,-37.8,150,-37,151,-33,153,-28.5,153,-25.5,150.5,-22.5,148.5,-20,146,-18.5,145.5,-15,143.5,-14,142.5,-10.8,141.5,-13.5,141.5,-17,139,-17.3,136.5,-15.5,136.8,-12.2,132.5,-11.5,130,-13,129,-15,125,-14.5,122.5,-17.5,121,-19.5,118,-20.5,115,-21.5];
  var ANTARCTICA = [-180,-90,-180,-73,-160,-78,-150,-76,-130,-74,-110,-73.5,-100,-72,-90,-73,-75,-73,-65,-67,-60,-64,-57,-63.5,-62,-66,-65,-69,-70,-72,-60,-75,-45,-78,-30,-77,-15,-72,0,-70,15,-69,30,-69.5,45,-67,60,-67.5,70,-68,80,-67,95,-66,110,-66.5,125,-66.5,140,-66.7,150,-69,160,-70.5,170,-72,180,-73,180,-90];
  var GREENLAND = [-73,78,-60,82,-30,83.5,-20,80,-18,76,-22,70,-25,68,-35,66,-40,63.5,-43.5,60,-48,61,-52,65,-54,69,-56,72,-66,76];
  var ISLANDS = [
    [-80,73.5,-72,71.5,-68,70,-62,67,-65,63,-72,63.5,-78,64,-74,68,-85,70,-90,73],               // Baffin
    [-118,72,-108,73,-100,71,-103,69,-113,69],                                                    // Victoria
    [-90,77,-80,76,-70,78.5,-62,82,-80,83,-92,81],                                                // Ellesmere
    [-180,69,-175,67.5,-170,66,-172,64.5,-180,65],                                                // Chukotka
    [-85,22,-82,23.2,-79,22.6,-75.5,20.7,-77.5,19.9,-80,21.8],                                    // Cuba
    [-74.5,19.8,-71,19.9,-68.4,18.6,-71,17.8,-74.4,18.4],                                         // Hispaniola
    [-24,65.5,-22,66.4,-16,66.5,-13.5,65,-15,64.2,-19,63.4,-22.5,63.8,-24,64.5],                  // Iceland
    [-5.5,50,1.5,51.2,1.7,52.8,0,53.5,-1.5,55.5,-2,57,-1.8,57.6,-3.5,58.6,-5,58.6,-6,57,-5.5,55.5,-4.8,54.7,-3,54.8,-3,53.4,-4.8,52.8,-4.2,51.6,-3,51.3,-5,50.5], // Great Britain
    [-10,52,-9.5,54.2,-8,55.2,-6,55,-6,52.2,-8,51.7],                                            // Ireland
    [12.5,38,15.5,38.2,15,36.7],                                                                  // Sicily
    [8.2,41,9.7,41,9.5,39,8.4,39],                                                                // Sardinia
    [32.5,31.2,34.2,31.3,34.9,29.5,34.3,27.8,33.5,28.5,32.6,29.9],                                // Sinai
    [80,9.8,81.8,7.5,81,6,80,6.2,79.8,8],                                                         // Sri Lanka
    [95.3,5.6,98,4,100.5,2,103.5,-1,106,-3.2,105.8,-5.8,102,-4,99,-1,96.5,2.5],                   // Sumatra
    [109,1.5,111,1.8,113.5,3.5,116,6.8,118,5.5,117.5,2.5,118.5,1,117,-1.5,116,-3.7,114.5,-4,111.5,-3,110,-2.5,109,0], // Borneo
    [105.3,-6.5,108,-6.5,111,-6.6,114.5,-7.8,114.5,-8.7,110,-8.2,106,-7.4],                       // Java
    [120,0.8,125,1.5,123,-1,121.5,-1.5,123,-4.5,121,-4,120.5,-5.5,119.3,-5,119.5,-1],             // Sulawesi
    [131,-0.8,135,-3.3,138,-1.8,141,-2.7,145,-4.5,147.5,-6,150.5,-10.3,147,-10,143,-9,141,-9.2,138,-8.3,137,-5,133,-4,132,-2.5], // New Guinea
    [120.5,18.5,122.3,18.3,122,16,121.5,14,124,13,123,12.5,120.5,14,120,16,120,18],               // Luzon
    [122,7,124,9,126.5,8,126,6,125,5.7,123.5,7.5],                                                // Mindanao
    [130.9,34,132.5,35.5,135.5,35.8,137,37,139.5,38.5,140,41,141.8,40,142,39,141,36,140.5,35,138,34.7,136,34,135,33.5,133,34,131,33.9,131.8,33.5,131.5,31.5,130,31.5], // Honshu + Kyushu
    [140,42,141.5,45.4,145.5,43.3,143,42,140.5,41.5],                                             // Hokkaido
    [120.2,23,121,25.2,122,25,121,22],                                                            // Taiwan
    [108.7,19,110.5,20,111,19.5,109.5,18.2],                                                      // Hainan
    [142,46,143.5,50,143.2,54,142.3,53.5,142,49],                                                 // Sakhalin
    [52,71,57,70.5,68,76.5,60,77,55,74],                                                          // Novaya Zemlya
    [11,78,17,80,27,80,21,77,16,76.8],                                                            // Svalbard
    [49.3,-12,50.5,-15.5,49.5,-18,47.5,-25,45,-25.5,43.5,-22,44.5,-17,47,-15],                    // Madagascar
    [144.7,-40.7,148.3,-40.9,148,-43,146,-43.6,145,-42],                                          // Tasmania
    [172.7,-34.4,175,-37,178.5,-37.7,177,-39.2,175,-41.5,174.5,-39.5,173.8,-36.5],                // New Zealand N
    [172.7,-40.5,174.3,-41.7,172,-43.7,170.5,-46,167,-46,168.5,-44,171.5,-41.5]                   // New Zealand S
  ];
  var INLAND_WATER = [
    [28,41.5,29,43.5,30.5,46,33.5,45.5,35,45,37.5,44.5,40,43.5,41.5,41.8,37,41,33,42,29.5,41.2], // Black Sea
    [47,45,50,46.5,53,45,53,42,52.5,39.5,53.8,37.3,50.5,37,49,38.5,49.5,40.5,47.5,43]            // Caspian Sea
  ];
  var ICE_LAND = [ANTARCTICA, GREENLAND, ISLANDS[26], ISLANDS[2]];
  var LAND = [NORTH_AMERICA, SOUTH_AMERICA, AFRICA, EURASIA, AUSTRALIA, ANTARCTICA, GREENLAND].concat(ISLANDS);

  // lon, lat, radius (deg), colour, strength — painted over land only
  var BIOMES = [
    [8,23,26,8,[217,181,109],.85],[-5,21,14,6,[217,181,109],.7],[47,24,10,7,[220,178,114],.85],[22,-23,8,6,[207,176,112],.6],
    [134,-25,17,9,[212,154,92],.85],[95,41,15,5,[209,182,128],.7],[62,28,7,4,[205,174,121],.6],[71,27,3,2.5,[215,183,120],.5],
    [-108,34,8,6,[207,170,114],.6],[-68,-42,5,6,[168,168,120],.5],[-70,-23,2,6,[209,177,118],.6],
    [-62,-4,12,8,[31,122,79],.8],[21,-1,9,8,[31,122,79],.8],[110,5,15,8,[31,122,79],.55],[80,25,9,4,[92,174,106],.4],
    [-100,58,25,8,[44,122,98],.7],[95,60,45,9,[45,123,100],.65],[20,62,12,5,[44,122,98],.6],
    [88,32,18,5,[201,199,180],.75],[73,35.5,6,3,[225,227,220],.9],[-112,45,5,14,[168,181,154],.55],[-71,-25,3.5,25,[185,180,154],.5]
  ];

  var CITIES = [ // lon, lat, size
    [67,24.9,1],[74.3,31.5,1],[73.1,33.7,.8],[71.5,34,.7],[67,30.2,.5],[73.1,31.4,.7],[71.5,30.2,.5],
    [-74,40.7,1.2],[-87.6,41.9,.8],[-118.2,34,1],[-95.4,29.8,.7],[-99.1,19.4,1],[-79.4,43.7,.7],[-122.3,47.6,.5],[-80.2,25.8,.7],
    [-74.1,4.7,.7],[-77,-12,.7],[-46.6,-23.5,1.2],[-43.2,-22.9,.8],[-58.4,-34.6,1],[-70.7,-33.4,.6],
    [3.4,6.5,.9],[31.2,30,1],[36.8,-1.3,.5],[28,-26.2,.8],[15.3,-4.3,.6],[38.7,9,.4],[-7.6,33.6,.5],
    [-.1,51.5,1.2],[2.3,48.9,1],[13.4,52.5,.8],[-3.7,40.4,.7],[12.5,41.9,.7],[37.6,55.8,1.1],[29,41,1],[30.5,50.4,.5],[4.9,52.4,.6],
    [51.4,35.7,.9],[44.4,33.3,.7],[46.7,24.7,.7],[55.3,25.2,.7],
    [77.2,28.6,1.3],[72.9,19.1,1.2],[88.4,22.6,1],[77.6,13,.8],[90.4,23.8,1],[79.9,6.9,.4],[69.2,34.5,.4],[69.3,41.3,.5],
    [116.4,39.9,1.3],[121.5,31.2,1.4],[113.3,23.1,1.1],[114.2,22.3,.9],[106.5,29.6,.8],[104.1,30.7,.8],[127,37.6,1.1],
    [139.7,35.7,1.5],[135.5,34.7,1],[100.5,13.8,1],[106.8,-6.2,1.2],[121,14.6,1],[106.7,10.8,.8],[103.8,1.35,.8],[101.7,3.1,.7],
    [151.2,-33.9,.9],[145,-37.8,.7],[174.8,-36.8,.4]
  ];

  /* ---------- texture builders (run once) ---------- */
  function canvasOf(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function lonX(lon) { return (lon + 180) / 360 * TEX_W; }
  function latY(lat) { return (90 - lat) / 180 * TEX_H; }
  function tracePolys(g, polys) {
    g.beginPath();
    for (var p = 0; p < polys.length; p++) {
      var a = polys[p];
      for (var i = 0; i < a.length; i += 2) { var x = lonX(a[i]), y = latY(a[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.closePath();
    }
  }
  function blob(g, lon, lat, rx, ry, col, a) {
    g.save(); g.translate(lonX(lon), latY(lat)); g.scale(rx / 360 * TEX_W, ry / 180 * TEX_H);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1), c = col[0] + ',' + col[1] + ',' + col[2];
    gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(.6, 'rgba(' + c + ',' + (a * .7) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
  }

  function buildLand() {
    var shelf = canvasOf(TEX_W, TEX_H), sg = shelf.getContext('2d');
    sg.shadowColor = 'rgba(112,236,226,1)'; sg.shadowBlur = 20; sg.fillStyle = '#000';
    tracePolys(sg, LAND); sg.fill();
    sg.shadowColor = 'transparent'; sg.shadowBlur = 0; sg.globalCompositeOperation = 'destination-out';
    tracePolys(sg, LAND); sg.fill();

    var land = canvasOf(TEX_W, TEX_H), g = land.getContext('2d');
    g.fillStyle = 'rgb(72,160,110)'; tracePolys(g, LAND); g.fill();
    g.globalCompositeOperation = 'destination-out'; tracePolys(g, INLAND_WATER); g.fill();
    g.globalCompositeOperation = 'source-atop';
    var r = rng(21), i;
    for (i = 0; i < 430; i++) {                                   // soft mottling so land is not flat
      var lat = -58 + r() * 130, lon = -180 + r() * 360, size = 2 + r() * 6, k = r();
      if (k < .45) blob(g, lon, lat, size, size * .6, [22, 92, 60], .22);
      else if (k < .8) blob(g, lon, lat, size, size * .6, [190, 222, 142], .16);
      else blob(g, lon, lat, size, size * .6, [200, 170, 110], .09);
    }
    for (i = 0; i < BIOMES.length; i++) { var b = BIOMES[i]; blob(g, b[0], b[1], b[2], b[3], b[4], b[5]); }
    g.fillStyle = '#eef6fb'; tracePolys(g, ICE_LAND); g.fill();
    var cap = g.createLinearGradient(0, latY(90), 0, latY(66));
    cap.addColorStop(0, 'rgba(244,250,255,.95)'); cap.addColorStop(1, 'rgba(244,250,255,0)');
    g.fillStyle = cap; g.fillRect(0, latY(90), TEX_W, latY(66) - latY(90));

    var tex = canvasOf(TEX_W, TEX_H), t = tex.getContext('2d');
    t.globalAlpha = .5; t.drawImage(shelf, 0, 0); t.globalAlpha = 1; t.drawImage(land, 0, 0);
    var ice = t.createLinearGradient(0, latY(90), 0, latY(77));
    ice.addColorStop(0, 'rgba(240,249,255,.96)'); ice.addColorStop(1, 'rgba(240,249,255,0)');
    t.fillStyle = ice; t.fillRect(0, latY(90), TEX_W, latY(77) - latY(90));
    // Soften by about one texel so coasts get partial-coverage pixels (anti-aliased) when sampled while spinning.
    // Browsers without canvas filters simply skip this and keep the unsoftened texture.
    var final = tex;
    if ('filter' in t) {
      final = canvasOf(TEX_W, TEX_H); var f = final.getContext('2d'); f.filter = 'blur(1.1px)'; f.drawImage(tex, 0, 0);
    }
    var data = final.getContext('2d').getImageData(0, 0, TEX_W, TEX_H).data;
    var out = new Uint32Array(TEX_W * TEX_H); out.set(new Uint32Array(data.buffer.slice(0)));
    shelf.width = land.width = tex.width = final.width = 0;
    return out;
  }

  function periodicNoise(rand, px, py) {
    var g = new Float32Array(px * (py + 1)); for (var i = 0; i < g.length; i++) g[i] = rand();
    return function (u, v) {
      var x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var xa = ((x0 % px) + px) % px, xb = (xa + 1) % px, r0 = y0 * px, r1 = r0 + px;
      var a = g[r0 + xa], b = g[r0 + xb], c = g[r1 + xa], d = g[r1 + xb];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
  }

  function buildClouds() {
    var rand = rng(7), oct = [periodicNoise(rand, 6, 3), periodicNoise(rand, 12, 6), periodicNoise(rand, 24, 12), periodicNoise(rand, 48, 24)];
    var amp = [.50, .27, .15, .08], out = new Uint8Array(CLOUD_W * CLOUD_H);
    for (var y = 0; y < CLOUD_H; y++) {
      var v = (y + .5) / CLOUD_H, lat = 90 - v * 180, al = Math.abs(lat);
      var band = .20 * Math.exp(-lat * lat / 200) + .24 * Math.exp(-Math.pow((al - 52) / 13, 2)) - .16 * Math.exp(-Math.pow((al - 24) / 9, 2));
      for (var x = 0; x < CLOUD_W; x++) {
        var u = x / CLOUD_W, n = 0;
        for (var k = 0; k < 4; k++) n += oct[k](u, v) * amp[k];
        out[y * CLOUD_W + x] = smooth(.545, .78, n + band) * 255;
      }
    }
    return out;
  }

  function buildLights() {
    var cv = canvasOf(CLOUD_W, CLOUD_H), g = cv.getContext('2d'), r = rng(99);
    g.fillStyle = '#000'; g.fillRect(0, 0, CLOUD_W, CLOUD_H); g.globalCompositeOperation = 'lighter';
    function dot(lon, lat, rad, a) {
      var x = (lon + 180) / 360 * CLOUD_W, y = (90 - lat) / 180 * CLOUD_H, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (var i = 0; i < CITIES.length; i++) {
      var c = CITIES[i];
      dot(c[0], c[1], 2.4 + c[2] * 3.2, .95);
      for (var j = 0; j < 5; j++) dot(c[0] + (r() - .5) * 5, c[1] + (r() - .5) * 4, 1.3 + r() * 1.2, .55);
    }
    var d = g.getImageData(0, 0, CLOUD_W, CLOUD_H).data, out = new Uint8Array(CLOUD_W * CLOUD_H);
    for (var p = 0; p < out.length; p++) out[p] = d[p * 4];
    cv.width = 0;
    return out;
  }

  /* ---------- sphere geometry (rebuilt only when the render size changes) ---------- */
  function buildGeometry(N) {
    var R = N / 2, cosB = Math.cos(TILT_ROLL), sinB = Math.sin(TILT_ROLL), cosA = Math.cos(TILT_PITCH), sinA = Math.sin(TILT_PITCH);
    var hx = LIGHT.x, hy = LIGHT.y, hz = LIGHT.z + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz); hx /= hl; hy /= hl; hz /= hl;
    var idx = [], list = [];
    var py, px;
    for (py = 0; py < N; py++) for (px = 0; px < N; px++) {
      var x = (px + .5 - R) / R, y = -(py + .5 - R) / R, r = Math.sqrt(x * x + y * y), cov = clamp((1 - r) * R + .5, 0, 1);
      if (cov <= 0) continue;
      idx.push(py * N + px); list.push(cov, x, y);
    }
    var M = idx.length, G = {
      N: N, M: M, idx: Uint32Array.from(idx), alpha: new Uint8Array(M), lonT: new Float32Array(M),
      rowS: new Uint32Array(M), rowC: new Uint32Array(M), shade: new Float32Array(M), tw: new Float32Array(M),
      spec: new Float32Array(M), hz: new Float32Array(M), night: new Float32Array(M)
    };
    for (var m = 0; m < M; m++) {
      var cv = list[m * 3], vx = list[m * 3 + 1], vy = list[m * 3 + 2], rr = vx * vx + vy * vy, vz;
      if (rr > 1) { var s = 1 / Math.sqrt(rr); vx *= s; vy *= s; vz = 0; } else vz = Math.sqrt(1 - rr);
      // view -> globe frame: Rx(-pitch) * Rz(roll)
      var x1 = vx * cosB - vy * sinB, y1 = vx * sinB + vy * cosB, z1 = vz;
      var y2 = y1 * cosA + z1 * sinA, z2 = -y1 * sinA + z1 * cosA, x2 = x1;
      var lat = Math.asin(clamp(y2, -1, 1)), lon = Math.atan2(x2, z2);
      G.alpha[m] = Math.round(cv * 255);
      G.lonT[m] = lon / TAU;
      var v = .5 - lat / Math.PI;
      G.rowS[m] = clamp(Math.floor(v * TEX_H), 0, TEX_H - 1) * TEX_W;
      G.rowC[m] = clamp(Math.floor(v * CLOUD_H), 0, CLOUD_H - 1) * CLOUD_W;
      var dnl = vx * LIGHT.x + vy * LIGHT.y + vz * LIGHT.z;
      G.shade[m] = .045 + .955 * smooth(-.30, .70, dnl);
      G.tw[m] = Math.exp(-Math.pow((dnl - .03) / .17, 2));
      G.spec[m] = Math.pow(Math.max(vx * hx + vy * hy + vz * hz, 0), 90) * smooth(0, .25, dnl);
      G.hz[m] = Math.pow(1 - vz, 3.1) * (.2 + .8 * smooth(-.35, .5, dnl));
      G.night[m] = 1 - smooth(-.02, .22, dnl);
    }
    G.canvas = canvasOf(N, N); G.ctx = G.canvas.getContext('2d');
    G.img = G.ctx.createImageData(N, N); G.out32 = new Uint32Array(G.img.data.buffer);
    return G;
  }

  /* ---------- per-frame globe shading ---------- */
  function renderGlobe(G, land, clouds, lights, lonS, lonC) {
    var M = G.M, idx = G.idx, alpha = G.alpha, lonT = G.lonT, rowS = G.rowS, rowC = G.rowC, shade = G.shade,
      tw = G.tw, spec = G.spec, hzv = G.hz, night = G.night, out = G.out32;
    var sS = .5 + lonS / 360, sC = .5 + lonC / 360, W1 = TEX_W - 1, C1 = CLOUD_W - 1;
    sS -= Math.floor(sS); sC -= Math.floor(sC);
    for (var m = 0; m < M; m++) {
      var lt = lonT[m], tf = lt + sS; tf -= Math.floor(tf);
      var tc = lt + sC; tc -= Math.floor(tc);
      var sh = shade[m];
      // surface: ocean + land / shallows
      var r = 20, g = 108, b = 196, lc = land[rowS[m] + ((tf * TEX_W) & W1)], la = (lc >>> 24) * .0039216;
      if (la > 0) { r += ((lc & 255) - r) * la; g += (((lc >> 8) & 255) - g) * la; b += (((lc >> 16) & 255) - b) * la; }
      // light and dark side
      r = r * sh + 3 * (1 - sh); g = g * sh + 11 * (1 - sh); b = b * sh + 32 * (1 - sh);
      // clouds
      var ci = rowC[m] + ((tc * CLOUD_W) & C1), ca = clouds[ci] * .0034;
      var spc = spec[m] * (1 - la);
      if (ca > .01) {
        var cr = 4 + 246 * sh, cg = 11 + 244 * sh, cb = 30 + 225 * sh;
        r += (cr - r) * ca; g += (cg - g) * ca; b += (cb - b) * ca; spc *= (1 - ca);
      }
      // warm twilight band along the terminator
      var t = tw[m] * (1 - ca * .5); r += 62 * t; g += 27 * t; b += 8 * t;
      // glint on open water
      if (spc > .004) { r += 255 * spc * .5; g += 250 * spc * .5; b += 235 * spc * .5; }
      // city lights on the dark side
      var nt = night[m];
      if (nt > .02) { var cl = lights[ci] * .0039216 * nt * (1 - ca * .85); if (cl > 0) { r += 255 * cl * .95; g += 188 * cl * .95; b += 96 * cl * .95; } }
      // atmosphere along the edge
      var h = hzv[m]; r += 46 * h; g += 140 * h; b += 250 * h;
      out[idx[m]] = (alpha[m] << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
    }
    G.ctx.putImageData(G.img, 0, 0);
  }

  /* ---------- state ---------- */
  var canvas = document.createElement('canvas'); canvas.className = 'globe-canvas'; canvas.setAttribute('aria-hidden', 'true');
  var haloCanvas = document.createElement('canvas'); haloCanvas.className = 'globe-halo'; haloCanvas.setAttribute('aria-hidden', 'true');
  glow.appendChild(haloCanvas); glow.appendChild(canvas);   // the glow sits underneath and is painted only once per size
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  glow.classList.add('globe-pending');

  var land, clouds, lights, G, S = 0, Dpx = 0, quality = 1, qualityDrops = 0, dtSum = 0, dtCount = 0;
  var isReady = false, running = false, raf = 0, last = 0, tRun = 0, angle = 0, cloudAngle = 0, satAngle = 2.6, beaconT = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var heroArt = glow.parentElement;

  function fail() { glow.classList.remove('globe-pending'); [canvas, haloCanvas].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); }); }

  function makeHalo() {
    haloCanvas.width = haloCanvas.height = S;
    var g = haloCanvas.getContext('2d'), c = S / 2, R = Dpx / 2;
    var a = g.createRadialGradient(c, c, R * .96, c, c, R * 1.4);
    a.addColorStop(0, 'rgba(110,215,255,.58)'); a.addColorStop(.18, 'rgba(70,170,255,.26)'); a.addColorStop(.55, 'rgba(40,120,255,.07)'); a.addColorStop(1, 'rgba(20,80,255,0)');
    g.fillStyle = a; g.fillRect(0, 0, S, S);
    var ox = c + LIGHT.x * R * .26, oy = c - LIGHT.y * R * .26;
    var b = g.createRadialGradient(ox, oy, R * .7, ox, oy, R * 1.5);
    b.addColorStop(0, 'rgba(150,228,255,.20)'); b.addColorStop(1, 'rgba(150,228,255,0)');
    g.fillStyle = b; g.fillRect(0, 0, S, S);
  }

  function measure() {
    var cssS = canvas.clientWidth;
    if (!cssS) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), f = Math.min(dpr, 1500 / cssS) * quality, newS = Math.max(2, Math.round(cssS * f));
    var sizeChanged = newS !== S;
    if (sizeChanged) { S = newS; canvas.width = canvas.height = S; Dpx = S / 1.7; makeHalo(); }
    var N = clamp(Math.round(Math.min(Dpx, MAX_GLOBE_PX)), 200, 640);
    if (!G || G.N !== N) G = buildGeometry(N);
    return true;
  }

  /* ---------- drawing ---------- */
  // Orbit ring: a tilted circle around the planet. Its front arc (z > 0) sweeps across the upper face,
  // which is the part of the planet that stays on screen; the back arc passes behind the globe.
  var RING = { a: 24 * D2R, t: 62 * D2R, k: 1.42 };
  function ringPoint(th, R) {
    var ro = R * RING.k, ca = Math.cos(RING.a), sa = Math.sin(RING.a), ct = Math.cos(RING.t), st = Math.sin(RING.t), c = Math.cos(th), s = Math.sin(th);
    return { x: ro * (c * ca - s * sa * ct), y: ro * (c * sa + s * ca * ct), z: ro * s * st, ro: ro };
  }

  function drawSatellite(x, y, rot, u) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(u, u);
    // solar panels sit either side of the body, along the sprite's y axis
    ctx.fillStyle = '#1b4c84'; ctx.strokeStyle = '#9fd3ea'; ctx.lineWidth = 1;
    [[-30, 0], [10, 0]].forEach(function (p) {
      ctx.fillRect(-7, p[0], 14, 20); ctx.strokeRect(-7, p[0], 14, 20);
      ctx.beginPath(); ctx.moveTo(0, p[0]); ctx.lineTo(0, p[0] + 20); ctx.moveTo(-7, p[0] + 10); ctx.lineTo(7, p[0] + 10); ctx.stroke();
    });
    var body = ctx.createLinearGradient(-9, -9, 9, 9); body.addColorStop(0, '#ffd6a0'); body.addColorStop(.5, '#ed7b40'); body.addColorStop(1, '#a44a35');
    ctx.fillStyle = body; ctx.strokeStyle = '#b8c7d3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-10, -10, 20, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffdb93'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#dc5b26'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  function ringPass(front, cx, cy, R, alpha) {
    if (alpha <= 0) return;
    var u = R / 310, i, p;
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
    var a0 = front ? 0 : Math.PI;
    ctx.beginPath();
    for (i = 0; i <= 90; i++) { p = ringPoint(a0 + Math.PI * i / 90, R); if (i) ctx.lineTo(cx + p.x, cy - p.y); else ctx.moveTo(cx + p.x, cy - p.y); }
    ctx.strokeStyle = 'rgba(90,210,255,' + (front ? .09 : .06) + ')'; ctx.lineWidth = 7 * u; ctx.stroke();
    ctx.setLineDash([3 * u, 9 * u]); ctx.strokeStyle = 'rgba(150,232,255,' + (front ? .6 : .38) + ')'; ctx.lineWidth = 1.7 * u; ctx.stroke(); ctx.setLineDash([]);
    // satellite trail
    var prev = null;
    for (i = 0; i <= 26; i++) {
      p = ringPoint(satAngle + i * .034, R);
      if ((p.z >= 0) === front) {
        if (prev) { ctx.strokeStyle = 'rgba(130,240,255,' + (1 - i / 26) * .65 + ')'; ctx.lineWidth = (3.2 - i * .09) * u; ctx.beginPath(); ctx.moveTo(cx + prev.x, cy - prev.y); ctx.lineTo(cx + p.x, cy - p.y); ctx.stroke(); }
        prev = p;
      } else prev = null;
    }
    // satellite
    p = ringPoint(satAngle, R);
    if ((p.z >= 0) === front) {
      var q = ringPoint(satAngle - .02, R), rot = Math.atan2(-(q.y - p.y), q.x - p.x) + Math.PI / 2;
      drawSatellite(cx + p.x, cy - p.y, rot, u * (.64 + .12 * p.z / p.ro));
    }
    ctx.restore();
  }

  function drawBeacon(cx, cy, R, lonS, alpha) {
    if (!SHOW_BEACON || alpha <= 0) return;
    var lon = (SWAT.lon - lonS) * D2R, lat = SWAT.lat * D2R, cl = Math.cos(lat);
    var gx = cl * Math.sin(lon), gy = Math.sin(lat), gz = cl * Math.cos(lon);
    var cA = Math.cos(TILT_PITCH), sA = Math.sin(TILT_PITCH), cB = Math.cos(TILT_ROLL), sB = Math.sin(TILT_ROLL);
    var y1 = gy * cA - gz * sA, z1 = gy * sA + gz * cA, x1 = gx;
    var vx = x1 * cB + y1 * sB, vy = -x1 * sB + y1 * cB;
    var vis = smooth(.08, .4, z1) * alpha; if (vis <= 0) return;
    var sx = cx + vx * R, sy = cy - vy * R, u = R / 310;
    ctx.save(); ctx.globalAlpha = vis;
    for (var k = 0; k < 2; k++) {
      var ph = (beaconT * .55 + k * .5) % 1;
      ctx.strokeStyle = 'rgba(255,190,100,' + (1 - ph) * .85 + ')'; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(sx, sy, (5 + 26 * ph) * u, 0, TAU); ctx.stroke();
    }
    var gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12 * u); gr.addColorStop(0, 'rgba(255,215,140,.9)'); gr.addColorStop(1, 'rgba(255,160,70,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, 12 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff1c9'; ctx.beginPath(); ctx.arc(sx, sy, 3.2 * u, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawFrame(lonS, lonC, ringAlpha) {
    var c = S / 2, R = Dpx / 2, t0 = performance.now();
    renderGlobe(G, land, clouds, lights, lonS, lonC);
    var cost = performance.now() - t0;
    ctx.clearRect(0, 0, S, S);
    ringPass(false, c, c, R, ringAlpha);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(G.canvas, c - R, c - R, Dpx, Dpx);
    ringPass(true, c, c, R, ringAlpha);
    drawBeacon(c, c, R, lonS, ringAlpha);
    return cost;
  }

  function drawStill() { if (measure()) drawFrame(STILL_LON, STILL_LON - 14, 1); }

  /* ---------- loop ---------- */
  function tick(ts) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    var dt = last ? Math.min(.05, (ts - last) / 1000) : .016; last = ts; tRun += dt;
    var ramp = smooth(0, 2.8, tRun);                     // ease the spin up from standstill
    angle += SPIN_DEG_PER_SEC * ramp * dt; cloudAngle += SPIN_DEG_PER_SEC * CLOUD_EXTRA * ramp * dt;
    satAngle -= SAT_DEG_PER_SEC * D2R * dt; beaconT += dt;
    drawFrame(START_LON - angle, START_LON - cloudAngle, smooth(.7, 2.2, tRun));
    // On a slow machine (under ~25 fps once settled) step the canvas and sphere resolution down, at most twice.
    if (tRun > 2.2 && qualityDrops < 2) {
      dtSum += dt; dtCount++;
      if (dtCount >= 40) { var avg = dtSum / dtCount; dtSum = dtCount = 0; if (avg > .04) { qualityDrops++; quality *= .78; measure(); } }
    }
  }

  function start() {
    if (!isReady || running) return;
    if (!measure()) return;
    glow.classList.remove('globe-live'); void canvas.offsetWidth;   // replay the fade-in on every visit
    requestAnimationFrame(function () { glow.classList.add('globe-live'); });
    if (reduce && reduce.matches) { drawStill(); return; }
    running = true; last = 0; tRun = 0; raf = requestAnimationFrame(tick);
    document.body.classList.add('globe-spinning');
  }
  function stop() { running = false; cancelAnimationFrame(raf); document.body.classList.remove('globe-spinning'); }
  function homeActive() { return home.classList.contains('active'); }
  function sync() { if (homeActive()) start(); else stop(); }

  /* ---------- Earth Orbit mission: the same globe, smaller and calmer ---------- */
  // Reuses the textures built above. Its own loop runs only while the Orbit scene is showing.
  var orbitScene = document.getElementById('orbit'), orbitHost = orbitScene && orbitScene.querySelector('.earth-orbit');
  var oCanvas = null, oCtx = null, oG = null, oRaf = 0, oRunning = false, oLast = 0, oT = 0, oAngle = 0, oCloud = 0;
  var ORBIT_SPIN = 7, ORBIT_LON = 60;
  function oMeasure() {
    var css = orbitHost.clientWidth; if (!css) return false;
    var px = clamp(Math.round(css * Math.min(window.devicePixelRatio || 1, 2)), 160, 400);
    if (oCanvas.width !== px) oCanvas.width = oCanvas.height = px;
    if (!oG || oG.N !== px) oG = buildGeometry(px);
    return true;
  }
  function oDraw() {
    renderGlobe(oG, land, clouds, lights, ORBIT_LON - oAngle, ORBIT_LON - oCloud);
    oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height); oCtx.drawImage(oG.canvas, 0, 0);
  }
  function oTick(ts) {
    if (!oRunning) return;
    oRaf = requestAnimationFrame(oTick);
    var dt = oLast ? Math.min(.05, (ts - oLast) / 1000) : .016; oLast = ts; oT += dt;
    var ramp = smooth(0, 1.8, oT); oAngle += ORBIT_SPIN * ramp * dt; oCloud += ORBIT_SPIN * CLOUD_EXTRA * ramp * dt;
    oDraw();
  }
  function oStart() {
    if (oRunning) return;
    if (!oCanvas) {
      oCanvas = document.createElement('canvas'); oCanvas.className = 'globe-orbit-canvas'; oCanvas.setAttribute('aria-hidden', 'true');
      oCtx = oCanvas.getContext('2d'); if (!oCtx) { oCanvas = null; return; }
      orbitHost.appendChild(oCanvas);
    }
    if (!oMeasure()) return;
    orbitHost.classList.add('globe-live'); oDraw();
    if (reduce && reduce.matches) return;
    oRunning = true; oLast = 0; oT = 0; oRaf = requestAnimationFrame(oTick);
  }
  function oStop() { oRunning = false; cancelAnimationFrame(oRaf); }
  function oSync() { if (!isReady || !orbitScene || !orbitHost) return; if (orbitScene.classList.contains('active')) oStart(); else oStop(); }

  /* ---------- boot: paint after first frame, one step at a time ---------- */
  var steps = [
    function () { land = buildLand(); },
    function () { clouds = buildClouds(); },
    function () { lights = buildLights(); },
    function () {
      isReady = true;
      heroArt.classList.add('globe-on'); glow.classList.remove('globe-pending'); glow.classList.add('globe-ready');
      new MutationObserver(sync).observe(home, { attributes: true, attributeFilter: ['class'] });
      sync();
      if (orbitScene && orbitHost) { new MutationObserver(oSync).observe(orbitScene, { attributes: true, attributeFilter: ['class'] }); oSync(); }
    }
  ];
  function pump() {
    try { steps.shift()(); } catch (e) { if (window.console) console.warn('Globe unavailable, keeping the flat Earth:', e); fail(); return; }
    if (steps.length) setTimeout(pump, 16);
  }
  requestAnimationFrame(function () { setTimeout(pump, 0); });

  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!isReady) return;
      if (homeActive()) { measure(); if (!running) drawStill(); }
      if (oCanvas && orbitScene.classList.contains('active') && oMeasure() && !oRunning) oDraw();
    }, 140);
  }
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(glow);
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', function () { stop(); sync(); });
})();
