(()=>{'use strict';const rad=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tile(lat,lon,z){const n=2**z,p=clamp(lat,-85.05112878,85.05112878)*rad;return {x:Math.floor((lon+180)/360*n),y:clamp(Math.floor((1-Math.asinh(Math.tan(p))/Math.PI)/2*n),0,n-1),z}}
function lon(x,z){return x/(2**z)*360-180}
function lat(y,z){return Math.atan(Math.sinh(Math.PI*(1-2*y/(2**z))))/rad}
function bounds(x,y,z){return {west:lon(x,z),east:lon(x+1,z),north:lat(y,z),south:lat(y+1,z)}}
function plan(b,maxZoom=14,maxTiles=64){let z=maxZoom,a,c;for(;z>=2;z--){a=tile(b.north,b.west,z);c=tile(b.south,b.east,z);if((c.x-a.x+1)*(c.y-a.y+1)<=maxTiles)break}const n=2**z,tiles=[];for(let y=a.y;y<=c.y;y++)for(let rawX=a.x;rawX<=c.x;rawX++){const x=((rawX%n)+n)%n;tiles.push({x,y,z,rawX,key:z+'/'+y+'/'+x})}return {zoom:z,tiles}}
function follow(alt,zoom,hd){return hd?{radius:100+.0125+alt*100/6371,scale:.0025,distance:.075*zoom,near:.0001,ahead:.0033}:{radius:101+alt*.05,scale:.45,distance:16*zoom,near:.1,ahead:.65}}
function meters(latitude,z){return 40075016.686*Math.cos(latitude*rad)/(2**z*256)}
function detail(latitude,longitude,z=14){const c=tile(latitude,longitude,z),n=2**z,out=[];for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const y=c.y+dy;if(y<0||y>=n)continue;const rawX=c.x+dx,x=((rawX%n)+n)%n;out.push({x,y,z,rawX,key:z+'/'+y+'/'+x})}return out}
window.SATELLITE_MATH={tile,lon,lat,bounds,plan,follow,meters,detail};})();
