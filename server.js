import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3000 });
const rooms = new Map();

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["6","7","8","9","10","J","Q","K","A"];
  const deck = [];
  for (let s of suits)
    for (let r of ranks)
      deck.push({ suit: s, rank: r });
  return deck.sort(() => Math.random() - 0.5);
}

wss.on("connection", ws => {

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    // ✅ подключение игрока
    if (data.type === "join") {
      ws.playerId = data.playerId;

      let room = rooms.get("default");
      if (!room) {
        const deck = createDeck();
        room = {
          players: [],
          deck,
          trump: deck[deck.length - 1].suit,
          table: []
        };
        rooms.set("default", room);
      }

      room.players.push(ws);
      ws.room = room;

      console.log("👤 Player joined:", ws.playerId);

      if (room.players.length === 2) {
        room.players.forEach((p, i) => {
          p.send(JSON.stringify({
            type: "start",
            hand: room.deck.splice(0, 6),
            trump: room.trump,
            turn: i === 0
          }));
        });
      }
    }

    // ✅ ход игрока
    if (data.type === "play") {
      ws.room.table.push(data.card);

      ws.room.players.forEach(p => {
        p.send(JSON.stringify({
          type: "update",
          table: ws.room.table,
          lastMoveBy: ws.playerId
        }));
      });
    }
  });
});

console.log("✅ Server with Telegram auth: ws://localhost:3000");
