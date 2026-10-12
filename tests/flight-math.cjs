const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const source=path.join(__dirname,'../src/flight-math.js');
function math(){assert.ok(fs.existsSync(source),'flight mathematics is implemented');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(source,'utf8'),ctx);return ctx.window.FLIGHT_MATH;}
test('great-circle route starts and ends at real airport coordinates',()=>{const m=math();for(const t of [0,1]){const p=m.coordinates(m.pointAt('SZX','HND',t));const a=m.airports[t===0?'SZX':'HND'];assert.ok(Math.abs(p.lat-a.lat)<1e-8);assert.ok(Math.abs(p.lon-a.lon)<1e-8);}});
test('flight progress derives from the live deadline and freezes when paused',()=>{const m=math();assert.equal(typeof m.progress,'function');const s={status:'running',duration:60000,remaining:60000,deadline:100000};assert.equal(m.progress(s,70000),.5);s.status='paused';s.remaining=45000;assert.equal(m.progress(s,90000),.25);s.status='idle';assert.equal(m.progress(s,90000),0);s.status='done';assert.equal(m.progress(s),1);s.status='running';assert.equal(m.progress(s,200000),1);});

test('route distance uses Earth geometry, including zero-distance routes',()=>{const m=math();assert.equal(typeof m.distance,'function');assert.equal(m.distance('SZX','SZX'),0);assert.ok(m.distance('SZX','HND')>2800&&m.distance('SZX','HND')<2950);assert.ok(Math.abs(m.distance('SZX','HND')-m.distance('HND','SZX'))<1e-8);});

test('illustrative altitude is grounded at endpoints and cruises at 11km',()=>{const m=math();assert.equal(typeof m.altitude,'function');assert.equal(m.altitude(0),0);assert.equal(m.altitude(1),0);assert.equal(m.altitude(.5),11);assert.ok(m.altitude(.03)>0&&m.altitude(.03)<11);});

test('all selectable routes remain on the unit sphere and have finite coordinates',()=>{const m=math();for(const a of Object.keys(m.airports))for(const b of Object.keys(m.airports))for(const t of [0,.1,.5,.9,1]){const v=m.pointAt(a,b,t);assert.ok(v.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...v)-1)<1e-8);}});
test('Shenzhen to New York follows the polar great circle',()=>{const m=math();const p=m.coordinates(m.pointAt('SZX','JFK',.5));assert.ok(p.lat>79&&p.lat<80,'midpoint must be near 79N, not straight-line latitude');});
