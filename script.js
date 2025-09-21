(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  let startBtn = document.getElementById('startBtn');
  let level2Btn = document.getElementById('level2Btn');
  let level3Btn = document.getElementById('level3Btn');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusEl = document.getElementById('status');
  const controlsEl = document.getElementById('controls');
  const instructionsEl = document.getElementById('instructions');
  const backgroundVideo = document.getElementById('backgroundVideo');
  const videoContainer = document.getElementById('videoContainer');
  const levelTitleEl = document.getElementById('levelTitle');
  const hiddenLevel2Btn = document.getElementById('hiddenLevel2Btn');

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

  // Глобальные переменные
  const world = { width: 900, height: 500, gravity: 0.50, scrollSpeed: 3.3, running: false };
  let currentLevel = 1;
  let score = 0;
  let best = Number(localStorage.getItem('tjump_best') || 0);
  let raf = null;
  
  // Состояние клавиш для плавного управления
  const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
  };

  // Игровые объекты
  let player = { x: 160, y: 0, w: 26, h: 36, vy: 0, onGround: false, landedOnId: null, color: '#eaff8f' };
  let platforms = [];
  let cars = []; // Для 2 уровня
  let obstacles = []; // Для 3 уровня

  // Изображения
  let faceImg = new Image(); faceImg.src = 'photo.jpg';
  let carImg = new Image(); carImg.src = 'm5.png';

  // Музыка
  let music = new Audio('wildCucumber.mp3');
  music.loop = true;
  let musicStarted = false;

  // Эффекты
  let crazyMode = false;
  let stopRotation = false;
  let gameWon = false;

  // Инициализация
  bestEl.textContent = best;

  function reset() {
    score = 0;
    scoreEl.textContent = score;
    player.y = world.height * 0.4;
    player.vy = 0;
    player.onGround = false;
    player.landedOnId = null;
    platforms = [];
    cars = [];
    obstacles = [];
    crazyMode = false;
    stopRotation = false;
    gameWon = false;
    music.pause();
    music.currentTime = 0;
    music.volume = 1;
    musicStarted = false;
    
    // Скрыть видео фона
    if (currentLevel !== 2) {
      videoContainer.style.display = 'none';
      backgroundVideo.pause();
      backgroundVideo.muted = true; // Отключаем звук при сбросе
    }
    
    // Обновить интерфейс в зависимости от уровня
    updateUIForLevel();
    
    if (currentLevel === 1) {
      spawnInitial();
    } else if (currentLevel === 2) {
      spawnInitialCars();
    } else if (currentLevel === 3) {
      spawnInitialObstacles();
    }
  }

  function updateUIForLevel() {
    if (currentLevel === 1) {
      levelTitleEl.textContent = 'Уровень 1';
      controlsEl.textContent = 'Управление: Пробел / клик / тап — прыжок.';
      instructionsEl.textContent = 'Нажмите «Старт», затем включите трек в плеере справа (обложка видна).';
    } else if (currentLevel === 2) {
      levelTitleEl.textContent = 'Уровень 2 - Езда на машине';
      controlsEl.textContent = 'Управление: W/A/S/D или стрелки — движение во всех направлениях.';
      instructionsEl.textContent = 'Объезжайте машины! За каждую машину мимо которой проедете получите 1 очко.';
    } else if (currentLevel === 3) {
      levelTitleEl.textContent = 'Уровень 3 - Новый геймплей';
      controlsEl.textContent = 'Управление: W/A/S/D — движение.';
      instructionsEl.textContent = 'Новый геймплей! Избегайте препятствий и собирайте очки.';
    }
  }

  // УРОВЕНЬ 1: Прыжки по платформам
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

  // УРОВЕНЬ 2: Езда на машине
  function spawnInitialCars() {
    // Создаем начальные машины
    for (let i = 0; i < 5; i++) {
      spawnCar(world.width + i * 200);
    }
  }

  function spawnCar(x) {
    // Спавним машины по всей высоте контейнера
    const y = 50 + Math.random() * (world.height - 100); // От 50 до высота-50
    const id = Math.random().toString(36).slice(2);
    return { id, x, y, w: 60, h: 40, scored: false };
  }

  function ensureCarSpawn() {
    if (cars.length === 0) {
      cars.push(spawnCar(world.width + 100));
      return;
    }
    const last = cars[cars.length - 1];
    if (last.x < world.width + 150) {
      cars.push(spawnCar(world.width + Math.random() * 200 + 100));
    }
  }

  // УРОВЕНЬ 3: Заглушка
  function spawnInitialObstacles() {
    // Заглушка для 3 уровня
    for (let i = 0; i < 3; i++) {
      obstacles.push({
        x: world.width + i * 150,
        y: world.height - 100,
        w: 30,
        h: 30,
        scored: false
      });
    }
  }

  function update() {
    // Обработка непрерывного движения для 2 и 3 уровней
    if (currentLevel === 2 || currentLevel === 3) {
      if (keys.a || keys.ArrowLeft) moveLeft();
      if (keys.d || keys.ArrowRight) moveRight();
      if (keys.w || keys.ArrowUp) moveUp();
      if (keys.s || keys.ArrowDown) moveDown();
    }
    
    if (currentLevel === 1) {
      updateLevel1();
    } else if (currentLevel === 2) {
      updateLevel2();
    } else if (currentLevel === 3) {
      updateLevel3();
    }
  }

  function updateLevel1() {
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
    } z

    platforms = platforms.filter(p => p.x + p.barW/2 > -60);
    ensureSpawn();

    // Эффекты по очкам
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
      winLevel1();
    }

    if (player.y > world.height + 60 && !gameWon) {
      gameOver();
    }
  }

  function updateLevel2() {
    // Движение машин
    cars.forEach(car => car.x -= world.scrollSpeed * 1.5);
    
    // Проверка столкновений
    for (const car of cars) {
      if (isColliding(player, car)) {
        gameOver();
        return;
      }
      
      // Подсчет очков за проезд мимо
      if (!car.scored && car.x + car.w < player.x) {
        car.scored = true;
        score += 1;
        scoreEl.textContent = score;
      }
    }

    cars = cars.filter(car => car.x + car.w > -60);
    ensureCarSpawn();

    if (score >= 300 && !gameWon) {
      gameWon = true;
      winLevel2();
    }
  }

  function updateLevel3() {
    // Заглушка для 3 уровня
    obstacles.forEach(obs => obs.x -= world.scrollSpeed);
    obstacles = obstacles.filter(obs => obs.x + obs.w > -60);
    
    if (score >= 500 && !gameWon) {
      gameWon = true;
      winLevel3();
    }
  }

  function isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
  }

  function drawPlayer() {
    const g = ctx;
    const x = player.x, y = player.y, w = player.w, h = player.h;

    if (currentLevel === 1) {
      // Обычный персонаж для 1 уровня
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
    } else if (currentLevel === 2) {
      // Машина для 2 уровня
      if (carImg && carImg.complete) {
        g.drawImage(carImg, x, y, w, h);
      } else {
        g.fillStyle = '#ff6b6b';
        g.fillRect(x, y, w, h);
        g.fillStyle = '#fff';
        g.fillRect(x + 5, y + 5, w - 10, h - 10);
      }
      
      // Добавляем фотографию сверху машины
      if (faceImg && faceImg.complete) {
        g.globalAlpha = 0.8;
        g.drawImage(faceImg, x + w/2 - 20, y - 25, 40, 40);
        g.globalAlpha = 1;
      }
    } else if (currentLevel === 3) {
      // Персонаж для 3 уровня
      g.fillStyle = '#4ecdc4';
      g.fillRect(x, y, w, h);
    }
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

  function drawCar(car) {
    const g = ctx;
    g.fillStyle = '#ff4757';
    g.fillRect(car.x, car.y, car.w, car.h);
    g.fillStyle = '#fff';
    g.fillRect(car.x + 5, car.y + 5, car.w - 10, car.h - 10);
  }

  function drawObstacle(obs) {
    const g = ctx;
    g.fillStyle = '#ffa502';
    g.fillRect(obs.x, obs.y, obs.w, obs.h);
  }

  function draw() {
    ctx.clearRect(0,0,world.width,world.height);

    if (currentLevel === 1) {
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
    } else if (currentLevel === 2) {
      cars.forEach(drawCar);
      drawPlayer();
    } else if (currentLevel === 3) {
      obstacles.forEach(drawObstacle);
      drawPlayer();
    }
  }

  function loop() {
    if (!world.running) return;
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function jump() {
    if (currentLevel === 1 && (player.onGround || player.vy > -0.01)) {
      player.vy = -11.75;
      player.onGround = false;
    }
  }

  function moveLeft() {
    if (currentLevel === 2 || currentLevel === 3) {
      const speed = currentLevel === 2 ? 8 : 20; // Более плавное движение на 2 уровне
      player.x = Math.max(50, player.x - speed);
    }
  }

  function moveRight() {
    if (currentLevel === 2 || currentLevel === 3) {
      const speed = currentLevel === 2 ? 8 : 20; // Более плавное движение на 2 уровне
      player.x = Math.min(world.width - player.w - 50, player.x + speed);
    }
  }

  function moveUp() {
    if (currentLevel === 2 || currentLevel === 3) {
      const speed = currentLevel === 2 ? 8 : 20; // Более плавное движение на 2 уровне
      player.y = Math.max(50, player.y - speed);
    }
  }

  function moveDown() {
    if (currentLevel === 2 || currentLevel === 3) {
      const speed = currentLevel === 2 ? 8 : 20; // Более плавное движение на 2 уровне
      player.y = Math.min(world.height - player.h - 50, player.y + speed);
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
    hideLevelButtons();
  }

  function winLevel1() {
    cancelAnimationFrame(raf);
    world.running = false;
    music.pause();
    statusEl.textContent = 'Уровень 1 пройден! Переходим на 2 уровень?';
    overlay.hidden = false;
    overlay.classList.remove('btn_transtperent');
    level2Btn.style.display = 'inline-block';
  }

  function winLevel2() {
    cancelAnimationFrame(raf);
    world.running = false;
    videoContainer.style.display = 'none';
    backgroundVideo.pause();
    statusEl.textContent = 'Уровень 2 пройден! Переходим на 3 уровень?';
    overlay.hidden = false;
    overlay.classList.remove('btn_transtperent');
    level3Btn.style.display = 'inline-block';
  }

  function winLevel3() {
    cancelAnimationFrame(raf);
    world.running = false;
    statusEl.textContent = 'Все уровни пройдены! Поздравляем!';
    overlay.hidden = false;
    overlay.classList.remove('btn_transtperent');
    hideLevelButtons();
  }

  function hideLevelButtons() {
    level2Btn.style.display = 'none';
    level3Btn.style.display = 'none';
  }

  function start() {
    reset();
    overlay.hidden = true;
    world.running = true;
    cancelAnimationFrame(raf);
    overlay.classList.add('btn_transtperent');
    loop();
  }

  function startLevel2() {
    currentLevel = 2;
    player.x = 160;
    player.y = world.height - 150; // Позиция для машины
    player.w = 60;
    player.h = 40;
    videoContainer.style.display = 'block';
    backgroundVideo.muted = false; // Включаем звук
    backgroundVideo.play();
    start();
  }

  function startLevel3() {
    currentLevel = 3;
    player.x = 160;
    player.y = world.height - 150;
    player.w = 30;
    player.h = 30;
    start();
  }

  // Управление
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      jump();
    } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      e.preventDefault();
      keys.a = true;
      keys.ArrowLeft = true;
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      e.preventDefault();
      keys.d = true;
      keys.ArrowRight = true;
    } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      e.preventDefault();
      keys.w = true;
      keys.ArrowUp = true;
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      e.preventDefault();
      keys.s = true;
      keys.ArrowDown = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
      keys.a = false;
      keys.ArrowLeft = false;
    } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
      keys.d = false;
      keys.ArrowRight = false;
    } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      keys.w = false;
      keys.ArrowUp = false;
    } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
      keys.s = false;
      keys.ArrowDown = false;
    }
  });

  window.addEventListener('pointerdown', () => {
    jump();
  });

  startBtn.addEventListener('click', start);
  level2Btn.addEventListener('click', startLevel2);
  level3Btn.addEventListener('click', startLevel3);
  
  // Скрытая кнопка для быстрого перехода на 2 уровень
  hiddenLevel2Btn.addEventListener('click', () => {
    if (currentLevel === 1) {
      startLevel2();
    }
  });
  
  // Эффект при наведении на скрытую кнопку
  hiddenLevel2Btn.addEventListener('mouseenter', () => {
    hiddenLevel2Btn.style.opacity = '0.3';
  });
  
  hiddenLevel2Btn.addEventListener('mouseleave', () => {
    hiddenLevel2Btn.style.opacity = '0.1';
  });
  
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  statusEl.textContent = 'Готов?';
  overlay.hidden = false;
})();