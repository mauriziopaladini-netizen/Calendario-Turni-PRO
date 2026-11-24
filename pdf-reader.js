(function(){
const $=id=>document.getElementById(id);
let latest=null;
const months=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function status(t){$('pdfStatus').textContent=t}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function normalized(code){const m=String(code).match(/^H(\d{1,3})$/i);return m?String(Number(m[1])/2):code}
function parseMonth(text,name){let m=text.match(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/i)||String(name).match(/(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)[ _-]*(20\d{2})/i);return m?{month:months.indexOf(m[1].toLowerCase())+1,monthName:m[1],year:Number(m[2])}:null}
function detectRows(lines){
 const codeRe=/^(?:H\d{1,3}|M\d{0,2}|P\d{0,2}|N\d{0,2}|R\d?|RZ|RIP|RIPOSO|OFF|FER|FEST|F\d{0,2}|SM\d{0,2}|TRN|[A-Z]{1,3}\d{0,2})$/i;
 const rows=[],seen=new Set();
 for(const line of lines){
  const clean=line.replace(/\s+/g,' ').trim(); if(!clean)continue;
  const id=clean.match(/^(\d{4,6})\s+(.+)$/); if(!id||seen.has(id[1]))continue;
  const tokens=id[2].split(/\s+/); const first=tokens.findIndex(t=>codeRe.test(t));
  if(first<1)continue;
  const name=tokens.slice(0,first).join(' '),codes=tokens.slice(first).filter(t=>codeRe.test(t));
  if(codes.length<5)continue;
  rows.push({id:id[1],name,codes:codes.map(code=>({original:code,converted:normalized(code)}))});seen.add(id[1]);
 }
 return rows;
}
async function read(){
 const f=$('rosterPdf').files[0];if(!f)return status('Seleziona prima un file PDF.');
 if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf')return status('Il file selezionato non sembra un PDF.');
 if(!window.pdfjsLib)return status('Il motore PDF non è disponibile. Controlla la connessione e ricarica la pagina.');
 try{
  $('readPdfBtn').disabled=true;status('Lettura del PDF in corso…');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
  let lines=[],full=[],pages=0;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent(),items=content.items.filter(x=>x.str&&x.str.trim()).map(x=>({str:x.str.trim(),x:x.transform[4],y:x.transform[5]})).sort((a,b)=>b.y-a.y||a.x-b.x);
   const rows=[];for(const it of items){let row=rows.find(r=>Math.abs(r.y-it.y)<=3);if(!row){row={y:it.y,items:[]};rows.push(row)}row.items.push(it)}
   rows.sort((a,b)=>b.y-a.y);
   const pageLines=rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean);
   lines.push(...pageLines);full.push(pageLines.join('\n'));pages++;
  }
  const raw=full.join('\n\n'),period=parseMonth(raw,f.name),employees=detectRows(lines);
  latest={fileName:f.name,pages,period,employees,raw,readAt:new Date().toISOString()};
  $('pdfMeta').classList.remove('hidden');$('pdfMeta').innerHTML='<span><b>File:</b> '+esc(f.name)+'</span><span><b>Pagine:</b> '+pages+'</span><span><b>Dipendenti riconosciuti:</b> '+employees.length+'</span><span><b>Periodo:</b> '+(period?esc(period.monthName)+' '+period.year:'non identificato')+'</span>';
  $('pdfTableWrap').classList.remove('hidden');$('pdfRawDetails').classList.remove('hidden');$('pdfRaw').textContent=raw;
  if(employees.length){$('pdfPreview').innerHTML='<table class="pdf-table"><thead><tr><th>Matricola</th><th>Nome / Cognome</th><th>Codici originali</th><th>Conversione H → ore</th><th>Codici rilevati</th></tr></thead><tbody>'+employees.map(e=>'<tr><td>'+esc(e.id)+'</td><td>'+esc(e.name)+'</td><td>'+e.codes.map(c=>'<span class="pdf-code">'+esc(c.original)+'</span>').join(' · ')+'</td><td>'+e.codes.map(c=>c.original.toUpperCase().startsWith('H')?esc(c.converted):'—').join(' · ')+'</td><td>'+e.codes.length+'</td></tr>').join('')+'</tbody></table><p class="muted">Anteprima automatica: controlla sempre i dati rispetto al PDF originale. I codici H vengono mostrati anche convertiti (es. H32 → 16); nessun dato è stato importato nel calendario.</p>'}
  else $('pdfPreview').innerHTML='<div class="pdf-empty">Il testo è stato estratto, ma non ho riconosciuto righe dipendente con sufficiente sicurezza. Controlla il testo estratto qui sotto: il formato del prospetto potrebbe richiedere un adattamento.</div>';
  status('Lettura completata. Il calendario non è stato modificato.');
 }catch(e){console.error(e);status('Non sono riuscito a leggere questo PDF. Se è una scansione fotografica potrebbe servire un modulo OCR.')}
 finally{$('readPdfBtn').disabled=false}
}
$('readPdfBtn').addEventListener('click',read);
$('exportRosterBtn').addEventListener('click',()=>{if(!latest)return;const blob=new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='estrazione-turni-'+(latest.period?latest.period.year+'-'+String(latest.period.month).padStart(2,'0'):'pdf')+'.json';a.click();URL.revokeObjectURL(a.href)});
})();