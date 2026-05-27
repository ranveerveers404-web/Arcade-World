const keys = new Set();
const GAME_NAMES = {
  pongduel: "Pong Duel",
  neonracer: "Neon Racer",
  starhunter: "Star Hunter",
  bricksmash: "Brick Smash",
  mazerun: "Maze Run"
};
const SCORE_STORAGE_KEY = "arc-world-scores";
const PLAYER_STORAGE_KEY = "arc-world-player";

let activeGame = "pongduel";

const playerNameInput = document.getElementById("playerName");
const globalLeaderboard = document.getElementById("globalLeaderboard");
const gameLeaderboard = document.getElementById("gameLeaderboard");
const modePill = document.getElementById("modePill");
const leaderboardModeText = document.getElementById("leaderboardModeText");
const leaderboardModeBadge = document.getElementById("leaderboardModeBadge");

const leaderboardStore = createLeaderboardStore();

document.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "s"].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizePlayerName(value) {
  const cleaned = value.replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 16);
  return cleaned || "ARCADE ACE";
}

function getPlayerName() {
  const safeName = sanitizePlayerName(playerNameInput.value);
  if (playerNameInput.value !== safeName) {
    playerNameInput.value = safeName;
  }
  localStorage.setItem(PLAYER_STORAGE_KEY, safeName);
  return safeName;
}

function loadPlayerName() {
  const savedName = localStorage.getItem(PLAYER_STORAGE_KEY);
  if (savedName) {
    playerNameInput.value = sanitizePlayerName(savedName);
  }
}

function drawCrtOverlay(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }
  ctx.restore();
}

