(()=>{'use strict';
const airports={SZX:{lat:22.6393,lon:113.8107,name:'Shenzhen'},HND:{lat:35.5494,lon:139.7798,name:'Tokyo'},SIN:{lat:1.3644,lon:103.9915,name:'Singapore'},LHR:{lat:51.4700,lon:-.4543,name:'London'},JFK:{lat:40.6413,lon:-73.7781,name:'New York'},CDG:{lat:49.0097,lon:2.5479,name:'Paris'},SYD:{lat:-33.9399,lon:151.1753,name:'Sydney'},KEF:{lat:63.9850,lon:-22.6056,name:'Reykjavík'}};
const rad=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function vector(a){const p=a.lat*rad,l=a.lon*rad;return [Math.cos(p)*Math.cos(l),Math.sin(p),-Math.cos(p)*Math.sin(l)]}
function coordinates(v){const r=Math.hypot(...v);return {lat:Math.asin(clamp(v[1]/r,-1,1))/rad,lon:Math.atan2(-v[2],v[0])/rad}}
function pointAt(from,to,t){const a=vector(airports[from]),b=vector(airports[to]),p=clamp(t,0,1),dot=clamp(a.reduce((s,x,i)=>s+x*b[i],0),-1,1),angle=Math.acos(dot);if(angle<1e-8)return a;const u=Math.sin((1-p)*angle)/Math.sin(angle),v=Math.sin(p*angle)/Math.sin(angle);return a.map((x,i)=>x*u+b[i]*v)}
function progress(state,now=Date.now()){if(state.status==='idle')return 0;if(state.status==='done')return 1;const remaining=state.status==='running'?state.deadline-now:state.remaining;return clamp(1-remaining/state.duration,0,1)}
function distance(from,to){if(from===to)return 0;const a=vector(airports[from]),b=vector(airports[to]);return 6371*Math.acos(clamp(a.reduce((s,x,i)=>s+x*b[i],0),-1,1))}
function altitude(p){const q=clamp(p,0,1);return 11*Math.sin(Math.min(q/.08,(1-q)/.13,1)*Math.PI/2)}
window.FLIGHT_MATH={airports,vector,coordinates,pointAt,progress,distance,altitude};
})();
