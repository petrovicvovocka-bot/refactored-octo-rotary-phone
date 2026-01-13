import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 3000 });

/* ===== CARDS ===== */
const suits = ["♠","♥","♦","♣"];
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

/* ===== GAME STATE ===== */
const room = {
  players: [],
  deck: [],
  hands: {},
  trump: null,
  table: { attack:null, defense:null },
  phase: "wait", // wait | attack | defense
  attacker: null,
  defender: null
};

/* ===== HELPERS ===== */
function send(ws, data){ ws.send(JSON.stringify(data)); }
function broadcast(data){ room.players.forEach(p=>send(p,data)); }
function refill(){
  for(const p of room.players){
    const h = room.hands[p.pid];
    while(h.length < 6 && room.deck.length){
      h.push(room.deck.shift());
    }
  }
}
function sendState(){
  broadcast({
    type:"state",
    hands: room.hands,
    trump: room.trump,
    phase: room.phase,
    attacker: room.attacker,
    defender: room.defender,
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
      if(room.players.length>=2) return;

      room.players.push(ws);
      room.hands[ws.pid]=[];

      if(room.players.length===2){
        room.deck = createDeck();
        room.trump = room.deck[room.deck.length-1].suit;

        room.players.forEach(p=>{
          room.hands[p.pid] = room.deck.splice(0,6);
        });

        room.attacker = room.players[0].pid;
        room.defender = room.players[1].pid;
        room.phase = "attack";

        sendState();
      }
    }

    /* ===== ATTACK ===== */
    if(msg.type==="attack"){
      if(room.phase!=="attack") return;
      if(ws.pid!==room.attacker) return;
      if(room.table.attack) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      room.table.attack = h.splice(i,1)[0];
      room.phase = "defense";

      sendState();
    }

    /* ===== DEFEND ===== */
    if(msg.type==="defend"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.defender) return;
      if(!room.table.attack || room.table.defense) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      const def = h[i];
      if(!canBeat(room.table.attack, def, room.trump)) return;

      room.table.defense = h.splice(i,1)[0];

      sendState();
    }

    /* ===== BITO ===== */
    if(msg.type==="bito"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.defender) return;
      if(!room.table.attack || !room.table.defense) return;

      room.table = { attack:null, defense:null };
      refill();

      // 🔁 меняем роли
      const oldAttacker = room.attacker;
      room.attacker = room.defender;
      room.defender = oldAttacker;

      room.phase = "attack";
      sendState();
    }

    /* ===== TAKE ===== */
    if(msg.type==="take"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.defender) return;
      if(!room.table.attack) return;

      const h = room.hands[ws.pid];
      h.push(room.table.attack);
      if(room.table.defense) h.push(room.table.defense);

      room.table = { attack:null, defense:null };
      refill();

      // атакующий остаётся тем же
      room.defender = room.players.find(p=>p.pid!==room.defender).pid;
      room.phase = "attack";

      sendState();
    }
  });
});

console.log("✅ Durak server FINAL (no freezes) running");
