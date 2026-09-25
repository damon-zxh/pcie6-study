/* ============================================================
 * PCIe 6.0 学习系统 - 应用逻辑
 * 零依赖；数据存 localStorage；供 Windows / 手机浏览器使用
 * ============================================================ */
(function () {
'use strict';

/* ---------------- 工具 ---------------- */
var $ = function (sel, root) { return (root || document).querySelector(sel); };
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* 极简 markdown：代码块 / 表格 / 列表 / 粗体 / 行内 code */
function md(src) {
  var lines = String(src).split('\n');
  var html = [], i = 0, buf = [], inCode = false;
  function flushPar() {
    if (buf.length) { html.push('<p>' + inline(buf.join('<br>')) + '</p>'); buf = []; }
  }
  function inline(t) {
    return t
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  for (; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.trim().indexOf('```') === 0) {
      flushPar();
      if (!inCode) { inCode = true; html.push('<pre><code>'); }
      else { inCode = false; html.push('</code></pre>'); }
      continue;
    }
    if (inCode) { html.push(esc(ln)); continue; }
    if (ln.trim() === '') { flushPar(); continue; }
    if (ln.trim().charAt(0) === '|') {
      flushPar();
      var rows = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '|') {
        var cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        if (!/^[-: ]+$/.test(cells.join(''))) rows.push(cells);
        i++;
      }
      i--;
      var t = '<table><tr>' + rows[0].map(function (c) { return '<th>' + inline(esc(c)) + '</th>'; }).join('') + '</tr>';
      for (var r = 1; r < rows.length; r++) t += '<tr>' + rows[r].map(function (c) { return '<td>' + inline(esc(c)) + '</td>'; }).join('') + '</tr>';
      t += '</table>';
      html.push(t);
      continue;
    }
    if (ln.trim().charAt(0) === '-' && ln.trim().length > 1) {
      flushPar();
      var items = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '-' && lines[i].trim().length > 1) {
        items.push('<li>' + inline(esc(lines[i].trim().replace(/^-\s*/, ''))) + '</li>');
        i++;
      }
      i--;
      html.push('<ul style="margin:6px 0;padding-left:22px">' + items.join('') + '</ul>');
      continue;
    }
    buf.push(esc(ln));
  }
  flushPar();
  if (inCode) html.push('</code></pre>');
  return html.join('');
}
function fmtDate(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function todayStr() { return fmtDate(new Date()); }
function parseDate(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
function diffDays(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._h); toast._h = setTimeout(function () { t.hidden = true; }, 2200);
}
function download(name, content, mime) {
  var blob = new Blob([content], { type: mime || 'application/octet-stream' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
}

/* ---------------- 持久化状态 ---------------- */
var LS_KEY = 'pcie6-study-v1';
var defaults = function () {
  return { read: [], wrong: {}, stats: {}, plan: {}, planStart: '', theme: 'light', days: [] };
};
var state = defaults();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式等 */ } }
function load() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (raw) { var o = JSON.parse(raw); state = Object.assign(defaults(), o); }
  } catch (e) { state = defaults(); }
}
function markToday() {
  var t = todayStr();
  if (state.days.indexOf(t) < 0) { state.days.push(t); save(); }
}
function streak() {
  var set = {}; state.days.forEach(function (d) { set[d] = 1; });
  var n = 0, cur = new Date();
  if (!set[fmtDate(cur)]) cur.setDate(cur.getDate() - 1); // 今天还没学，从昨天数
  while (set[fmtDate(cur)]) { n++; cur.setDate(cur.getDate() - 1); }
  return n;
}

