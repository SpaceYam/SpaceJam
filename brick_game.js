"use strict";

const board = document.querySelector("#board");
const context = board.getContext("2d");
const remaining = document.querySelector("#remaining");
const result = document.querySelector("#result");
const prompt = document.querySelector("#prompt");
const messagePanel = document.querySelector("#message-panel");

const bossHealthDisplay = document.querySelector("#boss-health");
const bossHealthCount = document.querySelector("#boss-health-count");
const fighterHealthDisplay = document.querySelector("#fighter-health");
const boss = { x: (board.width - 368) / 2, y: 14, width: 368, height: 58 };
const maxFighterHealth = fighterHealthDisplay.max;
const fighterHealthCount = document.querySelector("#fighter-health-count");
const fighterLaneDisplay = document.querySelector("#fighter-lane");
const stages = [
  {
    name: "외곽 초계선", mission: "보호막을 맞히면 주변 조각도 충격파에 맞습니다. 틈을 내 모함을 공격하고, 아래로 내려오는 인터셉터를 피하세요.",
    rows: 3, health: 4, interval: 8, warning: 1.45, laserWidth: 14, reward: 5, color: "#78c7ff", layout: "arc",
    meteorLimit: 2, meteorSpeed: 0.7, sortieStart: 13, sortieInterval: 21, divingEscort: true, shieldSplash: true,
  },
  {
    name: "쌍둥이 관문", mission: "가운데 통로가 열려 있습니다. 보라색 워프 관문에 공을 넣으면 반대편으로 나옵니다.",
    rows: 4, health: 5, interval: 6.4, warning: 1.25, laserWidth: 20, reward: 6, color: "#9bafff", layout: "split",
    meteorLimit: 3, meteorSpeed: 0.9, sortieStart: 10, sortieInterval: 18,
  },
  {
    name: "장갑 수리창", mission: "밝은 강화 장갑은 두 번 맞혀야 깨집니다. 수리 드론은 손상된 장갑을 복구하니 공으로 먼저 격추하세요.",
    rows: 5, health: 6, interval: 5.6, warning: 1.05, laserWidth: 27, reward: 7, color: "#f5b178", layout: "armor",
    meteorLimit: 4, sortieStart: 8, sortieInterval: 17,
  },
  {
    name: "잔해 항로", mission: "네온 블랙홀은 공을 휘게 합니다. 전투기가 중심에 접근하면 빨려 들어갔다가 전장의 반대쪽 아래로 이동합니다.",
    rows: 6, health: 7, interval: 4.8, warning: 0.95, laserWidth: 35, reward: 8, color: "#81e8cc", layout: "debris",
    meteorLimit: 5, meteorSpeed: 1.45, sortieStart: 7, sortieInterval: 16, gravity: "fixed",
  },
  {
    name: "봉쇄 함대 기함", mission: "움직이는 블랙홀과 수직 레이저 네 줄을 피하세요. 회전 방어 구체는 공에 맞으면 8초 동안 사라집니다.",
    rows: 7, health: 8, interval: 4.1, warning: 0.85, laserWidth: 46, reward: 0, color: "#dda0f4", layout: "flagship",
    meteorLimit: 5, meteorSpeed: 1.2, sortieStart: 6, sortieInterval: 14, laserCount: 4, gravity: "moving",
  },
];

const shopCards = [
  { id: "split", type: "weapon", icon: "🟣", name: "분열탄", cost: 4, description: "공을 두 개로 나눕니다. 두 공을 모두 놓쳐야 체력이 줄어듭니다." },
  { id: "scatter", type: "weapon", icon: "💥", name: "산탄", cost: 5, description: "공을 세 번 받아낼 때마다 보호막을 향해 산탄 다섯 발을 발사합니다." },
  { id: "pulse", type: "weapon", icon: "⚡", name: "연쇄 파동탄", cost: 3, description: "공이 보호막에 4번 명중하면 옆 조각에도 피해를 줍니다. 첫 스테이지에서는 기본 충격파보다 한 칸 더 퍼집니다." },
  { id: "heavy", type: "weapon", icon: "💫", name: "중력 충격탄", cost: 5, description: "공이 모함 선체에 닿으면 피해 2를 줍니다." },
  { id: "swift", type: "support", icon: "🚀", name: "가속 코어", cost: 3, description: "공의 이동 속도를 20% 높입니다." },
  { id: "wings", type: "support", icon: "🔧", name: "장거리 날개", cost: 4, description: "전투기의 기본 너비를 150px에서 180px로 늘립니다." },
  { id: "guard", type: "support", icon: "🛡️", name: "광선 차폐막", cost: 4, description: "스테이지마다 적 레이저를 한 번 막아 줍니다." },
];

const stageLabel = document.querySelector("#stage-label");
const missionHint = document.querySelector("#mission-hint");
const launchButton = document.querySelector("#launch");
const shopButton = document.querySelector("#toggle-shop");
const shop = document.querySelector("#shop");
const shopList = document.querySelector("#shop-cards");
const shopStatus = document.querySelector("#shop-status");
const pauseNotice = document.querySelector("#pause-notice");
const creditsDisplay = document.querySelector("#credits");
const shopCredits = document.querySelector("#shop-credits");
const activeDeck = document.querySelector("#active-deck");
const deckCount = document.querySelector("#deck-count");
const ownedCards = new Set();
const creditedShields = new Set();
const cardButtons = new Map();
const deck = new Set();
let stageIndex = 0;
let stage = stages[stageIndex];
let credits = 5;
let shieldHits = 0;
let totalShields = 0;
let shieldLines;
const laserDuration = 1;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

const columns = 9;
const shieldCenterY = -36;
const shieldRadiusX = board.width * 0.625;
const shieldInnerRadiusY = 180;
const shieldLayerHeight = 157 / 7;
const portalRadius = 35;
const portals = [
  { x: board.width * 0.29, y: 385 },
  { x: board.width * 0.72, y: 535 },
];
const fixedGravityWell = { x: board.width * 0.68, y: 590, radius: 142, captureRadius: 77 };
const gravityWell = { ...fixedGravityWell };
const gravityWarpTime = 0.42;
const fighterWidth = 150;
const fighterBaseY = board.height - 32;
const maxFighterLane = 4;
const fighterTopY = Math.round(board.height * 0.42);
const paddle = { x: 0, y: fighterBaseY, vx: 0, vy: 0, width: fighterWidth, height: 12 };

const meteorSizes = [6, 10, 15, 22, 31];
const meteorLanes = [-108, -56, -7, 53, 111];
let meteors;
let meteorCounts;
let nextMeteorWave;

// 작은 파편은 운석 띠의 배경으로만 그린다.
const beltDebris = Array.from({ length: 96 }, (_, index) => {
  const pattern = (value) => {
    const bits = Math.imul(value, 1597334677);
    return (Math.imul(bits ^ (bits >>> 16), 2246822519) >>> 0) / 4294967296;
  };
  return {
    x: board.width * pattern(index + 1),
    lane: (pattern(index * 7 + 3) - 0.5) * 300,
    size: 0.7 + pattern(index * 5 + 2) ** 2 * (index % 6 === 0 ? 9.2 : 4.8),
    speed: 9 + pattern(index * 11 + 4) * 23,
    light: index % 4 === 0,
  };
});
const scout = { x: 74, y: 405, radius: 20, health: 2, pass: 0, visible: true, flash: 0 };
const ballSpeed = 560;
const boostDuration = 8;
const pickupRadius = 15;
const paddleSpeed = 940;
const paddleVerticalSpeed = 620;
const paddleAcceleration = 4600;
const paddleBraking = 8000;
const step = 1 / 240;
const keys = new Set();

let bricks;
let bricksLeft;
let state = "ready";
let lastTime = null;
let elapsed = 0;
let bossHealth;
let fighterHealth;
let attackClock;
let targetX;
let targetY;
let verticalLaserOrigins;
let flightTime;
let relaunchTime;
let beamTime;
let beamHit;
let pickups;
let wingTime;
let boostTime;
let paddleThrust;
let laserGuard;
let guardCardSpent;
let balls;
let pellets;
let splitUsed;
let pendingSplit;
let scatterReturns;
let escorts;
let escortShots;
let nextSortie;
let sortieCount;
let repairDrone;
let nextRepair;
let orbitGuards;
let impacts;
let comicColorIndex;
let effectTime = 0;
let lastEffectTime = null;
let fighterFlashEnd;
let fighterDestroyed;
let fighterVortex;
let gravityReadyAt;
const ballCount = document.querySelector("#ball-count");

const itemStatus = document.querySelector("#item-status");
const itemTypes = [
  { name: "수리", icon: "repair", label: "체력 회복", color: "#8affb7", apply() {
    fighterHealth = Math.min(maxFighterHealth, fighterHealth + 1);
    updateFighterHealth();
  }},
  { name: "플라즈마 가속 · 8초", icon: "boost", label: "공 가속", color: "#ffc187", apply() {
    const previousSpeed = currentBallSpeed();
    boostTime = boostDuration;
    rescaleBalls(previousSpeed);
  }},
  { name: "날개 확장 · 12초", icon: "wings", label: "날개 확장", color: "#8beaff", apply() { wingTime = 12; }},
  { name: "레이저 방어 · 1회", icon: "guard", label: "레이저 방어", color: "#ffe4a1", apply() { laserGuard = true; }},
  { name: "공 분열", icon: "split", label: "공 분열", color: "#c3aaff", apply() {
    if (relaunchTime > 0) pendingSplit = true;
    else splitBall();
  } },
];

function shieldPoint(height, x) {
  const fraction = x / board.width;
  let profile = 0;
  if (stage.layout === "split") profile = Math.abs(fraction - 0.5) * 42 - 9;
  if (stage.layout === "armor") profile = 20 * Math.sin(fraction * Math.PI * 3) + 10;
  if (stage.layout === "debris") profile = 32 * fraction;
  if (stage.layout === "flagship") profile = 24 * Math.sin(fraction * Math.PI * 4) + 14;
  const offset = (x - board.width / 2) / shieldRadiusX;
  return [x, shieldCenterY + Math.sqrt(1 - offset ** 2) * shieldInnerRadiusY + height + profile];
}

function makeShield(_, index) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  if (stage.layout === "split" && column === 4) return null;
  if (stage.layout === "debris" && ((row + 2 * column) % 5 === 0 || row > column + 2)) return null;
  if (stage.layout === "flagship" && row < 2 && column % 2 === 0) return null;
  const inner = shieldLayerHeight * row;
  const outer = shieldLayerHeight * (row + 1);
  const left = column * board.width / columns;
  const right = (column + 1) * board.width / columns;
  const middle = (left + right) / 2;
  const points = [
    shieldPoint(inner, left), shieldPoint(inner, middle), shieldPoint(inner, right),
    shieldPoint(outer, right), shieldPoint(outer, middle), shieldPoint(outer, left),
  ];
  const ys = points.map(([, y]) => y);
  const armor = (stage.layout === "armor" && (row + column) % 2 === 0)
    || (stage.layout === "flagship" && row > 4 && column % 2 === 1);
  return {
    points,
    left,
    right,
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    row,
    column,
    maxHealth: armor ? 2 : 1,
    health: armor ? 2 : 1,
    active: true,
  };
}

function createBall() {
  return { x: 0, y: 0, vx: 0, vy: 0, radius: 13 };
}

function dockBall(ball) {
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius;
}

function currentBallSpeed() {
  const cardBonus = deck.has("swift") ? 0.2 : 0;
  const pickupBonus = boostTime > 0 ? 0.3 : 0;
  return ballSpeed * (1 + cardBonus + pickupBonus);
}

function rescaleBalls(previousSpeed) {
  const ratio = currentBallSpeed() / previousSpeed;
  if (ratio === 1) return;
  for (const ball of balls) {
    ball.vx *= ratio;
    ball.vy *= ratio;
  }
}

function splitBall() {
  if (balls.length !== 1) return;
  const ball = balls[0];
  if (ball.vx === 0 && ball.vy === 0) return;

  const angle = (ball.vx < 0 ? 1 : -1) * Math.PI / 5;
  balls.push({
    ...ball,
    vx: ball.vx * Math.cos(angle) - ball.vy * Math.sin(angle),
    vy: ball.vx * Math.sin(angle) + ball.vy * Math.cos(angle),
    extra: true,
  });
  ballCount.textContent = balls.length;
}

