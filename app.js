console.log("STAGE 3 LOADED");

const tg = window.Telegram.WebApp;
tg.ready();

// Масти и значения
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];

let deck = [];
let hand = [];
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

// Раздача + определение козыря
function dealCards() {
  createDeck();
  shuffle(deck);

  trumpSuit = deck[deck.length - 1].suit;
  document.getElementById("trump").innerText =
    "Козырь: " + trumpSuit;

  hand = deck.slice(0, 6);
  renderHand();
}

// Отрисовка руки
function renderHand() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  hand.forEach(card => {
    const el = document.createElement("div");
    el.className = "card";

    if (card.suit === trumpSuit) {
      el.classList.add("trump");
    }

    el.innerText = card.rank + card.suit;
    handDiv.appendChild(el);
  });
}

// Кнопка
document.getElementById("deal").onclick = dealCards;