/* ---------------- 索引 ---------------- */
var KBY = {}, QBY = {}, MODBY = {};
KNOWLEDGE.forEach(function (k) { KBY[k.id] = k; });
QUESTIONS.forEach(function (q) { QBY[q.id] = q; });
MODULES.forEach(function (m) { MODBY[m.id] = m; });
var typeName = { single: '单选', multi: '多选', judge: '判断' };
var letters = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ---------------- 应用 ---------------- */
var App = {
  view: 'kb',
  kbModule: 'all', kbSearch: '', kbOpen: {},   // 知识库状态
  quiz: null,                                  // 进行中的测验会话
  quizCfg: { scope: 'all', count: 15, mode: 'random' },

  go: function (view) {
    this.view = view;
    if (view !== 'quiz-run' && view !== 'quiz') this.quiz = null;
    this.render();
    window.scrollTo(0, 0);
  },

  render: function () {
    var views = { 'kb': renderKB, 'quiz': this.quiz ? renderQuizRun : renderQuizCfg, 'quiz-run': renderQuizRun,
      'wrong': renderWrong, 'plan': renderPlan, 'stats': renderStats, 'settings': renderSettings };
    var v = this.view === 'quiz-run' ? 'quiz' : this.view;
    (views[this.view] || renderKB)();
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === v);
    });
    renderBanner();
    var wb = $('#wrongBadge');
    var n = Object.keys(state.wrong).filter(function (id) { return state.wrong[id].s < 2 && QBY[id]; }).length;
    wb.textContent = n ? String(n) : '';
    wb.style.display = n ? '' : 'none';
    $('#streakNum').textContent = streak();
  }
};

/* ---------------- 今日横幅 ---------------- */
function currentWeek() {
  if (!state.planStart) return null;
  var d = diffDays(todayStr(), state.planStart);
  if (d < 0) return 0;
  return Math.min(12, Math.floor(d / 7) + 1);
}
function renderBanner() {
  var b = $('#todayBanner'), w = currentWeek();
  if (w === null) {
    b.hidden = false;
    b.innerHTML = '<div class="today-banner-inner">👋 欢迎使用！先到 <b>【计划】</b> 页设置开始日期，这里会变成每日学习提醒。<span class="link" onclick="App.go(\'plan\')">去设置 →</span></div>';
    return;
  }
  if (w === 0) {
    b.hidden = false;
    b.innerHTML = '<div class="today-banner-inner">📅 计划将于 <b>' + esc(state.planStart) + '</b> 开始，先随便看看知识库热热身。<span class="link" onclick="App.go(\'kb\')">去知识库 →</span></div>';
    return;
  }
  var wk = STUDY_PLAN[w - 1];
  var total = wk.tasks.length, done = 0;
  wk.tasks.forEach(function (t, i) { if (state.plan['w' + w + '-' + i]) done++; });
  b.hidden = false;
  b.innerHTML = '<div class="today-banner-inner">📅 <b>第 ' + w + ' 周</b> · ' + esc(wk.theme) +
    ' — 本周任务 <b>' + done + '/' + total + '</b>' +
    (done < total ? '<span class="link" onclick="App.go(\'plan\')">去打卡 →</span>' : '<span style="color:var(--ok);margin-left:auto;font-weight:700">✓ 本周已完成</span>');
}

