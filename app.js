console.log("STAGE 5 LOADED");

const tg = window.Telegram.WebApp;
tg.ready();

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const rankPower = Object.fromEntries(ranks.map((r, i) => [r, i]));

let deck = [];
let hand = [];
let trumpSuit = null;

let attackCard = null;
let defenseCard = null;
let phase = "idle"; // idle | attack | defense

// ---------- deck ----------
function createDeck() {
  deck = [];
  for (let s of suits) {
    for (let r of ranks) {
      deck.push({ suit: s, rank: r });
    }
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// ---------- game ----------
function deal() {
  createDeck();
  shuffle(deck);

  trumpSuit = deck[deck.length - 1].suit;
  hand = deck.slice(0, 6);

  attackCard = null;
  defenseCard = null;
  phase = "attack";

  document.getElementById("trump").innerText = "Козырь: " + trumpSuit;
  setInfo("Атака: выбери карту");
  render();
}

function setInfo(text) {
  document.getElementById("info").innerText = text;
}

function canBeat(attack, defense) {
  if (defense.suit === attack.suit) {
    return rankPower[defense.rank] > rankPower[attack.rank];
  }
  if (defense.suit === trumpSuit && attack.suit !== trumpSuit) {
    return true;
  }
  return false;
}

// ---------- render ----------
function render() {
  renderHand();
  renderTable();
}

function renderHand() {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  hand.forEach((card, index) => {
    const el = document.createElement("div");
    el.className = "card";
    if (card.suit === trumpSuit) el.classList.add("trump");

    let disabled = false;

    if (phase === "defense" && attackCard) {
      if (!canBeat(attackCard, card)) disabled = true;
    }

    if (disabled) el.classList.add("disabled");

    el.innerText = card.rank + card.suit;

    el.addEventListener("click", () => {
      if (disabled) return;
      onCardClick(index);
    });

    handDiv.appendChild(el);
  });
}

function renderTable() {
  const table = document.getElementById("table");
  table.innerHTML = "";

  if (attackCard) {
    table.appendChild(makeCardEl(attackCard));
  }
  if (defenseCard) {
    table.appendChild(makeCardEl(defenseCard));
  }
}

function makeCardEl(card) {
  const el = document.createElement("div");
  el.className = "card";
  if (card.suit === trumpSuit) el.classList.add("trump");
  el.innerText = card.rank + card.suit;
  return el;
}

// ---------- logic ----------
function onCardClick(index) {
  const card = hand[index];

  if (phase === "attack") {
    attackCard = card;
    hand.splice(index, 1);
    phase = "defense";
    setInfo("Защита: побей карту");
  } else if (phase === "defense") {
    defenseCard = card;
    hand.splice(index, 1);
    phase = "attack";
    setTimeout(endTurn, 700);
  }

  render();
}

function endTurn() {
  attackCard = null;
  defenseCard = null;
  setInfo("Атака: выбери карту");
  render();
}

// ---------- button ----------
document.getElementById("deal").addEventListener("click", deal);
