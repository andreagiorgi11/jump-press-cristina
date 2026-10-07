// Inclusive calendar days in the editorial timezone, independent of the browser timezone.
export function archivePeriod(period,now=new Date()){
 const days={day:1,twoDays:2,week:7,month:30}[period];
 if(!days)return null;
 const to=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const first=new Date(to+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-(days-1));
 return {from:first.toISOString().slice(0,10),to};
}
