import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
  port: process.env.PORT || 3000
});

/* ===== Карты ===== */
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6","7","8","9","10","J","Q","K","A"];
const power = Object.fromEntries(ranks.map((r,i)=>[r,i]));

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function createDeck() {
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ suit: s, rank: r });
    }
  }
  return shuffle(deck);
}

function canBeat(attack, defense, trump) {
  if (defense.suit === attack.suit) {
    return power[defense.rank] > power[attack.rank];
  }
  if (defense.suit === trump && attack.suit !== trump) {
    return true;
  }
  return false;
}

/* ===== Комната (1 матч) ===== */
const room = {
  players: [],
  deck: [],
  hands: {},
  trump: null,
  table: { attack: null, defense: null },
  phase: "wait", // wait | attack | defense
  turn: null
};

/* ===== Утилиты ===== */
function send(ws, data) {
  ws.send(JSON.stringify(data));
}

function broadcast(data) {
  room.players.forEach(p => send(p, data));
}

function sendState(ws) {
  send(ws, {
    type: "state",
    hand: room.hands[ws.pid],
    trump: room.trump,
    phase: room.phase,
    yourTurn: ws.pid === room.turn,
    table: room.table
  });
}

function refillHands() {
  for (const p of room.players) {
    const hand = room.hands[p.pid];
    while (hand.length < 6 && room.deck.length > 0) {
      hand.push(room.deck.shift());
    }
  }
}

/* ===== WebSocket ===== */
wss.on("connection", ws => {

  ws.on("message", raw => {
    const msg = JSON.parse(raw);

    /* ===== Подключение ===== */
    if (msg.type === "join") {
      ws.pid = msg.playerId;

      if (room.players.find(p => p.pid === ws.pid)) return;
      if (room.players.length >= 2) return;

      room.players.push(ws);
      room.hands[ws.pid] = [];

      console.log("Player joined:", ws.pid);

      /* ===== Когда подключились ДВА игрока ===== */
      if (room.players.length === 2) {
        room.deck = createDeck();
        room.trump = room.deck[room.deck.length - 1].suit;

        room.hands[room.players[0].pid] = room.deck.splice(0, 6);
        room.hands[room.players[1].pid] = room.deck.splice(0, 6);

        room.turn = room.players[0].pid;
        room.phase = "attack";

        /* ✅ КЛЮЧЕВОЙ ФИКС */
        setTimeout(() => {
          room.players.forEach(p => sendState(p));
        }, 200);
      }
    }

    /* ===== Атака ===== */
    if (msg.type === "attack") {
      if (room.phase !== "attack") return;
      if (ws.pid !== room.turn) return;

      const hand = room.hands[ws.pid];
      const idx = hand.findIndex(
        c => c.rank === msg.card.rank && c.suit === msg.card.suit
      );
      if (idx < 0) return;

      room.table.attack = hand.splice(idx, 1)[0];
      room.phase = "defense";
      room.turn = room.players.find(p => p.pid !== ws.pid).pid;

      broadcast({
        type: "update",
        table: room.table,
        phase: room.phase,
        turn: room.turn
      });
    }

    /* ===== Защита ===== */
    if (msg.type === "defend") {
      if (room.phase !== "defense") return;
      if (ws.pid !== room.turn) return;

      const hand = room.hands[ws.pid];
      const idx = hand.findIndex(
        c => c.rank === msg.card.rank && c.suit === msg.card.suit
      );
      if (idx < 0) return;

      const defense = hand[idx];
      if (!canBeat(room.table.attack, defense, room.trump)) return;

      room.table.defense = hand.splice(idx, 1)[0];

      broadcast({
        type: "update",
        table: room.table
      });
    }

    /* ===== Бито ===== */
    if (msg.type === "bito") {
      if (room.phase !== "defense") return;

      room.table = { attack: null, defense: null };
      refillHands();

      room.phase = "attack";
      room.turn = room.players.find(p => p.pid !== ws.pid).pid;

      room.players.forEach(p => sendState(p));
    }

    /* ===== Забрать ===== */
    if (msg.type === "take") {
      if (room.phase !== "defense") return;
      if (ws.pid !== room.turn) return;

      const hand = room.hands[ws.pid];
      if (room.table.attack) hand.push(room.table.attack);
      if (room.table.defense) hand.push(room.table.defense);

      room.table = { attack: null, defense: null };
      refillHands();

      room.phase = "attack";
      room.turn = room.players.find(p => p.pid !== ws.pid).pid;

      room.players.forEach(p => sendState(p));
    }
  });
});

console.log("✅ Durak server 6.4 (stable) running");
