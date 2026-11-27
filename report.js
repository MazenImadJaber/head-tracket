/* Offline PDF generator for HeadTrack. No network, accounts or external dependencies. */
const HeadTrackReport = (() => {
  'use strict';
  const pdfText = s => String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const dKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtDate = s => new Date(s).toLocaleString('en-AU',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const average = (a,k) => {const b=a.filter(x=>x[k]!==null&&Number.isFinite(x[k]));return b.length?(b.reduce((s,e)=>s+e[k],0)/b.length).toFixed(1):'Not recorded';};
  const rgb = h => {const x=h.replace('#','');return [0,2,4].map(i=>(parseInt(x.slice(i,i+2),16)/255).toFixed(3)).join(' ');};
  function buildPdf({entries=[],days=30,createdAt=new Date()}={}) {
    if(![30,90].includes(days))throw Error('Choose 30 or 90 days.');
    const now=new Date(createdAt);if(Number.isNaN(now.getTime()))throw Error('Invalid report date.');
    const from=new Date(now);from.setHours(0,0,0,0);from.setDate(from.getDate()-days+1);
    const filtered=entries.filter(e=>Number.isFinite(Date.parse(e.occurredAt)) && Date.parse(e.occurredAt)>=from.getTime() && Date.parse(e.occurredAt)<=now.getTime()).sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
    const byDate=new Map();
    for(const e of filtered){const key=dKey(new Date(e.occurredAt)),r=byDate.get(key)||{headache:null,dullness:null};for(const f of ['headache','dullness'])if(e[f]!==null)r[f]=Math.max(r[f]??0,e[f]);byDate.set(key,r);}
    const headacheDays=[...byDate.values()].filter(x=>x.headache>0).length;
    const dullDays=[...byDate.values()].filter(x=>x.dullness>0).length;
    const freeDays=[...byDate.values()].filter(x=>x.headache===0&&x.dullness===0).length;
    const episodes=filtered.filter(x=>x.type==='episode'),completed=episodes.filter(x=>x.endedAt);
    const durations=completed.map(e=>(Date.parse(e.endedAt)-Date.parse(e.occurredAt))/60000).filter(x=>Number.isFinite(x)&&x>=0);
    const freq=(name)=>{const m=new Map();for(const e of filtered)for(const v of (e[name]||[]))m.set(v,(m.get(v)||0)+1);return [...m].sort((a,b)=>b[1]-a[1]);};
    const pages=[];let commands=[],y=0;
    const H=842,W=595,LEFT=48,RIGHT=547;
    function newPage(){if(commands.length)pages.push(commands.join('\n'));commands=['0.99 0.995 1 rg 0 0 595 842 re f'];y=790;}
    function line(x1,yy,x2,color='#dce6ec',thickness=.7){commands.push(`${rgb(color)} RG ${thickness} w ${x1} ${yy} m ${x2} ${yy} l S`);}
    function rect(x,y,w,h,col){commands.push(`${rgb(col)} rg ${x} ${y} ${w} ${h} re f`);}
    function text(s,x,yy,size=10,color='#25364c',bold=false){commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x} ${yy} Tm (${pdfText(s)}) Tj ET`);}
    function ensure(h=40){if(y-h<60){footer();newPage();}}
    function heading(s){ensure(48);text(s,LEFT,y,14,'#183e50',true);y-=12;line(LEFT,y-4,RIGHT);y-=25;}
    function wrap(s,maxChars=94){const out=[];for(const para of String(s||'').split(/\n/)){if(!para.trim()){out.push('');continue;}let row='';for(const word of para.split(/\s+/)){if((row+' '+word).trim().length>maxChars){if(row)out.push(row);row=word;}else row=(row+' '+word).trim();}if(row)out.push(row);}return out;}
    function paragraph(s,size=9.5){for(const a of wrap(s,size>9?93:105)){ensure(16);text(a,LEFT,y,size,'#445971');y-=15;}y-=7;}
    function metricRow(vals){ensure(78);const width=157,gap=15;for(const [i,[value,label]] of vals.entries()){const x=LEFT+i*(width+gap);rect(x,y-55,width,60,'#edf6f5');text(value,x+10,y-20,17,'#14635f',true);text(label,x+10,y-39,8,'#617586');}y-=78;}
    function listRows(rows,max=100){
      for(const [a,b] of rows.slice(0,max)){
        const leftLabel=String(a),wide=leftLabel.length>21;
        const lines=wrap(String(b),wide?94:71);
        ensure((wide?36:19)+15*Math.max(1,lines.length));
        text(leftLabel,LEFT,y,9,'#1f4857',true);
        const x=wide?LEFT+5:155, top=wide?y-17:y;
        for(let i=0;i<lines.length;i++)text(lines[i],x,top-15*i,9,'#495f70');
        y-=Math.max(wide?38:22,(wide?17:0)+lines.length*15+8);
        line(LEFT,y+4,RIGHT,'#edf1f4',.5);y-=5;
      }
    }
    function footer(){line(LEFT,45,RIGHT);text('HeadTrack | Private diary | Not a diagnosis | Blank days are unknown',LEFT,31,7.8,'#81919d');}
    newPage();
    text('HeadTrack',LEFT,y,24,'#145b63',true);y-=25;
    text('Migraine assessment diary - clinician summary',LEFT,y,12,'#324e64');y-=24;
    text(`Period: ${dKey(from)} to ${dKey(now)}   |   Generated: ${dKey(now)}   |   ${days} days`,LEFT,y,9,'#687b8c');y-=23;line(LEFT,y,RIGHT);y-=30;
    heading('At a glance');
    metricRow([[String(headacheDays),'Headache days'],[String(dullDays),'Dullness days'],[`${byDate.size} / ${days}`,'Days with entries']]);
    metricRow([[`${freeDays}`,'0/0 logged days'],[`${episodes.length}`,'Episodes started'],[`${days-byDate.size}`,'Unlogged days']]);
    paragraph(`Entries: ${filtered.length}. Average headache intensity: ${average(filtered,'headache')}/10. Average head dullness: ${average(filtered,'dullness')}/10. Completed episode duration (mean): ${durations.length?(durations.reduce((a,b)=>a+b,0)/durations.length/60).toFixed(1)+' hours':'Not recorded'}.`);
    heading('Recorded intensity pattern');
    // plot daily maxima; 90 days displayed as 13 weekly maxima to keep the chart readable.
    const dates=[];for(let i=0;i<days;i++){const d=new Date(from);d.setDate(d.getDate()+i);dates.push(d);}
    const points=[];
    for(let i=0;i<days;i+=(days===90?7:1)){
      const chunk=dates.slice(i,i+(days===90?7:1));const val={headache:null,dullness:null};
      for(const d of chunk){const r=byDate.get(dKey(d));if(r)for(const f of ['headache','dullness'])if(r[f]!==null)val[f]=Math.max(val[f]??0,r[f]);}
      points.push(val);
    }
    ensure(195);const cx=LEFT+38,cy=y-149,cw=446,ch=136;
    for(const v of [0,5,10]){const yy=cy+v/10*ch;line(cx,yy,cx+cw,'#e0e7eb');text(String(v),cx-25,yy-3,8,'#728495');}
    for(const [field,color] of [['headache','#058c84'],['dullness','#596cae']]){
      let prev=null;
      for(let i=0;i<points.length;i++){
        const v=points[i][field];if(v===null){prev=null;continue;}
        const x=cx+i*cw/Math.max(1,points.length-1),yy=cy+(v/10)*ch;
        if(prev){commands.push(`${rgb(color)} RG 1.8 w ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} m ${x.toFixed(2)} ${yy.toFixed(2)} l S`);}
        commands.push(`${rgb(color)} rg ${x.toFixed(2)} ${yy.toFixed(2)} 2.5 2.5 re f`);
        prev={x,y:yy};
      }
    }
    text(`${days===90?'Weekly':'Daily'} peak; gaps indicate no recorded scores.`,LEFT,y-165,8,'#6b7d8d');y-=193;
    ensure(28);text('Headache',LEFT,y,9,'#058c84',true);text('Head dullness',LEFT+110,y,9,'#596cae',true);y-=26;
    heading('Headache features for clinical review');
    const onset=filtered.filter(e=>e.headache>0&&(e.type==='episode'||!e.episodeId));
    const controls=filtered.filter(e=>e.type==='checkin'&&!e.episodeId&&e.headache===0);
    const symptomKeys=[['sided','Pain sides'],['pulsating','Throbbing / pulsating'],['activity','Worse with activity'],['nausea','Nausea / vomiting'],['light','Light sensitivity'],['sound','Sound sensitivity'],['aura','Possible aura']];
    listRows(symptomKeys.map(([key,label])=>{
      const known=onset.filter(e=>e.migraine?.[key]&&e.migraine[key]!=='unsure');
      const yes=known.filter(e=>e.migraine[key]===(key==='sided'?'one':'yes')).length;
      const detail=key==='sided'?'one-sided': 'Yes';
      return [label,`${yes} ${detail} / ${known.length} answered headache starts`];
    }),symptomKeys.length);
    heading('Possible exposures in the preceding 24 hours');
    paragraph('These are reported exposures, not proven migraine triggers. "Unanswered" and "unsure" are not treated as No. Linked progress check-ins are excluded from the comparison.');
    const factorNames=[...new Set(filtered.flatMap(e=>Object.keys(e.pre24||{})))];
    if(!factorNames.length)paragraph('No 24-hour exposure questions have been answered in this period. Older contributing-factor checkboxes were not asked as a 24-hour question.');
    else{
      const exposureSummary=(items,name)=>{const known=items.filter(e=>['yes','no'].includes(e.pre24?.[name]));return `${known.filter(e=>e.pre24[name]==='yes').length}/${known.length}`;};
      listRows(factorNames.map(name=>[name,`Headache starts: ${exposureSummary(onset,name)} Yes/known; no-headache: ${exposureSummary(controls,name)} Yes/known`]),factorNames.length);
    }
    heading('Food and drink diary notes');
    const loggedFoods=filtered.filter(e=>e.foodNotes&&e.foodNotes.trim());
    if(!loggedFoods.length)paragraph('No detailed food and drink notes recorded in this period.');
    else listRows(loggedFoods.slice(0,30).map(e=>[fmtDate(e.occurredAt),e.foodNotes.slice(0,500)]),30);
    heading('Commonly recorded factors and symptoms');
    for(const [name,label] of [['trigger','Older unstructured factors'],['symptom','Associated symptoms'],['quality','Sensation'],['location','Location']]){
      const rows=freq(name).slice(0,5).map(([v,n])=>`${v} (${n})`).join(', ');
      ensure(36);text(label,LEFT,y,9.3,'#1b5261',true);y-=15;
      for(const part of wrap(rows||'Not recorded',100)){ensure(16);text(part,LEFT,y,9,'#506576');y-=15;}y-=12;
    }
    heading('Interpretation limitations');
    paragraph('This report cannot diagnose or exclude migraine. Symptoms and headache duration are relevant to clinical assessment; exposure history alone is not diagnostic. A day without entries is unknown, not symptom-free. Triggers may be early symptoms; small samples and incomplete comparison days can mislead. Entries within an episode may repeat symptoms.');
    heading('Episode summary');
    if(!episodes.length)paragraph('No timed episodes were started in this period.');
    else listRows(episodes.slice(0,40).map(e=>[fmtDate(e.occurredAt),`${e.endedAt?'Finished '+fmtDate(e.endedAt):'Ongoing / no checkout'} | Pain ${e.headache??'N/R'}, dullness ${e.dullness??'N/R'} | ${filtered.filter(x=>x.episodeId===e.id).length} progress check-ins`]),40);
    heading('Recent symptom check-ins');
    if(!filtered.length)paragraph('No entries in this period.');
    else listRows(filtered.slice(0,70).map(e=>[fmtDate(e.occurredAt),`${e.type==='episode'?'Episode':'Check-in'} | Pain ${e.headache??'N/R'} /10; dullness ${e.dullness??'N/R'} /10; impact ${e.impact||'N/R'} | 24h Yes: ${Object.entries(e.pre24||{}).filter(([k,v])=>v==='yes').map(([k])=>k).join(', ')||'Not documented'}${e.notes?' | Note: '+e.notes.slice(0,120):''}`]),70);
    footer();pages.push(commands.join('\n'));
    // Small, dependency-free PDF 1.4 serialiser; all streams are printable ASCII.
    const objects=[];
    const add=val=>{objects.push(val);return objects.length;};
    const catalog=add('');const tree=add('');
    const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds=[];
    for(const stream of pages){
      const content=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      pageIds.push(add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`));
    }
    objects[catalog-1]=`<< /Type /Catalog /Pages ${tree} 0 R >>`;
    objects[tree-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    let doc='%PDF-1.4\n%HeadTrack\n',offsets=[0];
    for(let i=0;i<objects.length;i++){offsets.push(doc.length);doc+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
    const xref=doc.length;
    doc+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(const offset of offsets.slice(1))doc+=`${String(offset).padStart(10,'0')} 00000 n \n`;
    doc+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(doc);
  }
  return {buildPdf};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HeadTrackReport;
