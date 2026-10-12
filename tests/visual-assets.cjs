const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
function webpDimensions(buf){assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WEBP');assert.equal(buf.toString('ascii',12,16),'VP8 ');assert.equal(buf.subarray(23,26).toString('hex'),'9d012a');return {width:buf.readUInt16LE(26)&0x3fff,height:buf.readUInt16LE(28)&0x3fff};}
test('the two-line credits/disclaimer block is removed from the flight view',()=>{assert.ok(!fs.readFileSync(path.join(root,'src/template.html'),'utf8').includes('class="world-disclaimer"'));});
test('Earth imagery is natively 8192 by 4096 rather than a 4K enlargement',()=>{assert.deepEqual(webpDimensions(fs.readFileSync(path.join(root,'assets/earth.webp'))),{width:8192,height:4096});const sources=JSON.parse(fs.readFileSync(path.join(root,'assets/sources.json'),'utf8'));const earth=sources.find(x=>x.name==='earth.webp');assert.ok(earth.source_width>=8192);assert.ok(earth.source_height>=4096);});
