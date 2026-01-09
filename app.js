console.log("STAGE 4 LOADED");

const tg = window.Telegram.WebApp;
tg.ready();

// Масти и значения
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

let deck = [];
let hand = [];
let table = [];
let trumpSuit = null;

// Создание колоды
function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
}

// Перемешивание
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Раздача + козырь
function dealCards() {
  createDeck();
  shuffle(deck);

  trumpSuit = deck[deck.length - 1].suit;
  document.getElementById("trump").innerText =
    "Козырь: " + trumpSuit;

  hand = deck.slice(0, 6);
  table = [];
  render();
}

// Отрисовка всего
function render() {
  renderHand();
  renderTable();
}

// Отрисовка руки
function renderHand() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  hand.forEach((card, index) => {
    const el = document.createElement("div");
    el.className = "card";

    if (card.suit === trumpSuit) {
      el.classList.add("trump");
    }

    el.innerText = card.rank + card.suit;
    el.onclick = () => playCard(index);

    handDiv.appendChild(el);
  });
}

// Отрисовка стола
function renderTable() {
  const tableDiv = document.getElementById("table");
  tableDiv.innerHTML = "";

  table.forEach(card => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerText = card.rank + card.suit;
    tableDiv.appendChild(el);
  });
}

// Ход картой
function playCard(index) {
  const card = hand.splice(index, 1)[0];
  table.push(card);
  render();
}

// Кнопка
document.getElementById("deal").onclick = dealCards;