function launchBall() {
  const ball = balls[0];
  ball.vx = currentBallSpeed() * (ball.x > board.width / 2 ? -0.6 : 0.6);
  ball.vy = -currentBallSpeed() * 0.8;
  splitUsed = deck.has("split");
  if (splitUsed || pendingSplit) splitBall();
  pendingSplit = false;
}

function fireScatter(angle) {
  const speed = 725;
  const x = paddle.x + paddle.width / 2;
  for (let index = -2; index <= 2; index += 1) {
    const direction = angle * 0.45 + index * 0.21;
    pellets.push({
      x, y: paddle.y - 16, radius: 3,
      vx: speed * Math.sin(direction), vy: -speed * Math.cos(direction),
    });
  }
  itemStatus.textContent = "산탄 5발 발사";
}

function advancePellets() {
  pellets = pellets.filter((pellet) => {
    pellet.x += pellet.vx * step;
    pellet.y += pellet.vy * step;
    if (pellet.y < 0 || pellet.x < 0 || pellet.x > board.width) return false;
    return !bounceOffBrick(pellet, true) && !bounceOffBoss(pellet, 0);
  });
}

function updateBossHealth() {
  bossHealthDisplay.value = bossHealth;
  bossHealthCount.textContent = bossHealth + " / " + stage.health;
}

function updateFighterHealth() {
  fighterHealthDisplay.value = fighterHealth;
  fighterHealthCount.textContent = fighterHealth + " / " + maxFighterHealth;
}

function damageFighter(x = paddle.x + paddle.width / 2, amount = 1) {
  emitImpact(x, paddle.y + 6, "#ff805f", 1.35, "퍽!");
  fighterFlashEnd = effectTime + 0.29;
  fighterHealth = Math.max(0, fighterHealth - amount);
  updateFighterHealth();
  if (fighterHealth === 0) finishGame(false);
}

function advancePickups() {
  pickups = pickups.filter((item) => {
    item.y += 170 * step;
    if (!fighterVortex && item.y + pickupRadius >= paddle.y && item.y - pickupRadius <= paddle.y + paddle.height
        && item.x + pickupRadius >= paddle.x && item.x - pickupRadius <= paddle.x + paddle.width) {
      item.type.apply();
      emitImpact(item.x, paddle.y - 5, item.type.color, 0.85, pickupCaptions[item.type.icon] ?? "획득!");
      itemStatus.textContent = item.type.name + " 획득";
      return false;
    }
    return item.y - pickupRadius <= board.height;
  });
}

function drawStarfield() {
  const sky = document.querySelector(".starfield");
  let seed = 2739;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let index = 0; index < 198; index += 1) {
    const star = document.createElement("i");
    star.style.left = (random() * 100) + "%";
    star.style.top = (random() * 100) + "%";
    const size = (0.5 + random() ** 2 * 1.75) + "px";
    star.style.width = size;
    star.style.height = size;
    const brightness = random();
    star.style.opacity = 0.16 + brightness * 0.75;
    if (brightness > 0.82) star.className = index % 3 === 0 ? "star-warm" : "star-cool";
    sky.append(star);
  }
}

function resetBoard() {
  bricks = Array.from({ length: stage.rows * columns }, makeShield).filter(Boolean);
  totalShields = bricks.length;
  const samples = columns * 2;
  shieldLines = [0.06, 0.45, 0.72, 0.94].map((depth) =>
    Array.from({ length: samples + 1 }, (_, point) =>
      shieldPoint(depth * shieldLayerHeight * stage.rows, point * board.width / samples)));
  shieldHits = 0;
  bricksLeft = bricks.length;
  remaining.textContent = bricksLeft;
  bossHealth = stage.health;
  bossHealthDisplay.max = stage.health;
  fighterHealth = maxFighterHealth;
  updateBossHealth();
  updateFighterHealth();
  attackClock = 0;
  targetX = null;
  targetY = fighterBaseY;
  verticalLaserOrigins = [];
  flightTime = 0;
  impacts = [];
  comicColorIndex = 0;
  fighterFlashEnd = 0;
  fighterDestroyed = false;
  fighterVortex = null;
  gravityReadyAt = 0;
  Object.assign(gravityWell, fixedGravityWell);
  if (stage.gravity === "moving") {
    Object.assign(gravityWell, movingGravityPosition(0), { radius: 118, captureRadius: 64 });
  }
  escorts = [];
  escortShots = [];
  nextSortie = stage.sortieStart;
  repairDrone = null;
  nextRepair = 8;
  orbitGuards = stage.layout === "flagship"
    ? [0, Math.PI].map((phase) => ({ phase, x: board.width / 2 + 190 * Math.cos(phase), y: 400, radius: 19, disabledUntil: 0 }))
    : [];
  sortieCount = 0;
  relaunchTime = 0;
  beamTime = 0;
  beamHit = false;
  pickups = [];
  wingTime = 0;
  boostTime = 0;
  paddleThrust = 0;
  paddle.vx = 0;
  paddle.y = fighterBaseY;
  paddle.vy = 0;
  fighterLaneDisplay.textContent = "0.0";
  laserGuard = false;
  guardCardSpent = false;
  itemStatus.textContent = "";
  meteorCounts = [];
  spawnMeteorWave(true);
  Object.assign(scout, { x: 74, y: 405, health: 2, pass: 0, visible: true, flash: 0 });
  paddle.width = deck.has("wings") ? 180 : fighterWidth;
  paddle.x = (board.width - paddle.width) / 2;
  balls = [createBall()];
  pellets = [];
  scatterReturns = 0;
  pendingSplit = false;
  ballCount.textContent = 1;
  dockBall(balls[0]);
  launchBall();
}

function updateEquipment() {
  const names = shopCards.filter((card) => deck.has(card.id)).map((card) => card.icon + " " + card.name);
  activeDeck.textContent = names.length ? "장착 · " + names.join(" / ") : "장착 카드 없음";
  creditsDisplay.textContent = credits;
  shopCredits.textContent = credits;
  deckCount.textContent = deck.size;
  for (const card of shopCards) {
    const action = cardButtons.get(card.id);
    if (ownedCards.has(card.id)) {
      action.textContent = deck.has(card.id) ? "장착 해제" : "장착";
      action.disabled = deck.size >= 2 && !deck.has(card.id);
    } else {
      action.textContent = card.cost + " 크레딧에 구입";
      action.disabled = credits < card.cost;
    }
  }
}

function buildShop() {
  const groups = new Map([
    ["weapon", ["🔫 무기", document.createElement("section")]],
    ["support", ["🛠️ 지원 옵션", document.createElement("section")]],
  ]);
  for (const [name, group] of groups.values()) {
    const heading = document.createElement("h3");
    heading.textContent = name;
    group.className = "shop-group";
    group.append(heading);
    shopList.append(group);
  }

  for (const card of shopCards) {
    const article = document.createElement("article");
    const title = document.createElement("h4");
    const detail = document.createElement("p");
    const action = document.createElement("button");
    title.textContent = card.icon + " " + card.name;
    detail.textContent = card.description;
    action.type = "button";
    action.addEventListener("click", () => selectCard(card));
    article.append(title, detail, action);
    groups.get(card.type)[1].append(article);
    cardButtons.set(card.id, action);
  }
}

function selectCard(card) {
  if (state === "complete" || shop.hidden) return;
  const previousSpeed = currentBallSpeed();
  if (!ownedCards.has(card.id)) {
    if (credits < card.cost) return;
    credits -= card.cost;
    ownedCards.add(card.id);
    if (deck.size < 2) {
      deck.add(card.id);
      shopStatus.textContent = card.name + " 구입 및 장착";
    } else {
      shopStatus.textContent = card.name + " 구입 완료 · 장착 슬롯이 가득 찼습니다";
    }
  } else if (deck.has(card.id)) {
    deck.delete(card.id);
    shopStatus.textContent = card.name + " 장착 해제";
  } else if (deck.size < 2) {
    deck.add(card.id);
    shopStatus.textContent = card.name + " 장착";
  } else {
    return;
  }
  if (state === "playing") {
    rescaleBalls(previousSpeed);
    if (deck.has("split") && !splitUsed && relaunchTime === 0 && balls.length === 1) {
      splitUsed = true;
      splitBall();
    }
    if (!deck.has("scatter")) scatterReturns = 0;
    draw();
  }
  updateEquipment();
}

function syncShopPause() {
  launchButton.disabled = !shop.hidden;
  pauseNotice.hidden = state !== "playing" || shop.hidden;
  pauseNotice.textContent = pauseNotice.hidden ? "" : "일시정지 · 상점을 닫으면 전투가 이어집니다";
  keys.clear();
  // 상점에서 보낸 시간을 다음 전투 프레임에 더하지 않는다.
  lastTime = null;
  lastEffectTime = null;
}

function closeShop() {
  shop.hidden = true;
  shopButton.setAttribute("aria-expanded", "false");
  syncShopPause();
  if (state !== "complete") shopButton.focus();
}

function toggleShop() {
  if (state === "complete") return;
  if (!shop.hidden) {
    closeShop();
    return;
  }
  shopStatus.textContent = "";
  shop.hidden = false;
  shopButton.setAttribute("aria-expanded", "true");
  syncShopPause();
  updateEquipment();
  document.querySelector("#close-shop").focus();
}

function showBriefing(title, instruction) {
  stageLabel.textContent = (stageIndex + 1) + " / " + stages.length + " · " + stage.name;
  result.textContent = title;
  result.hidden = !title;
  prompt.textContent = instruction;
  missionHint.textContent = stage.mission;
  missionHint.hidden = state === "complete";
  messagePanel.hidden = false;
  shopButton.hidden = state === "complete";
  launchButton.textContent = state === "complete" ? "처음부터 시작" : state === "failed" ? "재도전" : "출격";
  updateEquipment();
}

function startGame() {
  if (state === "playing" || !shop.hidden) return;
  launchButton.blur();
  if (state === "complete") {
    stageIndex = 0;
    stage = stages[0];
    credits = 5;
    ownedCards.clear();
    creditedShields.clear();
    deck.clear();
    updateEquipment();
  }
  resetBoard();
  stageLabel.textContent = (stageIndex + 1) + " / " + stages.length + " · " + stage.name;
  state = "playing";
  lastTime = null;
  elapsed = 0;
  result.hidden = true;
  messagePanel.hidden = true;
  draw();
}

function finishGame(won) {
  if (!won) {
    state = "failed";
    showBriefing("전투기 손실", "현재 스테이지에 다시 도전할 수 있습니다");
    return;
  }
  if (stageIndex === stages.length - 1) {
    state = "complete";
    closeShop();
    showBriefing("봉쇄 돌파 성공", "기함을 격파했습니다. 피난선이 안전하게 항로를 통과했습니다.");
    return;
  }
  const reward = stage.reward;
  credits += reward;
  creditedShields.clear();
  stageIndex += 1;
  stage = stages[stageIndex];
  state = "ready";
  resetBoard();
  showBriefing("모함 격파 · +" + reward + " 크레딧", "덱을 정비하거나 다음 스테이지에 출격하세요");
}

function damageShield(brick, x, y, splash = false) {
  const caption = brick.health > 1 ? (brick.column % 2 === 0 ? "쨍!" : "파직!")
    : shieldCaptions[(totalShields - bricksLeft) % shieldCaptions.length];
  emitImpact(x, y, stage.color, splash ? 0.82 : brick.health > 1 ? 0.86 : 1.15,
    splash ? "" : caption, stage.shieldSplash && !splash);
  brick.health -= 1;
  if (brick.health > 0) return;
  brick.active = false;
  const tileKey = brick.row * columns + brick.column;
  if (!creditedShields.has(tileKey)) {
    creditedShields.add(tileKey);
    credits += 1;
    updateEquipment();
  }
  bricksLeft -= 1;
  remaining.textContent = bricksLeft;
  const broken = totalShields - bricksLeft;
  if (broken % 5 === 0) {
    const type = itemTypes[(broken / 5 - 1) % itemTypes.length];
    pickups.push({ x, y, type });
  }
}