/* ---------------- 知识库 ---------------- */
function renderKB() {
  var kw = App.kbSearch.trim().toLowerCase();
  var cards = KNOWLEDGE.filter(function (k) {
    if (App.kbModule !== 'all' && k.module !== App.kbModule) return false;
    if (!kw) return true;
    return (k.title + ' ' + k.tags.join(' ') + ' ' + k.body).toLowerCase().indexOf(kw) >= 0;
  });
  var readSet = {}; state.read.forEach(function (id) { readSet[id] = 1; });
  var navItems = [{ id: 'all', name: '全部模块', cnt: KNOWLEDGE.length }].concat(
    MODULES.map(function (m) {
      return { id: m.id, name: m.name, cnt: KNOWLEDGE.filter(function (k) { return k.module === m.id; }).length };
    })
  );
  var navHtml = navItems.map(function (m) {
    return '<button class="mod-item' + (App.kbModule === m.id ? ' active' : '') + '" onclick="App.kbPick(\'' + m.id + '\')">' +
      esc(m.name) + '<span class="cnt">' + m.cnt + '</span></button>';
  }).join('');
  var cardsHtml = cards.map(function (k) {
    var open = !!App.kbOpen[k.id];
    return '<div class="kcard' + (open ? ' open' : '') + (readSet[k.id] ? ' read' : '') + '" id="kc-' + k.id + '">' +
      '<div class="kcard-head" onclick="App.kbToggle(\'' + k.id + '\')">' +
      '<span class="k-arrow">▶</span>' +
      '<span class="k-title">' + esc(k.title) + '</span>' +
      '<span class="kmark">' + (readSet[k.id] ? '✓ 已读' : '未读') + '</span>' +
      '</div>' +
      '<div class="kcard-body">' +
      '<div class="tagrow">' + k.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="kbody">' + md(k.body) + '</div>' +
      (k.verify ? '<div class="verify-box"><b>🎯 验证要点：</b>' + esc(k.verify) + '</div>' : '') +
      '<div style="margin-top:12px"><button class="btn small ghost" onclick="App.kbRead(\'' + k.id + '\')">' +
      (readSet[k.id] ? '✓ 已标记已读（点击取消）' : '标记为已读') + '</button></div>' +
      '</div></div>';
  }).join('');
  $('#main').innerHTML =
    '<h2 class="view-title">📚 知识库</h2>' +
    '<div class="search-row"><input type="text" placeholder="搜索标题 / 标签 / 正文关键词…" value="' + esc(App.kbSearch) +
    '" oninput="App.kbSearch=this.value;App.kbSearchLive()">' +
    '<select onchange="App.kbSort(this.value)"><option value="module">按模块</option><option value="unread">未读优先</option></select></div>' +
    '<div class="kb-layout"><div class="module-nav"><div class="card"><div class="mod-grid">' + navHtml + '</div></div></div>' +
    '<div>' + (cardsHtml || '<div class="card muted">没有匹配的知识卡片。</div>') + '</div></div>';
  App._kbSort = App._kbSort || 'module';
}
App.kbPick = function (id) { App.kbModule = id; App.go('kb'); };
App.kbSearchLive = function () {
  // 重渲染但保留焦点
  var inp = $('.search-row input');
  renderKB();
  var inp2 = $('.search-row input');
  if (inp2) { inp2.focus(); inp2.setSelectionRange(inp2.value.length, inp2.value.length); }
};
App.kbSort = function (v) {
  App._kbSort = v;
  if (v === 'unread') {
    var readSet = {}; state.read.forEach(function (id) { readSet[id] = 1; });
    KNOWLEDGE.sort(function (a, b) { return (readSet[a.id] ? 1 : 0) - (readSet[b.id] ? 1 : 0); });
  } else {
    KNOWLEDGE.sort(function (a, b) {
      var ma = MODULES.findIndex(function (m) { return m.id === a.module; });
      var mb = MODULES.findIndex(function (m) { return m.id === b.module; });
      return ma - mb || a.id.localeCompare(b.id);
    });
  }
  renderKB();
};
App.kbToggle = function (id) { App.kbOpen[id] = !App.kbOpen[id]; renderKB(); };
App.kbRead = function (id) {
  var i = state.read.indexOf(id);
  if (i >= 0) state.read.splice(i, 1); else { state.read.push(id); markToday(); }
  save(); renderKB();
};

/* ---------------- 测验：配置页 ---------------- */
function renderQuizCfg() {
  var opts = MODULES.map(function (m) {
    var cnt = QUESTIONS.filter(function (q) { return q.module === m.id; }).length;
    return '<option value="' + m.id + '"' + (App.quizCfg.scope === m.id ? ' selected' : '') + '>' + esc(m.name) + '（' + cnt + ' 题）</option>';
  }).join('');
  var wrongCnt = Object.keys(state.wrong).filter(function (id) { return state.wrong[id].s < 2 && QBY[id]; }).length;
  $('#main').innerHTML =
    '<h2 class="view-title">📝 测验</h2>' +
    '<div class="card">' +
    '<h3>出题范围</h3>' +
    '<div class="search-row" style="align-items:center">' +
    '<select onchange="App.quizCfg.scope=this.value">' +
    '<option value="all"' + (App.quizCfg.scope === 'all' ? ' selected' : '') + '>全部题库（' + QUESTIONS.length + ' 题）</option>' +
    opts +
    '<option value="wrong"' + (App.quizCfg.scope === 'wrong' ? ' selected' : '') + '>错题重练（' + wrongCnt + ' 题未掌握）</option>' +
    '</select>' +
    '<select onchange="App.quizCfg.count=+this.value">' +
    [5, 10, 15, 20, 30, 50].map(function (n) {
      return '<option value="' + n + '"' + (App.quizCfg.count === n ? ' selected' : '') + '>' + n + ' 题</option>';
    }).join('') +
    '</select>' +
    '<select onchange="App.quizCfg.mode=this.value">' +
    '<option value="random"' + (App.quizCfg.mode === 'random' ? ' selected' : '') + '>随机顺序</option>' +
    '<option value="seq"' + (App.quizCfg.mode === 'seq' ? ' selected' : '') + '>按顺序</option>' +
    '</select></div>' +
    '<div class="spacer"></div>' +
    '<button class="btn" onclick="App.quizStart()">开始测验 ▶</button>' +
    '</div>' +
    '<div class="card"><h3>模拟考试</h3><p class="muted">从全部题库随机抽取 50 题（不足则全量），一次性作答，结束后统一评分——检验整体掌握度。</p>' +
    '<button class="btn ghost" onclick="App.examStart()">开始模拟考 🎓</button></div>';
}
App.quizStart = function () {
  var pool = QUESTIONS.filter(function (q) {
    if (App.quizCfg.scope === 'all') return true;
    if (App.quizCfg.scope === 'wrong') { var w = state.wrong[q.id]; return w && w.s < 2; }
    return q.module === App.quizCfg.scope;
  });
  if (!pool.length) { toast('该范围暂时没有题目（或错题集为空）'); return; }
  if (App.quizCfg.mode === 'random') pool = shuffle(pool);
  if (App.quizCfg.count === 50) pool = shuffle(pool); // 模拟考全量
  pool = pool.slice(0, App.quizCfg.count);
  App.quiz = { qs: pool, idx: 0, ans: pool.map(function () { return { sel: [], done: false, ok: false }; }), exam: false };
  App.view = 'quiz-run'; App.render();
};
App.examStart = function () {
  var pool = shuffle(QUESTIONS).slice(0, 50);
  App.quiz = { qs: pool, idx: 0, ans: pool.map(function () { return { sel: [], done: false, ok: false }; }), exam: true };
  App.view = 'quiz-run'; App.render();
};

