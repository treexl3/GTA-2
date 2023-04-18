import { Player } from "./player.js";
import { Projectile } from "./projectile.js";
import { Enemy } from "./enemy.js";
import { distanceBetweenTwoPoints } from "./utilities.js";

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

const wrapper = document.querySelector('.wrapper');
const scoreElem = document.getElementById('score');
const timeElem = document.getElementById('time');
const gamePopup = document.getElementById('game');
const pausePopup = document.getElementById('pause');
const pauseLink = document.getElementById('pause-link');
const wastedSound = document.querySelector('.wasted-sound');
const bulletSound = document.querySelector('.bullet-sound');

let player;
let projectiles = [];
let enemies = [];
let particles = [];
let score = 0;
let animationId;
let countIntervalId;
let spawnIntervalId;
let flag = false;
let countdown;

document.addEventListener("click", documentActions);

function documentActions(e) {
  const targetElement = e.target;
  if (targetElement.classList.contains('buttons-popup__btn_agree') || targetElement.closest('.buttons-popup__btn_agree')) {
    localStorage.setItem('popupShown', true);
    startGame();
    cancelAnimationFrame(animationId);
    popupClose(gamePopup);
    flag = true;
    setTimeout(() => {
      const gamePopupAgreeButton = gamePopup.querySelector('.buttons-popup__btn_github');
      gamePopupAgreeButton.classList.remove('buttons-popup__btn_agree');
      gamePopupAgreeButton.innerHTML = '<a href="https://github.com/treexl3">Github</a>'
      gamePopup.querySelector('.buttons-popup__btn_disagree').remove();
    }, 400);
  }
  if (targetElement.classList.contains('buttons-popup__btn_disagree') || targetElement.closest('.buttons-popup__btn_disagree')) {
    localStorage.setItem('popupShown', false);
    popupClose(gamePopup);
  }
  if (targetElement.classList.contains('pause-buttons-popup__btn_resume') || targetElement.closest('.pause-buttons-popup__btn_resume')) {
    popupClose(pausePopup);
  }
  if (targetElement.classList.contains('pause-buttons-popup__btn_restart') || targetElement.closest('.pause-buttons-popup__btn_restart') ||
    targetElement.classList.contains('play-again') || targetElement.closest('.play-again')) {
    popupClose(pausePopup);
    restartGame()
    wrapper.classList.remove('game-over');
    scoreElem.innerHTML = '0';
  }
}

if (localStorage.getItem('popupShown') === 'true') {
  startGame();
  setTimeout(() => {
    const gamePopupAgreeButton = gamePopup.querySelector('.buttons-popup__btn_github');
    gamePopupAgreeButton.classList.remove('buttons-popup__btn_agree');
    gamePopupAgreeButton.innerHTML = '<a href="https://github.com/treexl3">Github</a>'
    gamePopup.querySelector('.buttons-popup__btn_disagree').remove();
  }, 400);
}

function startGame() {
  init();
  animate();
  spawnEnemies();
  timer();
}

function restartGame() {
  // resets all of the initial variables
  player = null;
  projectiles = [];
  enemies = [];
  particles = [];
  score = 0;
  flag = false;
  clearInterval(countIntervalId);
  clearInterval(spawnIntervalId);
  clearInterval(countdown);
  timeElem.innerHTML = 0;
  cancelAnimationFrame(animationId);
  wastedSound.pause();
  wastedSound.currentTime = 0;

  // Finally start the game again
  startGame();
}

function init() {
  const movementLimits = {
    minX: 0,
    maxX: canvas.width,
    minY: 0,
    maxY: canvas.height,
  }
  player = new Player(canvas.width / 2, canvas.height / 2, context, movementLimits);
  addEventListener('mousedown', createProjectile);
}

function createProjectile(e) {
  projectiles.push(
    new Projectile(
      player.x,
      player.y,
      e.clientX,
      e.clientY,
      context
    )
  );
}

function spawnEnemies() {
  let countOfSpawnEnemies = 1;

  countIntervalId = setInterval(() => countOfSpawnEnemies++, 25000);
  spawnIntervalId = setInterval(() => spawnCountEnemies(countOfSpawnEnemies), 1000);
  spawnCountEnemies(countOfSpawnEnemies);
}

function spawnCountEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push(new Enemy(canvas.width, canvas.height, context, player));
  }
}

function animate() {
  pauseLink.innerHTML = '❚ ❚';
  animationId = requestAnimationFrame(animate);
  context.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(particle => particle.alpha > 0);
  projectiles = projectiles.filter(projectileInsideWindow)
  enemies.forEach(enemy => checkHittingEnemy(enemy));
  enemies = enemies.filter(enemy => enemy.health > 0);
  const isGameOver = enemies.some(checkHittingPlayer);
  if (isGameOver) {
    wrapper.classList.add('game-over');
    wastedSound.play();
    pauseLink.innerHTML = '►';
    clearInterval(countIntervalId);
    clearInterval(spawnIntervalId);
    clearInterval(countdown);
    cancelAnimationFrame(animationId);
  }

  particles.forEach(particle => particle.update())
  projectiles.forEach(projectile => projectile.update())
  if (!player) return;
  player.update();
  enemies.forEach(enemy => enemy.update());
}

function projectileInsideWindow(projectile) {
  return projectile.x + projectile.radius > 0 &&
    projectile.x - projectile.radius < canvas.width &&
    projectile.y + projectile.radius > 0 &&
    projectile.y - projectile.radius < canvas.height;
}