function bounceOffBrick(ball, isPellet = false) {
  for (const brick of bricks) {
    if (!brick.active || ball.x + ball.radius < brick.left || ball.x - ball.radius > brick.right
        || ball.y + ball.radius < brick.top || ball.y - ball.radius > brick.bottom) continue;

    let nearestX = 0;
    let nearestY = 0;
    let distance = Infinity;

    // 조각의 가장자리에 닿은 점을 찾아 실제 모양대로 반사한다.
    for (const [index, [x, y]] of brick.points.entries()) {
      const [nextX, nextY] = brick.points[(index + 1) % brick.points.length];
      const dx = nextX - x;
      const dy = nextY - y;
      const projected = ((ball.x - x) * dx + (ball.y - y) * dy) / (dx * dx + dy * dy);
      const amount = Math.max(0, Math.min(1, projected));
      const edgeX = x + amount * dx;
      const edgeY = y + amount * dy;
      const edgeDistance = Math.hypot(ball.x - edgeX, ball.y - edgeY);
      if (edgeDistance < distance) {
        distance = edgeDistance;
        nearestX = edgeX;
        nearestY = edgeY;
      }
    }

    if (distance === 0 || distance > ball.radius) continue;
    const nx = (ball.x - nearestX) / distance;
    const ny = (ball.y - nearestY) / distance;
    const approach = ball.vx * nx + ball.vy * ny;
    if (approach >= 0) continue;

    ball.x = nearestX + nx * ball.radius;
    ball.y = nearestY + ny * ball.radius;
    ball.vx -= 2 * approach * nx;
    ball.vy -= 2 * approach * ny;
    damageShield(brick, nearestX, nearestY);
    if (stage.shieldSplash) {
      for (const neighbor of bricks) {
        const distance = Math.abs(neighbor.row - brick.row) + Math.abs(neighbor.column - brick.column);
        if (neighbor.active && distance === 1) {
          damageShield(neighbor, (neighbor.left + neighbor.right) / 2, (neighbor.top + neighbor.bottom) / 2, true);
        }
      }
    }
    if (isPellet) return true;
    shieldHits += 1;
    if (deck.has("pulse") && shieldHits % 4 === 0) {
      const adjacent = bricks.find((piece) => piece.active && piece.row === brick.row
        && Math.abs(piece.column - brick.column) === (stage.shieldSplash ? 2 : 1));
      if (adjacent) {
        damageShield(adjacent, (adjacent.left + adjacent.right) / 2, adjacent.bottom, true);
        itemStatus.textContent = "연쇄 파동탄 · 인접 보호막 타격";
      }
    }
    return true;
  }
  return false;
}

function bounceOffObstacle(ball, { x, y, radius }) {
  const dx = ball.x - x;
  const dy = ball.y - y;
  const distance = Math.hypot(dx, dy);
  const contact = ball.radius + radius;
  if (distance === 0 || distance > contact) return false;

  const nx = dx / distance;
  const ny = dy / distance;
  const approach = ball.vx * nx + ball.vy * ny;
  ball.x = x + nx * contact;
  ball.y = y + ny * contact;
  if (approach >= 0) return false;

  ball.vx -= 2 * approach * nx;
  ball.vy -= 2 * approach * ny;
  return true;
}

function beltY(x) {
  return board.height * 0.52 + (x / board.width - 0.5) * 115;
}

function spawnMeteorWave(initial = false) {
  if (meteorCounts.length === 0) meteorCounts = Array.from({ length: stage.meteorLimit }, (_, index) => index + 1);
  const countIndex = Math.floor(Math.random() * meteorCounts.length);
  const [count] = meteorCounts.splice(countIndex, 1);
  const availableSizes = [...meteorSizes];
  const availableLanes = [...meteorLanes];
  const waveDirection = Math.random() < 0.5 ? -1 : 1;
  meteors = Array.from({ length: count }, (_, index) => {
    const [radius] = availableSizes.splice(Math.floor(Math.random() * availableSizes.length), 1);
    const [lane] = availableLanes.splice(Math.floor(Math.random() * availableLanes.length), 1);
    const direction = index % 2 === 0 ? waveDirection : -waveDirection;
    const margin = radius + 24;
    const entry = direction > 0 ? -margin : board.width + margin;
    const x = initial ? (index + 0.65) * board.width / (count + 0.3) : entry;
    const y = beltY(x) + lane;
    return {
      x, y, radius, lane, direction, margin, startX: x,
      entersAt: flightTime + (initial ? 0 : index * 0.7),
      speed: 100 + Math.random() * 48,
      texture: makeMeteorTexture({ x: x + Math.random() * 1000, y, radius }),
    };
  });
  nextMeteorWave = null;
}

function advanceObstacles() {
  if (meteors.length === 0 && nextMeteorWave !== null && flightTime >= nextMeteorWave) {
    spawnMeteorWave();
  }
  for (const meteor of meteors) {
    const age = Math.max(0, flightTime - meteor.entersAt);
    meteor.x = meteor.startX + meteor.direction * age * meteor.speed * (stage.meteorSpeed ?? 1);
    meteor.y = beltY(meteor.x) + meteor.lane + Math.sin(age * 0.8) * 4;
  }
  meteors = meteors.filter((meteor) => meteor.direction > 0
    ? meteor.x < board.width + meteor.margin : meteor.x > -meteor.margin);
  if (meteors.length === 0 && nextMeteorWave === null) nextMeteorWave = flightTime + 1.1;

  const pass = Math.floor(flightTime / 20);
  const phase = flightTime % 20;
  if (pass !== scout.pass) {
    scout.pass = pass;
    scout.health = 2;
    scout.flash = 0;
  }
  scout.x = (pass === 0 ? 74 : -scout.radius) + phase * 112;
  scout.y = 405 + Math.sin(phase * 1.8) * 5;
  scout.visible = scout.x - scout.radius < board.width;
  scout.flash = Math.max(0, scout.flash - step);
}

function checkFlightContacts() {
  if (fighterVortex) return;
  const left = paddle.x;
  const right = left + paddle.width;
  const center = (left + right) / 2;
  const y = paddle.y;

  // 날개와 조종석 사이의 빈 공간은 충돌 영역에서 제외한다.
  const zones = [
    [left, left + 26, y - 17, y + 23],
    [right - 26, right, y - 17, y + 23],
    [center - 18, center + 18, y - 9, y + 21],
    [left + 12, right - 12, y - 1, y + 10],
  ];
  const touchesFighter = ({ x, y, radius }) => zones.some(([minX, maxX, minY, maxY]) => {
    const nx = Math.max(minX, Math.min(maxX, x));
    const ny = Math.max(minY, Math.min(maxY, y));
    return (x - nx) ** 2 + (y - ny) ** 2 <= radius ** 2;
  });

  meteors = meteors.filter((meteor) => {
    if (state !== "playing" || !touchesFighter(meteor)) return true;
    emitImpact(meteor.x, meteor.y, "#ffbf79", Math.max(1.25, meteor.radius / 12), "콰앙!");
    damageFighter(meteor.x, 2);
    itemStatus.textContent = "운석 충돌 · 전투기 체력 2 감소";
    return false;
  });

  if (state !== "playing" || !stage.divingEscort) return;
  for (const craft of escorts) {
    if (craft.destroyed !== null || !touchesFighter(craft)) continue;
    craft.destroyed = effectTime;
    emitImpact(craft.x, craft.y, "#ffca7d", 1.65, "폭발!");
    damageFighter(craft.x);
    if (fighterHealth === 0) {
      fighterDestroyed = true;
      emitImpact(center, y + 6, "#ffa665", 2.9, "콰앙!");
    }
    itemStatus.textContent = "인터셉터 충돌 · 전투기 체력 1 감소";
    break;
  }
}

function advanceEscorts() {
  if (flightTime >= nextSortie) {
    const directions = stage.divingEscort ? [1] : sortieCount % 2 === 0 ? [sortieCount % 4 === 0 ? 1 : -1] : [-1, 1];
    for (const direction of directions) {
      escorts.push({
        direction, launched: flightTime, destroyed: null, radius: 22,
        diveX: paddle.x + paddle.width / 2,
        aim: null, aimY: null, fireAt: direction < 0 ? 3.3 : 3.9, fired: false,
      });
    }
    sortieCount += 1;
    nextSortie += stage.sortieInterval;
  }

  const bayX = boss.x + boss.width / 2;
  const bayY = boss.y + boss.height - 4;
  escorts = escorts.filter((craft) => {
    if (craft.destroyed !== null) return effectTime - craft.destroyed < 0.64;
    const age = flightTime - craft.launched;
    if (stage.divingEscort) {
      const approach = Math.min(1, age / 2.8);
      const turn = approach ** 2 * (3 - 2 * approach);
      craft.x = bayX + (craft.diveX - bayX) * turn;
      craft.y = bayY + age * 238;
      const lateral = (craft.diveX - bayX) * 6 * approach * (1 - approach) / 2.8;
      craft.angle = Math.atan2(238, lateral);
      return craft.y - craft.radius < board.height;
    }
    const open = 1 - Math.exp(-age * 0.9);
    craft.x = bayX + craft.direction * (14 + 58 * age + 8 * age ** 2);
    craft.y = bayY + 369 * open + 13 * Math.sin(age);
    craft.angle = Math.atan2(332.1 * (1 - open) + 13 * Math.cos(age),
      craft.direction * (58 + 16 * age));
    if (!craft.fired && age >= craft.fireAt - 0.6 && craft.aim === null
        && craft.y >= 350 && paddle.y - craft.y >= 84) {
      craft.aim = paddle.x + paddle.width / 2;
      craft.aimY = paddle.y;
    }
    if (craft.aim !== null && age >= craft.fireAt && !craft.fired) {
      const volley = { hit: false };
      const vy = 510;
      for (const side of [-1, 1]) {
        const x = craft.x - Math.sin(craft.angle) * side * 22;
        const y = craft.y + Math.cos(craft.angle) * side * 22;
        const target = craft.aim + side * 13;
        escortShots.push({ x, y, vx: (target - x) * vy / (craft.aimY - y), vy, volley });
      }
      craft.fired = true;
      craft.aim = null;
    }
    return craft.x > -32 && craft.x < board.width + 32;
  });
}

function advanceEscortShots(previousPaddleY = paddle.y) {
  escortShots = escortShots.filter((shot) => {
    const previousY = shot.y;
    shot.x += shot.vx * step;
    shot.y += shot.vy * step;
    if (state === "playing" && !fighterVortex && previousY < previousPaddleY && shot.y >= paddle.y
        && shot.x + 6 >= paddle.x && shot.x - 6 <= paddle.x + paddle.width) {
      if (!shot.volley.hit) {
        shot.volley.hit = true;
        damageFighter(shot.x);
        if (state === "playing") itemStatus.textContent = "적 소형기 에너지탄에 피격";
      }
      return false;
    }
    return shot.y < board.height + 22;
  });
}

function hitEscort(ball) {
  for (const craft of escorts) {
    // 격납고에서 보호막 아래쪽으로 나왔을 때만 공과 부딪힌다.
    if (craft.destroyed !== null || craft.y < 350) continue;
    if (bounceOffObstacle(ball, craft)) {
      craft.destroyed = effectTime;
      emitImpact(craft.x, craft.y, "#ffcf92", 1.2, "폭발!");
      itemStatus.textContent = "적 소형기 격추";
      return;
    }
  }
}

function bounceOffBoss(ball, damage = deck.has("heavy") ? 2 : 1) {
  const hullY = boss.y + boss.height;
  if (ball.vy >= 0 || ball.y - ball.radius > hullY || ball.y + ball.radius < boss.y) return false;

  // 보호막은 선체에 닿기 전에 공을 막는다. 틈을 통과한 공은 남은 보호막 수와 관계없이 피해를 준다.
  ball.y = hullY + ball.radius;
  ball.vy = -ball.vy;
  if (damage <= 0) return true;

  bossHealth = Math.max(0, bossHealth - damage);
  updateBossHealth();
  if (bossHealth === 0) {
    finishGame(true);
    emitImpact(ball.x, hullY, "#ffb466", 2.6, "콰앙!");
  } else {
    emitImpact(ball.x, hullY, "#ffa273", 1.45, "쾅!");
    itemStatus.textContent = "모함 선체 명중 · 피해 " + damage;
  }
  return true;
}

function pickVerticalLaserOrigins(count) {
  const margin = stage.laserWidth / 2 + 16;
  const spacing = stage.laserWidth + 235;
  const span = board.width - 2 * margin - spacing * (count - 1);
  const offsets = Array.from({ length: count }, () => Math.random() * span).sort((a, b) => a - b);
  return offsets.map((offset, index) => margin + spacing * index + offset);
}

function laserBeams() {
  if (targetX === null) return [];
  if (verticalLaserOrigins.length) {
    return verticalLaserOrigins.map((originX) => ({ originX, slope: 0 }));
  }
  const originX = boss.x + boss.width / 2;
  const slope = (targetX - originX) / (targetY - boss.y - boss.height);
  return [{ originX, slope }];
}

