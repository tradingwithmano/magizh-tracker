/* ── CONSTANTS ─────────────────────────────────────────────────────── */
const MONTHS = ['January','February','March','April','May','June','July',
                'August','September','October','November','December'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri'];
const WT = 200, MT = 800, START_YEAR = 2026;
const API = '/api';

const QUOTES = [
  ['Capital is not just money — it is your ability to trade tomorrow. Guard it like your breath.','Prop Trader First Law'],
  ['Two losses in a row is the market saying: not today. Walking away IS the most profitable trade.','Session Rule · Approach 3'],
  ['The goal is not to make money today. The goal is to still be trading on Day 100.','Paul Tudor Jones'],
  ['A small loss with discipline keeps every future opportunity open. Stubbornness closes them all.','Jesse Livermore'],
  ['When emotion replaces logic, the market wins every single time. Protect the plan.','Jesse Livermore Lesson'],
  ['Every red day is tuition. Every green day is compound interest on discipline.','Magizh Trader Rule'],
  ['The plan has never blown an account. Chasing always does. Choose one.','Trading Psychology Truth'],
  ['One rule broken is one month delayed. Protect the system above all else.','Session Discipline Rule'],
  ['After a loss, the urge to get it back is not strategy. It is panic wearing a trading plan costume.','Trading Psychology'],
  ['Your account is fragile in bad hands, powerful in disciplined ones.','Risk Management Principle'],
  ['Stop. Breathe. Log off. Come back tomorrow with a clear mind and a full account.','Your Daily Rule'],
  ['Increasing size after a loss is the fastest path to an unrecoverable drawdown.','Risk Scaling Principle'],
];

/* ── HELPERS ───────────────────────────────────────────────────────── */
function getTier(netBal) {
  const i = Math.min(Math.floor(Math.max(0, netBal) / 5000), 99);
  return { num:i+1, risk:100+i*100, mp:600+i*600, thr:i*5000, next:(i+1)*5000 };
}
function currentMI() {
  const now = new Date();
  return Math.max(0, Math.min(47, (now.getFullYear()-START_YEAR)*12 + now.getMonth()));
}
function realYear(mi)  { return START_YEAR + Math.floor(mi/12); }
function realMonth(mi) { return mi % 12; }
function fmt(n)        { return (n<0?'-$':'$') + Math.abs(n).toLocaleString(); }

function getWeekRanges(mi) {
  const yr=realYear(mi), mon=realMonth(mi);
  const mname=MONTHS[mon].slice(0,3).toUpperCase();
  const mondays=[];
  let cur=new Date(yr,mon,1);
  while(cur.getDay()!==1) cur=new Date(yr,mon,cur.getDate()+1);
  while(cur.getMonth()===mon){ mondays.push(new Date(cur)); cur=new Date(yr,mon,cur.getDate()+7); }
  const lastDay=new Date(yr,mon+1,0).getDate();
  return Array.from({length:4},(_,i)=>{
    if(i<mondays.length){const d=mondays[i].getDate();return mname+' '+d+'–'+Math.min(d+4,lastDay);}
    return mname+' Wk'+(i+1);
  });
}

function emptyMonth(){ return {weeks:[{d:[0,0,0,0,0]},{d:[0,0,0,0,0]},{d:[0,0,0,0,0]},{d:[0,0,0,0,0]}]}; }
function emptyState(){ return {mi:currentMI(), mths:{}, payouts:[]}; }

function grossAll(s){
  let t=0;
  Object.values(s.mths).forEach(md=>md.weeks.forEach(w=>w.d.forEach(v=>{t+=parseFloat(v)||0;})));
  return t;
}
function totalPayouts(s){ return s.payouts.reduce((sum,p)=>sum+(parseFloat(p.amount)||0),0); }
function getMth(s,i){ return s.mths['m'+i] || emptyMonth(); }

/* ── STATE ─────────────────────────────────────────────────────────── */
let S = null;
let saveTimer = null;
let syncStatus = 'loading';

/* ── API ────────────────────────────────────────────────────────────── */
async function apiLoad() {
  const res = await fetch(API+'/data');
  const json = await res.json();
  return json.data;
}

async function apiSave(state) {
  const res = await fetch(API+'/data', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(state)
  });
  const json = await res.json();
  if(!json.ok) throw new Error(json.error);
  return json.updated;
}

