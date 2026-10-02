export function buildInterior(ctx) {
  const { THREE, scene, mat, box, cyl, tube, panel, label } = ctx;
  const group = new THREE.Group();
  group.name = 'warm-convenience-store-interior';
  scene.add(group);
  const M = {
    cream: mat('#e9dcc0'), white: mat('#f5efdf'), chalk: mat('#fcf5de'),
    beige: mat('#c6b99b'), trim: mat('#968975'), dark: mat('#343b45'),
    metal: mat('#95a3a1'), chrome: mat('#c4d0c4'), shelf: mat('#ded6bf'),
    wood: mat('#ca9671'), teal: mat('#508d80'), green: mat('#629676'),
    mint: mat('#9ec7a6'), red: mat('#d87870'), pink: mat('#e3a697'),
    orange: mat('#e1ae62'), yellow: mat('#e8cc75'), blue: mat('#6fa8bd'),
    navy: mat('#52647a'), purple: mat('#9b91ac'), chocolate: mat('#84635a'),
    black: mat('#29343d'), rice: mat('#faf0cc'), seaweed: mat('#3c5147'),
    salmon: mat('#ec9875'), leaf: mat('#87a66b'), glass: mat('#a6d2cc', { transparent:true, opacity:.13 }),
    glow: mat('#fff4cd', { emissive:'#ffe3a2', emissiveIntensity:.75 }),
    coldGlow: mat('#d8eee0', { emissive:'#bddfda', emissiveIntensity:.48 }),
    screen: mat('#80bdb3', { emissive:'#7cbab4', emissiveIntensity:.4 }),
    tile: mat('#dfcfad'), tileDark: mat('#d1c09c')
  };
  const B = (w,h,d,x,y,z,m,outline=true) => box(w,h,d,x,y,z,m,outline,group);
  const C = (rt,rb,h,x,y,z,m,n=12,outline=false) => cyl(rt,rb,h,x,y,z,m,n,outline,group);
  const P = (w,h,x,y,z,draw,opts={}) => panel(w,h,x,y,z,draw,{...opts,parent:group});
  const L = (w,h,x,y,z,t,bg,fg,opts={}) => label(w,h,x,y,z,t,bg,fg,{...opts,parent:group});
  const pools = new Map();
  const tmp = new THREE.Object3D();
  const geometries = { box:new THREE.BoxGeometry(1,1,1), bottle:new THREE.CylinderGeometry(.054,.064,1,9), cap:new THREE.CylinderGeometry(1,1,1,9), rice:new THREE.SphereGeometry(1,8,5) };
  function inst(kind, material, x,y,z,sx,sy,sz, ry=0) {
    const key = `${kind}:${material.uuid}`;
    if (!pools.has(key)) pools.set(key, {geometry:geometries[kind], material, transforms:[]});
    pools.get(key).transforms.push([x,y,z,sx,sy,sz,ry]);
  }
  const ib = (w,h,d,x,y,z,m,ry=0) => inst('box',m,x,y,z,w,h,d,ry);
  const products = [M.red,M.teal,M.orange,M.blue,M.yellow,M.purple,M.green,M.pink];

  // A softly grouted, slightly reflective tiled floor is visible between fixtures.
  const floor = P(6.37,3.91,-1.10,.322,-1.42,(c,w,h) => {
    c.fillStyle='#e2d2b0'; c.fillRect(0,0,w,h);
    const nx=13,nz=8;
    for(let a=0;a<nx;a++) for(let b=0;b<nz;b++) {
      c.fillStyle=(a+b)%2===0?'#e7d9bc':'#dbcbab';
      c.fillRect(a*w/nx+1,b*h/nz+1,w/nx-2,h/nz-2);
    }
    c.strokeStyle='rgba(150,134,109,.3)';c.lineWidth=1;
    for(let a=0;a<=nx;a++){c.beginPath();c.moveTo(a*w/nx,0);c.lineTo(a*w/nx,h);c.stroke();}
    for(let b=0;b<=nz;b++){c.beginPath();c.moveTo(0,b*h/nz);c.lineTo(w,b*h/nz);c.stroke();}
  },{emissive:.035});
  floor.rotation.x=-Math.PI/2;
  B(6.32,.08,.075,-1.11,.37,-3.47,M.trim,false);
  B(.07,.08,3.88,-4.28,.37,-1.47,M.trim,false);

  // Four glass-door refrigerated drink cabinets, individually stocked.
  B(3.80,2.03,.42,-2.30,1.34,-3.24,M.cream);
  B(3.67,1.70,.028,-2.30,1.34,-3.015,M.navy,false);
  B(3.76,.20,.048,-2.30,2.27,-2.999,M.coldGlow,false);
  L(3.48,.145,-2.30,2.272,-2.970,'冷たい飲みもの   FRESH & COOL','#d5e7d3','#4c746f',{fontSize:39,emissive:.12});
  for(let door=0;door<4;door++) {
    const x=-3.665+door*.91;
    B(.865,1.65,.025,x,1.36,-2.960,M.glass,false);
    B(.035,1.74,.036,x-.444,1.36,-2.94,M.chrome,false);
    B(.035,1.74,.036,x+.444,1.36,-2.94,M.chrome,false);
    B(.055,.46,.035,x+.337,1.37,-2.913,M.dark,false);
    for(let level=0;level<4;level++) {
      const base=.49+level*.38;
      B(.81,.035,.33,x,base,-3.125,M.shelf,false);
      B(.81,.065,.016,x,base-.018,-2.951,M.white,false);
      for(let col=0;col<5;col++) {
        const bx=x-.315+col*.157;
        const tone=products[(door*3+level+col)%products.length];
        inst('bottle',tone,bx,base+.148,-3.075,1,.263,1);
        ib(.10,.096,.010,bx,base+.14,-3.012,M.white);
        ib(.066,.043,.012,bx,base+.141,-3.004,tone);
        inst('cap',M.white,bx,base+.300,-3.075,.034,.038,.034);
      }
      for(let p=0;p<4;p++) ib(.085,.013,.006,x-.30+p*.20,base-.02,-2.937,M.yellow);
    }
  }
  B(3.83,.095,.07,-2.30,.384,-2.985,M.dark,false);

  // Rear staff door and a small, cluttered stockroom notice board.
  B(.92,1.91,.08,1.49,1.28,-3.465,M.trim);
  B(.78,1.77,.017,1.49,1.28,-3.411,M.teal,false);
  B(.52,.35,.021,1.49,1.88,-3.392,M.navy,false);
  B(.045,.19,.035,1.79,1.20,-3.373,M.chrome,false);
  L(.59,.13,1.49,1.88,-3.364,'スタッフ専用','#d8decc','#64776b',{fontSize:41});
  B(.65,.63,.038,.46,1.93,-3.423,M.wood);
  P(.59,.57,.46,1.93,-3.392,(c,w,h)=>{
    c.fillStyle='#e3c59e';c.fillRect(0,0,w,h);
    const notes=[['#f4edd7',.08,.12,.36,.35],['#f4d99d',.54,.08,.33,.44],['#d2dfd1',.17,.58,.60,.31]];
    for(const [color,x,y,bw,bh] of notes){c.fillStyle=color;c.fillRect(w*x,h*y,w*bw,h*bh);c.fillStyle='#8b9288';for(let n=0;n<3;n++)c.fillRect(w*(x+.05),h*(y+.06+n*.055),w*(bw-.1),h*.012);c.fillStyle='#ba7371';c.beginPath();c.arc(w*(x+bw/2),h*(y+.03),w*.012,0,Math.PI*2);c.fill();}
  });
  L(.71,.19,.48,2.40,-3.40,'新商品 入荷','#f5e6bd','#8a6954',{fontSize:43});

  // Low central gondola: clean white metal, price rails and bright packages.
  function groceryShelf(x,z,width=2.55) {
    B(width,.13,.51,x,.42,z,M.cream);
    B(width,.91,.055,x,.92,z-.10,M.beige,false);
    for(const edge of [-1,1]) B(.052,1.11,.45,x+edge*(width/2-.035),.965,z,M.chrome,false);
    for(let level=0;level<3;level++) {
      const y=.54+level*.37;
      B(width,.038,.51,x,y,z,M.shelf,false);
      B(width,.075,.025,x,y+.018,z+.264,M.white,false);
      for(let p=0;p<8;p++){
        const px=x-width/2+.18+p*(width-.36)/7;
        const tone=products[(level*3+p)%products.length];
        const h=level===0?.22:.245+(p%3)*.012;
        const d=.115+(p%2)*.016;
        ib(.18,h,d,px,y+h/2+.025,z+.10,tone,(p%3-1)*.018);
        ib(.155,h*.32,.008,px,y+h*.69,z+.10+d/2+.006,M.white);
        ib(.065,.040,.01,px,y+h*.69,z+.10+d/2+.012,tone);
        ib(.17,.035,.01,px,y+.075,z+.10+d/2+.008,M.yellow);
        ib(.07,.018,.008,px,y+.024,z+.285,M.orange);
        // A second stocked row creates visible depth from the right-hand view.
        ib(.18,h*.94,.115,px,y+h*.47+.025,z-.084,products[(level+p+2)%8]);
      }
    }
    B(width,.065,.51,x,1.57,z,M.white,false);
    L(.82,.18,x-.57,1.685,z+.284,'お菓子・スナック','#efe8d0','#5f7866',{fontSize:38});
    L(.68,.16,x+.62,1.672,z+.284,'おすすめ','#d88f74','#fff0cb',{fontSize:47});
  }
  groceryShelf(-.97,-1.63,2.48);

  // A small side shelf with folded cereal cartons and instant noodle cups.
  B(.64,1.12,1.25,-3.81,.905,-1.875,M.shelf);
  for(let level=0;level<3;level++){
    const y=.46+level*.34;
    B(.69,.03,1.33,-3.78,y,-1.875,M.white,false);
    for(let row=0;row<5;row++) {
      const z=-2.40+row*.252;
      const color=products[(row+level*2)%8];
      ib(.23,.246,.16,-3.57,y+.14,z,color);
      ib(.009,.08,.12,-3.448,y+.158,z,M.white);
      if(level===2){
        C(.081,.064,.17,-3.88,y+.103,z,M.white,10);
        C(.092,.092,.017,-3.88,y+.195,z,color,10);
      }
    }
  }
  const noodleSign=L(.94,.17,-3.418,1.71,-1.89,'カップめん','#eac390','#896953',{rotY:Math.PI/2,fontSize:42});

  // Right-hand chilled bento counter leaves a generous entry aisle.
  B(.58,.67,1.65,1.80,.68,-1.70,M.cream);
  B(.65,.065,1.75,1.79,1.047,-1.70,M.chrome,false);
  B(.018,.45,1.69,1.479,.85,-1.70,M.glass,false);
  B(.047,.53,1.69,2.095,.86,-1.70,M.beige,false);
  B(.61,.22,.08,1.79,1.18,-2.57,M.coldGlow,false);
  L(.49,.16,1.79,1.182,-2.513,'お弁当','#eef0d7','#688c75',{fontSize:50});
  function bento(x,y,z,rot=0) {
    ib(.24,.047,.31,x,y,z,M.black,rot);
    ib(.216,.014,.28,x,y+.031,z,M.white,rot);
    inst('rice',M.rice,x-.04,y+.046,z+.025,.070,.014,.108,rot);
    ib(.083,.025,.110,x+.061,y+.049,z-.062,M.salmon,rot);
    ib(.083,.025,.074,x+.061,y+.050,z+.052,M.yellow,rot);
    inst('rice',M.leaf,x+.059,y+.053,z+.109,.035,.012,.021,rot);
    ib(.26,.009,.326,x,y+.071,z,M.glass,rot);
    ib(.059,.010,.094,x-.057,y+.078,z-.089,M.white,rot);
  }
  for(let row=0;row<4;row++) for(let col=0;col<2;col++) bento(1.66+col*.264,1.115,-2.31+row*.394);
  for(let row=0;row<4;row++) bento(1.62,.624,-2.29+row*.39);

  // A triangular onigiri basket by the end of the grocery shelf.
  B(.76,.41,.50,.61,.60,-1.73,M.cream);
  B(.81,.035,.56,.61,.82,-1.73,M.chrome,false);
  B(.81,.035,.56,.61,1.08,-1.73,M.white,false);
  function triangle(w,h,d,m,x,y,z) {
    const shape = new THREE.Shape();
    shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,h);shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.011,bevelThickness:.008}),m);
    mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  for(let level=0;level<2;level++) for(let row=0;row<2;row++) for(let col=0;col<4;col++) {
    const x=.326+col*.186,y=.844+level*.265,z=-1.78+row*.148;
    triangle(.163,.185,.072,M.rice,x,y,z);
    ib(.060,.126,.004,x,y+.063,z+.079,M.seaweed);
    ib(.045,.031,.006,x+.029,y+.132,z+.081,products[(col+level*3)%8]);
  }
  L(.60,.13,.61,.74,-1.436,'おにぎり   ¥138','#faf3dc','#637166',{fontSize:37});

  // Checkout is deliberately low: the coffee machine and hot food are in view.
  B(1.97,.84,.71,-3.20,.758,-.013,M.cream);
  B(2.06,.082,.81,-3.20,1.215,-.013,M.wood);
  B(1.73,.067,.018,-3.20,.546,.352,M.teal,false);
  B(1.73,.057,.018,-3.20,1.096,.352,M.white,false);
  L(1.23,.245,-3.13,.865,.359,'いつもの、あたたかさ。','#e9dfc4','#7f8d75',{fontSize:35});
  B(.43,.042,.39,-2.58,1.29,-.05,M.dark,false);
  B(.30,.046,.24,-2.60,1.328,.03,M.trim,false);
  B(.045,.25,.045,-2.63,1.46,-.09,M.dark,false);
  const terminal=B(.39,.27,.055,-2.63,1.60,-.083,M.dark);
  terminal.rotation.x=-.17;
  const screen=B(.34,.215,.016,-2.63,1.605,-.048,M.screen,false);
  screen.rotation.x=-.17;
  for(let i=0;i<3;i++) ib(.13,.009,.01,-2.68,1.55+i*.04,-.032,M.coldGlow);
  B(.094,.066,.12,-2.23,1.291,.15,M.teal,false);
  B(.049,.047,.031,-2.23,1.35,.155,M.screen,false);
  B(.22,.032,.16,-2.27,1.272,-.185,M.cream,false);
  for(let i=0;i<4;i++) ib(.044,.02,.11,-2.34+i*.052,1.30,-.185,products[(i+1)%8]);

  // Compact bean-to-cup machine, cup stack, napkins and a lit coffee menu.
  B(.47,.51,.38,-3.915,1.51,-.04,M.dark);
  B(.37,.31,.03,-3.915,1.545,.167,M.chrome,false);
  B(.23,.08,.028,-3.915,1.643,.189,M.black,false);
  B(.20,.067,.016,-3.915,1.643,.208,M.screen,false);
  B(.074,.083,.084,-3.915,1.463,.201,M.dark,false);
  B(.37,.035,.17,-3.915,1.293,.202,M.black,false);
  C(.052,.043,.14,-3.915,1.381,.215,M.chalk,12);
  C(.057,.057,.015,-3.915,1.456,.215,M.white,12);
  C(.12,.14,.18,-3.915,1.863,-.08,M.glass,12);
  C(.126,.126,.025,-3.915,1.966,-.08,M.dark,12);
  for(let i=0;i<10;i++) inst('rice',M.chocolate,-3.98+(i%3)*.06,1.827+Math.floor(i/3)*.035,-.09+(i%2)*.054,.032,.022,.027);
  for(let n=0;n<5;n++) C(.062,.048,.035,-3.50,1.28+n*.035,.08,M.white,12);
  B(.16,.054,.17,-3.51,1.268,-.18,M.beige,false);
  ib(.13,.025,.14,-3.51,1.304,-.18,M.white);
  L(.60,.35,-3.86,2.07,-.20,'挽きたて\nCOFFEE  ¥120','#3f5951','#f5e7bc',{fontSize:40});

  // Oden steam cabinet: six warm wells under a delicate glass sneeze guard.
  B(.58,.16,.45,-3.21,1.325,.03,M.chrome);
  B(.52,.035,.39,-3.21,1.419,.03,M.orange,false);
  for(let a=0;a<2;a++)for(let b=0;b<3;b++){
    const x=-3.345+a*.27,z=-.104+b*.128;
    ib(.224,.017,.104,x,1.441,z,M.chocolate);
    inst('rice',b===0?M.rice:b===1?M.salmon:M.beige,x,1.466,z,.072,.018,.041);
  }
  B(.60,.019,.47,-3.21,1.675,.03,M.chrome,false);
  B(.58,.215,.015,-3.21,1.558,.271,M.glass,false);
  for(let edge=0;edge<2;edge++)B(.018,.265,.018,-3.495+edge*.57,1.553,.25,M.chrome,false);
  L(.49,.106,-3.21,1.316,.261,'あったか おでん','#eadcae','#967152',{fontSize:37});

  // Window-side magazine rack; covers are graphic, sparse and legible at scale.
  B(.70,.60,.32,-1.64,.618,.095,M.wood);
  for(let level=0;level<3;level++){
    const y=.53+level*.205;
    B(.72,.028,.28,-1.64,y,.09,M.cream,false);
    for(let col=0;col<4;col++){
      const x=-1.90+col*.175,tone=products[(col+level*2)%8];
      const book=B(.154,.24,.025,x,y+.111,.154+level*.002,tone,false);
      book.rotation.x=-.16;
      ib(.115,.024,.009,x,y+.189,.186,M.white);
      ib(.055,.067,.012,x-.027,y+.121,.186,M.chalk);
      ib(.067,.047,.012,x+.032,y+.089,.186,products[(col+3)%8]);
    }
  }
  L(.70,.10,-1.64,.445,.273,'MAGAZINE / くらし','#f3e4c6','#847260',{fontSize:37});

  // Low ice-cream freezer by the rear shelf, with a bright illustrated lid.
  B(.91,.64,.59,-2.96,.67,-2.275,M.cream);
  B(.96,.045,.63,-2.96,1.019,-2.275,M.chrome,false);
  B(.79,.020,.50,-2.96,1.049,-2.275,M.glass,false);
  ib(.042,.037,.11,-2.70,1.072,-2.275,M.chrome);
  L(.71,.23,-2.96,.739,-1.969,'ICE CREAM\nひんやり、ごほうび','#9dbeb4','#fff5dd',{fontSize:42});
  for(let p=0;p<6;p++) ib(.118,.036,.173,-3.27+(p%3)*.29,.981,-2.40+Math.floor(p/3)*.23,products[(p+3)%8]);

  // A few suspended graphics and strips make the ceiling read as a real store.
  for(const x of [-2.65,.35]) {
    B(1.40,.065,.15,x,2.83,-1.71,M.white,false);
    B(1.31,.025,.12,x,2.792,-1.71,M.glow,false);
  }
  for(const x of [-2.80,.43]) {
    B(1.22,.055,.13,x,2.82,-2.88,M.white,false);
    B(1.14,.019,.11,x,2.782,-2.88,M.glow,false);
  }
  L(1.16,.23,-.99,2.57,-2.57,'毎日の、おいしい。','#e6d8b8','#76816c',{fontSize:41});
  for(const x of [-1.42,-.56])B(.014,.24,.014,x,2.78,-2.60,M.chrome,false);
  L(.53,.65,-4.212,1.87,-1.075,'あったか\nおでん\nはじめました','#e3a680','#fff0c4',{rotY:Math.PI/2,fontSize:38});
  L(.57,.48,-4.204,1.85,-2.019,'新発売\n季節のラテ','#ede3c5','#7e9180',{rotY:Math.PI/2,fontSize:39});

  // Small details at ankle level: directional tape, basket stack, stock crates.
  const guide=P(.60,.68,-.45,.333,-.33,(c,w,h)=>{
    c.clearRect(0,0,w,h);c.fillStyle='rgba(111,155,138,.70)';c.beginPath();c.moveTo(w*.50,h*.16);c.lineTo(w*.78,h*.48);c.lineTo(w*.61,h*.48);c.lineTo(w*.61,h*.81);c.lineTo(w*.39,h*.81);c.lineTo(w*.39,h*.48);c.lineTo(w*.22,h*.48);c.closePath();c.fill();
    c.strokeStyle='rgba(109,153,137,.6)';c.lineWidth=8;c.strokeRect(w*.06,h*.06,w*.88,h*.88);
  });guide.rotation.x=-Math.PI/2;
  for(let n=0;n<4;n++){
    B(.45,.078,.35,-1.30,.365+n*.082,.16,M.teal,false);
    B(.36,.015,.28,-1.30,.410+n*.082,.16,M.dark,false);
    for(let slot=0;slot<4;slot++)ib(.054,.033,.010,-1.435+slot*.090,.368+n*.082,.340,M.mint);
  }
  B(.42,.34,.38,.43,.49,-3.12,M.wood);
  B(.42,.34,.38,.87,.49,-3.12,M.beige);
  for(let n=0;n<2;n++)ib(.17,.044,.004,.43+n*.44,.51,-2.924,M.white);

  // Flush instanced merchandise only after every item is authored.
  for(const {geometry,material,transforms} of pools.values()){
    const mesh=new THREE.InstancedMesh(geometry,material,transforms.length);
    mesh.name='miniature-merchandise';
    transforms.forEach(([x,y,z,sx,sy,sz,ry],i)=>{tmp.position.set(x,y,z);tmp.rotation.set(0,ry,0);tmp.scale.set(sx,sy,sz);tmp.updateMatrix();mesh.setMatrixAt(i,tmp.matrix);});
    mesh.instanceMatrix.needsUpdate=true;
    mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
  }
  return { group };
}