function laserXAtY(beam, y) {
  return beam.originX + beam.slope * (y - boss.y - boss.height);
}

function hasLaserGuard() {
  return laserGuard || (deck.has("guard") && !guardCardSpent);
}

function advanceEnemyAttack() {
  if (beamTime > 0) {
    let impactX;
    if (!beamHit && !fighterVortex) {
      for (const beam of laserBeams()) {
        const x = laserXAtY(beam, paddle.y);
        const radius = stage.laserWidth / 2 * Math.hypot(1, beam.slope);
        if (x + radius >= paddle.x && x - radius <= paddle.x + paddle.width) {
          impactX = Math.max(paddle.x, Math.min(paddle.x + paddle.width, x));
          break;
        }
      }
    }
    if (impactX !== undefined) {
      beamHit = true;
      if (hasLaserGuard()) {
        if (laserGuard) laserGuard = false;
        else guardCardSpent = true;
        emitImpact(impactX, paddle.y, "#ffe1a3", 1);
        itemStatus.textContent = "레이저 방어를 사용했습니다";
      } else {
        damageFighter(impactX);
      }
    }
    beamTime -= step;
    if (beamTime <= 0) targetX = null;
    return;
  }

  attackClock += step;
  if (targetX === null && attackClock >= stage.interval - stage.warning) {
    targetX = paddle.x + paddle.width / 2;
    targetY = paddle.y;
    verticalLaserOrigins = stage.laserCount ? pickVerticalLaserOrigins(stage.laserCount) : [];
  }
  if (attackClock >= stage.interval) {
    beamTime = laserDuration;
    beamHit = false;
    attackClock = 0;
  }
}

function movingGravityPosition(time) {
  const phase = time * Math.PI * 2 / 13;
  return {
    x: board.width * (0.55 - 0.23 * Math.cos(phase)),
    y: 586 + 62 * Math.sin(phase) + 15 * Math.sin(phase * 2),
  };
}

function advanceStageObstacles() {
  if (stage.gravity === "moving") Object.assign(gravityWell, movingGravityPosition(flightTime));
  if (stage.layout === "armor") {
    if (!repairDrone && flightTime >= nextRepair) {
      const tile = bricks.find((brick) => brick.active && brick.maxHealth === 2 && brick.health === 1);
      if (tile) {
        const targetX = (tile.left + tile.right) / 2;
        repairDrone = { x: targetX < board.width / 2 ? -24 : board.width + 24,
          y: 335, radius: 16, targetX, tile };
      } else {
        nextRepair = flightTime + 2;
      }
    }
    if (repairDrone) {
      const distance = repairDrone.targetX - repairDrone.x;
      repairDrone.x += Math.max(-310 * step, Math.min(310 * step, distance));
      if (Math.abs(distance) <= 310 * step) {
        const { tile, x } = repairDrone;
        if (tile.active && tile.health === 1) {
          tile.health = tile.maxHealth;
          emitImpact(x, tile.bottom, "#a2ffe6", 1, "회복!");
          itemStatus.textContent = "수리 드론이 보호막을 복구했습니다";
        }
        repairDrone = null;
        nextRepair = flightTime + 13;
      }
    }
  }

  for (const guard of orbitGuards) {
    const angle = flightTime * 0.78 + guard.phase;
    guard.x = board.width / 2 + Math.cos(angle) * 190;
    guard.y = 400 + Math.sin(angle) * 61;
  }
}

function moveThroughStageMechanic(ball) {
  if (stage.layout === "split" && flightTime >= (ball.warpReadyAt ?? 0)) {
    const index = portals.findIndex((portal) => Math.hypot(ball.x - portal.x, ball.y - portal.y) < portalRadius);
    if (index >= 0) {
      const entry = portals[index];
      const exit = portals[1 - index];
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed === 0) return false;
      const distance = portalRadius + ball.radius + 3;
      ball.x = exit.x + ball.vx * distance / speed;
      ball.y = exit.y + ball.vy * distance / speed;
      ball.warpReadyAt = flightTime + 0.75;
      emitImpact(entry.x, entry.y, "#ba91ff", 0.9, "워프!");
      emitImpact(exit.x, exit.y, "#9dd6ff", 0.9);
      return true;
    }
  }

  if (stage.gravity) {
    const dx = gravityWell.x - ball.x;
    const dy = gravityWell.y - ball.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && distance < gravityWell.radius) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed === 0) return false;
      const pull = 680 * (1 - distance / gravityWell.radius) * step / distance;
      const vx = ball.vx + dx * pull;
      const vy = ball.vy + dy * pull;
      const length = Math.hypot(vx, vy);
      ball.vx = vx * speed / length;
      ball.vy = vy * speed / length;
    }
  }

  if (repairDrone && bounceOffObstacle(ball, repairDrone)) {
    emitImpact(repairDrone.x, repairDrone.y, "#a5ffe5", 1.1, "폭발!");
    repairDrone = null;
    nextRepair = flightTime + 13;
    itemStatus.textContent = "수리 드론 격추";
  }
  for (const guard of orbitGuards) {
    if (flightTime >= guard.disabledUntil && bounceOffObstacle(ball, guard)) {
      guard.disabledUntil = flightTime + 8;
      emitImpact(guard.x, guard.y, "#dba9ff", 1.15, "파직!");
      itemStatus.textContent = "방어 구체가 8초 동안 정지합니다";
      break;
    }
  }
  return false;
}

function placeFighter(centerX, y) {
  paddle.x = Math.max(0, Math.min(board.width - paddle.width, centerX - paddle.width / 2));
  paddle.y = Math.max(fighterTopY, Math.min(fighterBaseY, y));
}

function findGravityExit() {
  const halfWidth = paddle.width / 2;
  const altitudeRange = fighterBaseY - fighterTopY;
  const beams = laserBeams();
  const preferred = [0.28, 0.46, 0.12, 0.62, 0.84, 0.94];
  for (const altitude of [0.33, 0.16, 0.04]) {
    const y = fighterBaseY - altitudeRange * altitude;
    const beamXs = beams.map((beam) => laserXAtY(beam, y))
      .filter((x) => x > 0 && x < board.width).sort((a, b) => a - b);
    const edges = [0, ...beamXs, board.width];
    const gapCenters = edges.slice(1).map((edge, index) => (edge + edges[index]) / 2);
    for (const candidate of [...preferred.map((fraction) => board.width * fraction), ...gapCenters]) {
      const x = Math.max(halfWidth, Math.min(board.width - halfWidth, candidate));
      const near = (objectX, buffer) => Math.abs(objectX - x) <= halfWidth + buffer;
      const passingMeteor = meteors.some((meteor) => {
        const movement = meteor.direction * meteor.speed * (stage.meteorSpeed ?? 1) * 0.28;
        return Math.abs(meteor.y - y) < meteor.radius + 42
          && near(meteor.x + movement / 2, meteor.radius + 16 + Math.abs(movement) / 2);
      });
      const passingShot = escortShots.some((shot) => {
        const time = (y - shot.y) / shot.vy;
        return time > -0.06 && time < 0.34 && near(shot.x + shot.vx * time, 22);
      });
      const inBeam = beams.some((beam) => near(laserXAtY(beam, y),
        stage.laserWidth / 2 * Math.hypot(1, beam.slope) + 8));
      const outsideVortex = Math.hypot(x - gravityWell.x, y - gravityWell.y) > gravityWell.radius + 28;
      if (!passingMeteor && !passingShot && !inBeam && outsideVortex) return { x, y };
    }
  }
  return { x: board.width * preferred[0], y: fighterBaseY };
}

function advanceFighterGravity() {
  if (!stage.gravity || flightTime < gravityReadyAt) return false;
  if (fighterVortex) {
    const progress = Math.min(1, (flightTime - fighterVortex.started) / gravityWarpTime);
    const radius = fighterVortex.radius * (1 - progress) ** 1.3;
    const angle = fighterVortex.angle + progress * Math.PI * 1.4;
    placeFighter(gravityWell.x + Math.cos(angle) * radius, gravityWell.y + Math.sin(angle) * radius);
    paddle.vx = 0;
    paddle.vy = 0;
    if (progress < 1) return false;

    const exit = findGravityExit();
    placeFighter(exit.x, exit.y);
    fighterVortex = null;
    gravityReadyAt = flightTime + 1.4;
    emitImpact(gravityWell.x, gravityWell.y, "#a587ff", 1.25);
    emitImpact(exit.x, exit.y + 8, "#8cf5ff", 1.25, "워프!");
    itemStatus.textContent = "블랙홀을 빠져나왔습니다";
    return true;
  }

  const center = paddle.x + paddle.width / 2;
  const dx = center - gravityWell.x;
  const dy = paddle.y - gravityWell.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= gravityWell.radius) return false;
  if (distance <= gravityWell.captureRadius) {
    fighterVortex = { radius: distance, angle: Math.atan2(dy, dx), started: flightTime };
    itemStatus.textContent = "블랙홀에 휘말렸습니다";
  } else {
    const pull = (1 - distance / gravityWell.radius) * 230 * step / distance;
    placeFighter(center - dx * pull, paddle.y - dy * pull);
  }
  return false;
}

function steerVelocity(velocity, direction, maxSpeed) {
  const braking = direction === 0 || velocity * direction < 0;
  const maxChange = (braking ? paddleBraking : paddleAcceleration) * step;
  const remaining = direction * maxSpeed - velocity;
  return velocity + Math.max(-maxChange, Math.min(maxChange, remaining));
}

function advance() {
  flightTime += step;
  advanceObstacles();
  advanceEscorts();
  advanceStageObstacles();
  if (boostTime > 0) {
    const previousSpeed = currentBallSpeed();
    boostTime = Math.max(0, boostTime - step);
    if (boostTime === 0) {
      rescaleBalls(previousSpeed);
      itemStatus.textContent = "플라즈마 가속 종료";
    }
  }

  if (wingTime > 0) {
    wingTime = Math.max(0, wingTime - step);
    if (wingTime === 0) itemStatus.textContent = "날개가 기본 크기로 돌아왔습니다";
  }
  const center = paddle.x + paddle.width / 2;
  paddle.width = wingTime > 0 ? 210 : (deck.has("wings") ? 180 : fighterWidth);
  const limit = board.width - paddle.width;
  const steadyX = Math.max(0, Math.min(limit, center - paddle.width / 2));
  const direction = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
  paddle.vx = steerVelocity(paddle.vx, direction, paddleSpeed);
  paddle.x = Math.max(0, Math.min(limit, steadyX + paddle.vx * step));
  if ((paddle.x === 0 && paddle.vx < 0) || (paddle.x === limit && paddle.vx > 0)) {
    paddle.vx = 0;
  }

  const thrust = paddle.x === steadyX || direction * paddle.vx <= 0 ? 0 : direction * (0.7 + 0.3 * Math.abs(paddle.vx) / paddleSpeed);
  paddleThrust += (thrust - paddleThrust) * 0.09;
  const previousPaddleY = paddle.y;
  const vertical = Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"));
  paddle.vy = steerVelocity(paddle.vy, vertical, paddleVerticalSpeed);
  paddle.y = Math.max(fighterTopY, Math.min(fighterBaseY, paddle.y + paddle.vy * step));
  if ((paddle.y === fighterTopY && paddle.vy < 0) || (paddle.y === fighterBaseY && paddle.vy > 0)) {
    paddle.vy = 0;
  }
  const warped = advanceFighterGravity();
  const collisionY = warped ? paddle.y : previousPaddleY;
  const altitude = ((fighterBaseY - paddle.y) * maxFighterLane / (fighterBaseY - fighterTopY)).toFixed(1);
  if (fighterLaneDisplay.textContent !== altitude) fighterLaneDisplay.textContent = altitude;
  checkFlightContacts();
  if (state !== "playing") return;
  advanceEscortShots(collisionY);
  if (state !== "playing") return;

  if (relaunchTime > 0) {
    dockBall(balls[0]);
    relaunchTime = Math.max(0, relaunchTime - step);
    if (relaunchTime === 0) {
      ballCount.textContent = 1;
      launchBall();
      if (itemStatus.textContent === "공을 놓쳤습니다 · 재발사 준비") itemStatus.textContent = "";
    }
    advancePickups();
    advanceEnemyAttack();
    return;
  }

  for (const ball of balls) {
    advanceBall(ball, collisionY);
    if (state !== "playing") return;
  }
  const previousCount = balls.length;
  balls = balls.filter((ball) => ball.y - ball.radius <= board.height);
  if (balls.length !== previousCount) ballCount.textContent = balls.length;
  if (balls.length === 0) {
    damageFighter();
    if (state !== "playing") return;
    relaunchTime = 0.65;
    pellets = [];
    balls = [createBall()];
    dockBall(balls[0]);
    itemStatus.textContent = "공을 놓쳤습니다 · 재발사 준비";
    return;
  }

  advancePellets();
  advancePickups();
  advanceEnemyAttack();
}