/* ---------------- 测验：答题页 ---------------- */
function renderQuizRun() {
  var s = App.quiz;
  if (s.finished) { renderQuizResult(); return; }
  var qi = s.qs[s.idx], a = s.ans[s.idx];
  var correctSet = {};
  (Array.isArray(qi.answer) ? qi.answer : [qi.answer]).forEach(function (x) { correctSet[x] = 1; });
  var optsHtml = qi.options.map(function (o, i) {
    var cls = 'quiz-opt';
    if (a.done) {
      if (correctSet[i]) cls += ' correct';
      else if (a.sel.indexOf(i) >= 0) cls += ' wrong';
    } else if (a.sel.indexOf(i) >= 0) cls += ' sel';
    return '<div class="' + cls + '" onclick="App.qPick(' + s.idx + ',' + i + ')">' +
      '<span class="opt-letter">' + letters[i] + '.</span><span>' + esc(o) + '</span></div>';
  }).join('');
  var expHtml = '';
  if (a.done) {
    var userSet = {}; a.sel.forEach(function (x) { userSet[x] = 1; });
    var okAll = true, len = 0;
    Object.keys(correctSet).forEach(function (k) { if (!userSet[k]) okAll = false; len++; });
    Object.keys(userSet).forEach(function (k) { if (!correctSet[k]) okAll = false; });
    var ansTxt = (Array.isArray(qi.answer) ? qi.answer.map(function (x) { return letters[x]; }).join('、') : letters[qi.answer]);
    expHtml = '<div class="explain-box ' + (a.ok ? 'ok' : 'bad') + '">' +
      (a.ok ? '<b class="ok-txt">✓ 回答正确</b>' : '<b class="bad-txt">✗ 回答错误</b>') +
      '　<span class="muted">正确答案：' + ansTxt + '</span><br>' + md(qi.explain) + '</div>';
  }
  var doneCnt = s.ans.filter(function (x) { return x.done; }).length;
  var nextLabel = s.idx === s.qs.length - 1 ? '查看成绩 🏁' : '下一题 →';
  $('#main').innerHTML =
    '<div class="q-count">' + (s.exam ? '🎓 模拟考' : '测验') + ' · 第 ' + (s.idx + 1) + ' / ' + s.qs.length + ' 题 · 已作答 ' + doneCnt + '</div>' +
    '<div class="progress-track" style="margin-bottom:14px"><div class="progress-fill" style="width:' + Math.round((s.idx) / s.qs.length * 100) + '%"></div></div>' +
    '<div class="card">' +
    '<div class="q-meta">' + esc(MODBY[qi.module].name) + ' · ' + typeName[qi.type] + (qi.type === 'multi' ? '（多选题，选好后点提交）' : '') + '</div>' +
    '<div class="q-text">' + esc(qi.q) + '</div>' +
    optsHtml + expHtml +
    '<div class="quiz-nav">' +
    '<button class="btn ghost" ' + (s.idx === 0 ? 'disabled' : '') + ' onclick="App.qNav(-1)">← 上一题</button>' +
    (a.done || qi.type !== 'multi'
      ? '<button class="btn" onclick="App.qNav(1)">' + nextLabel + '</button>'
      : '<button class="btn" onclick="App.qSubmit()">提交答案</button>') +
    '</div></div>' +
    '<div style="text-align:center"><button class="btn small ghost" onclick="App.qAbort()">放弃本次测验</button></div>';
}
App.qPick = function (qi, oi) {
  var s = App.quiz, q = s.qs[qi], a = s.ans[qi];
  if (a.done) return;
  if (q.type === 'multi') {
    var i = a.sel.indexOf(oi);
    if (i >= 0) a.sel.splice(i, 1); else a.sel.push(oi);
  } else {
    a.sel = [oi];
    judge(qi);
  }
  App.render();
};
App.qSubmit = function () {
  var s = App.quiz, a = s.ans[s.idx];
  if (!a.sel.length) { toast('请先选择答案'); return; }
  judge(s.idx); App.render();
};
function judge(qi) {
  var s = App.quiz, q = s.qs[qi], a = s.ans[qi];
  a.done = true;
  var correct = Array.isArray(q.answer) ? q.answer : [q.answer];
  a.ok = a.sel.length === correct.length && correct.every(function (x) { return a.sel.indexOf(x) >= 0; });
  // 统计 & 错题集
  var st = state.stats[q.id] || (state.stats[q.id] = { a: 0, k: 0 });
  st.a++; if (a.ok) st.k++;
  var w = state.wrong[q.id];
  if (a.ok) {
    if (w) { w.s++; w.t = Date.now(); if (w.s >= 2) toast('🎉 该题已连续答对 2 次，移出错题集！'); }
  } else {
    if (!w) w = state.wrong[q.id] = { c: 0, s: 0, t: 0 };
    w.c++; w.s = 0; w.t = Date.now();
  }
  markToday(); save();
}
App.qNav = function (d) {
  var s = App.quiz;
  if (!s.ans[s.idx].done) { toast('先完成本题再继续'); return; }
  if (s.idx + d >= s.qs.length) { s.finished = true; }
  else s.idx += d;
  App.render();
};
App.qAbort = function () {
  if (confirm('确定放弃本次测验？已答题目的成绩会保留在统计中。')) { App.quiz = null; App.go('quiz'); }
};

