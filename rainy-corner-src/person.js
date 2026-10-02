// Small matte figures with adult proportions; their feet rest at local y = 0.
// Resources are shared across every customer in a Three.js scene.
const resourceCache = new WeakMap();

function resources(THREE) {
  if (resourceCache.has(THREE)) return resourceCache.get(THREE);
  const geometries = new Map();
  const materials = new Map();
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const material = (color, doubleSided = false) => {
    const key = `${color}${doubleSided ? '-double' : ''}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: .91, metalness: 0, side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    }));
    return materials.get(key);
  };
  const profile = (name, points, segments = 14) => {
    if (!geometries.has(name)) {
      // LatheGeometry expects the profile from bottom to top for outward faces.
      const ordered = points[0][1] > points[points.length - 1][1] ? [...points].reverse() : points;
      geometries.set(name, new THREE.LatheGeometry(ordered.map(([r, y]) => new THREE.Vector2(r, y)), segments));
    }
    return geometries.get(name);
  };
  // The hairline is higher across the face and lower at the nape, rather than
  // a second complete sphere that would hide the face.
  const hair = new THREE.BufferGeometry();
  const vertices = [], indices = [];
  const rings = 10, segments = 18;
  for (let row = 0; row <= rings; row++) {
    for (let col = 0; col <= segments; col++) {
      const phi = col / segments * Math.PI * 2;
      const front = Math.max(0, Math.cos(phi));
      const edge = 1.93 - front * .81;
      const theta = row / rings * edge;
      const sweep = 1 + .035 * Math.sin(phi + .6) * Math.sin(theta);
      vertices.push(
        Math.sin(theta) * Math.sin(phi) * .083 * sweep,
        Math.cos(theta) * .109,
        Math.sin(theta) * Math.cos(phi) * .075,
      );
      if (row < rings && col < segments) {
        const a = row * (segments + 1) + col;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  hair.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  hair.setIndex(indices); hair.computeVertexNormals();
  const collar = new THREE.BufferGeometry();
  collar.setAttribute('position', new THREE.Float32BufferAttribute([
    0, .025, 0, .053, -.043, .007, .016, -.106, .003,
  ], 3));
  collar.computeVertexNormals();
  const value = {sphere, box, hair, collar, profile, material};
  resourceCache.set(THREE, value);
  return value;
}

const outfits = [
  {jacket: '#829698', trousers: '#695455', shirt: '#ddd4bc', shoes: '#463a2e'},
  {jacket: '#805b46', trousers: '#8296a4', shirt: '#d4c6aa', shoes: '#3d332b'},
  {jacket: '#7d8972', trousers: '#535b64', shirt: '#e5dcc7', shoes: '#544032'},
  {jacket: '#c2b9a4', trousers: '#637783', shirt: '#efe6d5', shoes: '#594537'},
  {jacket: '#637b83', trousers: '#8a7661', shirt: '#dcd1bb', shoes: '#42382f'},
];

export function createPerson(THREE, index = 0) {
  const shared = resources(THREE);
  const outfitIndex = ((Math.trunc(index) % outfits.length) + outfits.length) % outfits.length;
  const outfit = outfits[outfitIndex];
  const slender = outfitIndex === 2 || outfitIndex === 3;
  const group = new THREE.Group(); group.name = `customer-${index}`;
  const motion = new THREE.Group(); group.add(motion);
  const body = new THREE.Group(); body.position.y = .835; motion.add(body);
  const make = (geometry, color, parent, position, scale) => {
    const mesh = new THREE.Mesh(geometry, shared.material(color));
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  const oval = (color, parent, position, scale) => make(shared.sphere, color, parent, position, scale);
  const skin = ['#d9b797', '#d3ad8d', '#cfa782'][outfitIndex % 3];
  const hairColor = ['#654732', '#583c2b', '#755039'][outfitIndex % 3];
  const jacketWidth = slender ? .94 : 1;
  const jacket = shared.profile(slender ? 'slim-jacket' : 'jacket', [
    [0, -.015], [.128, -.011], [.143, .013], [.142, .12],
    [.132, .225], [.16, .315], [.163, .36], [.133, .395], [.066, .421], [0, .422],
  ]);
  make(jacket, outfit.jacket, body, [0, 0, 0], [jacketWidth, 1, .68]);
  // A quiet cream shirt opening and sculpted jacket collar, with no outlines.
  oval(outfit.shirt, body, [0, .291, .097], [.039, .099, .012]);
  const leftCollar = make(shared.collar, outfit.jacket, body, [-.018, .386, .105]);
  const rightCollar = make(shared.collar, outfit.jacket, body, [.018, .386, .105]);
  leftCollar.scale.x = -1;
  // Mirroring reverses the collar winding, so use a shared double-sided material.
  leftCollar.material = rightCollar.material = shared.material(outfit.jacket, true);
  oval(outfit.jacket, body, [0, .144, .100], [.004, .12, .005]);
  for (const y of [.12, .19]) oval(outfit.shirt, body, [.012, y, .102], [.005, .005, .003]);

  const head = new THREE.Group(); head.position.set(0, .544, 0); body.add(head);
  oval(skin, body, [0, .434, .004], [.046, .058, .043]);
  oval(skin, head, [0, 0, 0], [.074, .105, .070]);
  oval(skin, head, [0, -.012, .069], [.017, .025, .020]);
  for (const side of [-1, 1]) oval(skin, head, [side * .073, -.013, -.002], [.014, .024, .014]);
  make(shared.hair, hairColor, head, [0, .012, -.002]);
  const fringe = oval(hairColor, head, [-.023, .087, .046], [.057, .020, .034]);
  fringe.rotation.z = -.15;
  if (slender) oval(hairColor, head, [0, -.035, -.049], [.076, .047, .040]);

  oval(outfit.trousers, motion, [0, .782, -.001], [.139 * jacketWidth, .087, .089]);
  const thighGeometry = shared.profile('thigh', [
    [0, 0], [.053, -.004], [.057, -.06], [.052, -.18], [.041, -.33], [.035, -.365], [0, -.369],
  ], 12);
  const shinGeometry = shared.profile('shin', [
    [0, 0], [.038, -.002], [.039, -.055], [.036, -.16], [.032, -.30], [.032, -.345], [0, -.348],
  ], 12);
  const armGeometry = shared.profile('sleeve', [
    [0, .017], [.052, 0], [.049, -.065], [.041, -.17], [.035, -.245], [0, -.25],
  ], 12);
  const forearmGeometry = shared.profile('forearm', [
    [0, 0], [.035, -.003], [.036, -.035], [.029, -.145], [.028, -.215], [0, -.217],
  ], 12);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * .080, .790, 0); motion.add(hip);
    make(thighGeometry, outfit.trousers, hip, [0, 0, 0]);
    const knee = new THREE.Group(); knee.position.y = -.365; hip.add(knee);
    make(shinGeometry, outfit.trousers, knee, [0, 0, 0]);
    const ankle = new THREE.Group(); ankle.position.set(0, -.345, 0); knee.add(ankle);
    oval(outfit.shoes, ankle, [0, -.039, .046], [.046, .040, .100]);
    make(shared.box, '#302a25', ankle, [0, -.074, .046], [.091, .012, .188]);
    legs.push({hip, knee, ankle, side});

    const shoulder = new THREE.Group(); shoulder.position.set(side * .172 * jacketWidth, .368, .004);
    shoulder.rotation.z = side * .072; body.add(shoulder);
    make(armGeometry, outfit.jacket, shoulder, [0, 0, 0]);
    const elbow = new THREE.Group(); elbow.position.y = -.245; shoulder.add(elbow);
    make(forearmGeometry, outfit.jacket, elbow, [0, 0, 0]);
    oval(outfit.shirt, elbow, [0, -.211, 0], [.027, .018, .026]);
    const hand = oval(skin, elbow, [0, -.248, .003], [.026, .045, .024]);
    hand.rotation.z = side * -.08;
    arms.push({shoulder, elbow, side});
  }

  const phaseOffset = index * 2.399963;
  const cycle = 1.4;
  const stanceDuration = .62;
  const thighLength = .365, shinLength = .345;
  // Lowest point of the shoe after a heel/toe roll, including its flat sole.
  // This lets the contact foot stay on the pavement while the ankle lifts.
  const shoeBottom = roll => {
    const c = Math.cos(roll), s = Math.sin(roll);
    const sole = -.074 * c - .046 * s - .006 * Math.abs(c) - .094 * Math.abs(s);
    const upper = -.039 * c - .046 * s - Math.hypot(.040 * c, .100 * s);
    return Math.min(sole, upper);
  };
  const animate = (time, walkingAmount = 1) => {
    const amount = Number.isFinite(walkingAmount) ? THREE.MathUtils.clamp(walkingAmount, 0, 1) : 0;
    const phase = (Number.isFinite(time) ? time : 0) * Math.PI * 2 / cycle + phaseOffset;
    // Lower the pelvis just enough for relaxed knees. It rises during single
    // support and settles during the two brief periods of double support.
    motion.position.y = (-.026 - .005 * Math.cos(phase * 2)) * amount;
    motion.position.x = -.012 * Math.sin(phase) * amount;
    for (const leg of legs) {
      const legPhase = phase + (leg.side === 1 ? Math.PI : 0);
      const step = ((legPhase / (Math.PI * 2)) % 1 + 1) % 1;
      let footZ, lift = 0, roll;
      if (step < stanceDuration) {
        const p = step / stanceDuration;
        // The support foot travels backwards at a constant local speed as the
        // customer advances. It rolls from heel contact to toe-off.
        footZ = .15 - .30 * p;
        if (p < .14) roll = -.12 * (1 - THREE.MathUtils.smoothstep(p, 0, .14));
        else if (p > .80) roll = .18 * THREE.MathUtils.smoothstep(p, .80, 1);
        else roll = 0;
      } else {
        const p = (step - stanceDuration) / (1 - stanceDuration);
        const p2 = p * p, p3 = p2 * p;
        // Hermite endpoints match the support-foot velocity. The foot begins
        // behind the body, clears the floor, and slows into the next heel strike.
        const endpointSlope = -.30 * (1 - stanceDuration) / stanceDuration;
        footZ = -.15 + .30 * (3 * p2 - 2 * p3) + endpointSlope * (2 * p3 - 3 * p2 + p);
        lift = .057 * Math.pow(Math.sin(Math.PI * p), 1.3);
        roll = .18 * (1 - p) - .12 * p;
      }
      footZ *= amount; roll *= amount; lift *= amount;
      const footY = -shoeBottom(roll) + lift;
      const drop = .790 + motion.position.y - footY;
      const distance = THREE.MathUtils.clamp(Math.hypot(drop, footZ), .05, thighLength + shinLength);
      // Solve the two-link leg instead of swinging rigid leg segments. Positive
      // knee X bends the heel backwards; the kneecap remains on the front (+Z).
      const kneeAngle = Math.acos(THREE.MathUtils.clamp(
        (distance * distance - thighLength * thighLength - shinLength * shinLength) / (2 * thighLength * shinLength), -1, 1,
      ));
      const hipAngle = Math.atan2(-footZ, drop) - Math.atan2(
        shinLength * Math.sin(kneeAngle), thighLength + shinLength * Math.cos(kneeAngle),
      );
      leg.hip.rotation.x = hipAngle;
      leg.knee.rotation.x = kneeAngle;
      leg.ankle.rotation.x = roll - hipAngle - kneeAngle;
    }
    body.rotation.z = Math.sin(phase) * .009 * amount;
    body.rotation.y = Math.sin(phase) * .014 * amount;
    for (const arm of arms) {
      const swing = Math.cos(phase + (arm.side === 1 ? Math.PI : 0));
      arm.shoulder.rotation.x = -.065 + swing * .17 * amount;
      arm.elbow.rotation.x = -.16 - Math.max(0, -swing) * .045 * amount;
    }
    head.rotation.y = -body.rotation.y * .7 + Math.sin(phase * .21) * .014 * amount;
    head.rotation.z = -body.rotation.z * .85;
  };
  animate(0, 0);
  return {group, animate, height: 1.5};
}