function advanceBall(ball, previousPaddleY = paddle.y) {
  const previousBottom = ball.y + ball.radius;
  ball.x += ball.vx * step;
  ball.y += ball.vy * step;

  if (ball.x < ball.radius || ball.x > board.width - ball.radius) {
    ball.x = Math.max(ball.radius, Math.min(board.width - ball.radius, ball.x));
    ball.vx = -ball.vx;
  }
  if (ball.y < ball.radius) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  }

  if (!fighterVortex && ball.vy > 0 && previousBottom <= previousPaddleY && ball.y + ball.radius >= paddle.y
      && ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width) {
    // 바의 중앙은 위쪽으로, 바의 양끝은 비스듬한 방향으로 공을 보낸다.
    const halfWidth = paddle.width / 2;
    const offset = (ball.x - (paddle.x + halfWidth)) / halfWidth;
    const angle = Math.max(-1, Math.min(1, offset)) * Math.PI / 3;
    ball.y = paddle.y - ball.radius;
    emitImpact(ball.x, paddle.y, "#8df2ff", 0.86, Math.abs(angle) > 0.55 ? "팅!" : "탁!");
    ball.vx = currentBallSpeed() * Math.sin(angle);
    ball.vy = -currentBallSpeed() * Math.cos(angle);
    if (deck.has("scatter")) {
      scatterReturns += 1;
      if (scatterReturns % 3 === 0) fireScatter(angle);
    }
  }

  if (moveThroughStageMechanic(ball)) return;
  for (const meteor of meteors) {
    if (bounceOffObstacle(ball, meteor)) {
      emitImpact(ball.x, ball.y, "#e2c7a9", meteor.radius > 20 ? 1.15 : 0.78, meteor.radius > 20 ? "쿵!" : "톡!");
      break;
    }
  }
  hitEscort(ball);
  if (scout.visible && scout.health > 0 && bounceOffObstacle(ball, scout)) {
    emitImpact(ball.x, ball.y, "#a4e6ff", 0.9);
    scout.health -= 1;
    scout.flash = scout.health === 0 ? 0.28 : 0.16;
    if (scout.health === 0) itemStatus.textContent = "외계인선 격파";
  }
  if (!bounceOffBrick(ball)) bounceOffBoss(ball);
}

const shieldPaint = context.createLinearGradient(0, 74, 0, 305);
shieldPaint.addColorStop(0, "#a9def21b");
shieldPaint.addColorStop(0.42, "#78c7ff25");
shieldPaint.addColorStop(0.78, "#69bafa32");
shieldPaint.addColorStop(1, "#adc6ff4a");

function makeMeteorTexture({ x, y, radius }) {
  const surface = document.createElement("canvas");
  const diameter = radius * 2;
  surface.width = diameter;
  surface.height = diameter;
  const brush = surface.getContext("2d");
  let seed = x + y;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 논리상 반지름 안에서 들쭉날쭉한 바위 외곽을 그린다.
  brush.beginPath();
  for (let index = 0; index < 17; index += 1) {
    const angle = index / 17 * Math.PI * 2;
    const edge = radius * (0.85 + random() * 0.14);
    const px = radius + Math.cos(angle) * edge;
    const py = radius + Math.sin(angle) * edge;
    if (index === 0) brush.moveTo(px, py);
    else brush.lineTo(px, py);
  }
  brush.closePath();
  brush.save();
  brush.clip();

  const rock = brush.createRadialGradient(radius * 0.53, radius * 0.44, 1, radius, radius, radius);
  rock.addColorStop(0, "#d4bfa4");
  rock.addColorStop(0.55, "#655951");
  rock.addColorStop(1, "#101524");
  brush.fillStyle = rock;
  brush.fillRect(0, 0, diameter, diameter);

  for (let index = 0; index < 380; index += 1) {
    brush.fillStyle = index % 3 === 0 ? "#eee0ce48" : "#15101655";
    brush.fillRect(random() * diameter, random() * diameter, 0.5 + random() * 2, 0.5 + random());
  }

  brush.strokeStyle = "#d6c4ae69";
  brush.lineWidth = 2;
  brush.stroke();

  for (const [px, py, size] of [[0.65, 0.72, 0.34], [1.38, 1.14, 0.24], [0.91, 1.47, 0.2]]) {
    const cx = radius * px;
    const cy = radius * py;
    const crater = radius * size;
    const rim = brush.createLinearGradient(0, cy - crater, 0, cy + crater);
    rim.addColorStop(0, "#342d32");
    rim.addColorStop(1, "#a4917b");
    brush.fillStyle = rim;
    brush.beginPath();
    brush.ellipse(cx, cy, crater, crater * 0.66, -0.4, 0, Math.PI * 2);
    brush.fill();
  }

  brush.restore();
  return surface;
}

function drawShield(brick) {
  paintPolygon(brick.points, shieldPaint);
  context.save();
  context.clip();
  if (stage.layout !== "arc") {
    context.fillStyle = stage.color + (brick.health > 1 ? "66" : "2b");
    context.fill();
  }
  context.strokeStyle = brick.health > 1 ? stage.color : "#9ceaff25";
  context.lineWidth = 1.3;
  context.stroke();

  // 같은 중심의 빛줄기가 살아 있는 조각 안에서만 이어진다.
  for (const [index, points] of shieldLines.entries()) {
    context.beginPath();
    context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.strokeStyle = index === shieldLines.length - 1 ? stage.color + "95" : stage.color + "45";
    context.lineWidth = index === shieldLines.length - 1 ? 2 : 1;
    context.stroke();
  }
  context.restore();
}

function paintPolygon(points, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(...points[0]);
  for (const point of points.slice(1)) context.lineTo(...point);
  context.closePath();
  context.fill();
}

function paintEllipse(x, y, rx, ry, paint) {
  context.fillStyle = paint;
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  context.fill();
}

function drawScout() {
  if (!scout.visible) return;
  const { x, y, health, flash } = scout;
  if (health === 0) {
    if (flash > 0) {
      context.save();
      context.globalAlpha = flash / 0.28;
      paintEllipse(x, y, 10 + 57 * (0.28 - flash), 6 + 38 * (0.28 - flash), "#ffbd78");
      paintEllipse(x, y, 7, 5, "#ffffe5");
      context.restore();
    }
    return;
  }

  const shell = context.createLinearGradient(0, y - 12, 0, y + 14);
  shell.addColorStop(0, "#dce9ff");
  shell.addColorStop(0.44, flash > 0 ? "#fff4d9" : "#6c91bd");
  shell.addColorStop(1, "#282a53");
  paintEllipse(x, y - 4, 12, 15, "#355778");
  paintEllipse(x, y - 8, 8, 7, "#a1dc92");
  paintEllipse(x - 3, y - 9, 2, 3, "#14273a");
  paintEllipse(x + 3, y - 9, 2, 3, "#14273a");
  paintEllipse(x, y + 4, 25, 9, shell);
  for (const offset of [-13, 0, 13]) paintEllipse(x + offset, y + 7, 2, 1.5, "#fff2a6");
}

function drawBoss() {
  if (bossHealth === 0) return;
  const offset = (board.width - 960) / 2;
  const hullRadius = board.width / 2 + 64;
  context.save();
  context.translate(offset, 0);
  const steel = context.createLinearGradient(0, 0, 0, 88);
  steel.addColorStop(0, "#e3e8e6");
  steel.addColorStop(0.42, "#8296a1");
  steel.addColorStop(0.58, "#34465f");
  steel.addColorStop(1, "#08101f");

  // 접시형 선체는 화면 밖까지 이어지고 중앙 격납부가 아래로 돌출된다.
  context.save();
  context.shadowColor = "#01030b";
  context.shadowBlur = 23;
  context.shadowOffsetY = 9;
  paintPolygon([[24, -12], [176, -10], [378, 51], [341, 60], [147, 36], [38, 33]], "#2f4059");
  paintPolygon([[936, -12], [784, -10], [582, 51], [619, 60], [813, 36], [922, 33]], "#2f4059");
  paintEllipse(480, 2, hullRadius, 53, steel);
  context.restore();

  paintEllipse(480, -13, hullRadius - 65, 52, "#788ba3");
  paintEllipse(480, -15, hullRadius - 161, 43, "#a3b4c4");
  const saucer = context.createRadialGradient(391, -9, 28, 480, 1, 420);
  saucer.addColorStop(0, "#e3e7df");
  saucer.addColorStop(0.68, "#bccad0");
  saucer.addColorStop(1, "#748896");
  paintEllipse(480, -17, 350, 33, saucer);
  paintEllipse(480, -4, 89, 17, "#687f91");
  paintEllipse(480, -7, 83, 15, "#d0dbdb");
  paintEllipse(480, -9, 58, 11, "#edf0e6");
  context.strokeStyle = "#35475eb0";
  context.lineWidth = 1;
  for (const radius of [328, 414, 500, 588]) {
    context.beginPath();
    context.ellipse(480, -11, radius, 23 + radius / 24, 0, 0, Math.PI);
    context.stroke();
  }

  // 선체 곡률을 따라 장갑 이음새와 불규칙한 표면 마모를 넣는다.
  context.save();
  context.beginPath();
  context.ellipse(480, -13, hullRadius - 65, 52, 0, 0, Math.PI * 2);
  context.clip();
  for (let index = 0; index < 56; index += 1) {
    const x = index * 19 - 40;
    const y = 3 + (index * 17) % 25;
    context.fillStyle = index % 3 === 0 ? "#dae5ec4a" : "#34445b35";
    context.fillRect(x, y, 7 + (index * 13) % 13, 1 + index % 2);
    context.fillStyle = "#3349604d";
    context.fillRect(x + 3, y + 5, 1, 7 + index % 5);
  }
  context.restore();

  for (let x = 23 - offset; x < 960 + offset; x += 24) {
    const y = -2 + 43 * Math.sqrt(1 - ((x - 480) / hullRadius) ** 2);
    context.fillStyle = "#24324b";
    context.fillRect(x - 2, y, 15, 4);
    context.fillStyle = x % 5 === 0 ? "#ffd0a2" : "#c5e0ed";
    context.fillRect(x, y + 1, 4, 2);
    context.fillRect(x + 7, y + 1, 3, 2);
  }

  // 장갑판을 여러 겹 쌓아 곡면 아래로 격납고와 정비 구획이 드러나게 한다.
  for (const side of [-1, 1]) {
    for (let index = 0; index < 8; index += 1) {
      const x = 480 + side * (84 + index * 47);
      const y = 36 - index * 1.4;
      paintPolygon([[x - 18, y], [x + 19, y - 1], [x + 24, y + 4],
        [x + 18, y + 7], [x - 17, y + 7], [x - 23, y + 3]], index % 3 === 0 ? "#4b637c" : "#61788c");
      context.fillStyle = "#c4d3dda3";
      context.fillRect(x - 15, y, 30, 1);
      context.fillStyle = "#192a40";
      context.fillRect(x - 14, y + 4, 28, 2);
      context.fillStyle = index % 2 === 0 ? "#b8e5f8" : "#eac3a1";
      context.fillRect(x - 11, y + 4, 3, 1);
      context.fillRect(x + 8, y + 4, 3, 1);
    }
  }

  // 양쪽 엔진은 지지대 뒤에서 이어지고, 아래쪽에 냉각부가 드러난다.
  for (const side of [-1, 1]) {
    const x = 480 + side * 295;
    paintPolygon([[480 + side * 102, 36], [x - side * 3, 35],
      [x + side * 33, 48], [480 + side * 136, 61]], "#354a63");
    paintPolygon([[480 + side * 120, 40], [x + side * 13, 39],
      [x + side * 26, 43], [480 + side * 139, 55]], "#8199ab");
    const pod = context.createLinearGradient(0, 27, 0, 62);
    pod.addColorStop(0, "#d0dce0");
    pod.addColorStop(0.48, "#71889a");
    pod.addColorStop(0.53, "#52667e");
    pod.addColorStop(1, "#1c2b44");
    paintEllipse(x, 46, 95, 15, pod);
    paintEllipse(x, 47, 78, 6, "#20364e");

    context.save();
    context.shadowColor = "#58cfff";
    context.shadowBlur = 9;
    paintEllipse(x, 47, 69, 3, "#68d0f1");
    paintEllipse(x, 46.5, 62, 1, "#c6f1ff");
    context.restore();

    paintEllipse(x + side * 77, 46, 12, 7, "#785169");
    paintEllipse(x + side * 79, 45, 7, 3, "#f7a09a");
    context.fillStyle = "#bac4c9";
    context.fillRect(x - 56, 53, 112, 1);
    for (let grille = -42; grille <= 42; grille += 7) {
      context.fillStyle = "#15263d";
      context.fillRect(x + grille, 54, 4, 3);
    }
  }
  paintPolygon([[296, 43], [355, 36], [605, 36], [664, 43], [640, 72], [320, 72]], steel);
  paintPolygon([[343, 55], [617, 55], [599, 68], [361, 68]], "#a1b3c3");
  paintPolygon([[350, 56], [610, 56], [595, 66], [365, 66]], "#111c2e");
  context.fillStyle = "#445f78";
  context.fillRect(373, 58, 214, 2);
  context.fillStyle = "#203249";
  context.fillRect(380, 62, 200, 3);
  for (let x = 370; x < 592; x += 16) {
    context.fillStyle = "#96c9e2";
    context.fillRect(x, 60, 6, 1.5);
  }
  paintEllipse(480, 68, 25, 5, "#222a3c");
  context.save();
  context.shadowColor = "#ff685c";
  context.shadowBlur = targetX === null ? 4 : 18;
  paintEllipse(480, 69, 16, 2, targetX === null ? "#ab5965" : "#ffb299");
  context.restore();
  context.restore();
}

