(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  let startBtn = document.getElementById('startBtn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');

  function fitCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || canvas.parentElement.clientWidth;
    const cssH = Math.max(360, Math.floor(window.innerHeight * 0.62));
    canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    world.width = cssW;
    world.height = cssH;
  }

  const world = { width: 900, height: 500, gravity: 0.50, scrollSpeed: 3.3, running: false };
  const player = { x: 160, y: 0, w: 26, h: 36, vy: 0, onGround: false, landedOnId: null, color: '#eaff8f' };

  // место для загрузки фото лица
  let faceImg = new Image(); faceImg.src = 'photo.jpg';

  let platforms = [];
  let score = 0;
  let best = Number(localStorage.getItem('tjump_best') || 0);
  bestEl.textContent = best;
  let raf = null;

  // музыка
  let music = new Audio('wildCucumber.mp3');
  music.loop = true;
  let musicStarted = false;

  // эффекты
  let crazyMode = false;
  let stopRotation = false;
  let gameWon = false;

  function reset() {
    score = 0;
    scoreEl.textContent = score;
    player.y = world.height * 0.4;
    player.vy = 0;
    player.onGround = false;
    player.landedOnId = null;
    platforms = [];
    crazyMode = false;
    stopRotation = false;
    gameWon = false;
    music.pause();
    music.currentTime = 0;
    music.volume = 1;
    musicStarted = false;
    spawnInitial();
  }

  function spawnInitial() {
    let x = 80;
    for (let i = 0; i < 6; i++) {
      const gap = 140 + Math.random()*80;
      x += gap;
      platforms.push(makeT(x));
    }
  }

  function makeT(x) {
    const baseY = world.height - 120 - Math.random()*180;
    const barW = 90 + Math.random()*70;
    const barT = 12;
    const stemH = 26 + Math.random()*34;
    const id = Math.random().toString(36).slice(2);
    return { id, x, baseY, barW, barT, stemH, scored: false };
  }

  function ensureSpawn() {
    if (platforms.length === 0) {
      platforms.push(makeT(world.width + 60));
      return;
    }
    const last = platforms[platforms.length - 1];
    if (last.x + last.barW < world.width + 220) {
      const gap = 150 + Math.random()*110;
      const nx = last.x + gap;
      platforms.push(makeT(nx));
    }
  }

  function update() {
    player.vy += world.gravity;
    player.y += player.vy;
    platforms.forEach(p => p.x -= world.scrollSpeed);

    player.onGround = false;
    for (const p of platforms) {
      const topY = p.baseY;
      const left = p.x - p.barW/2;
      const right = p.x + p.barW/2;

      const wasAbove = (player.y + player.h - player.vy) <= topY;
      const nowFalling = player.vy > 0;
      const isWithinX = (player.x + player.w/2) >= left && (player.x + player.w/2) <= right;
      const hit = wasAbove && nowFalling && (player.y + player.h) >= topY && isWithinX;
      if (hit) {
        player.y = topY - player.h;
        player.vy = 0;
        player.onGround = true;
        if (!p.scored) {
          p.scored = true;
          score += 1;
          scoreEl.textContent = score;
        }
      }
    }

    platforms = platforms.filter(p => p.x + p.barW/2 > -60);
    ensureSpawn();

    // эффекты по очкам
    if (score >= 130 && !musicStarted) {
      crazyMode = true;
      music.play();
      musicStarted = true;
    }
    if (score >= 150 && !stopRotation) {
      stopRotation = true;
      crazyMode = false;
      music.volume = 0.4;
    }
    if (score >= 200 && !gameWon) {
      gameWon = true;
      winGame();
    }

    if (player.y > world.height + 60 && !gameWon) {
      gameOver();
    }
  }

  function drawPlayer() {
    const g = ctx;
    const x = player.x, y = player.y, w = player.w, h = player.h;

    g.globalAlpha = 0.25;
    g.beginPath(); g.ellipse(x + w/2, y + h + 10, 12, 4, 0, 0, Math.PI*2); g.fillStyle = '#000'; g.fill();
    g.globalAlpha = 1;

    g.strokeStyle = '#eaff8f';
    g.lineWidth = 3;
    g.lineCap = 'round';

    if (faceImg && faceImg.complete) {
      g.drawImage(faceImg, x + w/2 - 40, y - 65, 80, 80);
    } else {
      g.beginPath(); g.arc(x + w/2, y + 8, 7, 0, Math.PI*2); g.stroke();
    }

    g.beginPath(); g.moveTo(x + w/2, y + 16); g.lineTo(x + w/2, y + 30); g.stroke();
    g.beginPath(); g.moveTo(x + w/2, y + 20); g.lineTo(x + 4, y + 24); g.moveTo(x + w/2, y + 20); g.lineTo(x + w - 4, y + 24); g.stroke();
    const t = performance.now()/200;
    const swing = Math.sin(t) * 4 * (player.onGround ? 0.4 : 1);
    g.beginPath(); g.moveTo(x + w/2, y + 30); g.lineTo(x + 6, y + 36 + swing); g.moveTo(x + w/2, y + 30); g.lineTo(x + w - 6, y + 36 - swing); g.stroke();
  }

  function drawT(p) {
    const g = ctx;
    const { x, baseY, barW, barT, stemH } = p;
    g.fillStyle = 'rgba(156,183,255,0.9)';
    const stemW = Math.max(10, Math.min(18, barW * 0.18));
    g.fillRect(x - stemW/2, baseY - stemH, stemW, stemH);
    const r = 4;
    const left = x - barW/2, top = baseY, right = x + barW/2, bottom = baseY + barT;
    g.fillStyle = '#e7f0ff';
    g.beginPath();
    g.moveTo(left + r, top);
    g.lineTo(right - r, top);
    g.quadraticCurveTo(right, top, right, top + r);
    g.lineTo(right, bottom - r);
    g.quadraticCurveTo(right, bottom, right - r, bottom);
    g.lineTo(left + r, bottom);
    g.quadraticCurveTo(left, bottom, left, bottom - r);
    g.lineTo(left, top + r);
    g.quadraticCurveTo(left, top, left + r, top);
    g.closePath();
    g.fill();
  }

  function draw() {
    ctx.clearRect(0,0,world.width,world.height);

    if (crazyMode && !stopRotation) {
      const angle = (performance.now() / 300) % (Math.PI*2);
      ctx.save();
      ctx.translate(world.width/2, world.height/2);
      ctx.rotate(angle);
      ctx.translate(-world.width/2, -world.height/2);
    }

    platforms.forEach(drawT);
    drawPlayer();

    if (crazyMode && !stopRotation) {
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `hsl(${performance.now()/5 % 360},100%,60%)`;
      const msg = Math.floor(performance.now()/600) % 2 === 0 ? 'SWAG' : 'ЭЩКЭРЭ';
      ctx.fillText(msg, world.width/2, world.height/2);
      ctx.restore();
    }
  }

  function loop() {
    if (!world.running) return;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function jump() {
    if (player.onGround || player.vy > -0.01) {
      player.vy = -11.75;
      player.onGround = false;
    }
  }

  function gameOver() {
    cancelAnimationFrame(raf);
    world.running = false;
    statusEl.textContent = 'Игра окончена';
    overlay.hidden = false;
    best = Math.max(best, score);
    localStorage.setItem('tjump_best', String(best));
    overlay.classList.remove('btn_transtperent');
    bestEl.textContent = best;
  }

  function winGame() {
    cancelAnimationFrame(raf);
    world.running = false;
    music.pause();
    statusEl.textContent = 'Ты выиграл! Новый уровень?';
    overlay.hidden = false;
    overlay.classList.remove('btn_transtperent');
  }

  function start() {
    reset();
    overlay.hidden = true;
    world.running = true;
    cancelAnimationFrame(raf);
    overlay.classList.add('btn_transtperent');
    loop();
  }

  // управление
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      jump(); // только прыжок, старт не запускается
    }
  });

  window.addEventListener('pointerdown', () => {
    jump(); // только прыжок
  });

  startBtn.addEventListener('click', start);
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  statusEl.textContent = 'Готов?';
  overlay.hidden = false;
})();
