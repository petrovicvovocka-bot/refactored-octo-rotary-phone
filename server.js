import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 3000 });

const suits = ["♠","♥","♦","♣"];
const ranks = ["6","7","8","9","10","J","Q","K","A"];
const power = Object.fromEntries(ranks.map((r,i)=>[r,i]));

function deck36(){
  const d=[];
  for(const s of suits) for(const r of ranks) d.push({suit:s,rank:r});
  return d.sort(()=>Math.random()-0.5);
}

function canBeat(a,d,tr){
  if(d.suit===a.suit) return power[d.rank]>power[a.rank];
  if(d.suit===tr && a.suit!==tr) return true;
  return false;
}

const room = {
  players: [],
  hands: {},
  deck: [],
  trump: null,
  attack: null,
  defense: null,
  turn: null // pid
};

function broadcast(data){
  room.players.forEach(p=>p.send(JSON.stringify(data)));
}

wss.on("connection", ws=>{
  ws.on("message", raw=>{
    const msg = JSON.parse(raw);

    /* JOIN */
    if(msg.type==="join"){
      ws.pid = msg.playerId;
      if(room.players.length>=2) return;

      room.players.push(ws);
      room.hands[ws.pid]=[];

      if(room.players.length===2){
        room.deck = deck36();
        room.trump = room.deck[room.deck.length-1].suit;

        room.players.forEach(p=>{
          room.hands[p.pid]=room.deck.splice(0,6);
        });

        room.turn = room.players[0].pid;

        broadcast({
          type:"state",
          hands: room.hands,
          trump: room.trump,
          attack: null,
          defense: null,
          turn: room.turn
        });
      }
    }

    /* ATTACK */
    if(msg.type==="attack"){
      if(ws.pid!==room.turn) return;
      if(room.attack) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      room.attack = h.splice(i,1)[0];
      room.turn = room.players.find(p=>p.pid!==ws.pid).pid;

      broadcast({
        type:"state",
        hands: room.hands,
        trump: room.trump,
        attack: room.attack,
        defense: null,
        turn: room.turn
      });
    }

    /* DEFEND */
    if(msg.type==="defend"){
      if(ws.pid!==room.turn) return;
      if(!room.attack || room.defense) return;

      const h = room.hands[ws.pid];
      const i = h.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(i<0) return;

      const d = h[i];
      if(!canBeat(room.attack,d,room.trump)) return;

      room.defense = h.splice(i,1)[0];

      broadcast({
        type:"state",
        hands: room.hands,
        trump: room.trump,
        attack: room.attack,
        defense: room.defense,
        turn: room.turn
      });
    }
  });
});

console.log("✅ Durak CORE server running");