function drawFighter() {
  const { x, y, width } = paddle;
  const center = x + width / 2;
  const metal = context.createLinearGradient(0, y - 20, 0, y + 24);
  metal.addColorStop(0, "#fffdf2");
  metal.addColorStop(0.46, "#dee7ee");
  metal.addColorStop(1, "#687e96");

  context.save();
  context.shadowColor = "#01050e";
  context.shadowBlur = 8;
  context.shadowOffsetY = 4;
  for (const wingX of [x + 13, x + width - 13]) {
    const side = Math.sign(wingX - center);
    paintPolygon([[center + side * 10, y + 2], [wingX, y - 1], [wingX, y + 10],
      [center + side * 10, y + 9]], metal);
    paintPolygon([[wingX - 10, y - 17], [wingX + 7, y - 17], [wingX + 13, y + 4],
      [wingX + 7, y + 23], [wingX - 10, y + 23], [wingX - 13, y + 4]], metal);
    paintPolygon([[wingX - 7, y - 13], [wingX + 5, y - 13], [wingX + 10, y + 4],
      [wingX + 5, y + 19], [wingX - 7, y + 19], [wingX - 10, y + 4]], "#1c2c43");
    for (let rib = -10; rib <= 15; rib += 5) {
      context.fillStyle = rib % 2 === 0 ? "#506780" : "#38526c";
      context.fillRect(wingX - 6, y + rib, 11, 2);
    }
    context.fillStyle = "#aeb9c5";
    context.fillRect(wingX - 1, y - 13, 2, 31);
  }
  paintEllipse(center, y + 6, 18, 15, metal);
  context.restore();

  const glass = context.createRadialGradient(center - 4, y + 1, 1, center, y + 6, 13);
  glass.addColorStop(0, "#709db4");
  glass.addColorStop(0.37, "#34546f");
  glass.addColorStop(1, "#101c2d");
  paintEllipse(center, y + 6, 13, 11, "#71889e");
  paintEllipse(center, y + 6, 11, 9, glass);
  context.strokeStyle = "#c3ccd1";
  context.lineWidth = 1.2;
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const angle = spoke * Math.PI / 4;
    context.beginPath();
    context.moveTo(center + Math.cos(angle) * 4, y + 6 + Math.sin(angle) * 3);
    context.lineTo(center + Math.cos(angle) * 10, y + 6 + Math.sin(angle) * 8);
    context.stroke();
  }
  context.fillStyle = "#f4a38a";
  context.fillRect(center - 8, y + 18, 3, 1);
  context.fillRect(center + 5, y + 18, 3, 1);
  for (const outlet of [center - 20, center + 20]) {
    paintEllipse(outlet, y + 16, 6, 4, "#677c95");
    paintEllipse(outlet, y + 18, 4, 2.5, "#27394e");
    if (Math.abs(paddleThrust) >= 0.08) paintEllipse(outlet, y + 19, 3.2, 1.7, "#fff1b7");
  }
}

function drawEnemyAttack() {
  if (targetX === null) return;

  context.save();
  context.beginPath();
  for (const beam of laserBeams()) {
    context.moveTo(beam.originX, boss.y + boss.height);
    context.lineTo(laserXAtY(beam, board.height), board.height);
  }
  if (beamTime > 0) {
    context.shadowColor = "#ff463f";
    context.shadowBlur = 15 + stage.laserWidth / 2;
    context.strokeStyle = "#ff493b";
    context.lineWidth = stage.laserWidth;
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = "#fff1de";
    context.lineWidth = stage.laserWidth * 0.31;
  } else {
    context.strokeStyle = "#ff554532";
    context.lineWidth = stage.laserWidth;
    context.stroke();
    context.strokeStyle = "#ff999198";
    context.lineWidth = 2;
    context.setLineDash([8, 10]);
  }
  context.stroke();
  context.restore();
}

function drawPickupIcon(type, x, y) {
  const color = type.color;
  if (type.icon === "repair") {
    context.fillStyle = color;
    context.fillRect(x - 3, y - 9, 6, 18);
    context.fillRect(x - 9, y - 3, 18, 6);
  } else if (type.icon === "boost") {
    paintPolygon([[x - 1, y - 11], [x + 7, y - 11], [x + 2, y - 2],
      [x + 9, y - 2], [x - 5, y + 11], [x - 2, y + 2], [x - 8, y + 2]], color);
  } else if (type.icon === "guard") {
    paintPolygon([[x - 9, y - 8], [x, y - 11], [x + 9, y - 8],
      [x + 8, y + 3], [x, y + 10], [x - 8, y + 3]], color);
    paintPolygon([[x - 5, y - 4], [x, y - 6], [x + 5, y - 4],
      [x + 4, y + 2], [x, y + 6], [x - 4, y + 2]], "#152237");
  } else if (type.icon === "split") {
    paintEllipse(x - 5, y + 3, 4.5, 4.5, color);
    paintEllipse(x + 5, y - 4, 4.5, 4.5, color);
  } else {
    for (const side of [-1, 1]) {
      paintPolygon([[x, y + 1], [x + side * 16, y - 6],
        [x + side * 10, y + 5], [x + side * 3, y + 7]], color);
    }
  }
}

function drawPickups() {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 16px system-ui, sans-serif";
  for (const { x, y, type } of pickups) {
    context.shadowColor = type.color;
    context.shadowBlur = 9;
    paintEllipse(x, y, pickupRadius + 2, pickupRadius + 2, type.color);
    context.shadowBlur = 0;
    paintEllipse(x, y, pickupRadius, pickupRadius, "#122035");
    drawPickupIcon(type, x, y);

    const labelX = Math.max(44, Math.min(board.width - 44, x));
    context.beginPath();
    context.roundRect(labelX - 44, y + 21, 88, 23, 5);
    context.fillStyle = "#101a2ef0";
    context.fill();
    context.fillStyle = type.color;
    context.fillText(type.label, labelX, y + 32);
  }
  context.restore();
}

const shieldCaptions = ["쾅!", "팡!", "펑!", "빵!", "와장창!"];
const pickupCaptions = { repair: "회복!", boost: "가속!", split: "분열!" };
const comicColors = ["#ed0019", "#0044f2", "#ffd500", "#00873e"];
const comicAccents = {
  "#ed0019": "#ff8a00", "#0044f2": "#ff4da6", "#ffd500": "#ff632e", "#00873e": "#7ddb2b",
};
const comicSpikes = {
  "쾅!": 12, "팡!": 8, "펑!": 10, "빵!": 7, "와장창!": 14,
  "콰앙!": 14, "쨍!": 9, "파직!": 6, "퍽!": 8, "탁!": 8,
  "팅!": 6, "쿵!": 9, "톡!": 8, "폭발!": 12, "획득!": 9,
  "회복!": 10, "가속!": 7, "분열!": 9, "워프!": 10,
};

function emitImpact(x, y, color, size, caption = "", shieldWave = false) {
  if (impacts.length >= 32) impacts.shift();
  const captionColor = caption ? comicColors[comicColorIndex++ % comicColors.length] : "";
  impacts.push({ x, y, color, size, caption, captionColor, shieldWave, born: effectTime });
}

function drawImpactCaption(x, y, caption, color, size, progress) {
  const spikes = comicSpikes[caption];
  const width = caption.length > 3 ? 61 : 45;
  const labelY = Math.max(53, y - 29 - progress * 38);
  const scale = Math.min(1.52, size) * (0.74 + Math.min(0.56, progress * 4));
  const margin = width * scale + 14;
  const labelX = Math.max(margin, Math.min(board.width - margin, x));
  context.save();
  context.translate(labelX, labelY);
  context.rotate(x < board.width / 2 ? -0.19 : 0.15);
  context.scale(scale, scale);
  context.shadowBlur = 0;

  const burst = Array.from({ length: spikes * 2 }, (_, index) => {
    const angle = index * Math.PI / spikes;
    const distance = index % 2 === 0 ? 1 - (index % 3) * 0.04 : 0.78;
    return [Math.cos(angle) * distance * width, Math.sin(angle) * distance * 28];
  });
  const accent = comicAccents[color];
  context.strokeStyle = "#1b1226";
  context.lineJoin = "round";
  context.lineWidth = 3.5;
  context.translate(6, 5);
  paintPolygon(burst, accent);
  context.stroke();
  context.translate(-6, -5);
  paintPolygon(burst, color);
  context.stroke();

  // 작은 망점으로 인쇄 만화처럼 가장자리를 강조한다.
  context.save();
  context.clip();
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      const dotX = -width + 7 + column * (width * 2 - 14) / 8;
      paintEllipse(dotX, 15 + row * 5, 1.3 + row * 0.4, 1.3 + row * 0.4, accent);
    }
  }
  context.restore();


  context.font = "900 24px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#1b1226";
  context.lineWidth = 3;
  context.strokeText(caption, 0, -1);
  context.fillStyle = "#ffffff";
  context.fillText(caption, 0, -1);
  context.restore();
}