function setActiveGame(name, shouldScroll = false) {
  activeGame = name;
  const panels = document.querySelectorAll(".game-panel");
  for (const panel of panels) {
    const isActive = panel.dataset.game === name;
    panel.classList.toggle("active-panel", isActive);
    if (isActive && shouldScroll) {
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function isGameActive(name) {
  return activeGame === name;
}

function setupCabinetFocus() {
  const panels = document.querySelectorAll(".game-panel");
  for (const panel of panels) {
    const activate = () => setActiveGame(panel.dataset.game);
    panel.addEventListener("click", activate);
    panel.addEventListener("focus", activate);
    panel.addEventListener("mouseenter", activate);
    panel.querySelector("canvas").addEventListener("touchstart", activate, { passive: true });
  }

  const focusButtons = document.querySelectorAll("[data-focus-game]");
  for (const button of focusButtons) {
    button.addEventListener("click", () => {
      const game = button.dataset.focusGame;
      setActiveGame(game, true);
    });
  }
}

function setupTouchControls() {
  const touchButtons = document.querySelectorAll(".touch-btn");

  function press(button) {
    setActiveGame(button.dataset.touchGame);
    keys.add(button.dataset.key);
    button.classList.add("active-touch");
  }

  function release(button) {
    keys.delete(button.dataset.key);
    button.classList.remove("active-touch");
  }

  for (const button of touchButtons) {
    button.addEventListener("mousedown", () => press(button));
    button.addEventListener("mouseup", () => release(button));
    button.addEventListener("mouseleave", () => release(button));
    button.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        press(button);
      },
      { passive: false }
    );
    button.addEventListener("touchend", () => release(button));
    button.addEventListener("touchcancel", () => release(button));
  }
}

function setupFullscreenButtons() {
  const buttons = document.querySelectorAll("[data-fullscreen]");
  for (const button of buttons) {
    button.addEventListener("click", async () => {
      const panel = document.getElementById(button.dataset.fullscreen);
      if (!panel) return;

      try {
        if (document.fullscreenElement === panel) {
          await document.exitFullscreen();
        } else {
          await panel.requestFullscreen();
        }
      } catch (error) {
        console.error("Fullscreen failed", error);
      }
    });
  }
}

function createLeaderboardStore() {
  const config = window.ARC_WORLD_LEADERBOARD;
  const hasSupabase =
    config &&
    typeof config.projectUrl === "string" &&
    typeof config.publishableKey === "string" &&
    config.projectUrl &&
    config.publishableKey;

  if (hasSupabase) {
    return {
      mode: "public",
      async fetchScores() {
        const response = await fetch(
          `${config.projectUrl}/rest/v1/scores?select=player,game,score,created_at&order=score.desc&limit=100`,
          {
            headers: {
              apikey: config.publishableKey,
              Authorization: `Bearer ${config.publishableKey}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Leaderboard fetch failed: ${response.status}`);
        }

        return await response.json();
      },
      async submitScore(entry) {
        const response = await fetch(`${config.projectUrl}/rest/v1/scores`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=minimal",
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`
          },
          body: JSON.stringify(entry)
        });

        if (!response.ok) {
          throw new Error(`Leaderboard submit failed: ${response.status}`);
        }
      }
    };
  }

  return {
    mode: "local",
    async fetchScores() {
      try {
        return JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || "[]");
      } catch {
        return [];
      }
    },
    async submitScore(entry) {
      const current = await this.fetchScores();
      current.push({
        ...entry,
        created_at: new Date().toISOString()
      });
      localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(current));
    }
  };
}

function updateLeaderboardModeUI() {
  if (leaderboardStore.mode === "public") {
    modePill.textContent = "Public Live";
    leaderboardModeText.textContent =
      "Leaderboard mode: public live board. Scores are shared for everyone visiting the site.";
    leaderboardModeBadge.textContent = "Public Live";
  } else {
    modePill.textContent = "Local Demo";
    leaderboardModeText.textContent =
      "Leaderboard mode: local browser demo. Connect Supabase in the code to make it public for everyone.";
    leaderboardModeBadge.textContent = "Local Mode";
  }
}

async function recordScore(game, score) {
  const numericScore = Math.floor(score);
  if (numericScore <= 0) return;

  const entry = {
    player: getPlayerName(),
    game,
    score: numericScore
  };

  try {
    await leaderboardStore.submitScore(entry);
    await refreshLeaderboard();
  } catch (error) {
    console.error("Could not save score", error);
  }
}

function renderGlobalLeaderboard(scores) {
  const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 8);
  globalLeaderboard.innerHTML = "";

  if (!topScores.length) {
    globalLeaderboard.innerHTML = `<li class="score-item"><div class="score-rank">--</div><div><div class="score-player">No scores yet</div><div class="score-meta">Play any game to create the first record.</div></div><div class="score-value">0</div></li>`;
    return;
  }

  topScores.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "score-item";
    item.innerHTML = `
      <div class="score-rank">${index + 1}</div>
      <div>
        <div class="score-player">${entry.player}</div>
        <div class="score-meta">${GAME_NAMES[entry.game] || entry.game}</div>
      </div>
      <div class="score-value">${entry.score.toLocaleString()}</div>
    `;
    globalLeaderboard.appendChild(item);
  });
}

function renderGameLeaderboard(scores) {
  const bestByGame = {};
  for (const score of scores) {
    if (!bestByGame[score.game] || score.score > bestByGame[score.game].score) {
      bestByGame[score.game] = score;
    }
  }

  gameLeaderboard.innerHTML = "";

  Object.keys(GAME_NAMES).forEach((gameKey) => {
    const best = bestByGame[gameKey];
    const card = document.createElement("article");
    card.className = "game-score-card";
    card.innerHTML = `
      <strong>${GAME_NAMES[gameKey]}</strong>
      <span>${best ? best.score.toLocaleString() : 0} pts</span>
      <small>${best ? `Held by ${best.player}` : "No score yet"}</small>
    `;
    gameLeaderboard.appendChild(card);
  });
}

async function refreshLeaderboard() {
  try {
    const scores = await leaderboardStore.fetchScores();
    renderGlobalLeaderboard(scores);
    renderGameLeaderboard(scores);
  } catch (error) {
    console.error("Could not refresh leaderboard", error);
    modePill.textContent = "Offline";
  }
}

function setupLeaderboardControls() {
  playerNameInput.addEventListener("change", () => {
    playerNameInput.value = sanitizePlayerName(playerNameInput.value);
    getPlayerName();
  });
  playerNameInput.addEventListener("blur", () => {
    playerNameInput.value = sanitizePlayerName(playerNameInput.value);
    getPlayerName();
  });

  document.getElementById("refreshLeaderboardBtn").addEventListener("click", refreshLeaderboard);
}

function setupPong() {
  const gameKey = "pongduel";
  const canvas = document.getElementById("pongCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("pongStatus");
  const resetButton = document.querySelector('[data-action="pongduel-reset"]');

  const state = {
    playerY: 130,
    cpuY: 130,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    ballVX: 4,
    ballVY: 3,
    playerScore: 0,
    cpuScore: 0,
    sessionScore: 0,
    savedRound: false
  };

  function resetBall(direction) {
    state.ballX = canvas.width / 2;
    state.ballY = canvas.height / 2;
    state.ballVX = 4 * direction;
    state.ballVY = (Math.random() * 3 - 1.5) || 1.2;
  }

  function resetGame() {
    state.playerY = 130;
    state.cpuY = 130;
    state.playerScore = 0;
    state.cpuScore = 0;
    state.sessionScore = 0;
    state.savedRound = false;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    status.textContent = "First to 5 wins the set.";
  }

  resetButton.addEventListener("click", resetGame);

  function update() {
    if (isGameActive(gameKey)) {
      if (keys.has("w")) state.playerY -= 5.5;
      if (keys.has("s")) state.playerY += 5.5;
    }
    state.playerY = clamp(state.playerY, 12, canvas.height - 82);

    const cpuCenter = state.cpuY + 34;
    if (cpuCenter < state.ballY - 10) state.cpuY += 3.8;
    if (cpuCenter > state.ballY + 10) state.cpuY -= 3.8;
    state.cpuY = clamp(state.cpuY, 12, canvas.height - 82);

    state.ballX += state.ballVX;
    state.ballY += state.ballVY;

    if (state.ballY <= 8 || state.ballY >= canvas.height - 8) {
      state.ballVY *= -1;
    }

    const playerHit =
      state.ballX <= 38 &&
      state.ballY >= state.playerY &&
      state.ballY <= state.playerY + 70;

    const cpuHit =
      state.ballX >= canvas.width - 38 &&
      state.ballY >= state.cpuY &&
      state.ballY <= state.cpuY + 70;

    if (playerHit && state.ballVX < 0) {
      state.ballVX *= -1.04;
      state.ballVY += (state.ballY - (state.playerY + 35)) * 0.05;
    }

    if (cpuHit && state.ballVX > 0) {
      state.ballVX *= -1.04;
      state.ballVY += (state.ballY - (state.cpuY + 35)) * 0.05;
    }

    if (state.ballX < -15) {
      state.cpuScore += 1;
      resetBall(1);
    }

    if (state.ballX > canvas.width + 15) {
      state.playerScore += 1;
      state.sessionScore += 100;
      resetBall(-1);
    }

    if (!state.savedRound && (state.playerScore >= 5 || state.cpuScore >= 5)) {
      state.savedRound = true;
      const won = state.playerScore > state.cpuScore;
      status.textContent = won
        ? `Set won. Session score ${state.sessionScore}. Reset to play again.`
        : `CPU wins. You finished with ${state.sessionScore} points.`;
      recordScore(gameKey, state.sessionScore);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#58dfff";
    ctx.fillRect(22, state.playerY, 12, 70);
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(canvas.width - 34, state.cpuY, 12, 70);

    ctx.fillStyle = "#fff7da";
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '22px "Press Start 2P"';
    ctx.fillText(String(state.playerScore), 165, 34);
    ctx.fillText(String(state.cpuScore), 290, 34);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillText(`PTS ${state.sessionScore}`, 18, 24);

    drawCrtOverlay(ctx, canvas.width, canvas.height);
  }

  function tick() {
    update();
    render();
    requestAnimationFrame(tick);
  }

  resetGame();
  tick();
}

function setupRacing() {
  const gameKey = "neonracer";
  const canvas = document.getElementById("racingCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("racingStatus");
  const resetButton = document.querySelector('[data-action="neonracer-reset"]');

  const state = {
    playerX: canvas.width / 2 - 18,
    obstacles: [],
    roadOffset: 0,
    score: 0,
    speed: 4,
    cooldown: 0,
    gameOver: false,
    scoreSaved: false
  };

  function resetGame() {
    state.playerX = canvas.width / 2 - 18;
    state.obstacles = [];
    state.roadOffset = 0;
    state.score = 0;
    state.speed = 4;
    state.cooldown = 0;
    state.gameOver = false;
    state.scoreSaved = false;
    status.textContent = "Dodge traffic and build distance.";
  }

  function spawnObstacle() {
    const laneWidth = 108;
    const lane = Math.floor(Math.random() * 3);
    state.obstacles.push({
      x: 92 + lane * laneWidth,
      y: -70,
      w: 42,
      h: 64,
      color: ["#ff4fd8", "#ffd54d", "#58dfff"][lane]
    });
  }

  resetButton.addEventListener("click", resetGame);

  function update() {
    if (state.gameOver) {
      if (isGameActive(gameKey) && keys.has("enter")) resetGame();
      return;
    }

    if (isGameActive(gameKey)) {
      if (keys.has("arrowleft")) state.playerX -= 5.2;
      if (keys.has("arrowright")) state.playerX += 5.2;
    }

    state.playerX = clamp(state.playerX, 76, canvas.width - 118);
    state.roadOffset = (state.roadOffset + state.speed) % 48;
    state.score += 0.09 * state.speed;
    state.speed = Math.min(10, 4 + state.score / 65);

    state.cooldown -= 1;
    if (state.cooldown <= 0) {
      spawnObstacle();
      state.cooldown = Math.max(20, 48 - Math.floor(state.score / 10));
    }

    for (const obstacle of state.obstacles) {
      obstacle.y += state.speed + 1.6;
      const collision =
        state.playerX < obstacle.x + obstacle.w &&
        state.playerX + 42 > obstacle.x &&
        248 < obstacle.y + obstacle.h &&
        248 + 62 > obstacle.y;

      if (collision) {
        state.gameOver = true;
        status.textContent = `Crash at ${Math.floor(state.score)} points. Press Enter or Reset.`;
      }
    }

    if (state.gameOver && !state.scoreSaved) {
      state.scoreSaved = true;
      recordScore(gameKey, state.score);
    }

    state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < canvas.height + 90);
  }

  function renderCar(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 42, 62);
    ctx.fillStyle = "#0b1021";
    ctx.fillRect(x + 8, y + 7, 26, 18);
    ctx.fillRect(x + 8, y + 36, 26, 14);
    ctx.fillStyle = "#fff7da";
    ctx.fillRect(x + 4, y + 11, 4, 10);
    ctx.fillRect(x + 34, y + 11, 4, 10);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#110322";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2b1941";
    ctx.fillRect(62, 0, canvas.width - 124, canvas.height);
    ctx.fillStyle = "#a9ff62";
    ctx.fillRect(62, 0, 14, canvas.height);
    ctx.fillRect(canvas.width - 76, 0, 14, canvas.height);

    ctx.fillStyle = "#fff7da";
    for (let y = -48; y < canvas.height + 48; y += 48) {
      ctx.fillRect(canvas.width / 2 - 5, y + state.roadOffset, 10, 30);
      ctx.fillRect(canvas.width / 2 - 112, y + state.roadOffset, 8, 24);
      ctx.fillRect(canvas.width / 2 + 104, y + state.roadOffset, 8, 24);
    }

    renderCar(state.playerX, 248, "#58dfff");
    for (const obstacle of state.obstacles) {
      renderCar(obstacle.x, obstacle.y, obstacle.color);
    }

    ctx.fillStyle = "#fff7da";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`PTS ${Math.floor(state.score)}`, 18, 24);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff4fd8";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("CRASH", 170, 145);
    }

    drawCrtOverlay(ctx, canvas.width, canvas.height);
  }

  function tick() {
    update();
    render();
    requestAnimationFrame(tick);
  }

  resetGame();
  tick();
}

function setupShooter() {
  const gameKey = "starhunter";
  const canvas = document.getElementById("shooterCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("shooterStatus");
  const resetButton = document.querySelector('[data-action="starhunter-reset"]');

  const state = {
    playerX: canvas.width / 2 - 15,
    bullets: [],
    enemies: [],
    score: 0,
    lives: 3,
    cooldown: 0,
    spawnTick: 0,
    gameOver: false,
    scoreSaved: false
  };

  function resetGame() {
    state.playerX = canvas.width / 2 - 15;
    state.bullets = [];
    state.enemies = [];
    state.score = 0;
    state.lives = 3;
    state.cooldown = 0;
    state.spawnTick = 0;
    state.gameOver = false;
    state.scoreSaved = false;
    status.textContent = "Clear waves before they hit the floor.";
  }

  resetButton.addEventListener("click", resetGame);

  function spawnEnemyRow() {
    for (let i = 0; i < 7; i += 1) {
      if (Math.random() > 0.18) {
        state.enemies.push({
          x: 34 + i * 60,
          y: -20 - Math.random() * 70,
          w: 30,
          h: 24,
          speed: 1.1 + Math.random() * 0.8
        });
      }
    }
  }

  function update() {
    if (state.gameOver) {
      if (isGameActive(gameKey) && keys.has("enter")) resetGame();
      return;
    }

    if (isGameActive(gameKey)) {
      if (keys.has("arrowleft")) state.playerX -= 5.2;
      if (keys.has("arrowright")) state.playerX += 5.2;
    }
    state.playerX = clamp(state.playerX, 10, canvas.width - 40);

    state.cooldown -= 1;
    if (isGameActive(gameKey) && keys.has(" ") && state.cooldown <= 0) {
      state.bullets.push({ x: state.playerX + 13, y: 256, w: 4, h: 14 });
      state.cooldown = 12;
    }

    state.spawnTick -= 1;
    if (state.spawnTick <= 0) {
      spawnEnemyRow();
      state.spawnTick = Math.max(45, 78 - Math.floor(state.score / 60));
    }

    for (const bullet of state.bullets) bullet.y -= 8;
    for (const enemy of state.enemies) enemy.y += enemy.speed + state.score * 0.0022;

    for (const enemy of state.enemies) {
      if (enemy.y + enemy.h >= canvas.height - 32) {
        enemy.y = canvas.height + 80;
        state.lives -= 1;
        status.textContent = `${state.lives} lives left. Keep firing.`;
      }
    }

    for (const bullet of state.bullets) {
      for (const enemy of state.enemies) {
        const hit =
          bullet.x < enemy.x + enemy.w &&
          bullet.x + bullet.w > enemy.x &&
          bullet.y < enemy.y + enemy.h &&
          bullet.y + bullet.h > enemy.y;

        if (hit) {
          bullet.y = -50;
          enemy.y = canvas.height + 50;
          state.score += 10;
        }
      }
    }

    if (state.lives <= 0) {
      state.gameOver = true;
      status.textContent = `Game over at ${state.score} points. Press Enter or Reset.`;
    }

    if (state.gameOver && !state.scoreSaved) {
      state.scoreSaved = true;
      recordScore(gameKey, state.score);
    }

    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);
    state.enemies = state.enemies.filter((enemy) => enemy.y < canvas.height + 40);
  }

  function renderPlayer() {
    ctx.fillStyle = "#58dfff";
    ctx.fillRect(state.playerX + 10, 268, 10, 24);
    ctx.fillRect(state.playerX, 280, 30, 10);
    ctx.fillStyle = "#fff7da";
    ctx.fillRect(state.playerX + 5, 275, 20, 4);
  }

  function renderEnemy(enemy) {
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "#120224";
    ctx.fillRect(enemy.x + 6, enemy.y + 7, 5, 5);
    ctx.fillRect(enemy.x + 19, enemy.y + 7, 5, 5);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#040714";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 36; i += 1) {
      ctx.fillStyle = i % 4 === 0 ? "#ffd54d" : "#fff7da";
      ctx.fillRect((i * 63) % canvas.width, (i * 31) % canvas.height, 2, 2);
    }

    for (const bullet of state.bullets) {
      ctx.fillStyle = "#a9ff62";
      ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    }

    for (const enemy of state.enemies) {
      renderEnemy(enemy);
    }

    renderPlayer();

    ctx.fillStyle = "#fff7da";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`SCORE ${state.score}`, 14, 24);
    ctx.fillText(`LIVES ${state.lives}`, 320, 24);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd54d";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("GAME OVER", 118, 150);
    }

    drawCrtOverlay(ctx, canvas.width, canvas.height);
  }

  function tick() {
    update();
    render();
    requestAnimationFrame(tick);
  }

  resetGame();
  tick();
}

function setupBrickSmash() {
  const gameKey = "bricksmash";
  const canvas = document.getElementById("brickCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("brickStatus");
  const resetButton = document.querySelector('[data-action="bricksmash-reset"]');

  const state = {
    paddleX: canvas.width / 2 - 48,
    ballX: canvas.width / 2,
    ballY: 210,
    ballVX: 3.2,
    ballVY: -3.8,
    bricks: [],
    score: 0,
    lives: 3,
    level: 1,
    gameOver: false,
    scoreSaved: false
  };

  function buildBricks() {
    state.bricks = [];
    const colors = ["#ff4fd8", "#58dfff", "#ffd54d", "#a9ff62", "#7c67ff"];
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        state.bricks.push({
          x: 26 + col * 57,
          y: 36 + row * 24,
          w: 48,
          h: 14,
          alive: true,
          color: colors[row]
        });
      }
    }
  }

  function resetBall() {
    state.ballX = canvas.width / 2;
    state.ballY = 210;
    state.ballVX = 3.2 * (Math.random() > 0.5 ? 1 : -1);
    state.ballVY = -3.8 - state.level * 0.2;
  }

  function resetGame() {
    state.paddleX = canvas.width / 2 - 48;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.gameOver = false;
    state.scoreSaved = false;
    buildBricks();
    resetBall();
    status.textContent = "Break every tile and keep the orb alive.";
  }

  resetButton.addEventListener("click", resetGame);

  function nextWave() {
    state.level += 1;
    buildBricks();
    resetBall();
    status.textContent = `Wave ${state.level}. Bricks reset faster now.`;
  }

  function update() {
    if (state.gameOver) {
      if (isGameActive(gameKey) && keys.has("enter")) resetGame();
      return;
    }

    if (isGameActive(gameKey)) {
      if (keys.has("arrowleft")) state.paddleX -= 6;
      if (keys.has("arrowright")) state.paddleX += 6;
    }
    state.paddleX = clamp(state.paddleX, 12, canvas.width - 108);

    state.ballX += state.ballVX;
    state.ballY += state.ballVY;

    if (state.ballX <= 8 || state.ballX >= canvas.width - 8) state.ballVX *= -1;
    if (state.ballY <= 8) state.ballVY *= -1;

    if (
      state.ballY >= 268 &&
      state.ballY <= 286 &&
      state.ballX >= state.paddleX &&
      state.ballX <= state.paddleX + 96 &&
      state.ballVY > 0
    ) {
      state.ballVY *= -1;
      state.ballVX = ((state.ballX - (state.paddleX + 48)) / 48) * 4.5;
    }

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      const hit =
        state.ballX > brick.x &&
        state.ballX < brick.x + brick.w &&
        state.ballY > brick.y &&
        state.ballY < brick.y + brick.h;
      if (hit) {
        brick.alive = false;
        state.ballVY *= -1;
        state.score += 15;
        break;
      }
    }

    if (state.ballY > canvas.height + 10) {
      state.lives -= 1;
      if (state.lives <= 0) {
        state.gameOver = true;
        status.textContent = `Game over at ${state.score} points.`;
      } else {
        status.textContent = `${state.lives} lives left. Keep smashing.`;
        resetBall();
      }
    }

    if (state.bricks.every((brick) => !brick.alive)) {
      nextWave();
    }

    if (state.gameOver && !state.scoreSaved) {
      state.scoreSaved = true;
      recordScore(gameKey, state.score);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#09051b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    }

    ctx.fillStyle = "#58dfff";
    ctx.fillRect(state.paddleX, 278, 96, 12);

    ctx.fillStyle = "#fff7da";
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`SCORE ${state.score}`, 16, 24);
    ctx.fillText(`LIVES ${state.lives}`, 180, 24);
    ctx.fillText(`WAVE ${state.level}`, 328, 24);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd54d";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("OUT OF ORBS", 78, 150);
    }

    drawCrtOverlay(ctx, canvas.width, canvas.height);
  }

  function tick() {
    update();
    render();
    requestAnimationFrame(tick);
  }

  resetGame();
  tick();
}

function setupMazeRun() {
  const gameKey = "mazerun";
  const canvas = document.getElementById("mazeCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("mazeStatus");
  const resetButton = document.querySelector('[data-action="mazerun-reset"]');

  const tileSize = 20;
  const gridWidth = 20;
  const gridHeight = 14;

  const state = {
    snake: [],
    direction: "right",
    nextDirection: "right",
    food: { x: 0, y: 0 },
    score: 0,
    speedTick: 0,
    gameOver: false,
    scoreSaved: false
  };

  function placeFood() {
    do {
      state.food = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
      };
    } while (state.snake.some((segment) => segment.x === state.food.x && segment.y === state.food.y));
  }

  function resetGame() {
    state.snake = [
      { x: 4, y: 7 },
      { x: 3, y: 7 },
      { x: 2, y: 7 }
    ];
    state.direction = "right";
    state.nextDirection = "right";
    state.score = 0;
    state.speedTick = 0;
    state.gameOver = false;
    state.scoreSaved = false;
    placeFood();
    status.textContent = "Eat the orbs. Don’t bite your own trail.";
  }

  resetButton.addEventListener("click", resetGame);

  function handleDirection() {
    if (!isGameActive(gameKey)) return;
    if (keys.has("arrowup") && state.direction !== "down") state.nextDirection = "up";
    if (keys.has("arrowdown") && state.direction !== "up") state.nextDirection = "down";
    if (keys.has("arrowleft") && state.direction !== "right") state.nextDirection = "left";
    if (keys.has("arrowright") && state.direction !== "left") state.nextDirection = "right";
  }

  function stepSnake() {
    if (state.gameOver) {
      if (isGameActive(gameKey) && keys.has("enter")) resetGame();
      return;
    }

    handleDirection();
    state.direction = state.nextDirection;

    const head = { ...state.snake[0] };
    if (state.direction === "up") head.y -= 1;
    if (state.direction === "down") head.y += 1;
    if (state.direction === "left") head.x -= 1;
    if (state.direction === "right") head.x += 1;

    const hitWall =
      head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight;
    const hitSelf = state.snake.some((segment) => segment.x === head.x && segment.y === head.y);

    if (hitWall || hitSelf) {
      state.gameOver = true;
      status.textContent = `Trail crash at ${state.score} points. Press Enter or Reset.`;
      if (!state.scoreSaved) {
        state.scoreSaved = true;
        recordScore(gameKey, state.score);
      }
      return;
    }

    state.snake.unshift(head);

    if (head.x === state.food.x && head.y === state.food.y) {
      state.score += 25;
      placeFood();
      status.textContent = `Orb collected. Score ${state.score}.`;
    } else {
      state.snake.pop();
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#060815";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = (canvas.width - gridWidth * tileSize) / 2;
    const offsetY = (canvas.height - gridHeight * tileSize) / 2;

    for (let y = 0; y < gridHeight; y += 1) {
      for (let x = 0; x < gridWidth; x += 1) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#11162b" : "#0b1021";
        ctx.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize - 1, tileSize - 1);
      }
    }

    ctx.fillStyle = "#ffd54d";
    ctx.beginPath();
    ctx.arc(
      offsetX + state.food.x * tileSize + tileSize / 2,
      offsetY + state.food.y * tileSize + tileSize / 2,
      6,
      0,
      Math.PI * 2
    );
    ctx.fill();

    state.snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? "#58dfff" : "#ff4fd8";
      ctx.fillRect(offsetX + segment.x * tileSize + 2, offsetY + segment.y * tileSize + 2, tileSize - 4, tileSize - 4);
    });

    ctx.fillStyle = "#fff7da";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`SCORE ${state.score}`, 16, 24);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff4fd8";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("MAZE LOST", 118, 152);
    }

    drawCrtOverlay(ctx, canvas.width, canvas.height);
  }

  resetGame();
  setInterval(stepSnake, 120);
  function tick() {
    render();
    requestAnimationFrame(tick);
  }
  tick();
}

loadPlayerName();
updateLeaderboardModeUI();
setupCabinetFocus();
setupTouchControls();
setupFullscreenButtons();
setupLeaderboardControls();
setupPong();
setupRacing();
setupShooter();
setupBrickSmash();
setupMazeRun();
refreshLeaderboard();