/* ---------------- 测验：结果页 ---------------- */
function renderQuizResult() {
  var s = App.quiz;
  var ok = s.ans.filter(function (x) { return x.ok; }).length;
  var pct = Math.round(ok / s.qs.length * 100);
  var verdict = pct >= 90 ? '🏆 优秀！可以进入下一个模块了' : pct >= 75 ? '👍 不错，再刷一遍错题' : pct >= 60 ? '💪 及格线，回头读一遍知识卡片' : '📖 建议重读对应模块知识卡片后再战';
  var wrongIds = s.qs.filter(function (q, i) { return !s.ans[i].ok; }).map(function (q) { return q.id; });
  $('#main').innerHTML =
    '<h2 class="view-title">' + (s.exam ? '🎓 模拟考成绩' : '测验成绩') + '</h2>' +
    '<div class="card" style="text-align:center">' +
    '<div style="font-size:44px;font-weight:800;color:' + (pct >= 75 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)') + '">' + pct + '<span style="font-size:20px">分</span></div>' +
    '<p class="muted">答对 ' + ok + ' / ' + s.qs.length + ' 题 · ' + verdict + '</p>' +
    '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:10px">' +
    '<button class="btn" onclick="App.quiz=null;App.go(\'quiz\')">再来一轮</button>' +
    '<button class="btn ghost" onclick="App.quiz=null;App.go(\'wrong\')">查看错题集（' + wrongIds.length + '）</button>' +
    '</div></div>' +
    '<div class="card"><h3>本次错题回顾</h3>' +
    (wrongIds.length ? wrongIds.map(function (id) {
      var q = QBY[id];
      return '<div class="wrong-item"><span>' + esc(q.q.slice(0, 60)) + (q.q.length > 60 ? '…' : '') + '</span>' +
        '<button class="btn small ghost" onclick="App.explainOne(\'' + id + '\')">看解析</button></div>';
    }).join('') : '<p class="muted">全部正确，漂亮！</p>') +
    '</div>';
  App._shownIds = wrongIds;
}
App.explainOne = function (id) {
  var q = QBY[id];
  var ansTxt = Array.isArray(q.answer) ? q.answer.map(function (x) { return letters[x]; }).join('、') : letters[q.answer];
  alert('【' + typeName[q.type] + '】' + q.q + '\n\n正确答案：' + ansTxt + '\n\n解析：' + q.explain);
};

