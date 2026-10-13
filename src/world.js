/* Offline Earth renderer. THREE and flight math are supplied by the bundle. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('worldCanvas'), stage = $('worldStage');
  const layers = { earth: true, clouds: true, plane: true, route: true };
  let renderer;
  function fallback(reason) {
    const error = $('worldError');
    if (error) {
      error.hidden = false; error.classList.remove('hidden');
      error.textContent = '3D view unavailable: this browser could not start WebGL graphics. Your focus timer still works; try a browser with hardware acceleration enabled.';
    }
    if (stage) stage.classList.add('webgl-fallback');
    if (document.body) document.body.classList.add('webgl-fallback');
    window.WORLD = {
      draw() {}, setView() {}, reset() {}, setLayers(values) { Object.assign(layers, values); },
      view: 'follow', renderer: null, scene: null, camera: null, aircraft: null, layers,
      get diagnostics() { return { mode: 'fallback', error: String(reason), drawCalls: 0 }; }
    };
  }
  if (!canvas || !stage || !window.THREE) { fallback('Missing canvas or Three.js'); return; }
  const T = window.THREE;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' }); }
  catch (error) { fallback(error.message); return; }
  const R = 100, scene = new T.Scene();
  scene.background = new T.Color(0x07121e);
  const camera = new T.PerspectiveCamera(43, 1, 0.1, 2200);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const assets = window.WORLD_ASSETS || {}, loader = new T.TextureLoader();
  function texture(uri, color) {
    // Reject remote URLs: all textures in the downloadable tool are embedded.
    if (!uri || !/^data:image\//.test(uri)) return null;
    const tex = loader.load(uri, () => draw(), undefined, () => {
      const hint = $('worldHint');
      if (hint) hint.textContent = 'Some map detail could not load. Drag to orbit · scroll or pinch to zoom.';
    });
    if (color) tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }
  const earthMap = texture(assets.earth, true);
  const earth = new T.Mesh(new T.SphereGeometry(R, 96, 64), new T.MeshPhongMaterial({
    map: earthMap, color: earthMap ? 0xffffff : 0x31516a,
    normalMap: texture(assets.normal, false), normalScale: new T.Vector2(0.48, 0.48),
    specularMap: texture(assets.specular, false), specular: new T.Color(0x536475), shininess: 22
  }));
  // SphereGeometry u=.5 is +X (Greenwich), u=.75 is -Z (90°E).
  // Conventional Earth equirectangular textures need NO longitude rotation.
  earth.name = 'earth'; scene.add(earth);
  const cloudMap = texture(assets.clouds, true);
  const clouds = new T.Mesh(new T.SphereGeometry(R + 0.38, 80, 48), new T.MeshPhongMaterial({
    map: cloudMap, transparent: true, opacity: cloudMap ? 0.55 : 0,
    depthWrite: false, shininess: 5, color: 0xf4f4ed
  }));
  clouds.name = 'clouds'; clouds.visible = !!cloudMap; scene.add(clouds);
  const atmosphere = new T.Mesh(new T.SphereGeometry(R + 2.0, 80, 48), new T.ShaderMaterial({
    uniforms: { tint: { value: new T.Color(0x679bcc) }, strength: { value: 0.52 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 tint;uniform float strength;varying vec3 vN;varying vec3 vV;void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);gl_FragColor=vec4(tint,rim*strength);}',
    transparent: true, blending: T.AdditiveBlending, side: T.BackSide, depthWrite: false
  }));
  atmosphere.name = 'atmosphere'; scene.add(atmosphere);
  scene.add(new T.HemisphereLight(0xd2e2ee, 0x112033, 1.25));
  const sun = new T.DirectionalLight(0xffecd5, 2.5); sun.position.set(180, 100, 160); scene.add(sun);
  const fill = new T.DirectionalLight(0x7ba3cd, 0.5); fill.position.set(-160, -40, -100); scene.add(fill);
  let seed = 19377;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const stars = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const y = random() * 2 - 1, angle = random() * Math.PI * 2, q = Math.sqrt(1 - y * y), r = 700 + random() * 400;
    stars.set([q * Math.cos(angle) * r, y * r, q * Math.sin(angle) * r], i * 3);
  }
  const starGeo = new T.BufferGeometry(); starGeo.setAttribute('position', new T.BufferAttribute(stars, 3));
  const starfield = new T.Points(starGeo, new T.PointsMaterial({ color: 0xb9c9de, size: 1.0, transparent: true, opacity: 0.48, depthWrite: false, sizeAttenuation: true }));
  starfield.name = 'stars'; scene.add(starfield);
  // Model coordinates: +Z nose, +Y cabin roof, +X starboard wing.
  const aircraft = new T.Group(); aircraft.name = 'aircraft'; scene.add(aircraft);
  const ivory = new T.MeshStandardMaterial({ color: 0xece7db, roughness: 0.34, metalness: 0.18 });
  const navy = new T.MeshStandardMaterial({ color: 0x122b42, roughness: 0.4, metalness: 0.22 });
  const gold = new T.MeshStandardMaterial({ color: 0xcba76c, roughness: 0.3, metalness: 0.45 });
  const glass = new T.MeshStandardMaterial({ color: 0x112b3e, roughness: 0.2, metalness: 0.5 });
  const metal = new T.MeshStandardMaterial({ color: 0x8b969d, roughness: 0.35, metalness: 0.75 });
  function part(name, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.position.set(x, y, z); aircraft.add(mesh); return mesh;
  }
  const profile = [[0.025,-4.9],[0.14,-4.65],[0.3,-4.15],[0.43,-3.25],[0.46,-2],[0.46,1.7],[0.44,2.7],[0.36,3.5],[0.23,4.1],[0.1,4.48],[0.015,4.65]].map(p => new T.Vector2(p[0], p[1]));
  const hullGeo = new T.LatheGeometry(profile, 36); hullGeo.rotateX(Math.PI / 2);
  part('fuselage', hullGeo, ivory);
  const lowerGeo = new T.LatheGeometry(profile.map(p => new T.Vector2(p.x + 0.003, p.y)), 24, -Math.PI / 2, Math.PI); lowerGeo.rotateX(Math.PI / 2);
  part('belly', lowerGeo, navy);
  for (const angle of [Math.PI / 2, Math.PI * 1.5]) {
    const stripe = new T.LatheGeometry(profile.map(p => new T.Vector2(p.x + 0.005, p.y)), 2, angle - 0.025, 0.05); stripe.rotateX(Math.PI / 2); part('gold-cheatline', stripe, gold);
  }
  function foil(name, points, material, vertical = false) {
    const shape = new T.Shape(); points.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 });
    if (vertical) { geo.rotateY(Math.PI / 2); geo.translate(-0.035, 0.05, 0); }
    else { geo.rotateX(Math.PI / 2); geo.translate(0, 0.02, 0); }
    return part(name, geo, material);
  }
  for (const side of [-1, 1]) {
    foil(side < 0 ? 'left-wing' : 'right-wing', [[0.35*side,1.1],[1.4*side,.6],[4.8*side,-1.7],[5.05*side,-2.35],[4.65*side,-2.45],[1.1*side,-1.45],[.35*side,-1.65]], ivory);
    foil('horizontal-tail', [[.12*side,-3.15],[2.1*side,-4.05],[2.35*side,-4.65],[1.8*side,-4.7],[.12*side,-4.1]], navy);
    const tip = part('winglet', new T.BoxGeometry(.09, .55, .46), navy, side*4.88, .23, -2.12); tip.rotation.z = -side*.2;
    const engine = part(side < 0 ? 'engine-left' : 'engine-right', new T.SphereGeometry(1, 24, 14), ivory, side*1.65, -.55, -.18); engine.scale.set(.31,.31,.9);
    const pylon = part('engine-pylon', new T.BoxGeometry(.13,.38,.8), metal, side*1.65,-.18,-.28);
    pylon.rotation.x = -.12;
    const intake = part('intake', new T.TorusGeometry(.245,.055,8,28), metal, side*1.65,-.55,.56);
    const inlet = part('turbine', new T.CircleGeometry(.245,24), glass, side*1.65,-.55,.565);
    const hub = part('fan-hub', new T.ConeGeometry(.07,.14,16), metal, side*1.65,-.55,.62); hub.rotation.x = Math.PI/2;
    const exhaust = part('exhaust', new T.CircleGeometry(.16,20), glass, side*1.65,-.55,-.97); exhaust.rotation.y = Math.PI;
    intake.renderOrder = inlet.renderOrder = 1;
  }
  // Vertical fin profile is drawn in (negative Z, Y), then rotated into YZ.
  foil('vertical-tail', [[3.0,.25],[4.0,1.95],[4.65,2.12],[4.6,.1]], navy, true);
  const cockpit = part('cockpit', new T.SphereGeometry(1,20,12), glass, 0,.29,3.48); cockpit.scale.set(.31,.13,.4);
  const windowGeo = new T.SphereGeometry(1,8,6);
  const windows = new T.InstancedMesh(windowGeo, glass, 50); windows.name = 'windows';
  const matrix = new T.Matrix4(), scale = new T.Vector3(.023,.075,.05), quat = new T.Quaternion();
  for (let i = 0; i < 50; i++) {
    const side = i < 25 ? -1 : 1, z = -2.85 + (i % 25)*.215;
    windows.setMatrixAt(i, matrix.compose(new T.Vector3(side*.425,.16,z),quat,scale));
  }
  aircraft.add(windows);
  const routeGroup = new T.Group(); routeGroup.name = 'route'; scene.add(routeGroup);
  const markers = new T.Group(); markers.name = 'airport-markers'; scene.add(markers);
  let routeKey = '', routeLine = null, completedLine = null, totalDistance = 0;
  const fallbackAirports = { SZX: { lat: 22.639, lon: 113.811, name: 'Shenzhen' }, HND: { lat: 35.549, lon: 139.78, name: 'Tokyo' } };
  function latLon(lat, lon) { const a = lat*Math.PI/180, b = lon*Math.PI/180; return new T.Vector3(Math.cos(a)*Math.cos(b), Math.sin(a), -Math.cos(a)*Math.sin(b)); }
  function stateNow() { return (window.TOOL && window.TOOL.state) || { status: 'idle', origin: 'SZX', destination: 'HND', theme: 'day', duration: 1500000, remaining: 1500000 }; }
  function point(s, t) {
    const math = window.FLIGHT_MATH;
    if (math && math.airports[s.origin] && math.airports[s.destination]) return new T.Vector3(...math.pointAt(s.origin,s.destination,t)).normalize();
    const a = fallbackAirports[s.origin] || fallbackAirports.SZX, b = fallbackAirports[s.destination] || fallbackAirports.HND;
    const p = latLon(a.lat,a.lon), q = latLon(b.lat,b.lon), angle = p.angleTo(q);
    if (angle < 1e-7) return p;
    return p.multiplyScalar(Math.sin((1-t)*angle)/Math.sin(angle)).addScaledVector(q,Math.sin(t*angle)/Math.sin(angle)).normalize();
  }
  const frameMatrix = new T.Matrix4();
  function flightFrame(s, t) {
    const up = point(s,t), before = point(s,Math.max(0,t-.0002)), after = point(s,Math.min(1,t+.0002));
    const forward = after.sub(before); forward.addScaledVector(up,-forward.dot(up));
    if (forward.lengthSq() < 1e-12) {
      forward.set(0,1,0).addScaledVector(up,-up.y);
      if (forward.lengthSq() < 1e-12) forward.set(1,0,0).addScaledVector(up,-up.x);
    }
    forward.normalize();
    const right = new T.Vector3().crossVectors(up,forward).normalize();
    forward.crossVectors(right,up).normalize();
    return { up, forward, right, quaternion: new T.Quaternion().setFromRotationMatrix(frameMatrix.makeBasis(right,up,forward)) };
  }
  function clearGroup(group) { while (group.children.length) { const child = group.children[0]; group.remove(child); if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); } }
  function rebuildRoute(s) {
    const key = s.origin + ':' + s.destination; if (key === routeKey) return;
    routeKey = key; clearGroup(routeGroup); clearGroup(markers);
    const positions = new Float32Array(241*3);
    for (let i = 0; i <= 240; i++) point(s,i/240).multiplyScalar(R+.48).toArray(positions,i*3);
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position',new T.BufferAttribute(positions,3));
    routeLine = new T.Line(geometry,new T.LineBasicMaterial({ color: 0xd6b579, transparent: true, opacity: .4 })); routeGroup.add(routeLine);
    const completeGeo = geometry.clone(); completeGeo.setDrawRange(0,1);
    completedLine = new T.Line(completeGeo,new T.LineBasicMaterial({ color: 0xffd699, transparent: true, opacity: .9 })); routeGroup.add(completedLine);
    [0,1].forEach((t,i) => {
      const pin = new T.Mesh(new T.SphereGeometry(.32,12,8),new T.MeshBasicMaterial({ color: i ? 0xf5deae : 0x9cc7d3 })); pin.position.copy(point(s,t).multiplyScalar(R+.62)); markers.add(pin);
      const ring = new T.Mesh(new T.RingGeometry(.64,.77,36),new T.MeshBasicMaterial({ color: 0xe8bf83, transparent: true, opacity: .7, side: T.DoubleSide, depthWrite: false }));
      ring.position.copy(point(s,t).multiplyScalar(R+.55)); ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),point(s,t)); markers.add(ring);
    });
    const math = window.FLIGHT_MATH;
    totalDistance = math && math.airports[s.origin] && math.airports[s.destination] ? math.distance(s.origin,s.destination) : point(s,0).angleTo(point(s,1))*6371;
  }
  const contrails = new T.Group(); contrails.name = 'contrails'; scene.add(contrails);
  const trailSegments = 64, trailMeshes = [];
  const trailMaterial = new T.ShaderMaterial({
    vertexShader: 'attribute float alpha;varying float vA;void main(){vA=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying float vA;void main(){gl_FragColor=vec4(0.85,0.9,0.94,vA);}',
    transparent: true, side: T.DoubleSide, depthWrite: false
  });
  for (let side = -1; side <= 1; side += 2) {
    const g = new T.BufferGeometry(), alphas = new Float32Array((trailSegments+1)*2), indices = [];
    g.setAttribute('position',new T.BufferAttribute(new Float32Array((trailSegments+1)*6),3).setUsage(T.DynamicDrawUsage));
    for (let i = 0; i <= trailSegments; i++) {
      const fraction = i/trailSegments; alphas[i*2] = alphas[i*2+1] = Math.pow(fraction,.7)*.46;
      if (i < trailSegments) { const j = i*2; indices.push(j,j+1,j+2,j+1,j+3,j+2); }
    }
    g.setAttribute('alpha',new T.BufferAttribute(alphas,1)); g.setIndex(indices);
    const mesh = new T.Mesh(g,trailMaterial); mesh.userData.side = side; mesh.frustumCulled = false; contrails.add(mesh); trailMeshes.push(mesh);
  }
  let trailKey = '', contrailSamples = 0;
  function updateTrails(s, progress) {
    contrails.visible = layers.plane && (s.status === 'running' || s.status === 'paused') && progress > .003 && progress < .999;
    if (!contrails.visible) { contrailSamples = 0; return; }
    const key = routeKey+':'+progress.toFixed(7)+':'+view+':'+(satellite&&satellite.localView);
    contrailSamples = (trailSegments+1)*2;
    if (key === trailKey) return; trailKey = key;
    const local=view==='follow'&&satellite&&satellite.localView;
    const span = Math.min(progress,local?Math.min(.075,12/Math.max(1,totalDistance)):.075), visualScale = view === 'globe' ? .74 : local?.0025:.45;
    for (let i = 0; i <= trailSegments; i++) {
      const fraction = i/trailSegments, t = progress-span*(1-fraction), f = flightFrame(s,t);
      const math = window.FLIGHT_MATH, height = math ? math.altitude(t) : 11;
      const radius=local?R+.0125+height*R/6371:R+1+height*.05;
      const center = f.up.clone().multiplyScalar(radius).addScaledVector(f.forward,-visualScale*.95);
      const width = local?.00005+(1-fraction)*.0006:.02+(1-fraction)*.14;
      for (const mesh of trailMeshes) {
        const pos = mesh.geometry.attributes.position;
        const middle = center.clone().addScaledVector(f.right,mesh.userData.side*visualScale*1.65);
        const left = middle.clone().addScaledVector(f.right,-width), right = middle.clone().addScaledVector(f.right,width);
        pos.setXYZ(i*2,left.x,left.y,left.z); pos.setXYZ(i*2+1,right.x,right.y,right.z);
      }
    }
    for (const mesh of trailMeshes) mesh.geometry.attributes.position.needsUpdate = true;
    contrailSamples = (trailSegments+1)*2;
  }
  let view = 'follow', lastTheme = '', drawn = 0, positionProgress = 0, altitude = 0, lat = 0, lon = 0;
  let lastLabel = 0, lastLabelKey = '', yaw = 0, pitch = 0, zoom = 1;
  const satellite=window.createSatelliteLayer?window.createSatelliteLayer(T,scene,renderer,()=>draw()):null;
  function text(id, value) { const el = $(id); if (el && el.textContent !== value) el.textContent = value; }
  function updateFlight(now) {
    const s = stateNow(), math = window.FLIGHT_MATH;
    rebuildRoute(s);
    const fallbackProgress = s.status === 'idle' ? 0 : s.status === 'done' ? 1 : 1 - (s.status === 'running' ? Math.max(0,(s.deadline || now)-now) : s.remaining) / Math.max(1,s.duration);
    positionProgress = Math.max(0,Math.min(1,math ? math.progress(s,now) : fallbackProgress || 0));
    altitude = Math.max(0,math ? math.altitude(positionProgress) : 11*Math.min(1,positionProgress/.08,(1-positionProgress)/.12));
    const frame = flightFrame(s,positionProgress);
    // Plane size and clearance are intentionally illustrative, not geospatial scale.
    const local=view==='follow'&&satellite&&satellite.localView;
    const follow=window.SATELLITE_MATH?SATELLITE_MATH.follow(altitude,zoom,local):{radius:R+1+altitude*.05,scale:.45,distance:16*zoom,near:.1,ahead:.65};
    if(local&&stage.clientWidth<=680)follow.distance*=1.55;
    aircraft.position.copy(frame.up).multiplyScalar(view==='globe'?R+1+altitude*.05:follow.radius);
    aircraft.quaternion.copy(frame.quaternion); aircraft.scale.setScalar(view === 'globe' ? .74 : follow.scale);
    const near=view==='follow'?follow.near:.1;if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix()}
    clouds.visible=layers.clouds&&!!cloudMap&&!local;
    routeGroup.visible=markers.visible=layers.route&&!local;
    updateTrails(s,positionProgress);
    completedLine.geometry.setDrawRange(0,Math.max(1,Math.floor(positionProgress*240)+1));
    lat = Math.asin(frame.up.y)*180/Math.PI; lon = Math.atan2(-frame.up.z,frame.up.x)*180/Math.PI;
    const labelKey = routeKey + ':' + s.status;
    if (now-lastLabel > 250 || labelKey !== lastLabelKey) {
      text('worldPosition',Math.abs(lat).toFixed(2)+'° '+(lat>=0?'N':'S')+' · '+Math.abs(lon).toFixed(2)+'° '+(lon>=0?'E':'W'));
      text('worldDistance',Math.round(totalDistance*(1-positionProgress)).toLocaleString()+' km remaining');
      text('worldAltitude',altitude.toFixed(1)+' km'); lastLabel = now; lastLabelKey = labelKey;
    }
    if (s.theme !== lastTheme) {
      const night = s.theme === 'night'; lastTheme = s.theme;
      renderer.toneMappingExposure = night ? .82 : 1.15;
      sun.color.set(night ? 0x839ebc : 0xffecd5); sun.intensity = night ? .5 : 2.5;
      earth.material.emissive.set(night ? 0x13233e : 0x000000); earth.material.emissiveMap = earthMap; earth.material.emissiveIntensity = night ? .28 : 0;
      starfield.material.opacity = night ? .72 : .28;
      atmosphere.material.uniforms.strength.value = night ? .3 : .52;
    }
    const lightDirection = frame.up.clone().multiplyScalar(160).addScaledVector(frame.right,100).addScaledVector(frame.forward,70);
    sun.position.copy(lightDirection);
    if (view === 'follow') {
      const az = yaw, el = Math.max(.42,Math.min(1.5,1.02+pitch)), d = follow.distance;
      const tangent = frame.forward.clone().multiplyScalar(-Math.cos(az)).addScaledVector(frame.right,Math.sin(az));
      camera.position.copy(aircraft.position).addScaledVector(frame.up,Math.sin(el)*d).addScaledVector(tangent,Math.cos(el)*d);
      camera.up.copy(frame.forward); camera.lookAt(aircraft.position.clone().addScaledVector(frame.forward,follow.ahead));
    } else {
      const center = point(s,.5), north = new T.Vector3(0,1,0).addScaledVector(center,-center.y).normalize();
      if (north.lengthSq() < 1e-9) north.set(1,0,0);
      const east = new T.Vector3().crossVectors(north,center).normalize();
      const orbit = center.clone().multiplyScalar(Math.cos(pitch)*Math.cos(yaw)).addScaledVector(east,Math.cos(pitch)*Math.sin(yaw)).addScaledVector(north,Math.sin(pitch)).normalize();
      const verticalHalf = camera.fov*Math.PI/360;
      const horizontalHalf = Math.atan(Math.tan(verticalHalf)*camera.aspect);
      const fitDistance = (R+2)*1.04/(Math.sin(Math.min(verticalHalf,horizontalHalf))*.86);
      const routeDistance = (R+2)*1.12/(Math.max(.04,Math.cos(totalDistance/6371/2))*.86);
      camera.position.copy(orbit).multiplyScalar(Math.max(320,fitDistance,routeDistance)*zoom); camera.up.copy(north); camera.lookAt(0,0,0);
    }
    if(satellite)satellite.update({view,camera,lat,lon,state:s,aircraft,visible:layers.earth});
    return { s, frame };
  }
  function resize() {
    const box = stage.getBoundingClientRect(), w = Math.max(1, box.width), h = Math.max(1, box.height);
    camera.aspect = w / h;
    // Keep the aircraft/globe in the visible world area, not under the boarding pass.
    camera.setViewOffset(w, h, w <= 680 ? 0 : Math.min(130, w * .10), w <= 680 ? h * .235 : 0, w, h);
    camera.updateProjectionMatrix(); renderer.setSize(w, h, false); draw();
  }
  function draw() {
    if (document.hidden || contextLost) return;
    updateFlight(Date.now());
    renderer.render(scene, camera); drawn++;
  }
  function setLayers(values) {
    for (const key of Object.keys(layers)) if (typeof values[key] === 'boolean') layers[key] = values[key];
    earth.visible = layers.earth; clouds.visible = layers.clouds && !!cloudMap;
    atmosphere.visible = layers.earth; aircraft.visible = layers.plane; routeGroup.visible = markers.visible = layers.route; draw();
  }
  function reset() { yaw = pitch = 0; zoom = 1; draw(); }
  function setView(mode) {
    if (mode !== 'follow' && mode !== 'globe') return;
    view = mode; yaw = pitch = 0; zoom = 1;
    for (const id of ['followView','globeView']) { const el = $(id); if (el) el.setAttribute('aria-pressed',String(id === view+'View')); }
    text('worldHint', view === 'follow' ? 'Local flight view · drag to orbit · scroll or pinch to zoom' : 'Route overview · drag to orbit · scroll or pinch to zoom');
    draw();
  }
  for (const mode of ['follow','globe']) { const el = $(mode+'View'); if (el) el.addEventListener('click',() => setView(mode)); }
  if ($('recenterView')) $('recenterView').addEventListener('click',reset);
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  const pointers = new Map(); let pinchDistance = 0;
  function pinchLength() { const p = [...pointers.values()]; return p.length > 1 ? Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y) : 0; }
  function changeZoom(factor) { zoom = Math.max(view === 'follow' ? .65 : .86,Math.min(view === 'follow' ? 2.6 : 1.65,zoom*factor)); draw(); }
  canvas.addEventListener('pointerdown',e => {
    if (e.button !== undefined && e.button !== 0) return;
    pointers.set(e.pointerId,{ x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, dragged: false });
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* Detached canvas. */ }
    if (pointers.size > 1) pinchDistance = pinchLength();
  });
  canvas.addEventListener('pointermove',e => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const oldX = p.x, oldY = p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size > 1) {
      const distance = pinchLength();
      if (pinchDistance > 0 && distance > 0) changeZoom(pinchDistance/distance);
      pinchDistance = distance; e.preventDefault(); return;
    }
    if (!p.dragged && Math.hypot(p.x-p.startX,p.y-p.startY) <= 6) return;
    const dx = p.dragged ? p.x-oldX : p.x-p.startX, dy = p.dragged ? p.y-oldY : p.y-p.startY;
    p.dragged = true; canvas.style.cursor = 'grabbing';
    yaw -= dx*.006; pitch = Math.max(-.6,Math.min(.6,pitch+dy*.004)); e.preventDefault(); draw();
  });
  function releasePointer(e) {
    pointers.delete(e.pointerId); pinchDistance = 0; canvas.style.cursor = 'grab';
    for (const p of pointers.values()) { p.startX = p.x; p.startY = p.y; p.dragged = false; }
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* Already released. */ }
  }
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,releasePointer);
  canvas.addEventListener('wheel',e => {
    e.preventDefault(); const delta = e.deltaY*(e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 300 : 1);
    changeZoom(Math.exp(Math.max(-1,Math.min(1,delta*.001))));
  },{ passive: false });
  window.WORLD = {
    draw, setView, reset, get view() { return view; }, renderer, scene, camera, aircraft,
    layers, setLayers, get diagnostics() { return { positionProgress, lat, lon, altitude, mode: view, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frames: drawn, zoom, yaw, pitch, routeDistance: totalDistance, distanceRemaining: totalDistance*(1-positionProgress), contrailSamples, cloudRotation: clouds.rotation.y, reducedMotion, textureReady: !!earthMap && !!earthMap.image, pixelRatio: Math.min(window.devicePixelRatio || 1,2) }; }
  };
  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = !!(motionQuery && motionQuery.matches), frameHandle = null, timerHandle = null, lastFrameTime = 0, lastSignature = '';
  function signature(s) { return [s.status,s.origin,s.destination,s.theme,s.duration,s.remaining,s.deadline].join('|'); }
  function stop() {
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    if (timerHandle !== null) clearTimeout(timerHandle);
    frameHandle = timerHandle = null;
  }
  function schedule() {
    if (document.hidden || contextLost) return;
    if (stateNow().status === 'running') frameHandle = requestAnimationFrame(animate);
    else timerHandle = setTimeout(() => animate(performance.now()),250);
  }
  let contextLost = false;
  function animate(time) {
    frameHandle = timerHandle = null;
    if (document.hidden || contextLost) return;
    const s = stateNow(), active = s.status === 'running', key = signature(s), interval = reducedMotion ? 1000/15 : 1000/30;
    if (active && time-lastFrameTime >= interval || key !== lastSignature) {
      if (active && !reducedMotion && lastFrameTime) clouds.rotation.y += Math.min(.1,Math.max(0,(time-lastFrameTime)/1000))*.0008;
      lastFrameTime = time; lastSignature = key; draw();
    }
    schedule();
  }
  document.addEventListener('visibilitychange',() => {
    stop(); lastFrameTime = 0;
    if (!document.hidden) { draw(); schedule(); }
  });
  canvas.addEventListener('webglcontextlost',e => {
    e.preventDefault(); contextLost = true; stop();
    const error = $('worldError'); if (error) { error.hidden = false; error.classList.remove('hidden'); error.textContent = '3D graphics paused while the browser restores its graphics context. Your focus timer is still running.'; }
  });
  canvas.addEventListener('webglcontextrestored',() => {
    contextLost = false; const error = $('worldError'); if (error) error.hidden = true;
    lastFrameTime = 0; draw(); schedule();
  });
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change',e => { reducedMotion = e.matches; });
  resize(); setView('follow'); lastSignature = signature(stateNow()); schedule();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize',resize);
})();