function checkHittingPlayer(enemy) {
  const distance = distanceBetweenTwoPoints(player.x, player.y, enemy.x, enemy.y);
  return distance - enemy.radius - player.radius < 0;
}

function checkHittingEnemy(enemy) {
  projectiles.some((projectile, index) => {
    const distance = distanceBetweenTwoPoints(projectile.x, projectile.y, enemy.x, enemy.y);
    if (distance - enemy.radius - projectile.radius > 0) return false;

    removeProjectileByIndex(index);
    enemy.health--;
    bulletSound.play();

    if (enemy.health < 1) {
      increaseScore(enemy);
      enemy.createExplosion(particles);
    }

    return true;
  });
}

function removeProjectileByIndex(index) {
  projectiles.splice(index, 1);
}

function increaseScore(enemy) {
  if (enemy.enemyType == 3) {
    score += 750;
  } else if (enemy.enemyType == 2) {
    score += 500;
  } else {
    score += 250;
  }
  scoreElem.innerHTML = score;
}

function timer() {
  clearInterval(countdown);

  let elapsedSeconds = 0;

  countdown = setInterval(() => {
    elapsedSeconds++;
    displaySecondsLeft(elapsedSeconds);
  }, 1000)
}

function displaySecondsLeft(seconds, stopInterval = true) {
  const hours = Math.floor(seconds / 3600);
  const remainder = seconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const remainderSeconds = seconds % 60;
  const display = `${minutes < 10 ? '0' : ''}${minutes}:${remainderSeconds < 10 ? '0' : ''}${remainderSeconds}`;

  timeElem.innerHTML = display;
}

/* POPUP */
const popupLinks = document.querySelectorAll('.popup-link');
const body = document.querySelector('body');
const lockPadding = document.querySelectorAll(".lock-padding");

let unlock = true;

const timeout = 400;

if (!localStorage.getItem('popupShown')) {
  popupOpen(gamePopup);
} else if (localStorage.getItem('popupShown') === 'false') {
  popupOpen(gamePopup);
}

if (popupLinks.length > 0) {
  for (let index = 0; index < popupLinks.length; index++) {
    const popupLink = popupLinks[index];
    popupLink.addEventListener("click", function (e) {
      const popupName = popupLink.getAttribute('href').replace('#', '');
      const curentPopup = document.getElementById(popupName);
      popupOpen(curentPopup);
      e.preventDefault();
    });
  }
}
const popupCloseIcon = document.querySelectorAll('.close-popup');
if (popupCloseIcon.length > 0) {
  for (let index = 0; index < popupCloseIcon.length; index++) {
    const el = popupCloseIcon[index];
    el.addEventListener('click', function (event) {
      popupClose(el.closest('.popup'));
      event.preventDefault();
    });
  }
}

function popupOpen(curentPopup) {
  if (curentPopup && unlock) {
    const popupActive = document.querySelector('.popup.open');
    if (popupActive) {
      popupClose(popupActive, false);
    } else {
      bodyLock();
    }
    curentPopup.classList.add('open');
    curentPopup.addEventListener("click", function (event) {
      if (!event.target.closest('.popup__content')) {
        popupClose(event.target.closest('.popup'));
      }
    });
  }
  if (curentPopup.classList.contains('open')) {
    cancelAnimationFrame(animationId);
    pauseLink.innerHTML = '►';
  }
}

function popupClose(popupActive, doUnlock = true) {
  if (popupActive.classList.contains('open')) {
    animationId = requestAnimationFrame(animate);
    context.clearRect(0, 0, canvas.width, canvas.height);
    pauseLink.innerHTML = '❚ ❚';
  }
  if (unlock) {
    popupActive.classList.remove('open');
    if (doUnlock) {
      bodyUnLock();
    }
  }
}

function bodyLock() {
  const lockPaddingValue = window.innerWidth - document.querySelector('.wrapper').offsetWidth + 'px';

  if (lockPadding.length > 0) {
    for (let index = 0; index < lockPadding.length; index++) {
      const el = lockPadding[index];
      el.style.paddingRight = lockPaddingValue;
    }
  }
  body.style.paddingRight = lockPaddingValue;
  body.classList.add('lock');

  unlock = false;
  setTimeout(function () {
    unlock = true;
  }, timeout);
}

function bodyUnLock() {
  setTimeout(function () {
    if (lockPadding.length > 0) {
      for (let index = 0; index < lockPadding.length; index++) {
        const el = lockPadding[index];
        el.style.paddingRight = '0px';
      }
    }
    body.style.paddingRight = '0px';
    body.classList.remove('lock');
  }, timeout);


  unlock = false;
  setTimeout(function () {
    unlock = true;
  }, timeout);
}

document.addEventListener('keydown', function (event) {
  if (event.code === "Escape") {
    const popupActive = document.querySelector('.popup.open');
    popupClose(popupActive);
  }
});

(function () {
  // Перевіряємо підтримку
  if (!Element.prototype.closest) {
    // Реалізуємо
    Element.prototype.closest = function (css) {
      var node = this;
      while (node) {
        if (node.matches(css)) return node;
        else node = node.parentElement;
      }
      return null;
    };
  }
})();
(function () {
  // Перевіряємо підтримку
  if (!Element.prototype.matches) {
    // Оприділяємо властивість
    Element.prototype.matches = Element.prototype.matchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector;
  }
})();
