import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);
scene.fog = new THREE.FogExp2(0x07111f, 0.027);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x91b9e8, 0x131221, 1.35));
const moon = new THREE.DirectionalLight(0xa6c9ff, 2.2);
moon.position.set(-8, 18, 5);
moon.castShadow = true;
scene.add(moon);
const glow = new THREE.PointLight(0x28baff, 18, 8);
scene.add(glow);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(24, 72),
  new THREE.MeshStandardMaterial({ color: 0x172b32, roughness: 0.94 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const boundary = new THREE.Mesh(
  new THREE.TorusGeometry(24, 0.42, 8, 72),
  new THREE.MeshStandardMaterial({ color: 0x41665e, emissive: 0x10201c })
);
boundary.rotation.x = Math.PI / 2;
boundary.position.y = 0.05;
scene.add(boundary);

// Scattered stars make the valley feel larger and more mysterious.
const starGeometry = new THREE.BufferGeometry();
const starPositions = [];
for (let i = 0; i < 260; i++) {
  starPositions.push((Math.random() - 0.5) * 90, 8 + Math.random() * 24, (Math.random() - 0.5) * 90);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb9d8ff, size: 0.12 })));

const player = new THREE.Mesh(
  new THREE.SphereGeometry(0.7, 28, 20),
  new THREE.MeshStandardMaterial({ color: 0x57cfff, emissive: 0x07506b, roughness: 0.3 })
);
player.position.y = 0.7;
player.castShadow = true;
scene.add(player);
glow.position.copy(player.position);

const obstacles = [];
const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
for (let i = 0; i < 18; i++) {
  const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
  const radius = 7 + (i % 5) * 2.5;
  const rock = new THREE.Mesh(rockGeometry, new THREE.MeshStandardMaterial({ color: 0x45495b, roughness: 0.9 }));
  rock.position.set(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius);
  rock.scale.setScalar(0.75 + (i % 3) * 0.27);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  obstacles.push(rock);
}

// The valley guardian slowly hunts the player and gets faster as time runs out.
const guardian = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.SphereGeometry(0.95, 24, 18),
  new THREE.MeshStandardMaterial({ color: 0x522b76, emissive: 0x250b39, roughness: 0.42 })
);
body.scale.set(1, 1.25, 0.8);
body.castShadow = true;
guardian.add(body);
const eyes = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 12, 10),
  new THREE.MeshBasicMaterial({ color: 0xff4169 })
);
const eyeRight = eyes.clone();
eyes.position.set(-0.32, 0.18, 0.69);
eyeRight.position.set(0.32, 0.18, 0.69);
guardian.add(eyes, eyeRight);
guardian.position.set(-17, 1, -17);
scene.add(guardian);

const relics = [];
const relicGeometry = new THREE.OctahedronGeometry(0.52, 0);
const relicMaterial = new THREE.MeshStandardMaterial({ color: 0xffd24f, emissive: 0x9b5600, roughness: 0.24 });
function spawnRelic() {
  const relic = new THREE.Mesh(relicGeometry, relicMaterial);
  const angle = Math.random() * Math.PI * 2;
  const radius = 3 + Math.random() * 17;
  relic.position.set(Math.cos(angle) * radius, 0.9, Math.sin(angle) * radius);
  relic.castShadow = true;
  scene.add(relic);
  relics.push(relic);
}

const keys = Object.create(null);
addEventListener('keydown', (event) => { keys[event.key.toLowerCase()] = true; });
addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });

let yaw = Math.PI / 4;
let pitch = 0.55;
let dragging = false;
let previousMouse = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  previousMouse = { x: event.clientX, y: event.clientY };
});
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - previousMouse.x) * 0.005;
  pitch = THREE.MathUtils.clamp(pitch - (event.clientY - previousMouse.y) * 0.004, 0.25, 1.2);
  previousMouse = { x: event.clientX, y: event.clientY };
});

let score = 0;
let lives = 3;
let secondsLeft = 90;
let playing = false;
let damageCooldown = 0;
let timerAccumulator = 0;
const scoreElement = document.querySelector('#score');
const timerElement = document.querySelector('#timer');
const livesElement = document.querySelector('#lives');
const statusElement = document.querySelector('#status');
const startScreen = document.querySelector('#start-screen');
const gameOver = document.querySelector('#game-over');

function finishGame(won, message) {
  playing = false;
  document.querySelector('#game-over-title').textContent = won ? 'نجحت في كشف السر!' : 'ابتلع الوادي المغامرة';
  document.querySelector('#final-score').textContent = `${message} — جمعت ${score} من 8 شظايا.`;
  gameOver.classList.remove('hidden');
}