/* ── SYNC STATUS UI ─────────────────────────────────────────────────── */
function setSyncStatus(status, text) {
  syncStatus = status;
  const el = document.getElementById('syncIndicator');
  if(!el) return;
  el.className = 'sync-indicator sync-'+status;
  el.querySelector('.sync-label').textContent = text || {
    loading:'Connecting...', saving:'Saving...', saved:'Saved', error:'Save error'
  }[status];
}

/* ── PERSIST (debounced) ────────────────────────────────────────────── */
function persist(ns) {
  if(saveTimer) clearTimeout(saveTimer);
  setSyncStatus('saving');
  saveTimer = setTimeout(async()=>{
    try {
      await apiSave(ns);
      setSyncStatus('saved');
    } catch(e) {
      setSyncStatus('error','Save error — check server');
      console.error('Save failed:', e);
    }
  }, 800);
}

function update(ns) {
  S = ns;
  persist(ns);
  render();
}

/* ── DATA OPS ──────────────────────────────────────────────────────── */
function setDay(wi, di, val) {
  const ns = JSON.parse(JSON.stringify(S));
  const k  = 'm'+ns.mi;
  if(!ns.mths[k]) ns.mths[k] = emptyMonth();
  ns.mths[k].weeks[wi].d[di] = val;
  update(ns);
}
function changeMonth(dir) { update({...S, mi:Math.max(0,Math.min(47,S.mi+dir))}); }
function resetMonthFn() {
  if(!confirm('Reset all data for '+MONTHS[realMonth(S.mi)]+' '+realYear(S.mi)+'?')) return;
  const ns=JSON.parse(JSON.stringify(S));
  delete ns.mths['m'+ns.mi];
  update(ns);
}
function addPayoutFn() {
  const amt=parseFloat(document.getElementById('payAmt').value);
  if(!amt||amt<=0){ document.getElementById('payAmt').style.borderColor='var(--red)'; return; }
  document.getElementById('payAmt').style.borderColor='';
  const ns=JSON.parse(JSON.stringify(S));
  ns.payouts.push({amount:amt, note:document.getElementById('payNote').value.trim(), ts:Date.now()});
  document.getElementById('payAmt').value='';
  document.getElementById('payNote').value='';
  update(ns);
}
function removePayoutFn(idx) {
  const ns=JSON.parse(JSON.stringify(S));
  ns.payouts.splice(idx,1);
  update(ns);
}