/* ---------------- 错题集 ---------------- */
function renderWrong() {
  var ids = Object.keys(state.wrong).filter(function (id) { return QBY[id]; });
  var undone = ids.filter(function (id) { return state.wrong[id].s < 2; });
  var mastered = ids.filter(function (id) { return state.wrong[id].s >= 2; });
  function item(id, done) {
    var q = QBY[id], w = state.wrong[id];
    return '<div class="wrong-item">' +
      '<div style="flex:1"><div style="font-size:14px">' + esc(q.q.length > 70 ? q.q.slice(0, 70) + '…' : q.q) + '</div>' +
      '<div class="muted" style="font-size:12px">' + esc(MODBY[q.module].name) + ' · ' + typeName[q.type] + ' · 错 ' + w.c + ' 次' +
      (done ? ' · 已连续答对 ' + w.s + ' 次 ✓' : '') + '</div></div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0">' +
      '<button class="btn small ghost" onclick="App.explainOne(\'' + id + '\')">解析</button>' +
      '<button class="btn small ' + (done ? 'ghost' : '') + '" onclick="App.wrongDrop(\'' + id + '\')">' + (done ? '移除' : '标记掌握') + '</button>' +
      '</div></div>';
  }
  $('#main').innerHTML =
    '<h2 class="view-title">❌ 错题集</h2>' +
    '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">' +
    '<div>未掌握 <b style="color:var(--bad)">' + undone.length + '</b> 题 · 已掌握 <b style="color:var(--ok)">' + mastered.length + '</b> 题' +
    '<div class="muted">答错自动加入；<b>连续答对 2 次</b>自动标记为掌握</div></div>' +
    (undone.length ? '<button class="btn" onclick="App.quizCfg.scope=\'wrong\';App.quizStart()">重练错题 ▶</button>' : '') +
    '</div></div>' +
    '<div class="card"><h3>未掌握</h3>' + (undone.length ? undone.map(function (id) { return item(id, false); }).join('') : '<p class="muted">空空如也，保持住！🎉</p>') + '</div>' +
    (mastered.length ? '<div class="card"><h3>已掌握（连续答对≥2）</h3>' + mastered.map(function (id) { return item(id, true); }).join('') + '</div>' : '');
}
App.wrongDrop = function (id) {
  delete state.wrong[id]; save(); toast('已从错题集移除'); App.render();
};

