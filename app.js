/* ============================================================
   FitPlan —— 纯前端健身 App，全部数据存在手机本地 (localStorage)
   ============================================================ */

const DB = {
  get(k, d) { try { const v = localStorage.getItem("fp_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { localStorage.setItem("fp_" + k, JSON.stringify(v)); },
  del(k) { localStorage.removeItem("fp_" + k); },
};

let profile = DB.get("profile", null);
let plan = DB.get("plan", null);          // { days:[{name, items:[{id,sets,reps,rest,bw,sec}]}], goal }
let sessions = DB.get("sessions", []);     // [ {date, dayName, entries:[{id,name,sets:[{w,r}]}]} ]
let weights = DB.get("weights", []);       // [ {date, kg} ]
let caliLevels = DB.get("caliLevels", {}); // { chainId: level } 街健进阶等级

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const exById = id => EXERCISES.find(e => e.id === id);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => { const d = new Date(iso); return `${d.getMonth() + 1}月${d.getDate()}日`; };

/* ============================================================
   计划生成
   ============================================================ */
const REP_SCHEME = {
  strength:     { sets: 5, reps: "3-5",  rest: 180, bwReps: "6-10" },
  muscle:       { sets: 4, reps: "8-12", rest: 90,  bwReps: "10-15" },
  fatloss:      { sets: 3, reps: "12-20", rest: 45, bwReps: "15-25" },
  general:      { sets: 3, reps: "10-15", rest: 60, bwReps: "12-20" },
  calisthenics: { sets: 4, reps: "6-12", rest: 75,  bwReps: "6-12" },
};

// 街健起始等级（按经验），可被进阶升级覆盖
function caliStart() { return ({ beginner: 1, intermediate: 2, advanced: 3 })[profile.experience] || 1; }
function getCaliLevel(chain) { return caliLevels[chain] || Math.min(caliStart(), chainMembers(chain).length); }

// 按器械等级构建各肌群候选池；进阶链动作只保留「当前等级」那一个
function buildPools(equip) {
  const reps = {}; for (const c in CHAIN_NAMES) reps[c] = chainExercise(c, getCaliLevel(c));
  const pools = {}; for (const g in GROUP_NAMES) pools[g] = [];
  for (const ex of EXERCISES) {
    if (ex.equip > equip) continue;
    if (ex.chain) { const r = reps[ex.chain]; if (r && r.id === ex.id) pools[ex.group].push(ex); }
    else pools[ex.group].push(ex);
  }
  for (const g in pools) pools[g] = shuffle(pools[g]);
  return { pools, reps };
}

function makeItem(ex, sc, setAdj) {
  const sets = Math.max(2, sc.sets + (ex.type === "iso" ? -1 : 0) + setAdj);
  const reps = ex.sec ? "30-60秒" : (ex.bw ? sc.bwReps : sc.reps);
  return { id: ex.id, sets, reps, rest: sc.rest, bw: !!ex.bw, sec: !!ex.sec };
}

function sortItems(items) {
  const rank = it => { const e = exById(it.id); return e.group === "cardio" ? 2 : (e.type === "compound" ? 0 : 1); };
  items.sort((a, b) => rank(a) - rank(b));
}

// —— 力量/增肌等（哑铃/健身房/徒手通用）日程 ——
const FOCUS = {
  full:   [["legs", 2], ["chest", 1], ["back", 1], ["shoulders", 1], ["core", 1]],
  upper:  [["chest", 2], ["back", 2], ["shoulders", 1]],
  upperB: [["back", 1], ["chest", 1], ["shoulders", 1], ["biceps", 1], ["triceps", 1]],
  lower:  [["legs", 3], ["core", 1]],
  push:   [["chest", 2], ["shoulders", 1], ["triceps", 1]],
  pull:   [["back", 3], ["biceps", 1]],
  legs:   [["legs", 3], ["core", 1]],
  chestD: [["chest", 3], ["triceps", 1]],
  backD:  [["back", 3], ["biceps", 1]],
  legsD:  [["legs", 4], ["core", 1]],
  shD:    [["shoulders", 3], ["core", 1]],
  arms:   [["biceps", 2], ["triceps", 2]],
  coreD:  [["core", 3], ["cardio", 1]],
};
function weightSeq(d, level) {
  const N = n => ({
    full: "全身", upper: "上肢", upperB: "上肢 B", lower: "下肢", push: "推 (胸/肩/三头)",
    pull: "拉 (背/二头)", legs: "腿 (下肢/核心)", chestD: "胸日", backD: "背日", legsD: "腿日",
    shD: "肩日", arms: "手臂日", coreD: "核心 / 有氧日",
  }[n]);
  const mk = arr => arr.map(f => ({ name: N(f), focus: FOCUS[f] }));
  if (level === "beginner" && d <= 3) {
    const names = ["全身 A", "全身 B", "全身 C"];
    return Array.from({ length: d }, (_, i) => ({ name: names[i], focus: FOCUS.full }));
  }
  switch (d) {
    case 1: return mk(["full"]);
    case 2: return mk(["upper", "lower"]);
    case 3: return mk(["push", "pull", "legs"]);
    case 4: return [{ name: "上肢 A", focus: FOCUS.upper }, { name: "下肢 A", focus: FOCUS.lower },
                    { name: "上肢 B", focus: FOCUS.upperB }, { name: "下肢 B", focus: FOCUS.lower }];
    case 5: return mk(["chestD", "backD", "legsD", "shD", "arms"]);
    case 6: return [{ name: "推 A", focus: FOCUS.push }, { name: "拉 A", focus: FOCUS.pull }, { name: "腿 A", focus: FOCUS.legs },
                    { name: "推 B", focus: FOCUS.push }, { name: "拉 B", focus: FOCUS.pull }, { name: "腿 B", focus: FOCUS.legs }];
    default: return [{ name: "推 A", focus: FOCUS.push }, { name: "拉 A", focus: FOCUS.pull }, { name: "腿 A", focus: FOCUS.legs },
                    { name: "推 B", focus: FOCUS.push }, { name: "拉 B", focus: FOCUS.pull }, { name: "腿 B", focus: FOCUS.legs },
                    { name: "核心 / 有氧日", focus: FOCUS.coreD }];
  }
}

// —— 街健 / 徒手进阶日程 ——
const CALI_FOCUS = {
  push: [{ chain: "pushup" }, { chain: "dip" }, { group: "shoulders" }, { group: "chest" }, { group: "core" }],
  pull: [{ chain: "pullup" }, { group: "back" }, { group: "back" }],
  legs: [{ chain: "squat" }, { group: "legs" }, { group: "core" }],
  core: [{ chain: "hang" }, { group: "core" }, { group: "cardio" }],
  full: [{ chain: "pushup" }, { chain: "pullup" }, { chain: "squat" }, { group: "core" }],
  upper: [{ chain: "pushup" }, { chain: "pullup" }, { chain: "dip" }, { group: "back" }],
  lower: [{ chain: "squat" }, { group: "legs" }, { chain: "hang" }, { group: "core" }],
};
function caliSeq(d) {
  if (d === 1) return [{ name: "全身 Full Body", f: "full" }];
  if (d === 2) return [{ name: "上肢 Upper", f: "upper" }, { name: "下肢+核心 Lower", f: "lower" }];
  const base = [{ name: "推 Push", f: "push" }, { name: "拉 Pull", f: "pull" }, { name: "腿 Legs", f: "legs" }, { name: "核心 Core", f: "core" }];
  const seq = Array.from({ length: d }, (_, i) => ({ ...base[i % base.length] }));
  const cnt = {}; seq.forEach(s => cnt[s.f] = (cnt[s.f] || 0) + 1);
  const seen = {};
  seq.forEach(s => { if (cnt[s.f] > 1) { seen[s.f] = (seen[s.f] || 0) + 1; s.name += " " + "ABCDE"[seen[s.f] - 1]; } });
  return seq;
}

function generatePlan(p) {
  const sc = REP_SCHEME[p.goal];
  const setAdj = p.experience === "beginner" ? -1 : (p.experience === "advanced" ? 1 : 0);
  if (p.goal === "calisthenics") return generateCali(p, sc, setAdj);

  const { pools } = buildPools(p.equipment);
  const cursor = {};
  const days = weightSeq(p.days, p.experience).map(s => {
    const items = [];
    for (const [g, cnt] of s.focus) {
      const pool = pools[g]; if (!pool || !pool.length) continue;
      cursor[g] = cursor[g] || 0;
      for (let i = 0; i < cnt; i++) items.push(makeItem(pool[cursor[g]++ % pool.length], sc, setAdj));
    }
    if (p.goal === "fatloss") { const c = pools.cardio && pools.cardio[0]; if (c) items.push({ id: c.id, sets: 1, reps: "10-20分钟", rest: 0, bw: true, sec: true }); }
    sortItems(items);
    return { name: s.name, items };
  });
  return { days, goal: p.goal, createdAt: todayISO() };
}

function generateCali(p, sc, setAdj) {
  const { pools, reps } = buildPools(0); // 街健只用徒手动作
  const cursor = {};
  const days = caliSeq(p.days).map(s => {
    const items = [], used = new Set();
    for (const slot of CALI_FOCUS[s.f]) {
      let ex = null;
      if (slot.chain) ex = reps[slot.chain];
      else {
        const pool = (pools[slot.group] || []).filter(e => e.cali && !used.has(e.id));
        cursor[slot.group] = cursor[slot.group] || 0;
        ex = pool.length ? pool[cursor[slot.group]++ % pool.length] : null;
      }
      if (ex && !used.has(ex.id)) { used.add(ex.id); items.push(makeItem(ex, sc, setAdj)); }
    }
    sortItems(items);
    return { name: s.name, items };
  });
  return { days, goal: "calisthenics", createdAt: todayISO() };
}

function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ============================================================
   进阶规则（达标即加重 / 升级动作）
   ============================================================ */
function lastEntry(exId) {
  for (let i = sessions.length - 1; i >= 0; i--) { const e = sessions[i].entries.find(x => x.id === exId); if (e) return e; }
  return null;
}
// 返回 {rule(固定规则), tip(基于历史的建议), upgradeId(可升级的动作)}
function progressInfo(it) {
  const ex = exById(it.id);
  const topRep = parseInt(String(it.reps).split("-").pop()) || 12;
  const last = lastEntry(it.id);
  const valid = last ? last.sets.filter(s => (s.r || 0) > 0) : [];
  const hitAll = valid.length >= it.sets && valid.every(s => (s.r || 0) >= topRep);
  let rule, tip = null, upgradeId = null;

  if (ex.chain) {
    const nx = nextInChain(ex);
    if (nx) {
      rule = `每组做满 ${topRep} 次 × ${it.sets} 组 → 升级「${nx.name}」`;
      if (hitAll) { tip = `已连续达标，升级到「${nx.name}」吧！`; upgradeId = nx.id; }
      else if (valid.length) tip = `上次最好 ${Math.max(...valid.map(s => s.r || 0))} 次，做满即可升级`;
    } else {
      rule = `已是「${CHAIN_NAMES[ex.chain]}」顶阶 → 放慢离心(3-4秒)或加次数`;
      if (hitAll) tip = "动作已封顶，试试更慢的离心或每组 +2~3 次";
    }
  } else if (it.sec) {
    rule = `达到时长上限 → 每次延长 10-15 秒`;
    if (valid.length) tip = `上次最长 ${Math.max(...valid.map(s => s.r || 0))} 秒，争取超过`;
  } else if (it.bw) {
    rule = `每组做满 ${topRep} 次 → 逐步加次数 / 放慢节奏`;
    if (valid.length) { const best = Math.max(...valid.map(s => s.r || 0)); tip = hitAll ? `已达标，下次每组 +2~3 次` : `上次最好 ${best} 次，争取追平`; }
  } else {
    rule = `每组做满 ${topRep} 次 × ${it.sets} 组 → 下次 +2.5kg`;
    if (valid.length) { const bw = Math.max(...valid.map(s => s.w || 0)); tip = hitAll ? `上次 ${bw}kg 全部达标，本次加到 ${bw + 2.5}kg` : `上次最重 ${bw}kg，做满次数再加重`; }
  }
  return { rule, tip, upgradeId };
}

/* ============================================================
   路由 / 渲染
   ============================================================ */
const app = $("#app");
let route = "today";
function go(r) { route = r; render(); window.scrollTo(0, 0); }
function render() {
  if (!profile) { renderOnboarding(); $("#nav").style.display = "none"; return; }
  if (!plan) { plan = generatePlan(profile); DB.set("plan", plan); }
  $("#nav").style.display = "flex";
  $$("#nav button").forEach(b => b.classList.toggle("active", b.dataset.r === route));
  ({ today: renderToday, plan: renderPlan, progress: renderProgress, library: renderLibrary, me: renderMe }[route])();
}

/* ----- 引导 / 资料 ----- */
function renderOnboarding(edit) {
  const p = profile || {};
  app.innerHTML = `
    <div class="hero"><h1>💪 FitPlan</h1><p>填写资料，为你定制专属训练计划</p></div>
    <div class="card form">
      <label>性别</label>
      <div class="seg" id="f-gender">${seg(["male", "female"], ["男", "女"], p.gender || "male")}</div>
      <div class="row">
        <div><label>年龄</label><input id="f-age" type="number" value="${p.age || 25}" min="14" max="90"></div>
        <div><label>身高 cm</label><input id="f-height" type="number" value="${p.height || 170}"></div>
        <div><label>体重 kg</label><input id="f-weight" type="number" value="${p.weight || 65}"></div>
      </div>
      <label>训练经验</label>
      <div class="seg" id="f-exp">${seg(["beginner", "intermediate", "advanced"], ["新手", "进阶", "资深"], p.experience || "beginner")}</div>
      <label>主要目标</label>
      <div class="seg col" id="f-goal">${seg(["fatloss", "muscle", "strength", "general", "calisthenics"], ["减脂塑形", "增肌", "力量", "综合健康", "街健 / 徒手进阶 🤸"], p.goal || "muscle")}</div>
      <label>每周训练天数</label>
      <div class="seg days" id="f-days">${seg([1, 2, 3, 4, 5, 6, 7], ["1", "2", "3", "4", "5", "6", "7"], p.days || 3)}</div>
      <label>可用器械 <span class="muted small">（街健目标自动按徒手安排）</span></label>
      <div class="seg col" id="f-equip">${seg([0, 1, 2], ["徒手 (无器械)", "哑铃 (家用)", "健身房 (全器械)"], p.equipment ?? 0)}</div>
      <button class="primary" id="f-save">${edit ? "保存并重新生成计划" : "生成我的计划 →"}</button>
    </div>`;
  bindSeg();
  $("#f-save").onclick = () => {
    profile = {
      gender: segVal("f-gender"), age: +$("#f-age").value, height: +$("#f-height").value, weight: +$("#f-weight").value,
      experience: segVal("f-exp"), goal: segVal("f-goal"), days: +segVal("f-days"), equipment: +segVal("f-equip"),
    };
    DB.set("profile", profile);
    plan = generatePlan(profile); DB.set("plan", plan);
    if (weights.length === 0 && profile.weight) { weights.push({ date: todayISO(), kg: profile.weight }); DB.set("weights", weights); }
    go("today");
  };
}
function seg(vals, labels, cur) { return vals.map((v, i) => `<button data-v="${v}" class="${String(v) === String(cur) ? "on" : ""}">${labels[i]}</button>`).join(""); }
function bindSeg() { $$(".seg").forEach(s => s.onclick = e => { if (e.target.dataset.v == null) return; $$("button", s).forEach(b => b.classList.remove("on")); e.target.classList.add("on"); }); }
function segVal(id) { return $("#" + id + " button.on").dataset.v; }

/* ----- 今日 ----- */
function nextDayIndex() { return sessions.length % plan.days.length; }
function renderToday() {
  const idx = nextDayIndex();
  const day = plan.days[idx];
  const done = sessions.filter(s => s.date === todayISO()).length;
  app.innerHTML = `
    <div class="topbar"><div><div class="muted">${weekday()} · ${fmtDate(todayISO())}</div><h2>今日训练</h2></div>
      <div class="badge">🔥 连续 ${calcStreak()} 天</div></div>
    <div class="card day-card">
      <div class="day-head"><span class="tag">第 ${idx + 1} 天 / 共 ${plan.days.length}</span><h3>${day.name}</h3></div>
      <p class="muted">${day.items.length} 个动作 · 预计 ${Math.round(day.items.length * 8)} 分钟</p>
      <button class="primary" id="start">${done ? "再练一次" : "开始训练 →"}</button>
    </div>
    <h4 class="sec">今日动作</h4>
    ${day.items.map(exRow).join("")}`;
  $("#start").onclick = () => startSession(idx);
  $$(".exrow").forEach(r => r.onclick = () => openLibraryItem(r.dataset.id));
}
function exRow(it) {
  const ex = exById(it.id); if (!ex) return "";
  return `<div class="card exrow" data-id="${ex.id}">
    <img loading="lazy" src="${exImg(ex.id)}" onerror="this.src='icon.svg'">
    <div class="ex-meta"><b>${ex.name} ${ex.cali ? '<span class="cali-tag">街健</span>' : ""}</b>
      <span class="muted">${GROUP_NAMES[ex.group]} · ${it.sets} 组 × ${it.reps}</span></div>
    <span class="chev">›</span></div>`;
}

/* ----- 训练记录会话 ----- */
let live = null;
function startSession(idx) {
  const day = plan.days[idx];
  live = { dayIdx: idx, dayName: day.name, items: day.items, data: {} };
  for (const it of day.items) {
    const last = lastEntry(it.id);
    live.data[it.id] = Array.from({ length: it.sets }, (_, i) => {
      const ls = last && last.sets[i];
      return { w: ls ? ls.w : "", r: ls ? ls.r : "", done: false };
    });
  }
  route = "session"; renderSession();
}
function renderSession() {
  app.innerHTML = `
    <div class="topbar"><div><div class="muted">训练中…</div><h2>${live.dayName}</h2></div>
      <button class="ghost" id="cancel">取消</button></div>
    ${live.items.map((it, k) => sessionCard(it, k)).join("")}
    <button class="primary big" id="finish">完成训练 ✓</button>
    <div style="height:80px"></div>`;
  $("#cancel").onclick = () => { if (confirm("放弃本次记录？")) { live = null; go("today"); } };
  $("#finish").onclick = finishSession;
  bindSession();
}
function sessionCard(it, k) {
  const ex = exById(it.id);
  const pi = progressInfo(it);
  const rows = live.data[it.id].map((s, i) => `
    <div class="setrow" data-id="${it.id}" data-i="${i}">
      <span class="setno">${i + 1}</span>
      ${it.bw ? "" : `<input class="w" type="number" inputmode="decimal" placeholder="kg" value="${s.w}">`}
      <input class="r" type="number" inputmode="numeric" placeholder="${it.sec ? "秒" : "次"}" value="${s.r}">
      <button class="chk ${s.done ? "done" : ""}">✓</button>
    </div>`).join("");
  return `<div class="card sess">
    <div class="sess-head"><img loading="lazy" src="${exImg(ex.id)}" onerror="this.src='icon.svg'">
      <div><b>${ex.name}</b><div class="muted">目标 ${it.sets} 组 × ${it.reps} · 休息 ${it.rest}s</div></div></div>
    <div class="rule">📏 进阶规则：${pi.rule}</div>
    ${pi.tip ? `<div class="tip">📈 ${pi.tip}</div>` : ""}
    <div class="sets">${rows}</div>
    ${pi.upgradeId ? `<button class="upg" data-up="${k}">⬆ 升级到「${exById(pi.upgradeId).name}」</button>` : ""}
    <div class="muted small">💡 ${ex.tip}</div>
  </div>`;
}
function bindSession() {
  $$(".setrow").forEach(row => {
    const id = row.dataset.id, i = +row.dataset.i;
    const w = $(".w", row), r = $(".r", row), chk = $(".chk", row);
    if (w) w.oninput = () => live.data[id][i].w = w.value === "" ? "" : +w.value;
    r.oninput = () => live.data[id][i].r = r.value === "" ? "" : +r.value;
    chk.onclick = () => { live.data[id][i].done = !live.data[id][i].done; chk.classList.toggle("done"); };
  });
  $$("[data-up]").forEach(b => b.onclick = () => upgradeMove(+b.dataset.up));
}
// 升级动作：换成进阶链的下一阶，并记住等级（影响今后计划）
function upgradeMove(k) {
  const it = live.items[k], ex = exById(it.id), nx = nextInChain(ex);
  if (!nx) return;
  delete live.data[it.id];
  it.id = nx.id;                         // live.items 即 plan.days[idx].items，同步修改
  live.data[it.id] = Array.from({ length: it.sets }, () => ({ w: "", r: "", done: false }));
  if (ex.chain) { caliLevels[ex.chain] = nx.lvl; DB.set("caliLevels", caliLevels); }
  DB.set("plan", plan);
  renderSession();
}
function finishSession() {
  const entries = live.items.map(it => ({
    id: it.id, name: exById(it.id).name,
    sets: live.data[it.id].filter(s => (s.r || 0) > 0).map(s => ({ w: it.bw ? 0 : (+s.w || 0), r: +s.r || 0 })),
  })).filter(e => e.sets.length);
  if (!entries.length) { alert("还没有记录任何一组，先填几组吧 :)"); return; }
  sessions.push({ date: todayISO(), dayName: live.dayName, entries });
  DB.set("sessions", sessions);
  live = null;
  go("progress");
}

/* ----- 计划 ----- */
function renderPlan() {
  app.innerHTML = `
    <div class="topbar"><h2>我的计划</h2><button class="ghost" id="regen">重新生成</button></div>
    <p class="muted">${goalLabel(plan.goal)} · 每周 ${plan.days.length} 练 · ${plan.goal === "calisthenics" ? "徒手进阶" : equipLabel(profile.equipment)}</p>
    ${plan.days.map((d, i) => `
      <div class="card">
        <div class="day-head"><span class="tag">第 ${i + 1} 天</span><h3>${d.name}</h3></div>
        ${d.items.map(it => {
          const ex = exById(it.id);
          return `<div class="plan-item" data-id="${ex.id}">
            <img loading="lazy" src="${exImg(ex.id)}" onerror="this.src='icon.svg'">
            <span class="pi-name">${ex.name}${ex.cali ? ' <span class="cali-tag">街健</span>' : ""}</span>
            <span class="muted">${it.sets}×${it.reps}</span></div>`;
        }).join("")}
        <button class="ghost full" data-start="${i}">开始这天 →</button>
      </div>`).join("")}`;
  $("#regen").onclick = () => { if (confirm("重新随机生成计划？历史记录会保留。")) { plan = generatePlan(profile); DB.set("plan", plan); render(); } };
  $$(".plan-item").forEach(r => r.onclick = () => openLibraryItem(r.dataset.id));
  $$("[data-start]").forEach(b => b.onclick = e => { e.stopPropagation(); startSession(+b.dataset.start); });
}

/* ----- 进度 ----- */
function renderProgress() {
  const total = sessions.length;
  const thisWeek = sessions.filter(s => withinDays(s.date, 7)).length;
  const totalVol = sessions.reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.w * x.r, 0), 0), 0);
  app.innerHTML = `
    <div class="topbar"><h2>进度</h2></div>
    <div class="stats">
      <div class="stat"><b>${total}</b><span>累计训练</span></div>
      <div class="stat"><b>${thisWeek}</b><span>本周</span></div>
      <div class="stat"><b>🔥 ${calcStreak()}</b><span>连续天数</span></div>
      <div class="stat"><b>${Math.round(totalVol).toLocaleString()}</b><span>总容量 kg</span></div>
    </div>
    ${caliProgressCard()}
    <div class="card">
      <div class="topbar"><h4 style="margin:0">体重记录</h4><button class="ghost" id="addw">+ 记录</button></div>
      ${weightChart()}
    </div>
    <h4 class="sec">训练历史</h4>
    ${total === 0 ? `<div class="card muted center">还没有记录，去「今日」开始第一次训练吧！</div>` :
      [...sessions].reverse().map((s, ri) => {
        const i = sessions.length - 1 - ri;
        const vol = s.entries.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.w * x.r, 0), 0);
        return `<div class="card hist">
          <div class="hist-head"><b>${s.dayName}</b><span class="muted">${fmtDate(s.date)}</span></div>
          <div class="muted small">${s.entries.map(e => e.name + " " + e.sets.length + "组").join(" · ")}</div>
          <div class="hist-foot"><span class="muted small">容量 ${Math.round(vol)}kg</span>
            <button class="del" data-del="${i}">删除</button></div>
        </div>`;
      }).join("")}`;
  $("#addw").onclick = addWeight;
  $$("[data-del]").forEach(b => b.onclick = () => { if (confirm("删除这条记录？")) { sessions.splice(+b.dataset.del, 1); DB.set("sessions", sessions); renderProgress(); } });
}
// 街健进阶总览：每条链当前在第几阶
function caliProgressCard() {
  const rows = Object.keys(CHAIN_NAMES).map(c => {
    const m = chainMembers(c), lv = getCaliLevel(c), cur = chainExercise(c, lv);
    const dots = m.map(e => `<span class="dot ${e.lvl < lv ? "done" : e.lvl === lv ? "cur" : ""}"></span>`).join("");
    return `<div class="cali-row"><div><b>${CHAIN_NAMES[c]}</b><div class="muted small">当前：${cur.name}（第 ${lv}/${m.length} 阶）</div></div><div class="dots">${dots}</div></div>`;
  }).join("");
  return `<div class="card"><h4>🤸 街健成长进度</h4><p class="muted small">达标后在训练页点「升级」即可进阶</p>${rows}</div>`;
}
function addWeight() {
  const v = prompt("当前体重 (kg)：", weights.length ? weights[weights.length - 1].kg : profile.weight);
  if (!v) return;
  const kg = parseFloat(v); if (!kg) return;
  const i = weights.findIndex(w => w.date === todayISO());
  if (i >= 0) weights[i].kg = kg; else weights.push({ date: todayISO(), kg });
  weights.sort((a, b) => a.date.localeCompare(b.date));
  DB.set("weights", weights); renderProgress();
}
function weightChart() {
  if (weights.length < 2) return `<p class="muted center small">至少记录 2 次体重即可看到曲线</p>`;
  const w = 300, h = 90, pad = 6, kgs = weights.map(x => x.kg), mn = Math.min(...kgs), mx = Math.max(...kgs), rng = (mx - mn) || 1;
  const pts = weights.map((x, i) => [pad + i * (w - 2 * pad) / (weights.length - 1), pad + (1 - (x.kg - mn) / rng) * (h - 2 * pad)]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="var(--accent)"/>`).join("")}</svg>
  <div class="muted small center">${weights[0].kg}kg → ${weights[weights.length - 1].kg}kg （最低 ${mn} / 最高 ${mx}）</div>`;
}

/* ----- 动作库 ----- */
let libFilter = "all";
function renderLibrary() {
  const groups = ["all", "cali", ...Object.keys(GROUP_NAMES)];
  const label = g => g === "all" ? "全部" : g === "cali" ? "街健 🤸" : GROUP_NAMES[g];
  const list = EXERCISES.filter(e => libFilter === "all" || (libFilter === "cali" ? e.cali : e.group === libFilter));
  app.innerHTML = `
    <div class="topbar"><h2>动作库</h2></div>
    <div class="chips">${groups.map(g => `<button class="chip ${g === libFilter ? "on" : ""}" data-g="${g}">${label(g)}</button>`).join("")}</div>
    <div class="lib-grid">${list.map(e => `
      <div class="lib-card" data-id="${e.id}">
        <img loading="lazy" src="${exImg(e.id)}" onerror="this.src='icon.svg'">
        <div class="lib-name">${e.name}</div>
        <div class="muted small">${GROUP_NAMES[e.group]} · ${["徒手", "哑铃", "健身房"][e.equip]}${e.chain ? " · " + CHAIN_NAMES[e.chain] + " L" + e.lvl : ""}</div>
      </div>`).join("")}</div>`;
  $$(".chip").forEach(c => c.onclick = () => { libFilter = c.dataset.g; renderLibrary(); });
  $$(".lib-card").forEach(c => c.onclick = () => openLibraryItem(c.dataset.id));
}
function openLibraryItem(id) {
  const ex = exById(id); if (!ex) return;
  const last = lastEntry(id);
  let ladder = "";
  if (ex.chain) {
    const cur = getCaliLevel(ex.chain);
    ladder = `<div class="muted small" style="margin-top:6px">${CHAIN_NAMES[ex.chain]}（你当前第 ${cur} 阶）</div>
      <div class="ladder">${chainMembers(ex.chain).map(m => `<div class="step ${m.id === ex.id ? "cur" : m.lvl < cur ? "done" : ""}">${m.lvl}. ${m.name}${m.lvl < cur ? " ✓" : ""}</div>`).join("")}</div>`;
  }
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `<div class="sheet-bg"></div><div class="sheet-card">
    <div class="grab"></div>
    <img class="sheet-img" src="${exImg(ex.id, 1)}" onerror="this.src='${exImg(ex.id, 0)}'">
    <h3>${ex.name} ${ex.cali ? '<span class="cali-tag">街健</span>' : ""}</h3>
    <p class="muted">${GROUP_NAMES[ex.group]} · ${["徒手", "哑铃", "健身房"][ex.equip]} · ${ex.type === "compound" ? "复合动作" : "孤立动作"}</p>
    <div class="tip">💡 ${ex.tip}</div>
    ${ladder}
    ${last ? `<div class="muted small" style="margin-top:8px">上次记录：${last.sets.map(s => (s.w ? s.w + "kg×" : "") + s.r).join(" / ")}</div>` : ""}
    <button class="ghost full" id="closeSheet">关闭</button></div>`;
  document.body.appendChild(sheet);
  const close = () => sheet.remove();
  $(".sheet-bg", sheet).onclick = close; $("#closeSheet", sheet).onclick = close;
}

/* ----- 我的 ----- */
function renderMe() {
  const bmi = profile.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : "-";
  app.innerHTML = `
    <div class="topbar"><h2>我的</h2></div>
    <div class="card">
      <div class="prof"><div class="avatar">${profile.gender === "female" ? "👩" : "👨"}</div>
        <div><b>${profile.gender === "female" ? "女" : "男"} · ${profile.age} 岁</b>
        <div class="muted">${profile.height}cm · ${profile.weight}kg · BMI ${bmi}</div></div></div>
      <div class="kv"><span>目标</span><b>${goalLabel(profile.goal)}</b></div>
      <div class="kv"><span>经验</span><b>${({ beginner: "新手", intermediate: "进阶", advanced: "资深" })[profile.experience]}</b></div>
      <div class="kv"><span>器械</span><b>${equipLabel(profile.equipment)}</b></div>
      <div class="kv"><span>每周</span><b>${profile.days} 天</b></div>
      <button class="ghost full" id="edit">编辑资料 / 重设计划</button>
    </div>
    <div class="card">
      <h4>数据 (仅存于本机)</h4>
      <p class="muted small">所有记录只保存在这台手机的浏览器里。换设备或清理浏览器前请先导出备份。</p>
      <button class="ghost full" id="exp">导出备份 (JSON)</button>
      <button class="ghost full" id="imp">导入备份</button>
      <input type="file" id="impf" accept="application/json" hidden>
      <button class="ghost full danger" id="reset">清除全部数据</button>
    </div>
    <p class="muted center small">FitPlan · 离线可用 · 数据本地存储</p>`;
  $("#edit").onclick = () => { $("#nav").style.display = "none"; renderOnboarding(true); };
  $("#exp").onclick = exportData;
  $("#imp").onclick = () => $("#impf").click();
  $("#impf").onchange = importData;
  $("#reset").onclick = () => { if (confirm("确定清除全部资料与记录？此操作不可恢复！")) { ["profile", "plan", "sessions", "weights", "caliLevels"].forEach(DB.del); location.reload(); } };
}
function exportData() {
  const blob = new Blob([JSON.stringify({ profile, plan, sessions, weights, caliLevels }, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "fitplan-backup-" + todayISO() + ".json"; a.click();
}
function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (d.profile) { profile = d.profile; DB.set("profile", profile); }
      if (d.plan) { plan = d.plan; DB.set("plan", plan); }
      if (d.sessions) { sessions = d.sessions; DB.set("sessions", sessions); }
      if (d.weights) { weights = d.weights; DB.set("weights", weights); }
      if (d.caliLevels) { caliLevels = d.caliLevels; DB.set("caliLevels", caliLevels); }
      alert("导入成功！"); go("today");
    } catch { alert("文件格式不正确"); }
  };
  rd.readAsText(f);
}

/* ---------- 工具 ---------- */
function goalLabel(g) { return { fatloss: "减脂塑形", muscle: "增肌", strength: "力量", general: "综合健康", calisthenics: "街健 / 徒手进阶" }[g]; }
function equipLabel(e) { return ["徒手训练", "哑铃 (家用)", "健身房"][e]; }
function weekday() { return "周" + "日一二三四五六"[new Date().getDay()]; }
function withinDays(iso, n) { return (Date.now() - new Date(iso).getTime()) / 864e5 < n; }
function calcStreak() {
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  if (!dates.length) return 0;
  let streak = 0, cur = new Date(todayISO());
  if (dates[0] !== todayISO()) { cur.setDate(cur.getDate() - 1); if (dates[0] !== cur.toISOString().slice(0, 10)) return 0; }
  for (const d of dates) { if (d === cur.toISOString().slice(0, 10)) { streak++; cur.setDate(cur.getDate() - 1); } else break; }
  return streak;
}

/* ---------- 启动 ---------- */
$$("#nav button").forEach(b => b.onclick = () => go(b.dataset.r));
render();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
