import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);
scene.fog = new THREE.Fog(0x07111f, 18, 48);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfdcff, 0x17233e, 2));
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(24, 64),
  new THREE.MeshStandardMaterial({ color: 0x1a8a70, roughness: 0.85 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(24, 0.35, 8, 64),
  new THREE.MeshStandardMaterial({ color: 0x70dbc1, emissive: 0x12352e })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.05;
scene.add(ring);

const player = new THREE.Mesh(
  new THREE.SphereGeometry(0.75, 32, 24),
  new THREE.MeshStandardMaterial({ color: 0x4ec9ff, roughness: 0.35, metalness: 0.15 })
);
player.position.y = 0.75;
player.castShadow = true;
scene.add(player);

const obstacles = [];
const obstacleGeometry = new THREE.DodecahedronGeometry(1, 0);
for (let i = 0; i < 16; i++) {
  const angle = (i / 16) * Math.PI * 2;
  const radius = 8 + (i % 4) * 2.5;
  const rock = new THREE.Mesh(obstacleGeometry, new THREE.MeshStandardMaterial({ color: 0x6c7087, roughness: 0.9 }));
  rock.position.set(Math.cos(angle) * radius, 0.85, Math.sin(angle) * radius);
  rock.scale.setScalar(0.7 + (i % 3) * 0.25);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  obstacles.push(rock);
}

const gems = [];
const gemGeometry = new THREE.OctahedronGeometry(0.55, 0);
const gemMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf40, emissive: 0x8a5a00, roughness: 0.25 });

function spawnGem() {
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);
  const angle = Math.random() * Math.PI * 2;
  const radius = 3 + Math.random() * 16;
  gem.position.set(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius);
  gem.castShadow = true;
  scene.add(gem);
  gems.push(gem);
}

for (let i = 0; i < 8; i++) spawnGem();

const keys = {};
addEventListener('keydown', (e) => keys[e.key.toLower] = true);
addEventListener('keyup', (e) => keys[e.key.toLower] = false);

let yaw = Math.PI / 4;
let pitch = 0.55;
let dragging = false;
let previousMouse = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; previousMouse = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  yaw -= (e.clientX - previousMouse.x) * 0.005;
  pitch = THREE.MathUtils.clamp(pitch - (e.clientY - previousMouse.y) * 0.004, 0.25, 1.25);
  previousMouse = { x: e.clientX, y: e.clientY };
});

let score = 0;
let playing = false;
const scoreElement = document.querySelector('#score');
const statusElement = document.querySelector('#status');
const startScreen = document.querySelector('#start-screen');
const gameOver = document.querySelector('#game-over');

function resetGame() {
  score = 0;
  scoreElement.textContent = '0';
  player.position.set(0, 0.75, 0);
  gems.forEach((gem) => scene.remove(gem));
  gems.length = 0;
  for (let i = 0; i < 8; i++) spawnGem();
  statusElement.textContent = 'اجمع الكرات الذهبية!';
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
    const forward = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    const side = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);

    if (forward || side) {
      const speed = 7 * dt;
      const forwardVector = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rightVector = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      player.position.addScaledVector(forwardVector, forward * speed);
      player.position.addScaledVector(rightVector, side * speed);
      player.position.y = 0.75 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.08;
    }

    const distanceFromCenter = player.position.length();
    if (distanceFromCenter > 22.8) {
      player.position.multiplyScalar(22.8 / distanceFromCenter);
      player.position.y = 0.75;
    }

    for (const rock of obstacles) {
      if (player.position.distanceTo(rock.position) < rock.scale.x + 0.75) {
        playing = false;
        document.querySelector('#game-over-title').textContent = 'اصطدمت بالصخرة!';
        document.querySelector('#final-score').textContent = `حصّلت ${score} كرة ذهبية`;
        gameOver.classList.remove('hidden');
        break;
      }
    }

    for (let i = gems.length - 1; i >= 0; i--) {
      const gem = gems[i];
      gem.rotation.y += dt * 2;
      gem.position.y = 0.8 + Math.sin(performance.now() * 0.004 + i) * 0.18;
      if (player.position.distanceTo(gem.position) < 1.25) {
        scene.remove(gem);
        gems.splice(i, 1);
        score++;
        scoreElement.textContent = String(score);
        if (gems.length === 0) {
          playing = false;
          document.querySelector('#game-over-title').textContent = 'أنت البطل!';
          document.querySelector('#final-score').textContent = `جمعت جميع الكرات الـ ${score}`;
          gameOver.classList.remove('hidden');
        }
      }
    }
  }

  gems.forEach((gem) => gem.rotation.y += dt);

  const cameraOffset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * 9,
    Math.sin(pitch) * 9 + 3,
    Math.cos(yaw) * Math.cos(pitch) * 9
  );
  camera.position.copy(player.position).add(cameraOffset);
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 0.5, 0)));

  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

resetGame();
animate();
