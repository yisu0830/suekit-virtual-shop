import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { buildHardware } from './hardware.js';
import { buildSeasons } from './seasons.js';
import { buildStreet } from './street.js';
import { buildVisitors } from './visitors.js';
import { mountMetricsPanel } from './metrics-panel.js';
import { shopMetrics } from './metrics-data.js';

// All textures, geometry, lighting and animation are made locally at runtime.
const canvas = document.getElementById('world');
const modelStage = document.querySelector('.model-stage');
mountMetricsPanel(document.getElementById('metrics-panel'), shopMetrics);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(modelStage.clientWidth, modelStage.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#172237', .018);
const camera = new THREE.OrthographicCamera(-10,10,7,-7,.1,100);
camera.position.set(12.8,11.6,16.5);
const controls = new OrbitControls(camera,canvas);
controls.target.set(-.1,2.0,-.2);
controls.enableDamping=true;
controls.dampingFactor=.065;
controls.rotateSpeed=.62;
controls.zoomSpeed=.8;
controls.panSpeed=.7;
controls.minZoom=.6;
controls.maxZoom=3.5;
controls.minPolarAngle=.18;
controls.maxPolarAngle=Math.PI*.475;
controls.touches.ONE=THREE.TOUCH.ROTATE;
controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
controls.update();
function resize(){
  const width=Math.max(1,modelStage.clientWidth),height=Math.max(1,modelStage.clientHeight);
  // Keep the model's apparent size bounded on larger screens while preserving orbit and zoom controls.
  const a=width/height,h=Math.max(15.2,19.0/a,height/68);
  camera.left=-h*a/2;camera.right=h*a/2;camera.top=h/2;camera.bottom=-h/2;
  camera.updateProjectionMatrix();renderer.setSize(width,height,false);
}
new ResizeObserver(resize).observe(modelStage);
addEventListener('resize',resize);resize();
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',()=>canvas.style.cursor='grabbing');
addEventListener('pointerup',()=>canvas.style.cursor='grab');
const skyLight=new THREE.HemisphereLight('#8aa8d3','#313048',1.0);scene.add(skyLight);
const moon=new THREE.DirectionalLight('#95aee7',1.8);
moon.position.set(-5,12,6);moon.castShadow=true;
moon.shadow.mapSize.set(2048,2048);
Object.assign(moon.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:35});
moon.shadow.bias=-.0006;moon.shadow.normalBias=.025;
scene.add(moon);
const gradient=new THREE.DataTexture(new Uint8Array([66,140,213,255]),4,1,THREE.RedFormat);
gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;
const ink=new THREE.LineBasicMaterial({color:'#172538',transparent:true,opacity:.72});
const materials=new Map();
function mat(color,opts={}){
  const key=String(color)+JSON.stringify(opts);
  if(materials.has(key))return materials.get(key);
  const {intensity,...materialOpts}=opts;
  const m=new THREE.MeshToonMaterial({color,gradientMap:gradient,...materialOpts});
  if(opts.intensity!==undefined)m.emissiveIntensity=opts.intensity;
  materials.set(key,m);return m;
}
const geometries=new Map();
function box(w,h,d,x,y,z,m,outline=true,parent=scene){
  const k=`b${w},${h},${d}`;
  if(!geometries.has(k))geometries.set(k,new THREE.BoxGeometry(w,h,d));
  const g=geometries.get(k),o=new THREE.Mesh(g,m);
  o.position.set(x,y,z);o.castShadow=h>.12;o.receiveShadow=true;parent.add(o);
  if(outline){const e=new THREE.LineSegments(new THREE.EdgesGeometry(g,30),ink);o.add(e);}
  return o;
}
function cyl(rt,rb,h,x,y,z,m,segments=12,outline=false,parent=scene){
  const k=`c${rt},${rb},${h},${segments}`;
  if(!geometries.has(k))geometries.set(k,new THREE.CylinderGeometry(rt,rb,h,segments));
  const o=new THREE.Mesh(geometries.get(k),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);
  if(outline)o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,35),ink));
  return o;
}
function tube(points,radius,m,parent=scene){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const o=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*8),radius,6,false),m);
  parent.add(o);o.castShadow=true;return o;
}
function panel(w,h,x,y,z,draw,opts={}){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.max(128,Math.round(1024*h/w));
  draw(c.getContext('2d'),c.width,c.height);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,toneMapped:false});
  const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);
  o.position.set(x,y,z);o.rotation.y=opts.rotY||0;(opts.parent||scene).add(o);return o;
}
function label(w,h,x,y,z,text,bg='#efe7c9',fg='#203b42',opts={}){
  return panel(w,h,x,y,z,(c,W,H)=>{
    c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;
    c.textAlign='center';c.textBaseline='middle';
    const lines=String(text).split('\n');
    c.font=`700 ${Math.min(H*.62/lines.length,W/(Math.max(...lines.map(l=>l.length))*.68))}px "Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
    lines.forEach((l,i)=>c.fillText(l,W/2,H*(i+.5)/lines.length));
  },opts);
}
const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=128;
const hc=haloCanvas.getContext('2d'),hg=hc.createRadialGradient(64,64,0,64,64,64);
hg.addColorStop(0,'rgba(255,255,255,.75)');hg.addColorStop(.25,'rgba(255,255,255,.2)');hg.addColorStop(1,'rgba(255,255,255,0)');hc.fillStyle=hg;hc.fillRect(0,0,128,128);
const haloTex=new THREE.CanvasTexture(haloCanvas);
function glow(x,y,z,color,size,opacity){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));s.position.set(x,y,z);s.scale.set(size,size,1);scene.add(s);return s;}
let randomSeed=81412;
const rng=()=>{randomSeed=(1664525*randomSeed+1013904223)>>>0;return randomSeed/4294967296;};
const ctx={THREE,scene,mat,box,cyl,tube,panel,label,glow,rng};

// The model is contained on one thick, square display plinth.
const plinth=box(12,.47,12,0,-.12,0,mat('#29354c'),true);
const baseRim=box(11.95,.10,11.95,0,.155,0,mat('#44516a'),false);
const baseTop=box(11.84,.018,11.84,0,.214,0,mat('#344357'),false);
// Subtle layered edge reveals the collectible model's physical thickness.
for(const z of [-6.004,6.004])box(11.98,.022,.016,0,-.13,z,mat('#72808a'),false);
for(const x of [-6.004,6.004])box(.016,.022,11.98,x,-.13,0,mat('#72808a'),false);
const asphalt=new THREE.MeshPhysicalMaterial({color:'#263344',roughness:.27,metalness:.24,clearcoat:.9,clearcoatRoughness:.17});
box(12,.03,3.8,0,.237,4.10,asphalt,false);
box(2.66,.03,8.2,4.67,.237,-1.9,asphalt,false);
// Paving is individually jointed rather than a flat grey rectangle.
const pavement=mat('#737d8b'),pavement2=mat('#687888');
box(9.04,.16,1.58,-1.30,.29,1.38,pavement,false);
box(1.05,.16,5.85,2.74,.29,-.64,pavement,false);
box(1.35,.09,7.1,-5.08,.26,-2.27,mat('#526173'),false);
for(let x=-5.75;x<3.18;x+=.55){box(.015,.008,1.50,x,.375,1.38,mat('#4b5a6e'),false);}
for(let z=-3.3;z<2.1;z+=.52)box(1.02,.008,.014,2.74,.375,z,mat('#506078'),false);
for(let x=-5.52;x<3.15;x+=.56)box(.535,.18,.18,x,.305,2.19,mat('#9aa2a4'),true);
for(let z=-3.8;z<2.19;z+=.56)box(.18,.18,.535,3.31,.305,z,mat('#8d9aa8'),true);
// Crossing wraps around the junction; worn paint catches the rainy light.
const paint=mat('#c9d4d2');
for(let x=-3.25;x<1.7;x+=.79)box(.46,.012,2.12,x,.261,4.46,paint,false);
for(let z=-3.4;z<-.4;z+=.66)box(1.83,.012,.37,4.65,.261,z,mat('#afbfc7'),false);
box(4.10,.012,.09,-.3,.262,3.08,paint,false);
box(.09,.012,2.08,4.38,.262,4.12,paint,false);
box(1.24,.012,.07,-4.78,.263,3.54,paint,false);
box(.07,.012,1.62,-5.36,.263,2.76,paint,false);
box(.07,.012,1.62,-4.18,.263,2.76,paint,false);
const parking=label(.65,.67,-4.77,.265,2.72,'P','#34465a','#b8cbcd');parking.rotation.x=-Math.PI/2;
// Channel drain, grates and sewer cover.
box(8.95,.014,.16,-1.34,.267,2.36,mat('#182b3e'),false);
for(let x=-5.6;x<3.1;x+=.13)box(.022,.021,.135,x,.274,2.36,mat('#78868e'),false);
for(let z=-3.8;z<2.1;z+=.13)box(.13,.020,.02,3.46,.271,z,mat('#78868e'),false);
const lid=cyl(.39,.39,.025,1.86,.265,4.43,mat('#435466'),32,true);
for(let i=-3;i<=3;i++)box(.58,.009,.021,1.86,.283,4.43+i*.065,mat('#263b4f'),false);

// One tinted planar reflection, broken up by moving surface ripples.
const reflectionShader={
  uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
  vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec2 groundUv;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 );\ngroundUv = uv;'),
  fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('varying vec4 vUv;','varying vec4 vUv;\nvarying vec2 groundUv;\nuniform float wetTime;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 q=vUv;
    q.x += sin(groundUv.y*280.0+wetTime*1.7)*.0018*q.w;
    q.y += sin(groundUv.x*310.0-wetTime*.7)*.0012*q.w;
    vec4 base = texture2DProj( tDiffuse, q );
    vec2 p=vec2(groundUv.x*12.0-6.0,6.0-groundUv.y*12.0);
    if(p.x<3.38 && p.y<2.24) discard;`).replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',`float puddle=.18+.15*smoothstep(-.3,.8,sin(groundUv.x*47.0)*sin(groundUv.y*39.0));
    gl_FragColor=vec4(base.rgb*vec3(.78,.87,1.0),puddle);`)
};
reflectionShader.uniforms.wetTime={value:0};
const wet=new Reflector(new THREE.PlaneGeometry(12,12),{textureWidth:768,textureHeight:768,clipBias:.001,shader:reflectionShader,multisample:0});
wet.rotation.x=-Math.PI/2;wet.position.y=.280;wet.material.transparent=true;wet.material.depthWrite=false;wet.renderOrder=2;scene.add(wet);

// The reference shop replaces the convenience-store architecture and merchandise.
const hardware=buildHardware(ctx);
ctx.awning=hardware.awning;
const street=buildStreet(ctx);
const seasons=buildSeasons(ctx);
const visitors=buildVisitors(ctx);
const artificialLights=[];
const emissiveMaterials=new Set();
const lightHalos=[];
scene.traverse(o=>{
  if(o.isPointLight||o.isSpotLight){o.userData.nightIntensity=o.intensity;artificialLights.push(o);}
  if(o.isSprite){o.userData.nightOpacity=o.material.opacity;lightHalos.push(o);}
  const list=Array.isArray(o.material)?o.material:[o.material];
  for(const m of list){if(m?.emissive&&(m.emissive.r+m.emissive.g+m.emissive.b)>0){m.userData.nightEmission=m.emissiveIntensity;emissiveMaterials.add(m);}}
});

// Surface-specific small puddles, halos and splashes give painterly reflections.
const puddleGroup=new THREE.Group();scene.add(puddleGroup);
const puddleMat=new THREE.MeshBasicMaterial({color:'#8fafc5',transparent:true,opacity:.085,depthWrite:false});
for(let i=0;i<24;i++){
  const x=rng()*11.1-5.55,z=2.6+rng()*3.1;
  const p=new THREE.Mesh(new THREE.CircleGeometry(.16+rng()*.38,28),puddleMat);
  p.rotation.x=-Math.PI/2;p.scale.y=.45+rng()*.85;p.position.set(x,.289,z);puddleGroup.add(p);
}
const rippleGroup=new THREE.Group();scene.add(rippleGroup);
const rippleGeo=new THREE.RingGeometry(.96,1.0,36),ripples=[];
for(let i=0;i<52;i++){
  const m=new THREE.MeshBasicMaterial({color:i%3===0?'#bbcdce':'#80b3c7',transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false});
  const r=new THREE.Mesh(rippleGeo,m);r.rotation.x=-Math.PI/2;r.position.set(rng()*11.3-5.65,.293,2.55+rng()*3.07);r.userData={phase:rng(),speed:.38+rng()*.36,radius:.17+rng()*.21};rippleGroup.add(r);ripples.push(r);
}
// Rain is clipped to the miniature rather than falling into an infinite world.
const rainN=1050, rainData=[], rainPositions=new Float32Array(rainN*6);
for(let i=0;i<rainN;i++)rainData.push({x:rng()*11.7-5.85,z:rng()*11.7-5.85,y:rng()*7.7,speed:5+rng()*3,len:.15+rng()*.20});
const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:'#a8cada',transparent:true,opacity:.22,depthWrite:false}));rain.frustumCulled=false;scene.add(rain);
const drips=[];
for(let i=0;i<30;i++){
  const m=new THREE.MeshBasicMaterial({color:'#b6d8e1',transparent:true,opacity:.35,depthWrite:false});
  const a=hardware.awning,fromAwning=i>=20;
  const x=fromAwning?a.x+(rng()-.5)*a.width:-3.82+rng()*5.46;
  const z=fromAwning?a.zFront+.028:.85,top=fromAwning?a.yFront-.085:5.45;
  const d=new THREE.Mesh(new THREE.SphereGeometry(.018,5,4),m);d.position.set(x,top,z);d.scale.y=2.4;
  d.name=fromAwning?'entrance-awning-drip':'roof-drip';
  d.userData={x,phase:rng(),speed:.6+rng()*.7,top,bottom:fromAwning?.55:.45};scene.add(d);drips.push(d);
}
// A soft contact shadow belongs to the physical display base.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,28,64,64,64);sg.addColorStop(0,'rgba(0,0,0,.5)');sg.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(17.2,17.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.6}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.39;scene.add(shadow);

// A season and a time of day are independent, persistent choices.
const seasonNames=['spring','summer','autumn','winter'];
const modeNames=['day','night'];
let state={mode:'day',season:'spring'};
try{const saved=JSON.parse(localStorage.getItem('suekit-miniature-state')||'null');if(saved){if(modeNames.includes(saved.mode))state.mode=saved.mode;if(seasonNames.includes(saved.season))state.season=saved.season;}}catch{}
const modeButtons=[...document.querySelectorAll('[data-mode-choice]')];
const seasonButtons=[...document.querySelectorAll('[data-season-choice]')];
function recordState(){
  const root=document.documentElement;
  root.dataset.artificialLightsOn=String(artificialLights.filter(l=>l.intensity>0).length);
  root.dataset.emissiveMaterialsOn=String([...emissiveMaterials].filter(m=>m.emissiveIntensity>0).length);
  root.dataset.activeSeasons=Object.entries(seasons.seasonGroups).filter(([,g])=>g.visible).map(([name])=>name).join(',');
  let objects=0;scene.traverse(()=>objects++);root.dataset.sceneObjects=String(objects);
  root.dataset.doorAngles=(hardware.doors||[]).map(d=>d.rotation.y.toFixed(3)).join(',');
  root.dataset.customerCount=String(visitors.count);
  root.dataset.assetRequests=String(visitors.traffic.assetRequests);
  root.dataset.customerSource=visitors.traffic.source;
  root.dataset.customerActivities=visitors.people.map(p=>p.state).join(',');
  root.dataset.customerPositions=visitors.people.map(p=>p.group.position.toArray().map(v=>v.toFixed(3)).join(',')).join(';');
  root.dataset.entranceOpening=visitors.opening.toFixed(3);
}
function applyState(){
  const night=state.mode==='night',summer=state.season==='summer';
  document.documentElement.dataset.mode=state.mode;
  document.documentElement.dataset.season=state.season;
  document.querySelector('meta[name="color-scheme"]').content=night?'dark':'light';
  for(const b of modeButtons)b.setAttribute('aria-pressed',String(b.dataset.modeChoice===state.mode));
  for(const b of seasonButtons)b.setAttribute('aria-pressed',String(b.dataset.seasonChoice===state.season));
  const daylight={spring:'#ffe9c3',summer:'#fff3d4',autumn:'#ffd4a3',winter:'#dfebf5'};
  skyLight.color.set(night?'#829bc5':daylight[state.season]);
  skyLight.groundColor.set(night?'#333147':'#999588');skyLight.intensity=night?.78:2.05;
  moon.color.set(night?'#abc1ed':daylight[state.season]);moon.intensity=night?1.25:2.45;
  moon.position.set(night?-5:-7,night?12:13,night?6:9);
  scene.fog.color.set(night?'#19253a':state.season==='winter'?'#e4ebef':'#eee7db');
  scene.fog.density=night?.012:.007;
  renderer.toneMappingExposure=night?1.10:.99;
  ink.color.set(night?'#182636':'#574940');ink.opacity=night?.68:.48;
  plinth.material.color.set(night?'#29354c':'#a2a29a');
  baseRim.material.color.set(night?'#44516a':'#bbb9ad');
  baseTop.material.color.set(night?'#344357':'#91958f');
  asphalt.color.set(night?'#263344':'#687273');
  asphalt.roughness=.82;asphalt.metalness=.02;asphalt.clearcoat=0;
  for(const l of artificialLights)l.intensity=night?l.userData.nightIntensity:0;
  for(const m of emissiveMaterials)m.emissiveIntensity=night?m.userData.nightEmission:0;
  for(const s of lightHalos)s.visible=night;
  for(const m of hardware.glassStreakMaterials||[])m.visible=false;
  for(const p of hardware.unlitPanels||[])p.material.color.set(night?'#ffead4':'#ffffff');
  seasons.setSeason(state.season);
  wet.visible=false;puddleGroup.visible=false;rippleGroup.visible=false;rain.visible=false;
  rain.material.color.set(night?'#9dc3d4':'#496d83');rain.material.opacity=night?.23:.43;
  for(const d of drips)d.visible=false;
  shadow.material.opacity=night?.6:.30;
  renderer.shadowMap.needsUpdate=true;
  recordState();
  document.documentElement.dataset.weather=summer?'clear':state.season==='winter'?'snow':state.season==='spring'?'petals':'leaves';
  try{localStorage.setItem('suekit-miniature-state',JSON.stringify(state));}catch{}
}
for(const b of modeButtons)b.addEventListener('click',()=>{state.mode=b.dataset.modeChoice;applyState();});
for(const b of seasonButtons)b.addEventListener('click',()=>{state.season=b.dataset.seasonChoice;applyState();});
renderer.shadowMap.autoUpdate=false;
applyState();
const start=performance.now();let last=start,frameCounter=0;
function animate(now){
  requestAnimationFrame(animate);
  const t=(now-start)/1000,dt=Math.min((now-last)/1000,.045);last=now;
  controls.update();seasons.update(t,dt);
  const night=state.mode==='night';
  const customersMoving=visitors.update(t,dt);
  const opening=visitors.opening;
  for(const door of hardware.doors||[]){door.rotation.y=(door.userData.closedAngle||0)+opening*door.userData.openDirection*(door.userData.openAngle||Math.PI*4/9);}
  if((customersMoving||opening>0)&&frameCounter%10===0)renderer.shadowMap.needsUpdate=true;
  if(hardware.signBox?.material.emissive)hardware.signBox.material.emissiveIntensity=night?hardware.signBox.material.userData.nightEmission*(.97+.03*Math.sin(t*3.7)):0;
  for(const s of hardware.glassStreakMaterials||[])if(s.uniforms.time)s.uniforms.time.value=t;
  if(street.signalMaterials?.length){const active=Math.floor(t/7)%3;street.signalMaterials.forEach((m,i)=>{m.emissiveIntensity=night?(i===active?1.2:.04):0;});}
  renderer.render(scene,camera);
  frameCounter++;
  if(frameCounter%30===0)recordState();
  if(frameCounter===3)document.documentElement.dataset.ready='true';
}
requestAnimationFrame(animate);
window.__rainyCorner={scene,camera,controls,renderer,hardware,seasons,visitors,artificialLights,emissiveMaterials,get state(){return{...state};}};
