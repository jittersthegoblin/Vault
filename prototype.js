(() => {
'use strict';
const KEY='vaultPrototype4';
const ROOM=['single_bedroom','dining_room','power_generator','water_extractor','underground_garden','medical_room','washroom','arcade_room','gym','radio_room','science_lab',null,null,null,null];
const ROOM_INFO={
 single_bedroom:['Single Bedroom','One settler sleeps here at a time. Sleep restores energy fastest and repairs health.'],
 dining_room:['Dining Room','The chef turns crops + water into meals. Settlers come here to eat, drink, chat, and take short breaks.'],
 power_generator:['Power Generator','Creates power. If power gets critically low, the engineer comes over to repair the system.'],
 water_extractor:['Water Extractor','Creates water for drinking, cooking, and showers.'],
 underground_garden:['Underground Garden','Creates crops for the chef.'],
 medical_room:['Medical Room','The nurse creates Health Points. Sick or hurt settlers come here for treatment.'],
 washroom:['Washroom','Showers spend water, restore hygiene, and help keep health steady.'],
 arcade_room:['Arcade / Common Lounge','Recreation restores happiness and a little energy. Until a dedicated common-room asset exists, this also serves as the shared lounge.'],
 gym:['Gym','The trainer does not generate resources. He coaches other settlers here; training raises stamina but is tiring.'],
 radio_room:['Radio Room','Creates Info Points for research.'],
 science_lab:['Science Lab','Turns Info into Upgrade Points for room improvements.']
};
const DEF=[
 [1,'Gardener','underground_garden','garden_work'],[2,'Power Technician','power_generator','repair_generator'],
 [3,'Engineer',null,'idle'],[4,'Water Technician','water_extractor','operate_valve'],[5,'Nurse','medical_room','medical_kit'],
 [6,'Fitness Trainer',null,'idle'],[7,'Sanitation Specialist','washroom','clean_spill'],[8,'Chef','dining_room','cook_pot'],
 [9,'Radio Operator','radio_room','operate_radio_console'],[10,'Scientist','science_lab','analyze_tablet']
];
const RM={power:['⚡','Power'],water:['💧','Water'],crops:['🌱','Crops'],meals:['🍲','Meals'],med:['🩺','Health pts'],info:['📻','Info'],tech:['🔬','Upgrade pts'],parts:['🔧','Parts']};
let S, selected=null, last=performance.now(), renderTimer=0;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rnd=(a,b)=>a+Math.random()*(b-a);
function fresh(){
 const state={v:4,speed:1,time:0,res:{power:65,water:70,crops:55,meals:22,med:7,info:0,tech:8,parts:70},rooms:ROOM.map((t,i)=>t?{type:t,slot:i,level:1}:null),people:[],nextTraining:38,nextMaintenance:24,log:[{t:0,text:'All ten settlers found this forgotten shelter together.'},{t:0,text:'There is only one bedroom, so tired settlers take turns sleeping.'},{t:0,text:'The bunker now has off-duty time: people chat, wander, take breaks, and visit the rooms they actually need.'}],saved:Date.now()};
 state.people=DEF.map((d,i)=>({id:d[0],role:d[1],job:d[2],jobPose:d[3],name:`Settler ${String(d[0]).padStart(2,'0')}`,energy:48+(i*7)%35,maxEnergy:100,hunger:65+(i*5)%24,thirst:67+(i*7)%23,health:100,hygiene:58+(i*6)%34,happy:72,level:1,sick:false,hurt:false,action:[3,6].includes(d[0])?'idle':'work',until:0,slot:0,reserved:null,targetAction:null,targetDuration:0,targetSlot:null,nextBreak:18+i*4+Math.random()*12,nextShuffle:3+Math.random()*6,dx:0,dy:0}));
 return state;
}
function load(){try{S=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{S=fresh()}if(S.v!==4)S=fresh();S.people.forEach(p=>p.slot=homeSlot(p));offline()}
function save(){S.saved=Date.now();localStorage.setItem(KEY,JSON.stringify(S))}
function offline(){let sec=Math.min((Date.now()-(S.saved||Date.now()))/1000,14400);if(sec<20)return;let f=sec*.03;S.res.power+=f;S.res.water+=f*.8;S.res.crops+=f*.65;S.res.parts+=f*.10;S.res.med+=f*.07;S.res.info+=f*.06;note('The shelter quietly kept producing resources while you were away. Needs do not worsen offline.')}
function init(){load();buildGrid();buildPeople();bind();draw();requestAnimationFrame(loop);setInterval(save,5000)}
function buildGrid(){let g=$('#bunkerGrid');g.innerHTML='';for(let i=0;i<15;i++){let r=S.rooms[i],e=document.createElement('div');e.className=`slot ${r?r.type:'empty-slot'}`;e.dataset.slot=i;if(r)e.innerHTML=`<img class="room-art"><span class="room-level">${r.level}</span><span class="room-name">${ROOM_INFO[r.type][0]}</span>`;e.onclick=()=>{selected={kind:r?'room':'empty',id:i};drawDetail();mark()};g.append(e)}}
function buildPeople(){let l=$('#settlerLayer');l.innerHTML='';S.people.forEach(p=>{let i=document.createElement('img');i.className='settler-sprite';i.dataset.id=p.id;i.onclick=e=>{e.stopPropagation();selected={kind:'person',id:p.id};drawDetail();mark()};l.append(i)})}
function bind(){$$('.speed').forEach(b=>b.onclick=()=>{S.speed=+b.dataset.speed;$$('.speed').forEach(x=>x.classList.toggle('active',x===b))});$('#resetGame').onclick=()=>{if(confirm('Reset the prototype?')){localStorage.removeItem(KEY);S=fresh();S.people.forEach(p=>p.slot=homeSlot(p));selected=null;buildGrid();buildPeople();draw()}}}
function loop(n){let dt=Math.min((n-last)/1000,.4)*S.speed;last=n;S.time+=dt;step(dt);renderTimer+=dt;if(renderTimer>.18){renderTimer=0;draw()}requestAnimationFrame(loop)}
function room(type){return S.rooms.find(r=>r&&r.type===type)}
function homeSlot(p){if([3,6].includes(p.id))return room('arcade_room')?.slot??0;return p.job?room(p.job)?.slot??0:0}
function bonus(type){let r=room(type);return 1+((r?.level||1)-1)*.2}
function freeBed(){return S.rooms.find(r=>r?.type==='single_bedroom'&&!S.people.some(p=>(p.action==='sleep'||(p.action==='walking'&&p.targetAction==='sleep'))&&p.reserved===r.slot))}
function countAt(type){let r=room(type);return r?S.people.filter(p=>p.slot===r.slot&&!['work','idle'].includes(p.action)).length:99}
function efficiency(p){let e=1;if(p.energy<25)e*=.55;if(p.hunger<25)e*=.7;if(p.thirst<25)e*=.65;if(p.hygiene<25)e*=.8;if(p.health<60)e*=.65;if(p.sick||p.hurt)e*=.55;return e}
function urgent(p){return p.energy<38||p.hunger<42||p.thirst<42||p.hygiene<38||p.health<60||p.sick||p.hurt}
function canBreak(p){if(urgent(p))return false;if(p.id===1&&S.res.crops<12)return false;if(p.id===2&&S.res.power<22)return false;if(p.id===4&&S.res.water<14)return false;if(p.id===5&&S.res.med<4)return false;if(p.id===8&&S.res.meals<7)return false;return true}
function step(dt){let powered=S.res.power>.05;S.res.power=Math.max(0,S.res.power-S.rooms.filter(Boolean).length*.025*dt);
 for(let p of S.people){
  if(p.action==='work'){p.energy-=.09*dt;p.hunger-=.026*dt;p.thirst-=.034*dt;p.hygiene-=.018*dt}
  if(p.action==='idle'){p.energy+=.045*dt;p.hunger-=.012*dt;p.thirst-=.016*dt;p.hygiene-=.006*dt;p.happy+=.035*dt}
  if(p.action==='walking'){p.energy-=.035*dt;p.thirst-=.009*dt}
  if(p.action==='sleep'){p.energy+=2.3*bonus('single_bedroom')*dt;p.health+=.22*dt}
  if(p.action==='arcade'||p.action==='hangout'){p.energy+=.22*dt;p.happy+=.80*dt}
  if(p.action==='training'){p.energy-=1.1*dt;p.thirst-=.08*dt}
  if(p.action==='coach'){p.energy-=.035*dt;p.happy+=.05*dt}
  if(p.action==='repair'||p.action==='maintenance'){p.energy-=.18*dt;p.thirst-=.035*dt}
  if(['eat','drink','shower','medical'].includes(p.action))p.energy-=.01*dt;
  if(p.hygiene<25)p.health-=.015*dt;if(p.hunger<12)p.health-=.01*dt;if(p.thirst<12)p.health-=.02*dt;if(p.energy<7)p.health-=.008*dt;
  p.energy=clamp(p.energy,0,p.maxEnergy);p.hunger=clamp(p.hunger,0,100);p.thirst=clamp(p.thirst,0,100);p.health=clamp(p.health,15,100);p.hygiene=clamp(p.hygiene,0,100);p.happy=clamp(p.happy,0,100);
  if(p.action!=='walking'&&S.time>=(p.nextShuffle||0)){p.dx=rnd(-.12,.12);p.dy=rnd(-.025,.025);p.nextShuffle=S.time+rnd(3,8)}
  if(!['work','idle'].includes(p.action)&&S.time>=p.until)finish(p);
 }
 for(let p of S.people.filter(x=>x.action==='work')){let e=efficiency(p)*(powered||p.id===2?1:.3);if(p.id===1)S.res.crops+=.30*e*bonus('underground_garden')*dt;if(p.id===2)S.res.power+=.62*e*bonus('power_generator')*dt;if(p.id===4)S.res.water+=.40*e*bonus('water_extractor')*dt;if(p.id===5)S.res.med+=.05*e*bonus('medical_room')*dt;if(p.id===8){let a=Math.min(.11*e*bonus('dining_room')*dt,S.res.crops/1.5,S.res.water/.8);S.res.crops-=a*1.5;S.res.water-=a*.8;S.res.meals+=a}if(p.id===9)S.res.info+=.055*e*bonus('radio_room')*dt;if(p.id===10){let a=Math.min(.045*e*bonus('science_lab')*dt,S.res.info);S.res.info-=a;S.res.tech+=a*.7}}
 engineerRoutine();trainerRoutine();
 Object.keys(S.res).forEach(k=>S.res[k]=clamp(S.res[k],0,999));
 S.people.filter(p=>['work','idle'].includes(p.action)).forEach(p=>{needs(p);if(['work','idle'].includes(p.action))social(p)});
}
function needs(p){
 if((p.sick||p.hurt||p.health<55)&&S.res.med>=4&&countAt('medical_room')<2){S.res.med-=4;go(p,'medical','medical_room',9);return}
 if(p.hygiene<34&&S.res.water>=2&&countAt('washroom')<2){S.res.water-=2;go(p,'shower','washroom',8);return}
 if(p.hunger<38&&S.res.meals>=1&&countAt('dining_room')<3){S.res.meals-=1;go(p,'eat','dining_room',5);return}
 if(p.thirst<34&&S.res.water>=.5&&countAt('dining_room')<3){S.res.water-=.5;go(p,'drink','dining_room',3);return}
 if(p.energy<31||p.health<45){let b=freeBed();if(b){p.reserved=b.slot;go(p,'sleep',b.slot,30);return}if(countAt('arcade_room')<4){go(p,'arcade','arcade_room',11);return}}
 if(p.happy<42&&countAt('arcade_room')<4)go(p,'arcade','arcade_room',10)
}
function social(p){if(S.time<(p.nextBreak||0)||!canBreak(p))return;let dest=(countAt('arcade_room')<=countAt('dining_room'))?'arcade_room':'dining_room';if(countAt(dest)>=4){p.nextBreak=S.time+rnd(8,15);return}let duration=rnd(8,15);go(p,'hangout',dest,duration);p.nextBreak=S.time+rnd(34,62);
 let buddy=S.people.filter(q=>q.id!==p.id&&['work','idle'].includes(q.action)&&canBreak(q)&&S.time>(q.nextBreak||0)-10).sort(()=>Math.random()-.5)[0];
 if(buddy&&Math.random()<.7){go(buddy,'hangout',dest,duration+rnd(-2,3));buddy.nextBreak=S.time+rnd(38,68)}
}
function engineerRoutine(){let p=S.people.find(x=>x.id===3);if(!p||p.action!=='idle')return;if(S.res.power<12){note('Power is critically low. The engineer is leaving the lounge to repair the generator.');go(p,'repair','power_generator',10);S.nextMaintenance=S.time+30;return}if(S.time<(S.nextMaintenance||0))return;let choices=['power_generator','water_extractor','radio_room','science_lab'].filter(room),t=choices[Math.floor(Math.random()*choices.length)];if(t){go(p,'maintenance',t,7);S.nextMaintenance=S.time+rnd(32,52)}}
function trainerRoutine(){let trainer=S.people.find(x=>x.id===6);if(!trainer||!['idle','hangout'].includes(trainer.action)||S.time<(S.nextTraining||0))return;let trainee=S.people.filter(x=>x.id!==6&&['work','idle'].includes(x.action)&&x.energy>68&&!urgent(x)).sort((a,b)=>a.level-b.level||b.energy-a.energy)[0];S.nextTraining=S.time+rnd(50,80);if(!trainee)return;go(trainee,'training','gym',14);go(trainer,'coach','gym',14);note(`${trainer.name} rounded up ${trainee.name} for a stamina session in the gym.`)}
function go(p,next,typeOrSlot,duration){let dest=typeof typeOrSlot==='number'?typeOrSlot:room(typeOrSlot)?.slot;if(dest==null)return;if(p.slot===dest){begin(p,next,duration,dest);return}p.action='walking';p.until=S.time+Math.max(1.0,1.05*S.speed);p.targetAction=next;p.targetDuration=duration;p.targetSlot=dest;p.slot=dest;p.dx=0;p.dy=0}
function begin(p,a,duration,slot){p.action=a;p.until=['work','idle'].includes(a)?0:S.time+duration;p.slot=slot;p.targetAction=null;p.targetDuration=0;p.targetSlot=null;if(a==='sleep')note(`${p.name} reached the bedroom and closed the privacy curtain.`)}
function returnHome(p){go(p,[3,6].includes(p.id)?'idle':'work',homeSlot(p),0)}
function finish(p){let a=p.action;if(a==='walking'){let n=p.targetAction,d=p.targetDuration,s=p.targetSlot;begin(p,n,d,s);return}if(a==='sleep'){p.energy=Math.max(p.energy,p.maxEnergy*.9);p.health=clamp(p.health+5,15,100)}if(a==='eat'){p.hunger=clamp(p.hunger+42,0,100);p.energy=clamp(p.energy+10,0,p.maxEnergy)}if(a==='drink'){p.thirst=clamp(p.thirst+45,0,100);p.energy=clamp(p.energy+2,0,p.maxEnergy)}if(a==='shower'){p.hygiene=clamp(p.hygiene+65,0,100);p.health=clamp(p.health+5,15,100);p.happy=clamp(p.happy+4,0,100)}if(a==='medical'){p.health=clamp(p.health+42,15,100);p.sick=false;p.hurt=false}if(a==='training'){let coached=S.people.some(x=>x.id===6&&x.action==='coach'&&x.slot===p.slot);p.level++;p.maxEnergy+=coached?5:4;p.happy=clamp(p.happy+3,0,100);note(`${p.name} finished training. Max energy is now ${Math.round(p.maxEnergy)}.`)}if(a==='repair'){S.res.power=clamp(S.res.power+28,0,999);S.res.parts=clamp(S.res.parts+2,0,999);note('The engineer finished the emergency repair and is heading back to the lounge.')}if(a==='maintenance'){S.res.parts=clamp(S.res.parts+2.5,0,999)}p.until=0;p.reserved=null;returnHome(p)}
function buildBed(slot){let n=S.rooms.filter(r=>r?.type==='single_bedroom').length,c=30+(n-1)*8;if(S.res.parts<c)return note(`Another bedroom needs ${c} Parts.`);S.res.parts-=c;S.rooms[slot]={type:'single_bedroom',slot,level:1};note('A new private bedroom was built.');buildGrid();selected={kind:'room',id:slot};draw()}
function upgrade(slot){let r=S.rooms[slot],tc=8+(r.level-1)*6,pc=10+(r.level-1)*8;if(r.level>=5)return;if(S.res.tech<tc||S.res.parts<pc)return note(`Upgrade needs ${tc} Upgrade Points and ${pc} Parts.`);S.res.tech-=tc;S.res.parts-=pc;r.level++;note(`${ROOM_INFO[r.type][0]} reached level ${r.level}.`);buildGrid();draw()}
function train(){let trainer=S.people.find(x=>x.id===6),p=S.people.filter(x=>x.id!==6&&['work','idle'].includes(x.action)&&x.energy>55).sort((a,b)=>a.level-b.level||b.energy-a.energy)[0];if(!p)return note('Nobody is rested enough to train right now.');go(p,'training','gym',14);if(trainer&&['idle','hangout'].includes(trainer.action))go(trainer,'coach','gym',14);S.nextTraining=S.time+rnd(45,70);note(`${trainer?.name||'The trainer'} is taking ${p.name} to the gym for stamina training.`)}
function draw(){drawRes();drawRooms();drawRoster();drawPeople();drawClock();drawLog();drawDetail();mark()}
function drawRes(){$('#resources').innerHTML=Object.entries(RM).map(([k,m])=>`<div class="resource-pill"><span class="icon">${m[0]}</span><b>${S.res[k]>=100?Math.floor(S.res[k]):S.res[k].toFixed(1)}</b><small>${m[1]}</small></div>`).join('')}
function drawRooms(){let on=S.res.power>.05;$$('.slot').forEach(e=>{let r=S.rooms[+e.dataset.slot];if(!r)return;let sleep=r.type==='single_bedroom'&&S.people.some(p=>p.action==='sleep'&&p.reserved===r.slot),v=sleep?'sleep':on?'lights_on':'lights_off';e.querySelector('.room-art').src=`rooms/${r.type}/${v}.png`;e.querySelector('.room-level').textContent=r.level})}
function face(p){if(p.sick)return'sick';if(p.hunger<28)return'hungry';if(p.energy<28)return'tired';if(p.health<55||p.happy<40)return'sad';if(p.happy>80)return'happy';return'idle'}
function pose(p){if(p.action==='walking')return Math.floor(S.time*5)%2?'walk_01':'walk_02';if(p.action==='work')return p.jobPose;if(p.action==='idle')return'idle';if(p.action==='hangout')return Math.floor(S.time/2)%2?'happy':'idle';if(p.action==='eat')return'eat';if(p.action==='medical')return'sick';if(p.action==='repair'||p.action==='maintenance')return p.id===3?'repair_machine':'idle';if(p.action==='coach')return p.id===6?'wipe_towel':'happy';if(['shower','arcade','training'].includes(p.action))return'happy';return face(p)}
function img(p,po){return `settler_${String(p.id).padStart(2,'0')}/${po}.png`}
function status(p){return {work:`Working · ${p.role}`,idle:'Off duty · common lounge',walking:'Walking',sleep:'Sleeping',eat:'Eating',drink:'Getting a drink',shower:'Showering',medical:'Treatment',arcade:'Arcade break',hangout:'Hanging out',training:'Stamina training',coach:'Coaching a settler',repair:'Emergency repair',maintenance:'Maintenance round'}[p.action]||p.action}
function drawRoster(){$('#roster').innerHTML=S.people.map(p=>`<div class="roster-card" data-id="${p.id}"><img src="${img(p,face(p))}"><div><b>${p.name}</b><small>${status(p)}</small><div class="mini-bar"><span style="width:${p.energy/p.maxEnergy*100}%"></span></div></div></div>`).join('');$$('.roster-card').forEach(e=>e.onclick=()=>{selected={kind:'person',id:+e.dataset.id};drawDetail();mark()})}
function drawPeople(){let wr=$('#world').getBoundingClientRect(),groups=new Map;S.people.forEach(p=>{if(!groups.has(p.slot))groups.set(p.slot,[]);groups.get(p.slot).push(p)});for(let [slot,g] of groups){let c=$(`.slot[data-slot="${slot}"]`);if(!c)continue;let cr=c.getBoundingClientRect();g.forEach((p,n)=>{let e=$(`.settler-sprite[data-id="${p.id}"]`);e.classList.toggle('sleeping',p.action==='sleep');e.classList.toggle('walking',p.action==='walking');e.classList.toggle('social',p.action==='hangout'||p.action==='arcade');e.src=img(p,pose(p));let spread=Math.min(cr.width*.19,27),off=(n-(g.length-1)/2)*spread+(p.dx||0)*cr.width;e.style.left=`${(cr.left-wr.left+cr.width*.5+off)/wr.width*100}%`;e.style.top=`${(cr.top-wr.top+cr.height*(.84+(p.dy||0)))/wr.height*100}%`})}}
function meter(l,v,m,c){return `<div class="stat-box"><label><span>${l}</span><b>${Math.round(v)}/${Math.round(m)}</b></label><div class="meter ${c}"><span style="width:${clamp(v/m*100,0,100)}%"></span></div></div>`}
function drawDetail(){if(!selected)return;if(selected.kind==='person'){let p=S.people.find(x=>x.id===selected.id);$('#detailContent').innerHTML=`<h2>${p.name}</h2><p>${p.role}</p><span class="badge">${status(p)} · Stamina Lv. ${p.level}</span><div class="detail-grid">${meter('⚡ Energy',p.energy,p.maxEnergy,'energy')}${meter('❤️ Health',p.health,100,'health')}${meter('🍲 Fullness',p.hunger,100,'hunger')}${meter('💧 Hydration',p.thirst,100,'thirst')}${meter('🚿 Hygiene',p.hygiene,100,'hygiene')}${meter('😊 Happiness',p.happy,100,'happiness')}</div><div class="tip-card"><b>Living, not just working</b><span>Settlers now walk to needs, take social breaks, mill around rooms, and return to work afterward. The engineer and trainer are on-call roles.</span></div>`;return}let r=S.rooms[selected.id];if(!r){let n=S.rooms.filter(x=>x?.type==='single_bedroom').length,c=30+(n-1)*8;$('#detailContent').innerHTML=`<h2>Empty excavation square</h2><p>Build another one-person sleeping quarter here.</p><div class="tip-card"><b>Bedroom queue</b><span>More bedrooms let more settlers sleep at the same time.</span></div><div class="action-row"><button id="buildBed" class="action-btn primary" ${S.res.parts<c?'disabled':''}>Build Bedroom · ${c} 🔧</button></div>`;$('#buildBed')?.addEventListener('click',()=>buildBed(selected.id));return}let tc=8+(r.level-1)*6,pc=10+(r.level-1)*8;$('#detailContent').innerHTML=`<h2>${ROOM_INFO[r.type][0]}</h2><p>${ROOM_INFO[r.type][1]}</p><span class="badge">Level ${r.level}</span><div class="action-row"><button id="upRoom" class="action-btn primary" ${(r.level>=5||S.res.tech<tc||S.res.parts<pc)?'disabled':''}>Upgrade · ${tc} 🔬 + ${pc} 🔧</button>${r.type==='gym'?'<button id="train" class="action-btn">Start coached training</button>':''}</div>`;$('#upRoom')?.addEventListener('click',()=>upgrade(selected.id));$('#train')?.addEventListener('click',train)}
function mark(){$$('.slot').forEach(e=>e.classList.toggle('selected',selected&&selected.kind!=='person'&&+e.dataset.slot===selected.id));$$('.settler-sprite,.roster-card').forEach(e=>e.classList.toggle('selected',selected?.kind==='person'&&+e.dataset.id===selected.id))}
function drawClock(){let m=480+Math.floor(S.time*5);$('#dayNumber').textContent=1+Math.floor(m/1440);m%=1440;$('#clockText').textContent=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function note(text){S.log.push({t:S.time,text});if(S.log.length>60)S.log.shift()}
function drawLog(){$('#eventLog').innerHTML=S.log.slice(-10).reverse().map(x=>`<div class="log-entry">${x.text}</div>`).join('')}
document.addEventListener('DOMContentLoaded',init);
})();
