import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);
scene.fog = new THREE.FogExp2(0x07111f, 0.027);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x91b9e8, 0x131221, 1.35));
const moon = new THREE.DirectionalLight(0xa6c9ff, 2.2);
moon.position.set(-8, 18, 5);
moon.castShadow = true;
scene.add(moon);

const ground = new THREE.Mesh(new THREE.CircleGeometry(24, 72), new THREE.MeshStandardMaterial({color:0x172b32,roughness:.94}));
ground.rotation.x = -Math.PI/2; ground.receiveShadow=true; scene.add(ground);

const boundary = new THREE.Mesh(new THREE.TorusGeometry(24,.42,8,72),new THREE.MeshStandardMaterial({color:0x41665e,emissive:0x10201c}));
boundary.rotation.x=Math.PI/2; boundary.position.y=.05; scene.add(boundary);

const player=new THREE.Mesh(new THREE.SphereGeometry(.7,24,18),new THREE.MeshStandardMaterial({color:0x57cfff,emissive:0x07506b,roughness:.3}));
player.position.y=.7; player.castShadow=true; scene.add(player);

const obstacles=[]; const rockGeometry=new THREE.DodecahedronGeometry(1,0);
for(let i=0;i<18;i++){const angle=i/18*Math.PI*2+Math.random*.2; const radius=7+(i%5)*2.5; const rock=new THREE.Mesh(rockGeometry,new THREE.MeshStandardMaterial({color:0x45495b,roughness:.9}));rock.position.set(Math.cos(angle)*radius,.8,Math.sin(angle)*radius);rock.scale.setScalar(.75+(i%3)*.27);rock.castShadow=true;rock.receiveShadow=true;scene.add(rock);obstacles.push(rock)}

const guardian=new THREE.Group();
const guardianBody=new THREE.Mesh(new THREE.SphereGeometry(.95,20,16),new THREE.MeshStandardMaterial({color:0x522b76,emissive:0x250b39,roughness:.42}));guardianBody.scale.set(1,1.25,.8);guardianBody.castShadow=true;guardian.add(guardianBody);
const eyeMaterial=new THREE.MeshBasicMaterial({color:0xff4169});
const eye1=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),eyeMaterial);const eye2=eye1.clone();eye1.position.set(-.32,.18,.69);eye2.position.set(.32,.18,.69);guardian.add(eye1,eye2);guardian.position.set(-17,1,-17);scene.add(guardian);

const relics=[];const relicGeometry=new THREE.OctahedronGeometry(.52,0);const relicMaterial=new THREE.MeshStandardMaterial({color:0xffd24f,emissive:0x9b5600,roughness:.24});
function spawnRelic(){const relic=new THREE.Mesh(relicGeometry,relicMaterial);const angle=Math.random()*Math.PI*2;const radius=3+Math.random()*17;relic.position.set(Math.cos(angle)*radius,.9,Math.sin(angle)*radius);relic.castShadow=true;scene.add(relic);relics.push(relic)}

const keys={};
addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelectorAll('.control').forEach(button=>{const key=button.dataset.key;const down=e=>{e.preventDefault();keys[key]=true};const up=e=>{e.preventDefault();keys[key]=false};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up)});

let yaw=Math.PI/4,pitch=.55,dragging=false,previousMouse={x:0,y:0};
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;previousMouse={x:e.clientX,y:e.clientY}});
addEventListener('pointerup',()=>dragging=false);
addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-previousMouse.x)*.005;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-previousMouse.y)*.004,.25,1.2);previousMouse={x:e.clientX,y:e.clientY}});

let score=0,lives=3,secondsLeft=90,playing=false,damageCooldown=0,timerAccumulator=0;
const scoreElement=document.querySelector('#score'),timerElement=document.querySelector('#timer'),livesElement=document.querySelector('#lives'),statusElement=document.querySelector('#status'),startScreen=document.querySelector('#start-screen'),gameOver=document.querySelector('#game-over');

