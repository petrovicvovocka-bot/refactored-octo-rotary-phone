import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 3000 });

/* ===== CARDS ===== */
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6","7","8","9","10","J","Q","K","A"];
const power = Object.fromEntries(ranks.map((r,i)=>[r,i]));

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
function createDeck(){
  const d=[];
  for(const s of suits) for(const r of ranks) d.push({suit:s,rank:r});
  return shuffle(d);
}
function canBeat(att, def, trump){
  if(def.suit===att.suit) return power[def.rank]>power[att.rank];
  if(def.suit===trump && att.suit!==trump) return true;
  return false;
}

/* ===== GAME STATE (1 ROOM MVP) ===== */
const room = {
  players: [],
  deck: [],
  hands: {},
  trump: null,
  table: { attack:null, defense:null },
  phase: "wait", // wait | attack | defense
  turn: null
};

/* ===== HELPERS ===== */
function send(ws, data){
  ws.send(JSON.stringify(data));
}
function broadcast(data){
  room.players.forEach(p=>send(p,data));
}
function otherPlayer(pid){
  return room.players.find(p=>p.pid!==pid)?.pid;
}
function refill(){
  for(const p of room.players){
    const h = room.hands[p.pid];
    while(h.length < 6 && room.deck.length){
      h.push(room.deck.shift());
    }
  }
}
function sendState(ws){
  send(ws,{
    type:"state",
    hand: room.hands[ws.pid],
    trump: room.trump,
    phase: room.phase,
    yourTurn: ws.pid===room.turn,
    table: room.table
  });
}

/* ===== WEBSOCKET ===== */
wss.on("connection", ws => {

  ws.on("message", raw => {
    const msg = JSON.parse(raw);

    /* ===== JOIN ===== */
    if(msg.type==="join"){
      ws.pid = msg.playerId;
      if(room.players.length >= 2) return;

      room.players.push(ws);
      room.hands[ws.pid] = [];

      if(room.players.length === 2){
        room.deck = createDeck();
        room.trump = room.deck[room.deck.length - 1].suit;

        room.players.forEach(p=>{
          room.hands[p.pid] = room.deck.splice(0,6);
        });

        room.phase = "attack";
        room.turn = room.players[0].pid;

        room.players.forEach(p=>sendState(p));
      }
    }

    /* ===== ATTACK ===== */
    if(msg.type==="attack"){
      if(room.phase!=="attack") return;
      if(ws.pid!==room.turn) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      room.table.attack = h.splice(i,1)[0];
      room.table.defense = null;

      room.phase = "defense";
      room.turn = otherPlayer(ws.pid);

      broadcast({
        type:"state",
        table:room.table,
        phase:room.phase,
        turn:room.turn
      });
    }

    /* ===== DEFEND ===== */
    if(msg.type==="defend"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.turn) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      const def = h[i];
      if(!canBeat(room.table.attack, def, room.trump)) return;

      room.table.defense = h.splice(i,1)[0];

      broadcast({
        type:"state",
        table:room.table,
        phase:room.phase,
        turn:room.turn
      });
    }

    /* ===== BITO ===== */
    if(msg.type==="bito"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.turn) return;

      room.table = { attack:null, defense:null };
      refill();

      room.phase = "attack";
      room.turn = otherPlayer(ws.pid);

      room.players.forEach(p=>sendState(p));
    }

    /* ===== TAKE ===== */
    if(msg.type==="take"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.turn) return;

      const h = room.hands[ws.pid];
      if(room.table.attack) h.push(room.table.attack);
      if(room.table.defense) h.push(room.table.defense);

      room.table = { attack:null, defense:null };
      refill();

      room.phase = "attack";
      room.turn = otherPlayer(ws.pid);

      room.players.forEach(p=>sendState(p));
    }
  });
});

console.log("✅ Durak server (stable) running");