function resetGame() {
  score = 0;
  lives = 3;
  secondsLeft = 90;
  damageCooldown = 0;
  timerAccumulator = 0;
  scoreElement.textContent = '0 / 8';
  timerElement.textContent = '90';
  livesElement.textContent = '♥ ♥ ♥';
  player.position.set(0, 0.7, 0);
  guardian.position.set(-17, 1, -17);
  relics.forEach((relic) => scene.remove(relic));
  relics.length = 0;
  for (let i = 0; i < 8; i++) spawnRelic();
  statusElement.textContent = 'ابحث عن الشظايا... وانتبه للحارس!';
}

function startGame() {
  resetGame();
  playing = true;
  startScreen.classList.add('hidden');
  gameOver.classList.add('hidden');
}

document.querySelector('#start-button').addEventListener('click', startGame);
document.querySelector('#restart-button').addEventListener('click', startGame);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.035);

  if (playing) {
    timerAccumulator += dt;
    if (timerAccumulator >= 1) {
      const elapsedSeconds = Math.floor(timerAccumulator);
      timerAccumulator -= elapsedSeconds;
      secondsLeft = Math.max(0, secondsLeft - elapsedSeconds);
      timerElement.textContent = String(secondsLeft);
      if (secondsLeft <= 15) statusElement.textContent = 'أسرع! الحارس يزداد قوة...';
      if (secondsLeft <= 0) finishGame(false, 'نفد الوقت');
    }

    const forward = Number(Boolean(keys.w || keys.arrowup)) - Number(Boolean(keys.s || keys.arrowdown));
    const side = Number(Boolean(keys.d || keys.arrowright)) - Number(Boolean(keys.a || keys.arrowleft));
    if ((forward || side) && playing) {
      const move = new THREE.Vector3(-Math.sin(yaw) * forward + Math.cos(yaw) * side, 0,
        -Math.cos(yaw) * forward - Math.sin(yaw) * side);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(6.7 * dt);
      player.position.add(move);
      player.position.y = 0.7 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.08;
    }

    const radius = player.position.length();
    if (radius > 22.8) player.position.multiplyScalar(22.8 / radius);

    damageCooldown = Math.max(0, damageCooldown - dt);
    if (damageCooldown === 0) {
      const hitRock = obstacles.some((rock) => player.position.distanceTo(rock.position) < rock.scale.x + 0.65);
      if (hitRock) {
        lives--;
        damageCooldown = 1.5;
        livesElement.textContent = '♥ '.repeat(lives).trim() || '—';
        statusElement.textContent = 'آه! تجنب الصخور وحافظ على قلوبك.';
        player.position.multiplyScalar(0.88);
        if (lives <= 0) finishGame(false, 'فقدت قواك');
      }
    }

    const guardianDirection = player.position.clone().sub(guardian.position);
    const guardianDistance = guardianDirection.length();
    guardianDirection.normalize();
    guardian.position.addScaledVector(guardianDirection, (1.05 + (90 - secondsLeft) * 0.012) * dt);
    guardian.lookAt(player.position.x, guardian.position.y, player.position.z);
    guardian.position.y = 1 + Math.sin(performance.now() * 0.003) * 0.18;
    if (guardianDistance < 1.45 && damageCooldown === 0) {
      lives--;
      damageCooldown = 1.8;
      livesElement.textContent = '♥ '.repeat(lives).trim() || '—';
      statusElement.textContent = 'الحارس أمسك بك! اهرب!';
      const escape = player.position.clone().sub(guardian.position).normalize();
      player.position.addScaledVector(escape, 2.2);
      if (lives <= 0) finishGame(false, 'غلبك حارس الوادي');
    }

    for (let i = relics.length - 1; i >= 0; i--) {
      const relic = relics[i];
      relic.rotation.y += dt * 2;
      relic.position.y = 0.9 + Math.sin(performance.now() * 0.004 + i) * 0.18;
      if (player.position.distanceTo(relic.position) < 1.2) {
        scene.remove(relic);
        relics.splice(i, 1);
        score++;
        scoreElement.textContent = `${score} / 8`;
        statusElement.textContent = 'وجدت شظية أثرية! واصل البحث.';
        if (score === 8) finishGame(true, 'اكتملت الخريطة القديمة');
      }
    }
  }

  const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * 9, Math.sin(pitch) * 9 + 3,
    Math.cos(yaw) * Math.cos(pitch) * 9);
  camera.position.copy(player.position).add(offset);
  camera.lookAt(player.position.x, player.position.y + 0.4, player.position.z);
  glow.position.copy(player.position).add(new THREE.Vector3(0, 1, 0));
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

resetGame();
animate();
