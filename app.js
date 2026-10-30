(() => {
  'use strict';
  const KEY = 'headtrack.entries.v1';
  const FACTORS_KEY = 'headtrack.customFactors.v1';
  const EPISODES_KEY = 'headtrack.episodes.v1';
  const SYMPTOMS_KEY = 'headtrack.customSymptoms.v1';
  const REMINDERS_KEY = 'headtrack.reminders.v1';
  const options = {
    quality: ['Foggy', 'Heavy', 'Pressure', 'Numb / muted', 'Hazy', 'Throbbing', 'Tightness', 'Pulsating', 'Other'],
    location: ['Forehead', 'Temples', 'Behind eyes', 'Back of head', 'Top of head', 'One side', 'Whole head', 'Jaw', 'Unsure'],
    symptom: ['Dizziness', 'Nausea', 'Light sensitivity', 'Sound sensitivity', 'Visual disturbance', 'Neck discomfort', 'Fatigue', 'Trouble concentrating', 'Blurry vision'],
    trigger: ['Poor sleep', 'Stress', 'Screen time', 'Dehydration', 'Missed meal', 'Exercise', 'Caffeine change', 'Unsure']
  };
  const labels = {
    log: ['How are you feeling?', 'Record your symptoms as a quick check-in or a timed headache episode.'],
    history: ['Symptom history', 'Review all symptom records in one place.'],
    insights: ['Patterns over time', 'See what you have recorded, without interpreting missing days as symptom-free.'],
    data: ['Your diary, your data', 'Back up, export and restore your entries.']
  };
  const $ = id => document.getElementById(id);
  let entries = [];
  let customFactors = [];
  let customSymptoms = [];
  let reminders = { daily:false, time:'18:00', episodeMinutes:0, lastDaily:'', lastEpisode:'' };
  let calendarMonth = new Date(new Date().getFullYear(),new Date().getMonth(),1);
  let selectedCalendarDate = null;
  let storageOK = true;
  const htmlSafe = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  selectedCalendarDate=dateKey(new Date());
  const localDatetime = (d = new Date()) => `${dateKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const displayDate = iso => new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));
  const displayTime = iso => new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit'}).format(new Date(iso));
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const asString = (v, max=3000) => typeof v === 'string' ? v.slice(0,max) : '';
  const validDate = s => typeof s === 'string' && !Number.isNaN(new Date(s).getTime());
  const durationMs = e => Math.max(0,(e.endedAt ? Date.parse(e.endedAt) : Date.now()) - Date.parse(e.occurredAt));
  function formatDuration(milliseconds) {
    const minutes=Math.floor(milliseconds/60000);
    if(minutes<1)return 'Under 1 min';
    const days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60),mins=minutes%60;
    return [days?`${days}d`:null,hours?`${hours}h`:null,mins?`${mins}m`:null].filter(Boolean).join(' ');
  }
  const clampScore = v => Number.isFinite(Number(v)) ? Math.min(10,Math.max(0,Math.round(Number(v)))) : 0;
  const cleanFactor = v => typeof v === 'string' ? v.trim().replace(/\s+/g,' ').slice(0,60) : '';
  const isBuiltInFactor = value => options.trigger.some(f => f.toLocaleLowerCase() === value.toLocaleLowerCase());
  function uniqueFactors(values) {
    if(!Array.isArray(values))return [];
    const seen = new Set(options.trigger.map(v=>v.toLocaleLowerCase()));
    const result = [];
    for(const value of values){
      const factor = cleanFactor(value);
      const lower = factor.toLocaleLowerCase();
      if(!factor || seen.has(lower))continue;
      seen.add(lower);result.push(factor);
      if(result.length>=150)break;
    }
    return result;
  }
  function listValid(vals,key) {
    if(!Array.isArray(vals))return [];
    if(key==='trigger'||key==='symptom') {
      const seen=new Set();
      return vals.map(cleanFactor).filter(v=>{const lower=v.toLocaleLowerCase();if(!v||seen.has(lower))return false;seen.add(lower);return true;}).slice(0,150);
    }
    return [...new Set(vals.filter(v=>typeof v==='string' && options[key].includes(v)))];
  }
  const triggerChoices = () => [...options.trigger,...customFactors];
  const symptomChoices = () => [...options.symptom,...customSymptoms];
  const uniqueSymptoms = values => {
    if(!Array.isArray(values))return [];
    const seen=new Set(options.symptom.map(v=>v.toLocaleLowerCase()));
    const result=[];
    for(const value of values){const v=cleanFactor(value), key=v.toLocaleLowerCase();if(!v||seen.has(key))continue;seen.add(key);result.push(v);if(result.length>=150)break;}
    return result;
  };

  function cleanEntry(x) {
    if (!x || typeof x !== 'object' || !validDate(x.occurredAt)) return null;
    const type=x.type==='episode'?'episode':'checkin';
    const start=new Date(x.occurredAt).getTime();
    const end=type==='episode' && x.endedAt!=null ? (validDate(x.endedAt)?Date.parse(x.endedAt):NaN) : null;
    if(Number.isNaN(end)||(end!==null&&end<start))return null;
    const score=v => v==null || v==='' ? null : clampScore(v);
    const manualDuration = x.duration === null || x.duration === '' || x.duration === undefined ? null : Math.max(0,Math.min(100800,Math.round(Number(x.duration)||0)));
    return {
      id: asString(x.id,100) || uid(),
      type,
      episodeId: type==='checkin' ? asString(x.episodeId,100)||null : null,
      occurredAt: new Date(start).toISOString(),
      endedAt: type==='episode' ? (end===null?null:new Date(end).toISOString()) : null,
      headache: score(x.headache),
      dullness: score(x.dullness),
      quality: listValid(x.quality,'quality'),
      location: listValid(x.location,'location'),
      symptom: listValid(x.symptom,'symptom'),
      trigger: listValid(x.trigger,'trigger'),
      duration: type==='episode' ? (end===null?null:Math.round((end-start)/60000)) : manualDuration,
      impact: ['0','1','2','3'].includes(String(x.impact)) ? String(x.impact) : '',
      medication: asString(x.medication,160),
      notes: asString(x.notes)
    };
  }
  // The old v3 timer records only contained timestamps and notes.
  // Preserve missing symptoms as null, not as an invented zero score.
  function migrateLegacyEpisodes(items, existing=[]) {
    if(!Array.isArray(items))throw Error('Saved legacy episodes are invalid.');
    const used=new Set(existing.map(x=>x.id));
    const converted=[];
    for(const ep of items) {
      if(!ep || !validDate(ep.startedAt))throw Error('A legacy episode has an invalid start time.');
      const id=`v3-episode:${asString(ep.id,100)}`;
      if(used.has(id))continue; // Idempotent: safe after interrupted migrations or repeat imports.
      const entry=cleanEntry({id,type:'episode',occurredAt:ep.startedAt,endedAt:ep.endedAt,
        headache:null,dullness:null,quality:[],location:[],symptom:[],trigger:[],
        impact:'',medication:'',notes:ep.notes});
      if(!entry)throw Error('A legacy episode has invalid timestamps.');
      used.add(id);
      converted.push(entry);
    }
    return converted;
  }
  const activeEpisode = () => entries.find(e=>e.type==='episode' && e.endedAt===null);
  function validateEntries(items) {
    if(items.some(e=>!e))throw Error('Some records have invalid timestamps.');
    if(items.filter(e=>e.type==='episode'&&e.endedAt===null).length>1)
      throw Error('Only one active headache episode can exist at a time.');
  }
  function load() {
    try {
      const savedFactors = localStorage.getItem(FACTORS_KEY);
      const parsedFactors = savedFactors ? JSON.parse(savedFactors) : [];
      if(!Array.isArray(parsedFactors))throw Error('Saved custom factor list is invalid.');
      customFactors = uniqueFactors(parsedFactors);
      const rawSymptoms=localStorage.getItem(SYMPTOMS_KEY);
      const parsedSymptoms=rawSymptoms?JSON.parse(rawSymptoms):[];
      if(!Array.isArray(parsedSymptoms))throw Error('Saved custom symptoms list is invalid.');
      customSymptoms=uniqueSymptoms(parsedSymptoms);
      const rawReminder=localStorage.getItem(REMINDERS_KEY);
      if(rawReminder){try{const v=JSON.parse(rawReminder);if(v&&typeof v==='object')reminders={daily:v.daily===true,time:/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time)?v.time:'18:00',episodeMinutes:[0,60,120,240].includes(v.episodeMinutes)?v.episodeMinutes:0,lastDaily:asString(v.lastDaily,10),lastEpisode:asString(v.lastEpisode,120)};}catch(err){console.warn('Ignoring invalid reminder preferences',err);}}
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(parsed))throw Error('Saved entries are invalid.');
      entries = parsed.map(cleanEntry);
      validateEntries(entries);
      const rawEpisodes=localStorage.getItem(EPISODES_KEY);
      if(rawEpisodes){
        const oldEpisodes=JSON.parse(rawEpisodes);
        const converted=migrateLegacyEpisodes(oldEpisodes,entries);
        const merged=[...entries,...converted];
        validateEntries(merged);
        // Write the unified collection BEFORE removing the old key. If the
        // write fails, the original episode records remain intact.
        localStorage.setItem(KEY,JSON.stringify(merged));
        entries=merged;
        localStorage.removeItem(EPISODES_KEY);
      }
      sortEntries();
    } catch (err) {
      console.error('Could not read saved diary',err);
      storageOK = false;
      entries = [];
      alert('Could not access or migrate saved entries. Your original browser data has not been deliberately cleared. Export a backup from the previous version if needed; do not add new entries until this is resolved.');
    }
  }
  function persist() {
    if (!storageOK) throw Error('Browser storage is unavailable.');
    try { localStorage.setItem(KEY, JSON.stringify(entries)); }
    catch (err) {throw Error('Save failed. Device storage may be full or blocked. Export a backup if possible.');}
  }
  function persistFactors(factors) {
    if(!storageOK)throw Error('Browser storage is unavailable.');
    try{localStorage.setItem(FACTORS_KEY,JSON.stringify(factors));}
    catch(err){throw Error('Could not save your custom factors. Storage may be full or blocked.');}
  }
  function updateEntries(next) {
    const normalized=next.map(cleanEntry);
    validateEntries(normalized);
    const old=entries;
    entries=normalized;
    sortEntries();
    try {persist();renderEpisodeState();renderHistory();renderInsights();checkReminders();}
    catch(err){entries=old;renderEpisodeState();throw err;}
  }
  function updateFactors(next) {
    const cleaned=uniqueFactors(next);
    persistFactors(cleaned);
    customFactors=cleaned;
    renderChoices('trigger');
    renderFactorManager();
  }
  function sortEntries() { entries.sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt)); }
  function setFeedback(id,msg,err=false) { const el=$(id);el.textContent=msg;el.style.color=err?'#b12635':'#006960'; }

  function renderChoices(name, additionalSelected=[]) {
    const current=checked(name);
    const selected=new Set([...current,...additionalSelected]);
    const defaults=name==='trigger'?triggerChoices():name==='symptom'?symptomChoices():options[name];
    const vals=[...defaults,...additionalSelected.filter(v=>!defaults.includes(v))];
    $(name+'-choices').innerHTML=vals.map((s,i)=>{
      const id=`${name}-${i}`;
      return `<label class="chip"><input type="checkbox" id="${id}" name="${name}" value="${htmlSafe(s)}" ${selected.has(s)?'checked':''}><span>${htmlSafe(s)}</span></label>`;
    }).join('');
  }
  function initChoices() {
    for(const name of Object.keys(options))renderChoices(name);
  }
  function renderFactorManager() {
    const el=$('custom-factor-list');
    el.innerHTML=customFactors.length?customFactors.map((s,i)=>`<div class="saved-factor"><span>${htmlSafe(s)}</span><button type="button" data-remove-factor="${i}" aria-label="Remove ${htmlSafe(s)} from contributing factor choices">Remove</button></div>`).join(''):'<span class="empty-factors">No custom factors added yet.</span>';
  }
  function renderSymptomManager() {
    $('custom-symptom-list').innerHTML=customSymptoms.length?customSymptoms.map((s,i)=>`<div class="saved-factor"><span>${htmlSafe(s)}</span><button type="button" data-remove-symptom="${i}">Remove</button></div>`).join(''):'<span class="empty-factors">No custom symptoms added yet.</span>';
  }
  function updateSymptoms(next) {
    const cleaned=uniqueSymptoms(next);
    if(!storageOK)throw Error('Browser storage unavailable.');
    localStorage.setItem(SYMPTOMS_KEY,JSON.stringify(cleaned));
    customSymptoms=cleaned;
    renderChoices('symptom');renderSymptomManager();
  }
  function addSymptom() {
    const field=$('new-symptom'),symptom=cleanFactor(field.value);
    if(!symptom){setFeedback('symptom-feedback','Enter a symptom first.',true);return;}
    const duplicate=symptomChoices().find(s=>s.toLocaleLowerCase()===symptom.toLocaleLowerCase());
    if(duplicate){for(const el of document.querySelectorAll('input[name="symptom"]'))if(el.value===duplicate)el.checked=true;field.value='';setFeedback('symptom-feedback','Already available; selected for this check-in.');return;}
    try{if(customSymptoms.length>=150)throw Error('Maximum custom symptoms reached.');updateSymptoms([...customSymptoms,symptom]);for(const el of document.querySelectorAll('input[name="symptom"]'))if(el.value===symptom)el.checked=true;field.value='';setFeedback('symptom-feedback',`Added “${symptom}”.`);}
    catch(err){setFeedback('symptom-feedback',err.message,true);}
  }
  async function removeSymptom(index){
    const symptom=customSymptoms[index];if(!symptom)return;
    if(!await confirmAction('Remove custom symptom?',`Remove “${symptom}” from future choices? Previously saved entries remain unchanged.`))return;
    try{updateSymptoms(customSymptoms.filter((_,i)=>i!==index));setFeedback('data-feedback','Custom symptom removed.');}
    catch(err){setFeedback('data-feedback',err.message,true);}
  }
  function addFactor() {
    const field=$('new-factor');
    const factor=cleanFactor(field.value);
    if(!factor){setFeedback('factor-feedback','Enter a contributing factor first.',true);return;}
    const duplicate=triggerChoices().find(v=>v.toLocaleLowerCase()===factor.toLocaleLowerCase());
    if(duplicate){
      for(const el of document.querySelectorAll('input[name="trigger"]'))if(el.value===duplicate)el.checked=true;
      field.value='';setFeedback('factor-feedback',`“${duplicate}” is already listed and has been selected.`);return;
    }
    try {
      if(customFactors.length>=150)throw Error('Maximum of 150 custom factors reached.');
      updateFactors([...customFactors,factor]);
      for(const el of document.querySelectorAll('input[name="trigger"]'))if(el.value===factor)el.checked=true;
      field.value='';setFeedback('factor-feedback',`Added “${factor}” and selected it for this check-in.`);
    }catch(err){setFeedback('factor-feedback',err.message,true);}
  }
  async function removeFactor(index) {
    const factor=customFactors[index];if(!factor)return;
    if(!await confirmAction('Remove custom factor?',`Remove “${factor}” from your contributing factor choices? It will remain in previously saved check-ins.`))return;
    try{updateFactors(customFactors.filter((_,i)=>i!==index));setFeedback('data-feedback',`Removed “${factor}” from future choices. Older check-ins were preserved.`);}
    catch(err){setFeedback('data-feedback',err.message,true);}
  }
  const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el=>el.value);
  function setChecked(name,values) {
    for(const el of document.querySelectorAll(`input[name="${name}"]`)) el.checked=values.includes(el.value);
  }
  function updateSlider(id) {
    const el=$(id), val=Number(el.value);
    $(id+'-val').textContent=el.dataset.missing==='true'?'—':String(val);
    el.style.setProperty('--pct',`${val*10}%`);
  }
  function updateEpisodeElapsed() {
    const active=activeEpisode();
    if(active)$('episode-elapsed').textContent=formatDuration(durationMs(active));
  }
  function renderEpisodeState() {
    const active=activeEpisode();
    $('episode-idle').hidden=Boolean(active);
    $('episode-active').hidden=!active;
    $('episode-status').textContent=active?'In progress':'Not active';
    $('episode-status').classList.toggle('pill-active',Boolean(active));
    $('episode-start-form').hidden=Boolean(active)||Boolean($('edit-id').value);
    $('checkin-link-hint').textContent=active?'New check-ins are automatically linked to the currently active episode for progression tracking.':'';
    if(active){
      $('episode-start-time').textContent=`${displayDate(active.occurredAt)} · ${displayTime(active.occurredAt)}`;
      updateEpisodeElapsed();
    }
  }
  function collectEntry(id,type,occurredAt,endedAt=null) {
    return cleanEntry({
      id,type,occurredAt,endedAt,episodeId: type==='checkin' ? (entries.find(e=>e.id===id) ? (entries.find(e=>e.id===id).episodeId??null) : (activeEpisode() && Date.parse(occurredAt)>=Date.parse(activeEpisode().occurredAt)-60000 && Date.parse(occurredAt)<=Date.now()+60000 ? activeEpisode().id : null)) : null,
      headache:$('headache').dataset.missing==='true'?null:$('headache').value,
      dullness:$('dullness').dataset.missing==='true'?null:$('dullness').value,
      quality:checked('quality'),location:checked('location'),symptom:checked('symptom'),trigger:checked('trigger'),
      duration:$('duration').value,impact:$('impact').value,medication:$('medication').value,notes:$('notes').value
    });
  }
  function startEpisode() {
    if(!storageOK){setFeedback('episode-feedback','Cannot save: device storage is unavailable.',true);return;}
    if(activeEpisode()){setFeedback('episode-feedback','A headache episode is already active.',true);return;}
    if($('edit-id').value){setFeedback('episode-feedback','Save or cancel the entry you are editing before starting an episode.',true);return;}
    try {
      // Capture the same full symptom form used for a regular check-in.
      // Use the actual button time, rather than a potentially stale form default.
      const now=new Date().toISOString();
      const item=collectEntry(uid(),'episode',now,null);
      updateEntries([item,...entries]);
      resetForm();
      setFeedback('episode-feedback','Episode checked in with your symptom information. You can edit it in History.');
    }catch(err){setFeedback('episode-feedback',err.message,true);}
  }
  function stopEpisode() {
    const active=activeEpisode();
    if(!active){setFeedback('episode-feedback','There is no active episode to end.',true);return;}
    const now=new Date().toISOString();
    if(Date.parse(now)<Date.parse(active.occurredAt)){
      setFeedback('episode-feedback','Your device clock is earlier than the start time. Correct it in History.',true);return;
    }
    const ended={...active,endedAt:now};
    try {
      updateEntries(entries.map(e=>e.id===active.id?ended:e));
      setFeedback('episode-feedback',`Checked out. Duration: ${formatDuration(durationMs(ended))}. All your symptom details remain in the same entry.`);
    }catch(err){setFeedback('episode-feedback',err.message,true);}
  }
  function resetForm() {
    $('entry-form').reset();
    $('edit-id').value='';
    $('occurred-at').value=localDatetime();
    $('entry-heading').textContent='New check-in';
    $('save-btn').textContent='Save check-in';
    $('cancel-edit').hidden=true;
    $('episode-start-form').hidden=Boolean(activeEpisode());
    $('episode-edit-fields').hidden=true;
    $('duration-field').hidden=false;
    $('episode-end-at').value='';
    for(const s of ['headache','dullness']){delete $(s).dataset.missing;updateSlider(s);}
    renderChoices('trigger');
    renderChoices('symptom');
    $('more-details').open=false;
    setFeedback('symptom-feedback','');
    setFeedback('factor-feedback','');
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
    if(tab==='log')updateEpisodeElapsed();
    if(tab==='insights')renderInsights();
    scrollTo({top:0,behavior:'instant'});
  }
  function handleSave(e) {
    e.preventDefault();
    if(!storageOK){setFeedback('save-feedback','Cannot save: browser storage is unavailable.',true);return;}
    const d=new Date($('occurred-at').value);
    if (Number.isNaN(d.getTime())) {setFeedback('save-feedback','Choose a valid date and time.',true);return;}
    const id=$('edit-id').value||uid();
    const original=entries.find(x=>x.id===id);
    const type=original?.type||'checkin';
    let end=null;
    if(type==='episode'&&$('episode-end-at').value){
      const parsed=new Date($('episode-end-at').value);
      if(Number.isNaN(parsed.getTime())||parsed<d){setFeedback('save-feedback','The episode finish must not precede its start.',true);return;}
      end=parsed.toISOString();
    }
    if(type==='episode' && d.getTime()>Date.now()+60000){setFeedback('save-feedback','Episode start cannot be in the future.',true);return;}
    if(type==='episode' && end && Date.parse(end)>Date.now()+60000){setFeedback('save-feedback','Episode finish cannot be in the future.',true);return;}
    const item=collectEntry(id,type,d.toISOString(),end);
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
    for(const s of ['headache','dullness']){
      if(x[s]===null){$(s).value=0;$(s).dataset.missing='true';}
      else {$(s).value=x[s];delete $(s).dataset.missing;}
      updateSlider(s);
    }
    renderChoices('trigger',x.trigger);
    renderChoices('symptom',x.symptom);
    for(const s of ['quality','location','symptom','trigger'])setChecked(s,x[s]);
    $('duration').value=x.type==='episode'?'':(x.duration??'');
    $('duration-field').hidden=x.type==='episode';
    $('episode-edit-fields').hidden=x.type!=='episode';
    $('episode-end-at').value=x.type==='episode'&&x.endedAt?localDatetime(new Date(x.endedAt)):'';
    $('impact').value=x.impact;
    $('medication').value=x.medication;
    $('notes').value=x.notes;
    $('entry-heading').textContent=x.type==='episode'?'Edit headache episode':'Edit check-in';
    $('more-details').open=true;
    $('save-btn').textContent='Save changes';
    $('cancel-edit').hidden=false;
    $('episode-start-form').hidden=true;
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
  function renderHistory() {
    const range=$('history-filter').value;
    const cutoff=range==='all'?-Infinity:Date.now()-Number(range)*86400000;
    const visible=entries.filter(x=>Date.parse(x.occurredAt)>=cutoff || (x.type==='episode'&&x.endedAt===null));
    $('entry-total').textContent=`${visible.length} ${visible.length===1?'entry':'entries'}`;
    $('entry-list').innerHTML=visible.length ? visible.map(x=>{
      const details=[];
      for(const [field,name] of [['quality','Feels like'],['location','Location'],['symptom','Other symptoms'],['trigger','Factors']])if(x[field].length)details.push(`${name}: ${htmlSafe(x[field].join(', '))}`);
      if(x.type==='episode'){
        details.unshift(x.endedAt?`Checked out: ${displayDate(x.endedAt)} ${displayTime(x.endedAt)} · Duration: ${formatDuration(durationMs(x))}`:`Episode active · Elapsed: ${formatDuration(durationMs(x))}`);
      }else if(x.duration!==null){details.push(`Duration: ${x.duration} min`);}
      if(x.type==='checkin'&&x.episodeId){const ep=entries.find(e=>e.id===x.episodeId&&e.type==='episode');if(ep)details.push(`Progress check-in for ${displayDate(ep.occurredAt)} episode`);}
      if(x.impact!=='')details.push(`Activity impact: ${['None','Mild','Moderate','Severe'][Number(x.impact)]}`);
      if(x.medication)details.push(`Medication: ${htmlSafe(x.medication)}`);
      return `<article class="entry-card">
          <div class="entry-head"><div><div class="entry-date">${displayDate(x.occurredAt)}</div><div class="entry-time">${x.type==='episode'?'Episode started':'Check-in'} · ${displayTime(x.occurredAt)}${x.type==='episode'?(x.endedAt?' · Completed':' · Ongoing'):''}</div></div>
          <div class="scores"><span class="mini-score" title="Headache intensity">Pain ${x.headache??'—'}</span><span class="mini-score dull" title="Head dullness intensity">Dull ${x.dullness??'—'}</span></div></div>
          ${details.length?`<p class="entry-meta">${details.join(' · ')}</p>`:''}
          ${x.notes?`<p class="entry-note">${htmlSafe(x.notes)}</p>`:''}
          ${x.type==='episode'?episodeProgressHtml(x):''}
          <div class="entry-actions"><button type="button" class="link-button" data-action="edit" data-id="${htmlSafe(x.id)}">Edit</button><button type="button" class="link-button danger" data-action="delete" data-id="${htmlSafe(x.id)}">Delete</button></div>
        </article>`;
    }).join('') : '<div class="empty">No entries in this period. Use the Log tab to make a check-in or start an episode.</div>';
  }
  async function deleteItem(id) {
    const x=entries.find(x=>x.id===id);if(!x)return;
    if(!await confirmAction('Delete entry?',`Delete this ${x.type==='episode'?'headache episode':'check-in'} from ${displayDate(x.occurredAt)} at ${displayTime(x.occurredAt)}? This cannot be undone without a backup.`))return;
    try{updateEntries(entries.filter(x=>x.id!==id).map(y=>y.episodeId===id?{...y,episodeId:null}:y));}catch(err){alert(err.message);}
  }
  function dayOffset(n) {const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d;}
  const periodEntries = (days,offset=0) => {const from=dayOffset(-days+1-offset*days).getTime(),to=dayOffset(1-offset*days).getTime();return entries.filter(e=>{const t=Date.parse(e.occurredAt);return t>=from&&t<to;});};
  function daySummary(items) {
    const days=new Map();
    for(const e of items){const key=dateKey(new Date(e.occurredAt)),r=days.get(key)||{headache:null,dullness:null,triggers:new Set()};
      for(const f of ['headache','dullness'])if(e[f]!==null)r[f]=Math.max(r[f]??0,e[f]);
      for(const t of e.trigger)r.triggers.add(t);
      days.set(key,r);
    }
    return days;
  }
  function renderInsights() {
    const n=Number($('insights-range').value)||30,recent=periodEntries(n),prior=periodEntries(n,1),summaries=daySummary(recent);
    $('stat-entries').textContent=recent.length;
    $('stat-headache-days').textContent=[...summaries.values()].filter(x=>x.headache>0).length;
    $('stat-dullness-days').textContent=[...summaries.values()].filter(x=>x.dullness>0).length;
    const avg = key => {const known=recent.filter(x=>x[key]!==null);return known.length?(known.reduce((sum,x)=>sum+x[key],0)/known.length).toFixed(1):'—';};
    $('stat-avg').textContent=`${avg('headache')} / ${avg('dullness')}`;
    const ep=recent.filter(e=>e.type==='episode'),completed=ep.filter(e=>e.endedAt!==null);
    $('stat-episodes').textContent=ep.length;
    $('stat-episode-duration').textContent=completed.length?formatDuration(completed.reduce((t,e)=>t+durationMs(e),0)/completed.length):'—';
    const priorDays=[...daySummary(prior).values()].filter(x=>x.headache>0).length;
    const currentDays=[...summaries.values()].filter(x=>x.headache>0).length;
    const fullyWell=[...summaries.values()].filter(x=>x.headache===0&&x.dullness===0).length;
    $('compare-periods').textContent=`${summaries.size} of ${n} days have a check-in (${n-summaries.size} not logged); ${fullyWell} days have only 0/0 readings. Headache days: ${currentDays} in this period vs ${priorDays} in the preceding ${n} days. Differences may reflect logging frequency.`;
    const counts=new Map();for(const e of recent)for(const t of e.trigger)counts.set(t,(counts.get(t)||0)+1);
    const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
    $('top-triggers').innerHTML=sorted.length?sorted.map(([name,k])=>`<span class="factor-item">${htmlSafe(name)} · ${k} entries</span>`).join(''):'<span class="explain">No factors recorded yet.</span>';
    const association=[];
    for(const [factor] of sorted){
      const withFactor=[...summaries.values()].filter(x=>x.triggers.has(factor)&&x.headache!==null);
      const without=[...summaries.values()].filter(x=>!x.triggers.has(factor)&&x.headache!==null);
      if(withFactor.length<3||without.length<3)continue;
      const mean=a=>(a.reduce((t,x)=>t+x.headache,0)/a.length).toFixed(1);
      association.push(`<div class="association"><strong>${htmlSafe(factor)}</strong><span>With: ${mean(withFactor)}/10 (${withFactor.length} days) · Without: ${mean(without)}/10 (${without.length} days)</span></div>`);
    }
    $('factor-associations').innerHTML=association.length?association.join(''):'<p class="explain">Not enough comparisons yet. At least 3 logged days with and 3 without each factor are needed.</p>';
    renderChart(n);renderCalendar();
  }
  function makeLineChart(points,labels,width=520,height=200){
    const W=width,H=height,L=39,R=12,T=15,B=32,xx=i=>L+i*(W-L-R)/Math.max(1,points.length-1),yy=v=>T+(10-v)*(H-T-B)/10;
    let svg=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`;
    for(const v of [0,5,10])svg+=`<line x1="${L}" y1="${yy(v)}" x2="${W-R}" y2="${yy(v)}" stroke="#e1e9ef" stroke-dasharray="3 4"/><text x="${L-9}" y="${yy(v)+4}" font-size="12" text-anchor="end" fill="#8190a0">${v}</text>`;
    for(const i of [0,Math.floor((points.length-1)/2),points.length-1])if(points[i])svg+=`<text x="${xx(i)}" y="${H-5}" font-size="11" text-anchor="${i===0?'start':i===points.length-1?'end':'middle'}" fill="#8190a0">${htmlSafe(labels[i]||'')}</text>`;
    for(const [field,color] of [['headache','#058c84'],['dullness','#596cae']]){
      let line=[];
      function flush(){if(line.length>1)svg+=`<polyline points="${line.join(' ')}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>`;line=[];}
      points.forEach((v,i)=>{if(v[field]===null){flush();return;}line.push(`${xx(i)},${yy(v[field])}`);});flush();
      points.forEach((v,i)=>{if(v[field]!==null)svg+=`<circle cx="${xx(i)}" cy="${yy(v[field])}" r="3.5" fill="${color}" stroke="white" stroke-width="1.3"/>`;});
    }
    return svg+'</svg>';
  }
  function renderChart(n){
    const start=dayOffset(-n+1),dates=Array.from({length:n},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
    const byDay=daySummary(periodEntries(n));
    const weekly=n===90;
    let values=[],labels=[];
    if(weekly){
      for(let i=0;i<dates.length;i+=7){const chunk=dates.slice(i,i+7),rr={headache:null,dullness:null};
        for(const d of chunk){const v=byDay.get(dateKey(d));if(!v)continue;for(const f of ['headache','dullness'])if(v[f]!==null)rr[f]=Math.max(rr[f]??0,v[f]);}
        values.push(rr);labels.push(`${chunk[0].getDate()} ${chunk[0].toLocaleString('en-AU',{month:'short'})}`);
      }
    }else {values=dates.map(d=>byDay.get(dateKey(d))||{headache:null,dullness:null});labels=dates.map(d=>`${d.getDate()} ${d.toLocaleString('en-AU',{month:'short'})}`);}
    $('trend-heading').textContent=`${n}-day intensity trend`;
    $('trend-note').textContent=weekly?'Highest recorded intensity per 7-day window. Empty windows mean no data.':'Daily highest recorded intensity. Gaps mean no entry was recorded.';
    $('trend-chart').innerHTML=makeLineChart(values,labels);
    $('trend-chart').setAttribute('aria-label',`${n}-day chart with ${values.filter(x=>x.headache!==null).length} intervals containing headache scores. Teal is headache and blue is dullness.`);
  }
  function episodeProgressHtml(ep){
    const related=entries.filter(x=>x.type==='checkin'&&x.episodeId===ep.id).sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt));
    if(!related.length)return '<p class="chart-note">No additional check-ins linked to this episode.</p>';
    const points=[ep,...related].map(x=>({headache:x.headache,dullness:x.dullness}));
    const labels=[ep,...related].map(x=>displayTime(x.occurredAt));
    return `<details class="progress-details"><summary>View progression (${related.length} additional check-in${related.length===1?'':'s'})</summary><div class="legend"><span><i class="dot headache-dot"></i>Headache</span><span><i class="dot dullness-dot"></i>Dullness</span></div><div class="chart">${makeLineChart(points,labels)}</div><ol class="progress-items">${related.map(x=>`<li>${displayDate(x.occurredAt)} ${displayTime(x.occurredAt)} · Pain ${x.headache??'—'} / dullness ${x.dullness??'—'}</li>`).join('')}</ol></details>`;
  }
  function renderCalendar(){
    const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),today=new Date(),last=new Date(y,m+1,0).getDate(),offset=(new Date(y,m,1).getDay()+6)%7;
    $('cal-month').textContent=calendarMonth.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
    $('cal-next').disabled=(y===today.getFullYear()&&m===today.getMonth());
    const summaries=daySummary(entries);
    let html=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(s=>`<span class="weekday">${s}</span>`).join('');
    for(let i=0;i<offset;i++)html+='<span></span>';
    for(let day=1;day<=last;day++){
      const d=new Date(y,m,day),key=dateKey(d),r=summaries.get(key),future=d>today;
      const klass=future?'future':!r?'unknown':r.headache>0?'has-headache':r.dullness>0?'has-dullness':r.headache===0&&r.dullness===0?'has-well':'partial';
      html+=`<button type="button" class="cal-day ${klass} ${key===selectedCalendarDate?'selected':''}" data-date="${key}" ${future?'disabled':''} aria-label="${key}: ${r?(r.headache>0?'Headache logged':r.dullness>0?'Dullness logged':r.headache===0&&r.dullness===0?'No symptoms recorded':'Some scores missing'):'No entry recorded'}">${day}</button>`;
    }
    $('calendar-grid').innerHTML=html;
    const r=summaries.get(selectedCalendarDate);
    $('calendar-details').textContent=r?`${selectedCalendarDate}: highest headache ${r.headache??'not recorded'}/10, dullness ${r.dullness??'not recorded'}/10.`:`${selectedCalendarDate}: no check-in recorded (not necessarily symptom-free).`;
  }
  function csvEscape(value) {
    let s=Array.isArray(value)?value.join('; '):String(value??'');
    if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s; // Prevent spreadsheet formula execution.
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function buildCsv() {
    const fields=['type','episodeId','occurredAt','endedAt','headache','dullness','quality','location','symptom','trigger','duration','impact','medication','notes'];
    const header=['Entry type','Linked episode ID','Check-in / start (ISO)','Check-out / finish (ISO)','Headache (0-10)','Dullness (0-10)','Dullness qualities','Location','Other symptoms','Possible factors','Duration (minutes)','Activity impact (0-3)','Medication / treatment','Notes'];
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
      const raw=JSON.parse(await file.text());
      if(!raw||raw.format!=='headtrack-backup'||![1,2,3,4,5].includes(raw.version)||!Array.isArray(raw.entries))throw Error('This is not a valid HeadTrack JSON backup.');
      if(raw.version>=2&&!Array.isArray(raw.customFactors))throw Error('The backup has an invalid custom factor list.');
      if(raw.entries.length>50000)throw Error('This backup contains too many entries.');
      if(raw.version===3&&!Array.isArray(raw.episodes))throw Error('The backup has an invalid episode list.');
      const imported=raw.entries.map(cleanEntry);
      validateEntries(imported);
      const converted=raw.version===3?migrateLegacyEpisodes(raw.episodes,imported):[];
      if(imported.length+converted.length>50000)throw Error('This backup contains too many records.');
      const fromBackup=raw.version>=2?raw.customFactors:imported.flatMap(e=>e.trigger.filter(t=>!isBuiltInFactor(t)));
      if(raw.version===5 && !Array.isArray(raw.customSymptoms))throw Error('The backup has an invalid custom symptoms list.');
      const nextSymptoms=uniqueSymptoms([...customSymptoms,...(raw.version===5?raw.customSymptoms:imported.flatMap(e=>e.symptom.filter(t=>!options.symptom.includes(t))))]);
      const nextFactors=uniqueFactors([...customFactors,...fromBackup]);
      const combined=new Map(entries.map(e=>[e.id,e]));
      for(const e of [...imported,...converted])combined.set(e.id,e);
      validateEntries([...combined.values()]);
      if(!await confirmAction('Import backup?',`Merge ${imported.length+converted.length} records and ${nextFactors.length-customFactors.length} new factors? Entries with matching IDs are replaced by the backup. Other local records remain.`))return;
      updateEntries([...combined.values()]);
      try {updateFactors(nextFactors);updateSymptoms(nextSymptoms);}
      catch(err){setFeedback('data-feedback',`Records imported (${entries.length} total), but custom factors could not be saved: ${err.message}`,true);return;}
      resetForm();
      setFeedback('data-feedback',`Backup restored. You now have ${entries.length} entries, including ${entries.filter(e=>e.type==='episode').length} timed episodes, and ${customFactors.length} custom factors.`);
    }catch(err){setFeedback('data-feedback',`Import failed: ${err.message}`,true);}
    finally{$('import-json').value='';}
  }
  async function clearAll(){
    if(!entries.length){setFeedback('data-feedback','There are no entries to delete.');return;}
    if(!await confirmAction('Delete all records?',`Permanently delete all ${entries.length} entries, including headache episodes? Export a JSON backup first if you want to preserve them.`))return;
    try{updateEntries([]);setFeedback('data-feedback','All check-ins and episodes deleted from this device.');}catch(err){setFeedback('data-feedback',err.message,true);}
  }

  function loadReminderControls(){
    $('daily-reminder').value=reminders.daily?'on':'off';
    $('reminder-time').value=reminders.time;
    $('episode-reminder').value=String(reminders.episodeMinutes);
  }
  function saveReminders(){
    const tm=$('reminder-time').value;
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(tm)){setFeedback('data-feedback','Choose a valid reminder time.',true);return;}
    reminders={...reminders,daily:$('daily-reminder').value==='on',time:tm,episodeMinutes:Number($('episode-reminder').value),lastDaily:'',lastEpisode:''};
    try{localStorage.setItem(REMINDERS_KEY,JSON.stringify(reminders));setFeedback('data-feedback','Reminder preferences saved. Reminders appear only while the app is open or when you return to it.');checkReminders();}
    catch(err){setFeedback('data-feedback','Could not save reminders.',true);}
  }
  function checkReminders(){
    if(!storageOK)return;
    const now=new Date(),today=dateKey(now),hhmm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    let message='',which='';
    const active=activeEpisode();
    if(active && reminders.episodeMinutes>0 && durationMs(active)>=reminders.episodeMinutes*60000){
      const bucket=Math.floor(durationMs(active)/(reminders.episodeMinutes*60000));
      const id=`${active.id}:${bucket}`;
      if(reminders.lastEpisode!==id){message='Your headache episode is still active. Consider recording a progress check-in or checking out if it has ended.';reminders.lastEpisode=id;which='episode';}
    }
    if(!message&&reminders.daily&&hhmm>=reminders.time&&!entries.some(e=>dateKey(new Date(e.occurredAt))===today)&&reminders.lastDaily!==today){
      message='No symptoms recorded today. Consider making a quick check-in, including 0/0 if you have no symptoms.';reminders.lastDaily=today;which='daily';
    }
    if(message){
      $('reminder-message').textContent=message;$('reminder-banner').hidden=false;
      try{localStorage.setItem(REMINDERS_KEY,JSON.stringify(reminders));}catch(err){console.warn('Could not store reminder acknowledgement',err);}
    }
  }
  load();
  initChoices();
  renderEpisodeState();
  renderFactorManager();
  renderSymptomManager();
  loadReminderControls();
  resetForm();
  renderHistory();
  renderInsights();
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>showTab(tab.dataset.tab)));
  for(const id of ['headache','dullness'])$(id).addEventListener('input',()=>{delete $(id).dataset.missing;updateSlider(id);});
  $('entry-form').addEventListener('submit',handleSave);
  $('episode-start').addEventListener('click',startEpisode);
  $('episode-start-form').addEventListener('click',startEpisode);
  $('episode-stop').addEventListener('click',stopEpisode);
  $('episode-progress').addEventListener('click',()=>{resetForm();$('more-details').open=true;$('occurred-at').scrollIntoView({behavior:'smooth',block:'center'});});
  $('quick-well').addEventListener('click',()=>{
    if(!storageOK)return setFeedback('save-feedback','Storage unavailable.',true);
    try{const active=activeEpisode(),item=cleanEntry({id:uid(),type:'checkin',occurredAt:new Date().toISOString(),episodeId:active?.id||null,headache:0,dullness:0});updateEntries([item,...entries]);setFeedback('save-feedback','No symptoms now (0/0) recorded.');}
    catch(err){setFeedback('save-feedback',err.message,true);}
  });
  $('episode-edit-active').addEventListener('click',()=>{const active=activeEpisode();if(active)editItem(active.id);});
  setInterval(()=>{updateEpisodeElapsed();checkReminders();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateEpisodeElapsed();checkReminders();}});
  window.addEventListener('pageshow',()=>{updateEpisodeElapsed();checkReminders();});
  $('add-factor').addEventListener('click',addFactor);
  $('add-symptom').addEventListener('click',addSymptom);
  $('new-symptom').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addSymptom();}});
  $('custom-symptom-list').addEventListener('click',e=>{const b=e.target.closest('button[data-remove-symptom]');if(b)removeSymptom(Number(b.dataset.removeSymptom));});
  $('new-factor').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addFactor();}});
  $('custom-factor-list').addEventListener('click',e=>{const button=e.target.closest('button[data-remove-factor]');if(button)removeFactor(Number(button.dataset.removeFactor));});
  $('cancel-edit').addEventListener('click',resetForm);
  $('history-filter').addEventListener('change',renderHistory);
  $('insights-range').addEventListener('change',renderInsights);
  $('cal-prev').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);selectedCalendarDate=dateKey(calendarMonth);renderCalendar();});
  $('cal-next').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);selectedCalendarDate=dateKey(calendarMonth);renderCalendar();});
  $('calendar-grid').addEventListener('click',e=>{const b=e.target.closest('button[data-date]');if(b){selectedCalendarDate=b.dataset.date;renderCalendar();}});
  $('save-reminders').addEventListener('click',saveReminders);
  $('dismiss-reminder').addEventListener('click',()=>{$('reminder-banner').hidden=true;});
  $('export-pdf').addEventListener('click',()=>{
    try{const n=Number($('report-range').value),bytes=HeadTrackReport.buildPdf({entries:periodEntries(n),days:n,createdAt:new Date()});exportFile(`headtrack-gp-summary-${n}d-${dateKey(new Date())}.pdf`,bytes,'application/pdf');setFeedback('data-feedback','PDF report prepared on this device.');}
    catch(err){setFeedback('data-feedback',`Could not create PDF: ${err.message}`,true);}
  });
  $('entry-list').addEventListener('click',e=>{
    const target=e.target.closest('button[data-action]');if(!target)return;
    if(target.dataset.action==='edit')editItem(target.dataset.id);
    if(target.dataset.action==='delete')deleteItem(target.dataset.id);
  });
  $('export-json').addEventListener('click',()=>{
    const data=JSON.stringify({format:'headtrack-backup',version:5,exportedAt:new Date().toISOString(),customFactors,customSymptoms,entries},null,2);
    exportFile(`headtrack-backup-${dateKey(new Date())}.json`,data,'application/json');
  });
  $('export-csv').addEventListener('click',()=>exportFile(`headtrack-entries-${dateKey(new Date())}.csv`,buildCsv(),'text/csv;charset=utf-8'));
  $('import-json').addEventListener('change',e=>importFile(e.target.files?.[0]));
  $('clear-data').addEventListener('click',clearAll);
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    navigator.serviceWorker.register('./sw.js').catch(err=>console.info('Offline cache could not be registered',err));
  }
})();
