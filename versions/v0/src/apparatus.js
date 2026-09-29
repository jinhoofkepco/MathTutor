import {V,colors as C,THREE} from './stage.js';
import {sum,mean,weighted,visualScale,transfer,exchange,exchangeParts,tubeAllocation,mixedLevels,changeValues} from './core.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},BASE=.09;
const palette=[C.blue,C.teal,C.orange,0x8563b8,0xce6986];
export function apparatus(stage,S,done){
 let items=[],rail,predictMark,lines=[],timer=0;
 const crateX=i=>(i-(S.work.length-1)/2)*.84;
 const fmt=v=>Number(v.toFixed(2)).toLocaleString('ko-KR');
 function finish(){S.playing=false;S.completed=true;done();}
 function pedestal(x,scale=1){stage.model('Pedestal',V(x,0,0),0xbba47e,[scale,1,1]);}
 function prediction(y,x0,x1){rail=stage.rail(x0,x1,y,C.orange,{kind:'prediction'});predictMark=stage.label('?',V(x1+.15,y,.5),'#af7019',.25);}
 function crate(){
  stage.clear();items=[];const n=S.work.length,{base,unit}=visualScale(S.data);S.scale={base,unit};
  S.work.forEach((v,i)=>{const x=crateX(i);pedestal(x);stage.floor(x,.78);let level=0;for(let j=0,amount=Math.max(0,(v-base)/unit);j<Math.ceil(amount-1e-8);j++){const q=Math.min(1,amount-j),h=q*.4,p=V(x,BASE+level+h/2,0);const m=stage.model('Crate',p,v>mean(S.data)?C.blue:C.teal,[1,q,1],{kind:'crate',col:i,q:q*unit});stage.body(m,p,[.32,h/2,.24],q,S.justLanded?.col===i&&j===Math.ceil(amount-1e-8)-1?.16:0,{kind:'crate',col:i,q:q*unit});level+=h;items.push(m);}stage.label(fmt(v),V(x,level+.3,0),'#52687b',.22,true);if(S.compare){const oldH=(S.data[i]-base)/unit*.4;stage.line([V(x-.34,BASE+oldH,.3),V(x+.34,BASE+oldH,.3)],C.gray,true);}});
  prediction(BASE+(S.guess-base)/unit*.4,crateX(0)-.42,crateX(n-1)+.42);
  if(S.packet){const p=S.packet;p.mesh=stage.model('Crate',p.start,C.orange,[1,p.q/unit,1]);}
  stage.label(S.scale.base?`${base} +`:'Σ',V(crateX(0)-.55,.12,.3),'#738394',.2,S.scale.base===0);
 }
 function begin(t){if(!t)return false;const p0=V(crateX(t.i),BASE+(S.work[t.i]-S.scale.base)/S.scale.unit*.4-t.q/S.scale.unit*.2,0);S.work[t.i]-=t.q;const p1=V(crateX(t.j),BASE+(S.work[t.j]-S.scale.base)/S.scale.unit*.4+t.q/S.scale.unit*.2,0);S.packet={...t,start:p0,end:p1,p:0};crate();return true;}
 function finishPacket(){if(!S.packet)return;S.work[S.packet.j]+=S.packet.q;S.justLanded={col:S.packet.j};S.packet=null;crate();S.justLanded=null;S.settle=.35;}
 function tubes(){
  stage.clear();items=[];const n=S.tube.n,delta=S.question.high-S.question.low,target=S.question.meanHigh-S.question.meanLow,H=Math.max(3.4,Math.ceil(delta/2)*.5+.15),oldN=S.tube.fromN||n,previous=tubeAllocation(delta,oldN),next=tubeAllocation(delta,n);
  const width=n*.58;stage.box(width,.15,.72,V((n-1)*.29,0,0),0x8b959b);stage.floor((n-1)*.29,width,.65,.05);
  for(let i=0;i<n;i++){stage.model('Tube',V(i*.58,BASE+H/2,0),undefined,[1,H/4,1]);stage.rail(i*.58-.255,i*.58+.255,BASE+target*.5,C.orange);if(i>=oldN)stage.label('+',V(i*.58,-.2,0),'#b27a23',.25);}
  next.forEach((a,i)=>{const start=S.tube.starts?.[i]?.clone()||V(previous[i].col*.58,BASE+.25+previous[i].level*.5,0),end=V(a.col*.58,BASE+.25+a.level*.5,0),mesh=stage.model('Ball',start,C.blue,[1,1,1],{kind:'ball',id:i});items.push({mesh,start,end,col:a.col,level:a.level,arrived:false,id:i,H});});
  stage.label('Δ',V(-.4,.15,0),'#b27a23',.25);stage.label(String(delta),V(-.4,.5,0),'#b27a23',.25,true);S.tube.H=H;updateTubes(0);
 }
 function updateTubes(dt){
  if(S.playing)S.tube.p=Math.min(1,S.tube.p+dt/3.2);
  items.forEach((o,i)=>{const p=Math.max(0,Math.min(1,S.tube.p*1.25-i/items.length*.25));if(o.arrived)return;
   if(S.tube.fromN===S.tube.n||S.tube.p===1){o.mesh.position.copy(o.end);}else{const top=BASE+o.H+.5+(i%3)*.13;if(p<.25)o.mesh.position.set(o.start.x,o.start.y+(top-o.start.y)*ease(p/.25),0);else if(p<.65)o.mesh.position.set(o.start.x+(o.end.x-o.start.x)*ease((p-.25)/.4),top,0);else o.mesh.position.set(o.end.x,top+(o.end.y-top)*ease((p-.65)/.35),0);}
   if(p===1||S.tube.fromN===S.tube.n){o.arrived=true;stage.body(o.mesh,o.end,'sphere',1,.03,{kind:'marble',id:i,col:o.col});}
  });
  if(S.playing&&S.tube.p===1)finish();
 }
 function transformation(){
  stage.clear();items=[];const data=S.transform.values,n=data.length,w=n*.84,offset=w/2+.7,stageNo=S.transform.stage,a=stageNo?3:1,b=stageNo===2?-1:0,target=changeValues(data,a,b,S.transform.all),from=S.transform.from||data;
  [0,1].forEach(side=>{const off=side?offset:-offset;data.forEach((v,i)=>{const x=off+(i-(n-1)/2)*.84;pedestal(x);if(!side){for(let j=0;j<v;j++)stage.model('Crate',V(x,BASE+(j+.5)*.32,0),C.gray,[1,.8,1]);}});});
  target.forEach((v,i)=>{const x=offset+(i-(n-1)/2)*.84,old=from[i];for(let j=0;j<Math.max(v,old);j++){const added=j>=old,removed=j>=v,mesh=stage.model('Crate',V(x,BASE+(Math.min(j,old-1)+.5)*.32,0),added||removed?C.orange:C.blue,[1,.8,1]);const start=V(x,BASE+(Math.min(j,old-1)+.5)*.32,0),end=removed?V(x+.5,BASE+(j+.5)*.32+.8,0):V(x,BASE+(j+.5)*.32,0);items.push({mesh,start,end,added,removed});}});
  stage.rail(-offset-w/2,-offset+w/2,BASE+mean(data)*.32,C.gray);
  rail=stage.rail(offset-w/2,offset+w/2,BASE+mean(from)*.32,C.orange);stage.label('M',V(-offset-w/2-.15,BASE+mean(data)*.32,.4),'#52687b',.25);stage.label(S.transform.all?'∀ x':'x₁',V(offset,-.25,0),'#52687b',.28);
  stage.label('전',V(-offset,-.25,0),'#718599',.23);S.transform.target=target;updateTransform(0);
 }
 function updateTransform(dt){if(S.playing)S.transform.p=Math.min(1,S.transform.p+dt/1.8);const t=ease(S.transform.p);items.forEach(o=>{o.mesh.position.lerpVectors(o.start,o.end,t);o.mesh.material.transparent=o.added||o.removed;o.mesh.material.opacity=o.added?t:o.removed?1-t:1;});rail.position.y=BASE+(mean(S.transform.from)+(mean(S.transform.target)-mean(S.transform.from))*t)*.32;if(S.playing&&S.transform.p===1)finish();}
 function rods(){
  stage.clear();items=[];const values=S.exchange.values,n=values.length,k=.22,w=n*.82,off=w/2+.7,omits=values.map((_,i)=>i),parts=exchangeParts(values,omits),heights=Array(n).fill(0);
  values.forEach((v,i)=>{const left=-off+(i-(n-1)/2)*.82,right=off+(i-(n-1)/2)*.82;pedestal(left);pedestal(right);stage.model('Rod',V(left,BASE+v*k/2,0),palette[i],[1,v*k,1]);for(let j=1;j<n-1;j++)stage.line([V(left-.27,BASE+v*k*j/(n-1),.16),V(left+.27,BASE+v*k*j/(n-1),.16)],0xffffff);stage.label(String.fromCharCode(65+i),V(left,-.23,0),'#52687b',.22);stage.label(String.fromCharCode(65+i),V(right,-.23,0),'#52687b',.22);});
  parts.forEach(part=>{const {from,to,q,sourceLevel}=part,x0=off+(from-(n-1)/2)*.82,x1=off+(to-(n-1)/2)*.82,start=V(x0,BASE+(sourceLevel+.5)*q*k,0),end=V(x1,BASE+(heights[to]+q/2)*k,0);heights[to]+=q;const mesh=stage.model('Rod',start,palette[from],[1,q*k,1],{kind:'rod',person:from});items.push({...part,mesh,start,end});});
  S.exchange.after=exchange(values,omits);stage.rail(-off-w/2,-off+w/2,BASE+mean(values)*k,C.orange);stage.rail(off-w/2,off+w/2,BASE+mean(values)*k,C.orange);
  stage.label('전',V(-off,Math.max(...values)*k+.55,0),'#718599',.24);stage.label('다른 사람 평균',V(off,Math.max(...values)*k+.55,0),'#718599',.24);updateRods(0);
 }
 function updateRods(dt){if(S.playing)S.exchange.p=Math.min(1,S.exchange.p+dt/5);const t=ease(S.exchange.p);items.forEach((o,i)=>{o.mesh.position.lerpVectors(o.start,o.end,t);o.mesh.position.y+=Math.sin(Math.PI*t)*(.8+(i%3)*.17);o.mesh.position.z=Math.sin(Math.PI*t)*((o.from%3)-1)*.22;const active=S.exchange.person===null||S.exchange.person===o.from;o.mesh.material.transparent=!active;o.mesh.material.opacity=active?1:.15;});if(S.playing&&S.exchange.p===1)finish();}
 function water(){
  stage.clear();items=[];lines=[];const g=S.group,u=g.unit||1,n1=g.n1/u,n2=g.n2/u,n=n1+n2,low=Math.min(g.a,g.b),high=Math.max(g.a,g.b),span=Math.max(2,high-low),lo=low-(low===high?1.2:span*.18),hi=high+(low===high?1.2:span*.18),k=3.8/(hi-lo),x0=-(n-1)*.4;
  S.water.domain={lo,hi,k,x0,n};
  for(let i=0;i<n;i++){const x=x0+i*.8,a=i<n1?g.a:g.b,c=i<n1?C.blue:C.teal;stage.model('Tank',V(x,BASE+2,0),undefined);pedestal(x);const mesh=stage.box(.716,.1,.45,V(x,BASE+.05,0),c,.70);mesh.renderOrder=1;items.push({mesh,index:i,group:i<n1?'a':'b'});stage.label(u===1?'●':'×'+u,V(x,-.21,0),i<n1?'#285ccd':'#218e95',.19);stage.line([V(x-.35,BASE+(a-lo)*k,.27),V(x+.35,BASE+(a-lo)*k,.27)],c,true);if(i<n-1)stage.box(.1,.11,.12,V(x+.4,BASE+.08,.03),0x9d8549);}
  const valveX=x0+(n1-.5)*.8;const valve=stage.model('Valve',V(valveX,BASE+.15,.43),0xa88a47,[.6,.6,.6],{kind:'valve'});lines.push(valve);
  prediction(BASE+(S.guess-lo)*k,x0-.38,x0+(n-1)*.8+.38);if(S.naive)stage.line([V(x0-.38,BASE+((g.a+g.b)/2-lo)*k,.4),V(x0+(n-1)*.8+.38,BASE+((g.a+g.b)/2-lo)*k,.4)],0xc35e51,true);
  stage.label('A',V(x0+(n1-1)*.4,4.35,0),'#285ccd',.25);stage.label('B',V(x0+n1*.8+(n2-1)*.4,4.35,0),'#218e95',.25);stage.label('//',V(x0-.47,.2,0),'#52687b',.18);updateWater(0);
 }
 function updateWater(dt){if(S.playing)S.water.p=Math.min(1,S.water.p+dt/4.5);const g=S.group,levels=mixedLevels(g.n1,g.a,g.n2,g.b,ease(S.water.p)),{lo,k}=S.water.domain;items.forEach(o=>{const h=(levels[o.group]-lo)*k;o.mesh.scale.y=h/.1;o.mesh.position.y=BASE+h/2;});lines[0].rotation.z=S.water.p*Math.PI/2;S.water.levels=levels;if(S.playing&&S.water.p===1)finish();}
 function deviation(){
  stage.clear();items=[];const data=S.data,n=data.length,ref=S.reference,ds=data.map(v=>v-ref),pos=sum(ds.filter(v=>v>0)),neg=-sum(ds.filter(v=>v<0)),total=pos-neg,unit=Math.max(1,Math.ceil(Math.max(pos,neg)/48)),k=Math.min(.11,1.8/Math.max(1,...ds.map(Math.abs))),baseline=2.5;
  S.deviationModel={pos,neg,total,unit,k,baseline};
  stage.rail(-(n-1)*.38-.35,(n-1)*.38+.35,baseline,C.orange);stage.label(String(ref),V(n*.38+.2,baseline,.2),'#b27a23',.25).userData.reference=true;
  let plus=0,minus=0;data.forEach((v,i)=>{const d=ds[i],sign=Math.sign(d),h=Math.abs(d)*k,x=(i-(n-1)/2)*.76;for(let used=0;used<Math.abs(d)-1e-8;used+=unit){const q=Math.min(unit,Math.abs(d)-used),index=sign>0?plus++:minus++,start=V(x,baseline+sign*(used+q/2)*k,0),end=V((index%8-3.5)*.58,4.4-Math.floor(index/8)*.50+(sign>0?.115:-.115),0),mesh=stage.box(.44,q*k,.22,start,sign>0?C.blue:C.teal);items.push({mesh,start,end,sign,q,index,kind:'difference',initialHeight:q*k});}stage.label(sign>=0?'+':'−',V(x,sign>=0?baseline+h+.22:baseline-h-.22,.2),'#52687b',.2);});
  const remain=Math.abs(total),sign=Math.sign(total),common=remain/n;
  for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.76,h=Math.max(.001,common*k),start=V(0,2.5,0),end=V(x,baseline+sign*h/2,0),mesh=stage.box(.44,h,.22,start,sign>=0?C.blue:C.teal,0);items.push({mesh,start,end,kind:'shared'});}
  updateDeviation(0);
 }
 function updateDeviation(dt){
  if(S.playing)S.deviationP=Math.min(1,S.deviationP+dt/7);const p=S.deviationP,{pos,neg,unit}=S.deviationModel,matched=Math.min(pos,neg);
  items.forEach(o=>{o.mesh.material.transparent=true;if(o.kind==='difference'){
    const gather=ease(p/.4);o.mesh.position.lerpVectors(o.start,o.end,gather);o.mesh.scale.y=1+(.20*o.q/unit/o.initialHeight-1)*gather;const paired=Math.max(0,Math.min(o.q,matched-o.index*unit))/o.q;
    const cancelled=ease((p-.42)/.22);o.mesh.material.opacity=(1-paired*cancelled)*(1-ease((p-.78)/.18));
   }else{const t=ease((p-.76)/.24);o.mesh.position.lerpVectors(o.start,o.end,t);o.mesh.material.opacity=t;}
  });
  stage.labels.forEach(l=>{if(!l.userData.reference)l.material.opacity=p<.2?1:Math.max(0,1-(p-.2)*4);});
  if(S.playing&&p===1)finish();
 }
 function build(fit=true){timer=0;if(S.mode==='crate')crate();if(S.mode==='tubes')tubes();if(S.mode==='transform')transformation();if(S.mode==='exchange')rods();if(S.mode==='water')water();if(S.mode==='deviation')deviation();if(fit)frame();}
 function frame(){if(S.mode==='crate')stage.frame(S.work.length*.84,Math.max(3,...S.data.map(v=>(v-S.scale.base)/S.scale.unit*.4))+.4);if(S.mode==='tubes'){const h=S.tube.H+.7;stage.frame(Math.max(S.tube.n*.58,5),h,(S.tube.n-1)*.29);}if(S.mode==='transform')stage.frame(S.transform.values.length*1.68+1.4,Math.max(...S.transform.values)*3*.32+.6);if(S.mode==='exchange')stage.frame(S.exchange.values.length*1.64+1.4,Math.max(...S.exchange.values)*.22+.8);if(S.mode==='water')stage.frame((S.group.n1+S.group.n2)/(S.group.unit||1)*.8,4.5);if(S.mode==='deviation')stage.frame(S.data.length*.76+1,5.1);}
 function update(dt){if(S.mode==='crate'){S.settle=Math.max(0,(S.settle||0)-dt);if(S.playing&&!S.packet&&!S.settle){if(!begin(transfer(S.work,S.scale.unit)))finish();}if(S.packet){const p=S.packet;p.p=Math.min(1,p.p+dt/1.0);p.mesh.position.lerpVectors(p.start,p.end,ease(p.p));p.mesh.position.y+=Math.sin(Math.PI*p.p)*1.1;if(p.p===1)finishPacket();}}if(S.mode==='tubes')updateTubes(dt);if(S.mode==='transform')updateTransform(dt);if(S.mode==='exchange')updateRods(dt);if(S.mode==='water')updateWater(dt);if(S.mode==='deviation')updateDeviation(dt);}
 function setGuess(v){S.guess=v;if(!rail)return;if(S.mode==='crate')rail.position.y=BASE+(v-S.scale.base)/S.scale.unit*.4;if(S.mode==='water')rail.position.y=BASE+(v-S.water.domain.lo)*S.water.domain.k;if(predictMark)predictMark.position.y=rail.position.y;}
 function valueAt(y){return S.mode==='crate'?S.scale.base+(y-BASE)/.4*S.scale.unit:S.mode==='water'?S.water.domain.lo+(y-BASE)/S.water.domain.k:y;}
 return {build,frame,update,begin,finishPacket,setGuess,valueAt,crateX,getItems:()=>items};
}