/* ── RENDER ─────────────────────────────────────────────────────────── */
function render() {
  const app = document.getElementById('app');

  const MI=S.mi;
  const gross=grossAll(S), pout=totalPayouts(S), net=Math.max(0,gross-pout);
  const tier=getTier(net);
  const nxt=getTier(tier.next);
  const md=getMth(S,MI);
  const wr=getWeekRanges(MI);
  const q=QUOTES[MI%QUOTES.length];
  const ntPct=net>=tier.next?100:Math.max(0,(net-tier.thr)/(tier.next-tier.thr)*100);

  let mTot=0,bestWk=null,worstWk=null,wksHit=0,daysT=0,bestDay=null;
  md.weeks.forEach(wk=>{
    let wTot=0,hasD=false;
    wk.d.forEach(v=>{const n=parseFloat(v);if(v!==0&&v!==''&&!isNaN(n)){wTot+=n;hasD=true;daysT++;if(bestDay===null||n>bestDay)bestDay=n;}});
    mTot+=wTot;
    if(hasD){if(bestWk===null||wTot>bestWk)bestWk=wTot;if(worstWk===null||wTot<worstWk)worstWk=wTot;if(wTot>=WT)wksHit++;}
  });
  const mHit=mTot>=MT;
  const mPct=Math.min(Math.max((mTot/MT)*100,0),100);

  // Build weeks HTML
  let weeksHtml='';
  md.weeks.forEach((wk,wi)=>{
    let wTot=0,hasD=false;
    wk.d.forEach(v=>{const n=parseFloat(v);if(v!==0&&v!==''&&!isNaN(n)){wTot+=n;hasD=true;}});
    const hit=wTot>=WT, excd=wTot>=WT*1.5;
    const pct=Math.max(0,Math.min((wTot/WT)*100,100));
    let spCls='sp-pending',spTxt='PENDING';
    if(hasD){
      if(wTot<0){spCls='sp-loss';spTxt='LOSS';}
      else if(wTot<WT*.4){spCls='sp-progress';spTxt='STARTED';}
      else if(wTot<WT){spCls='sp-progress';spTxt='ON TRACK';}
      else if(!excd){spCls='sp-hit';spTxt='ACHIEVED';}
      else{spCls='sp-exceeded';spTxt='EXCEEDED';}
    }
    const pfCls=excd?'pfill pfill-over':hit?'pfill pfill-hit':'pfill pfill-normal';
    const wNumCol=excd?'var(--ggl)':hit?'var(--green)':'var(--muted)';
    const faCol=wTot<0?'var(--red)':!hasD?'var(--muted)':wTot<WT?'var(--glt)':excd?'var(--ggl)':'var(--green)';
    const wCardCls='wcard'+(excd?' exceeded':hit?' hit':'');
    const badgeStr=(wTot>=0?'+':'')+fmt(wTot)+' / $'+WT;
    const stampTxt=excd?'EXCEEDED':'TARGET HIT';

    let daysHtml='';
    wk.d.forEach((val,di)=>{
      const num=parseFloat(val)||0;
      const inpCls='dinput'+(num>0?' dpos':num<0?' dneg':'');
      const pnlCls='dpnl'+(num>0?' dpos':num<0?' dneg':'');
      const pnlTxt=num!==0?(num>0?'+$':'-$')+Math.abs(num).toLocaleString():'';
      const dispV=(val===0||val===''||val==='0')?'':String(val);
      daysHtml+=`
        <div class="dcell">
          <div class="dlbl">${DAYS[di]}</div>
          <input class="${inpCls}" type="text" inputmode="numeric"
            value="${dispV}" placeholder="0"
            data-wi="${wi}" data-di="${di}"
            onblur="commitDay(this)"
            onkeydown="if(event.key==='Enter')this.blur()">
          <div class="dpnl ${num>0?'dpos':num<0?'dneg':''}">${pnlTxt}</div>
        </div>`;
    });

    weeksHtml+=`
      <div class="${wCardCls}">
        <div class="whdr">
          <div class="whdr-left">
            <div class="wnum" style="color:${wNumCol}">W${wi+1}</div>
            <div class="wdates">${wr[wi]}</div>
          </div>
          <div class="wstatus-group">
            <span class="spill ${spCls}">${spTxt}</span>
            <span class="wtbadge">${badgeStr}</span>
          </div>
        </div>
        <div class="wdays">${daysHtml}</div>
        <div class="wfoot">
          <div class="ptrack"><div class="${pfCls}" style="width:${pct}%"></div></div>
          <div class="wfoot-amt" style="color:${faCol}">${fmt(wTot)}</div>
          <div class="wstamp">${stampTxt}</div>
        </div>
      </div>`;
  });

  // Build payouts HTML
  let payHist='';
  S.payouts.forEach((p,i)=>{
    payHist+=`<div class="ptag">-$${parseFloat(p.amount).toLocaleString()}${p.note?' · '+p.note:''}
      <button class="ptag-del" onclick="removePayoutFn(${i})">×</button></div>`;
  });
  const payTotal=pout>0?`<div class="ptotal-row"><span class="ptotal">Total withdrawn: -$${pout.toLocaleString()}</span></div>`:'';

  // Stats
  const statsRows=[
    ['Best Week',      bestWk!==null?'$'+bestWk.toLocaleString():'--','green'],
    ['Worst Week',     worstWk!==null?(worstWk<0?'-$':'$')+Math.abs(worstWk).toLocaleString():'--','red'],
    ['Weeks Hit $200', wksHit+' / 4','gold'],
    ['Avg / Week',     (()=>{const ws=md.weeks.filter(w=>w.d.some(v=>v!==0&&v!==''&&!isNaN(parseFloat(v))));return ws.length?'$'+Math.round(ws.reduce((s,w)=>s+w.d.reduce((a,v)=>a+(parseFloat(v)||0),0),0)/ws.length).toLocaleString():'--';})(),''],
    ['Days Traded',    String(daysT),''],
    ['Best Single Day',bestDay!==null?'$'+bestDay.toLocaleString():'--','green'],
  ].map(([l,v,c])=>`<div class="srow"><span class="sl">${l}</span><span class="sv ${c}">${v}</span></div>`).join('');

  const syncDotState=syncStatus==='saved'?'saved':syncStatus==='saving'?'saving':syncStatus==='error'?'error':'loading';
  const syncTxt={loading:'Connecting',saving:'Saving...',saved:'Saved',error:'Save error'}[syncStatus]||syncStatus;

  app.innerHTML=`
  <div class="wrap">

    <!-- HEADER -->
    <div class="hdr">
      <div>
        <div class="brand">MAGIZH TRADER</div>
        <div class="brand-sub">Weekly &amp; Monthly Profit Tracker &middot; MNQ Futures</div>
      </div>
      <div class="hdr-right">
        <div class="hstat"><div class="sl">Weekly Target</div><div class="sv">$200</div></div>
        <div class="hstat"><div class="sl">Monthly Target</div><div class="sv">$800</div></div>
        <div class="hstat"><div class="sl">Risk / Trade</div><div class="sv">$${tier.risk}</div></div>
        <div class="sync-indicator sync-${syncDotState}" id="syncIndicator">
          <div class="sync-dot"></div>
          <div class="sync-label">${syncTxt}</div>
        </div>
      </div>
    </div>

    <!-- TIER BANNER -->
    <div class="tier-banner">
      <div class="tb-left">
        <div class="tier-tag">T${tier.num}</div>
        <div class="tier-info">
          <div class="tn">Tier ${tier.num} &middot; Active</div>
          <div class="td">Net $${tier.thr.toLocaleString()} &ndash; $${(tier.next-1).toLocaleString()} &middot; Risk $${tier.risk}/trade</div>
        </div>
      </div>
      <div class="tb-right">
        <div class="tmet"><div class="tl">Gross Profit</div><div class="tv">$${gross.toLocaleString()}</div></div>
        <div class="tmet"><div class="tl">Total Payout</div><div class="tv red">-$${pout.toLocaleString()}</div></div>
        <div class="tmet"><div class="tl">Net Balance</div><div class="tv gold">$${net.toLocaleString()}</div></div>
        <div class="tmet"><div class="tl">Next Tier At</div><div class="tv">$${tier.next.toLocaleString()}</div></div>
      </div>
    </div>

    <!-- MONTH NAV -->
    <div class="mnav">
      <div class="mnav-left">
        <button class="nbtn" onclick="changeMonth(-1)">&#8249;</button>
        <div>
          <div class="mlabel">${MONTHS[realMonth(MI)].toUpperCase()} ${realYear(MI)}</div>
          <div class="ylabel">Tracker Month ${MI+1} of 48 &middot; Year ${Math.floor(MI/12)+1}</div>
        </div>
        <button class="nbtn" onclick="changeMonth(1)">&#8250;</button>
      </div>
      <button class="rbtn" onclick="resetMonthFn()">&#10005; Reset Month</button>
    </div>

    <!-- PAYOUT -->
    <div class="psect">
      <div class="ptitle">Payout / Withdrawal &mdash; Deducted from Net Balance &amp; Tier</div>
      <div class="prow">
        <span class="plbl">Amount ($)</span>
        <input class="pinput" type="number" id="payAmt" placeholder="0" min="0">
        <input class="pnote" type="text" id="payNote" placeholder="Note (optional)">
        <button class="pbtn" onclick="addPayoutFn()">+ Add</button>
      </div>
      <div class="phist">${payHist}</div>
      ${payTotal}
    </div>

    <!-- LAYOUT -->
    <div class="layout">
      <div class="weeks-col">${weeksHtml}</div>
      <div class="right-col">

        <!-- MONTHLY -->
        <div class="mcard${mHit?' hit':''}">
          <div class="mchdr">
            <div class="mctitle">Monthly Progress</div>
            <div class="mcbadge${mHit?' done':''}">${mHit?'TARGET HIT!':'$'+MT+' Target'}</div>
          </div>
          <div class="mcbody">
            <div class="mc-big">${fmt(mTot)}</div>
            <div class="mc-row">
              <div class="mc-of">of $${MT} target</div>
              <div class="mc-pct">${Math.round(mPct)}%</div>
            </div>
            <div class="mc-pbar">
              <div class="mc-pfill ${mHit?'over':'normal'}" style="width:${mPct}%"></div>
            </div>
            <div class="mc-rem">${MT-mTot>0?'$'+(MT-mTot).toLocaleString()+' remaining':'+$'+Math.abs(MT-mTot).toLocaleString()+' above target!'}</div>
            <div class="celebrate">
              <div class="cel-big">&#127942; MONTHLY TARGET HIT!</div>
              <div class="cel-sub">$800 Achieved &middot; Tier Progression On Track</div>
            </div>
          </div>
        </div>

        <!-- NET BALANCE -->
        <div class="cumcard">
          <div class="cum-title">Total Net Balance</div>
          <div class="cum-big">$${net.toLocaleString()}</div>
          <div class="cum-row">
            <div class="cum-sub">Gross profit minus all payouts</div>
            ${pout>0?`<div class="cum-pout">-$${pout.toLocaleString()} withdrawn</div>`:''}
          </div>
        </div>

        <!-- NEXT TIER -->
        <div class="ntcard">
          <div class="nt-title">Next Tier Progress</div>
          <div class="nt-row">
            <div class="nt-name">Tier ${tier.num+1} &middot; +$${(nxt.mp-tier.mp).toLocaleString()}/mo boost</div>
            <div class="nt-at">$${tier.next.toLocaleString()}</div>
          </div>
          <div class="nt-bar"><div class="nt-fill" style="width:${ntPct}%"></div></div>
          <div class="nt-pct">${Math.round(ntPct)}% &middot; $${Math.max(0,tier.next-net).toLocaleString()} to go</div>
        </div>

        <!-- STATS -->
        <div class="scard">
          <div class="sc-title">Month Statistics</div>
          ${statsRows}
        </div>

        <!-- QUOTE -->
        <div class="qcard">
          <div class="ql">&#128204; Today's Reminder</div>
          <div class="qt">"${q[0]}"</div>
          <div class="qa">&mdash; ${q[1]}</div>
        </div>

      </div>
    </div>
  </div>`;

  // Restore input live-coloring after render (no re-render on input)
  document.querySelectorAll('.dinput').forEach(inp=>{
    inp.addEventListener('input', function(){
      const n=parseFloat(this.value)||0;
      this.className='dinput'+(n>0?' dpos':n<0?' dneg':'');
      const pnl=this.closest('.dcell').querySelector('.dpnl');
      pnl.className='dpnl'+(n>0?' dpos':n<0?' dneg':'');
      pnl.textContent=n!==0?(n>0?'+$':'-$')+Math.abs(n).toLocaleString():'';
    });
  });
}

/* onblur commit — called from HTML attribute */
function commitDay(inp) {
  const wi=parseInt(inp.dataset.wi), di=parseInt(inp.dataset.di);
  const raw=inp.value.trim(), n=parseFloat(raw);
  setDay(wi, di, (raw===''||isNaN(n))?0:n);
}

/* ── BOOT ───────────────────────────────────────────────────────────── */
(async function init() {
  try {
    const data = await apiLoad();
    S = data || emptyState();
    if(S.mi===undefined) S.mi=currentMI();
    if(!S.mths)    S.mths={};
    if(!S.payouts) S.payouts=[];
    setSyncStatus('saved');
  } catch(e) {
    console.error('Load failed:', e);
    S = emptyState();
    setSyncStatus('error','Server offline');
  }
  render();
})();
