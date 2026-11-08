function makeTypeModel(job) {
 const {rooms,flags,mode,maxDev,globalTotals,totalCapacity,limitRows}=job;
 const key=s=>JSON.stringify([s.grade,s.examSubject,s.gender||'',s.fixedRoom||'']);
 const students=rooms.flatMap(r=>r.placed.filter(Boolean));const unique=new Map();
 for(const s of students)if(!unique.has(key(s)))unique.set(key(s),{grade:s.grade,subject:s.examSubject,gender:s.gender||'',fixedRoom:s.fixedRoom||'',key:key(s)});
 const types=[...unique.values()],empty=types.length;types.push({grade:null,subject:'',gender:'',fixedRoom:'',key:'EMPTY'});
 const grades=[...new Set(students.map(s=>s.grade))];const ti=s=>s?types.findIndex(t=>t.key===key(s)):empty;
 const level=t=>JSON.stringify([t.grade,t.subject]);
 const levels=[...new Set(types.filter(t=>t.grade!==null).map(level))];
 const lines=[],binaries=[],hints={},patterns=[],rowVars=[],typeTerms=types.map(()=>[]),layouts=[];
 const expression=terms=>terms.length?terms.map(([v,c])=>c===1?v:`${c} ${v}`).join(' + '):'0';
 const add=(terms,op,rhs)=>{if(terms.length)lines.push(`${expression(terms)} ${op} ${rhs}`);else if(!(op==='='?rhs===0:op==='<='?0<=rhs:0>=rhs))throw Error('Geçersiz öğrenci türü sayısı');};
 const fixed=s=>s&&s.fixedRoom&&s.fixedSeat!==undefined&&s.fixedSeat!==null&&s.fixedSeat!=='';
 rooms.forEach((r,ri)=>{
  const map=new Map();for(const c of r.geometry.cells.filter(c=>c.seat<=r.capacity-(r.useTeacherDesk?1:0))){const k=`${c.g}:${c.row}`;if(!map.has(k))map.set(k,[]);map.get(k).push(c.seat);}if(r.useTeacherDesk)map.set('desk',[0]);
  const rowMap=new Map(),localTerms=types.map(()=>[]);let bi=0;
  for(const [pos,seats] of map){seats.sort((a,b)=>a-b);const opts=[];const pinned=seats.map(i=>fixed(r.placed[i])?ti(r.placed[i]):null);
   const validType=t=>!types[t].fixedRoom||types[t].fixedRoom===r.name;
   const matches=order=>order.every((t,i)=>pinned[i]===null||pinned[i]===t);
   for(let a=0;a<types.length;a++)for(let b=(seats.length===1?a:a);b<(seats.length===1?a+1:types.length);b++){
    if(!validType(a)||(seats.length===2&&!validType(b)))continue;
    const A=types[a],B=types[b];
    if(seats.length===2 && A.grade!==null && B.grade!==null){if(flags.side&&A.grade===B.grade&&A.subject===B.subject)continue;if(flags.gender&&A.gender&&B.gender&&A.gender!==B.gender)continue;}
    const base=seats.length===1?[a]:[a,b];const orientations=[base];if(base.length===2&&a!==b)orientations.push([b,a]);const allowed=orientations.filter(matches);if(!allowed.length)continue;
    const name=`p${ri}_${bi}_${opts.length}`;binaries.push(name);const counts=new Map();base.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
    for(const [t,n] of counts){localTerms[t].push([name,n]);typeTerms[t].push([name,n]);}
    const present=[...new Set(base.map(t=>types[t]).filter(t=>t.grade!==null).map(level))];const p={name,ri,seats,pos,order:allowed[0],orientations:allowed,grades:present};patterns.push(p);opts.push(p);
    const current=seats.map(i=>ti(r.placed[i]));hints[name]=Number(allowed.some(o=>o.every((t,i)=>t===current[i])));
   }
   add(opts.map(p=>[p.name,1]),'=',1);rowMap.set(pos,opts);bi++;
  }
  if(mode==='room')for(let t=0;t<types.length;t++)add(localTerms[t],'=',t===empty?r.capacity-r.placed.filter(Boolean).length:r.placed.filter(s=>s&&key(s)===types[t].key).length);
  if(mode!=='room'&&flags.balance)for(const g of grades){const terms=types.flatMap((t,i)=>t.grade===g?localTerms[i]:[]);const ideal=r.capacity*globalTotals[g]/totalCapacity;add(terms,'>=',Math.max(0,Math.ceil(ideal-maxDev-1e-8)));add(terms,'<=',Math.floor(ideal+maxDev+1e-8));}
  for(const [pos,opts] of rowMap){if(pos==='desk')continue;const [g,row]=pos.split(':').map(Number),next=rowMap.get(`${g}:${row+1}`);if(!next)continue;for(const [index,levelKey] of levels.entries()){const name=`y${ri}_${g}_${row}_${index}`;binaries.push(name);rowVars.push(name);const left=opts.filter(p=>p.grades.includes(levelKey)),right=next.filter(p=>p.grades.includes(levelKey));const terms=[...left,...right].map(p=>p.name);lines.push(`${name}${terms.length?' - '+terms.join(' - '):''} >= -1`);hints[name]=Number(left.some(p=>hints[p.name])&&right.some(p=>hints[p.name]));}}
  layouts.push(rowMap);
 });
 if(mode!=='room')for(let t=0;t<types.length;t++)add(typeTerms[t],'=',t===empty?rooms.reduce((n,r)=>n+r.capacity,0)-students.length:students.filter(s=>key(s)===types[t].key).length);
 if(limitRows!==undefined)add(rowVars.map(v=>[v,1]),'<=',limitRows);
 // Any single subject of one grade occupies at most one seat per bench.
 // Its excess over independent row positions is a valid lower bound.
 let lower=0;
 if(flags.side){const bounds=new Map();for(const s of students){const k=JSON.stringify([s.grade,s.examSubject]);bounds.set(k,(bounds.get(k)||0)+1);}let free=0;for(const r of rooms){const gs=new Map();for(const c of r.geometry.cells.filter(c=>c.side===0&&c.seat<=r.capacity-(r.useTeacherDesk?1:0))){if(!gs.has(c.g))gs.set(c.g,[]);gs.get(c.g).push(c.row);}for(const rows of gs.values()){rows.sort((a,b)=>a-b);let last=-Infinity;for(const row of rows)if(row>last+1){free++;last=row;}}if(r.useTeacherDesk)free++;}for(const n of bounds.values())lower=Math.max(lower,n-free);}
 if(lower>0)add(rowVars.map(v=>[v,1]),'>=',lower);
 const lp=`Minimize\n obj: ${rowVars.length?rowVars.join(' + '):'0'}\nSubject To\n${lines.map((c,i)=>` c${i}: ${c}`).join('\n')}\nBinary\n ${binaries.join(' ')}\nEnd`;
 return {lp,types,patterns,hints,rowVars,lower};
}
function solveTypeJob(highs,job) {
 const built=makeTypeModel(job);let model;
 try {
  model=highs.createModel({format:'lp',data:built.lp});model.options.set({output_flag:false,time_limit:job.seconds||3,mip_rel_gap:0,random_seed:job.seed||1});
  const n=model.getDimensions().numCols;const names=Array.from({length:n},(_,i)=>model.getColName(i));
  model.setSolution({colValue:names.map(name=>built.hints[name]||0)});
  const status=model.run().modelStatus;
  if(model.info.get('primal_solution_status')!==2)return {status,feasible:false};
  const vals=model.getSolution().colValue,columns=new Map(names.map((name,i)=>[name,vals[i]]));
  const chosen=built.patterns.filter(p=>columns.get(p.name)>.5);
  const assignments=job.rooms.map(()=>[]);
  // Choose left/right orientations with an exact two-state DP per column.
  for(let ri=0;ri<job.rooms.length;ri++){
   const groups=new Map();for(const p of chosen.filter(p=>p.ri===ri)){const g=p.pos==='desk'?'desk':p.pos.split(':')[0];if(!groups.has(g))groups.set(g,[]);groups.get(g).push(p);}
   for(const [g,ps] of groups){ps.sort((a,b)=>Number(a.pos.split(':')[1]||0)-Number(b.pos.split(':')[1]||0));let prev=[];const stages=[];
    for(let i=0;i<ps.length;i++){const p=ps[i];const cur=p.orientations.map((o,k)=>{let best={cost:Infinity,from:0};if(i===0)return {cost:0,from:0};for(let j=0;j<prev.length;j++){let penalty=0;const before=ps[i-1].orientations[j];if(job.flags.diagonal&&g!=='desk'&&Number(p.pos.split(':')[1])===Number(ps[i-1].pos.split(':')[1])+1){for(let side=0;side<o.length;side++){const other=1-side;if(other<before.length){const a=built.types[o[side]],b=built.types[before[other]];if(a.grade!==null&&a.grade===b.grade)penalty++;}}}const cost=prev[j].cost+penalty;if(cost<best.cost)best={cost,from:j};}return best;});stages.push(cur);prev=cur;}
    let idx=prev.reduce((best,v,i)=>v.cost<prev[best].cost?i:best,0);
    for(let i=ps.length-1;i>=0;i--){const p=ps[i],o=p.orientations[idx];p.seats.forEach((seat,k)=>assignments[ri].push({seat,type:built.types[o[k]]}));idx=stages[i][idx].from;}
   }
  }
  return {status,feasible:true,optimal:status===7,objective:model.getObjectiveValue(),assignments,lower:built.lower};
 }finally{model?.dispose();}
}
if(typeof module!=='undefined')module.exports={makeTypeModel,solveTypeJob};