function finishGame(won,message){playing=false;document.querySelector('#game-over-title').textContent=won?'نجحت في كشف السر!':'ابتلع الوادي المغامرة';document.querySelector('#final-score').textContent=`${message} — جمعت ${score} من 8 شظايا.`;gameOver.classList.remove('hidden')}
function resetGame(){score=0;lives=3;secondsLeft=90;damageCooldown=0;timerAccumulator=0;scoreElement.textContent='0 / 8';timerElement.textContent='90';livesElement.textContent='♥ ♥ ♥';statusElement.textContent='ابحث عن الشظايا...';player.position.set(0,.7,0);guardian.position.set(-17,1,-17);relics.forEach(r=>scene.remove(r));relics.length=0;for(let i=0;i<8;i++)spawnRelic()}
function startGame(){resetGame();playing=true;startScreen.classList.add('hidden');gameOver.classList.add('hidden')}
document.querySelector('#start-button').addEventListener('click',startGame);document.querySelector('#restart-button').addEventListener('click',startGame);

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);
if(playing){timerAccumulator+=dt;if(timerAccumulator>=1){secondsLeft=Math.max(0,secondsLeft-Math.floor(timerAccumulator));timerAccumulator%=1;timerElement.textContent=String(secondsLeft);if(secondsLeft<=15)statusElement.textContent='أسرع! الحارس يقترب...';if(secondsLeft<=0)finishGame(false,'نفد الوقت')}
const forward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);const side=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);if(forward||side){const move=new THREE.Vector3(-Math.sin(yaw)*forward+Math.cos(yaw)*side,0,-Math.cos(yaw)*forward-Math.sin(yaw)*side).normalize().multiplyScalar(6.7*dt);player.position.add(move);player.position.y=.7+Math.abs(Math.sin(performance.now()*.012))*.08}
const radius=player.position.length();if(radius>22.8)player.position.multiplyScalar(22.8/radius);
damageCooldown=Math.max(0,damageCooldown-dt);if(damageCooldown===0&&obstacles.some(r=>player.position.distanceTo(r.position)<r.scale.x+.65)){lives--;damageCooldown=1.5;livesElement.textContent='♥ '.repeat(lives).trim()||'—';statusElement.textContent='تجنب الصخور!';player.position.multiplyScalar(.88);if(lives<=0)finishGame(false,'فقدت قواك')}
if(playing){const direction=player.position.clone().sub(guardian.position);const guardianDistance=direction.length();direction.normalize();guardian.position.addScaledVector(direction,(1.05+(90-secondsLeft)*.012)*dt);guardian.lookAt(player.position);guardian.position.y=1+Math.sin(performance.now()*.003)*.18;if(guardianDistance<1.45&&damageCooldown===0){lives--;damageCooldown=1.8;livesElement.textContent='♥ '.repeat(lives).trim()||'—';statusElement.textContent='الحارس أمسك بك! اهرب!';player.position.addScaledVector(player.position.clone().sub(guardian.position).normalize(),2.2);if(lives<=0)finishGame(false,'غلبك حارس الوادي')}}
for(let i=relics.length-1;i>=0;i--){const relic=relics[i];relic.rotation.y+=dt*2;relic.position.y=.9+Math.sin(performance.now()*.004+i)*.18;if(player.position.distanceTo(relic.position)<1.2){scene.remove(relic);relics.splice(i,1);score++;scoreElement.textContent=`${score} / 8`;statusElement.textContent='وجدت شظية أثرية!';if(score===8)finishGame(true,'اكتملت الخريطة القديمة')}}}
const offset=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch)*9,Math.sin(pitch)*9+3,Math.cos(yaw)*Math.cos(pitch)*9);camera.position.copy(player.position).add(offset);camera.lookAt(player.position.x,player.position.y+.4,player.position.z);renderer.render(scene,camera)}

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
resetGame();animate();
