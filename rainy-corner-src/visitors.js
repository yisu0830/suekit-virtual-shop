import { createPerson } from './person.js';

// The last confirmed dashboard value, not a live feed or unique visitor count.
export const customerTraffic = Object.freeze({
  assetRequests: 458,
  requestsPerCustomer: 100,
  maxCustomers: 8,
  source: 'snapshot',
});

export function customerCountFor(requests, perCustomer = 100, maximum = 8) {
  if (!Number.isFinite(requests) || requests < 0) return 0;
  if (!Number.isFinite(perCustomer) || perCustomer <= 0) return 0;
  if (!Number.isFinite(maximum) || maximum < 0) return 0;
  return Math.min(Math.floor(maximum), Math.round(requests / perCustomer));
}

// Independent clear activity areas replace the shared circuit and its queue.
const areas = [
  { x: [-3.70, -1.23], z: [1.82, 2.02], y: .383, start: [-3.42, 1.91] },
  { x: [-3.32, -.35], z: [3.18, 4.72], y: .285, start: [-1.68, 4.12] },
  { x: [.63, 1.86], z: [1.95, 2.04], y: .383, start: [1.64, 1.99] },
  { x: [3.90, 4.60], z: [-3.72, 1.24], y: .285, start: [4.13, -.57] },
  { x: [1.20, 3.78], z: [3.25, 5.06], y: .285, start: [2.49, 4.34] },
  { x: [-5.23, -3.96], z: [3.24, 4.75], y: .285, start: [-4.61, 3.90] },
  { x: [4.99, 5.22], z: [-3.68, .71], y: .285, start: [5.12, -2.72] },
  { x: [-3.18, -.46], z: [5.30, 5.57], y: .285, start: [-2.45, 5.42] },
];

// The approach crosses the curb between the two window-side wanderers.
const streetApproach = [[-.105, .285, 2.65], [-.105, .285, 2.43],
  [-.105, .403, 2.22], [-.105, .383, 2.08], [-.105, .383, 1.96]];
const entryPath = [[-.105, .383, 1.96], [-.105, .383, 1.56],
  [-.105, .552, 1.35], [-.105, .552, 1.04], [-.105, .651, .83],
  [-.105, .584, .64], [-.105, .584, .26], [-.105, .584, -.70]];

