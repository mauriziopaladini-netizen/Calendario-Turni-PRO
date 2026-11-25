(function(){
const $=id=>document.getElementById(id);
let latest=null;
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const codeRe=/^(?:H\d{1,3}|R\d?|RZ|RIP|RIPOSO|OFF|FER|FEST|F\d{0,2}|SM\d{0,2}|TRN|\*{3}|[A-Z]{1,3}\d{0,2})$/i;
function status(t){$('pdfStatus').textContent=t}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalized(code){const m=String(code).match(/^H(\d{1,3})$/i);return m?String(Number(m[1])/2):code}
function parseMonth(text,name){let m=text.match(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/i)||String(name).match(/(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)[ _-]*(20\d{2})/i);return m?{month:months.indexOf(m[1].toLowerCase())+1,monthName:m[1],year:Number(m[2])}:null}
function detectRows(lines){
 const rows=[],seen=new Set();
 for(const line of lines){
  const tokens=line.replace(/\s+/g,' ').trim().split(/\s+/);if(tokens.length<7)continue;
  const first=tokens.findIndex(t=>codeRe.test(t));
  if(first<1)continue;
  const prefix=tokens.slice(0,first);
  const id=/^\d{4,6}$/.test(prefix[0])?prefix[0]:null;
  const names=id?prefix.slice(1):prefix;
  if(!names.length)continue;
  const name=names.join(' ').replace(/\s+/g,' ').trim();
  const codes=tokens.slice(first).filter(t=>codeRe.test(t));
  if(codes.length<5)continue;
  const key=(id||name.toLocaleUpperCase('it-IT'));
  if(seen.has(key))continue;
  seen.add(key);
  rows.push({id,name,codes:codes.map(code=>({original:code,converted:normalized(code)})),days:codes.length});
 }
 return rows;
}

function renderColleagueControls(employees){
 const box=$('colleagueCompare');box.classList.remove('hidden');
 $('myEmployee').innerHTML='<option value="">Seleziona il tuo nominativo</option>'+employees.map((e,i)=>'<option value="'+i+'">'+esc(e.name)+(e.id?' · '+esc(e.id):'')+'</option>').join('');
 $('colleagueChoices').innerHTML=employees.map((e,i)=>'<label class="colleague-choice"><input type="checkbox" value="'+i+'" class="colleague-check"><span>'+esc(e.name)+(e.id?' <small>· '+esc(e.id)+'</small>':'')+'</span></label>').join('');
 $('compareResult').classList.add('hidden');
}
function compareColleagues(){
 if(!latest)return;
 const ownValue=$('myEmployee').value;
 if(ownValue==='')return status('Seleziona prima il tuo nominativo.');
 const ownIndex=Number(ownValue),own=latest.employees[ownIndex];
 const selected=[...document.querySelectorAll('.colleague-check:checked')].map(x=>Number(x.value)).filter(i=>i!==ownIndex);
 if(!selected.length)return status('Seleziona almeno un collega da confrontare.');
 const mode=$('compareFilter').value,maxDays=Math.max(own.days,...selected.map(i=>latest.employees[i].days)),rows=[];
 for(let day=0;day<maxDays;day++){
  const mine=own.codes[day]?.original||'—';
  const cells=selected.map(i=>{const colleague=latest.employees[i],code=colleague.codes[day]?.original||'—';return {code,same:mine===code}});
  if(mode==='same'&&!cells.some(c=>c.same))continue;
  if(mode==='different'&&!cells.some(c=>!c.same))continue;
  rows.push({day:day+1,mine,cells});
 }
 $('compareSummary').innerHTML=selected.map(i=>{
  const e=latest.employees[i],n=Math.max(own.days,e.days);let same=0,different=0;
  for(let d=0;d<n;d++){const a=own.codes[d]?.original||'—',b=e.codes[d]?.original||'—';if(a===b)same++;else different++}
  return '<div class="compare-summary"><b>'+esc(e.name)+'</b><span class="compare-same">'+same+' giorni uguali</span><span class="compare-different">'+different+' diversi</span></div>';
 }).join('');
 const head='<tr><th>Giorno</th><th>Tu · '+esc(own.name)+'</th>'+selected.map(i=>'<th>'+esc(latest.employees[i].name)+'</th>').join('')+'</tr>';
 const body=rows.map(r=>'<tr><th>'+String(r.day).padStart(2,'0')+'</th><td class="compare-own">'+esc(r.mine)+'</td>'+r.cells.map(c=>'<td class="'+(c.same?'is-same':'is-different')+'"><b>'+esc(c.code)+'</b><small>'+(c.same?'Uguale':'Diverso')+'</small></td>').join('')+'</tr>').join('');
 $('compareTable').innerHTML='<table class="pdf-table compare-table"><thead>'+head+'</thead><tbody>'+(body||'<tr><td colspan="'+(selected.length+2)+'">Nessuna giornata corrisponde al filtro selezionato.</td></tr>')+'</tbody></table>';
 $('compareResult').classList.remove('hidden');
 status('Confronto pronto: '+selected.length+' colleghi confrontati con '+own.name+'.');
}
async function read(){
 const f=$('rosterPdf').files[0];if(!f)return status('Seleziona prima un file PDF.');
 if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf')return status('Il file selezionato non sembra un PDF.');
 if(!window.pdfjsLib)return status('Il motore PDF non è disponibile. Controlla la connessione e ricarica la pagina.');
 try{
  $('readPdfBtn').disabled=true;status('Lettura del PDF in corso…');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
  let lines=[],full=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent(),items=content.items.filter(x=>x.str&&x.str.trim()).map(x=>({str:x.str.trim(),x:x.transform[4],y:x.transform[5]})).sort((a,b)=>b.y-a.y||a.x-b.x);
   const rows=[];
   for(const it of items){let row=rows.find(r=>Math.abs(r.y-it.y)<=3);if(!row){row={y:it.y,items:[]};rows.push(row)}row.items.push(it)}
   rows.sort((a,b)=>b.y-a.y);
   const pageLines=rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
   lines.push(...pageLines);full.push(pageLines.join('\n'));
  }
  const raw=full.join('\n\n'),period=parseMonth(raw,f.name),employees=detectRows(lines);
  const dayCounts=[...new Set(employees.map(e=>e.days))].sort((a,b)=>a-b);
  latest={fileName:f.name,pages:pdf.numPages,period,employees,raw,readAt:new Date().toISOString(),dayCounts};
  $('pdfMeta').classList.remove('hidden');
  $('pdfMeta').innerHTML='<span><b>File:</b> '+esc(f.name)+'</span><span><b>Pagine:</b> '+pdf.numPages+'</span><span><b>Dipendenti riconosciuti:</b> '+employees.length+'</span><span><b>Giorni per riga:</b> '+(dayCounts.join(', ')||'non rilevati')+'</span><span><b>Periodo:</b> '+(period?esc(period.monthName)+' '+period.year:'non identificato')+'</span>';
  $('pdfTableWrap').classList.remove('hidden');$('pdfRawDetails').classList.remove('hidden');$('pdfRaw').textContent=raw;
  if(employees.length){
   const maxDays=Math.max(...employees.map(e=>e.days));
   const headers=Array.from({length:maxDays},(_,i)=>'<th>'+String(i+1).padStart(2,'0')+'</th>').join('');
   const body=employees.map(e=>'<tr><td>'+esc(e.id||'—')+'</td><td>'+esc(e.name)+'</td>'+Array.from({length:maxDays},(_,i)=>{const c=e.codes[i];return '<td class="'+(c&&/^H\d/i.test(c.original)?'pdf-code':'')+'" title="'+(c?esc(c.original+(c.original.toUpperCase().startsWith('H')?' = '+c.converted+' ore':'')):'')+'">'+(c?esc(c.original)+(c.original.toUpperCase().startsWith('H')?'<small class="pdf-converted"> ('+esc(c.converted)+')</small>':''):'—')+'</td>'}).join('')+'</tr>').join('');
   $('pdfPreview').innerHTML='<table class="pdf-table"><thead><tr><th>Matricola</th><th>Dipendente</th>'+headers+'</tr></thead><tbody>'+body+'</tbody></table><p class="muted">Ogni colonna corrisponde al giorno del mese. I codici H sono mostrati anche convertiti (es. H32 → 16). Gli altri codici restano invariati. Scorri orizzontalmente la tabella per vedere tutti i giorni. Nessun turno è stato importato nel calendario.</p>';
  if(employees.length){renderColleagueControls(employees)}else{$('colleagueCompare').classList.add('hidden')}
  } else $('pdfPreview').innerHTML='<div class="pdf-empty">Il testo è stato estratto, ma non ho riconosciuto righe dipendente con sufficiente sicurezza. Controlla il testo estratto qui sotto: il formato del prospetto potrebbe richiedere un adattamento.</div>';
  status('Lettura completata. Il calendario non è stato modificato.');
 }catch(e){console.error(e);status('Non sono riuscito a leggere questo PDF. Se è una scansione fotografica potrebbe servire un modulo OCR.')}
 finally{$('readPdfBtn').disabled=false}
}
$('readPdfBtn').addEventListener('click',read);
$('compareBtn').addEventListener('click',compareColleagues);
$('compareFilter').addEventListener('change',()=>{if(!$('compareResult').classList.contains('hidden'))compareColleagues()});
$('exportRosterBtn').addEventListener('click',()=>{if(!latest)return;const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='estrazione-turni-'+(latest.period?latest.period.year+'-'+String(latest.period.month).padStart(2,'0'):'pdf')+'.json';a.click();URL.revokeObjectURL(a.href)});
})();