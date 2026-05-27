const keys = new Set();
let activeGame = "pong";

document.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isGameActive(name) {
  return activeGame === name;
}

function setupCabinetFocus() {
  const panels = document.querySelectorAll(".game-panel");

  function setActive(name) {
    activeGame = name;
    for (const panel of panels) {
      panel.classList.toggle("active-panel", panel.dataset.game === name);
    }
  }

  for (const panel of panels) {
    const activate = () => setActive(panel.dataset.game);
    panel.addEventListener("click", activate);
    panel.addEventListener("focus", activate);
    panel.addEventListener("mouseenter", activate);
    panel.querySelector("canvas").addEventListener("touchstart", activate, { passive: true });
  }
}

function setupTouchControls() {
  const touchButtons = document.querySelectorAll(".touch-btn");

  function press(button) {
    activeGame = button.dataset.touchGame;
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
    button.addEventListener("touchstart", (event) => {
      event.preventDefault();
      press(button);
    }, { passive: false });
    button.addEventListener("touchend", () => release(button));
    button.addEventListener("touchcancel", () => release(button));
  }
}

function drawCrtOverlay(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 2);
  }
  ctx.restore();
}

function setupPong() {
  const canvas = document.getElementById("pongCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("pongStatus");
  const resetButton = document.querySelector('[data-action="pong-reset"]');

  const state = {
    playerY: 110,
    cpuY: 110,
    ballX: canvas.width / 2,
    ballY: canvas.height / 2,
    ballVX: 3.6,
    ballVY: 2.5,
    playerScore: 0,
    cpuScore: 0
  };

  function resetBall(direction) {
    state.ballX = canvas.width / 2;
    state.ballY = canvas.height / 2;
    state.ballVX = 3.6 * direction;
    state.ballVY = (Math.random() * 3 - 1.5) || 1.2;
  }

  function resetGame() {
    state.playerY = 110;
    state.cpuY = 110;
    state.playerScore = 0;
    state.cpuScore = 0;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    status.textContent = "First to 5 wins the set.";
  }

  resetButton.addEventListener("click", resetGame);

  function update() {
    if (isGameActive("pong")) {
      if (keys.has("w")) state.playerY -= 5;
      if (keys.has("s")) state.playerY += 5;
    }
    state.playerY = clamp(state.playerY, 10, canvas.height - 70);

    const cpuCenter = state.cpuY + 30;
    if (cpuCenter < state.ballY - 8) state.cpuY += 3.4;
    if (cpuCenter > state.ballY + 8) state.cpuY -= 3.4;
    state.cpuY = clamp(state.cpuY, 10, canvas.height - 70);

    state.ballX += state.ballVX;
    state.ballY += state.ballVY;

    if (state.ballY <= 8 || state.ballY >= canvas.height - 8) {
      state.ballVY *= -1;
    }

    const playerHit =
      state.ballX <= 32 &&
      state.ballY >= state.playerY &&
      state.ballY <= state.playerY + 60;

    const cpuHit =
      state.ballX >= canvas.width - 32 &&
      state.ballY >= state.cpuY &&
      state.ballY <= state.cpuY + 60;

    if (playerHit && state.ballVX < 0) {
      state.ballVX *= -1.06;
      state.ballVY += (state.ballY - (state.playerY + 30)) * 0.05;
    }

    if (cpuHit && state.ballVX > 0) {
      state.ballVX *= -1.06;
      state.ballVY += (state.ballY - (state.cpuY + 30)) * 0.05;
    }

    if (state.ballX < -10) {
      state.cpuScore += 1;
      resetBall(1);
    }

    if (state.ballX > canvas.width + 10) {
      state.playerScore += 1;
      resetBall(-1);
    }

    if (state.playerScore >= 5 || state.cpuScore >= 5) {
      status.textContent =
        state.playerScore > state.cpuScore ? "You win the set." : "CPU takes the set.";
      state.playerScore = 0;
      state.cpuScore = 0;
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#070b1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#6df7ff";
    ctx.fillRect(18, state.playerY, 10, 60);
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(canvas.width - 28, state.cpuY, 10, 60);

    ctx.fillStyle = "#fff7da";
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '18px "Press Start 2P"';
    ctx.fillText(String(state.playerScore), 140, 28);
    ctx.fillText(String(state.cpuScore), 250, 28);

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
  const canvas = document.getElementById("racingCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("racingStatus");
  const resetButton = document.querySelector('[data-action="racing-reset"]');

  const state = {
    playerX: canvas.width / 2 - 18,
    obstacles: [],
    roadOffset: 0,
    score: 0,
    speed: 3.5,
    gameOver: false,
    cooldown: 0
  };

  function resetGame() {
    state.playerX = canvas.width / 2 - 18;
    state.obstacles = [];
    state.roadOffset = 0;
    state.score = 0;
    state.speed = 3.5;
    state.gameOver = false;
    state.cooldown = 0;
    status.textContent = "Dodge traffic and build distance.";
  }

  resetButton.addEventListener("click", resetGame);

  function spawnObstacle() {
    const laneWidth = 90;
    const lane = Math.floor(Math.random() * 3);
    state.obstacles.push({
      x: 75 + lane * laneWidth,
      y: -60,
      w: 36,
      h: 58,
      color: ["#ff4fd8", "#ffd84d", "#6df7ff"][lane]
    });
  }

  function update() {
    if (state.gameOver) {
      if (isGameActive("racing") && keys.has("enter")) resetGame();
      return;
    }

    if (isGameActive("racing")) {
      if (keys.has("arrowleft")) state.playerX -= 5;
      if (keys.has("arrowright")) state.playerX += 5;
    }
    state.playerX = clamp(state.playerX, 58, canvas.width - 94);

    state.roadOffset = (state.roadOffset + state.speed) % 40;
    state.score += 0.04 * state.speed;
    state.speed = Math.min(8, 3.5 + state.score / 35);

    state.cooldown -= 1;
    if (state.cooldown <= 0) {
      spawnObstacle();
      state.cooldown = Math.max(18, 42 - Math.floor(state.score / 8));
    }

    for (const obstacle of state.obstacles) {
      obstacle.y += state.speed + 1.5;
      const collision =
        state.playerX < obstacle.x + obstacle.w &&
        state.playerX + 36 > obstacle.x &&
        220 < obstacle.y + obstacle.h &&
        220 + 54 > obstacle.y;

      if (collision) {
        state.gameOver = true;
        status.textContent = `Crash at ${Math.floor(state.score)} points. Press Enter or Reset.`;
      }
    }

    state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < canvas.height + 80);
  }

  function renderCar(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 36, 54);
    ctx.fillStyle = "#0c0f18";
    ctx.fillRect(x + 7, y + 6, 22, 14);
    ctx.fillRect(x + 7, y + 32, 22, 10);
    ctx.fillStyle = "#fff7da";
    ctx.fillRect(x + 4, y + 10, 4, 10);
    ctx.fillRect(x + 28, y + 10, 4, 10);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#120224";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#312244";
    ctx.fillRect(45, 0, canvas.width - 90, canvas.height);

    ctx.fillStyle = "#8dff66";
    ctx.fillRect(45, 0, 12, canvas.height);
    ctx.fillRect(canvas.width - 57, 0, 12, canvas.height);

    ctx.fillStyle = "#fff7da";
    for (let y = -40; y < canvas.height + 40; y += 40) {
      ctx.fillRect(canvas.width / 2 - 4, y + state.roadOffset, 8, 24);
      ctx.fillRect(canvas.width / 2 - 94, y + state.roadOffset, 8, 24);
      ctx.fillRect(canvas.width / 2 + 86, y + state.roadOffset, 8, 24);
    }

    renderCar(state.playerX, 220, "#6df7ff");
    for (const obstacle of state.obstacles) {
      renderCar(obstacle.x, obstacle.y, obstacle.color);
    }

    ctx.fillStyle = "#fff7da";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`PTS ${Math.floor(state.score)}`, 16, 22);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff4fd8";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("CRASH", 134, 120);
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
  const canvas = document.getElementById("shooterCanvas");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("shooterStatus");
  const resetButton = document.querySelector('[data-action="shooter-reset"]');

  const state = {
    playerX: canvas.width / 2 - 15,
    bullets: [],
    enemies: [],
    score: 0,
    cooldown: 0,
    spawnTick: 0,
    gameOver: false
  };

  function resetGame() {
    state.playerX = canvas.width / 2 - 15;
    state.bullets = [];
    state.enemies = [];
    state.score = 0;
    state.cooldown = 0;
    state.spawnTick = 0;
    state.gameOver = false;
    status.textContent = "Clear waves before they reach the floor.";
  }

  resetButton.addEventListener("click", resetGame);

  function spawnEnemyRow() {
    for (let i = 0; i < 6; i += 1) {
      if (Math.random() > 0.2) {
        state.enemies.push({
          x: 28 + i * 62,
          y: -20 - Math.random() * 70,
          w: 28,
          h: 22,
          speed: 1 + Math.random() * 0.8
        });
      }
    }
  }

  function update() {
    if (state.gameOver) {
      if (isGameActive("shooter") && keys.has("enter")) resetGame();
      return;
    }

    if (isGameActive("shooter")) {
      if (keys.has("arrowleft")) state.playerX -= 5;
      if (keys.has("arrowright")) state.playerX += 5;
    }
    state.playerX = clamp(state.playerX, 10, canvas.width - 40);

    state.cooldown -= 1;
    if (isGameActive("shooter") && keys.has(" ") && state.cooldown <= 0) {
      state.bullets.push({ x: state.playerX + 13, y: 226, w: 4, h: 12 });
      state.cooldown = 12;
    }

    state.spawnTick -= 1;
    if (state.spawnTick <= 0) {
      spawnEnemyRow();
      state.spawnTick = 75;
    }

    for (const bullet of state.bullets) bullet.y -= 7;
    for (const enemy of state.enemies) enemy.y += enemy.speed + state.score * 0.003;

    for (const enemy of state.enemies) {
      if (enemy.y + enemy.h >= canvas.height - 22) {
        state.gameOver = true;
        status.textContent = `Overrun at ${state.score} points. Press Enter or Reset.`;
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

    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);
    state.enemies = state.enemies.filter((enemy) => enemy.y < canvas.height + 30);
  }

  function renderPlayer() {
    ctx.fillStyle = "#6df7ff";
    ctx.fillRect(state.playerX + 10, 240, 10, 20);
    ctx.fillRect(state.playerX, 252, 30, 10);
    ctx.fillStyle = "#fff7da";
    ctx.fillRect(state.playerX + 5, 248, 20, 4);
  }

  function renderEnemy(enemy) {
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "#120224";
    ctx.fillRect(enemy.x + 5, enemy.y + 6, 5, 5);
    ctx.fillRect(enemy.x + 18, enemy.y + 6, 5, 5);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 30; i += 1) {
      ctx.fillStyle = i % 3 === 0 ? "#ffd84d" : "#fff7da";
      ctx.fillRect((i * 47) % canvas.width, (i * 29) % canvas.height, 2, 2);
    }

    for (const bullet of state.bullets) {
      ctx.fillStyle = "#8dff66";
      ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    }

    for (const enemy of state.enemies) {
      renderEnemy(enemy);
    }

    renderPlayer();

    ctx.fillStyle = "#fff7da";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText(`SCORE ${state.score}`, 14, 22);

    if (state.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd84d";
      ctx.font = '18px "Press Start 2P"';
      ctx.fillText("GAME OVER", 72, 120);
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

setupCabinetFocus();
setupTouchControls();
setupPong();
setupRacing();
setupShooter();
