// Wall intervals are unioned, never added: background work may overlap MCP calls.
export function unionIntervals(intervals){
 const merged=[];
 for(const [start,end] of intervals.filter(([s,e])=>Number.isFinite(s)&&Number.isFinite(e)&&e>=s).sort((a,b)=>a[0]-b[0])){
  const last=merged.at(-1);if(last&&start<=last[1])last[1]=Math.max(last[1],end);else merged.push([start,end]);
 }
 return merged;
}
export function summarizeActivity(batches){
 const traces=[...new Map(batches.map(b=>[b.id,b])).values()];
 const events=traces.flatMap(b=>b.events.map(e=>({...e,identity:b.identity}))).sort((a,b)=>a.at.localeCompare(b.at)||a.sequence-b.sequence);
 const calls=[],intervals=[],warnings=[],toolCounts={},textSeen=new Set(),imageSeen=new Set();
 const totals={responseTextCharacters:0,responseTextBytes:0,sourceTextCharacters:0,imageCount:0,imageBytes:0,repeatedTextPages:0,repeatedImages:0,instructionCalls:0,instructionResponseCharacters:0,errors:0,clipsCreated:0,clipsReused:0};
 for(const b of traces){
  const start=b.events.find(e=>e.event==='trace.start'),end=b.events.find(e=>e.event==='trace.end');
  if(!start||!end||b.dropped||b.logFailures)warnings.push({traceId:b.id,reason:'incomplete_trace'});
  if(start&&end)intervals.push([Date.parse(start.at),Date.parse(end.at)]);
  const request=b.events.find(e=>e.event==='tool.request'),result=b.events.find(e=>e.event==='tool.result'),error=b.events.find(e=>e.event==='tool.error'||e.event==='tool.not_executed'||(e.event==='http.response'&&e.status>=400));
  calls.push({traceId:b.id,identity:b.identity,kind:start?.kind,tool:request?.tool||null,start:start?.at||null,end:end?.at||null,durationMs:end?.durationMs??null,outcome:error?'error':end?.outcome||'incomplete',metrics:result||null,events:b.events});
 }
 for(const e of events){
  if(e.event==='tool.request'){toolCounts[e.tool]=(toolCounts[e.tool]||0)+1;if(e.tool==='read_editorial_instructions')totals.instructionCalls++;}
  if(e.event==='tool.error'||e.event==='tool.not_executed')totals.errors++;
  if(e.event==='clip.reused')totals.clipsReused++;
  if(e.event==='span.end'&&e.operation==='clip.create'&&e.outcome==='ok')totals.clipsCreated++;
  if(e.event!=='tool.result')continue;
  for(const k of ['responseTextCharacters','responseTextBytes','sourceTextCharacters','imageCount','imageBytes'])totals[k]+=e[k]||0;
  if(e.tool==='read_editorial_instructions')totals.instructionResponseCharacters+=e.responseTextCharacters||0;
  for(const p of e.textPages||[]){const key=(e.importId||e.identity?.importId||'unknown')+':'+p.page;if(textSeen.has(key))totals.repeatedTextPages++;textSeen.add(key);}
  const imageKeys=e.imageCount?(e.clipPages?.map(p=>'clip:'+p.clipId+':'+p.page)||e.pages?.map(p=>'source:'+(e.importId||e.identity?.importId||'unknown')+':'+p)||[]):[];
  for(const key of imageKeys){if(imageSeen.has(key))totals.repeatedImages++;imageSeen.add(key);}
 }
 const active=unionIntervals(intervals),gaps=active.slice(1).map((r,i)=>({start:new Date(active[i][1]).toISOString(),end:new Date(r[0]).toISOString(),durationMs:r[0]-active[i][1],label:'non_observable'}));
 const spanStarts=new Map(),operationTotals={};
 for(const e of events){
  if(e.event==='span.start')spanStarts.set(e.spanId,e);
  if(e.event==='span.end'){const v=operationTotals[e.operation]||(operationTotals[e.operation]={count:0,inclusiveDurationMs:0,errors:0});v.count++;v.inclusiveDurationMs+=e.durationMs||0;v.errors+=e.outcome==='error'?1:0;spanStarts.delete(e.spanId);}
 }
 if(spanStarts.size)warnings.push({reason:'unfinished_operations',count:spanStarts.size});
 return {schema:1,coverage:'observed_only',limits:['Not token or credit billing','Intervals between observed operations do not identify GPT reasoning or platform waits','Calls before claim or without run remain unassigned','Missing archived requests cannot be ruled out; inspect runtime logs for persistence failures','Operation durations include nested operations and must not be added'],traces:traces.length,totals:{...totals,uniqueTextPages:textSeen.size,uniqueImages:imageSeen.size,serverObservedMs:active.reduce((n,[s,e])=>n+e-s,0),nonObservableMs:gaps.reduce((n,g)=>n+g.durationMs,0)},toolCounts,operationTotals,warnings,gaps,calls:calls.sort((a,b)=>(a.start||'').localeCompare(b.start||''))};
}
