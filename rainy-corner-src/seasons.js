// Seasonal furnishings live in four persistent groups. Switching never allocates.
export function buildSeasons(ctx) {
  const { THREE, scene, mat, box, cyl, tube, rng } = ctx;
  const garden = new THREE.Group(); garden.name = 'suekit-garden'; scene.add(garden);
  const seasonGroups = {};
  for (const name of ['spring', 'summer', 'autumn', 'winter']) {
    const g = new THREE.Group(); g.name = `suekit-${name}`; g.visible = false; g.userData.season = name;
    seasonGroups[name] = g; scene.add(g);
  }
  const bark = mat('#73624e'), twig = mat('#806953'), dirt = mat('#50473e');
  const wood = mat('#a18161'), darkWood = mat('#77604b'), clay = mat('#a17b60');
  const metal = mat('#829293'), darkMetal = mat('#566773');
  const snow = new THREE.MeshLambertMaterial({color:'#e9f1ed'});
  const snowShade = new THREE.MeshLambertMaterial({color:'#cbdcde'});
  const leafGeometry = new THREE.OctahedronGeometry(1, 0);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
  const smallBall = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const seasonalMotion = { spring: [], summer: [], autumn: [], winter: [] };

  // Cedar planter, recessed soil, feet and clean inset panels.
  const leftX = -3.03, leftZ = 1.31;
  box(1.10, .29, .47, leftX, .555, leftZ, wood, true, garden);
  box(.99, .033, .365, leftX, .716, leftZ, dirt, false, garden);
  for (const z of [leftZ-.23, leftZ+.23]) {
    box(1.14,.049,.038,leftX,.727,z,darkWood,false,garden);
    box(.94,.15,.013,leftX,.55,z+(z>leftZ?.012:-.012),clay,false,garden);
  }
  for (const x of [leftX-.54,leftX+.54]) box(.038,.048,.49,x,.727,leftZ,darkWood,false,garden);
  for (const x of [leftX-.36,leftX+.36]) box(.13,.045,.35,x,.398,leftZ,darkWood,false,garden);
  // Two round pots balance the corner without hiding the large shop windows.
  const pots = [{ x: 1.31, z: 1.48, r: .24, y: .71 }, { x: -3.70, z: .96, r: .15, y: .60 }];
  for (const p of pots) {
    cyl(p.r,p.r*.73,p.y-.37,p.x,(p.y+.37)/2,p.z,clay,12,true,garden);
    cyl(p.r*1.05,p.r*1.05,.045,p.x,p.y-.015,p.z,wood,12,false,garden);
    cyl(p.r*.90,p.r*.90,.018,p.x,p.y+.006,p.z,dirt,12,false,garden);
  }

  // A small sidewalk tree has a crooked trunk and eleven real branch forks.
  const treeX = 2.70, treeZ = -1.17;
  box(1.04,.10,1.05,treeX,.427,treeZ,mat('#8f9690'),true,garden);
  box(.89,.022,.90,treeX,.486,treeZ,dirt,false,garden);
  for (let n=0;n<6;n++) {
    const a=n*Math.PI/3;
    tube([[treeX,.55,treeZ],[treeX+Math.cos(a)*.21,.497,treeZ+Math.sin(a)*.21]],.025,bark,garden);
  }
  tube([[treeX,.49,treeZ],[treeX-.07,1.15,treeZ+.035],[treeX+.015,1.72,treeZ-.025],[treeX-.06,2.30,treeZ+.012],[treeX+.015,2.91,treeZ-.02]],.069,bark,garden);
  const clusters = [];
  for (let i=0;i<9;i++) {
    const a=i*2.399963, reach=.42+(i%3)*.10;
    const y=1.73+(i%4)*.25;
    const end=[treeX+Math.cos(a)*reach,y+.43,treeZ+Math.sin(a)*reach];
    tube([[treeX-.02,y-.27,treeZ],[treeX+Math.cos(a)*reach*.45,y+.03,treeZ+Math.sin(a)*reach*.43],end],.030+(i%2)*.007,bark,garden);
    for (const side of [-1,1]) {
      const b=a+side*.65;
      const tip=[end[0]+Math.cos(b)*.22,end[1]+.19,end[2]+Math.sin(b)*.22];
      tube([end,tip],.014,twig,garden);
    }
    clusters.push({x:end[0],y:end[1]+.025,z:end[2],r:.28+(i%2)*.06});
  }
  clusters.push({x:treeX+.01,y:2.90,z:treeZ-.02,r:.29});
  clusters.push({x:treeX-.16,y:2.58,z:treeZ+.04,r:.35});

  function instanceLeaves(parent, count, colors, locations, blossom=false) {
    const batches = colors.map(c=>new THREE.InstancedMesh(leafGeometry,mat(c),Math.ceil(count/colors.length)));
    const written = colors.map(()=>0);
    for (let n=0;n<count;n++) {
      const center=locations[n%locations.length];
      const a=rng()*Math.PI*2, b=Math.acos(rng()*2-1), r=Math.pow(rng(),.40)*center.r;
      const k=n%colors.length, m=batches[k];
      dummy.position.set(center.x+Math.cos(a)*Math.sin(b)*r,center.y+Math.cos(b)*r*.78,center.z+Math.sin(a)*Math.sin(b)*r);
      dummy.rotation.set(rng()*Math.PI,rng()*Math.PI,rng()*Math.PI);
      const size=(blossom?.065:.105)*(0.73+rng()*.65);
      dummy.scale.set(size*(blossom?1.05:.72),size*(blossom?.50:1.28),size*(blossom?.65:.42));
      dummy.updateMatrix(); m.setMatrixAt(written[k]++,dummy.matrix);
    }
    batches.forEach((m,k)=>{m.count=written[k];m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;parent.add(m);});
  }

  // Faceted branch clusters are studded with hundreds of individual leaflets.
  function treeCanopy(parent, colors, spring=false) {
    clusters.forEach((c,i)=>{
      const o=new THREE.Mesh(crownGeometry,mat(colors[i%colors.length]));
      o.position.set(c.x,c.y,c.z);o.scale.set(c.r*.84,c.r*.70,c.r*.79);
      o.rotation.set(i*.31,i*.8,i*.15);o.castShadow=true;o.receiveShadow=true;parent.add(o);
    });
    instanceLeaves(parent,396,colors,clusters);
    if (spring) instanceLeaves(parent,154,['#f2c8cf','#eab0bd','#fbdfd9'],clusters,true);
  }
  treeCanopy(seasonGroups.spring,['#96ae6e','#b2c18a','#849e62'],true);
  treeCanopy(seasonGroups.summer,['#55774e','#6f9254','#8aa665']);
  treeCanopy(seasonGroups.autumn,['#d3a351','#ba753e','#e3bd69','#a86a40']);

  function fruitClusters(parent, locations, count, size) {
    const fruit = new THREE.InstancedMesh(smallBall, mat('#bc3f38'), count);
    for (let n=0;n<count;n++) {
      const c=locations[n%locations.length],a=rng()*Math.PI*2;
      const y=(rng()-.32)*c.r*.9;
      dummy.position.set(c.x+Math.cos(a)*c.r*1.03,c.y+y,c.z+Math.sin(a)*c.r*1.03);
      dummy.rotation.set(rng()*3,rng()*3,rng()*3);
      dummy.scale.setScalar(size*(.76+rng()*.5));
      dummy.updateMatrix();fruit.setMatrixAt(n,dummy.matrix);
    }
    fruit.instanceMatrix.needsUpdate=true;fruit.castShadow=true;parent.add(fruit);
  }
  fruitClusters(seasonGroups.summer,clusters,44,.038);

  function shrub(parent,x,y,z,r,colors,flowers=false) {
    const loc=[];
    for (let i=0;i<6;i++) {
      const a=i*2.3999, scale=r*(.40+(i%2)*.08), d=r*.46;
      const c={x:x+Math.cos(a)*d,y:y+.13+(i%3)*.065,z:z+Math.sin(a)*d,r:scale}; loc.push(c);
      tube([[x,y-.035,z],[c.x,c.y,c.z]],.013,twig,parent);
      const leaf=new THREE.Mesh(crownGeometry,mat(colors[i%colors.length]));
      leaf.position.set(c.x,c.y,c.z);leaf.scale.set(scale,scale*.80,scale);leaf.castShadow=true;parent.add(leaf);
    }
    instanceLeaves(parent,66,colors,loc);
    if (parent===seasonGroups.summer) fruitClusters(parent,loc,12,.027);
    if(flowers) {
      for(let i=0;i<13;i++) {
        const a=i*2.39,c=loc[i%loc.length],xx=c.x+Math.cos(a)*c.r*.72,zz=c.z+Math.sin(a)*c.r*.72;
        blossom(parent,xx,c.y+c.r*.7,zz,.044,i%2?'#ead9c3':'#dbb0ba');
      }
    }
  }
  for(const [name,colors] of Object.entries({spring:['#9eaf71','#739254','#bbc68c'],summer:['#5d864d','#7c9c56','#456d43'],autumn:['#bd9550','#d6b160','#a77d40']})) {
    const g=seasonGroups[name];
    for(let i=0;i<3;i++) shrub(g,leftX-.33+i*.33,.75,leftZ,.25,colors,name==='spring');
    shrub(g,pots[0].x,pots[0].y+.05,pots[0].z,.32,colors,name==='spring');
    shrub(g,pots[1].x,pots[1].y+.04,pots[1].z,.20,colors,name==='spring');
  }
  function blossom(parent,x,y,z,size,color) {
    const pm=mat(color);
    for(let k=0;k<5;k++) {
      const a=k*Math.PI*.4;
      const petal=new THREE.Mesh(smallBall,pm);petal.position.set(x+Math.cos(a)*size*.63,y+.009,z+Math.sin(a)*size*.63);
      petal.scale.set(size*.67,.018,size*.67);parent.add(petal);
    }
    cyl(size*.29,size*.29,.019,x,y+.023,z,mat('#e6bf71'),7,false,parent);
  }

  // Spring: an open nursery crate, flowering seedlings and a proper watering can.
  function crate(parent,x,y,z,w=.67,d=.46) {
    box(w,.035,d,x,y+.025,z,darkWood,false,parent);
    for(const dz of [-d/2,d/2])for(const h of [.085,.17,.25])box(w,.053,.028,x,y+h,z+dz,wood,false,parent);
    for(const dx of [-w/2,w/2])for(const h of [.085,.17,.25])box(.028,.053,d,x+dx,y+h,z,wood,false,parent);
    for(const dx of [-w*.45,w*.45])for(const dz of [-d*.45,d*.45])box(.035,.28,.035,x+dx,y+.145,z+dz,darkWood,false,parent);
  }
  const spring=seasonGroups.spring;
  crate(spring,2.69,.38,1.34,.66,.47);
  for(let i=0;i<6;i++) {
    const x=2.47+(i%3)*.21,z=1.24+Math.floor(i/3)*.21;
    cyl(.076,.06,.12,x,.695,z,clay,8,false,spring);
    cyl(.058,.058,.018,x,.755,z,dirt,8,false,spring);
    const h=.12+(i%2)*.10;
    tube([[x,.76,z],[x-.016,.76+h,z]],.008,mat('#6b8e57'),spring);
    for(let n=0;n<3;n++) {
      const leaf=new THREE.Mesh(leafGeometry,mat('#8da668'));
      leaf.position.set(x+(n%2?.029:-.029),.79+n*.025,z);leaf.scale.set(.022,.065,.017);leaf.rotation.z=(n%2?-.7:.7);spring.add(leaf);
    }
    blossom(spring,x-.016,.76+h,z,.053,i%3===0?'#bf8bb4':i%3===1?'#eec394':'#dab7c6');
  }
  const watering = mat('#a4bbb0');
  cyl(.115,.13,.21,3.03,.495,1.78,watering,12,true,spring);
  cyl(.116,.116,.022,3.03,.607,1.78,darkMetal,12,false,spring);
  tube([[3.08,.45,1.80],[3.18,.57,1.80],[3.27,.68,1.80]],.033,watering,spring);
  const rose=cyl(.047,.039,.027,3.27,.68,1.80,metal,10,false,spring);rose.rotation.z=-.75;
  tube([[2.93,.44,1.78],[2.83,.48,1.78],[2.83,.65,1.78],[2.95,.62,1.78]],.023,watering,spring);
  // Trowel handle and broad steel blade lie across the nursery crate.
  const trowelHandle=box(.035,.03,.17,2.99,.67,1.17,mat('#b68d66'),false,spring);trowelHandle.rotation.y=-.60;
  const blade=box(.075,.018,.105,2.92,.667,1.29,metal,false,spring);blade.rotation.y=-.60;

  // Summer: slatted resting bench, herbs and a small desk fan.
  const summer=seasonGroups.summer;
  for (const x of [2.27,3.00]) {
    for(const z of [1.13,1.46])box(.042,.36,.042,x,.55,z,darkMetal,false,summer);
    tube([[x,.57,1.46],[x,.99,1.54]],.019,darkMetal,summer);
  }
  for(let i=0;i<4;i++)box(.94,.033,.083,2.635,.747,1.12+i*.105,wood,false,summer);
  for(let i=0;i<3;i++)box(.92,.075,.027,2.635,.86+i*.11,1.53,wood,false,summer);
  crate(summer,-4.91,.32,-.57,.58,.48);
  for(let i=0;i<4;i++) {
    const x=-5.08+(i%2)*.27,z=-.69+Math.floor(i/2)*.24;
    cyl(.083,.06,.13,x,.65,z,clay,9,false,summer);
    shrub(summer,x,.73,z,.13,['#4f784a','#89a469']);
  }
  // Fan is in the open service side, so the shop windows remain readable.
  box(.31,.17,.31,-4.86,.45,.01,wood,true,summer);
  cyl(.095,.13,.043,-4.86,.556,.01,mat('#b1beb2'),10,false,summer);
  box(.041,.26,.041,-4.86,.685,.01,metal,false,summer);
  const fanRing=new THREE.Mesh(new THREE.TorusGeometry(.158,.012,6,26),mat('#bcc7bc'));fanRing.position.set(-4.86,.831,.037);summer.add(fanRing);
  const fanBlades=new THREE.Group();fanBlades.position.set(-4.86,.831,.026);summer.add(fanBlades);
  for(let n=0;n<3;n++) {
    const b=box(.052,.123,.011,0,.065,0,mat('#a3b5a9'),false,fanBlades);b.rotation.z=n*Math.PI*2/3;
    b.position.set(-Math.sin(n*Math.PI*2/3)*.065,Math.cos(n*Math.PI*2/3)*.065,0);
  }
  for(let n=0;n<9;n++) {
    const a=n*Math.PI/9;
    tube([[-4.86+Math.cos(a)*.146,.831+Math.sin(a)*.146,.052],[-4.86-Math.cos(a)*.146,.831-Math.sin(a)*.146,.052]],.0035,metal,summer);
  }
  const hub=cyl(.027,.027,.037,-4.86,.831,.057,mat('#d6d9c5'),10,false,summer);hub.rotation.x=Math.PI/2;
  seasonalMotion.summer.push(t=>{fanBlades.rotation.z=t*7;});

  // Autumn: pumpkins have real ribs, a garden rake and piles of fallen leaves.
  const autumn=seasonGroups.autumn;
  crate(autumn,2.65,.38,1.37,.69,.49);
  function pumpkin(parent,x,y,z,r,color) {
    const pm=mat(color);
    for(let k=0;k<8;k++) {
      const a=k*Math.PI/4,o=new THREE.Mesh(crownGeometry,pm);
      o.position.set(x+Math.cos(a)*r*.36,y,z+Math.sin(a)*r*.36);o.scale.set(r*.60,r*.77,r*.60);o.castShadow=true;parent.add(o);
    }
    const stem=cyl(.026,.035,.12,x,y+r*.80,z,mat('#728052'),7,false,parent);stem.rotation.z=.13;
    tube([[x,y+r*.78,z],[x+.12,y+r*.78,z+.055],[x+.13,y+r*.72,z+.09]],.010,mat('#7e8955'),parent);
  }
  pumpkin(autumn,2.50,.80,1.36,.22,'#c78a48');
  pumpkin(autumn,2.80,.74,1.43,.17,'#b67640');
  pumpkin(autumn,2.80,.725,1.14,.125,'#d4b16c');
  // A leaning rake with curved tines, beside an upright seasonal sack.
  tube([[3.15,.46,1.75],[2.92,1.48,1.70]],.014,wood,autumn);
  tube([[2.94,1.49,1.70],[2.89,1.62,1.70]],.027,darkWood,autumn);
  tube([[2.93,.49,1.72],[3.36,.49,1.72]],.013,darkMetal,autumn);
  for(let n=0;n<8;n++)tube([[2.94+n*.058,.49,1.72],[2.94+n*.058,.415,1.77]],.006,metal,autumn);
  const sack=new THREE.Mesh(crownGeometry,mat('#a59f7d'));sack.position.set(-4.90,.58,-.53);sack.scale.set(.23,.27,.20);autumn.add(sack);
  cyl(.10,.14,.071,-4.9,.812,-.53,mat('#817d63'),8,false,autumn);
  function fallenLeaves(parent,count,area) {
    const colors=['#c4a050','#bc7e47','#a26d42','#d1ae68'];
    const meshes=colors.map(c=>new THREE.InstancedMesh(leafGeometry,mat(c),Math.ceil(count/colors.length)));
    const filled=colors.map(()=>0);
    for(let n=0;n<count;n++) {
      const theta=rng()*Math.PI*2,r=Math.sqrt(rng());
      const x=area.x+Math.cos(theta)*r*area.rx,z=area.z+Math.sin(theta)*r*area.rz;
      const k=n%meshes.length;
      const ground=Math.abs(x-treeX)<.50&&Math.abs(z-treeZ)<.50?.495:area.y;
      dummy.position.set(x,ground+.008+rng()*.006,z);dummy.rotation.set(Math.PI/2+(rng()-.5)*.3,0,rng()*Math.PI*2);dummy.scale.set(.037+rng()*.023,.065+rng()*.03,.008);dummy.updateMatrix();meshes[k].setMatrixAt(filled[k]++,dummy.matrix);
    }
    meshes.forEach((m,k)=>{m.count=filled[k];m.instanceMatrix.needsUpdate=true;m.receiveShadow=true;parent.add(m);});
  }
  fallenLeaves(autumn,110,{x:2.68,z:-1.21,rx:.88,rz:1.25,y:.378});
  fallenLeaves(autumn,70,{x:2.99,z:1.04,rx:.36,rz:.89,y:.378});
  fallenLeaves(autumn,48,{x:-3.17,z:1.54,rx:.66,rz:.32,y:.378});

  // Winter: the live woody branches stay visible beneath a little snow.
  const winter=seasonGroups.winter;
  for(const c of clusters) {
    const s=new THREE.Mesh(crownGeometry,snow);s.position.set(c.x,c.y-.07,c.z);s.scale.set(c.r*.72,.07,c.r*.53);s.rotation.y=c.x*4;winter.add(s);
  }
  for(let i=0;i<3;i++) {
    const x=leftX-.33+i*.33;
    for(let n=0;n<5;n++) {
      const a=n*1.8;const h=.25+(n%2)*.16;
      tube([[x,.748,leftZ],[x+Math.cos(a)*.13,.748+h,leftZ+Math.sin(a)*.12]],.008,twig,winter);
    }
  }
  for(const p of pots) {
    for(let n=0;n<7;n++) {
      const a=n*2.3999;
      tube([[p.x,p.y,p.z],[p.x+Math.cos(a)*p.r*.7,p.y+.23+(n%3)*.065,p.z+Math.sin(a)*p.r*.7]],.008,twig,winter);
    }
    cyl(p.r,p.r,.055,p.x,p.y+.022,p.z,snow,12,false,winter);
  }
  box(1.11,.062,.47,leftX,.752,leftZ,snow,false,winter);
  box(1.02,.075,1.02,treeX,.501,treeZ,snowShade,false,winter);
  // A shallow quilt of snow across the roof, with an open chimney collar.
  function roofQuilt() {
    const vertices=[],indices=[],nx=25,nz=20,x0=-3.63,z0=-3.43,w=5.03,d=3.90;
    for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++) {
      const x=x0+w*ix/nx,z=z0+d*iz/nz;
      const edge=Math.min(ix/nx,1-ix/nx,iz/nz,1-iz/nz);
      const y=5.557+.071*Math.min(1,edge*12)+Math.sin(x*4+z)*Math.cos(z*5)*.012;
      vertices.push(x,y,z);
    }
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++) {
      const x=x0+w*(ix+.5)/nx,z=z0+d*(iz+.5)/nz;
      if(Math.hypot(x+2.94,z+2.72)<.47)continue;
      const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,e=c+1;
      indices.push(a,c,b,b,c,e);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const top=new THREE.Mesh(g,snow);top.receiveShadow=true;winter.add(top);
    // The low edge thickness reads as accumulated snow rather than white paint.
    box(5.03,.043,.09,-1.115,5.544,.453,snowShade,false,winter);
    box(5.03,.043,.09,-1.115,5.544,-3.413,snowShade,false,winter);
    box(.09,.043,3.87,-3.614,5.544,-1.48,snowShade,false,winter);
    box(.09,.043,3.87,1.384,5.544,-1.48,snowShade,false,winter);
  }
  roofQuilt();
  // This thin permanent snow layer follows the entrance awning's own geometry.
  // It stays in the cached winter group; switching seasons only changes visibility.
  const awning=ctx.awning||{x:-.105,width:2.35,zBack:.86,zFront:1.76,yBack:2.85,yFront:2.73};
  const awningSurfaceY=z=>awning.yBack+(awning.yFront-awning.yBack)*(z-awning.zBack)/(awning.zFront-awning.zBack);
  const awningSnow=new THREE.Group();awningSnow.name='entrance-awning-snow';winter.add(awningSnow);
  function awningSnowQuilt() {
    const vertices=[],indices=[],nx=28,nz=10;
    const x0=awning.x-awning.width/2;
    const snowDepth=(x,z)=>{
      // Keep the narrow rear edge below the main sign frame, then ease into
      // the fuller accumulation beyond the sign's projecting underside.
      const thin=.006+Math.sin(x*9+z*7)*.002;
      const full=Math.max(.045,.050+Math.sin(x*6.2+z*3.7)*Math.cos(z*5.1)*.006+Math.sin(x*9+z*7)*.003);
      const t=Math.max(0,Math.min(1,(z-awning.zBack-.20)/.16));
      return thin+(full-thin)*t*t*(3-2*t);
    };
    for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++) {
      const x=x0+awning.width*ix/nx,z=awning.zBack+(awning.zFront-awning.zBack)*iz/nz;
      vertices.push(x,awningSurfaceY(z)+snowDepth(x,z),z);
    }
    for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++) {
      const a=iz*(nx+1)+ix,b=a+1,c=a+nx+1,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
    const topGeometry=new THREE.BufferGeometry();
    topGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));topGeometry.setIndex(indices);topGeometry.computeVertexNormals();
    const top=new THREE.Mesh(topGeometry,snow);top.name='entrance-awning-snow-top';top.receiveShadow=true;top.castShadow=true;awningSnow.add(top);
    // A low irregular front lip exposes the red and white valance below it.
    const rimVertices=[],rimIndices=[];
    for(let ix=0;ix<=nx;ix++) {
      const x=x0+awning.width*ix/nx,z=awning.zFront+.006;
      rimVertices.push(x,awning.yFront+snowDepth(x,awning.zFront),z,x,awning.yFront+.005+.004*Math.sin(ix*1.37),z);
      if(ix<nx){const a=ix*2;rimIndices.push(a,a+1,a+2,a+2,a+1,a+3);}
    }
    const rimGeometry=new THREE.BufferGeometry();rimGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rimVertices,3));rimGeometry.setIndex(rimIndices);rimGeometry.computeVertexNormals();
    const rim=new THREE.Mesh(rimGeometry,snowShade);rim.name='entrance-awning-snow-rim';rim.castShadow=true;awningSnow.add(rim);
    for(const side of [-1,1]) {
      const sideVertices=[],sideIndices=[],x=awning.x+side*awning.width/2;
      for(let iz=0;iz<=nz;iz++) {
        const z=awning.zBack+(awning.zFront-awning.zBack)*iz/nz,y=awningSurfaceY(z);
        sideVertices.push(x,y+snowDepth(x,z),z,x,y+.001,z);
        if(iz<nz){const a=iz*2;sideIndices.push(...(side<0?[a,a+1,a+2,a+2,a+1,a+3]:[a,a+2,a+1,a+2,a+3,a+1]));}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(sideVertices,3));g.setIndex(sideIndices);g.computeVertexNormals();
      const edge=new THREE.Mesh(g,snowShade);edge.castShadow=true;awningSnow.add(edge);
    }
    for(let n=0;n<5;n++) {
      const x=x0+awning.width*(.10+n*.19);
      const lip=new THREE.Mesh(crownGeometry,snow);lip.position.set(x,awning.yFront+.025,awning.zFront+.013);
      lip.scale.set(.080+(n%2)*.024,.024,.033+(n%3)*.005);lip.rotation.y=n*.61;lip.receiveShadow=true;lip.castShadow=true;awningSnow.add(lip);
    }
  }
  awningSnowQuilt();
  box(5.77,.075,.17,-1.10,5.90,.75,snow,false,winter);
  box(5.77,.075,.17,-1.10,5.90,-3.69,snow,false,winter);
  box(.17,.075,4.58,-3.88,5.90,-1.47,snow,false,winter);
  box(.17,.075,4.58,1.68,5.90,-1.47,snow,false,winter);
  // Roof pipe gets a small cap; the dark chimney itself remains exposed.
  cyl(.35,.35,.055,-2.94,6.68,-2.72,snow,12,false,winter);
  box(4.11,.04,.36,-1.51,3.55,.66,snow,false,winter);
  for(const z of [-.49,-2.46])box(.37,.04,1.48,1.69,3.46,z,snow,false,winter);
  // Accumulation on horizontal guard rails and their end caps.
  for(const [z0,z1] of [[-1.16,.90],[2.59,4.51]]) {
    box(.097,.048,z1-z0,5.58,.99,(z0+z1)/2,snow,false,winter);
    for(const z of [z0,z1])cyl(.079,.07,.047,5.58,1.102,z,snow,8,false,winter);
  }
  function snowPatch(parent,x,z,rx,rz,y,seed=0) {
    const shape=new THREE.Shape();
    for(let i=0;i<14;i++) {
      const a=i*Math.PI/7,f=.84+.13*Math.sin(i*2.39+seed);
      const px=Math.cos(a)*rx*f,pz=Math.sin(a)*rz*f;
      if(i===0)shape.moveTo(px,pz);else shape.lineTo(px,pz);
    }
    shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:.036,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.022,bevelThickness:.018,curveSegments:2});
    const o=new THREE.Mesh(g,snow);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);
  }
  snowPatch(winter,-3.45,1.43,.67,.37,.378,1);
  snowPatch(winter,2.68,-2.25,.51,.63,.378,2);
  snowPatch(winter,2.73,.22,.49,.70,.378,3);
  snowPatch(winter,4.91,1.43,.52,.54,.271,4);
  snowPatch(winter,4.85,4.85,.59,.42,.271,5);
  snowPatch(winter,-2.62,-4.92,1.42,.53,.282,6);
  snowPatch(winter,-5.19,-1.05,.39,.75,.314,7);
  // Firewood stack and a recognizable D-handled steel snow shovel.
  for(let row=0;row<2;row++)for(let n=0;n<3-row;n++) {
    const x=2.44+n*.23+row*.115,y=.493+row*.185;
    const log=cyl(.11,.107,.43,x,y,1.36,wood,9,false,winter);log.rotation.x=Math.PI/2;
    for(const z of [1.139,1.581]) {
      const end=cyl(.083,.083,.015,x,y,z,mat('#c2ab7e'),9,false,winter);end.rotation.x=Math.PI/2;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.047,.004,3,11),darkWood);ring.position.set(x,y,z+(z>1.36?.009:-.009));winter.add(ring);
    }
  }
  box(.78,.054,.46,2.67,.752,1.36,snow,false,winter);
  const spade=box(.35,.24,.039,3.09,.53,1.71,mat('#95a6ac'),true,winter);spade.rotation.x=-.13;
  tube([[3.09,.59,1.69],[2.94,1.47,1.58]],.019,wood,winter);
  tube([[2.94,1.45,1.58],[2.86,1.56,1.565],[2.87,1.69,1.55],[3.01,1.70,1.55],[3.05,1.56,1.565],[2.94,1.45,1.58]],.014,darkMetal,winter);
  box(.34,.026,.06,3.09,.405,1.717,darkMetal,false,winter);

  // The same lightweight point meshes are recycled each frame for each season.
  const particleSystems={};
  function floatingBits(name,count,colors,kind) {
    const g=seasonGroups[name],arr=[],meshes=[];
    const geometry=kind==='snow'?smallBall:leafGeometry;
    colors.forEach((color,k)=>{
      const m=new THREE.InstancedMesh(geometry,mat(color,{transparent:true,opacity:kind==='pollen'?.48:.9,depthWrite:false}),Math.ceil(count/colors.length));
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;g.add(m);meshes.push(m);
    });
    for(let n=0;n<count;n++) {
      const spread=kind==='snow'?10.6:kind==='pollen'?6.3:2.65;
      arr.push({x:(kind==='snow'?0:kind==='pollen'?-.9:treeX)+(rng()-.5)*spread,z:(kind==='snow'?0:kind==='pollen'?-.6:treeZ)+(rng()-.5)*spread,y:rng()*(kind==='snow'?7.8:3.45)+.42,phase:rng()*6.283,speed:(kind==='snow'?.20:kind==='pollen'?.06:.12)+rng()*(kind==='snow'?.32:.16),size:(kind==='snow'?.026:kind==='pollen'?.011:.036)*(0.65+rng()*.9),batch:n%colors.length});
    }
    particleSystems[name]={arr,meshes,kind};
  }
  floatingBits('spring',44,['#ecc6cc','#f6d7d2'],'petal');
  floatingBits('summer',26,['#cbd297','#e3daa4'],'pollen');
  floatingBits('autumn',42,['#c1974b','#c08647'],'leaf');
  floatingBits('winter',164,['#f1f3ec','#d3e1e6'],'snow');
  let current='spring';
  function setSeason(name) {
    if(!seasonGroups[name])return false;
    current=name;
    Object.entries(seasonGroups).forEach(([key,g])=>{g.visible=key===name;});
    garden.userData.season=name;
    return true;
  }
  function update(t,dt) {
    const delta=Math.min(dt||0,.06),system=particleSystems[current];
    seasonalMotion[current].forEach(fn=>fn(t,delta));
    if(!system)return;
    const cursors=system.meshes.map(()=>0);
    for(const p of system.arr) {
      p.y-=delta*p.speed;
      const sway=Math.sin(t*.64+p.phase)*(system.kind==='snow'?.13:.22);
      const worldX=p.x+sway,worldZ=p.z+Math.cos(t*.45+p.phase)*.12;
      const insideRoof=worldX>-3.63&&worldX<1.40&&worldZ>-3.43&&worldZ<.47;
      const insideAwning=Math.abs(worldX-awning.x)<awning.width/2+.015&&worldZ>awning.zBack-.015&&worldZ<awning.zFront+.015;
      const floor=system.kind==='snow'?(insideRoof?5.66:insideAwning?awningSurfaceY(worldZ)+.080:.40):.40;
      if(p.y<floor)p.y=system.kind==='snow'?7.4+rng()*.6:3.55+rng()*.55;
      dummy.position.set(worldX,p.y,worldZ);
      dummy.rotation.set(t*.51+p.phase,p.phase,t*.68+p.phase);
      if(system.kind==='snow')dummy.scale.setScalar(p.size);
      else dummy.scale.set(p.size,p.size*(system.kind==='pollen'?1:1.50),p.size*.20);
      dummy.updateMatrix();system.meshes[p.batch].setMatrixAt(cursors[p.batch]++,dummy.matrix);
    }
    system.meshes.forEach((m,k)=>{m.count=cursors[k];m.instanceMatrix.needsUpdate=true;});
  }
  setSeason('spring');update(0,0);
  return {setSeason,update,seasonGroups,garden,particleSystems,get season(){return current;},get activeGroup(){return seasonGroups[current];}};
}
