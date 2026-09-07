(() => {
'use strict';
const KEY='vaultPrototype3';
const ROOM=[
 'single_bedroom','dining_room','power_generator','water_extractor','underground_garden',
 'medical_room','washroom','arcade_room','gym','radio_room','science_lab',null,null,null,null
];
const ROOM_INFO={
 single_bedroom:['Single Bedroom','One settler sleeps here at a time. Sleep restores energy fastest and also repairs health.'],
 dining_room:['Dining Room','The chef spends crops and water to make meals. Settlers also come here to eat and drink.'],
 power_generator:['Power Generator','Creates power. If power gets critically low, the engineer comes over from the common lounge to help repair the system.'],
 water_extractor:['Water Extractor','Creates water for drinking, cooking, and showers.'],
 underground_garden:['Underground Garden','Creates crops for the chef.'],
 medical_room:['Medical Room','The nurse creates Health Points. Sick or hurt settlers come here and spend them to recover.'],
 washroom:['Washroom','Settlers physically come here to shower. Showers spend water, restore hygiene, and help keep health steady.'],
 arcade_room:['Arcade Room','Restores happiness and a little energy. For now it also doubles as the shared common lounge when the engineer is off duty.'],
 gym:['Gym','Training increases stamina and max energy, but tires the trainee out.'],
 radio_room:['Radio Room','Creates Info Points for research.'],
 science_lab:['Science Lab','Turns Info into Upgrade Points for room improvements.']
};
const DEF=[
 [1,'Gardener','underground_garden','garden_work'],[2,'Power Technician','power_generator','repair_generator'],
 [3,'Engineer',null,'idle'],[4,'Water Technician','water_extractor','operate_valve'],
 [5,'Nurse','medical_room','medical_kit'],[6,'Fitness Trainer','gym','lift_weight'],
 [7,'Sanitation Specialist','washroom','clean_spill'],[8,'Chef','dining_room','cook_pot'],
 [9,'Radio Operator','radio_room','operate_radio_console'],[10,'Scientist','science_lab','analyze_tablet']
];
const RM={power:['⚡','Power'],water:['💧','Water'],crops:['🌱','Crops'],meals:['🍲','Meals'],med:['🩺','Health pts'],info:['📻','Info'],tech:['🔬','Upgrade pts'],parts:['🔧','Parts']};
let S, selected=null, last=performance.now(), renderTimer=0;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function fresh(){
 const state={v:3,speed:1,time:0,res:{power:65,water:70,crops:55,meals:22,med:7,info:0,tech:8,parts:70},rooms:ROOM.map((t,i)=>t?{type:t,slot:i,level:1}:null),people:[],log:[{t:0,text:'All ten settlers found this forgotten shelter together.'},{t:0,text:'There is only one bedroom, so tired settlers have to take turns sleeping.'},{t:0,text:'The engineer is on-call instead of sharing the generator job. She relaxes in the arcade/common lounge until the power system needs help.'}],saved:Date.now()};
 state.people=DEF.map((d,i)=>({id:d[0],role:d[1],job:d[2],jobPose:d[3],name:`Settler ${String(d[0]).padStart(2,'0')}`,energy:48+(i*7)%35,maxEnergy:100,hunger:65+(i*5)%24,thirst:67+(i*7)%23,health:100,hygiene:58+(i*6)%34,happy:72,level:1,sick:false,hurt:false,action:d[0]===3?'idle':'work',until:0,slot:0,reserved:null,targetAction:null,targetDuration:0,targetSlot:null,targetType:null}));
 return state;
}
function load(){try{S=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{S=fresh()}if(S.v!==3)S=fresh();S.people.forEach(p=>p.slot=homeSlot(p));offline()}
function save(){S.saved=Date.now();localStorage.setItem(KEY,JSON.stringify(S))}
function offline(){let sec=Math.min((Date.now()-(S.saved||Date.now()))/1000,14400);if(sec<20)return;let f=sec*.03;S.res.power+=f;S.res.water+=f*.8;S.res.crops+=f*.65;S.res.parts+=f*.12;S.res.med+=f*.07;S.res.info+=f*.06;note('The shelter kept producing resources while you were away. Needs do not worsen offline.')}
function init(){load();buildGrid();buildPeople();bind();draw();requestAnimationFrame(loop);setInterval(save,5000)}
function buildGrid(){let g=$('#bunkerGrid');g.innerHTML='';for(let i=0;i<15;i++){let r=S.rooms[i],e=document.createElement('div');e.className=`slot ${r?r.type:'empty-slot'}`;e.dataset.slot=i;if(r)e.innerHTML=`<img class="room-art"><span class="room-level">${r.level}</span><span class="room-name">${ROOM_INFO[r.type][0]}</span>`;e.onclick=()=>{selected={kind:r?'room':'empty',id:i};drawDetail();mark()};g.append(e)}}
function buildPeople(){let l=$('#settlerLayer');l.innerHTML='';S.people.forEach(p=>{let i=document.createElement('img');i.className='settler-sprite';i.dataset.id=p.id;i.onclick=e=>{e.stopPropagation();selected={kind:'person',id:p.id};drawDetail();mark()};l.append(i)})}
function bind(){$$('.speed').forEach(b=>b.onclick=()=>{S.speed=+b.dataset.speed;$$('.speed').forEach(x=>x.classList.toggle('active',x===b))});$('#resetGame').onclick=()=>{if(confirm('Reset the prototype?')){localStorage.removeItem(KEY);S=fresh();S.people.forEach(p=>p.slot=homeSlot(p));selected=null;buildGrid();buildPeople();draw()}}}
function loop(n){let dt=Math.min((n-last)/1000,.4)*S.speed;last=n;S.time+=dt;step(dt);renderTimer+=dt;if(renderTimer>.18){renderTimer=0;draw()}requestAnimationFrame(loop)}
function room(type){return S.rooms.find(r=>r&&r.type===type)}
function jobSlot(p){return p.job?room(p.job)?.slot??0:homeSlot(p)}
function homeSlot(p){if(p.id===3)return room('arcade_room')?.slot??0;return p.job?room(p.job)?.slot??0:0}
function bonus(type){let r=room(type);return 1+((r?.level||1)-1)*.2}
function freeBed(){return S.rooms.find(r=>r?.type==='single_bedroom'&&!S.people.some(p=>(p.action==='sleep'||(p.action==='walking'&&p.targetAction==='sleep'))&&p.reserved===r.slot))}
function countAt(type){let r=room(type);return r?S.people.filter(p=>p.slot===r.slot&&!['work','idle'].includes(p.action)).length:99}
function efficiency(p){let e=1;if(p.energy<25)e*=.55;if(p.hunger<25)e*=.7;if(p.thirst<25)e*=.65;if(p.hygiene<25)e*=.8;if(p.health<60)e*=.65;if(p.sick||p.hurt)e*=.55;return e}
function step(dt){let powered=S.res.power>.05;S.res.power=Math.max(0,S.res.power-S.rooms.filter(Boolean).length*.025*dt);
 for(let p of S.people){
  if(p.action==='work'){p.energy-=.09*dt;p.hunger-=.026*dt;p.thirst-=.034*dt;p.hygiene-=.018*dt}
  if(p.action==='idle'){p.energy+=.03*dt;p.hunger-=.012*dt;p.thirst-=.016*dt;p.hygiene-=.006*dt;p.happy+=.025*dt}
  if(p.action==='repair'){p.energy-=.23*dt;p.thirst-=.045*dt}
  if(p.action==='walking'){p.energy-=.035*dt;p.thirst-=.009*dt}
  if(p.action==='sleep'){p.energy+=2.3*bonus('single_bedroom')*dt;p.health+=.22*dt}
  if(p.action==='arcade'){p.energy+=.65*dt;p.happy+=1.4*dt}
  if(p.action==='training'){p.energy-=1.1*dt;p.thirst-=.08*dt}
  if(['eat','drink','shower','medical'].includes(p.action)){p.energy-=.01*dt}
  if(p.hygiene<25)p.health-=.015*dt;if(p.hunger<12)p.health-=.01*dt;if(p.thirst<12)p.health-=.02*dt;if(p.energy<7)p.health-=.008*dt;
  p.energy=clamp(p.energy,0,p.maxEnergy);p.hunger=clamp(p.hunger,0,100);p.thirst=clamp(p.thirst,0,100);p.health=clamp(p.health,15,100);p.hygiene=clamp(p.hygiene,0,100);p.happy=clamp(p.happy,0,100);
  if(!['work','idle'].includes(p.action)&&S.time>=p.until)finish(p);
 }
 for(let p of S.people.filter(x=>x.action==='work')){let e=efficiency(p)*(powered||p.id===2?1:.3);if(p.id===1)S.res.crops+=.30*e*bonus('underground_garden')*dt;if(p.id===2)S.res.power+=.62*e*bonus('power_generator')*dt;if(p.id===4)S.res.water+=.40*e*bonus('water_extractor')*dt;if(p.id===5)S.res.med+=.05*e*bonus('medical_room')*dt;if(p.id===8){let a=Math.min(.11*e*bonus('dining_room')*dt,S.res.crops/1.5,S.res.water/.8);S.res.crops-=a*1.5;S.res.water-=a*.8;S.res.meals+=a}if(p.id===9)S.res.info+=.055*e*bonus('radio_room')*dt;if(p.id===10){let a=Math.min(.045*e*bonus('science_lab')*dt,S.res.info);S.res.info-=a;S.res.tech+=a*.7}}
 S.res.parts+=.004*dt;
 let engineer=S.people.find(p=>p.id===3);if(engineer?.action==='idle'&&S.res.power<12){note('Power is critically low. The engineer is heading over from the common lounge to help with repairs.');go(engineer,'repair','power_generator',10)}
 Object.keys(S.res).forEach(k=>S.res[k]=clamp(S.res[k],0,999));
 S.people.filter(p=>['work','idle'].includes(p.action)).forEach(needs);
}
function needs(p){
 if((p.sick||p.hurt||p.health<55)&&S.res.med>=4&&countAt('medical_room')<2){S.res.med-=4;go(p,'medical','medical_room',9);return}
 if(p.hygiene<34&&S.res.water>=2&&countAt('washroom')<2){S.res.water-=2;go(p,'shower','washroom',8);return}
 if(p.hunger<38&&S.res.meals>=1&&countAt('dining_room')<3){S.res.meals-=1;go(p,'eat','dining_room',5);return}
 if(p.thirst<34&&S.res.water>=.5&&countAt('dining_room')<3){S.res.water-=.5;go(p,'drink','dining_room',3);return}
 if(p.energy<31||p.health<45){let b=freeBed();if(b){p.reserved=b.slot;go(p,'sleep',b.slot,30);return}if(countAt('arcade_room')<3){go(p,'arcade','arcade_room',11);return}}
 if(p.happy<42&&countAt('arcade_room')<3)go(p,'arcade','arcade_room',10)
}
function go(p,next,typeOrSlot,duration){let dest=typeof typeOrSlot==='number'?typeOrSlot:room(typeOrSlot)?.slot;if(dest==null)return;if(p.slot===dest){begin(p,next,duration,dest);return}p.action='walking';p.until=S.time+Math.max(1.1,1.1*S.speed);p.targetAction=next;p.targetDuration=duration;p.targetSlot=dest;p.targetType=typeof typeOrSlot==='string'?typeOrSlot:null;p.slot=dest}
function begin(p,a,duration,slot){p.action=a;p.until=['work','idle'].includes(a)?0:S.time+duration;p.slot=slot;p.targetAction=null;p.targetDuration=0;p.targetSlot=null;p.targetType=null;if(a==='sleep')note(`${p.name} reached the bedroom and closed the privacy curtain.`)}
function returnHome(p){let a=p.id===3?'idle':'work';go(p,a,homeSlot(p),0)}
function finish(p){
 let a=p.action;
 if(a==='walking'){let next=p.targetAction,d=p.targetDuration,slot=p.targetSlot;begin(p,next,d,slot);return}
 if(a==='sleep'){p.energy=Math.max(p.energy,p.maxEnergy*.9);p.health=clamp(p.health+5,15,100)}
 if(a==='eat'){p.hunger=clamp(p.hunger+42,0,100);p.energy=clamp(p.energy+10,0,p.maxEnergy)}
 if(a==='drink'){p.thirst=clamp(p.thirst+45,0,100);p.energy=clamp(p.energy+2,0,p.maxEnergy)}
 if(a==='shower'){p.hygiene=clamp(p.hygiene+65,0,100);p.health=clamp(p.health+5,15,100);p.happy=clamp(p.happy+4,0,100)}
 if(a==='medical'){p.health=clamp(p.health+42,15,100);p.sick=false;p.hurt=false}
 if(a==='training'){p.level++;p.maxEnergy+=4;p.happy=clamp(p.happy+3,0,100);note(`${p.name} raised stamina. Max energy is now ${Math.round(p.maxEnergy)}.`)}
 if(a==='repair'){S.res.power=clamp(S.res.power+28,0,999);S.res.parts=clamp(S.res.parts+2,0,999);note('The engineer finished the emergency repair and is heading back to the common lounge.')}
 p.until=0;p.reserved=null;returnHome(p)
}
function buildBed(slot){let n=S.rooms.filter(r=>r?.type==='single_bedroom').length,c=30+(n-1)*8;if(S.res.parts<c)return note(`Another bedroom needs ${c} Parts.`);S.res.parts-=c;S.rooms[slot]={type:'single_bedroom',slot,level:1};note('A new private bedroom was built.');buildGrid();selected={kind:'room',id:slot};draw()}
function upgrade(slot){let r=S.rooms[slot],tc=8+(r.level-1)*6,pc=10+(r.level-1)*8;if(r.level>=5)return;if(S.res.tech<tc||S.res.parts<pc)return note(`Upgrade needs ${tc} Upgrade Points and ${pc} Parts.`);S.res.tech-=tc;S.res.parts-=pc;r.level++;note(`${ROOM_INFO[r.type][0]} reached level ${r.level}.`);buildGrid();draw()}
function train(){let p=S.people.filter(x=>['work','idle'].includes(x.action)&&x.energy>55&&x.id!==6).sort((a,b)=>a.maxEnergy-b.maxEnergy)[0];if(!p)return note('Nobody is rested enough to train right now.');go(p,'training','gym',12);note(`${p.name} is walking to the gym for stamina training.`)}
function draw(){drawRes();drawRooms();drawRoster();drawPeople();drawClock();drawLog();drawDetail();mark()}
function drawRes(){$('#resources').innerHTML=Object.entries(RM).map(([k,m])=>`<div class="resource-pill"><span class="icon">${m[0]}</span><b>${S.res[k]>=100?Math.floor(S.res[k]):S.res[k].toFixed(1)}</b><small>${m[1]}</small></div>`).join('')}
function drawRooms(){let on=S.res.power>.05;$$('.slot').forEach(e=>{let r=S.rooms[+e.dataset.slot];if(!r)return;let sleep=r.type==='single_bedroom'&&S.people.some(p=>p.action==='sleep'&&p.reserved===r.slot),v=sleep?'sleep':on?'lights_on':'lights_off';e.querySelector('.room-art').src=`rooms/${r.type}/${v}.png`;e.querySelector('.room-level').textContent=r.level})}
function face(p){if(p.sick)return'sick';if(p.hunger<28)return'hungry';if(p.energy<28)return'tired';if(p.health<55||p.happy<40)return'sad';if(p.happy>80)return'happy';return'idle'}
function pose(p){if(p.action==='walking')return Math.floor(S.time*5)%2?'walk_01':'walk_02';if(p.action==='work')return p.jobPose;if(p.action==='idle')return'idle';if(p.action==='repair')return'repair_machine';if(p.action==='eat'||p.action==='drink')return'eat';if(p.action==='medical')return'sick';if(['shower','arcade','training'].includes(p.action))return'happy';return face(p)}
function img(p,po){return `settler_${String(p.id).padStart(2,'0')}/${po}.png`}
function status(p){if(p.action==='walking')return`Walking to ${destinationName(p)}`;return {work:`Working · ${p.role}`,idle:'Off duty · common lounge',repair:'Repairing power system',sleep:'Sleeping',eat:'Eating',drink:'Getting a drink',shower:'Showering',medical:'Treatment',arcade:'Arcade break',training:'Stamina training'}[p.action]||p.action}
function destinationName(p){if(p.targetAction==='sleep')return'bedroom';if(p.targetType&&ROOM_INFO[p.targetType])return ROOM_INFO[p.targetType][0].toLowerCase();return p.id===3?'common lounge':'work'}
function drawRoster(){$('#roster').innerHTML=S.people.map(p=>`<div class="roster-card" data-id="${p.id}"><img src="${img(p,face(p))}"><div><b>${p.name}</b><small>${status(p)}</small><div class="mini-bar"><span style="width:${p.energy/p.maxEnergy*100}%"></span></div></div></div>`).join('');$$('.roster-card').forEach(e=>e.onclick=()=>{selected={kind:'person',id:+e.dataset.id};drawDetail();mark()})}
function drawPeople(){let wr=$('#world').getBoundingClientRect(), groups=new Map;S.people.forEach(p=>{if(!groups.has(p.slot))groups.set(p.slot,[]);groups.get(p.slot).push(p)});for(let [slot,g] of groups){let c=$(`.slot[data-slot="${slot}"]`);if(!c)continue;let cr=c.getBoundingClientRect();g.forEach((p,n)=>{let e=$(`.settler-sprite[data-id="${p.id}"]`);e.classList.toggle('sleeping',p.action==='sleep');e.classList.toggle('walking',p.action==='walking');e.style.width='5.9%';e.style.zIndex=p.action==='walking'?12:9;e.src=img(p,pose(p));let off=(n-(g.length-1)/2)*Math.min(cr.width*.20,28);e.style.left=`${(cr.left-wr.left+cr.width*.5+off)/wr.width*100}%`;e.style.top=`${(cr.top-wr.top+cr.height*.84)/wr.height*100}%`})}}
function meter(l,v,m,c){return `<div class="stat-box"><label><span>${l}</span><b>${Math.round(v)}/${Math.round(m)}</b></label><div class="meter ${c}"><span style="width:${clamp(v/m*100,0,100)}%"></span></div></div>`}
function drawDetail(){if(!selected)return;if(selected.kind==='person'){let p=S.people.find(x=>x.id===selected.id);$('#detailContent').innerHTML=`<h2>${p.name}</h2><p>${p.role}</p><span class="badge">${status(p)} · Stamina Lv. ${p.level}</span><div class="detail-grid">${meter('⚡ Energy',p.energy,p.maxEnergy,'energy')}${meter('❤️ Health',p.health,100,'health')}${meter('🍲 Fullness',p.hunger,100,'hunger')}${meter('💧 Hydration',p.thirst,100,'thirst')}${meter('🚿 Hygiene',p.hygiene,100,'hygiene')}${meter('😊 Happiness',p.happy,100,'happiness')}</div><div class="tip-card"><b>No permadeath</b><span>Low health makes settlers rest or work less efficiently. They always recover eventually.</span></div>`;return}let r=S.rooms[selected.id];if(!r){let n=S.rooms.filter(x=>x?.type==='single_bedroom').length,c=30+(n-1)*8;$('#detailContent').innerHTML=`<h2>Empty excavation square</h2><p>Build another one-person sleeping quarter here.</p><div class="tip-card"><b>Bedroom queue</b><span>More bedrooms let more settlers sleep at the same time.</span></div><div class="action-row"><button id="buildBed" class="action-btn primary" ${S.res.parts<c?'disabled':''}>Build Bedroom · ${c} 🔧</button></div>`;$('#buildBed')?.addEventListener('click',()=>buildBed(selected.id));return}let tc=8+(r.level-1)*6,pc=10+(r.level-1)*8;$('#detailContent').innerHTML=`<h2>${ROOM_INFO[r.type][0]}</h2><p>${ROOM_INFO[r.type][1]}</p><span class="badge">Level ${r.level}</span><div class="action-row"><button id="upRoom" class="action-btn primary" ${(r.level>=5||S.res.tech<tc||S.res.parts<pc)?'disabled':''}>Upgrade · ${tc} 🔬 + ${pc} 🔧</button>${r.type==='gym'?'<button id="train" class="action-btn">Train lowest stamina</button>':''}</div>`;$('#upRoom')?.addEventListener('click',()=>upgrade(selected.id));$('#train')?.addEventListener('click',train)}
function mark(){$$('.slot').forEach(e=>e.classList.toggle('selected',selected&&selected.kind!=='person'&&+e.dataset.slot===selected.id));$$('.settler-sprite,.roster-card').forEach(e=>e.classList.toggle('selected',selected?.kind==='person'&&+e.dataset.id===selected.id))}
function drawClock(){let m=480+Math.floor(S.time*5);$('#dayNumber').textContent=1+Math.floor(m/1440);m%=1440;$('#clockText').textContent=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function note(text){S.log.push({t:S.time,text});if(S.log.length>60)S.log.shift()}
function drawLog(){$('#eventLog').innerHTML=S.log.slice(-10).reverse().map(x=>`<div class="log-entry">${x.text}</div>`).join('')}
document.addEventListener('DOMContentLoaded',init);
})();