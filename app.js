(() => {
  'use strict';
  const KEY = 'headtrack.entries.v1';
  const options = {
    quality: ['Foggy', 'Heavy', 'Pressure', 'Numb / muted', 'Hazy', 'Other'],
    location: ['Forehead', 'Temples', 'Back of head', 'Top of head', 'One side', 'Whole head', 'Unsure'],
    symptom: ['Dizziness', 'Nausea', 'Light sensitivity', 'Sound sensitivity', 'Visual disturbance', 'Neck discomfort', 'Fatigue'],
    trigger: ['Poor sleep', 'Stress', 'Screen time', 'Dehydration', 'Missed meal', 'Exercise', 'Caffeine change', 'Unsure']
  };
  const labels = {
    log: ['How are you feeling?', 'Record a moment in under a minute. You can log headache and head dullness separately.'],
    history: ['Symptom history', 'Your check-ins, newest first. Edit or delete an entry whenever needed.'],
    insights: ['Patterns over time', 'See what you have recorded, without interpreting missing days as symptom-free.'],
    data: ['Your diary, your data', 'Back up, export and restore your entries.']
  };
  const $ = id => document.getElementById(id);
  let entries = [];
  let storageOK = true;
  const htmlSafe = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const localDatetime = (d = new Date()) => `${dateKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const displayDate = iso => new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));
  const displayTime = iso => new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit'}).format(new Date(iso));
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const asString = (v, max=3000) => typeof v === 'string' ? v.slice(0,max) : '';
  const validDate = s => typeof s === 'string' && !Number.isNaN(new Date(s).getTime());
  const clampScore = v => Number.isFinite(Number(v)) ? Math.min(10,Math.max(0,Math.round(Number(v)))) : 0;
  const listValid = (vals, key) => Array.isArray(vals) ? [...new Set(vals.filter(v => typeof v === 'string' && options[key].includes(v)))] : [];

  function cleanEntry(x) {
    if (!x || typeof x !== 'object' || !validDate(x.occurredAt)) return null;
    return {
      id: asString(x.id,100) || uid(),
      occurredAt: new Date(x.occurredAt).toISOString(),
      headache: clampScore(x.headache),
      dullness: clampScore(x.dullness),
      quality: listValid(x.quality,'quality'),
      location: listValid(x.location,'location'),
      symptom: listValid(x.symptom,'symptom'),
      trigger: listValid(x.trigger,'trigger'),
      duration: x.duration === null || x.duration === '' || x.duration === undefined ? null : Math.max(0,Math.min(100800,Math.round(Number(x.duration)||0))),
      impact: ['0','1','2','3'].includes(String(x.impact)) ? String(x.impact) : '',
      medication: asString(x.medication,160),
      notes: asString(x.notes)
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      entries = Array.isArray(parsed) ? parsed.map(cleanEntry).filter(Boolean) : [];
      sortEntries();
    } catch (err) {
      console.error('Could not read saved diary',err);
      storageOK = false;
      entries = [];
      alert('Could not access saved entries. Browser storage may be disabled or contain invalid data. Do not save new entries until this is resolved.');
    }
  }
  function persist() {
    if (!storageOK) throw Error('Browser storage is unavailable.');
    try { localStorage.setItem(KEY, JSON.stringify(entries)); }
    catch (err) {throw Error('Save failed. Device storage may be full or blocked. Export a backup if possible.');}
  }
  function updateEntries(next) {
    const old=entries;
    entries=next;
    sortEntries();
    try {persist();renderHistory();renderInsights();}
    catch(err){entries=old;throw err;}
  }
  function sortEntries() { entries.sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt)); }
  function setFeedback(id,msg,err=false) { const el=$(id);el.textContent=msg;el.style.color=err?'#b12635':'#006960'; }

  function initChoices() {
    for(const [name,vals] of Object.entries(options)) {
      $(name+'-choices').innerHTML=vals.map((s,i)=>{
        const id=`${name}-${i}`;
        return `<label class="chip"><input type="checkbox" id="${id}" name="${name}" value="${htmlSafe(s)}"><span>${htmlSafe(s)}</span></label>`;
      }).join('');
    }
  }
  const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el=>el.value);
  function setChecked(name,values) {
    for(const el of document.querySelectorAll(`input[name="${name}"]`)) el.checked=values.includes(el.value);
  }
  function updateSlider(id) {
    const el=$(id), val=Number(el.value);
    $(id+'-val').textContent=String(val);
    el.style.setProperty('--pct',`${val*10}%`);
  }
  function resetForm() {
    $('entry-form').reset();
    $('edit-id').value='';
    $('occurred-at').value=localDatetime();
    $('entry-heading').textContent='New check-in';
    $('save-btn').textContent='Save check-in';
    $('cancel-edit').hidden=true;
    for(const s of ['headache','dullness'])updateSlider(s);
    setFeedback('save-feedback','');
  }
  function showTab(tab) {
    if(!labels[tab])return;
    document.querySelectorAll('.tab').forEach(el=>{
      const active=el.dataset.tab===tab;
      el.classList.toggle('active',active);
      if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    for (const name of Object.keys(labels)) {
      $('view-'+name).hidden=name!==tab;
      $('view-'+name).classList.toggle('active',name===tab);
    }
    $('page-title').textContent=labels[tab][0];
    $('page-desc').textContent=labels[tab][1];
    if(tab==='history')renderHistory();
    if(tab==='insights')renderInsights();
    scrollTo({top:0,behavior:'instant'});
  }
  function handleSave(e) {
    e.preventDefault();
    if(!storageOK){setFeedback('save-feedback','Cannot save: browser storage is unavailable.',true);return;}
    const d=new Date($('occurred-at').value);
    if (Number.isNaN(d.getTime())) {setFeedback('save-feedback','Choose a valid date and time.',true);return;}
    const id=$('edit-id').value||uid();
    const item=cleanEntry({
      id,occurredAt:d.toISOString(),headache:$('headache').value,dullness:$('dullness').value,
      quality:checked('quality'),location:checked('location'),symptom:checked('symptom'),trigger:checked('trigger'),
      duration:$('duration').value,impact:$('impact').value,medication:$('medication').value,notes:$('notes').value
    });
    try {
      updateEntries([item,...entries.filter(x=>x.id!==id)]);
      resetForm();
      setFeedback('save-feedback','Saved on this device. Back up your data from the Data tab.');
    } catch(err) {setFeedback('save-feedback',err.message,true);}
  }
  function editItem(id) {
    const x=entries.find(e=>e.id===id);if(!x)return;
    showTab('log');
    $('edit-id').value=x.id;
    $('occurred-at').value=localDatetime(new Date(x.occurredAt));
    for(const s of ['headache','dullness']){$(s).value=x[s];updateSlider(s);}
    for(const s of ['quality','location','symptom','trigger'])setChecked(s,x[s]);
    $('duration').value=x.duration??'';
    $('impact').value=x.impact;
    $('medication').value=x.medication;
    $('notes').value=x.notes;
    $('entry-heading').textContent='Edit check-in';
    $('save-btn').textContent='Save changes';
    $('cancel-edit').hidden=false;
    $('occurred-at').focus({preventScroll:true});
  }
  function confirmAction(title,message) {
    const dialog=$('confirm-dialog');
    if(typeof dialog.showModal!=='function')return Promise.resolve(window.confirm(message));
    $('confirm-title').textContent=title;
    $('confirm-message').textContent=message;
    return new Promise(resolve=>{
      dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});
      dialog.showModal();
    });
  }
  async function deleteItem(id) {
    const x=entries.find(x=>x.id===id);if(!x)return;
    if(!await confirmAction('Delete entry?',`Delete the check-in from ${displayDate(x.occurredAt)} at ${displayTime(x.occurredAt)}? This cannot be undone without a backup.`))return;
    try{updateEntries(entries.filter(x=>x.id!==id));}catch(err){alert(err.message);}
  }
  function renderHistory() {
    const range=$('history-filter').value;
    const cutoff=range==='all'?-Infinity:Date.now()-Number(range)*86400000;
    const visible=entries.filter(x=>new Date(x.occurredAt).getTime()>=cutoff);
    $('entry-total').textContent=`${visible.length} ${visible.length===1?'entry':'entries'}`;
    $('entry-list').innerHTML=visible.length ? visible.map(x=>{
      const details=[];
      for(const [field,name] of [['quality','Feels like'],['location','Location'],['symptom','Other symptoms'],['trigger','Factors']])if(x[field].length)details.push(`${name}: ${htmlSafe(x[field].join(', '))}`);
      if(x.duration!==null)details.push(`Duration: ${x.duration} min`);
      if(x.impact!=='')details.push(`Activity impact: ${['None','Mild','Moderate','Severe'][Number(x.impact)]}`);
      if(x.medication)details.push(`Medication: ${htmlSafe(x.medication)}`);
      return `<article class="entry-card">
          <div class="entry-head"><div><div class="entry-date">${displayDate(x.occurredAt)}</div><div class="entry-time">${displayTime(x.occurredAt)}</div></div>
          <div class="scores"><span class="mini-score" title="Headache intensity">Pain ${x.headache}</span><span class="mini-score dull" title="Head dullness intensity">Dull ${x.dullness}</span></div></div>
          ${details.length?`<p class="entry-meta">${details.join(' · ')}</p>`:''}
          ${x.notes?`<p class="entry-note">${htmlSafe(x.notes)}</p>`:''}
          <div class="entry-actions"><button type="button" class="link-button" data-action="edit" data-id="${htmlSafe(x.id)}">Edit</button><button type="button" class="link-button danger" data-action="delete" data-id="${htmlSafe(x.id)}">Delete</button></div>
        </article>`;
    }).join('') : `<div class="empty">No entries in this period.<br>Use the Log tab to make a check-in.</div>`;
  }
  function renderInsights() {
    const recent=entries.filter(x=>new Date(x.occurredAt).getTime()>=Date.now()-30*86400000);
    $('stat-entries').textContent=recent.length;
    $('stat-headache-days').textContent=new Set(recent.filter(x=>x.headache>0).map(x=>dateKey(new Date(x.occurredAt)))).size;
    $('stat-dullness-days').textContent=new Set(recent.filter(x=>x.dullness>0).map(x=>dateKey(new Date(x.occurredAt)))).size;
    const avg = key => (recent.reduce((sum,x)=>sum+x[key],0)/recent.length).toFixed(1);
    $('stat-avg').textContent=recent.length?`${avg('headache')} / ${avg('dullness')}`:'—';
    const counts = new Map();
    for(const e of recent)for(const t of e.trigger)counts.set(t,(counts.get(t)||0)+1);
    const sorted = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    $('top-triggers').innerHTML=sorted.length ? sorted.map(([name,n])=>`<span class="factor-item">${htmlSafe(name)} · ${n}</span>`).join('') : '<span class="explain">No possible factors recorded yet.</span>';
    renderChart();
  }
  function renderChart() {
    const today=new Date();today.setHours(0,0,0,0);
    const days=Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-13+i);return d;});
    const daily=new Map(days.map(d=>[dateKey(d),{headache:null,dullness:null}]));
    for(const e of entries){const key=dateKey(new Date(e.occurredAt));const item=daily.get(key);if(!item)continue;
      for(const k of ['headache','dullness'])item[k]=Math.max(item[k]??0,e[k]);}
    const values=days.map(d=>daily.get(dateKey(d)));
    const W=520,H=205,L=38,R=10,T=12,B=31;
    const xx=i=>L+i*(W-L-R)/13;
    const yy=v=>T+(10-v)*(H-T-B)/10;
    let svg=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    for(const v of [0,5,10])svg+=`<line x1="${L}" y1="${yy(v)}" x2="${W-R}" y2="${yy(v)}" stroke="#e1e9ef" stroke-dasharray="3 4"/><text x="${L-10}" y="${yy(v)+4}" font-size="12" text-anchor="end" fill="#8190a0">${v}</text>`;
    for(const [i,d] of days.entries())if(i===0||i===6||i===13)svg+=`<text x="${xx(i)}" y="${H-6}" font-size="12" text-anchor="${i===0?'start':i===13?'end':'middle'}" fill="#8190a0">${d.getDate()} ${d.toLocaleString('en-AU',{month:'short'})}</text>`;
    for(const [field,color] of [['headache','#058c84'],['dullness','#596cae']]){
      let current=[];
      function flush(){if(current.length>1)svg+=`<polyline points="${current.join(' ')}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;current=[];}
      values.forEach((v,i)=>{if(v[field]===null){flush();return;}current.push(`${xx(i)},${yy(v[field])}`);});flush();
      values.forEach((v,i)=>{if(v[field]!==null)svg+=`<circle cx="${xx(i)}" cy="${yy(v[field])}" r="4.1" stroke="white" stroke-width="1.5" fill="${color}"/>`;});
    }
    svg+='</svg>';
    $('trend-chart').innerHTML=svg;
    $('trend-chart').setAttribute('aria-label', `14-day intensity chart with ${values.filter(v=>v.headache!==null).length} recorded days. Teal represents daily highest headache intensity and blue represents daily highest dullness intensity. Days without check-ins are blank.`);
  }
  function csvEscape(value) {
    let s=Array.isArray(value)?value.join('; '):String(value??'');
    if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s; // Prevent spreadsheet formula execution.
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function buildCsv() {
    const fields=['occurredAt','headache','dullness','quality','location','symptom','trigger','duration','impact','medication','notes'];
    const header=['Date and time (ISO)','Headache (0-10)','Dullness (0-10)','Dullness qualities','Location','Other symptoms','Possible factors','Duration (minutes)','Activity impact (0-3)','Medication / treatment','Notes'];
    const rows=entries.map(e=>fields.map(key=>csvEscape(e[key])).join(','));
    return '\ufeff'+[header.map(csvEscape).join(','),...rows].join('\r\n');
  }
  async function exportFile(filename,content,mime) {
    const blob=new Blob([content],{type:mime});
    const file=new File([blob],filename,{type:mime});
    if(navigator.canShare?.({files:[file]}) && navigator.share){
      try { await navigator.share({files:[file],title:'HeadTrack diary backup'});return; }
      catch(err){if(err.name==='AbortError')return;}
    }
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    setFeedback('data-feedback','File prepared. If prompted, choose Save to Files.');
  }
  async function importFile(file) {
    if(!file)return;
    try {
      const content=await file.text();
      const raw=JSON.parse(content);
      if(!raw||raw.format!=='headtrack-backup'||raw.version!==1||!Array.isArray(raw.entries))throw Error('This is not a valid HeadTrack JSON backup.');
      const imported=raw.entries.map(cleanEntry);
      if(imported.some(e=>!e))throw Error('Some backup entries have invalid dates. Nothing was imported.');
      if(!await confirmAction('Import backup?',`Merge ${imported.length} entries from this backup? Entries with the same ID will be replaced.`))return;
      const combined=new Map(entries.map(e=>[e.id,e]));
      for(const e of imported)combined.set(e.id,e);
      updateEntries([...combined.values()]);
      setFeedback('data-feedback',`Import complete. ${imported.length} backup entries processed; ${entries.length} total entries now on this device.`);
    }catch(err){setFeedback('data-feedback',`Import failed: ${err.message}`,true);}
    finally{$('import-json').value='';}
  }
  async function clearAll(){
    if(!entries.length){setFeedback('data-feedback','There are no entries to delete.');return;}
    if(!await confirmAction('Delete all entries?',`Permanently delete all ${entries.length} entries on this device? Export a JSON backup first if you want to preserve them.`))return;
    try{updateEntries([]);setFeedback('data-feedback','All entries deleted from this device.');}catch(err){setFeedback('data-feedback',err.message,true);}
  }

  initChoices();
  load();
  resetForm();
  renderHistory();
  renderInsights();
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>showTab(tab.dataset.tab)));
  for(const id of ['headache','dullness'])$(id).addEventListener('input',()=>updateSlider(id));
  $('entry-form').addEventListener('submit',handleSave);
  $('cancel-edit').addEventListener('click',resetForm);
  $('history-filter').addEventListener('change',renderHistory);
  $('entry-list').addEventListener('click',e=>{
    const target=e.target.closest('button[data-action]');if(!target)return;
    if(target.dataset.action==='edit')editItem(target.dataset.id);
    if(target.dataset.action==='delete')deleteItem(target.dataset.id);
  });
  $('export-json').addEventListener('click',()=>{
    const data=JSON.stringify({format:'headtrack-backup',version:1,exportedAt:new Date().toISOString(),entries},null,2);
    exportFile(`headtrack-backup-${dateKey(new Date())}.json`,data,'application/json');
  });
  $('export-csv').addEventListener('click',()=>exportFile(`headtrack-entries-${dateKey(new Date())}.csv`,buildCsv(),'text/csv;charset=utf-8'));
  $('import-json').addEventListener('change',e=>importFile(e.target.files?.[0]));
  $('clear-data').addEventListener('click',clearAll);
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    navigator.serviceWorker.register('./sw.js').catch(err=>console.info('Offline cache could not be registered',err));
  }
})();
