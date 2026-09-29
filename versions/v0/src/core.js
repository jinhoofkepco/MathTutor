export const sum=a=>a.reduce((s,x)=>s+x,0);
export const mean=a=>sum(a)/a.length;
export const original=[150,138,152,166,148,159,134,160,142,155];
export function parse(text){const a=text.trim().split(/[\s,，]+/).filter(Boolean).map(Number);if(a.length<2||a.length>20||a.some(x=>!Number.isFinite(x)||x<0||x>200))throw Error('0~200 · 2~20개');return a;}
export function sample(pop,n,rng=Math.random){const a=pop.map((v,i)=>({v,i}));for(let i=0;i<n;i++){const j=i+Math.floor(rng()*(a.length-i));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
export function transfer(a,unit=1){const m=mean(a),i=a.indexOf(Math.max(...a)),j=a.indexOf(Math.min(...a));const q=Math.min(unit,a[i]-m,m-a[j]);return q>1e-8?{i,j,q}:null;}
export function applyTransfer(a,{i,j,q}){const b=[...a];b[i]-=q;b[j]+=q;return b;}
export const weighted=(n1,m1,n2,m2)=>(n1*m1+n2*m2)/(n1+n2);
export const transform=(a,k,b)=>a.map(v=>k*v+b);
export const torque=(positions,p)=>-9.81*sum(positions.map(x=>x-p));
export function visualScale(a){const max=Math.max(...a);if(a.length===10&&a.every((v,i)=>v===original[i]))return {base:120,unit:5};return {base:0,unit:Math.max(1,Math.ceil(max/12))};}
export const deviations=(values,reference)=>values.map(v=>v-reference);
export const subjectsFromChanges=(scoreLow,scoreHigh,meanLow,meanHigh)=>(scoreHigh-scoreLow)/(meanHigh-meanLow);
export const inclusionMatrix=n=>Array.from({length:n},(_,row)=>Array.from({length:n},(_,col)=>row===col?0:1));
export function distributionChunks(total,n){const per=total/n,result=[];for(let col=0;col<n;col++)for(let j=0;j<Math.ceil(per-1e-10);j++)result.push({col,level:j,amount:Math.min(1,per-j)});return result;}

export function exchange(values, omissions=values.map((_,i)=>i)) {
  const n=values.length;
  if(n<2||omissions.length!==n||omissions.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Invalid groups');
  return omissions.map(omit=>sum(values.filter((_,i)=>i!==omit))/(n-1));
}
export function exchangeParts(values, omissions=values.map((_,i)=>i)) {
  const use=Array(values.length).fill(0);
  return omissions.flatMap((omit,to)=>values.flatMap((value,from)=>from===omit?[]:[{from,to,q:value/(values.length-1),sourceLevel:use[from]++}]));
}
export function tubeAllocation(total,n){
  if(!Number.isInteger(total)||total<0||!Number.isInteger(n)||n<1)throw Error('Invalid allocation');
  return Array.from({length:total},(_,i)=>({col:i%n,level:Math.floor(i/n)}));
}
export function mixedLevels(n1,a,n2,b,p){
  if(!Number.isInteger(n1)||!Number.isInteger(n2)||n1<=0||n2<=0)throw Error('Positive group sizes required');
  const m=weighted(n1,a,n2,b),t=Math.min(1,Math.max(0,p));
  return {a:a+(m-a)*t,b:b+(m-b)*t,mean:m,total:n1*a+n2*b};
}
export function changeValues(values,a,b,all=true,index=0){return values.map((v,i)=>all||i===index?a*v+b:v);}
