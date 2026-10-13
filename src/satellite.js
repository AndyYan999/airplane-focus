/* Optional online imagery: EOX Sentinel-2 cloudless 2025, non-commercial use. */
(()=>{'use strict';
window.createSatelliteLayer=function(T,scene,renderer,onChange){
 const M=window.SATELLITE_MATH,$=id=>document.getElementById(id),R=100;
 const SOURCE='https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/';
 const group=new T.Group();group.name='satellite-imagery';scene.add(group);
 const cache=new Map(),sphere=new T.Sphere(new T.Vector3(),R),ray=new T.Raycaster(),hit=new T.Vector3();
 let enabled=true,unavailable=false,offline=!navigator.onLine,queue=[],pending=0,totalLoaded=0,failed=0,currentZoom=14,visibleLoaded=0,wanted=new Set(),lastPlan=0,lastRequest=0,pumpTimer=null,lastMode='follow',lastLat=0,lastTheme='day',disposed=false,allowed=true,detailLoaded=0,backgroundZoom=14;
 try{enabled=localStorage.getItem('airspace-hd-satellite')!=='off'}catch(e){}
 function inform(){
  const active=allowed&&enabled&&!offline&&!unavailable&&lastMode==='follow';group.visible=active;
  visibleLoaded=detailLoaded=0;for(const [key,t] of cache){if(t.mesh){t.mesh.visible=active&&wanted.has(key);if(t.mesh.visible){visibleLoaded++;if(t.z===14)detailLoaded++}}}
  const hasVisible=visibleLoaded>0;
  const credit=$('satelliteCredit');if(credit)credit.hidden=!hasVisible;
  document.body.classList.toggle('satellite-visible',hasVisible);
  const btn=$('satelliteToggle');if(btn){btn.setAttribute('aria-pressed',String(enabled));btn.textContent=enabled?'HD satellite · on':'HD satellite · off'}
  const label=$('satelliteState');let text=!enabled?'Offline Earth texture':lastMode==='globe'?'Global Earth view':offline||unavailable?'Satellite unavailable · offline Earth':hasVisible?'Sentinel-2 · '+M.meters(lastLat,detailLoaded?14:backgroundZoom).toFixed(0)+' m / pixel detail'+(pending?' · loading…':''):'Loading Sentinel-2 imagery…';
  if(label&&label.textContent!==text)label.textContent=text;
 }
 function disposeEntry(t){t.status='disposed';if(t.mesh){group.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.map.dispose();t.mesh.material.dispose()}if(t.timer)clearTimeout(t.timer)}
 function trim(){if(cache.size<=160)return;const candidates=[...cache].filter(([k,t])=>!wanted.has(k)&&t.status!=='loading').sort((a,b)=>a[1].used-b[1].used);for(const [k,t] of candidates){if(cache.size<=160)break;disposeEntry(t);cache.delete(k)}}
 function geometry(t){
  const segments=8,vertices=[],uv=[],index=[];const n=2**t.z,r=R+.00025+t.z*.00001;
  for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
   const lon=M.lon(t.x+i/segments,t.z)*Math.PI/180,lat=M.lat(t.y+j/segments,t.z)*Math.PI/180;
   vertices.push(r*Math.cos(lat)*Math.cos(lon),r*Math.sin(lat),-r*Math.cos(lat)*Math.sin(lon));uv.push(i/segments,1-j/segments);
   if(i<segments&&j<segments){const a=j*(segments+1)+i;index.push(a,a+segments+1,a+1,a+1,a+segments+1,a+segments+2)}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeBoundingSphere();return g;
 }
 function load(t){
  t.status='loading';pending++;lastRequest=performance.now();const img=new Image();img.crossOrigin='anonymous';let settled=false;
  function done(ok){if(settled)return;settled=true;clearTimeout(t.timer);pending--;t.status=ok?'ready':'failed';t.used=performance.now();
   if(ok){const tex=new T.Texture(img);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());tex.needsUpdate=true;
    const material=new T.MeshBasicMaterial({map:tex,color:lastTheme==='night'?0x7191b3:0xffffff,side:T.DoubleSide,toneMapped:false});t.mesh=new T.Mesh(geometry(t),material);t.mesh.name='sentinel-'+t.key;t.mesh.renderOrder=t.z;group.add(t.mesh);totalLoaded++;
   }else{failed++;if(totalLoaded===0&&failed>=6){unavailable=true;queue=[]}}
   inform();trim();onChange();pump();
  }
  img.onload=()=>done(true);img.onerror=()=>done(false);t.timer=setTimeout(()=>{done(false);img.src=''},12000);img.src=SOURCE+t.z+'/'+t.y+'/'+t.x+'.jpg';
 }
 function pump(){
  if(disposed||!enabled||offline||unavailable||lastMode!=='follow'||document.hidden)return;
  queue=queue.filter(t=>wanted.has(t.key)&&t.status==='queued');
  if(!queue.length||pending>=4)return;
  const gap=180-(performance.now()-lastRequest);
  if(gap>0){if(pumpTimer===null)pumpTimer=setTimeout(()=>{pumpTimer=null;pump()},gap);return}
  load(queue.shift());if(queue.length)pump();
 }
 function footprint(camera,latitude,longitude,aircraft){
  camera.updateMatrixWorld();const points=[];
  for(const x of [-1,0,1])for(const y of [-1,0,1]){ray.setFromCamera(new T.Vector2(x,y),camera);if(ray.ray.intersectSphere(sphere,hit)){let lon=Math.atan2(-hit.z,hit.x)*180/Math.PI;lon=longitude+((lon-longitude+540)%360)-180;points.push({lat:Math.asin(hit.y/R)*180/Math.PI,lon})}}
  if(!points.length)return {west:longitude-.04,east:longitude+.04,north:latitude+.04,south:latitude-.04};
  const b={west:Math.min(...points.map(p=>p.lon)),east:Math.max(...points.map(p=>p.lon)),north:Math.max(...points.map(p=>p.lat)),south:Math.min(...points.map(p=>p.lat))};
  const padLon=(b.east-b.west)*.08+.002,padLat=(b.north-b.south)*.08+.002;
  b.west-=padLon;b.east+=padLon;b.north=Math.min(85,b.north+padLat);b.south=Math.max(-85,b.south-padLat);
  b.detailLat=latitude;b.detailLon=longitude;if(aircraft){const f=aircraft.position.clone().project(camera);ray.setFromCamera(new T.Vector2(f.x,f.y),camera);if(ray.ray.intersectSphere(sphere,hit)){b.detailLat=Math.asin(hit.y/R)*180/Math.PI;b.detailLon=Math.atan2(-hit.z,hit.x)*180/Math.PI}}return b;
 }
 function update({view,camera,lat,lon,state,aircraft,visible=true}){
  lastMode=view;lastLat=lat;allowed=visible;group.visible=visible&&enabled&&!offline&&!unavailable&&view==='follow';
  if(state.theme!==lastTheme){lastTheme=state.theme;for(const t of cache.values())if(t.mesh)t.mesh.material.color.set(lastTheme==='night'?0x7191b3:0xffffff)}
  if(!group.visible){for(const t of cache.values())if(t.mesh)t.mesh.visible=false;inform();group.visible=false;return}
  const now=performance.now();if(now-lastPlan<250){pump();return}lastPlan=now;
  const b=footprint(camera,lat,lon,aircraft),plan=M.plan(b,state.status==='running'?13:14,36);backgroundZoom=plan.zoom;
  const detail=plan.zoom<14?M.detail(b.detailLat??lat,b.detailLon??lon):[];currentZoom=detail.length?14:plan.zoom;
  const center=M.tile(lat,lon,plan.zoom);plan.tiles.sort((a,b)=>(a.rawX-center.x)**2+(a.y-center.y)**2-((b.rawX-center.x)**2+(b.y-center.y)**2));
  const near=M.tile(b.detailLat??lat,b.detailLon??lon,14);detail.sort((a,b)=>(a.rawX-near.x)**2+(a.y-near.y)**2-((b.rawX-near.x)**2+(b.y-near.y)**2));
  const tiles=[...new Map([...detail,...plan.tiles].map(t=>[t.key,t])).values()];wanted=new Set(tiles.map(t=>t.key));
  for(const t of tiles){let entry=cache.get(t.key);if(!entry){entry={...t,status:'queued',used:now};cache.set(t.key,entry);queue.push(entry)}else entry.used=now}
  inform();trim();pump();
 }
 function retryFailed(){for(const [key,t] of cache)if(t.status==='failed'||t.status==='queued'){t.status='disposed';cache.delete(key)}}
 function setEnabled(value){enabled=!!value;unavailable=false;failed=0;if(enabled)retryFailed();lastPlan=0;try{localStorage.setItem('airspace-hd-satellite',enabled?'on':'off')}catch(e){}inform();onChange()}
 const toggle=$('satelliteToggle');if(toggle)toggle.addEventListener('click',()=>setEnabled(!enabled));
 window.addEventListener('offline',()=>{offline=true;inform();onChange()});window.addEventListener('online',()=>{offline=false;unavailable=false;failed=0;retryFailed();lastPlan=0;inform();onChange()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastPlan=0;onChange();pump()}});
 const api={update,setEnabled,group,get enabled(){return enabled},get localView(){return enabled&&!offline&&!unavailable},get diagnostics(){return {enabled,offline,unavailable,mode:lastMode,zoom:currentZoom,backgroundZoom,detailTiles:detailLoaded,visibleTiles:visibleLoaded,loading:pending,queued:queue.filter(t=>wanted.has(t.key)&&t.status==='queued').length,cacheSize:cache.size,totalLoaded,failed,metersPerPixel:M.meters(lastLat,currentZoom),provider:'EOX Sentinel-2 cloudless 2025',tileUrl:SOURCE}}};
 window.SATELLITE=api;inform();return api;
};})();