export function buildVisitors(ctx, traffic = customerTraffic) {
  const { THREE, scene } = ctx;
  let seed = Math.floor(Math.random() * 4294967296) >>> 0;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const group = new THREE.Group(); group.name = 'miniature customers'; scene.add(group);
  const count = customerCountFor(traffic.assetRequests, traffic.requestsPerCustomer, traffic.maxCustomers);
  const people = [];
  let shopGuest = null, opening = 0;

  const clampToArea = (point, area) => point.set(
    THREE.MathUtils.clamp(point.x, ...area.x), area.y,
    THREE.MathUtils.clamp(point.z, ...area.z),
  );

  function wander(person, avoid = null) {
    const area = person.area, start = person.group.position.clone();
    let end;
    if (avoid) {
      const corners = area.x.flatMap(x => area.z.map(z => new THREE.Vector3(x, area.y, z)));
      end = corners.sort((a, b) => b.distanceToSquared(avoid) - a.distanceToSquared(avoid))[0];
    } else {
      for (let attempt = 0; attempt < 8; attempt++) {
        end = new THREE.Vector3(area.x[0] + random() * (area.x[1] - area.x[0]), area.y,
          area.z[0] + random() * (area.z[1] - area.z[0]));
        if (end.distanceTo(start) > .72) break;
      }
    }
    const length = start.distanceTo(end);
    const initial = avoid ? start.clone().sub(avoid).setY(0).normalize()
      : new THREE.Vector3(Math.sin(person.group.rotation.y), 0, Math.cos(person.group.rotation.y));
    const first = clampToArea(start.clone().addScaledVector(initial, Math.min(.38, length * .32)), area);
    const finishDirection = end.clone().sub(start).normalize();
    const second = clampToArea(end.clone().addScaledVector(finishDirection, -Math.min(.36, length * .28)), area);
    const curve = new THREE.CubicBezierCurve3(start, first, second, end);
    person.curve = curve; person.curveLength = Math.max(.01, curve.getLength()); person.travelled = 0;
    person.path = []; person.waypoint = 0; person.state = 'walking';
  }

  function startVisit(person) {
    shopGuest = person;
    person.origin = person.group.position.toArray();
    person.connectors = person.index === 0 || person.index === 2
      ? [entryPath[0]]
      : person.index === 3 || person.index === 6
        ? [[3.82, .285, 2.65], ...streetApproach]
        : streetApproach;
    person.path = person.connectors; person.waypoint = 0;
    person.state = 'approaching'; person.wait = 0;
    person.curve = null;
  }

  for (let index = 0; index < count; index++) {
    const model = createPerson(THREE, index), area = areas[index];
    group.add(model.group); model.group.name = `miniature-customer-${index + 1}`;
    model.group.position.set(area.start[0], area.y, area.start[1]);
    model.group.rotation.y = index % 2 ? -Math.PI / 2 : Math.PI / 2;
    const person = { ...model, index, area, state: 'walking', speed: .235 + random() * .095,
      velocity: 0, stride: 0, stepTime: random() * 8, wait: index * .45,
      nextVisit: 14 + index * 7 + random() * 25, avoidanceTime: -10,
      curve: null, path: [], waypoint: 0, origin: null, connectors: [] };
    wander(person); model.animate(person.stepTime, 0); people.push(person);
  }
  // A first visit is visible without waiting for a complete wandering cycle.
  if (people[2]) {
    people[2].group.position.fromArray(entryPath[0]);
    people[2].group.rotation.y = Math.PI;
    startVisit(people[2]);
  }

  function finishWaypoint(person, time) {
    person.waypoint++;
    if (person.waypoint < person.path.length) return;
    if (person.state === 'approaching') {
      person.state = 'entering'; person.path = entryPath; person.waypoint = 1;
    } else if (person.state === 'entering') {
      person.state = 'browsing'; person.wait = 5 + random() * 7;
    } else if (person.state === 'leaving') {
      person.state = 'returning';
      person.path = [...person.connectors].reverse().slice(1).concat([person.origin]);
      person.waypoint = 0;
    } else if (person.state === 'returning') {
      shopGuest = null; person.nextVisit = time + 30 + random() * 70;
      wander(person); person.wait = 1.5 + random() * 3;
    }
  }

  function turn(person, angle, dt) {
    const difference = Math.atan2(Math.sin(angle - person.group.rotation.y), Math.cos(angle - person.group.rotation.y));
    person.group.rotation.y += difference * (1 - Math.exp(-dt * 6));
    return Math.abs(difference);
  }

  function update(time, delta) {
    const dt = Math.min(Math.max(delta, 0), .05);
    const needsDoor = shopGuest && (shopGuest.state === 'leaving'
      || (shopGuest.state === 'entering' && shopGuest.group.position.z > .1)
      || (shopGuest.state === 'browsing' && shopGuest.wait < 1));
    opening = THREE.MathUtils.damp(opening, needsDoor ? 1 : 0, 5.5, dt);
    if (opening > .999) opening = 1;
    if (opening < .001) opening = 0;
    let moving = false;
    // Encounters change a wanderer's destination instead of creating a queue.
    const order = shopGuest ? [shopGuest, ...people.filter(p => p !== shopGuest)] : people;
    for (const person of order) {
      const position = person.group.position;
      let walking = 0, desiredSpeed = 0;
      if (person.state === 'browsing') {
        person.wait -= dt;
        turn(person, -Math.PI / 2 + Math.sin(time * .5 + person.index) * .18, dt);
        if (person.wait <= 0) {
          person.state = 'leaving'; person.path = [...entryPath].reverse(); person.waypoint = 1;
        }
      } else if (person.wait > 0) {
        person.wait -= dt;
        turn(person, Math.PI + Math.sin(time * .27 + person.index) * .14, dt);
      } else {
        if (person.state === 'walking' && shopGuest && shopGuest !== person
          && position.distanceTo(shopGuest.group.position) < .82 && time - person.avoidanceTime > 1.2) {
          wander(person, shopGuest.group.position); person.avoidanceTime = time;
        }
        const roaming = person.state === 'walking';
        const remaining = roaming ? person.curveLength - person.travelled
          : Math.hypot(person.path[person.waypoint][0] - position.x, person.path[person.waypoint][2] - position.z);
        const target = roaming ? person.curve.getPointAt(Math.min(1, (person.travelled + .10) / person.curveLength))
          : new THREE.Vector3(...person.path[person.waypoint]);
        const angle = Math.atan2(target.x - position.x, target.z - position.z);
        const turning = turn(person, angle, dt);
        const waitingForDoor = (person.state === 'entering' && person.waypoint === 1 && opening < .97)
          || (person.state === 'leaving' && position.z >= .26 && opening < .97);
        desiredSpeed = waitingForDoor ? 0 : person.speed * (turning > .85 ? .48 : 1);
        if (roaming) desiredSpeed *= THREE.MathUtils.clamp(remaining / .32, .22, 1);
        person.velocity = THREE.MathUtils.damp(person.velocity, desiredSpeed, 3.5, dt);
        if (waitingForDoor) person.velocity = 0;
        const travel = Math.min(remaining, person.velocity * dt);
        const candidate = roaming ? person.curve.getPointAt(Math.min(1, (person.travelled + travel) / person.curveLength))
          : position.clone().lerp(target, remaining > .0001 ? travel / remaining : 1);
        const obstacle = people.find(other => other !== person && Math.abs(other.group.position.y - candidate.y) < .18
          && Math.hypot(other.group.position.x - candidate.x, other.group.position.z - candidate.z) < .42);
        if (!obstacle && travel > .00001) {
          position.copy(candidate);
          if (roaming) person.travelled += travel;
          person.stepTime += dt * person.velocity / .346;
          walking = 1; moving = true;
        } else if (obstacle && roaming && time - person.avoidanceTime > .9) {
          wander(person, obstacle.group.position); person.avoidanceTime = time;
          person.velocity = 0;
        }
        if (!obstacle && remaining <= travel + .001) {
          if (roaming) {
            if (!shopGuest && time >= person.nextVisit && random() < .24) startVisit(person);
            else { wander(person); person.wait = random() < .68 ? 1.5 + random() * 4.5 : 0; }
          } else { position.copy(target); finishWaypoint(person, time); }
        }
      }
      if (walking === 0) person.velocity = THREE.MathUtils.damp(person.velocity, 0, 7, dt);
      person.stride = THREE.MathUtils.damp(person.stride, walking, 7, dt);
      person.animate(person.stepTime, person.stride);
      person.umbrella.visible = raining;
      person.group.userData.activity = person.state;
    }
    return moving;
  }

  let raining = false;
  function setRaining(value) {
    raining = Boolean(value);
    for (const person of people) person.umbrella.visible = raining;
  }

  return { group, people, count, traffic, update, setRaining, get opening() { return opening; } };
}