/* ---------------- 学习计划 ---------------- */
function renderPlan() {
  var w = currentWeek();
  var totalTasks = 0, doneTasks = 0;
  STUDY_PLAN.forEach(function (wk) { totalTasks += wk.tasks.length; wk.tasks.forEach(function (t, i) { if (state.plan['w' + wk.week + '-' + i]) doneTasks++; }); });
  var pct = Math.round(doneTasks / totalTasks * 100);
  var weeksHtml = STUDY_PLAN.map(function (wk) {
    var done = 0;
    var rows = wk.tasks.map(function (t, i) {
      var key = 'w' + wk.week + '-' + i, ck = !!state.plan[key];
      if (ck) done++;
      return '<div class="task-row' + (ck ? ' done' : '') + '">' +
        '<input type="checkbox" class="task-check" ' + (ck ? 'checked' : '') + ' onchange="App.planToggle(\'' + key + '\')">' +
        '<span class="task-text">' + esc(t) + '</span></div>';
    }).join('');
    var wp = Math.round(done / wk.tasks.length * 100);
    return '<div class="card week-card">' +
      '<div class="week-head"><span class="week-no">第 ' + wk.week + ' 周</span>' +
      '<span class="week-theme">' + esc(wk.theme) + '</span>' +
      (w === wk.week ? '<span class="week-now">⏰ 本周</span>' : '') + '</div>' +
      (wk.modules.length ? '<div class="muted" style="margin-top:2px">对应模块：' + wk.modules.map(function (m) { return esc(MODBY[m].name.replace(/^M\d+ /, '')); }).join('、') + '</div>' : '') +
      '<div style="margin-top:8px">' + rows + '</div>' +
      '<div class="week-prog"><div class="progress-track"><div class="progress-fill" style="width:' + wp + '%"></div></div><span class="muted" style="font-size:12px">' + wp + '%</span></div>' +
      '</div>';
  }).join('');
  $('#main').innerHTML =
    '<h2 class="view-title">📅 12 周学习计划</h2>' +
    '<div class="card">' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<label>开始日期 <input type="date" value="' + esc(state.planStart) + '" onchange="App.planSetStart(this.value)"></label>' +
    '<button class="btn ghost small" onclick="App.planSetStart(\'' + todayStr() + '\')">设为今天</button>' +
    '<span style="flex:1"></span>' +
    '<button class="btn small" onclick="App.ics()">📥 导出日历提醒 (.ics)</button>' +
    '</div>' +
    '<p class="muted" style="margin-bottom:10px">导出后双击/打开 ics 文件可导入 Windows 日历或手机日历，每天 21:00 提醒学习（提前 15 分钟）。</p>' +
    '<div class="week-prog"><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
    '<span class="muted" style="font-size:12px">总进度 ' + doneTasks + '/' + totalTasks + '（' + pct + '%）</span></div>' +
    (w ? '<p class="muted" style="margin:8px 0 0">📍 当前处于第 ' + w + ' 周' + (w < 12 ? '，主题：' + esc(STUDY_PLAN[w - 1].theme) : '（已到最后一周，冲刺！）') + '</p>'
       : '<p class="muted" style="margin:8px 0 0">设置开始日期后，首页横幅会显示当前周与任务进度。</p>') +
    '</div>' +
    weeksHtml;
}
App.planSetStart = function (v) {
  if (!v) return;
  state.planStart = v; save(); toast('开始日期已设为 ' + v); App.render();
};
App.planToggle = function (key) {
  if (state.plan[key]) delete state.plan[key]; else { state.plan[key] = true; markToday(); }
  save(); App.render();
};
App.ics = function () {
  var d = new Date(); d.setDate(d.getDate() + 1);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  var start = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T210000';
  var ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PCIE6 Study Planner//CN//', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:pcie6-study-' + Date.now() + '@local',
    'DTSTAMP:' + start.replace('T', 'T'),
    'DTSTART:' + start,
    'DURATION:PT30M',
    'RRULE:FREQ=DAILY;COUNT=84',
    'SUMMARY:⚡ PCIe 6.0 学习时间',
    'DESCRIPTION:打开学习系统完成今日任务：知识卡片 + 测验 + 错题清理。坚持 12 周！',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:PCIe 6.0 学习提醒：15 分钟后开始', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  download('pcie6-study-reminders.ics', ics, 'text/calendar');
  toast('已导出 ics，打开文件即可导入日历');
};