function drawImpacts() {
  context.save();
  for (const { x, y, color, size, caption, captionColor, shieldWave, born } of impacts) {
    const progress = (effectTime - born) / 0.46;
    if (shieldWave) {
      context.globalAlpha = (1 - progress) * 0.8;
      context.strokeStyle = "#a2eafa";
      context.lineWidth = 2.6;
      context.beginPath();
      context.ellipse(x, y, (18 + 205 * progress), 8 + 43 * progress, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = Math.max(0, 1 - progress);
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 9;
    context.lineWidth = 1.5 + size;
    context.beginPath();
    context.arc(x, y, (4 + 24 * progress) * size, 0, Math.PI * 2);
    context.stroke();
    if (size >= 1.1) {
      context.globalAlpha = Math.max(0, 1 - progress * 1.6) * 0.76;
      context.strokeStyle = "#fff6dc";
      context.lineWidth = (3 - progress * 2) * size;
      context.beginPath();
      context.arc(x, y, (8 + 39 * progress) * size, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = Math.max(0, 1 - progress);
    }
    context.strokeStyle = color;
    const sparks = size >= 1.1 ? 11 : 7;
    for (let index = 0; index < sparks; index += 1) {
      const angle = index * Math.PI * 2 / sparks + (x + y) * 0.017;
      const distance = (8 + progress * (caption ? 35 + index % 3 * 9 : 25 + index % 3 * 7)) * size;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      context.beginPath();
      context.moveTo(x + nx * distance, y + ny * distance);
      context.lineTo(x + nx * (distance + 6 * size), y + ny * (distance + 6 * size));
      context.stroke();
    }
    paintEllipse(x, y, size * (7 - 5 * progress), size * (7 - 5 * progress), "#fff5df");
    if (caption) drawImpactCaption(x, y, caption, captionColor, size, progress);
  }
  context.restore();
}

function drawEscortBay() {
  if (bossHealth === 0) return;
  const countdown = nextSortie - flightTime;
  const recent = escorts.find((craft) => flightTime - craft.launched < 0.75);
  const opening = countdown < 0.86 ? 1 - countdown / 0.86
    : recent ? 1 - (flightTime - recent.launched) / 0.75 : 0;
  if (opening <= 0) return;

  const x = boss.x + boss.width / 2;
  const y = boss.y + boss.height - 4;
  context.save();
  context.shadowColor = "#86caff";
  context.shadowBlur = 17;
  paintEllipse(x, y, 34 * opening, 8 * opening, "#a0dcffb8");
  context.shadowBlur = 0;
  for (const side of [-1, 1]) {
    const doorX = x + side * (13 + 23 * opening);
    paintPolygon([[doorX - 13, y - 5], [doorX + 13, y - 5],
      [doorX + 9, y + 2], [doorX - 9, y + 2]], "#657e98");
    context.fillStyle = "#f7c88a";
    context.fillRect(doorX - 5, y - 3, 10, 1.5);
  }
  context.restore();
}

function drawEscortExplosion(craft) {
  const progress = (effectTime - craft.destroyed) / 0.64;
  if (progress >= 1) return;
  context.globalAlpha = Math.max(0, 1 - progress);
  context.shadowColor = "#ff8f4d";
  context.shadowBlur = 16 * (1 - progress);
  context.beginPath();
  context.arc(0, 0, 5 + progress * 34, 0, Math.PI * 2);
  context.strokeStyle = "#ffba77";
  context.lineWidth = 2;
  context.stroke();
  for (let spark = 0; spark < 9; spark += 1) {
    const angle = craft.angle + spark * Math.PI * 2 / 9;
    const distance = 6 + progress * (26 + (spark % 3) * 9);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    paintPolygon([[x, y], [x - 4, y + 1], [x - 2, y - 3]], spark % 2 ? "#f6dba5" : "#ff8558");
  }
  paintEllipse(0, 0, 3 + 7 * (1 - progress), 3 + 4 * (1 - progress), "#fff0cd");
}

function rocketExhaust(x, y, endX, endY) {
  const fire = context.createLinearGradient(x, y, endX, endY);
  fire.addColorStop(0, "#fffbe5");
  fire.addColorStop(0.22, "#ffdf7c");
  fire.addColorStop(0.52, "#ff9c3eec");
  fire.addColorStop(0.78, "#fb4f2da8");
  fire.addColorStop(1, "#e0272400");
  return fire;
}

function drawEscorts() {
  drawEscortBay();
  for (const craft of escorts) {
    context.save();
    context.translate(craft.x, craft.y);
    if (craft.destroyed !== null) {
      drawEscortExplosion(craft);
    } else {
      context.rotate(craft.angle);
      for (const side of [-1, 1]) {
        const y = side * 23;
        const end = -36 - 5 * Math.sin(flightTime * 59 + side);
        context.save();
        context.shadowColor = "#ff7333";
        context.shadowBlur = 9;
        paintPolygon([[-13, y - 3], [-13, y + 3], [end, y + side * 1.8]],
          rocketExhaust(-13, y, end, y + side * 1.8));
        context.restore();
      }

      const alloy = context.createLinearGradient(-7, -24, 14, 29);
      alloy.addColorStop(0, "#fff9db");
      alloy.addColorStop(0.28, "#ffffff");
      alloy.addColorStop(0.61, "#cbd7e5");
      alloy.addColorStop(1, "#58708d");
      for (const side of [-1, 1]) {
        // 날개 바깥쪽을 두껍게 두고 앞쪽 끝을 안으로 굽힌다.
        context.beginPath();
        context.moveTo(-15, side * 9);
        context.quadraticCurveTo(-24, side * 15, -16, side * 25);
        context.quadraticCurveTo(-6, side * 36, 14, side * 27);
        context.quadraticCurveTo(25, side * 21, 32, side * 7);
        context.quadraticCurveTo(20, side * 13, 10, side * 12);
        context.quadraticCurveTo(2, side * 18, -15, side * 9);
        context.closePath();
        context.save();
        context.shadowColor = "#010610";
        context.shadowBlur = 7;
        context.shadowOffsetY = 3;
        context.fillStyle = alloy;
        context.fill();
        context.restore();
        context.strokeStyle = "#354962";
        context.lineWidth = 1.7;
        context.stroke();

        paintPolygon([[-14, side * 18], [-4, side * 24], [13, side * 23],
          [28, side * 12], [14, side * 26], [-2, side * 31]], "#435a79");
        paintPolygon([[-15, side * 14], [-1, side * 21], [13, side * 20],
          [19, side * 17], [8, side * 18], [-3, side * 17]], "#f3ead5");
        paintPolygon([[-17, side * 16], [-8, side * 18], [-6, side * 26],
          [-14, side * 26]], "#2e435e");
        context.strokeStyle = "#f3fbff";
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(-11, side * 26);
        context.quadraticCurveTo(12, side * 34, 28, side * 13);
        context.stroke();
        paintEllipse(-14, side * 23, 2.5, 2.8, "#ffbd6a");
        paintEllipse(26, side * 12, 3.8, 1.9, "#83eeff");
      }
      paintPolygon([[-15, -5], [-5, -8], [12, -6], [24, 0],
        [12, 6], [-5, 8], [-15, 5]], alloy);
      paintPolygon([[-9, -3], [2, -5], [17, 0], [2, 5], [-9, 3]], "#243a59");
      const core = context.createRadialGradient(7, -1, 0, 7, 0, 10);
      core.addColorStop(0, "#eeffff");
      core.addColorStop(0.42, "#84f3ff");
      core.addColorStop(1, "#316ed0");
      context.save();
      context.shadowBlur = craft.aim === null ? 6 : 14;
      context.shadowColor = "#54a8ec";
      paintEllipse(7, 0, 8.3, 3.4, core);
      context.restore();
    }
    context.restore();
  }
}

function drawEscortAttack() {
  context.save();
  context.strokeStyle = "#7bcaff78";
  context.lineWidth = 1.4;
  context.setLineDash([3, 12]);
  for (const craft of escorts) {
    if (craft.destroyed !== null || craft.aim === null) continue;
    context.beginPath();
    context.moveTo(craft.x, craft.y);
    context.lineTo(craft.aim, craft.aimY);
    context.stroke();
  }
  context.setLineDash([]);
  context.shadowColor = "#57bfff";
  context.shadowBlur = 12;
  for (const shot of escortShots) {
    context.strokeStyle = "#6dd9ff";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(shot.x - shot.vx * 0.04, shot.y - shot.vy * 0.04);
    context.lineTo(shot.x, shot.y);
    context.stroke();
    paintEllipse(shot.x, shot.y, 2.5, 3.8, "#e9faff");
  }
  context.restore();
}

function drawBeltDebris() {
  context.save();
  context.translate(board.width / 2, beltY(board.width / 2));
  context.rotate(Math.atan2(115, board.width));
  const dust = context.createLinearGradient(0, -176, 0, 176);
  dust.addColorStop(0, "#80728d00");
  dust.addColorStop(0.36, "#99839910");
  dust.addColorStop(0.53, "#baa5972f");
  dust.addColorStop(0.72, "#a994a510");
  dust.addColorStop(1, "#80728d00");
  context.fillStyle = dust;
  context.fillRect(-board.width, -176, board.width * 2, 352);
  context.restore();
  for (const fragment of beltDebris) {
    const x = (fragment.x + flightTime * fragment.speed) % (board.width + 14) - 7;
    const y = beltY(x) + fragment.lane;
    const size = fragment.size;
    paintPolygon([[x - size, y], [x, y - size * 0.6], [x + size * 0.8, y - size * 0.1],
      [x + size * 0.3, y + size * 0.55]], fragment.light ? "#e0c6ad9c" : "#a69ab378");
  }
}

function drawThrusters() {
  const vertical = -paddle.vy / paddleVerticalSpeed;
  const power = Math.max(Math.abs(paddleThrust), Math.abs(vertical));
  if (power < 0.08) return;
  const direction = Math.sign(paddleThrust);
  const y = paddle.y + 18;
  const length = (30 + 9 * Math.sin(flightTime * 89)) * power + 13;
  const source = paddle.x + paddle.width / 2;
  context.save();
  context.shadowColor = "#ff762f";
  context.shadowBlur = 20;
  context.globalAlpha = 0.45 + power * 0.55;
  for (const outlet of [source - 20, source + 20]) {
    const end = outlet - length * direction * Math.abs(paddleThrust) / power;
    const endY = y + (Math.abs(vertical) > 0.12 ? vertical * length / power : 13);
    const fire = rocketExhaust(outlet, y, end, endY);
    paintPolygon([[outlet + 3, y - 4], [outlet + 6, y + 5],
      [end, endY], [outlet - 6, y + 3]], fire);
    paintEllipse(outlet, y, 3.7, 2.8, "#fff3bd");
  }
  context.restore();
}

function drawPlasmaBall(ball) {
  const { x, y, radius } = ball;
  const color = boostTime > 0 ? "#ff9e64" : ball.extra ? "#bb99ff"
    : deck.has("heavy") ? "#ffcc9b" : deck.has("pulse") ? "#bda4ff" : "#7be5ff";
  const speed = Math.hypot(ball.vx, ball.vy);
  context.save();
  context.shadowColor = color;
  context.shadowBlur = boostTime > 0 ? 18 : 11;

  if (state === "playing" && speed > 0) {
    const length = (boostTime > 0 ? 102 : 70) * speed / currentBallSpeed();
    const endX = x - ball.vx / speed * length;
    const endY = y - ball.vy / speed * length;
    const trail = context.createLinearGradient(x, y, endX, endY);
    trail.addColorStop(0, color + "cc");
    trail.addColorStop(0.46, color + "64");
    trail.addColorStop(1, color + "00");
    context.strokeStyle = trail;
    context.lineWidth = radius * 1.4;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(endX, endY);
    context.stroke();

    context.shadowBlur = 0;
    const swirl = Math.sin(flightTime * 27 + x * 0.02) * radius * 1.3;
    context.strokeStyle = "#e3f8ff90";
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo((x + endX) / 2 + ball.vy / speed * swirl,
      (y + endY) / 2 - ball.vx / speed * swirl, x * 0.36 + endX * 0.64, y * 0.36 + endY * 0.64);
    context.stroke();
  }

  const core = context.createRadialGradient(x - radius * 0.25, y - radius * 0.3, 0, x, y, radius);
  core.addColorStop(0, "#fffdf2");
  core.addColorStop(0.43, "#f4fcff");
  core.addColorStop(1, color);
  paintEllipse(x, y, radius + 4, radius + 4, color + "42");
  paintEllipse(x, y, radius, radius, core);
  context.restore();
}

function drawHullEdge() {
  if (bossHealth === 0) return;
  const y = boss.y + boss.height;
  context.save();
  context.strokeStyle = bricksLeft === 0 ? "#ffc27cb8" : "#91b6d340";
  context.shadowColor = "#ffac70";
  context.shadowBlur = 7;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, y);
  context.lineTo(board.width, y);
  context.stroke();
  context.restore();
}

function drawVortexArms(x, y, outer, inner, spin, colors, winding = 5.4) {
  for (const [arm, color] of colors.entries()) {
    const phase = spin + arm * Math.PI * 2 / colors.length;
    context.beginPath();
    for (let point = 0; point <= 36; point += 1) {
      const progress = point / 36;
      const radius = inner + (outer - inner) * (1 - progress) ** 1.35;
      const angle = phase + progress * winding;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius * 0.84;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.shadowColor = color;
    context.shadowBlur = 13;
    context.strokeStyle = color + "38";
    context.lineWidth = 6;
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = color + "a0";
    context.lineWidth = 1.6;
    context.stroke();

    // 밝은 입자가 바깥에서 중심으로 감겨 들어간다.
    for (let index = 0; index < 5; index += 1) {
      const progress = (flightTime * 0.59 + index / 5 + arm * 0.11) % 1;
      const behind = Math.max(0, progress - 0.05);
      const radius = inner + (outer - inner) * (1 - progress) ** 1.35;
      const previousRadius = inner + (outer - inner) * (1 - behind) ** 1.35;
      const angle = phase + progress * winding;
      const prevAngle = phase + behind * winding;
      context.beginPath();
      context.moveTo(x + Math.cos(prevAngle) * previousRadius, y + Math.sin(prevAngle) * previousRadius * 0.84);
      context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.84);
      context.strokeStyle = color;
      context.lineWidth = 2.3;
      context.stroke();
    }
  }
}

function drawBlackHole() {
  const { x, y, radius } = gravityWell;
  const core = 29;
  if (stage.gravity === "moving") {
    context.beginPath();
    for (let point = 0; point <= 20; point += 1) {
      const position = movingGravityPosition(flightTime + point * 0.045);
      if (point === 0) context.moveTo(position.x, position.y);
      else context.lineTo(position.x, position.y);
    }
    context.strokeStyle = "#cba5ff80";
    context.lineWidth = 2;
    context.setLineDash([5, 9]);
    context.stroke();
    context.setLineDash([]);
    for (let index = 4; index >= 1; index -= 1) {
      const previous = movingGravityPosition(Math.max(0, flightTime - index * 0.16));
      context.strokeStyle = "#9b9af7" + (index > 2 ? "1b" : "32");
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(previous.x, previous.y, 27 + index * 6, 0, Math.PI * 2);
      context.stroke();
    }
  }
  const field = context.createRadialGradient(x, y, core, x, y, radius);
  field.addColorStop(0, "#14052bf2");
  field.addColorStop(0.32, "#311870a0");
  field.addColorStop(0.68, "#186d9e42");
  field.addColorStop(0.94, "#608cf227");
  field.addColorStop(1, "#3fdcef00");
  paintEllipse(x, y, radius, radius, field);

  context.strokeStyle = "#86e0ff48";
  context.lineWidth = 1.3;
  context.setLineDash([6, 10]);
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  drawVortexArms(x, y, radius * 0.99, core + 1, flightTime * 1.12,
    ["#70f6ff", "#c084ff", "#577fff", "#e292ff"], 9.4);
  for (let index = 0; index < 3; index += 1) {
    const inward = (flightTime * 0.72 + index / 3) % 1;
    const sweep = radius - (radius - core - 2) * inward;
    context.strokeStyle = "#91d5ff";
    context.globalAlpha = Math.sin(Math.PI * inward) * 0.33;
    context.lineWidth = 1.5;
    context.beginPath();
    context.ellipse(x, y, sweep, sweep * 0.84, flightTime * 0.08, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.strokeStyle = "#bf98ff74";
  context.lineWidth = 2;
  context.setLineDash([3, 10]);
  context.beginPath();
  context.arc(x, y, gravityWell.captureRadius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  const horizon = context.createRadialGradient(x, y, core * 0.48, x, y, core + 15);
  horizon.addColorStop(0, "#010108");
  horizon.addColorStop(0.56, "#030210");
  horizon.addColorStop(0.72, "#aa78f2c0");
  horizon.addColorStop(0.84, "#58d9ff64");
  horizon.addColorStop(1, "#5f64ef00");
  paintEllipse(x, y, core + 15, core + 15, horizon);
  paintEllipse(x, y, core, core, "#02020a");
  context.shadowColor = "#976cff";
  context.shadowBlur = 14;
  context.strokeStyle = "#c4a8ffe0";
  context.lineWidth = 2.4;
  context.beginPath();
  context.arc(x, y, core + 1, Math.PI * 0.22 + flightTime * 0.55, Math.PI * 1.7 + flightTime * 0.55);
  context.stroke();
  context.shadowBlur = 0;
}

function drawPortals() {
  const [entry, exit] = portals;
  context.beginPath();
  context.moveTo(entry.x, entry.y);
  context.quadraticCurveTo((entry.x + exit.x) / 2, entry.y - 22, exit.x, exit.y);
  context.setLineDash([3, 13]);
  context.lineDashOffset = -flightTime * 29;
  context.strokeStyle = "#b29aff3d";
  context.lineWidth = 1.7;
  context.stroke();
  context.setLineDash([]);

  for (const [index, { x, y }] of portals.entries()) {
    const color = index === 0 ? "#be8cff" : "#9db8ff";
    const glow = context.createRadialGradient(x, y, 3, x, y, portalRadius + 17);
    glow.addColorStop(0, "#130e2add");
    glow.addColorStop(0.66, color + "78");
    glow.addColorStop(1, color + "00");
    paintEllipse(x, y, portalRadius + 17, portalRadius + 17, glow);
    for (let ring = 0; ring < 2; ring += 1) {
      const pulse = (flightTime * 0.92 + ring * 0.5) % 1;
      context.globalAlpha = 1 - pulse;
      context.strokeStyle = color;
      context.lineWidth = 2.5 - pulse;
      context.beginPath();
      context.arc(x, y, portalRadius * (0.69 + 0.65 * pulse), 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
    drawVortexArms(x, y, portalRadius, 10, flightTime * 1.45, [color, "#a9efff"]);
  }
}

function drawStageObstacles() {
  context.save();
  if (stage.layout === "split") drawPortals();
  if (stage.gravity) drawBlackHole();

  if (repairDrone) {
    const { x, y, targetX, tile } = repairDrone;
    if (Math.abs(targetX - x) < 160 && tile.active) {
      const closeness = 1 - Math.abs(targetX - x) / 160;
      context.strokeStyle = "#9bffbda0";
      context.lineWidth = 2 + closeness * 3;
      context.shadowColor = "#87ffd0";
      context.shadowBlur = 9;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(targetX, tile.bottom);
      context.stroke();
      context.shadowBlur = 0;
      for (let spark = 0; spark < 3; spark += 1) {
        const pulse = (flightTime * 2.4 + spark / 3) % 1;
        paintEllipse(x + (targetX - x) * pulse, y + (tile.bottom - y) * pulse, 3, 3, "#ebfff3");
      }
    }
    paintPolygon([[x - 18, y], [x - 9, y - 11], [x + 9, y - 11], [x + 18, y],
      [x + 10, y + 8], [x - 10, y + 8]], "#45667e");
    context.shadowColor = "#a0ffdf";
    context.shadowBlur = 10;
    paintEllipse(x, y - 1, 7, 5, "#a0ffdf");
    context.shadowBlur = 0;
  }

  if (orbitGuards.length) {
    context.strokeStyle = "#d394ff45";
    context.lineWidth = 1.5;
    context.setLineDash([4, 8]);
    context.beginPath();
    context.ellipse(board.width / 2, 400, 190, 61, 0, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    for (const guard of orbitGuards) {
      if (flightTime < guard.disabledUntil) {
        const progress = 1 - (guard.disabledUntil - flightTime) / 8;
        context.strokeStyle = "#dcb1ff6e";
        context.lineWidth = 2.4;
        context.beginPath();
        context.arc(guard.x, guard.y, guard.radius + 3, -Math.PI / 2, Math.PI * 2 * progress - Math.PI / 2);
        context.stroke();
        continue;
      }
      for (let index = 4; index >= 1; index -= 1) {
        const trailAngle = flightTime * 0.78 + guard.phase - index * 0.12;
        const trailX = board.width / 2 + Math.cos(trailAngle) * 190;
        const trailY = 400 + Math.sin(trailAngle) * 61;
        context.globalAlpha = (5 - index) * 0.12;
        paintEllipse(trailX, trailY, 7 - index, 7 - index, "#dc97ff");
      }
      context.globalAlpha = 1;
      const core = context.createRadialGradient(guard.x - 4, guard.y - 5, 1, guard.x, guard.y, guard.radius);
      core.addColorStop(0, "#fff1fe");
      core.addColorStop(0.39, "#d68dff");
      core.addColorStop(1, "#4e2c7a");
      context.shadowColor = "#e998ff";
      context.shadowBlur = 12;
      paintEllipse(guard.x, guard.y, guard.radius, guard.radius, core);
    }
  }
  context.restore();
}

function applyImpactRecoil() {
  if (reduceMotion?.matches) return;
  let force = 0;
  for (const effect of impacts) {
    const age = effectTime - effect.born;
    if (effect.size >= 1.1 && age < 0.12) {
      force = Math.max(force, Math.min(6, effect.size * 3) * (1 - age / 0.12));
    }
  }
  if (force > 0) {
    context.translate(Math.cos(effectTime * 100) * force, Math.sin(effectTime * 126) * force * 0.57);
  }
}

function draw() {
  context.clearRect(0, 0, board.width, board.height);
  context.save();
  applyImpactRecoil();

  drawBoss();
  drawHullEdge();
  drawEscorts();
  for (const brick of bricks) {
    if (brick.active) drawShield(brick);
  }

  drawBeltDebris();
  drawStageObstacles();
  drawScout();
  context.save();
  context.shadowColor = "#01030e";
  context.shadowBlur = 15;
  context.shadowOffsetY = 6;
  for (const meteor of meteors) {
    context.drawImage(meteor.texture, meteor.x - meteor.radius, meteor.y - meteor.radius);
  }
  context.restore();

  context.save();
  context.shadowColor = "#53dfff";
  context.shadowBlur = 8;
  if (!fighterDestroyed) {
    if (fighterVortex) {
      const progress = Math.min(1, (flightTime - fighterVortex.started) / gravityWarpTime);
      const center = paddle.x + paddle.width / 2;
      const scale = 1 - progress * 0.88;
      context.save();
      context.translate(center, paddle.y + 6);
      context.rotate(progress * Math.PI * 2);
      context.scale(scale, scale);
      context.translate(-center, -paddle.y - 6);
      drawFighter();
      context.restore();
    } else {
      drawThrusters();
      drawFighter();
    }
  }
  if (!fighterDestroyed && fighterFlashEnd > effectTime) {
    context.save();
    context.globalAlpha = (fighterFlashEnd - effectTime) / 0.29 * 0.65;
    paintEllipse(paddle.x + paddle.width / 2, paddle.y + 10, paddle.width / 2, 15, "#ff7054");
    context.restore();
  }
  if (!fighterDestroyed && !fighterVortex && hasLaserGuard()) {
    context.strokeStyle = "#ffe4a1";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(paddle.x + paddle.width / 2, paddle.y + 5, paddle.width / 2 + 4, 15, 0, Math.PI, Math.PI * 2);
    context.stroke();
  }

  for (const ball of balls) drawPlasmaBall(ball);
  context.strokeStyle = "#ffc483";
  context.lineWidth = 2.5;
  for (const pellet of pellets) {
    context.beginPath();
    context.moveTo(pellet.x, pellet.y);
    context.lineTo(pellet.x - pellet.vx * 0.02, pellet.y - pellet.vy * 0.02);
    context.stroke();
  }
  context.restore();
  drawPickups();
  drawEscortAttack();
  drawEnemyAttack();
  drawImpacts();
  context.restore();
}

function animate(time) {
  const showEffects = impacts.length > 0 || escorts.some((craft) =>
    craft.destroyed !== null && effectTime - craft.destroyed < 0.64);
  if (shop.hidden) {
    if (lastEffectTime !== null) effectTime += Math.min((time - lastEffectTime) / 1000, 0.05);
    lastEffectTime = time;
    if (showEffects) impacts = impacts.filter(({ born }) => effectTime - born < 0.46);
  } else {
    lastEffectTime = null;
  }
  if (state === "playing" && shop.hidden) {
    // 화면 갱신 빈도와 관계없이 짧고 일정한 간격으로 공을 움직인다.
    if (lastTime !== null) elapsed += Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    while (elapsed >= step && state === "playing") {
      advance();
      elapsed -= step;
    }
    draw();
  } else if (shop.hidden && showEffects) {
    draw();
  }
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (event) => {
  if (!shop.hidden) {
    if (event.code === "Escape") {
      event.preventDefault();
      closeShop();
    }
    return;
  }
  if (event.code === "Space") {
    if (event.target?.closest?.("button")) return;
    event.preventDefault();
    if (!event.repeat && state !== "playing") startGame();
  }
  if (event.code === "ArrowLeft" || event.code === "ArrowRight"
      || event.code === "ArrowUp" || event.code === "ArrowDown") {
    event.preventDefault();
    keys.add(event.code);
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  lastTime = null;
  elapsed = 0;
});

launchButton.addEventListener("click", startGame);
shopButton.addEventListener("click", toggleShop);
document.querySelector("#close-shop").addEventListener("click", () => closeShop());

buildShop();
drawStarfield();
resetBoard();
showBriefing("", "스페이스 키를 누르거나 출격을 선택하세요");
draw();
requestAnimationFrame(animate);
