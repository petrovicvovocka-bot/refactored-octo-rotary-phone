import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 3000 });

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["6","7","8","9","10","J","Q","K","A"];
const power = Object.fromEntries(ranks.map((r,i)=>[r,i]));

function shuffle(a){ return a.sort(()=>Math.random()-0.5); }
function deck36(){
  const d=[];
  for(const s of suits) for(const r of ranks) d.push({suit:s,rank:r});
  return shuffle(d);
}
function canBeat(att, def, trump){
  if(def.suit===att.suit) return power[def.rank]>power[att.rank];
  if(def.suit===trump && att.suit!==trump) return true;
  return false;
}

const room = {
  players: [],
  deck: [],
  hands: {},
  trump: null,
  table: { attack:null, defense:null },
  phase: "wait", // wait | attack | defense
  turn: null
};

function send(ws, data){ ws.send(JSON.stringify(data)); }
function broadcast(data){ room.players.forEach(p=>send(p,data)); }

wss.on("connection", ws=>{
  ws.on("message", raw=>{
    const msg = JSON.parse(raw);

    if(msg.type==="join"){
      ws.pid = msg.playerId;
      if(room.players.length>=2) return;

      room.players.push(ws);

      if(room.players.length===2){
        room.deck = deck36();
        room.trump = room.deck[room.deck.length-1].suit;
        room.hands[room.players[0].pid]=room.deck.splice(0,6);
        room.hands[room.players[1].pid]=room.deck.splice(0,6);
        room.turn = room.players[0].pid;
        room.phase="attack";

        room.players.forEach(p=>{
          send(p,{
            type:"state",
            hand: room.hands[p.pid],
            trump: room.trump,
            phase: room.phase,
            yourTurn: p.pid===room.turn,
            table: room.table
          });
        });
      }
    }

    if(msg.type==="attack"){
      if(room.phase!=="attack") return;
      if(ws.pid!==room.turn) return;

      const hand = room.hands[ws.pid];
      const idx = hand.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(idx<0) return;

      room.table.attack = hand.splice(idx,1)[0];
      room.phase="defense";
      room.turn = room.players.find(p=>p.pid!==ws.pid).pid;

      broadcast({ type:"update", table:room.table, phase:room.phase, turn:room.turn });
    }

    if(msg.type==="defend"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.turn) return;

      const hand = room.hands[ws.pid];
      const idx = hand.findIndex(c=>c.rank===msg.card.rank && c.suit===msg.card.suit);
      if(idx<0) return;

      const def = hand[idx];
      if(!canBeat(room.table.attack, def, room.trump)) return;

      room.table.defense = hand.splice(idx,1)[0];
      room.phase="attack";
      room.turn = room.players.find(p=>p.pid!==ws.pid).pid;

      broadcast({ type:"update", table:room.table, phase:room.phase, turn:room.turn });
    }

    if(msg.type==="take"){
      if(room.phase!=="defense") return;
      if(ws.pid!==room.turn) return;

      room.hands[ws.pid].push(room.table.attack);
      if(room.table.defense) room.hands[ws.pid].push(room.table.defense);

      room.table={attack:null, defense:null};
      room.phase="attack";
      room.turn = room.players.find(p=>p.pid!==ws.pid).pid;

      broadcast({ type:"update", table:room.table, phase:room.phase, turn:room.turn });
    }
  });
});

console.log("✅ Durak server 6.3 running");