/* ---------------- 统计 ---------------- */
function renderStats() {
  var attempts = 0, corrects = 0;
  Object.keys(state.stats).forEach(function (id) { attempts += state.stats[id].a; corrects += state.stats[id].k; });
  var acc = attempts ? Math.round(corrects / attempts * 100) : 0;
  var mastered = Object.keys(state.wrong).filter(function (id) { return state.wrong[id] && state.wrong[id].s >= 2; }).length;
  var weak = Object.keys(state.wrong).filter(function (id) { return state.wrong[id] && state.wrong[id].s < 2 && QBY[id]; }).length;
  var bars = MODULES.map(function (m) {
    var qs = QUESTIONS.filter(function (q) { return q.module === m.id; });
    var a = 0, k = 0;
    qs.forEach(function (q) { var st = state.stats[q.id]; if (st) { a += st.a; k += st.k; } });
    var pct = a ? Math.round(k / a * 100) : 0;
    var ks = KNOWLEDGE.filter(function (x) { return x.module === m.id; });
    var rd = ks.filter(function (x) { return state.read.indexOf(x.id) >= 0; }).length;
    return '<div class="modbar-row"><div class="row1"><span>' + esc(m.name) + '</span><span class="muted">答题 ' + a + ' 次 · 正确率 ' + (a ? pct + '%' : '—') + ' · 已读 ' + rd + '/' + ks.length + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + (a ? pct : 0) + '%;background:' + (pct >= 80 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--bad)') + '"></div></div></div>';
  }).join('');
  $('#main').innerHTML =
    '<h2 class="view-title">📊 学习统计</h2>' +
    '<div class="stat-grid">' +
    '<div class="stat-cell"><div class="num">' + state.read.length + '/' + KNOWLEDGE.length + '</div><div class="lbl">知识卡片已读</div></div>' +
    '<div class="stat-cell"><div class="num">' + attempts + '</div><div class="lbl">累计答题次数</div></div>' +
    '<div class="stat-cell"><div class="num">' + acc + '%</div><div class="lbl">总体正确率</div></div>' +
    '<div class="stat-cell"><div class="num">' + mastered + '</div><div class="lbl">错题已掌握</div></div>' +
    '<div class="stat-cell"><div class="num">' + weak + '</div><div class="lbl">错题未掌握</div></div>' +
    '<div class="stat-cell"><div class="num">🔥 ' + streak() + '</div><div class="lbl">连续学习天数</div></div>' +
    '</div>' +
    '<div class="card"><h3>各模块掌握情况</h3>' +
    '<p class="muted">正确率 ≥80% 绿色 / 60~79% 黄色 / &lt;60% 红色。红色模块建议重读知识卡片 + 定向刷题。</p>' + bars + '</div>';
}

/* ---------------- 设置 ---------------- */
function renderSettings() {
  $('#main').innerHTML =
    '<h2 class="view-title">⚙️ 设置与数据</h2>' +
    '<div class="card"><h3>数据备份 / 跨设备同步</h3>' +
    '<p class="muted">所有进度存在<b>本设备浏览器</b>里。换设备时：旧设备导出 JSON → 新设备导入。</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' +
    '<button class="btn" onclick="App.exportData()">📤 导出备份 JSON</button>' +
    '<label class="btn ghost" style="cursor:pointer">📥 导入备份<input type="file" accept=".json,application/json" style="display:none" onchange="App.importData(this)"></label>' +
    '</div></div>' +
    '<div class="card"><h3>外观</h3><p class="muted">当前主题：' + (state.theme === 'dark' ? '深色 🌙' : '浅色 ☀️') + '（右上角按钮可切换）</p></div>' +
    '<div class="card"><h3>重置</h3><p class="muted">清空本设备的全部学习记录（已读、错题、统计、打卡）。</p>' +
    '<button class="btn danger" onclick="App.resetAll()">🗑️ 清空全部数据</button></div>' +
    '<div class="card"><h3>关于</h3>' +
    '<p class="muted">PCIe 6.0 学习系统 · 纯本地静态网页，无需服务器与账号。<br>' +
    'Windows：双击 index.html 或运行 start-server.bat。<br>' +
    '手机：浏览器访问电脑 IP（见 README），或把整个文件夹拷到手机。<br>' +
    '知识内容基于 PCI-SIG PCIe 6.0/6.1 规范与官方白皮书整理，精确参数以规范原文为准。</p></div>';
}
App.exportData = function () {
  var data = { app: 'pcie6-study', version: 1, exported: new Date().toISOString(), state: state };
  download('pcie6-study-backup-' + todayStr() + '.json', JSON.stringify(data, null, 2), 'application/json');
  toast('备份已导出');
};
App.importData = function (inp) {
  var f = inp.files && inp.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var o = JSON.parse(r.result);
      var st = o.state || o;
      if (st.read && st.wrong && st.stats) {
        state = Object.assign(defaults(), st);
        save(); applyTheme(); App.render();
        toast('导入成功：已读 ' + state.read.length + ' 卡片，错题 ' + Object.keys(state.wrong).length + ' 题');
      } else toast('文件格式不对，导入失败');
    } catch (e) { toast('文件解析失败'); }
  };
  r.readAsText(f);
  inp.value = '';
};
App.resetAll = function () {
  if (confirm('确定清空全部学习数据？此操作不可恢复（建议先导出备份）。')) {
    state = defaults(); save(); applyTheme(); App.render(); toast('已清空');
  }
};

/* ---------------- 主题 ---------------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  $('#themeBtn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}
$('#themeBtn').addEventListener('click', function () {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  save(); applyTheme();
});

/* ---------------- 启动 ---------------- */
load();
applyTheme();
App.render();
window.App = App;
})();
