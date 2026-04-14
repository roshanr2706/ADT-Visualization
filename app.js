// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const now = () => new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let isAnimating = false;

function log(logId, op, detail) {
  const el = $(logId);
  if (!el) return;
  const mkEntry = () => {
    const e = document.createElement('span');
    e.className = 'log-entry';
    e.innerHTML = `<span class="timestamp">${now()}</span><span class="op">${op}</span> ${detail}`;
    return e;
  };
  el.prepend(mkEntry());
  if (el.children.length > 50) el.removeChild(el.lastChild);
  // Mirror graph log entries to the algo-section copy
  if (logId === 'graphLog') {
    const el2 = $('algoGLog');
    if (el2) { el2.prepend(mkEntry()); if (el2.children.length > 50) el2.removeChild(el2.lastChild); }
  }
}

// ═══════════════════════════════════════════════
//  STACK — IMPLEMENTATION METADATA
// ═══════════════════════════════════════════════
let stackData = [];
let implType = 'array';

const implMeta = {
  'array': {
    label: 'Array',
    note: 'Elements stored contiguously in memory. Top is tracked by an index variable. Push appends to the end; pop removes from the end — no shifting needed.',
    complexity: [['push','O(1)'],['pop','O(1)'],['peek','O(1)'],['search','O(n)']]
  },
  'sll-head': {
    label: 'SLL — top at head',
    note: 'Top of stack is the head node. Push prepends a new node; pop removes the head and advances the pointer. No traversal at any point — all O(1).',
    complexity: [['push','O(1)'],['pop','O(1)'],['peek','O(1)'],['search','O(n)']]
  },
  'sll-tail': {
    label: 'SLL — top at tail',
    note: '⚠ Top at tail with only a tail pointer: push is O(1), but pop must walk from HEAD to find the new tail — there is no prev pointer. This makes pop O(n).',
    complexity: [['push','O(1)'],['pop','O(n)'],['peek','O(1)'],['search','O(n)']]
  },
  'dll': {
    label: 'Doubly Linked List — top at tail',
    note: 'The prev pointer on each node solves the SLL-tail problem. Pop simply follows tail.prev to update the tail in O(1) — no traversal needed.',
    complexity: [['push','O(1)'],['pop','O(1)'],['peek','O(1)'],['search','O(n)']]
  }
};

// ═══════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════
const sidebarData = {};
const _sidebarPanels = {};

function updateSidebar(panel) {
  const data = sidebarData[panel];
  const cfg  = _sidebarPanels[panel];
  if (!data || !cfg) return;
  const meta = cfg.getMeta();
  let html = `<div class="sidebar-section"><h3>About</h3><p>${data.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>${cfg.complexityHeader || 'Time Complexity'}</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => {
    const isWarn = cfg.warnFn ? cfg.warnFn(op, c) : false;
    html += `<tr><td>${op}</td><td${isWarn ? ' class="complexity-warn"' : ''}>${c}</td></tr>`;
  });
  html += `</table></div>`;
  if (cfg.extraSection) html += cfg.extraSection();
  $('sidebarContent').innerHTML = html;
}

sidebarData.stack = {
  description: 'A stack is a linear collection where elements are added and removed from the same end — the <em>top</em>. Think of a stack of plates: the last placed is the first taken.',
};
_sidebarPanels.stack = {
  getMeta: () => implMeta[implType],
  warnFn: (op, c) => c === 'O(n)' && op !== 'search',
  extraSection: () => `<div class="sidebar-section"><h3>Memory Layout</h3><p>${
    implType === 'array'
      ? 'Contiguous block — O(1) random access, cache-friendly.'
      : implType === 'dll'
      ? 'Each node allocated separately, holding data + two pointers (next, prev).'
      : 'Each node allocated separately, holding data + one pointer (next).'
  }</p></div>`
};

// ═══════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════
$('sectionTabs').addEventListener('click', e => {
  const tab = e.target.closest('.section-tab');
  if (!tab) return;
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  const section = tab.dataset.section;
  $('section-ds').style.display         = section === 'ds'         ? '' : 'none';
  $('navStrip').style.display           = section === 'ds'         ? '' : 'none';
  $('section-algorithms').style.display = section === 'algorithms' ? '' : 'none';
});

$('navStrip').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const panel = btn.dataset.panel;
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $('panel-' + panel).classList.add('active');
  updateSidebar(panel);
});

$('todayDate').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// ═══════════════════════════════════════════════
//  STACK — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setImpl(type) {
  implType = type;
  document.querySelectorAll('.impl-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.impl === type);
  });
  $('stackImplNote').innerHTML = implMeta[type].note;
  updateSidebar('stack');
  renderStack();
}

// ═══════════════════════════════════════════════
//  STACK — RENDER
// ═══════════════════════════════════════════════
const EMPTY = `<div class="empty-state"><span class="ornament">§</span>Push a value to begin</div>`;

function renderStack() {
  const ac = $('stackCanvas');
  const ic = $('stackImplCanvas');

  if (stackData.length === 0) {
    ac.innerHTML = EMPTY;
    ic.innerHTML = EMPTY;
    return;
  }

  // ── Left pane: abstract vertical stack ──
  let html = '<div class="stack-abstract">';
  for (let i = stackData.length - 1; i >= 0; i--) {
    const isTop = i === stackData.length - 1;
    html += `<div class="stack-item${isTop ? ' stack-top' : ''}">
      <span class="stack-top-label">${isTop ? 'top\u00a0→' : ''}</span>
      <div class="stack-item-box animate-drop" style="animation-delay:${(stackData.length-1-i)*30}ms">${stackData[i]}</div>
      <span class="stack-idx-label">[${i}]</span>
    </div>`;
  }
  html += '<div class="stack-base"></div></div>';
  ac.innerHTML = html;

  // ── Right pane: implementation ──
  switch (implType) {
    case 'array':    renderArrayImpl(ic);  break;
    case 'sll-head':
    case 'sll-tail':
    case 'dll':      renderLLImpl(ic, implType); break;
  }
}

// ── Array implementation ──
function renderArrayImpl(c) {
  const n = stackData.length;
  const extra = Math.min(3, 8 - n);

  let html = '<div class="impl-view">';
  html += '<div class="impl-section-label">Memory cells</div>';
  html += '<div class="impl-array-row">';

  stackData.forEach((v, i) => {
    const isTop = i === n - 1;
    html += `<div class="impl-arr-cell${isTop ? ' is-top' : ''}">
      <div class="arr-val">${v}</div>
      <div class="arr-idx">[${i}]</div>
    </div>`;
  });

  for (let i = n; i < n + extra; i++) {
    html += `<div class="impl-arr-cell empty">
      <div class="arr-val">·</div>
      <div class="arr-idx">[${i}]</div>
    </div>`;
  }

  html += '</div>';

  // Pointer row
  html += '<div class="impl-ptr-row">';
  stackData.forEach((_, i) => {
    html += `<div class="impl-ptr-cell">${i === n - 1 ? '↑\u00a0top' : ''}</div>`;
  });
  for (let i = 0; i < extra; i++) html += '<div class="impl-ptr-cell"></div>';
  html += '</div>';

  html += `<div class="impl-info-row">
    <span class="impl-stat">top\u00a0=\u00a0${n - 1}</span>
    <span class="impl-stat">size\u00a0=\u00a0${n}</span>
    <span class="impl-stat impl-good">push/pop\u00a0→\u00a0O(1)</span>
  </div>`;

  html += '</div>';
  c.innerHTML = html;
}

// ── Linked list implementation ──
function renderLLImpl(c, type) {
  const isHeadTop = type === 'sll-head';
  const isDLL = type === 'dll';

  // Display order: always HEAD on left, TAIL on right
  const nodes = isHeadTop ? [...stackData].reverse() : [...stackData];
  const n = nodes.length;

  let html = '<div class="impl-view impl-ll-view">';
  html += `<div class="impl-section-label">Node chain — ${isDLL ? 'doubly' : 'singly'} linked</div>`;
  html += '<div class="ll-chain">';

  // DLL left null
  if (isDLL) {
    html += '<div class="ll-null-node">NULL</div>';
    html += '<div class="ll-arr-conn ll-back">←</div>';
  }

  nodes.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    const isTop = isHeadTop ? isHead : isTail;

    let flag = '';
    if (isHead && isTop) flag = 'HEAD\u00a0/\u00a0TOP';
    else if (isHead)     flag = 'HEAD';
    else if (isTop)      flag = 'TOP\u00a0/\u00a0TAIL';
    else if (isTail)     flag = 'TAIL';

    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node${isTop ? ' ll-top' : ''}">
        ${isDLL ? `<span class="ll-cell ll-pv">${isHead ? '·' : '←'}</span>` : ''}
        <span class="ll-cell ll-v">${v}</span>
        <span class="ll-cell ll-nx">${isTail ? '·' : '→'}</span>
      </div>
    </div>`;

    if (!isTail) {
      if (isDLL) {
        html += `<div class="ll-bidir"><span>→</span><span>←</span></div>`;
      } else {
        html += `<div class="ll-arr-conn">→</div>`;
      }
    }
  });

  // Right null
  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';

  html += '</div>'; // ll-chain

  // Info row
  if (type === 'sll-tail') {
    html += `<div class="impl-info-row">
      <span class="impl-stat impl-warn">⚠\u00a0pop\u00a0traverses\u00a0HEAD→TAIL\u00a0to\u00a0find\u00a0new\u00a0tail\u00a0→\u00a0O(n)</span>
    </div>`;
  } else if (isDLL) {
    html += `<div class="impl-info-row">
      <span class="impl-stat impl-good">tail.prev\u00a0pointer\u00a0→\u00a0pop\u00a0updates\u00a0tail\u00a0in\u00a0O(1)</span>
    </div>`;
  } else {
    html += `<div class="impl-info-row">
      <span class="impl-stat impl-good">head\u00a0pointer\u00a0→\u00a0push/pop\u00a0at\u00a0head\u00a0→\u00a0O(1)</span>
    </div>`;
  }

  html += '</div>';
  c.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  ANIMATION HELPERS
// ═══════════════════════════════════════════════

// Fly the top element up and out of both panes
async function animatePopOut() {
  const ac = $('stackCanvas');
  const ic = $('stackImplCanvas');

  const topBox = ac.querySelector('.stack-item.stack-top .stack-item-box');
  let implTop = null;

  if (implType === 'array') {
    implTop = ic.querySelector('.impl-arr-cell.is-top .arr-val');
  } else {
    const wraps = ic.querySelectorAll('.ll-node-wrap');
    if (wraps.length) {
      const idx = implType === 'sll-head' ? 0 : wraps.length - 1;
      implTop = wraps[idx].querySelector('.ll-node');
    }
  }

  if (topBox)  topBox.classList.add('animate-pop-out');
  if (implTop) implTop.classList.add('animate-pop-out');
  await sleep(440);
}

// Walk a cursor node-by-node from HEAD toward the new tail (sll-tail pop is O(n))
async function animateSLLTailTraversal() {
  const ic = $('stackImplCanvas');
  const wraps = ic.querySelectorAll('.ll-node-wrap');
  const n = wraps.length;
  if (n <= 1) return;

  for (let i = 0; i < n - 1; i++) {
    const node = wraps[i].querySelector('.ll-node');
    node.classList.add('ll-traversing');
    if (i > 0) wraps[i - 1].querySelector('.ll-node').classList.remove('ll-traversing');
    await sleep(370);
  }
  // New tail briefly highlighted before pop
  if (n >= 2) wraps[n - 2].querySelector('.ll-node').classList.remove('ll-traversing');
  await sleep(220);
}

// Pulse the top element and show a floating "→ return X" callout
function animatePeek(v) {
  const ac = $('stackCanvas');
  const ic = $('stackImplCanvas');

  // ── Abstract pane ──
  const topItem = ac.querySelector('.stack-item.stack-top');
  const topBox  = topItem && topItem.querySelector('.stack-item-box');
  if (!topBox) return;
  topBox.classList.add('animate-pulse');
  spawnPeekBubble(v, topItem);
  setTimeout(() => topBox.classList.remove('animate-pulse'), 600);

  // ── Impl pane ──
  let implAnchor = null;
  if (implType === 'array') {
    implAnchor = ic.querySelector('.impl-arr-cell.is-top');
  } else {
    const wraps = ic.querySelectorAll('.ll-node-wrap');
    if (wraps.length) {
      implAnchor = wraps[implType === 'sll-head' ? 0 : wraps.length - 1];
    }
  }
  if (implAnchor) {
    const implTopEl = implAnchor.querySelector('.ll-node, .arr-val');
    if (implTopEl) {
      implTopEl.classList.add('animate-pulse');
      setTimeout(() => implTopEl.classList.remove('animate-pulse'), 600);
    }
    spawnPeekBubble(v, implAnchor);
  }
}

function spawnPeekBubble(v, anchor) {
  const bubble = document.createElement('div');
  bubble.className = 'peek-bubble';
  bubble.innerHTML = `<span class="peek-arrow">→</span>\u00a0return\u00a0<span class="peek-val">${v}</span>`;
  anchor.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1600);
}

// ═══════════════════════════════════════════════
//  STACK — OPERATIONS
// ═══════════════════════════════════════════════
function stackPush() {
  if (isAnimating) return;
  const v = $('stackInput').value;
  if (v === '') return;
  stackData.push(Number(v));
  log('stackLog', 'push', `<span class="val">${v}</span> → top of stack (size: ${stackData.length})`);
  $('stackInput').value = '';
  renderStack();
}

async function stackPop() {
  if (isAnimating) return;
  if (!stackData.length) { log('stackLog', 'pop', 'stack is empty — underflow'); return; }

  isAnimating = true;

  // SLL tail: walk the chain to find the new tail first (that's what makes it O(n))
  if (implType === 'sll-tail' && stackData.length > 1) {
    await animateSLLTailTraversal();
  }

  await animatePopOut();

  const v = stackData.pop();
  log('stackLog', 'pop', `<span class="val">${v}</span> removed from top (size: ${stackData.length})`);
  renderStack();
  isAnimating = false;
}

function stackPeek() {
  if (isAnimating) return;
  if (!stackData.length) { log('stackLog', 'peek', 'stack is empty'); return; }
  const v = stackData[stackData.length - 1];
  log('stackLog', 'peek', `top = <span class="val">${v}</span>`);
  animatePeek(v);
}

function stackClear() {
  if (isAnimating) return;
  stackData = [];
  renderStack();
  log('stackLog', 'clear', 'stack emptied');
}

// ─── Enter key ───
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (!e.target.classList.contains('ctrl-input')) return;
  const btn = e.target.parentElement.querySelector('.ctrl-btn');
  if (btn) btn.click();
});

// ─── Init ───
setImpl('array');


// ═══════════════════════════════════════════════
//  LINKED LIST — DATA & METADATA
// ═══════════════════════════════════════════════
let llData = [];
let llImpl = 'sll-head';
let llAnimating = false;

const llImplMeta = {
  'sll-head': {
    label: 'SLL — head only',
    note: 'Only a <strong>head</strong> pointer. insertHead and deleteHead are O(1). insertTail and deleteTail must traverse the entire chain to reach the far end — both are O(n).',
    complexity: [['insertHead','O(1)'],['insertTail','O(n)'],['insertAt','O(n)'],['deleteHead','O(1)'],['deleteTail','O(n)'],['search','O(n)']]
  },
  'sll-headtail': {
    label: 'SLL — head + tail',
    note: 'Head <em>and</em> tail pointers. insertTail is now O(1) via the tail pointer. But deleteTail is still <strong>O(n)</strong> — no prev pointer means we must walk from head to find the new tail.',
    complexity: [['insertHead','O(1)'],['insertTail','O(1)'],['insertAt','O(n)'],['deleteHead','O(1)'],['deleteTail','O(n)'],['search','O(n)']]
  },
  'dll': {
    label: 'DLL — head + tail',
    note: 'Doubly linked: each node stores <strong>next</strong> and <strong>prev</strong>. deleteTail is now O(1) — <code>tail.prev</code> gives the new tail instantly. All four front/back operations are O(1).',
    complexity: [['insertHead','O(1)'],['insertTail','O(1)'],['insertAt','O(n)'],['deleteHead','O(1)'],['deleteTail','O(1)'],['search','O(n)']]
  }
};

// ─── Extend sidebar data ───
sidebarData.linkedlist = {
  description: 'A linked list stores elements in nodes, each holding a value and one or two pointers to neighbouring nodes. Unlike arrays, nodes are scattered in memory — no contiguous block, no O(1) random access.'
};

_sidebarPanels.linkedlist = {
  getMeta: () => llImplMeta[llImpl],
  warnFn: (op, c) => c === 'O(n)' && op !== 'search' && op !== 'insertAt',
  extraSection: () => `<div class="sidebar-section"><h3>Memory Layout</h3><p>${
    llImpl === 'dll'
      ? 'Each node holds <em>data</em> + two pointers (next, prev). More memory per node but enables O(1) removal from both ends.'
      : 'Each node holds <em>data</em> + one pointer (next). Smaller nodes but deletion from the tail requires traversal.'
  }</p></div>`
};

// ═══════════════════════════════════════════════
//  LINKED LIST — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setLLImpl(type) {
  llImpl = type;
  document.querySelectorAll('[data-ll-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.llImpl === type);
  });
  $('llImplNote').innerHTML = llImplMeta[type].note;
  if ($('panel-linkedlist').classList.contains('active')) updateSidebar('linkedlist');
  renderLinkedList(true);
}

// ═══════════════════════════════════════════════
//  LINKED LIST — RENDER
// ═══════════════════════════════════════════════
const LL_EMPTY = `<div class="empty-state"><span class="ornament">§</span>Insert a value to begin</div>`;

function renderLinkedList(animate = false) {
  const ac = $('llCanvas');
  const ic = $('llImplCanvas');
  if (llData.length === 0) { ac.innerHTML = LL_EMPTY; ic.innerHTML = LL_EMPTY; return; }
  renderLLAbstract(ac, animate);
  renderLLStructView(ic);
}

// ── Abstract view: value-only nodes ──
function renderLLAbstract(c, animate = false) {
  const n = llData.length;
  const hasTail = llImpl !== 'sll-head';
  const isDLL   = llImpl === 'dll';

  let html = '<div class="impl-view impl-ll-view">';
  html += '<div class="impl-section-label">Logical sequence</div>';
  html += '<div class="ll-chain ll-chain-abs">';

  if (isDLL) {
    html += '<div class="ll-null-node">NULL</div>';
    html += '<div class="ll-arr-conn ll-back">←</div>';
  }

  llData.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    let flag = '';
    if (isHead && isTail && hasTail) flag = 'HEAD\u00a0/\u00a0TAIL';
    else if (isHead)               flag = 'HEAD';
    else if (isTail && hasTail)    flag = 'TAIL';

    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node ll-abs-node${animate ? ' animate-drop' : ''}" ${animate ? `style="animation-delay:${i*25}ms"` : ''} data-ll-idx="${i}">
        <span class="ll-cell ll-v">${v}</span>
      </div>
    </div>`;
    if (!isTail) {
      html += isDLL
        ? '<div class="ll-bidir"><span>→</span><span>←</span></div>'
        : '<div class="ll-arr-conn">→</div>';
    }
  });

  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';

  html += '</div>'; // ll-chain

  html += `<div class="impl-info-row">
    <span class="impl-stat">size\u00a0=\u00a0${n}</span>
    <span class="impl-stat">${isDLL ? 'doubly linked' : 'singly linked'}</span>
    <span class="impl-stat">${hasTail ? 'head\u00a0+\u00a0tail pointers' : 'head pointer only'}</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

// ── Impl view: full struct fields ──
function renderLLStructView(c) {
  const n = llData.length;
  const hasTail = llImpl !== 'sll-head';
  const isDLL   = llImpl === 'dll';

  let html = '<div class="impl-view impl-ll-view">';
  html += `<div class="impl-section-label">Node structs — ${isDLL ? 'doubly' : 'singly'} linked</div>`;

  // Pointer vars row
  html += '<div class="ll-ptr-vars">';
  html += `<div class="ll-ptr-var-box">head <span class="ll-ptr-arrow-r">→</span></div>`;
  if (hasTail) html += `<div class="ll-ptr-var-box ll-ptr-tail">tail <span class="ll-ptr-arrow-r">→</span></div>`;
  html += '</div>';

  html += '<div class="ll-chain">';

  if (isDLL) {
    html += '<div class="ll-null-node">NULL</div>';
    html += '<div class="ll-arr-conn ll-back">←</div>';
  }

  llData.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    let flag = '';
    if (isHead && isTail && hasTail) flag = 'HEAD\u00a0/\u00a0TAIL';
    else if (isHead)               flag = 'HEAD';
    else if (isTail && hasTail)    flag = 'TAIL';

    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node${(isTail && hasTail) || isHead ? ' ll-top' : ''}" data-ll-struct-idx="${i}">
        ${isDLL ? `<span class="ll-cell ll-pv">${isHead ? '·' : '←'}</span>` : ''}
        <span class="ll-cell ll-v">${v}</span>
        <span class="ll-cell ll-nx">${isTail ? '·' : '→'}</span>
      </div>
    </div>`;
    if (!isTail) {
      html += isDLL
        ? '<div class="ll-bidir"><span>→</span><span>←</span></div>'
        : '<div class="ll-arr-conn">→</div>';
    }
  });

  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';
  html += '</div>'; // ll-chain

  // Complexity note
  if (llImpl === 'sll-headtail') {
    html += `<div class="impl-info-row"><span class="impl-stat impl-warn">⚠\u00a0deleteTail traverses HEAD→new-tail to update tail pointer\u00a0→\u00a0O(n)</span></div>`;
  } else if (llImpl === 'dll') {
    html += `<div class="impl-info-row"><span class="impl-stat impl-good">tail.prev\u00a0→\u00a0all front/back operations O(1)</span></div>`;
  } else {
    html += `<div class="impl-info-row"><span class="impl-stat impl-warn">⚠\u00a0no tail pointer\u00a0—\u00a0insertTail\u00a0&\u00a0deleteTail traverse full list\u00a0→\u00a0O(n)</span></div>`;
  }

  html += '</div>';
  c.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  LINKED LIST — ANIMATION HELPERS (both panes simultaneously)
// ═══════════════════════════════════════════════

// Step a cursor node-by-node across both canvases at the same time
async function animateLLTraverseBoth(from, to) {
  const nodesA = $('llCanvas').querySelectorAll('.ll-node-wrap .ll-node');
  const nodesI = $('llImplCanvas').querySelectorAll('.ll-node-wrap .ll-node');
  for (let i = from; i <= to; i++) {
    if (i > from) {
      nodesA[i - 1] && nodesA[i - 1].classList.remove('ll-traversing');
      nodesI[i - 1] && nodesI[i - 1].classList.remove('ll-traversing');
    }
    nodesA[i] && nodesA[i].classList.add('ll-traversing');
    nodesI[i] && nodesI[i].classList.add('ll-traversing');
    await sleep(320);
  }
  nodesA[to] && nodesA[to].classList.remove('ll-traversing');
  nodesI[to] && nodesI[to].classList.remove('ll-traversing');
  await sleep(120);
}

// Pop node at idx out of both canvases simultaneously
async function animateLLPopBoth(idx) {
  const wrapsA = $('llCanvas').querySelectorAll('.ll-node-wrap');
  const wrapsI = $('llImplCanvas').querySelectorAll('.ll-node-wrap');
  const nodeA  = wrapsA[idx] ? wrapsA[idx].querySelector('.ll-node') : null;
  const nodeI  = wrapsI[idx] ? wrapsI[idx].querySelector('.ll-node') : null;
  if (nodeA) nodeA.classList.add('animate-pop-out');
  if (nodeI) nodeI.classList.add('animate-pop-out');
  await sleep(440);
}

// Flash found highlight on both canvases simultaneously
function animateLLFoundBoth(idx) {
  [
    $('llCanvas').querySelectorAll('.ll-node-wrap .ll-node')[idx],
    $('llImplCanvas').querySelectorAll('.ll-node-wrap .ll-node')[idx]
  ].forEach(n => {
    if (!n) return;
    n.classList.add('ll-found');
    setTimeout(() => n.classList.remove('ll-found'), 1800);
  });
}

// ═══════════════════════════════════════════════
//  LINKED LIST — OPERATIONS
// ═══════════════════════════════════════════════
function llVal() { return $('llValueInput').value; }
function llIdx() { return $('llIndexInput').value; }
function llClearInputs() { $('llValueInput').value = ''; $('llIndexInput').value = ''; }

function llInsertHead() {
  if (llAnimating) return;
  const v = llVal();
  if (v === '') return;
  llData.unshift(Number(v));
  log('llLog', 'insertHead', `<span class="val">${v}</span> → new head (size: ${llData.length})`);
  llClearInputs();
  renderLinkedList(true);
}

async function llInsertTail() {
  if (llAnimating) return;
  const v = llVal();
  if (v === '') return;
  llAnimating = true;

  // SLL head-only: must traverse to find the tail — O(n)
  if (llImpl === 'sll-head' && llData.length > 0) {
    renderLinkedList();
    await animateLLTraverseBoth(0, llData.length - 1);
  }

  llData.push(Number(v));
  log('llLog', 'insertTail', `<span class="val">${v}</span> → new tail (size: ${llData.length})`);
  llClearInputs();
  renderLinkedList(true);
  llAnimating = false;
}

async function llInsertAt() {
  if (llAnimating) return;
  const v = llVal();
  const idx = llIdx();
  if (v === '' || idx === '') return;
  const i = Number(idx);
  if (i < 0 || i > llData.length) {
    log('llLog', 'insertAt', `index ${i} out of range [0, ${llData.length}]`); return;
  }
  llAnimating = true;

  if (i > 0) {
    renderLinkedList();
    await animateLLTraverseBoth(0, i - 1);
  }

  llData.splice(i, 0, Number(v));
  log('llLog', 'insertAt', `<span class="val">${v}</span> at index ${i} (size: ${llData.length})`);
  llClearInputs();
  renderLinkedList(true);
  llAnimating = false;
}

async function llDeleteHead() {
  if (llAnimating) return;
  if (!llData.length) { log('llLog', 'deleteHead', 'list is empty'); return; }
  llAnimating = true;
  await animateLLPopBoth(0);
  const v = llData.shift();
  log('llLog', 'deleteHead', `<span class="val">${v}</span> removed from head (size: ${llData.length})`);
  renderLinkedList();
  llAnimating = false;
}

async function llDeleteTail() {
  if (llAnimating) return;
  if (!llData.length) { log('llLog', 'deleteTail', 'list is empty'); return; }
  llAnimating = true;
  const n = llData.length;

  // SLL (either variant): must traverse to find new tail — O(n)
  if (llImpl !== 'dll' && n > 1) {
    await animateLLTraverseBoth(0, n - 2);
  }

  await animateLLPopBoth(llData.length - 1);
  const v = llData.pop();
  log('llLog', 'deleteTail', `<span class="val">${v}</span> removed from tail (size: ${llData.length})`);
  renderLinkedList();
  llAnimating = false;
}

async function llDeleteValue() {
  if (llAnimating) return;
  const v = llVal();
  if (v === '') return;
  const target = Number(v);
  const idx = llData.indexOf(target);
  if (idx === -1) { log('llLog', 'deleteValue', `<span class="val">${v}</span> not found`); return; }

  llAnimating = true;
  await animateLLTraverseBoth(0, idx);
  await animateLLPopBoth(idx);

  llData.splice(idx, 1);
  log('llLog', 'deleteValue', `<span class="val">${v}</span> removed from index ${idx} (size: ${llData.length})`);
  llClearInputs();
  renderLinkedList();
  llAnimating = false;
}

async function llSearch() {
  if (llAnimating) return;
  const v = llVal();
  if (v === '') return;
  const target = Number(v);
  llAnimating = true;
  renderLinkedList();

  const idx = llData.indexOf(target);
  const traverseTo = idx === -1 ? llData.length - 1 : idx;
  await animateLLTraverseBoth(0, traverseTo);

  if (idx !== -1) {
    animateLLFoundBoth(idx);
    log('llLog', 'search', `<span class="val">${v}</span> found at index ${idx}`);
  } else {
    log('llLog', 'search', `<span class="val">${v}</span> not found — traversed all ${llData.length} nodes`);
  }

  llAnimating = false;
}

function llClear() {
  if (llAnimating) return;
  llData = [];
  renderLinkedList();
  log('llLog', 'clear', 'list emptied');
}

// ─── Init LL ───
setLLImpl('sll-head');


// ═══════════════════════════════════════════════
//  QUEUE — DATA & METADATA
// ═══════════════════════════════════════════════
let queueData = [];
let queueImpl = 'array';
let queueAnimating = false;

// Circular array state
const QUEUE_CAP = 8;
let circularSlots = Array(QUEUE_CAP).fill(null);
let queueFront = 0;
let queueRear  = -1;
let queueCount = 0;

// Two-stacks queue state
let twoStacksInbox  = [];   // stack 1 — enqueue here
let twoStacksOutbox = [];   // stack 2 — dequeue from here

const queueImplMeta = {
  'array': {
    label: 'Simple Array',
    note: 'Elements stored in a plain array. Enqueue appends to the rear — O(1). Dequeue removes from the front, which shifts every remaining element left — O(n). Not ideal for high-throughput use.',
    complexity: [['enqueue','O(1)'],['dequeue','O(n)'],['peek','O(1)'],['search','O(n)']]
  },
  'circular': {
    label: 'Circular Array',
    note: `Fixed-capacity array (capacity = ${QUEUE_CAP}) with <strong>front</strong> and <strong>rear</strong> indices. Both move forward with modular arithmetic: <code>rear = (rear + 1) % cap</code>. No shifting ever — enqueue and dequeue are both O(1).`,
    complexity: [['enqueue','O(1)'],['dequeue','O(1)'],['peek','O(1)'],['search','O(n)']]
  },
  'sll': {
    label: 'SLL — head + tail (front at head)',
    note: 'A singly linked list with <strong>head</strong> (front) and <strong>tail</strong> (rear) pointers. Enqueue appends a new node at the tail — O(1). Dequeue removes the head node — O(1). No capacity limit. This is the <em>optimal</em> SLL queue layout.',
    complexity: [['enqueue','O(1)'],['dequeue','O(1)'],['peek','O(1)'],['search','O(n)']]
  },
  'sll-rear-head': {
    label: 'SLL — head + tail (rear at head)',
    note: 'Rear of queue placed at the <strong>head</strong> of the list; front at the <strong>tail</strong>. Enqueue prepends at the head — O(1). Dequeue must remove the tail node, but a singly linked list requires traversal to find the new tail — O(n). This layout is <em>suboptimal</em>.',
    complexity: [['enqueue','O(1)'],['dequeue','O(n)'],['peek','O(n)'],['search','O(n)']]
  },
  'sll-head-only': {
    label: 'SLL — head only',
    note: 'A singly linked list with <strong>only a head pointer</strong> (no tail). Front of queue is at the head — dequeue removes the head in O(1). Enqueue must traverse the entire list to reach the end — O(n). Keeping only a head pointer makes enqueue expensive.',
    complexity: [['enqueue','O(n)'],['dequeue','O(1)'],['peek','O(1)'],['search','O(n)']]
  },
  'two-stacks': {
    label: 'Two Stacks',
    note: 'Two stacks: <strong>inbox</strong> (stack 1) and <strong>outbox</strong> (stack 2). Enqueue always pushes to inbox — O(1). Dequeue pops from outbox; if outbox is empty, all elements are transferred from inbox to outbox first. Each element is transferred at most once, giving O(1) <em>amortized</em> dequeue.',
    complexity: [['enqueue','O(1)'],['dequeue','O(1) amortized'],['peek','O(1) amortized'],['search','O(n)']]
  }
};

// ─── Extend sidebar data ───
sidebarData.queue = {
  description: 'A queue is a linear collection where elements are added at the rear and removed from the front — First In, First Out (FIFO). Like a line of people: the first to arrive is the first served.'
};

_sidebarPanels.queue = {
  getMeta: () => queueImplMeta[queueImpl],
  warnFn: (op, c) => c === 'O(n)' && op !== 'search',
  extraSection: () => {
    const memNote = queueImpl === 'array'
      ? 'Contiguous block — elements shift on dequeue, cache-friendly but O(n) removal.'
      : queueImpl === 'circular'
      ? `Fixed-size contiguous block (${QUEUE_CAP} slots). Indices wrap around — no shifting, O(1) access.`
      : queueImpl === 'sll'
      ? 'Each node allocated separately with data + one next pointer. Head (front) and tail (rear) maintained for O(1) both ends.'
      : queueImpl === 'sll-rear-head'
      ? 'Each node with data + next pointer. Rear at head (O(1) enqueue) but dequeue must traverse to find new tail — O(n).'
      : queueImpl === 'sll-head-only'
      ? 'Each node with data + next pointer. Only head pointer stored — enqueue must traverse entire list — O(n).'
      : 'Two separate stacks (arrays). Each element crosses from inbox to outbox at most once — O(1) amortized per operation.';
    return `<div class="sidebar-section"><h3>Memory Layout</h3><p>${memNote}</p></div>`;
  }
};

// ═══════════════════════════════════════════════
//  QUEUE — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setQImpl(type) {
  queueImpl = type;
  document.querySelectorAll('[data-q-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.qImpl === type);
  });
  $('queueImplNote').innerHTML = queueImplMeta[type].note;
  if ($('panel-queue').classList.contains('active')) updateSidebar('queue');
  // Clear data on impl switch to avoid inconsistent state
  queueData = [];
  circularSlots = Array(QUEUE_CAP).fill(null);
  queueFront = 0; queueRear = -1; queueCount = 0;
  twoStacksInbox = []; twoStacksOutbox = [];
  renderQueue();
}

// ═══════════════════════════════════════════════
//  QUEUE — RENDER
// ═══════════════════════════════════════════════
const Q_EMPTY = `<div class="empty-state"><span class="ornament">§</span>Enqueue a value to begin</div>`;

function renderQueue() {
  const ac = $('queueCanvas');
  const ic = $('queueImplCanvas');
  let isEmpty;
  if (queueImpl === 'circular')   isEmpty = queueCount === 0;
  else if (queueImpl === 'two-stacks') isEmpty = twoStacksInbox.length === 0 && twoStacksOutbox.length === 0;
  else isEmpty = queueData.length === 0;
  if (isEmpty) { ac.innerHTML = Q_EMPTY; ic.innerHTML = Q_EMPTY; return; }
  renderQueueAbstract(ac);
  if      (queueImpl === 'array')         renderQueueArrayImpl(ic);
  else if (queueImpl === 'circular')      renderQueueCircularImpl(ic);
  else if (queueImpl === 'sll')           renderQueueSLLImpl(ic);
  else if (queueImpl === 'sll-rear-head') renderQueueSLLRearHeadImpl(ic);
  else if (queueImpl === 'sll-head-only') renderQueueSLLHeadOnlyImpl(ic);
  else if (queueImpl === 'two-stacks')    renderQueueTwoStacksImpl(ic);
}

function renderQueueAbstract(c) {
  let items;
  if (queueImpl === 'circular') {
    items = getCircularItems();
  } else if (queueImpl === 'two-stacks') {
    // outbox top (last element) is the front; inbox bottom (first element) enqueued earliest
    items = [...twoStacksOutbox].reverse().concat(twoStacksInbox);
  } else if (queueImpl === 'sll-rear-head') {
    // queueData[0] = rear (head of list); reverse for front-first display
    items = [...queueData].reverse();
  } else {
    items = queueData;
  }
  let html = '<div class="queue-abstract">';
  html += '<div class="queue-end-label">FRONT<br>⟵ out</div>';
  items.forEach((v, i) => {
    const isFront = i === 0;
    html += `<div class="impl-arr-cell${isFront ? ' is-top' : ''}">
      <div class="arr-val animate-drop" style="animation-delay:${i*25}ms">${v}</div>
    </div>`;
  });
  html += '<div class="queue-end-label">in ⟶<br>REAR</div>';
  html += '</div>';
  c.innerHTML = html;
}

function getCircularItems() {
  const items = [];
  for (let i = 0; i < queueCount; i++) {
    items.push(circularSlots[(queueFront + i) % QUEUE_CAP]);
  }
  return items;
}

function renderQueueArrayImpl(c) {
  const n = queueData.length;
  const extra = Math.min(3, 8 - n);
  let html = '<div class="impl-view">';
  html += '<div class="impl-section-label">Memory cells</div>';
  html += '<div class="impl-array-row">';
  queueData.forEach((v, i) => {
    const isFront = i === 0;
    const isRear  = i === n - 1;
    html += `<div class="impl-arr-cell${isFront ? ' is-top' : ''}">
      <div class="arr-val">${v}</div>
      <div class="arr-idx">[${i}]</div>
    </div>`;
  });
  for (let i = n; i < n + extra; i++) {
    html += `<div class="impl-arr-cell empty"><div class="arr-val">·</div><div class="arr-idx">[${i}]</div></div>`;
  }
  html += '</div>';
  // Pointer row
  html += '<div class="impl-ptr-row">';
  queueData.forEach((_, i) => {
    const isFront = i === 0, isRear = i === n - 1;
    const label = isFront && isRear ? '↑\u00a0f/r' : isFront ? '↑\u00a0front' : isRear ? '↑\u00a0rear' : '';
    html += `<div class="impl-ptr-cell">${label}</div>`;
  });
  for (let i = 0; i < extra; i++) html += '<div class="impl-ptr-cell"></div>';
  html += '</div>';
  html += `<div class="impl-info-row">
    <span class="impl-stat">front\u00a0=\u00a00</span>
    <span class="impl-stat">rear\u00a0=\u00a0${n - 1}</span>
    <span class="impl-stat">size\u00a0=\u00a0${n}</span>
    <span class="impl-stat impl-warn">dequeue\u00a0shifts\u00a0all\u00a0elements\u00a0→\u00a0O(n)</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

function renderQueueCircularImpl(c) {
  let html = '<div class="impl-view">';
  html += `<div class="impl-section-label">Circular buffer — capacity ${QUEUE_CAP}</div>`;
  html += '<div class="impl-array-row">';
  for (let i = 0; i < QUEUE_CAP; i++) {
    const val = circularSlots[i];
    const isEmpty = val === null;
    const isFront = !isEmpty && i === queueFront;
    const isRear  = !isEmpty && i === queueRear;
    html += `<div class="impl-arr-cell${isEmpty ? ' empty' : (isFront ? ' is-top' : '')}">
      <div class="arr-val">${isEmpty ? '·' : val}</div>
      <div class="arr-idx">[${i}]</div>
    </div>`;
  }
  html += '</div>';
  // Pointer row
  html += '<div class="impl-ptr-row">';
  for (let i = 0; i < QUEUE_CAP; i++) {
    const isFront = i === queueFront && queueCount > 0;
    const isRear  = i === queueRear  && queueCount > 0;
    const label = isFront && isRear ? '↑\u00a0f/r' : isFront ? '↑\u00a0front' : isRear ? '↑\u00a0rear' : '';
    html += `<div class="impl-ptr-cell">${label}</div>`;
  }
  html += '</div>';
  const nextRear = (queueRear + 1) % QUEUE_CAP;
  html += `<div class="impl-info-row">
    <span class="impl-stat">front\u00a0=\u00a0${queueFront}</span>
    <span class="impl-stat">rear\u00a0=\u00a0${queueRear}</span>
    <span class="impl-stat">count\u00a0=\u00a0${queueCount}\u00a0/\u00a0${QUEUE_CAP}</span>
    <span class="impl-stat impl-good">next\u00a0rear\u00a0=\u00a0(${queueRear}\u00a0+\u00a01)\u00a0%\u00a0${QUEUE_CAP}\u00a0=\u00a0${nextRear}</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

function renderQueueSLLImpl(c) {
  const n = queueData.length;
  let html = '<div class="impl-view impl-ll-view">';
  html += '<div class="impl-section-label">Node chain — singly linked</div>';
  html += '<div class="ll-ptr-vars">';
  html += `<div class="ll-ptr-var-box">head\u00a0(front) <span class="ll-ptr-arrow-r">→</span></div>`;
  html += `<div class="ll-ptr-var-box ll-ptr-tail">tail\u00a0(rear) <span class="ll-ptr-arrow-r">→</span></div>`;
  html += '</div>';
  html += '<div class="ll-chain">';
  queueData.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    let flag = '';
    if (isHead && isTail) flag = 'HEAD\u00a0/\u00a0TAIL';
    else if (isHead)      flag = 'HEAD\u00a0(front)';
    else if (isTail)      flag = 'TAIL\u00a0(rear)';
    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node${isHead || isTail ? ' ll-top' : ''}">
        <span class="ll-cell ll-v">${v}</span>
        <span class="ll-cell ll-nx">${isTail ? '·' : '→'}</span>
      </div>
    </div>`;
    if (!isTail) html += '<div class="ll-arr-conn">→</div>';
  });
  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';
  html += '</div>';
  html += `<div class="impl-info-row">
    <span class="impl-stat impl-good">enqueue\u00a0→\u00a0tail\u00a0O(1)\u00a0·\u00a0dequeue\u00a0→\u00a0head\u00a0O(1)</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

function renderQueueSLLRearHeadImpl(c) {
  // queueData[0] = head of list = rear of queue (most recently enqueued)
  // queueData[last] = tail of list = front of queue (oldest element)
  const n = queueData.length;
  let html = '<div class="impl-view impl-ll-view">';
  html += '<div class="impl-section-label">Node chain — rear at head, front at tail</div>';
  html += '<div class="ll-ptr-vars">';
  html += `<div class="ll-ptr-var-box">head\u00a0(rear) <span class="ll-ptr-arrow-r">→</span></div>`;
  html += `<div class="ll-ptr-var-box ll-ptr-tail">tail\u00a0(front) <span class="ll-ptr-arrow-r">→</span></div>`;
  html += '</div>';
  html += '<div class="ll-chain">';
  queueData.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    let flag = '';
    if (isHead && isTail) flag = 'HEAD\u00a0/\u00a0TAIL';
    else if (isHead) flag = 'HEAD\u00a0(rear)';
    else if (isTail) flag = 'TAIL\u00a0(front)';
    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node${isHead || isTail ? ' ll-top' : ''}">
        <span class="ll-cell ll-v">${v}</span>
        <span class="ll-cell ll-nx">${isTail ? '·' : '→'}</span>
      </div>
    </div>`;
    if (!isTail) html += '<div class="ll-arr-conn">→</div>';
  });
  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';
  html += '</div>';
  html += `<div class="impl-info-row">
    <span class="impl-stat impl-good">enqueue\u00a0→\u00a0head\u00a0O(1)</span>
    <span class="impl-stat impl-warn">dequeue\u00a0→\u00a0tail\u00a0requires\u00a0traversal\u00a0O(n)</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

function renderQueueSLLHeadOnlyImpl(c) {
  // queueData[0] = front (head), queueData[last] = rear (tail, no pointer stored)
  const n = queueData.length;
  let html = '<div class="impl-view impl-ll-view">';
  html += '<div class="impl-section-label">Node chain — head pointer only</div>';
  html += '<div class="ll-ptr-vars">';
  html += `<div class="ll-ptr-var-box">head\u00a0(front) <span class="ll-ptr-arrow-r">→</span></div>`;
  html += '</div>';
  html += '<div class="ll-chain">';
  queueData.forEach((v, i) => {
    const isHead = i === 0;
    const isTail = i === n - 1;
    let flag = '';
    if (isHead && isTail) flag = 'HEAD\u00a0/\u00a0rear';
    else if (isHead) flag = 'HEAD\u00a0(front)';
    else if (isTail) flag = 'rear\u00a0(no\u00a0pointer)';
    html += `<div class="ll-node-wrap">
      <div class="ll-flag">${flag}</div>
      <div class="ll-node${isHead ? ' ll-top' : isTail ? ' ll-top' : ''}">
        <span class="ll-cell ll-v">${v}</span>
        <span class="ll-cell ll-nx">${isTail ? '·' : '→'}</span>
      </div>
    </div>`;
    if (!isTail) html += '<div class="ll-arr-conn">→</div>';
  });
  html += '<div class="ll-arr-conn">→</div>';
  html += '<div class="ll-null-node">NULL</div>';
  html += '</div>';
  html += `<div class="impl-info-row">
    <span class="impl-stat impl-warn">enqueue\u00a0must\u00a0traverse\u00a0to\u00a0rear\u00a0O(n)</span>
    <span class="impl-stat impl-good">dequeue\u00a0→\u00a0head\u00a0O(1)</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

function renderQueueTwoStacksImpl(c) {
  function renderMiniStack(data, label, topLabel) {
    let s = `<div style="min-width:140px"><div class="impl-section-label" style="font-size:0.7rem">${label}</div>`;
    s += '<div class="stack-abstract" style="min-height:60px">';
    if (data.length === 0) {
      s += '<div style="text-align:center;color:#aaa;font-style:italic;padding:8px 0;font-size:0.8rem">empty</div>';
    } else {
      for (let i = data.length - 1; i >= 0; i--) {
        const isTop = i === data.length - 1;
        s += `<div class="stack-item${isTop ? ' stack-top' : ''}">
          <span class="stack-top-label">${isTop ? topLabel + '\u00a0→' : ''}</span>
          <div class="stack-item-box">${data[i]}</div>
        </div>`;
      }
    }
    s += '<div class="stack-base"></div></div></div>';
    return s;
  }

  let html = '<div class="impl-view">';
  html += '<div class="impl-section-label">Two stacks — inbox &amp; outbox</div>';
  html += '<div style="display:flex;gap:32px;align-items:flex-start;flex-wrap:wrap;padding:8px 0">';
  html += renderMiniStack(twoStacksInbox,  'Stack 1 — inbox (enqueue)', 'top');
  html += '<div style="padding-top:40px;font-size:1.2rem;color:#888;align-self:center">⇄</div>';
  html += renderMiniStack(twoStacksOutbox, 'Stack 2 — outbox (dequeue from top)', 'front');
  html += '</div>';
  const totalSize = twoStacksInbox.length + twoStacksOutbox.length;
  html += `<div class="impl-info-row">
    <span class="impl-stat">inbox\u00a0=\u00a0${twoStacksInbox.length}</span>
    <span class="impl-stat">outbox\u00a0=\u00a0${twoStacksOutbox.length}</span>
    <span class="impl-stat">total\u00a0=\u00a0${totalSize}</span>
    <span class="impl-stat impl-good">amortized\u00a0O(1)\u00a0per\u00a0operation</span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  QUEUE — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function animateQueueDequeue() {
  const ac = $('queueCanvas');
  const ic = $('queueImplCanvas');
  const frontA = ac.querySelector('.impl-arr-cell.is-top .arr-val');
  let frontI = null;
  const isSLL = queueImpl === 'sll' || queueImpl === 'sll-rear-head' || queueImpl === 'sll-head-only';
  if (isSLL) {
    // For sll-rear-head the front is at the TAIL (last node-wrap); for others it's the first
    const wraps = ic.querySelectorAll('.ll-node-wrap');
    const targetWrap = queueImpl === 'sll-rear-head' ? wraps[wraps.length - 1] : wraps[0];
    frontI = targetWrap && targetWrap.querySelector('.ll-node');
  } else if (queueImpl === 'two-stacks') {
    frontI = ic.querySelector('.stack-item.stack-top .stack-item-box');
  } else {
    frontI = ic.querySelector('.impl-arr-cell.is-top .arr-val');
  }
  if (frontA) frontA.classList.add('animate-pop-out');
  if (frontI) frontI.classList.add('animate-pop-out');
  await sleep(440);
}

function animateQueuePeek(v) {
  const ac = $('queueCanvas');
  const ic = $('queueImplCanvas');
  const frontItem = ac.querySelector('.impl-arr-cell.is-top');
  const frontBox  = frontItem && frontItem.querySelector('.arr-val');
  if (!frontBox) return;
  frontBox.classList.add('animate-pulse');
  spawnPeekBubble(v, frontItem);
  setTimeout(() => frontBox.classList.remove('animate-pulse'), 600);

  const isSLL = queueImpl === 'sll' || queueImpl === 'sll-rear-head' || queueImpl === 'sll-head-only';
  let implAnchor = null;
  if (isSLL) {
    const wraps = ic.querySelectorAll('.ll-node-wrap');
    const targetWrap = queueImpl === 'sll-rear-head' ? wraps[wraps.length - 1] : wraps[0];
    implAnchor = targetWrap;
    const node = targetWrap && targetWrap.querySelector('.ll-node');
    if (node) { node.classList.add('animate-pulse'); setTimeout(() => node.classList.remove('animate-pulse'), 600); }
  } else if (queueImpl === 'two-stacks') {
    implAnchor = ic.querySelector('.stack-item.stack-top');
    const box2 = implAnchor && implAnchor.querySelector('.stack-item-box');
    if (box2) { box2.classList.add('animate-pulse'); setTimeout(() => box2.classList.remove('animate-pulse'), 600); }
  } else {
    implAnchor = ic.querySelector('.impl-arr-cell.is-top');
    const box = implAnchor && implAnchor.querySelector('.arr-val');
    if (box) { box.classList.add('animate-pulse'); setTimeout(() => box.classList.remove('animate-pulse'), 600); }
  }
  if (implAnchor) spawnPeekBubble(v, implAnchor);
}

// ═══════════════════════════════════════════════
//  QUEUE — OPERATIONS
// ═══════════════════════════════════════════════
function queueEnqueue() {
  if (queueAnimating) return;
  const v = $('queueInput').value;
  if (v === '') return;
  const num = Number(v);
  if (queueImpl === 'circular') {
    if (queueCount === QUEUE_CAP) { log('queueLog', 'enqueue', `queue full (capacity ${QUEUE_CAP}) — overflow`); return; }
    queueRear = (queueRear + 1) % QUEUE_CAP;
    circularSlots[queueRear] = num;
    queueCount++;
    log('queueLog', 'enqueue', `<span class="val">${v}</span> → rear (size: ${queueCount})`);
  } else if (queueImpl === 'sll-rear-head') {
    // enqueue at head (prepend) — O(1)
    queueData.unshift(num);
    log('queueLog', 'enqueue', `<span class="val">${v}</span> → head/rear O(1) (size: ${queueData.length})`);
  } else if (queueImpl === 'sll-head-only') {
    // enqueue at tail — must traverse O(n), but we just push to array
    queueData.push(num);
    log('queueLog', 'enqueue', `<span class="val">${v}</span> → rear (traversal O(n)) (size: ${queueData.length})`);
  } else if (queueImpl === 'two-stacks') {
    twoStacksInbox.push(num);
    log('queueLog', 'enqueue', `<span class="val">${v}</span> → inbox (size: ${twoStacksInbox.length + twoStacksOutbox.length})`);
  } else {
    queueData.push(num);
    log('queueLog', 'enqueue', `<span class="val">${v}</span> → rear (size: ${queueData.length})`);
  }
  $('queueInput').value = '';
  renderQueue();
}

async function queueDequeue() {
  if (queueAnimating) return;
  let empty;
  if (queueImpl === 'circular') empty = queueCount === 0;
  else if (queueImpl === 'two-stacks') empty = twoStacksInbox.length === 0 && twoStacksOutbox.length === 0;
  else empty = queueData.length === 0;
  if (empty) { log('queueLog', 'dequeue', 'queue is empty — underflow'); return; }
  queueAnimating = true;
  let v;
  if (queueImpl === 'two-stacks') {
    if (twoStacksOutbox.length === 0) {
      // transfer all from inbox to outbox, render to show the transfer visually
      const transferred = twoStacksInbox.length;
      while (twoStacksInbox.length > 0) twoStacksOutbox.push(twoStacksInbox.pop());
      log('queueLog', 'dequeue', `outbox empty — transferred ${transferred} elements from inbox`);
      renderQueue();
      await sleep(500);
    }
    await animateQueueDequeue();
    v = twoStacksOutbox.pop();
    log('queueLog', 'dequeue', `<span class="val">${v}</span> popped from outbox (total: ${twoStacksInbox.length + twoStacksOutbox.length})`);
  } else {
    await animateQueueDequeue();
    if (queueImpl === 'circular') {
      v = circularSlots[queueFront];
      circularSlots[queueFront] = null;
      queueFront = (queueFront + 1) % QUEUE_CAP;
      queueCount--;
      log('queueLog', 'dequeue', `<span class="val">${v}</span> removed from front (size: ${queueCount})`);
    } else if (queueImpl === 'sll-rear-head') {
      v = queueData.pop();
      log('queueLog', 'dequeue', `<span class="val">${v}</span> removed from tail/front — O(n) traversal (size: ${queueData.length})`);
    } else {
      v = queueData.shift();
      log('queueLog', 'dequeue', `<span class="val">${v}</span> removed from front (size: ${queueData.length})`);
    }
  }
  renderQueue();
  queueAnimating = false;
}

function queuePeek() {
  if (queueAnimating) return;
  let empty, v;
  if (queueImpl === 'circular') {
    empty = queueCount === 0;
    v = empty ? null : circularSlots[queueFront];
  } else if (queueImpl === 'two-stacks') {
    empty = twoStacksInbox.length === 0 && twoStacksOutbox.length === 0;
    if (!empty) {
      v = twoStacksOutbox.length > 0
        ? twoStacksOutbox[twoStacksOutbox.length - 1]
        : twoStacksInbox[0]; // oldest in inbox is the front after transfer
    }
  } else if (queueImpl === 'sll-rear-head') {
    empty = queueData.length === 0;
    v = empty ? null : queueData[queueData.length - 1]; // tail = front
  } else {
    empty = queueData.length === 0;
    v = empty ? null : queueData[0];
  }
  if (empty) { log('queueLog', 'peek', 'queue is empty'); return; }
  log('queueLog', 'peek', `front = <span class="val">${v}</span>`);
  animateQueuePeek(v);
}

function queueClear() {
  if (queueAnimating) return;
  queueData = [];
  circularSlots = Array(QUEUE_CAP).fill(null);
  queueFront = 0; queueRear = -1; queueCount = 0;
  twoStacksInbox = []; twoStacksOutbox = [];
  renderQueue();
  log('queueLog', 'clear', 'queue emptied');
}

// ─── Init Queue ───
setQImpl('array');


// ═══════════════════════════════════════════════
//  HEAP — DATA & METADATA
// ═══════════════════════════════════════════════
let heapData = [];
let heapImpl = 'min-heap';
let heapAnimating = false;

const heapImplMeta = {
  'min-heap': {
    label: 'Min-Heap',
    note: 'The <strong>smallest</strong> element is always at the root (index 0). Every parent is ≤ both its children. Extracting the minimum is O(log n) — it removes the root and re-heapifies by bubbling the last element down.',
    complexity: [['insert','O(log n)'],['extractMin','O(log n)'],['peek','O(1)'],['search','O(n)']]
  },
  'max-heap': {
    label: 'Max-Heap',
    note: 'The <strong>largest</strong> element is always at the root (index 0). Every parent is ≥ both its children. Extracting the maximum is O(log n) — it removes the root and re-heapifies by bubbling the last element down.',
    complexity: [['insert','O(log n)'],['extractMax','O(log n)'],['peek','O(1)'],['search','O(n)']]
  }
};

// ─── Extend sidebar data ───
sidebarData.heap = {
  description: 'A binary heap is a complete binary tree stored compactly in an array. For index i, its parent is at ⌊(i−1)/2⌋, left child at 2i+1, right child at 2i+2. The heap property ensures the root is always the min (or max).'
};

_sidebarPanels.heap = {
  getMeta: () => heapImplMeta[heapImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Structure Property</h3><p>Complete binary tree — all levels full except possibly the last, filled left-to-right. Stored as a flat array: parent(i) = ⌊(i−1)/2⌋.</p></div>`
};

// ═══════════════════════════════════════════════
//  HEAP — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setHeapImpl(type) {
  heapImpl = type;
  document.querySelectorAll('[data-heap-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.heapImpl === type);
  });
  $('heapImplNote').innerHTML = heapImplMeta[type].note;
  if ($('panel-heap').classList.contains('active')) updateSidebar('heap');
  // Re-heapify existing data with new comparison
  const values = [...heapData];
  heapData = [];
  values.forEach(v => { heapData.push(v); _heapBubbleUpSilent(heapData.length - 1); });
  renderHeap();
}

// ═══════════════════════════════════════════════
//  HEAP — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function heapCompare(a, b) {
  return heapImpl === 'min-heap' ? a < b : a > b;
}

// Bubble up silently (no steps recorded) — used for re-heapify on impl switch
function _heapBubbleUpSilent(i) {
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (heapCompare(heapData[i], heapData[p])) {
      [heapData[i], heapData[p]] = [heapData[p], heapData[i]];
      i = p;
    } else break;
  }
}

// Compute bubble-up steps WITHOUT modifying heapData
function heapBubbleUpSteps(startIdx) {
  const tmp = [...heapData];
  const steps = [];
  let i = startIdx;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (heapImpl === 'min-heap' ? tmp[i] < tmp[p] : tmp[i] > tmp[p]) {
      steps.push({ from: i, to: p });
      [tmp[i], tmp[p]] = [tmp[p], tmp[i]];
      i = p;
    } else break;
  }
  return steps;
}

// Compute bubble-down steps WITHOUT modifying heapData
function heapBubbleDownSteps(startIdx) {
  const tmp = [...heapData];
  const steps = [];
  let i = startIdx;
  const n = tmp.length;
  while (true) {
    const l = 2 * i + 1, r = 2 * i + 2;
    let target = i;
    if (l < n && (heapImpl === 'min-heap' ? tmp[l] < tmp[target] : tmp[l] > tmp[target])) target = l;
    if (r < n && (heapImpl === 'min-heap' ? tmp[r] < tmp[target] : tmp[r] > tmp[target])) target = r;
    if (target !== i) {
      steps.push({ from: i, to: target });
      [tmp[i], tmp[target]] = [tmp[target], tmp[i]];
      i = target;
    } else break;
  }
  return steps;
}

// ═══════════════════════════════════════════════
//  HEAP — RENDER
// ═══════════════════════════════════════════════
const HEAP_EMPTY = `<div class="empty-state"><span class="ornament">§</span>Insert a value to begin</div>`;

function renderHeap(highlightSet) {
  const tc = $('heapCanvas');
  const ac = $('heapImplCanvas');
  if (heapData.length === 0) { tc.innerHTML = HEAP_EMPTY; ac.innerHTML = HEAP_EMPTY; return; }
  renderHeapTree(tc, highlightSet || new Set());
  renderHeapArray(ac, highlightSet || new Set());
}

function renderHeapTree(c, highlightSet) {
  const n = heapData.length;
  const W = 520, levelH = 72, topPad = 36, r = 20;
  const levels = Math.floor(Math.log2(n)) + 1;
  const svgH = topPad + levels * levelH + 20;

  // Compute node positions
  const pos = [];
  for (let i = 0; i < n; i++) {
    const lv = Math.floor(Math.log2(i + 1));
    const posInLv = i - (Math.pow(2, lv) - 1);
    const nodesInLv = Math.pow(2, lv);
    pos.push({ x: W * (posInLv + 0.5) / nodesInLv, y: topPad + lv * levelH });
  }

  let svg = `<svg viewBox="0 0 ${W} ${svgH}" style="width:100%;height:${svgH}px;display:block">`;

  // Edges first (drawn behind nodes)
  for (let i = 1; i < n; i++) {
    const p = Math.floor((i - 1) / 2);
    svg += `<line class="edge-line" x1="${pos[p].x}" y1="${pos[p].y}" x2="${pos[i].x}" y2="${pos[i].y}"/>`;
  }

  // Nodes
  for (let i = 0; i < n; i++) {
    const isRoot = i === 0;
    const isHL = highlightSet.has(i);
    const cls = isRoot ? 'node-circle highlight' : isHL ? 'node-circle bubble-active' : 'node-circle';
    svg += `<circle class="${cls}" cx="${pos[i].x}" cy="${pos[i].y}" r="${r}"/>`;
    svg += `<text class="node-text" x="${pos[i].x}" y="${pos[i].y}">${heapData[i]}</text>`;
    svg += `<text class="heap-index-label" x="${pos[i].x}" y="${pos[i].y + r + 11}">[${i}]</text>`;
  }

  svg += '</svg>';
  c.innerHTML = svg;
}

function renderHeapArray(c, highlightSet) {
  const n = heapData.length;
  let html = '<div class="impl-view">';
  html += '<div class="impl-section-label">Array storage</div>';
  html += '<div class="impl-array-row">';
  heapData.forEach((v, i) => {
    const isRoot = i === 0;
    const isHL = highlightSet.has(i);
    html += `<div class="impl-arr-cell${isRoot ? ' is-top' : ''}${isHL ? ' heap-active' : ''}">
      <div class="arr-val">${v}</div>
      <div class="arr-idx">[${i}]</div>
    </div>`;
  });
  html += '</div>';
  // Parent formula row
  html += '<div class="impl-ptr-row">';
  heapData.forEach((_, i) => {
    const label = i === 0 ? 'root' : `p=${Math.floor((i-1)/2)}`;
    html += `<div class="impl-ptr-cell" style="font-size:0.45rem">${label}</div>`;
  });
  html += '</div>';
  html += `<div class="impl-info-row">
    <span class="impl-stat">size\u00a0=\u00a0${n}</span>
    <span class="impl-stat">${heapImpl === 'min-heap' ? 'min at root' : 'max at root'}</span>
    <span class="impl-stat impl-good">root\u00a0=\u00a0<strong>${heapData[0]}</strong></span>
  </div>`;
  html += '</div>';
  c.innerHTML = html;
}

// ═══════════════════════════════════════════════
//  HEAP — ANIMATION HELPERS
// ═══════════════════════════════════════════════
// Apply each swap step one at a time with highlights, mutating heapData as we go
async function animateHeapSwaps(steps) {
  for (const { from, to } of steps) {
    renderHeap(new Set([from, to]));
    await sleep(480);
    [heapData[from], heapData[to]] = [heapData[to], heapData[from]];
    renderHeap(new Set([to]));
    await sleep(220);
  }
}

async function animateHeapExtractRoot() {
  const tc = $('heapCanvas');
  const ac = $('heapImplCanvas');
  const rootCircle = tc.querySelector('.node-circle.highlight');
  const rootCell   = ac.querySelector('.impl-arr-cell.is-top .arr-val');
  if (rootCircle) rootCircle.classList.add('animate-pop-out');
  if (rootCell)   rootCell.classList.add('animate-pop-out');
  await sleep(440);
}

function animateHeapPeek(v) {
  const tc = $('heapCanvas');
  const ac = $('heapImplCanvas');
  const rootCircle = tc.querySelector('.node-circle.highlight');
  const rootCell   = ac.querySelector('.impl-arr-cell.is-top');
  if (rootCircle) { rootCircle.classList.add('animate-pulse'); setTimeout(() => rootCircle.classList.remove('animate-pulse'), 600); }
  if (rootCell) {
    const box = rootCell.querySelector('.arr-val');
    if (box) { box.classList.add('animate-pulse'); setTimeout(() => box.classList.remove('animate-pulse'), 600); }
    spawnPeekBubble(v, rootCell);
  }
}

// ═══════════════════════════════════════════════
//  HEAP — OPERATIONS
// ═══════════════════════════════════════════════
async function heapInsert() {
  if (heapAnimating) return;
  const v = $('heapInput').value;
  if (v === '') return;
  heapAnimating = true;
  const num = Number(v);
  heapData.push(num);
  $('heapInput').value = '';
  const steps = heapBubbleUpSteps(heapData.length - 1);
  renderHeap(new Set([heapData.length - 1]));
  await sleep(200);
  if (steps.length > 0) await animateHeapSwaps(steps);
  log('heapLog', 'insert', `<span class="val">${v}</span> inserted (size: ${heapData.length})`);
  renderHeap();
  heapAnimating = false;
}

async function heapExtract() {
  if (heapAnimating) return;
  if (!heapData.length) { log('heapLog', 'extract', 'heap is empty'); return; }
  heapAnimating = true;
  const rootVal = heapData[0];
  await animateHeapExtractRoot();
  if (heapData.length === 1) {
    heapData = [];
  } else {
    heapData[0] = heapData.pop();
    const steps = heapBubbleDownSteps(0);
    renderHeap(new Set([0]));
    await sleep(200);
    if (steps.length > 0) await animateHeapSwaps(steps);
  }
  log('heapLog', 'extract', `<span class="val">${rootVal}</span> removed from root (size: ${heapData.length})`);
  renderHeap();
  heapAnimating = false;
}

function heapPeek() {
  if (heapAnimating) return;
  if (!heapData.length) { log('heapLog', 'peek', 'heap is empty'); return; }
  const v = heapData[0];
  log('heapLog', 'peek', `root = <span class="val">${v}</span>`);
  animateHeapPeek(v);
}

function heapClear() {
  if (heapAnimating) return;
  heapData = [];
  renderHeap();
  log('heapLog', 'clear', 'heap emptied');
}

// ─── Init Heap ───
setHeapImpl('min-heap');

// ═══════════════════════════════════════════════
//  SHARED TREE HELPERS
// ═══════════════════════════════════════════════

// In-order x / depth y layout for binary trees (handles arbitrary shapes)
function layoutBinaryTree(root, width, levelH, topPad) {
  const pos = new Map();
  let inorderIdx = 0;
  (function walk(node, depth) {
    if (!node) return;
    walk(node.left, depth + 1);
    pos.set(node, { x: inorderIdx++, y: topPad + depth * levelH });
    walk(node.right, depth + 1);
  })(root, 0);
  const count = inorderIdx;
  for (const p of pos.values())
    p.x = count === 1 ? width / 2 : 40 + (p.x / (count - 1)) * (width - 80);
  return pos;
}

// ═══════════════════════════════════════════════
//  BINARY TREE — DATA & METADATA
// ═══════════════════════════════════════════════
let btRoot = null;
let btImpl = 'linked';
let btAnimating = false;
let btNextId = 1;

const btImplMeta = {
  'linked': {
    label: 'Linked Nodes',
    note: 'Nodes are inserted level-order (BFS to next open slot). Each node holds a value, a left-child pointer, and a right-child pointer. No ordering invariant — purely structural.',
    complexity: [['insert','O(n)'],['delete','O(n)'],['search','O(n)'],['traversal','O(n)']]
  }
};

sidebarData.binarytree = {
  description: 'A binary tree is a hierarchical structure where each node has at most two children — left and right. There is no ordering constraint on values. This visualizer inserts nodes level-order (BFS), filling each level left-to-right before starting the next.'
};

_sidebarPanels.binarytree = {
  getMeta: () => btImplMeta[btImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Traversals</h3><p>In-order (L→N→R), Pre-order (N→L→R), Post-order (L→R→N), Level-order (BFS). Without an ordering invariant, in-order does not produce a sorted sequence.</p></div>`
};

// ═══════════════════════════════════════════════
//  BINARY TREE — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setBTImpl(type) {
  btImpl = type;
  document.querySelectorAll('[data-bt-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.btImpl === type);
  });
  $('btImplNote').innerHTML = btImplMeta[type].note;
  if ($('panel-binarytree').classList.contains('active')) updateSidebar('binarytree');
  renderBT();
}

// ═══════════════════════════════════════════════
//  BINARY TREE — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function _btNextSlot(root) {
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (!n.left) return { parent: n, side: 'left' };
    if (!n.right) return { parent: n, side: 'right' };
    q.push(n.left, n.right);
  }
  return null;
}

function _btDeepestNode(root) {
  let last = null;
  const q = [root];
  while (q.length) { last = q.shift(); if (last.left) q.push(last.left); if (last.right) q.push(last.right); }
  return last;
}

function _btDeleteDeepest(root, target) {
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (n.left === target) { n.left = null; return; }
    if (n.right === target) { n.right = null; return; }
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
}

function _btFindNode(root, v) {
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (n.v === v) return n;
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return null;
}

function _btCollect(root, order) {
  const out = [];
  if (!root) return out;
  if (order === 'inorder')   { (function w(n){if(!n)return;w(n.left);out.push(n);w(n.right);})(root); }
  else if (order === 'preorder')  { (function w(n){if(!n)return;out.push(n);w(n.left);w(n.right);})(root); }
  else if (order === 'postorder') { (function w(n){if(!n)return;w(n.left);w(n.right);out.push(n);})(root); }
  else { const q=[root]; while(q.length){const n=q.shift();out.push(n);if(n.left)q.push(n.left);if(n.right)q.push(n.right);} }
  return out;
}

// ═══════════════════════════════════════════════
//  BINARY TREE — RENDER
// ═══════════════════════════════════════════════
const BT_EMPTY = `<div class="empty-state"><span class="ornament">§</span>Insert a value to begin</div>`;

function renderBT(highlightSet, extraCls) {
  const tc = $('btCanvas'), ac = $('btImplCanvas');
  if (!btRoot) { tc.innerHTML = BT_EMPTY; ac.innerHTML = BT_EMPTY; return; }
  _renderBTTree(tc, highlightSet || new Set(), extraCls || {});
  _renderBTStruct(ac, highlightSet || new Set());
}

function _renderBTTree(c, hl, extraCls) {
  const W = 520, lH = 72, top = 36, r = 20;
  const pos = layoutBinaryTree(btRoot, W, lH, top);
  let maxY = 0; for (const p of pos.values()) maxY = Math.max(maxY, p.y);
  let svg = `<svg viewBox="0 0 ${W} ${maxY+r+30}" style="width:100%;height:${maxY+r+30}px;display:block">`;
  for (const [node, {x,y}] of pos) {
    if (node.left && pos.has(node.left)) { const p=pos.get(node.left); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
    if (node.right && pos.has(node.right)) { const p=pos.get(node.right); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
  }
  for (const [node, {x,y}] of pos) {
    const ex = extraCls[node.id] || (hl.has(node.id) ? 'bubble-active' : '');
    svg += `<circle class="node-circle${ex?' '+ex:''}" cx="${x}" cy="${y}" r="${r}" data-id="${node.id}"/>`;
    svg += `<text class="node-text" x="${x}" y="${y}">${node.v}</text>`;
  }
  svg += '</svg>'; c.innerHTML = svg;
}

function _renderBTStruct(c, hl) {
  const nodes = _btCollect(btRoot, 'levelorder');
  let h = '<div class="impl-view"><div class="impl-section-label">Node structs</div><div class="tree-struct-view">';
  h += '<div class="tree-struct-header"><span>id</span><span>left</span><span>val</span><span>right</span></div>';
  for (const n of nodes) {
    const row = hl.has(n.id) ? ' row-highlight' : '';
    const L = n.left ? `<span class="struct-ptr">${n.left.id}</span>` : `<span class="struct-null">∅</span>`;
    const R = n.right ? `<span class="struct-ptr">${n.right.id}</span>` : `<span class="struct-null">∅</span>`;
    h += `<div class="tree-struct-row${row}"><span>${n.id}</span>${L}<span class="struct-val">${n.v}</span>${R}</div>`;
  }
  let height = 0;
  (function d(n,dep){if(!n)return;height=Math.max(height,dep);d(n.left,dep+1);d(n.right,dep+1);})(btRoot,0);
  h += `</div><div class="impl-info-row"><span class="impl-stat">nodes\u00a0=\u00a0${nodes.length}</span><span class="impl-stat">height\u00a0=\u00a0${height}</span><span class="impl-stat">insert:\u00a0level-order</span></div></div>`;
  c.innerHTML = h;
}

// ═══════════════════════════════════════════════
//  BINARY TREE — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function _animateBTVisitSeq(nodes) {
  const visited = new Set();
  for (const n of nodes) { visited.add(n.id); renderBT(visited); await sleep(420); }
  await sleep(280); renderBT();
}

// ═══════════════════════════════════════════════
//  BINARY TREE — OPERATIONS
// ═══════════════════════════════════════════════
async function btInsert() {
  if (btAnimating) return;
  const inp = $('btInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = ''; btAnimating = true;

  const node = { v, left: null, right: null, id: btNextId++ };
  if (!btRoot) { btRoot = node; }
  else { const s = _btNextSlot(btRoot); s.parent[s.side] = node; }

  renderBT(new Set([node.id]));
  const el = $('btCanvas').querySelector(`[data-id="${node.id}"]`);
  if (el) { el.classList.add('animate-drop'); setTimeout(() => el.classList.remove('animate-drop'), 500); }
  await sleep(500); renderBT();
  log('btLog', 'insert', `<span class="val">${v}</span> inserted (level-order)`);
  btAnimating = false;
}

async function btDelete() {
  if (btAnimating) return;
  const inp = $('btInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = ''; btAnimating = true;

  const target = _btFindNode(btRoot, v);
  if (!target) { log('btLog', 'delete', `<span class="val">${v}</span> not found`); btAnimating = false; return; }

  const deepest = _btDeepestNode(btRoot);
  if (deepest === target) {
    const el = $('btCanvas').querySelector(`[data-id="${target.id}"]`);
    if (el) el.classList.add('animate-pop-out');
    await sleep(450);
    if (!target.left && !target.right && target === btRoot) { btRoot = null; }
    else _btDeleteDeepest(btRoot, deepest);
  } else {
    renderBT(new Set([target.id, deepest.id])); await sleep(420);
    target.v = deepest.v;
    _btDeleteDeepest(btRoot, deepest);
    renderBT(new Set([target.id])); await sleep(320);
  }
  renderBT();
  log('btLog', 'delete', `<span class="val">${v}</span> removed`);
  btAnimating = false;
}

async function btSearch() {
  if (btAnimating) return;
  const inp = $('btInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!btRoot) { log('btLog', 'search', 'tree is empty'); return; }
  btAnimating = true;

  const visited = new Set(); let found = null;
  const q = [btRoot];
  while (q.length) {
    const n = q.shift(); visited.add(n.id); renderBT(visited); await sleep(360);
    if (n.v === v) { found = n; break; }
    if (n.left) q.push(n.left); if (n.right) q.push(n.right);
  }
  if (found) {
    const el = $('btCanvas').querySelector(`[data-id="${found.id}"]`);
    if (el) { el.classList.remove('bubble-active'); el.classList.add('found'); }
    log('btLog', 'search', `<span class="val">${v}</span> found`);
    await sleep(1800);
  } else { log('btLog', 'search', `<span class="val">${v}</span> not found`); }
  renderBT(); btAnimating = false;
}

async function btTraverse(order) {
  if (btAnimating) return;
  if (!btRoot) { log('btLog', 'traverse', 'tree is empty'); return; }
  btAnimating = true;
  const nodes = _btCollect(btRoot, order);
  await _animateBTVisitSeq(nodes);
  log('btLog', 'traverse', `${order}: ${nodes.map(n=>`<span class="val">${n.v}</span>`).join(' → ')}`);
  btAnimating = false;
}

function btClear() {
  if (btAnimating) return;
  btRoot = null; btNextId = 1; renderBT();
  log('btLog', 'clear', 'tree cleared');
}

// ─── Init Binary Tree ───
setBTImpl('linked');

// ═══════════════════════════════════════════════
//  BST — DATA & METADATA
// ═══════════════════════════════════════════════
let bstRoot = null;
let bstImpl = 'bst';
let bstAnimating = false;
let bstNextId = 1;

const bstImplMeta = {
  'bst': {
    label: 'Linked Nodes (BST)',
    note: 'Binary Search Tree: left subtree values < node < right subtree values. In-order traversal always yields a sorted sequence. Height h determines all operation costs.',
    complexity: [['insert','O(h)'],['remove','O(h)'],['search','O(h)'],['traversal','O(n)']]
  }
};

sidebarData.bst = {
  description: 'A Binary Search Tree enforces: for every node, all values in the left subtree are less, and all in the right subtree are greater. This enables O(h) search, insert, and delete where h is the tree height. In the worst case (sorted input), h = n — use an AVL tree to guarantee O(log n).'
};

_sidebarPanels.bst = {
  getMeta: () => bstImplMeta[bstImpl],
  complexityHeader: 'Time Complexity (h = height)',
  extraSection: () => `<div class="sidebar-section"><h3>Worst Case</h3><p>Inserting sorted input (1,2,3,…) degenerates the BST into a linked list with h = n and O(n) ops. An AVL or Red-Black tree prevents this with rotations.</p></div>`
};

// ═══════════════════════════════════════════════
//  BST — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setBSTImpl(type) {
  bstImpl = type;
  document.querySelectorAll('[data-bst-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.bstImpl === type);
  });
  $('bstImplNote').innerHTML = bstImplMeta[type].note;
  if ($('panel-bst').classList.contains('active')) updateSidebar('bst');
  renderBST();
}

// ═══════════════════════════════════════════════
//  BST — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function _bstFindPath(root, v) {
  const path = []; let cur = root;
  while (cur) {
    path.push(cur);
    if (v === cur.v) return { path, found: cur };
    cur = v < cur.v ? cur.left : cur.right;
  }
  return { path, found: null };
}

function _bstInsertPath(root, v) {
  const path = []; let cur = root;
  while (cur) {
    path.push(cur);
    if (v === cur.v) return path; // duplicate — path ends at dupe
    cur = v < cur.v ? cur.left : cur.right;
  }
  return path;
}

function _bstInorderSuccessor(node) {
  let cur = node.right; while (cur && cur.left) cur = cur.left; return cur;
}

function _bstRemove(root, v) {
  if (!root) return null;
  if (v < root.v) { root.left = _bstRemove(root.left, v); }
  else if (v > root.v) { root.right = _bstRemove(root.right, v); }
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    const succ = _bstInorderSuccessor(root);
    root.v = succ.v; root.right = _bstRemove(root.right, succ.v);
  }
  return root;
}

function _bstCollect(root, order) {
  const out = [];
  if (!root) return out;
  if (order === 'inorder')   { (function w(n){if(!n)return;w(n.left);out.push(n);w(n.right);})(root); }
  else if (order === 'preorder')  { (function w(n){if(!n)return;out.push(n);w(n.left);w(n.right);})(root); }
  else if (order === 'postorder') { (function w(n){if(!n)return;w(n.left);w(n.right);out.push(n);})(root); }
  else { const q=[root]; while(q.length){const n=q.shift();out.push(n);if(n.left)q.push(n.left);if(n.right)q.push(n.right);} }
  return out;
}

// ═══════════════════════════════════════════════
//  BST — RENDER
// ═══════════════════════════════════════════════
const BST_EMPTY = `<div class="empty-state"><span class="ornament">§</span>Insert a value to begin</div>`;

function renderBST(highlightSet, extraCls) {
  const tc = $('bstCanvas'), ac = $('bstImplCanvas');
  if (!bstRoot) { tc.innerHTML = BST_EMPTY; ac.innerHTML = BST_EMPTY; return; }
  _renderBSTTree(tc, highlightSet || new Set(), extraCls || {});
  _renderBSTStruct(ac, highlightSet || new Set());
}

function _renderBSTTree(c, hl, extraCls) {
  const W = 520, lH = 72, top = 36, r = 20;
  const pos = layoutBinaryTree(bstRoot, W, lH, top);
  let maxY = 0; for (const p of pos.values()) maxY = Math.max(maxY, p.y);
  let svg = `<svg viewBox="0 0 ${W} ${maxY+r+30}" style="width:100%;height:${maxY+r+30}px;display:block">`;
  for (const [node, {x,y}] of pos) {
    if (node.left && pos.has(node.left)) { const p=pos.get(node.left); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
    if (node.right && pos.has(node.right)) { const p=pos.get(node.right); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
  }
  for (const [node, {x,y}] of pos) {
    const ex = extraCls[node.id] || (hl.has(node.id) ? 'bubble-active' : '');
    svg += `<circle class="node-circle${ex?' '+ex:''}" cx="${x}" cy="${y}" r="${r}" data-id="${node.id}"/>`;
    svg += `<text class="node-text" x="${x}" y="${y}">${node.v}</text>`;
  }
  svg += '</svg>'; c.innerHTML = svg;
}

function _renderBSTStruct(c, hl) {
  const levelNodes = _bstCollect(bstRoot, 'levelorder');
  const inorderVals = _bstCollect(bstRoot, 'inorder').map(n => n.v).join(' < ');
  let h = '<div class="impl-view"><div class="impl-section-label">Node structs (level-order)</div><div class="tree-struct-view">';
  h += '<div class="tree-struct-header"><span>id</span><span>left</span><span>val</span><span>right</span></div>';
  for (const n of levelNodes) {
    const row = hl.has(n.id) ? ' row-highlight' : '';
    const L = n.left ? `<span class="struct-ptr">${n.left.id}</span>` : `<span class="struct-null">∅</span>`;
    const R = n.right ? `<span class="struct-ptr">${n.right.id}</span>` : `<span class="struct-null">∅</span>`;
    h += `<div class="tree-struct-row${row}"><span>${n.id}</span>${L}<span class="struct-val">${n.v}</span>${R}</div>`;
  }
  h += `</div><div class="impl-info-row"><span class="impl-stat">nodes\u00a0=\u00a0${levelNodes.length}</span><span class="impl-stat impl-good">in-order:\u00a0sorted</span></div>`;
  if (inorderVals) h += `<div style="padding:0.35rem 0.5rem;font-family:'DM Mono',monospace;font-size:0.55rem;color:var(--muted);border-top:1px dotted var(--rule)">${inorderVals}</div>`;
  h += '</div>'; c.innerHTML = h;
}

// ═══════════════════════════════════════════════
//  BST — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function _animateBSTPath(pathNodes, finalCls) {
  const visited = new Set();
  for (const n of pathNodes) {
    visited.add(n.id);
    const cls = {}; for (const id of visited) cls[id] = 'path';
    renderBST(visited, cls); await sleep(380);
  }
  if (finalCls && pathNodes.length) {
    const last = pathNodes[pathNodes.length - 1];
    renderBST(new Set([last.id]), { [last.id]: finalCls });
    await sleep(finalCls === 'found' ? 1800 : 480);
  }
}

// ═══════════════════════════════════════════════
//  BST — OPERATIONS
// ═══════════════════════════════════════════════
async function bstInsert() {
  if (bstAnimating) return;
  const inp = $('bstInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = ''; bstAnimating = true;

  const path = _bstInsertPath(bstRoot, v);
  if (path.length) await _animateBSTPath(path, '');

  if (path.length && path[path.length - 1].v === v) {
    log('bstLog', 'insert', `<span class="val">${v}</span> already exists`);
    renderBST(); bstAnimating = false; return;
  }

  const node = { v, left: null, right: null, id: bstNextId++ };
  if (!bstRoot) { bstRoot = node; }
  else {
    const par = path[path.length - 1];
    if (v < par.v) par.left = node; else par.right = node;
  }

  renderBST(new Set([node.id]));
  const el = $('bstCanvas').querySelector(`[data-id="${node.id}"]`);
  if (el) { el.classList.add('animate-drop'); setTimeout(() => el.classList.remove('animate-drop'), 500); }
  await sleep(500); renderBST();
  log('bstLog', 'insert', `<span class="val">${v}</span> inserted`);
  bstAnimating = false;
}

async function bstRemove() {
  if (bstAnimating) return;
  const inp = $('bstInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!bstRoot) { log('bstLog', 'remove', 'tree is empty'); return; }
  bstAnimating = true;

  const { path, found } = _bstFindPath(bstRoot, v);
  if (!found) {
    await _animateBSTPath(path, '');
    log('bstLog', 'remove', `<span class="val">${v}</span> not found`);
    renderBST(); bstAnimating = false; return;
  }
  await _animateBSTPath(path, 'bubble-active');
  await sleep(280);

  if (found.left && found.right) {
    const succ = _bstInorderSuccessor(found);
    renderBST(new Set([found.id, succ.id])); await sleep(500);
  }
  const el = $('bstCanvas').querySelector(`[data-id="${found.id}"]`);
  if (el) el.classList.add('animate-pop-out');
  await sleep(440);
  bstRoot = _bstRemove(bstRoot, v);
  renderBST();
  log('bstLog', 'remove', `<span class="val">${v}</span> removed`);
  bstAnimating = false;
}

async function bstSearch() {
  if (bstAnimating) return;
  const inp = $('bstInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!bstRoot) { log('bstLog', 'search', 'tree is empty'); return; }
  bstAnimating = true;

  const { path, found } = _bstFindPath(bstRoot, v);
  await _animateBSTPath(path, found ? 'found' : '');
  if (found) { log('bstLog', 'search', `<span class="val">${v}</span> found (depth\u00a0${path.length-1})`); await sleep(1800); }
  else { log('bstLog', 'search', `<span class="val">${v}</span> not found`); }
  renderBST(); bstAnimating = false;
}

async function bstTraverse(order) {
  if (bstAnimating) return;
  if (!bstRoot) { log('bstLog', 'traverse', 'tree is empty'); return; }
  bstAnimating = true;
  const nodes = _bstCollect(bstRoot, order);
  const visited = new Set();
  for (const n of nodes) { visited.add(n.id); renderBST(visited); await sleep(420); }
  await sleep(280); renderBST();
  log('bstLog', 'traverse', `${order}: ${nodes.map(n=>`<span class="val">${n.v}</span>`).join(' → ')}`);
  bstAnimating = false;
}

function bstClear() {
  if (bstAnimating) return;
  bstRoot = null; bstNextId = 1; renderBST();
  log('bstLog', 'clear', 'tree cleared');
}

// ─── Init BST ───
setBSTImpl('bst');

// ═══════════════════════════════════════════════
//  AVL TREE — DATA & METADATA
// ═══════════════════════════════════════════════
let avlRoot = null;
let avlImpl = 'avl';
let avlAnimating = false;
let avlNextId = 1;

const avlImplMeta = {
  'avl': {
    label: 'Linked Nodes (AVL)',
    note: 'AVL Tree: a self-balancing BST. After every insert/remove the tree rebalances via rotations to ensure |bf| \u2264 1 at every node, guaranteeing O(log n) height.',
    complexity: [['insert','O(log n)'],['remove','O(log n)'],['search','O(log n)'],['traversal','O(n)']]
  }
};

sidebarData.avl = {
  description: 'An AVL Tree is a self-balancing BST. Each node stores a <em>balance factor</em> bf = height(left) \u2212 height(right). After any insert or remove, if |bf| > 1 at some ancestor, one of four rotations (LL, LR, RR, RL) restores balance and keeps height O(log n).'
};

_sidebarPanels.avl = {
  getMeta: () => avlImplMeta[avlImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Rotations</h3><p>LL: right-rotate at imbalanced node. RR: left-rotate. LR: left-rotate child, then right-rotate ancestor. RL: right-rotate child, then left-rotate ancestor. Balance factor colours: grey\u00a0=\u00a00, accent\u00a0=\u00a0\u00b11, red\u00a0=\u00a0\u00b12 (triggers rotation).</p></div>`
};

// ═══════════════════════════════════════════════
//  AVL TREE — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setAVLImpl(type) {
  avlImpl = type;
  document.querySelectorAll('[data-avl-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.avlImpl === type);
  });
  $('avlImplNote').innerHTML = avlImplMeta[type].note;
  if ($('panel-avl').classList.contains('active')) updateSidebar('avl');
  renderAVL();
}

// ═══════════════════════════════════════════════
//  AVL TREE — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function _avlH(n) { return n ? n.h : -1; }
function _avlBF(n) { return n ? _avlH(n.left) - _avlH(n.right) : 0; }
function _avlUpdH(n) { if (n) n.h = 1 + Math.max(_avlH(n.left), _avlH(n.right)); }

function _avlRotR(y) {
  const x = y.left, T2 = x.right;
  x.right = y; y.left = T2;
  _avlUpdH(y); _avlUpdH(x); return x;
}
function _avlRotL(x) {
  const y = x.right, T2 = y.left;
  y.left = x; x.right = T2;
  _avlUpdH(x); _avlUpdH(y); return y;
}

function _avlInsert(root, v, rots) {
  if (!root) return { v, left: null, right: null, h: 0, id: avlNextId++ };
  if (v < root.v) root.left = _avlInsert(root.left, v, rots);
  else if (v > root.v) root.right = _avlInsert(root.right, v, rots);
  else return root;
  _avlUpdH(root);
  const bf = _avlBF(root);
  if (bf > 1) {
    const kind = _avlBF(root.left) >= 0 ? 'LL' : 'LR';
    if (kind === 'LR') root.left = _avlRotL(root.left);
    const nr = _avlRotR(root); rots.push({ kind, pivot: nr.v }); return nr;
  }
  if (bf < -1) {
    const kind = _avlBF(root.right) <= 0 ? 'RR' : 'RL';
    if (kind === 'RL') root.right = _avlRotR(root.right);
    const nr = _avlRotL(root); rots.push({ kind, pivot: nr.v }); return nr;
  }
  return root;
}

function _avlFindMin(n) { while (n.left) n = n.left; return n; }

function _avlRemove(root, v, rots) {
  if (!root) return null;
  if (v < root.v) root.left = _avlRemove(root.left, v, rots);
  else if (v > root.v) root.right = _avlRemove(root.right, v, rots);
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    const succ = _avlFindMin(root.right);
    root.v = succ.v;
    root.right = _avlRemove(root.right, succ.v, rots);
  }
  _avlUpdH(root);
  const bf = _avlBF(root);
  if (bf > 1) {
    const kind = _avlBF(root.left) >= 0 ? 'LL' : 'LR';
    if (kind === 'LR') root.left = _avlRotL(root.left);
    const nr = _avlRotR(root); rots.push({ kind, pivot: nr.v }); return nr;
  }
  if (bf < -1) {
    const kind = _avlBF(root.right) <= 0 ? 'RR' : 'RL';
    if (kind === 'RL') root.right = _avlRotR(root.right);
    const nr = _avlRotL(root); rots.push({ kind, pivot: nr.v }); return nr;
  }
  return root;
}

function _avlFindPath(root, v) {
  const path = []; let cur = root;
  while (cur) {
    path.push(cur);
    if (v === cur.v) return { path, found: cur };
    cur = v < cur.v ? cur.left : cur.right;
  }
  return { path, found: null };
}

function _avlCollect(root, order) {
  const out = [];
  if (!root) return out;
  if (order === 'inorder')   { (function w(n){if(!n)return;w(n.left);out.push(n);w(n.right);})(root); }
  else if (order === 'preorder')  { (function w(n){if(!n)return;out.push(n);w(n.left);w(n.right);})(root); }
  else if (order === 'postorder') { (function w(n){if(!n)return;w(n.left);w(n.right);out.push(n);})(root); }
  else { const q=[root]; while(q.length){const n=q.shift();out.push(n);if(n.left)q.push(n.left);if(n.right)q.push(n.right);} }
  return out;
}

// ═══════════════════════════════════════════════
//  AVL TREE — RENDER
// ═══════════════════════════════════════════════
const AVL_EMPTY = `<div class="empty-state"><span class="ornament">\u00a7</span>Insert a value to begin</div>`;

function renderAVL(highlightSet, extraCls) {
  const tc = $('avlCanvas'), ac = $('avlImplCanvas');
  if (!avlRoot) { tc.innerHTML = AVL_EMPTY; ac.innerHTML = AVL_EMPTY; return; }
  _renderAVLTree(tc, highlightSet || new Set(), extraCls || {});
  _renderAVLStruct(ac, highlightSet || new Set());
}

function _renderAVLTree(c, hl, extraCls) {
  const W = 520, lH = 80, top = 36, r = 20;
  const pos = layoutBinaryTree(avlRoot, W, lH, top);
  let maxY = 0; for (const p of pos.values()) maxY = Math.max(maxY, p.y);
  let svg = `<svg viewBox="0 0 ${W} ${maxY+r+36}" style="width:100%;height:${maxY+r+36}px;display:block">`;
  for (const [node, {x,y}] of pos) {
    if (node.left && pos.has(node.left)) { const p=pos.get(node.left); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
    if (node.right && pos.has(node.right)) { const p=pos.get(node.right); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
  }
  for (const [node, {x,y}] of pos) {
    const ex = extraCls[node.id] || (hl.has(node.id) ? 'bubble-active' : '');
    svg += `<circle class="node-circle${ex?' '+ex:''}" cx="${x}" cy="${y}" r="${r}" data-id="${node.id}"/>`;
    svg += `<text class="node-text" x="${x}" y="${y}">${node.v}</text>`;
    const bf = _avlBF(node);
    const bfCol = bf === 0 ? 'var(--muted)' : (Math.abs(bf) === 1 ? 'var(--accent)' : 'var(--danger)');
    svg += `<text class="tree-meta-label" x="${x}" y="${y+r+11}"><tspan fill="${bfCol}">bf=${bf}</tspan></text>`;
  }
  svg += '</svg>'; c.innerHTML = svg;
}

function _renderAVLStruct(c, hl) {
  const nodes = _avlCollect(avlRoot, 'levelorder');
  const gcols = '2rem 2.5rem 3rem 2.5rem 2rem';
  let h = '<div class="impl-view"><div class="impl-section-label">Node structs (h\u00a0=\u00a0subtree height)</div><div class="tree-struct-view">';
  h += `<div class="tree-struct-header" style="grid-template-columns:${gcols}"><span>id</span><span>left</span><span>val</span><span>right</span><span>h</span></div>`;
  for (const n of nodes) {
    const row = hl.has(n.id) ? ' row-highlight' : '';
    const L = n.left ? `<span class="struct-ptr">${n.left.id}</span>` : `<span class="struct-null">\u2205</span>`;
    const R = n.right ? `<span class="struct-ptr">${n.right.id}</span>` : `<span class="struct-null">\u2205</span>`;
    h += `<div class="tree-struct-row${row}" style="grid-template-columns:${gcols}"><span>${n.id}</span>${L}<span class="struct-val">${n.v}</span>${R}<span>${n.h}</span></div>`;
  }
  const height = avlRoot ? avlRoot.h : 0;
  h += `</div><div class="impl-info-row"><span class="impl-stat">nodes\u00a0=\u00a0${nodes.length}</span><span class="impl-stat">height\u00a0=\u00a0${height}</span><span class="impl-stat impl-good">balanced</span></div></div>`;
  c.innerHTML = h;
}

// ═══════════════════════════════════════════════
//  AVL TREE — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function _animateAVLPath(path, finalCls) {
  const visited = new Set();
  for (const n of path) {
    visited.add(n.id);
    const cls = {}; for (const id of visited) cls[id] = 'path';
    renderAVL(visited, cls); await sleep(360);
  }
  if (finalCls && path.length) {
    const last = path[path.length - 1];
    renderAVL(new Set([last.id]), { [last.id]: finalCls });
    await sleep(finalCls === 'found' ? 1800 : 480);
  }
}

async function _showAVLRotations(rots) {
  for (const { kind, pivot } of rots) {
    const tc = $('avlCanvas');
    const lbl = document.createElement('div');
    lbl.className = 'tree-rotation-label';
    lbl.textContent = `${kind} Rotation at ${pivot}`;
    tc.prepend(lbl);
    renderAVL(); await sleep(750);
    const existing = tc.querySelector('.tree-rotation-label');
    if (existing) existing.remove();
    await sleep(200);
  }
}

// ═══════════════════════════════════════════════
//  AVL TREE — OPERATIONS
// ═══════════════════════════════════════════════
async function avlInsert() {
  if (avlAnimating) return;
  const inp = $('avlInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = ''; avlAnimating = true;

  const { path } = _avlFindPath(avlRoot, v);
  if (path.length) await _animateAVLPath(path, '');

  if (path.length && path[path.length - 1].v === v) {
    log('avlLog', 'insert', `<span class="val">${v}</span> already exists`);
    renderAVL(); avlAnimating = false; return;
  }

  const rots = [];
  avlRoot = _avlInsert(avlRoot, v, rots);
  renderAVL(); await sleep(300);

  if (rots.length) await _showAVLRotations(rots);

  renderAVL();
  log('avlLog', 'insert', `<span class="val">${v}</span> inserted${rots.length ? ' \u2014 ' + rots.map(r=>r.kind).join(', ') + ' rotation' : ''} (height\u00a0=\u00a0${avlRoot ? avlRoot.h : 0})`);
  avlAnimating = false;
}

async function avlRemove() {
  if (avlAnimating) return;
  const inp = $('avlInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!avlRoot) { log('avlLog', 'remove', 'tree is empty'); return; }
  avlAnimating = true;

  const { path, found } = _avlFindPath(avlRoot, v);
  await _animateAVLPath(path, found ? 'bubble-active' : '');

  if (!found) {
    log('avlLog', 'remove', `<span class="val">${v}</span> not found`);
    renderAVL(); avlAnimating = false; return;
  }

  await sleep(300);
  const el = $('avlCanvas').querySelector(`[data-id="${found.id}"]`);
  if (el) el.classList.add('animate-pop-out');
  await sleep(440);

  const rots = [];
  avlRoot = _avlRemove(avlRoot, v, rots);
  renderAVL(); await sleep(300);

  if (rots.length) await _showAVLRotations(rots);

  renderAVL();
  log('avlLog', 'remove', `<span class="val">${v}</span> removed${rots.length ? ' \u2014 ' + rots.map(r=>r.kind).join(', ') + ' rotation' : ''}`);
  avlAnimating = false;
}

async function avlSearch() {
  if (avlAnimating) return;
  const inp = $('avlInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!avlRoot) { log('avlLog', 'search', 'tree is empty'); return; }
  avlAnimating = true;

  const { path, found } = _avlFindPath(avlRoot, v);
  await _animateAVLPath(path, found ? 'found' : '');
  if (found) { log('avlLog', 'search', `<span class="val">${v}</span> found (depth\u00a0${path.length-1})`); await sleep(1800); }
  else { log('avlLog', 'search', `<span class="val">${v}</span> not found`); }
  renderAVL(); avlAnimating = false;
}

async function avlTraverse(order) {
  if (avlAnimating) return;
  if (!avlRoot) { log('avlLog', 'traverse', 'tree is empty'); return; }
  avlAnimating = true;
  const nodes = _avlCollect(avlRoot, order);
  const visited = new Set();
  for (const n of nodes) { visited.add(n.id); renderAVL(visited); await sleep(420); }
  await sleep(280); renderAVL();
  log('avlLog', 'traverse', `${order}: ${nodes.map(n=>`<span class="val">${n.v}</span>`).join(' \u2192 ')}`);
  avlAnimating = false;
}

function avlClear() {
  if (avlAnimating) return;
  avlRoot = null; avlNextId = 1; renderAVL();
  log('avlLog', 'clear', 'tree cleared');
}

// ─── Init AVL ───
setAVLImpl('avl');

// ═══════════════════════════════════════════════
//  B-TREE — DATA & METADATA
// ═══════════════════════════════════════════════
const BTREE_T = 2; // minimum degree; max keys per node = 2t-1 = 3
let btreeRoot = null;
let btreeImpl = '2-3-4';
let btreeAnimating = false;
let btreeNextId = 1;

const btreeImplMeta = {
  '2-3-4': {
    label: '2-3-4 Tree (t = 2)',
    note: 'Minimum degree t\u00a0=\u00a02. Each non-root node holds 1\u20133 keys and 2\u20134 children. The root can have as few as 1 key. Splits happen proactively on the way down so no second pass is needed.',
    complexity: [['insert','O(log n)'],['remove','O(log n)'],['search','O(log n)']]
  }
};

sidebarData.btree = {
  description: 'A B-Tree of minimum degree t is a balanced multi-way search tree where all leaves are at the same depth. Each internal node holds up to 2t\u22121 keys and 2t children. With t\u00a0=\u00a02 (a 2-3-4 tree), nodes hold 1\u20133 keys. Splits keep the tree balanced without extra traversals.'
};

_sidebarPanels.btree = {
  getMeta: () => btreeImplMeta[btreeImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Split Property</h3><p>When a node is full (2t\u22121 keys), it splits: the median key promotes to the parent, and the left/right halves become two sibling nodes. All leaves remain at the same depth.</p></div>`
};

// ═══════════════════════════════════════════════
//  B-TREE — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setBTreeImpl(type) {
  btreeImpl = type;
  document.querySelectorAll('[data-btree-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.btreeImpl === type);
  });
  $('btreeImplNote').innerHTML = btreeImplMeta[type].note;
  if ($('panel-btree').classList.contains('active')) updateSidebar('btree');
  renderBTree();
}

// ═══════════════════════════════════════════════
//  B-TREE — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function _btnewNode(leaf) {
  return { keys: [], children: [], leaf, id: btreeNextId++ };
}

// Split child at index ci of parent. Child must have 2t-1 keys.
function _btSplitChild(parent, ci) {
  const t = BTREE_T;
  const child = parent.children[ci];
  const sibling = _btnewNode(child.leaf);
  const mid = child.keys[t - 1];
  sibling.keys = child.keys.slice(t);
  if (!child.leaf) sibling.children = child.children.slice(t);
  child.keys = child.keys.slice(0, t - 1);
  if (!child.leaf) child.children = child.children.slice(0, t);
  parent.keys.splice(ci, 0, mid);
  parent.children.splice(ci + 1, 0, sibling);
  return mid;
}

// Insert v into a non-full node (recursive)
function _btInsertNonFull(node, v, events) {
  events.push({ type: 'visit', node });
  if (node.leaf) {
    let i = node.keys.length - 1;
    while (i >= 0 && v < node.keys[i]) i--;
    node.keys.splice(i + 1, 0, v);
    events.push({ type: 'insert-key', node, v });
  } else {
    let i = node.keys.length - 1;
    while (i >= 0 && v < node.keys[i]) i--;
    i++;
    if (node.children[i].keys.length === 2 * BTREE_T - 1) {
      const mid = _btSplitChild(node, i);
      events.push({ type: 'split', node, mid });
      if (v > node.keys[i]) i++;
    }
    _btInsertNonFull(node.children[i], v, events);
  }
}

function _btreeContains(node, v) {
  let i = 0;
  while (i < node.keys.length && v > node.keys[i]) i++;
  if (i < node.keys.length && v === node.keys[i]) return true;
  if (node.leaf) return false;
  return _btreeContains(node.children[i], v);
}

function _btreeInsert(v, events) {
  if (!btreeRoot) {
    btreeRoot = _btnewNode(true);
    btreeRoot.keys.push(v);
    events.push({ type: 'insert-key', node: btreeRoot, v });
    return;
  }
  if (_btreeContains(btreeRoot, v)) return; // duplicate
  if (btreeRoot.keys.length === 2 * BTREE_T - 1) {
    const newRoot = _btnewNode(false);
    newRoot.children.push(btreeRoot);
    btreeRoot = newRoot;
    const mid = _btSplitChild(btreeRoot, 0);
    events.push({ type: 'split', node: btreeRoot, mid });
  }
  _btInsertNonFull(btreeRoot, v, events);
}

function _btreeFindPath(root, v) {
  const path = []; let cur = root;
  while (cur) {
    path.push(cur);
    let i = 0;
    while (i < cur.keys.length && v > cur.keys[i]) i++;
    if (i < cur.keys.length && v === cur.keys[i]) return { path, found: cur, keyIdx: i };
    if (cur.leaf) return { path, found: null, keyIdx: -1 };
    cur = cur.children[i];
  }
  return { path, found: null, keyIdx: -1 };
}

function _btreePred(node) {
  while (!node.leaf) node = node.children[node.children.length - 1];
  return node.keys[node.keys.length - 1];
}
function _btreeSucc(node) {
  while (!node.leaf) node = node.children[0];
  return node.keys[0];
}

function _btMerge(parent, i, events) {
  const left = parent.children[i], right = parent.children[i + 1];
  left.keys.push(parent.keys[i]);
  left.keys.push(...right.keys);
  if (!left.leaf) left.children.push(...right.children);
  parent.keys.splice(i, 1);
  parent.children.splice(i + 1, 1);
  events.push({ type: 'merge', node: parent });
}

function _btFill(parent, i, events) {
  const t = BTREE_T;
  if (i > 0 && parent.children[i - 1].keys.length >= t) {
    const child = parent.children[i], sib = parent.children[i - 1];
    child.keys.unshift(parent.keys[i - 1]);
    parent.keys[i - 1] = sib.keys.pop();
    if (!sib.leaf) child.children.unshift(sib.children.pop());
    events.push({ type: 'borrow', node: parent });
  } else if (i < parent.children.length - 1 && parent.children[i + 1].keys.length >= t) {
    const child = parent.children[i], sib = parent.children[i + 1];
    child.keys.push(parent.keys[i]);
    parent.keys[i] = sib.keys.shift();
    if (!sib.leaf) child.children.push(sib.children.shift());
    events.push({ type: 'borrow', node: parent });
  } else {
    if (i < parent.children.length - 1) _btMerge(parent, i, events);
    else { _btMerge(parent, i - 1, events); }
  }
}

function _btreeRemoveRec(node, v, events) {
  const t = BTREE_T;
  events.push({ type: 'visit', node });
  let i = 0;
  while (i < node.keys.length && v > node.keys[i]) i++;

  if (i < node.keys.length && node.keys[i] === v) {
    if (node.leaf) {
      node.keys.splice(i, 1);
      events.push({ type: 'delete-key', node, v });
    } else if (node.children[i].keys.length >= t) {
      const pred = _btreePred(node.children[i]);
      node.keys[i] = pred;
      events.push({ type: 'replace', node, v: pred });
      _btreeRemoveRec(node.children[i], pred, events);
    } else if (node.children[i + 1].keys.length >= t) {
      const succ = _btreeSucc(node.children[i + 1]);
      node.keys[i] = succ;
      events.push({ type: 'replace', node, v: succ });
      _btreeRemoveRec(node.children[i + 1], succ, events);
    } else {
      _btMerge(node, i, events);
      _btreeRemoveRec(node.children[i], v, events);
    }
  } else {
    if (node.leaf) { events.push({ type: 'not-found', v }); return; }
    const isLast = (i === node.children.length - 1);
    if (node.children[i].keys.length < t) {
      _btFill(node, i, events);
      if (isLast && i > node.keys.length) i--;
    }
    _btreeRemoveRec(node.children[i], v, events);
  }
}

function _btreeAllNodes(root) {
  if (!root) return [];
  const out = [], q = [root];
  while (q.length) { const n = q.shift(); out.push(n); if (!n.leaf) n.children.forEach(c => q.push(c)); }
  return out;
}

// ═══════════════════════════════════════════════
//  B-TREE — LAYOUT
// ═══════════════════════════════════════════════
function layoutBTree(root, width, levelH, topPad) {
  const keyW = 36, pad = 8;
  const pos = new Map();
  const levels = [];
  let q = [root];
  while (q.length) {
    levels.push(q);
    const next = [];
    for (const n of q) if (!n.leaf) n.children.forEach(c => next.push(c));
    q = next;
  }
  for (let lv = 0; lv < levels.length; lv++) {
    const y = topPad + lv * levelH;
    const lvNodes = levels[lv];
    const totalW = lvNodes.reduce((a, n) => a + n.keys.length * keyW + 2 * pad, 0);
    const spacing = Math.max(8, (width - totalW) / (lvNodes.length + 1));
    let x = spacing;
    for (const n of lvNodes) {
      const w = n.keys.length * keyW + 2 * pad;
      pos.set(n, { x: x + w / 2, y, w });
      x += w + spacing;
    }
  }
  return pos;
}

// ═══════════════════════════════════════════════
//  B-TREE — RENDER
// ═══════════════════════════════════════════════
const BTREE_EMPTY = `<div class="empty-state"><span class="ornament">\u00a7</span>Insert a value to begin</div>`;

function renderBTree(hlNodeIds, hlKeyStr) {
  const tc = $('btreeCanvas'), ac = $('btreeImplCanvas');
  if (!btreeRoot) { tc.innerHTML = BTREE_EMPTY; ac.innerHTML = BTREE_EMPTY; return; }
  _renderBTreeSVG(tc, hlNodeIds || new Set(), hlKeyStr || new Set());
  _renderBTreeStruct(ac, hlNodeIds || new Set());
}

function _renderBTreeSVG(c, hlNodeIds, hlKeyStr) {
  const W = 560, levelH = 90, topPad = 36;
  const keyW = 36, keyH = 30, pad = 8;
  const pos = layoutBTree(btreeRoot, W, levelH, topPad);
  let maxY = 0; for (const p of pos.values()) maxY = Math.max(maxY, p.y);
  const svgH = maxY + keyH + 40;
  let svg = `<svg viewBox="0 0 ${W} ${svgH}" style="width:100%;height:${svgH}px;display:block">`;

  const allNodes = _btreeAllNodes(btreeRoot);

  // Edges
  for (const node of allNodes) {
    if (node.leaf) continue;
    const { x: px, y: py, w: pw } = pos.get(node);
    for (let ci = 0; ci < node.children.length; ci++) {
      const cp = pos.get(node.children[ci]);
      if (!cp) continue;
      const nx = px - pw / 2 + (ci + 0.5) * pw / node.children.length;
      svg += `<line class="edge-line" x1="${nx}" y1="${py + keyH/2}" x2="${cp.x}" y2="${cp.y - keyH/2}"/>`;
    }
  }

  // Nodes
  for (const node of allNodes) {
    const { x, y, w } = pos.get(node);
    const isHLNode = hlNodeIds.has(node.id);
    const startX = x - w / 2 + pad;
    for (let ki = 0; ki < node.keys.length; ki++) {
      const kx = startX + ki * keyW;
      const keyId = `${node.id}-${ki}`;
      let cls = 'node-rect btree-key';
      if (hlKeyStr.has(keyId)) cls += ' highlight';
      else if (isHLNode) cls += ' path';
      svg += `<rect class="${cls}" x="${kx}" y="${y - keyH/2}" width="${keyW}" height="${keyH}" rx="4"/>`;
      svg += `<text class="node-text" x="${kx + keyW/2}" y="${y}">${node.keys[ki]}</text>`;
    }
    if (node.leaf) {
      svg += `<text class="tree-meta-label" x="${x}" y="${y + keyH/2 + 11}">leaf</text>`;
    }
  }
  svg += '</svg>'; c.innerHTML = svg;
}

function _renderBTreeStruct(c, hlNodeIds) {
  const allNodes = _btreeAllNodes(btreeRoot);
  let h = '<div class="impl-view"><div class="impl-section-label">Node structs (BFS order)</div><div class="tree-struct-view" style="overflow-x:auto">';
  h += `<div class="tree-struct-header" style="grid-template-columns:2rem 1fr 2.5rem"><span>id</span><span style="text-align:left">keys</span><span>ch</span></div>`;
  for (const n of allNodes) {
    const row = hlNodeIds.has(n.id) ? ' row-highlight' : '';
    const keys = n.keys.map(k => `<span class="struct-val">${k}</span>`).join(' ');
    const ch = n.leaf ? '\u2013' : n.children.length;
    h += `<div class="tree-struct-row${row}" style="grid-template-columns:2rem 1fr 2.5rem"><span>${n.id}</span><span style="text-align:left;padding-left:0.2rem;display:flex;gap:0.25rem">${keys}</span><span>${ch}</span></div>`;
  }
  const totalKeys = allNodes.reduce((a, n) => a + n.keys.length, 0);
  h += `</div><div class="impl-info-row"><span class="impl-stat">nodes\u00a0=\u00a0${allNodes.length}</span><span class="impl-stat">keys\u00a0=\u00a0${totalKeys}</span><span class="impl-stat">t\u00a0=\u00a0${BTREE_T}</span></div></div>`;
  c.innerHTML = h;
}

// ═══════════════════════════════════════════════
//  B-TREE — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function _animateBTreeEvents(events) {
  for (const e of events) {
    if (e.type === 'visit') {
      renderBTree(new Set([e.node.id])); await sleep(360);
    } else if (e.type === 'split') {
      renderBTree(new Set([e.node.id])); await sleep(500);
    } else if (e.type === 'insert-key' || e.type === 'delete-key' || e.type === 'replace') {
      renderBTree(new Set([e.node.id])); await sleep(420);
    } else if (e.type === 'merge' || e.type === 'borrow') {
      renderBTree(new Set([e.node.id])); await sleep(420);
    }
  }
}

// ═══════════════════════════════════════════════
//  B-TREE — OPERATIONS
// ═══════════════════════════════════════════════
async function btreeInsert() {
  if (btreeAnimating) return;
  const inp = $('btreeInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = ''; btreeAnimating = true;

  const events = [];
  _btreeInsert(v, events);
  await _animateBTreeEvents(events);
  renderBTree();
  log('btreeLog', 'insert', `<span class="val">${v}</span> inserted`);
  btreeAnimating = false;
}

async function btreeRemove() {
  if (btreeAnimating) return;
  const inp = $('btreeInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!btreeRoot) { log('btreeLog', 'remove', 'tree is empty'); return; }
  btreeAnimating = true;

  const { found } = _btreeFindPath(btreeRoot, v);
  if (!found) {
    log('btreeLog', 'remove', `<span class="val">${v}</span> not found`);
    renderBTree(); btreeAnimating = false; return;
  }

  const events = [];
  _btreeRemoveRec(btreeRoot, v, events);
  // Shrink root if emptied
  if (btreeRoot.keys.length === 0 && !btreeRoot.leaf) btreeRoot = btreeRoot.children[0] || null;
  if (btreeRoot && btreeRoot.keys.length === 0) btreeRoot = null;

  await _animateBTreeEvents(events);
  renderBTree();
  log('btreeLog', 'remove', `<span class="val">${v}</span> removed`);
  btreeAnimating = false;
}

async function btreeSearch() {
  if (btreeAnimating) return;
  const inp = $('btreeInput'), v = parseInt(inp.value, 10);
  if (isNaN(v)) return; inp.value = '';
  if (!btreeRoot) { log('btreeLog', 'search', 'tree is empty'); return; }
  btreeAnimating = true;

  const { path, found, keyIdx } = _btreeFindPath(btreeRoot, v);
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    renderBTree(new Set([node.id])); await sleep(380);
    if (i === path.length - 1 && found) {
      renderBTree(new Set([node.id]), new Set([`${node.id}-${keyIdx}`]));
      await sleep(900);
    }
  }
  if (found) { log('btreeLog', 'search', `<span class="val">${v}</span> found (depth\u00a0${path.length-1})`); }
  else { log('btreeLog', 'search', `<span class="val">${v}</span> not found`); }
  renderBTree(); btreeAnimating = false;
}

function btreeClear() {
  if (btreeAnimating) return;
  btreeRoot = null; btreeNextId = 1; renderBTree();
  log('btreeLog', 'clear', 'tree cleared');
}

// ─── Init B-Tree ───
setBTreeImpl('2-3-4');

// ═══════════════════════════════════════════════
//  HASH TABLE
// ═══════════════════════════════════════════════

const HT_SIZE = 8;
let htImpl = 'chaining';
let htAnimating = false;
let htChains = Array.from({length: HT_SIZE}, () => []);
let htSlots = Array(HT_SIZE).fill(null);

function htHash(key) { return ((key % HT_SIZE) + HT_SIZE) % HT_SIZE; }

const htImplMeta = {
  'chaining': {
    label: 'Separate Chaining',
    note: 'Each slot holds a linked list of <em>(key, value)</em> pairs. Collisions chain onto the list at <code>h(k) = k mod 8</code>. Load factor can exceed 1.0 without issue.',
    complexity: [['put','O(1) avg'],['get','O(1) avg'],['remove','O(1) avg'],['worst (all collide)','O(n)']]
  },
  'open-addr': {
    label: 'Open Addressing — Linear Probe',
    note: 'All entries live in the array itself — no pointers. On collision, probe forward (idx + 1 mod N) until an empty slot. Removed slots become <em>tombstones ⊗</em> so later probes are not prematurely stopped.',
    complexity: [['put','O(1) avg'],['get','O(1) avg'],['remove','O(1) avg'],['worst (full table)','O(n)']]
  }
};

sidebarData.hashtable = {
  description: 'A hash table maps keys to values using a hash function <em>h(k) = k mod N</em> to pick an array index. When two keys land on the same index (a <em>collision</em>), it is resolved with chaining (a linked list per slot) or open addressing (linear probing within the array).'
};

_sidebarPanels.hashtable = {
  getMeta: () => htImplMeta[htImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Hash Function</h3><p>This demo uses <code>h(k) = k mod 8</code>. A good hash function distributes keys uniformly to minimise collisions and keep chains short (ideally O(1) length).</p></div>`
};

function setHTImpl(type) {
  htImpl = type;
  document.querySelectorAll('[data-ht-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.htImpl === type);
  });
  $('htImplNote').innerHTML = htImplMeta[type].note;
  htChains = Array.from({length: HT_SIZE}, () => []);
  htSlots = Array(HT_SIZE).fill(null);
  renderHT();
  if ($('panel-hashtable').classList.contains('active')) updateSidebar('hashtable');
}

function renderHT(hlSlot = -1, hlKey = null, hlCls = '') {
  const ac = $('htCanvas'), ic = $('htImplCanvas');
  const hasData = htImpl === 'chaining'
    ? htChains.some(c => c.length > 0)
    : htSlots.some(s => s !== null);

  if (!hasData) {
    ac.innerHTML = `<div class="empty-state"><span class="ornament">§</span>Put a key\u2013value pair to begin</div>`;
    ic.innerHTML = `<div class="empty-state"><span class="ornament">§</span>Put a key\u2013value pair to begin</div>`;
    return;
  }

  // Abstract pane: sorted KV list
  let pairs = [];
  if (htImpl === 'chaining') {
    for (const chain of htChains) for (const e of chain) pairs.push(e);
  } else {
    for (const s of htSlots) if (s && s.state === 'occupied') pairs.push({key: s.key, val: s.val});
  }
  pairs.sort((a, b) => a.key - b.key);

  let html = '<div class="ht-abstract">';
  html += '<div class="ht-abstract-hdr"><span>key</span><span>value</span><span>slot h(k)</span></div>';
  for (const {key, val} of pairs) {
    const isHL = hlKey !== null && key === hlKey;
    html += `<div class="ht-kv-row${isHL ? ' ' + hlCls : ''}">
      <span class="ht-cn-key">${key}</span>
      <span class="ht-arrow-sym">\u2192</span>
      <span class="ht-cn-val">${val}</span>
      <span class="ht-kv-slot">${htHash(key)}</span>
    </div>`;
  }
  html += '</div>';
  ac.innerHTML = html;

  if (htImpl === 'chaining') _renderHTChaining(ic, hlSlot, hlKey, hlCls);
  else _renderHTOpenAddr(ic, hlSlot, hlKey, hlCls);
}

function _renderHTChaining(ic, hlSlot, hlKey, hlCls) {
  let html = '<div class="ht-table">';
  for (let i = 0; i < HT_SIZE; i++) {
    const chain = htChains[i];
    const isHL = i === hlSlot;
    html += `<div class="ht-row${isHL ? ' ht-row-active' : ''}">`;
    html += `<span class="ht-idx">${i}</span>`;
    html += `<div class="ht-chain-wrap">`;
    html += `<div class="ht-bucket${chain.length === 0 ? ' ht-bucket-null' : ''}">`;
    html += chain.length === 0 ? `<span class="ht-null-sym">\u2205</span>` : `<span class="ht-ptr-sym">\u25cf</span>`;
    html += `</div>`;
    for (const {key, val} of chain) {
      const nodeHL = isHL && hlKey !== null && key === hlKey;
      html += `<span class="ht-chain-arr">\u2192</span>`;
      html += `<div class="ht-cn-box${nodeHL ? ' ' + hlCls : ''}">`;
      html += `<span class="ht-cn-key">${key}</span><span class="ht-cn-sep">:</span><span class="ht-cn-val">${val}</span>`;
      html += `</div>`;
    }
    if (chain.length > 0) html += `<span class="ht-chain-arr">\u2192</span><span class="ht-null-sym">\u2205</span>`;
    html += `</div></div>`;
  }
  html += '</div>';
  ic.innerHTML = html;
}

function _renderHTOpenAddr(ic, hlSlot, hlKey, hlCls) {
  let html = '<div class="ht-table">';
  for (let i = 0; i < HT_SIZE; i++) {
    const slot = htSlots[i];
    const isHL = i === hlSlot;
    html += `<div class="ht-row${isHL ? ' ht-row-active' : ''}">`;
    html += `<span class="ht-idx">${i}</span>`;
    if (!slot) {
      html += `<div class="ht-bucket ht-bucket-null"><span class="ht-null-sym">\u2205</span></div>`;
    } else if (slot.state === 'deleted') {
      html += `<div class="ht-bucket ht-bucket-tomb"><span class="ht-tomb-sym">\u2297 tombstone</span></div>`;
    } else {
      const nodeHL = isHL && hlKey !== null && slot.key === hlKey;
      html += `<div class="ht-bucket ht-bucket-occ${nodeHL ? ' ' + hlCls : ''}">`;
      html += `<span class="ht-cn-key">${slot.key}</span><span class="ht-cn-sep">:</span><span class="ht-cn-val">${slot.val}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }
  html += '</div>';
  ic.innerHTML = html;
}

async function htPut() {
  if (htAnimating) return;
  const key = parseInt($('htKeyInput').value, 10);
  const val = parseInt($('htValInput').value, 10);
  if (isNaN(key) || isNaN(val)) return;
  $('htKeyInput').value = ''; $('htValInput').value = '';
  htAnimating = true;
  const h = htHash(key);

  if (htImpl === 'chaining') {
    renderHT(h); await sleep(380);
    const ex = htChains[h].find(e => e.key === key);
    if (ex) {
      ex.val = val;
      renderHT(h, key, 'ht-found'); await sleep(500);
      log('htLog', 'put', `updated <span class="val">${key}</span> \u2192 <span class="val">${val}</span> (slot\u00a0${h})`);
    } else {
      htChains[h].push({key, val});
      renderHT(h, key, 'ht-found'); await sleep(500);
      log('htLog', 'put', `inserted <span class="val">${key}</span> \u2192 <span class="val">${val}</span> at slot\u00a0${h} (chain len\u00a0${htChains[h].length})`);
    }
  } else {
    let dest = -1, firstTomb = -1;
    for (let p = 0; p < HT_SIZE; p++) {
      const i = (h + p) % HT_SIZE;
      renderHT(i); await sleep(280);
      const s = htSlots[i];
      if (!s) { dest = firstTomb !== -1 ? firstTomb : i; break; }
      if (s.state === 'deleted') { if (firstTomb === -1) firstTomb = i; }
      else if (s.key === key) {
        s.val = val;
        renderHT(i, key, 'ht-found'); await sleep(500);
        log('htLog', 'put', `updated <span class="val">${key}</span> \u2192 <span class="val">${val}</span> at slot\u00a0${i}`);
        renderHT(); htAnimating = false; return;
      }
    }
    if (dest === -1) dest = firstTomb;
    if (dest === -1) {
      log('htLog', 'put', 'table is full \u2014 cannot insert');
      renderHT(); htAnimating = false; return;
    }
    htSlots[dest] = {key, val, state: 'occupied'};
    renderHT(dest, key, 'ht-found'); await sleep(500);
    const probed = (dest - h + HT_SIZE) % HT_SIZE;
    log('htLog', 'put', `inserted <span class="val">${key}</span> \u2192 <span class="val">${val}</span> at slot\u00a0${dest}${probed ? ` (${probed} probe${probed > 1 ? 's' : ''})` : ''}`);
  }
  renderHT(); htAnimating = false;
}

async function htGet() {
  if (htAnimating) return;
  const key = parseInt($('htKeyInput').value, 10);
  if (isNaN(key)) return;
  htAnimating = true;
  const h = htHash(key);

  if (htImpl === 'chaining') {
    renderHT(h); await sleep(380);
    const ex = htChains[h].find(e => e.key === key);
    if (ex) {
      renderHT(h, key, 'ht-found'); await sleep(800);
      log('htLog', 'get', `<span class="val">${key}</span> \u2192 <span class="val">${ex.val}</span> (slot\u00a0${h})`);
    } else {
      log('htLog', 'get', `<span class="val">${key}</span> not found`);
    }
  } else {
    let found = false;
    for (let p = 0; p < HT_SIZE; p++) {
      const i = (h + p) % HT_SIZE;
      renderHT(i); await sleep(300);
      const s = htSlots[i];
      if (!s) break;
      if (s.state === 'occupied' && s.key === key) {
        renderHT(i, key, 'ht-found'); await sleep(800);
        log('htLog', 'get', `<span class="val">${key}</span> \u2192 <span class="val">${s.val}</span> (slot\u00a0${i})`);
        found = true; break;
      }
    }
    if (!found) log('htLog', 'get', `<span class="val">${key}</span> not found`);
  }
  renderHT(); htAnimating = false;
}

async function htRemove() {
  if (htAnimating) return;
  const key = parseInt($('htKeyInput').value, 10);
  if (isNaN(key)) return;
  htAnimating = true;
  const h = htHash(key);

  if (htImpl === 'chaining') {
    renderHT(h); await sleep(380);
    const idx = htChains[h].findIndex(e => e.key === key);
    if (idx !== -1) {
      renderHT(h, key, 'ht-danger'); await sleep(500);
      htChains[h].splice(idx, 1);
      renderHT(h); await sleep(180);
      log('htLog', 'remove', `<span class="val">${key}</span> removed from slot\u00a0${h}`);
    } else {
      log('htLog', 'remove', `<span class="val">${key}</span> not found`);
    }
  } else {
    let found = false;
    for (let p = 0; p < HT_SIZE; p++) {
      const i = (h + p) % HT_SIZE;
      renderHT(i); await sleep(300);
      const s = htSlots[i];
      if (!s) break;
      if (s.state === 'occupied' && s.key === key) {
        renderHT(i, key, 'ht-danger'); await sleep(500);
        htSlots[i] = {state: 'deleted'};
        renderHT(i); await sleep(180);
        log('htLog', 'remove', `<span class="val">${key}</span> removed \u2014 tombstone \u2297 at slot\u00a0${i}`);
        found = true; break;
      }
    }
    if (!found) log('htLog', 'remove', `<span class="val">${key}</span> not found`);
  }
  renderHT(); htAnimating = false;
}

function htClear() {
  if (htAnimating) return;
  htChains = Array.from({length: HT_SIZE}, () => []);
  htSlots = Array(HT_SIZE).fill(null);
  renderHT();
  log('htLog', 'clear', 'table cleared');
}

// ─── Init Hash Table ───
setHTImpl('chaining');

// ═══════════════════════════════════════════════
//  DICTIONARY
// ═══════════════════════════════════════════════

const DICT_HT_INIT_SIZE = 8;
const DICT_HT_LOAD_FACTOR = 0.75;
let dictHtSize = DICT_HT_INIT_SIZE;
let dictImpl = 'hashmap';
let dictAnimating = false;
let dictChains = Array.from({length: dictHtSize}, () => []);
let dictBSTRoot = null;
let dictBSTNextId = 1;

function dictHash(key) { return ((key % dictHtSize) + dictHtSize) % dictHtSize; }

function dictHtEntryCount() { return dictChains.reduce((s, c) => s + c.length, 0); }

function _dictResize() {
  const oldChains = dictChains;
  dictHtSize *= 2;
  dictChains = Array.from({length: dictHtSize}, () => []);
  for (const chain of oldChains) for (const e of chain) dictChains[dictHash(e.key)].push(e);
}

const dictImplMeta = {
  'hashmap': {
    label: 'Hash Map \u2014 Separate Chaining',
    note: 'Keys are hashed to array indices; collisions append to a linked list at that slot. Expected O(1) per operation. Insertion order is not preserved and keys are not sorted.',
    complexity: [['insert','O(1) avg'],['lookup','O(1) avg'],['delete','O(1) avg'],['in-order scan','O(n log n) sort']]
  },
  'bst': {
    label: 'BST-backed',
    note: 'Keys are stored in a Binary Search Tree ordered left\u00a0<\u00a0node\u00a0<\u00a0right. In-order traversal yields keys in sorted order. Tree height h determines operation cost.',
    complexity: [['insert','O(h)'],['lookup','O(h)'],['delete','O(h)'],['in-order traversal','O(n)']]
  }
};

sidebarData.dictionary = {
  description: 'A dictionary (map) associates unique <em>keys</em> with <em>values</em>. Backing structure determines trade-offs: hash maps give expected O(1) ops but no ordering; BST-backed dicts maintain sorted key order with O(h) ops where h is tree height.'
};

_sidebarPanels.dictionary = {
  getMeta: () => dictImplMeta[dictImpl],
  extraSection: () => dictImpl === 'bst'
    ? `<div class="sidebar-section"><h3>Key Order</h3><p>In-order traversal of the BST yields all keys in sorted ascending order \u2014 a property unique to tree-backed dictionaries, unavailable in hash maps.</p></div>`
    : `<div class="sidebar-section"><h3>Load Factor</h3><p>Performance degrades when entries\u00a0/\u00a0slots exceeds ~0.7. Real implementations resize (double the array) to keep expected chain length O(1).</p></div>`
};

function setDictImpl(type) {
  dictImpl = type;
  document.querySelectorAll('[data-dict-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.dictImpl === type);
  });
  $('dictImplNote').innerHTML = dictImplMeta[type].note;
  dictHtSize = DICT_HT_INIT_SIZE;
  dictChains = Array.from({length: dictHtSize}, () => []);
  dictBSTRoot = null; dictBSTNextId = 1;
  renderDict();
  if ($('panel-dictionary').classList.contains('active')) updateSidebar('dictionary');
}

function renderDict(hlSlot = -1, hlKey = null, hlCls = '', hlBSTSet = new Set(), hlBSTCls = {}) {
  const ac = $('dictCanvas'), ic = $('dictImplCanvas');
  const hasData = dictImpl === 'hashmap' ? dictChains.some(c => c.length > 0) : dictBSTRoot !== null;

  if (!hasData) {
    ac.innerHTML = `<div class="empty-state"><span class="ornament">\u00a7</span>Insert a key\u2013value pair to begin</div>`;
    ic.innerHTML = `<div class="empty-state"><span class="ornament">\u00a7</span>Insert a key\u2013value pair to begin</div>`;
    return;
  }

  if (dictImpl === 'hashmap') {
    let pairs = [];
    for (const chain of dictChains) for (const e of chain) pairs.push(e);
    pairs.sort((a, b) => a.key - b.key);
    let html = '<div class="ht-abstract">';
    html += '<div class="ht-abstract-hdr"><span>key</span><span>value</span><span>slot</span></div>';
    for (const {key, val} of pairs) {
      const isHL = hlKey !== null && key === hlKey;
      html += `<div class="ht-kv-row${isHL ? ' ' + hlCls : ''}">
        <span class="ht-cn-key">${key}</span>
        <span class="ht-arrow-sym">\u2192</span>
        <span class="ht-cn-val">${val}</span>
        <span class="ht-kv-slot">${dictHash(key)}</span>
      </div>`;
    }
    html += '</div>';
    ac.innerHTML = html;
    _renderDictChaining(ic, hlSlot, hlKey, hlCls);
  } else {
    // BST-backed: left = KV table sorted by key; right = BST tree
    const inorder = _dictBSTInorder(dictBSTRoot);
    let html = '<div class="ht-abstract">';
    html += '<div class="ht-abstract-hdr"><span>key</span><span>value</span></div>';
    for (const n of inorder) {
      const isHL = hlBSTSet.has(n.id);
      html += `<div class="ht-kv-row${isHL ? ' ht-found' : ''}">
        <span class="ht-cn-key">${n.key}</span>
        <span class="ht-arrow-sym">\u2192</span>
        <span class="ht-cn-val">${n.val}</span>
      </div>`;
    }
    html += `<div style="padding:0.3rem 0.4rem;font-family:'DM Mono',monospace;font-size:0.52rem;color:var(--muted);border-top:1px dotted var(--rule)">in-order \u2192 keys sorted</div>`;
    html += '</div>';
    ac.innerHTML = html;
    _renderDictBSTTree(ic, hlBSTSet, hlBSTCls);
  }
}

function _renderDictChaining(ic, hlSlot, hlKey, hlCls) {
  let html = '<div class="ht-table">';
  for (let i = 0; i < dictHtSize; i++) {
    const chain = dictChains[i];
    const isHL = i === hlSlot;
    html += `<div class="ht-row${isHL ? ' ht-row-active' : ''}">`;
    html += `<span class="ht-idx">${i}</span>`;
    html += `<div class="ht-chain-wrap">`;
    html += `<div class="ht-bucket${chain.length === 0 ? ' ht-bucket-null' : ''}">`;
    html += chain.length === 0 ? `<span class="ht-null-sym">\u2205</span>` : `<span class="ht-ptr-sym">\u25cf</span>`;
    html += `</div>`;
    for (const {key, val} of chain) {
      const nodeHL = isHL && hlKey !== null && key === hlKey;
      html += `<span class="ht-chain-arr">\u2192</span>`;
      html += `<div class="ht-cn-box${nodeHL ? ' ' + hlCls : ''}">`;
      html += `<span class="ht-cn-key">${key}</span><span class="ht-cn-sep">:</span><span class="ht-cn-val">${val}</span>`;
      html += `</div>`;
    }
    if (chain.length > 0) html += `<span class="ht-chain-arr">\u2192</span><span class="ht-null-sym">\u2205</span>`;
    html += `</div></div>`;
  }
  html += '</div>';
  ic.innerHTML = html;
}

// ── Dictionary BST helpers ──
function _dictBSTFind(root, key) {
  let cur = root;
  while (cur) {
    if (key === cur.key) return cur;
    cur = key < cur.key ? cur.left : cur.right;
  }
  return null;
}

function _dictBSTFindPath(root, key) {
  const path = []; let cur = root;
  while (cur) {
    path.push(cur);
    if (key === cur.key) return {path, found: cur};
    cur = key < cur.key ? cur.left : cur.right;
  }
  return {path, found: null};
}

function _dictBSTInorder(root) {
  const out = [];
  (function w(n) { if (!n) return; w(n.left); out.push(n); w(n.right); })(root);
  return out;
}

function _dictBSTInsert(key, val) {
  const node = {key, val, left: null, right: null, id: dictBSTNextId++};
  if (!dictBSTRoot) { dictBSTRoot = node; return; }
  let cur = dictBSTRoot;
  while (true) {
    if (key === cur.key) { cur.val = val; return; }
    if (key < cur.key) { if (!cur.left) { cur.left = node; return; } cur = cur.left; }
    else               { if (!cur.right) { cur.right = node; return; } cur = cur.right; }
  }
}

function _dictBSTRemove(root, key) {
  if (!root) return null;
  if (key < root.key) { root.left = _dictBSTRemove(root.left, key); }
  else if (key > root.key) { root.right = _dictBSTRemove(root.right, key); }
  else {
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    let succ = root.right; while (succ.left) succ = succ.left;
    root.key = succ.key; root.val = succ.val;
    root.right = _dictBSTRemove(root.right, succ.key);
  }
  return root;
}

function _renderDictBSTTree(c, hlSet, hlCls) {
  if (!dictBSTRoot) {
    c.innerHTML = `<div class="empty-state"><span class="ornament">\u00a7</span>Insert a key\u2013value pair to begin</div>`;
    return;
  }
  const W = 520, lH = 72, top = 38, r = 22;
  const pos = layoutBinaryTree(dictBSTRoot, W, lH, top);
  let maxY = 0; for (const p of pos.values()) maxY = Math.max(maxY, p.y);
  let svg = `<svg viewBox="0 0 ${W} ${maxY + r + 30}" style="width:100%;height:${maxY + r + 30}px;display:block">`;
  for (const [node, {x, y}] of pos) {
    if (node.left && pos.has(node.left)) { const p = pos.get(node.left); svg += `<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
    if (node.right && pos.has(node.right)) { const p = pos.get(node.right); svg += `<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
  }
  for (const [node, {x, y}] of pos) {
    const ex = hlCls[node.id] || (hlSet.has(node.id) ? 'bubble-active' : '');
    svg += `<circle class="node-circle${ex ? ' ' + ex : ''}" cx="${x}" cy="${y}" r="${r}"/>`;
    svg += `<text class="node-text dict-kv-key" x="${x}" y="${y - 5}">${node.key}</text>`;
    svg += `<text class="node-text dict-kv-val" x="${x}" y="${y + 9}">${node.val}</text>`;
  }
  svg += '</svg>';
  c.innerHTML = svg;
}

async function dictInsert() {
  if (dictAnimating) return;
  const key = parseInt($('dictKeyInput').value, 10);
  const val = parseInt($('dictValInput').value, 10);
  if (isNaN(key) || isNaN(val)) return;
  $('dictKeyInput').value = ''; $('dictValInput').value = '';
  dictAnimating = true;

  if (dictImpl === 'hashmap') {
    const h = dictHash(key);
    renderDict(h); await sleep(380);
    const ex = dictChains[h].find(e => e.key === key);
    if (ex) {
      ex.val = val;
      renderDict(h, key, 'ht-found'); await sleep(500);
      log('dictLog', 'insert', `updated <span class="val">${key}</span> \u2192 <span class="val">${val}</span>`);
    } else {
      dictChains[h].push({key, val});
      renderDict(h, key, 'ht-found'); await sleep(500);
      log('dictLog', 'insert', `inserted <span class="val">${key}</span> \u2192 <span class="val">${val}</span> at slot\u00a0${h}`);
      if (dictHtEntryCount() / dictHtSize >= DICT_HT_LOAD_FACTOR) {
        const oldSize = dictHtSize;
        _dictResize();
        log('dictLog', 'resize', `load factor \u2265 ${DICT_HT_LOAD_FACTOR} \u2014 resized ${oldSize} \u2192 ${dictHtSize} slots, rehashed all entries`);
        renderDict(); await sleep(500);
      }
    }
  } else {
    const {path} = _dictBSTFindPath(dictBSTRoot, key);
    for (let i = 0; i < path.length; i++) {
      const vis = new Set(path.slice(0, i + 1).map(n => n.id));
      const cls = {}; for (const id of vis) cls[id] = 'path';
      renderDict(-1, null, '', vis, cls); await sleep(380);
    }
    _dictBSTInsert(key, val);
    const newNode = _dictBSTFind(dictBSTRoot, key);
    if (newNode) {
      renderDict(-1, null, '', new Set([newNode.id]), {[newNode.id]: 'found'});
      await sleep(500);
    }
    log('dictLog', 'insert', `inserted <span class="val">${key}</span> \u2192 <span class="val">${val}</span>`);
  }
  renderDict(); dictAnimating = false;
}

async function dictLookup() {
  if (dictAnimating) return;
  const key = parseInt($('dictKeyInput').value, 10);
  if (isNaN(key)) return;
  dictAnimating = true;

  if (dictImpl === 'hashmap') {
    const h = dictHash(key);
    renderDict(h); await sleep(380);
    const ex = dictChains[h].find(e => e.key === key);
    if (ex) {
      renderDict(h, key, 'ht-found'); await sleep(800);
      log('dictLog', 'lookup', `<span class="val">${key}</span> \u2192 <span class="val">${ex.val}</span>`);
    } else {
      log('dictLog', 'lookup', `<span class="val">${key}</span> not found`);
    }
  } else {
    const {path, found} = _dictBSTFindPath(dictBSTRoot, key);
    for (let i = 0; i < path.length; i++) {
      const vis = new Set(path.slice(0, i + 1).map(n => n.id));
      const cls = {}; for (const id of vis) cls[id] = 'path';
      renderDict(-1, null, '', vis, cls); await sleep(380);
    }
    if (found) {
      renderDict(-1, null, '', new Set([found.id]), {[found.id]: 'found'});
      await sleep(900);
      log('dictLog', 'lookup', `<span class="val">${key}</span> \u2192 <span class="val">${found.val}</span>`);
    } else {
      log('dictLog', 'lookup', `<span class="val">${key}</span> not found`);
    }
  }
  renderDict(); dictAnimating = false;
}

async function dictDelete() {
  if (dictAnimating) return;
  const key = parseInt($('dictKeyInput').value, 10);
  if (isNaN(key)) return;
  dictAnimating = true;

  if (dictImpl === 'hashmap') {
    const h = dictHash(key);
    renderDict(h); await sleep(380);
    const idx = dictChains[h].findIndex(e => e.key === key);
    if (idx !== -1) {
      renderDict(h, key, 'ht-danger'); await sleep(500);
      dictChains[h].splice(idx, 1);
      renderDict(h); await sleep(180);
      log('dictLog', 'delete', `<span class="val">${key}</span> removed`);
    } else {
      log('dictLog', 'delete', `<span class="val">${key}</span> not found`);
    }
  } else {
    const {path, found} = _dictBSTFindPath(dictBSTRoot, key);
    for (let i = 0; i < path.length; i++) {
      const vis = new Set(path.slice(0, i + 1).map(n => n.id));
      const cls = {}; for (const id of vis) cls[id] = 'path';
      renderDict(-1, null, '', vis, cls); await sleep(380);
    }
    if (found) {
      renderDict(-1, null, '', new Set([found.id]), {[found.id]: 'danger'});
      await sleep(500);
      dictBSTRoot = _dictBSTRemove(dictBSTRoot, key);
      log('dictLog', 'delete', `<span class="val">${key}</span> removed`);
    } else {
      log('dictLog', 'delete', `<span class="val">${key}</span> not found`);
    }
  }
  renderDict(); dictAnimating = false;
}

function dictClear() {
  if (dictAnimating) return;
  dictHtSize = DICT_HT_INIT_SIZE;
  dictChains = Array.from({length: dictHtSize}, () => []);
  dictBSTRoot = null; dictBSTNextId = 1;
  renderDict();
  log('dictLog', 'clear', 'dictionary cleared');
}

// ─── Init Dictionary ───
setDictImpl('hashmap');

// ═══════════════════════════════════════════════
//  UNION-FIND (DISJOINT SET)
// ═══════════════════════════════════════════════

const UF_MAX = 10;
let ufImpl = 'naive';
let ufAnimating = false;
let ufParent = Array(UF_MAX).fill(-1);
let ufRank   = Array(UF_MAX).fill(0);
let ufExists = Array(UF_MAX).fill(false);

const ufImplMeta = {
  'naive': {
    label: 'Na\u00efve (no optimizations)',
    note: 'Union always attaches the second set\u2019s root to the first. Find walks parent pointers without compression. Trees can degenerate to a chain of height O(n).',
    complexity: [['make-set','O(1)'],['find','O(n) worst'],['union','O(n) worst']]
  },
  'rank': {
    label: 'Union by Rank',
    note: 'The shorter tree (lower rank) is attached under the taller one. <em>Rank</em> is an upper bound on height. This keeps tree height O(log\u00a0n), improving worst-case find.',
    complexity: [['make-set','O(1)'],['find','O(log\u00a0n)'],['union','O(log\u00a0n)']]
  },
  'path': {
    label: 'Path Compression',
    note: 'After Find traces up to the root, every node along the path is pointed directly to the root. Subsequent finds on those nodes take O(1).',
    complexity: [['make-set','O(1)'],['find','O(log\u00a0n) amortized'],['union','O(log\u00a0n) amortized']]
  },
  'both': {
    label: 'Union by Rank + Path Compression',
    note: 'Combining both optimizations yields an inverse-Ackermann O(\u03b1(n)) amortized cost per operation \u2014 effectively O(1) for any realistic n.',
    complexity: [['make-set','O(1)'],['find','O(\u03b1(n)) amortized'],['union','O(\u03b1(n)) amortized']]
  }
};

sidebarData.unionfind = {
  description: 'A disjoint-set (union-find) maintains a collection of non-overlapping sets, each represented as a tree. The root is the set\u2019s representative. <em>Find</em> locates a root; <em>Union</em> merges two sets by linking their roots.'
};

_sidebarPanels.unionfind = {
  getMeta: () => ufImplMeta[ufImpl],
  extraSection: () => `<div class="sidebar-section"><h3>Rank vs Height</h3><p>Rank is an upper bound on height, not necessarily equal to it. After path compression flattens a tree, rank stays unchanged \u2014 it only increases in union-by-rank when two equal-rank roots merge.</p></div>`
};

function setUFImpl(type) {
  ufImpl = type;
  document.querySelectorAll('[data-uf-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.ufImpl === type);
  });
  $('ufImplNote').innerHTML = ufImplMeta[type].note;
  ufParent = Array(UF_MAX).fill(-1);
  ufRank   = Array(UF_MAX).fill(0);
  ufExists = Array(UF_MAX).fill(false);
  renderUF();
  if ($('panel-unionfind').classList.contains('active')) updateSidebar('unionfind');
}

function _ufFindRoot(x) {
  while (ufParent[x] !== x) x = ufParent[x];
  return x;
}

function _ufFindPath(x) {
  const path = [x];
  while (ufParent[path[path.length - 1]] !== path[path.length - 1]) {
    path.push(ufParent[path[path.length - 1]]);
  }
  return path;
}

function renderUF(hlNodes = new Set(), hlCls = '') {
  const fc = $('ufCanvas'), ac = $('ufImplCanvas');
  if (!ufExists.some(Boolean)) {
    fc.innerHTML = `<div class="empty-state"><span class="ornament">\u00a7</span>Make-Set to add elements</div>`;
    ac.innerHTML = `<div class="empty-state"><span class="ornament">\u00a7</span>Make-Set to add elements</div>`;
    return;
  }
  _renderUFForest(fc, hlNodes, hlCls);
  _renderUFArrays(ac, hlNodes);
}

function _ufBuildChildren() {
  const ch = {};
  for (let i = 0; i < UF_MAX; i++) if (ufExists[i]) ch[i] = [];
  for (let i = 0; i < UF_MAX; i++) if (ufExists[i] && ufParent[i] !== i) ch[ufParent[i]].push(i);
  return ch;
}

function _ufSubtreeWidth(node, ch) {
  const children = ch[node];
  if (!children || children.length === 0) return 1;
  return children.reduce((s, c) => s + _ufSubtreeWidth(c, ch), 0);
}

function _renderUFForest(fc, hlNodes, hlCls) {
  const ch = _ufBuildChildren();
  const roots = [];
  for (let i = 0; i < UF_MAX; i++) if (ufExists[i] && ufParent[i] === i) roots.push(i);

  const unitW = 50, levelH = 54, r = 17, padX = 30, padY = 28;
  const pos = {};
  let xOff = 0;

  for (const root of roots) {
    const tw = _ufSubtreeWidth(root, ch);
    (function layout(node, localX, depth) {
      const children = (ch[node] || []).slice().sort((a, b) => a - b);
      if (children.length === 0) {
        pos[node] = {x: padX + (xOff + localX + 0.5) * unitW, y: padY + depth * levelH};
        return 1;
      }
      let cx = localX;
      const starts = [], widths = [];
      for (const c of children) {
        const w = _ufSubtreeWidth(c, ch);
        starts.push(cx); widths.push(w);
        layout(c, cx, depth + 1);
        cx += w;
      }
      const l = starts[0], r2 = starts[starts.length - 1] + widths[widths.length - 1];
      pos[node] = {x: padX + (xOff + (l + r2) / 2) * unitW, y: padY + depth * levelH};
      return cx - localX;
    })(root, 0, 0);
    xOff += tw + 0.7;
  }

  let maxX = padX * 2, maxY = padY + levelH;
  for (const {x, y} of Object.values(pos)) { maxX = Math.max(maxX, x + r + padX); maxY = Math.max(maxY, y + r + padY); }
  const W = Math.max(maxX, 200), H = Math.max(maxY, 120);

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">`;

  // Edges
  for (let i = 0; i < UF_MAX; i++) {
    if (ufExists[i] && ufParent[i] !== i && pos[i] && pos[ufParent[i]]) {
      const {x: x1, y: y1} = pos[ufParent[i]];
      const {x: x2, y: y2} = pos[i];
      svg += `<line class="edge-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
  }

  // Nodes
  for (let i = 0; i < UF_MAX; i++) {
    if (!ufExists[i] || !pos[i]) continue;
    const {x, y} = pos[i];
    const isRoot = ufParent[i] === i;
    const isHL   = hlNodes.has(i);
    let cls = 'node-circle';
    if (isRoot) cls += ' uf-root-node';
    if (isHL)   cls += ' ' + hlCls;
    svg += `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
    svg += `<text class="node-text" x="${x}" y="${y}">${i}</text>`;
    if (isRoot && ufRank[i] > 0) {
      svg += `<text class="uf-rank-lbl" x="${x + r + 4}" y="${y + 4}">r=${ufRank[i]}</text>`;
    }
  }
  svg += '</svg>';
  fc.innerHTML = svg;
}

function _renderUFArrays(ac, hlNodes) {
  const existing = [];
  for (let i = 0; i < UF_MAX; i++) if (ufExists[i]) existing.push(i);

  let html = '<div class="uf-array-view">';

  // Index header
  html += '<div class="uf-arr-label">index</div><div class="uf-arr-row">';
  for (const i of existing) html += `<div class="uf-cell uf-cell-hdr"><span>${i}</span></div>`;
  html += '</div>';

  // parent[]
  html += '<div class="uf-arr-label">parent[ ]</div><div class="uf-arr-row">';
  for (const i of existing) {
    const isRoot = ufParent[i] === i;
    const isHL   = hlNodes.has(i);
    let cls = 'uf-cell';
    if (isRoot) cls += ' uf-cell-root';
    if (isHL)   cls += ' uf-cell-hl';
    html += `<div class="${cls}"><span>${ufParent[i]}</span></div>`;
  }
  html += '</div>';

  // rank[]
  html += '<div class="uf-arr-label">rank[ ]</div><div class="uf-arr-row">';
  for (const i of existing) {
    const isRoot = ufParent[i] === i;
    html += `<div class="uf-cell${isRoot ? ' uf-cell-root' : ''}"><span>${ufRank[i]}</span></div>`;
  }
  html += '</div>';

  // Stats
  const roots = existing.filter(i => ufParent[i] === i);
  html += `<div class="impl-info-row"><span class="impl-stat">elements\u00a0${existing.length}</span><span class="impl-stat">sets\u00a0${roots.length}</span></div>`;
  html += '</div>';
  ac.innerHTML = html;
}

async function ufMakeSet() {
  if (ufAnimating) return;
  const x = parseInt($('ufInput').value, 10);
  if (isNaN(x) || x < 0 || x >= UF_MAX) {
    log('ufLog', 'make-set', `element must be 0\u2013${UF_MAX - 1}`); return;
  }
  if (ufExists[x]) {
    log('ufLog', 'make-set', `<span class="val">${x}</span> already exists`); return;
  }
  $('ufInput').value = '';
  ufExists[x] = true; ufParent[x] = x; ufRank[x] = 0;
  renderUF(new Set([x]), 'uf-new-node');
  await sleep(400);
  renderUF();
  log('ufLog', 'make-set', `created singleton set {<span class="val">${x}</span>}`);
}

async function ufFind() {
  if (ufAnimating) return;
  const x = parseInt($('ufInput').value, 10);
  if (isNaN(x) || x < 0 || x >= UF_MAX || !ufExists[x]) {
    log('ufLog', 'find', `element ${isNaN(x) ? '?' : x} does not exist`); return;
  }
  ufAnimating = true;

  const path = _ufFindPath(x);

  // Animate traversal up to root
  for (let i = 0; i < path.length; i++) {
    renderUF(new Set(path.slice(0, i + 1)), 'bubble-active');
    await sleep(400);
  }

  const root = path[path.length - 1];
  const useCompress = ufImpl === 'path' || ufImpl === 'both';

  if (useCompress && path.length > 2) {
    // Apply path compression
    for (let i = 0; i < path.length - 1; i++) ufParent[path[i]] = root;
    renderUF(new Set(path), 'uf-compressed');
    await sleep(700);
    log('ufLog', 'find', `find(<span class="val">${x}</span>) = <span class="val">${root}</span> \u00b7 compressed ${path.length - 1} node${path.length > 2 ? 's' : ''} \u2192 root`);
  } else {
    log('ufLog', 'find', `find(<span class="val">${x}</span>) = <span class="val">${root}</span> \u00b7 depth\u00a0${path.length - 1}`);
  }

  renderUF(new Set([root]), 'found');
  await sleep(500);
  renderUF();
  ufAnimating = false;
}

async function ufUnion() {
  if (ufAnimating) return;
  const x = parseInt($('ufXInput').value, 10);
  const y = parseInt($('ufYInput').value, 10);
  if (isNaN(x) || isNaN(y) || x < 0 || x >= UF_MAX || y < 0 || y >= UF_MAX) {
    log('ufLog', 'union', 'enter valid elements x and y (0\u2013' + (UF_MAX - 1) + ')'); return;
  }
  if (!ufExists[x] || !ufExists[y]) {
    log('ufLog', 'union', `both elements must exist \u2014 use Make-Set first`); return;
  }
  $('ufXInput').value = ''; $('ufYInput').value = '';
  ufAnimating = true;

  const useCompress = ufImpl === 'path' || ufImpl === 'both';
  const useRank     = ufImpl === 'rank' || ufImpl === 'both';

  // Highlight starting nodes
  renderUF(new Set([x, y]), 'bubble-active'); await sleep(400);

  // Find paths to roots (before any compression)
  const pathX = _ufFindPath(x);
  const pathY = _ufFindPath(y);

  // Animate traversal of both paths simultaneously
  for (let i = 0; i < Math.max(pathX.length, pathY.length); i++) {
    const vis = new Set();
    if (i < pathX.length) pathX.slice(0, i + 1).forEach(n => vis.add(n));
    if (i < pathY.length) pathY.slice(0, i + 1).forEach(n => vis.add(n));
    renderUF(vis, 'bubble-active'); await sleep(350);
  }

  const rootX = pathX[pathX.length - 1];
  const rootY = pathY[pathY.length - 1];

  // Apply path compression on both paths
  if (useCompress) {
    for (const n of pathX) ufParent[n] = rootX;
    for (const n of pathY) ufParent[n] = rootY;
  }

  if (rootX === rootY) {
    renderUF(new Set([rootX]), 'found'); await sleep(500);
    renderUF();
    log('ufLog', 'union', `<span class="val">${x}</span> and <span class="val">${y}</span> already in the same set (root\u00a0${rootX})`);
    ufAnimating = false; return;
  }

  // Highlight both roots
  renderUF(new Set([rootX, rootY]), 'bubble-active'); await sleep(500);

  // Link roots
  let newRoot, absorbed;
  if (useRank) {
    if (ufRank[rootX] < ufRank[rootY])      { ufParent[rootX] = rootY; newRoot = rootY; absorbed = rootX; }
    else if (ufRank[rootX] > ufRank[rootY]) { ufParent[rootY] = rootX; newRoot = rootX; absorbed = rootY; }
    else                                    { ufParent[rootY] = rootX; ufRank[rootX]++; newRoot = rootX; absorbed = rootY; }
  } else {
    ufParent[rootY] = rootX; newRoot = rootX; absorbed = rootY;
  }

  renderUF(new Set([newRoot]), 'found'); await sleep(600);
  renderUF();
  const rankNote = useRank ? ` \u00b7 rank-based (rank[${newRoot}]\u00a0=\u00a0${ufRank[newRoot]})` : '';
  log('ufLog', 'union', `merged sets of <span class="val">${x}</span> & <span class="val">${y}</span> \u00b7 root ${absorbed} \u2192 ${newRoot}${rankNote}`);
  ufAnimating = false;
}

function ufClear() {
  if (ufAnimating) return;
  ufParent = Array(UF_MAX).fill(-1);
  ufRank   = Array(UF_MAX).fill(0);
  ufExists = Array(UF_MAX).fill(false);
  renderUF();
  log('ufLog', 'clear', 'all sets cleared');
}

// ─── Init Union-Find ───
setUFImpl('naive');

// ═══════════════════════════════════════════════
//  GRAPH — DATA & METADATA
// ═══════════════════════════════════════════════
let graphNodes     = [];   // [{ id }]
let graphEdges     = [];   // [{ from, to }]
let graphDirected  = true;
let graphNextId    = 1;
let graphImpl      = 'adjacency-list';
let graphAnimating = false;

const GRAPH_MAX_NODES = 12;
const GRAPH_R         = 19; // node circle radius (px)

const graphImplMeta = {
  'adjacency-list': {
    label: 'Adjacency List',
    note: 'Each vertex stores a list of its neighbours. Space: O(V\u00a0+\u00a0E) — optimal for sparse graphs.',
    complexity: [['add node','O(1)'],['add edge','O(1)'],['BFS / DFS','O(V\u00a0+\u00a0E)'],['topo sort','O(V\u00a0+\u00a0E)'],['Dijkstra','O((V\u00a0+\u00a0E)\u00a0log\u00a0V)'],['Kruskal','O(E\u00a0log\u00a0E)'],['Prim','O((V\u00a0+\u00a0E)\u00a0log\u00a0V)']]
  },
  'adjacency-matrix': {
    label: 'Adjacency Matrix',
    note: 'An n\u00d7n boolean grid. O(1) edge lookup, but O(V\u00b2) space \u2014 costly for sparse graphs.',
    complexity: [['add node','O(V)'],['add edge','O(1)'],['edge lookup','O(1)'],['BFS / DFS','O(V\u00b2)'],['topo sort','O(V\u00b2)'],['Dijkstra','O(V\u00b2)'],['Kruskal','O(E\u00a0log\u00a0E)'],['Prim','O(V\u00b2)']]
  }
};

sidebarData.graph = {
  description: 'A graph G\u00a0=\u00a0(V,\u00a0E) pairs a set of vertices V with edges E. Directed graphs (digraphs) have one-way edges; undirected graphs are bidirectional. Graphs model dependency chains, road networks, social connections, and more.'
};

_sidebarPanels.graph = {
  getMeta: () => graphImplMeta[graphImpl]
};

// ═══════════════════════════════════════════════
//  GRAPH — IMPL SWITCHER
// ═══════════════════════════════════════════════
function setGraphImpl(type) {
  graphImpl = type;
  document.querySelectorAll('[data-graph-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.graphImpl === type);
  });
  $('graphImplNote').innerHTML = graphImplMeta[type].note;
  const algoNote = $('algoGImplNote'); if (algoNote) algoNote.innerHTML = graphImplMeta[type].note;
  if ($('panel-graph').classList.contains('active')) updateSidebar('graph');
  renderGraph();
}

function setGraphDirected(directed) {
  graphDirected = directed;
  document.querySelectorAll('[data-graph-dir]').forEach(b => {
    b.classList.toggle('active', (b.dataset.graphDir === 'directed') === directed);
  });
  renderGraph();
}

// ═══════════════════════════════════════════════
//  GRAPH — CORE ALGORITHMS
// ═══════════════════════════════════════════════
function _buildGraphAdj() {
  const adj = new Map();
  graphNodes.forEach(n => adj.set(n.id, []));
  graphEdges.forEach(({ from, to }) => {
    if (adj.has(from)) adj.get(from).push(to);
    if (!graphDirected && adj.has(to)) adj.get(to).push(from);
  });
  return adj;
}

function _graphBFSSteps(srcId) {
  const adj = _buildGraphAdj();
  const visited = new Set([srcId]);
  const queue   = [srcId];
  const steps   = [{ current: srcId, visited: new Set(visited) }];
  while (queue.length) {
    const curr = queue.shift();
    for (const nbr of (adj.get(curr) || [])) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push(nbr);
        steps.push({ current: nbr, visited: new Set(visited) });
      }
    }
  }
  return steps;
}

function _graphDFSSteps(srcId) {
  const adj     = _buildGraphAdj();
  const visited = new Set();
  const steps   = [];
  function dfs(v) {
    visited.add(v);
    steps.push({ current: v, visited: new Set(visited) });
    for (const nbr of (adj.get(v) || [])) {
      if (!visited.has(nbr)) dfs(nbr);
    }
  }
  dfs(srcId);
  return steps;
}

function _graphTopoSteps() {
  // Kahn's algorithm — directed graphs only
  const inDeg = new Map();
  graphNodes.forEach(n => inDeg.set(n.id, 0));
  graphEdges.forEach(e => inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1));

  const queue = [];
  inDeg.forEach((d, id) => { if (d === 0) queue.push(id); });
  queue.sort((a, b) => a - b);

  const order = [], steps = [];
  while (queue.length) {
    const curr = queue.shift();
    order.push(curr);
    steps.push({ current: curr, processed: new Set(order) });
    graphEdges.filter(e => e.from === curr).forEach(e => {
      const nd = inDeg.get(e.to) - 1;
      inDeg.set(e.to, nd);
      if (nd === 0) { queue.push(e.to); queue.sort((a, b) => a - b); }
    });
  }
  return { steps, order, hasCycle: order.length < graphNodes.length };
}

function _graphKruskalSteps() {
  // Kruskal's MST — operates on edges as undirected (ignores direction)
  const n = graphNodes.length;
  if (n === 0) return { steps: [], mstWeight: 0 };

  // Sort edges by weight (record original index for rendering)
  const edgeOrder = graphEdges
    .map((e, i) => ({ from: e.from, to: e.to, w: e.weight || 1, idx: i }))
    .sort((a, b) => a.w - b.w);

  // Union-Find with path compression + rank
  const parent = {}, rank = {};
  graphNodes.forEach(nd => { parent[nd.id] = nd.id; rank[nd.id] = 0; });
  function find(x) { return parent[x] === x ? x : (parent[x] = find(parent[x])); }
  function union(x, y) {
    const rx = find(x), ry = find(y);
    if (rx === ry) return false;
    if (rank[rx] < rank[ry])      parent[rx] = ry;
    else if (rank[rx] > rank[ry]) parent[ry] = rx;
    else { parent[ry] = rx; rank[rx]++; }
    return true;
  }

  const mstEdges = new Set();
  const steps = [];
  let mstWeight = 0;

  for (const e of edgeOrder) {
    // consider step: show this edge as the one being evaluated
    steps.push({ phase: 'consider', edgeIdx: e.idx, mstEdges: new Set(mstEdges), edgeOrder: edgeOrder.map(x => x.idx) });
    if (union(e.from, e.to)) {
      mstEdges.add(e.idx);
      mstWeight += e.w;
      steps.push({ phase: 'accept', edgeIdx: e.idx, mstEdges: new Set(mstEdges), edgeOrder: edgeOrder.map(x => x.idx) });
    } else {
      steps.push({ phase: 'reject', edgeIdx: e.idx, mstEdges: new Set(mstEdges), edgeOrder: edgeOrder.map(x => x.idx) });
    }
    if (mstEdges.size === n - 1) break;
  }
  return { steps, mstWeight, edgeOrder };
}

function _graphPrimSteps(srcId) {
  // Prim's MST — always treats graph as undirected
  const n = graphNodes.length;
  if (n === 0) return { steps: [], mstWeight: 0 };

  // Build undirected adjacency with weights and original edge index
  const adj = new Map();
  graphNodes.forEach(nd => adj.set(nd.id, []));
  graphEdges.forEach((e, idx) => {
    const w = e.weight || 1;
    adj.get(e.from)?.push({ to: e.to, w, edgeIdx: idx });
    adj.get(e.to)?.push({ to: e.from, w, edgeIdx: idx });
  });

  const inMST   = new Set([srcId]);
  const mstEdges = new Set();
  const steps    = [];
  let   mstWeight = 0;

  while (inMST.size < n) {
    let bestEntry = null, bestW = Infinity;
    for (const nodeId of inMST) {
      for (const entry of (adj.get(nodeId) || [])) {
        if (!inMST.has(entry.to) && entry.w < bestW) {
          bestW = entry.w;
          bestEntry = entry;
        }
      }
    }
    if (!bestEntry) break; // disconnected graph

    steps.push({ phase: 'consider', edgeIdx: bestEntry.edgeIdx, mstEdges: new Set(mstEdges), mstNodes: new Set(inMST) });
    inMST.add(bestEntry.to);
    mstEdges.add(bestEntry.edgeIdx);
    mstWeight += bestEntry.w;
    steps.push({ phase: 'accept', edgeIdx: bestEntry.edgeIdx, mstEdges: new Set(mstEdges), mstNodes: new Set(inMST) });
  }
  return { steps, mstWeight };
}

function _graphDijkstraSteps(srcId) {
  // Dijkstra's shortest path — respects graph direction
  const adj = new Map();
  graphNodes.forEach(n => adj.set(n.id, []));
  graphEdges.forEach((e, idx) => {
    const w = e.weight || 1;
    adj.get(e.from)?.push({ to: e.to, w, edgeIdx: idx });
    if (!graphDirected) adj.get(e.to)?.push({ to: e.from, w, edgeIdx: idx });
  });

  const dist  = new Map();
  const prev  = new Map();
  const visited = new Set();
  graphNodes.forEach(nd => { dist.set(nd.id, Infinity); prev.set(nd.id, null); });
  dist.set(srcId, 0);

  const steps = [];

  while (true) {
    // Pick unvisited node with smallest tentative distance (simple linear scan — correct for small N)
    let u = null, uDist = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < uDist) { uDist = d; u = id; }
    }
    if (u === null) break;

    visited.add(u);
    steps.push({ current: u, visited: new Set(visited), distances: new Map(dist), prev: new Map(prev), relaxEdgeIdx: null });

    for (const { to, w, edgeIdx } of (adj.get(u) || [])) {
      if (visited.has(to)) continue;
      const nd = dist.get(u) + w;
      if (nd < dist.get(to)) {
        dist.set(to, nd);
        prev.set(to, u);
        steps.push({ current: u, visited: new Set(visited), distances: new Map(dist), prev: new Map(prev), relaxEdgeIdx: edgeIdx });
      }
    }
  }
  return { steps, dist, prev };
}

// ═══════════════════════════════════════════════
//  GRAPH — LAYOUT
// ═══════════════════════════════════════════════
function _graphLayout(W, H) {
  const n = graphNodes.length;
  const pos = new Map();
  if (n === 0) return pos;
  const cx = W / 2, cy = H / 2;
  const r  = n === 1 ? 0 : Math.min(cx - GRAPH_R - 10, cy - GRAPH_R - 10) * 0.82;
  graphNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    pos.set(node.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });
  return pos;
}

// ═══════════════════════════════════════════════
//  GRAPH — RENDER
// ═══════════════════════════════════════════════
const GRAPH_EMPTY = `<div class="empty-state"><span class="ornament">\u00a7</span>Add a node to begin</div>`;

function _renderGraphInto(c, ac, hl, vis, ex) {
  if (graphNodes.length === 0) {
    c.innerHTML = GRAPH_EMPTY;
    if (ac) ac.innerHTML = GRAPH_EMPTY;
    return;
  }
  _renderGraphSVG(c, hl, vis, ex);
  if (!ac) return;
  if (ex.dijkstraDist) {
    _renderGraphDijkstraView(ac, hl, vis, ex);
  } else if (ex.mstEdges !== undefined) {
    _renderGraphMSTView(ac, ex);
  } else if (graphImpl === 'adjacency-list') {
    _renderGraphAdjList(ac, hl, vis);
  } else {
    _renderGraphAdjMatrix(ac, hl, vis);
  }
}

function renderGraph(hlSet, visitedSet, extra) {
  const c  = $('graphCanvas');
  if (!c) return;
  const ac = $('graphImplCanvas');
  const hl = hlSet  || new Set();
  const vis = visitedSet || new Set();
  const ex  = extra || {};
  _renderGraphInto(c, ac, hl, vis, ex);
  // Keep the algo-section copy in sync (same state, separate DOM target)
  const ac2 = $('algoGCanvas'), ac2impl = $('algoGImplCanvas');
  if (ac2) _renderGraphInto(ac2, ac2impl, hl, vis, ex);
}

function _renderGraphSVG(c, hlSet, visitedSet, extra) {
  const W = 540, H = 320;
  const pos = _graphLayout(W, H);
  const r   = GRAPH_R;
  const ex  = extra || {};
  const mstEdges       = ex.mstEdges       || new Set();
  const considerEdgeIdx = ex.considerEdgeIdx !== undefined ? ex.considerEdgeIdx : null;
  const rejectEdgeIdx   = ex.rejectEdgeIdx   !== undefined ? ex.rejectEdgeIdx   : null;
  const relaxEdgeIdx    = ex.relaxEdgeIdx    !== undefined ? ex.relaxEdgeIdx    : null;
  const mstNodes        = ex.mstNodes        || new Set();

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;overflow:visible">`;

  // Arrowhead markers
  svg += `<defs>`;
  if (graphDirected) {
    svg += `<marker id="garrow" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">` +
           `<path d="M0,0 L10,4 L0,8 z" fill="var(--ink)" opacity="0.72"/></marker>`;
    svg += `<marker id="garrow-mst" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">` +
           `<path d="M0,0 L10,4 L0,8 z" fill="var(--success)"/></marker>`;
    svg += `<marker id="garrow-consider" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">` +
           `<path d="M0,0 L10,4 L0,8 z" fill="var(--accent)"/></marker>`;
    svg += `<marker id="garrow-relax" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">` +
           `<path d="M0,0 L10,4 L0,8 z" fill="#7b4fa0"/></marker>`;
  }
  svg += `</defs>`;

  // Edges
  for (let ei = 0; ei < graphEdges.length; ei++) {
    const { from, to, weight } = graphEdges[ei];
    if (from === to) continue;
    const p1 = pos.get(from), p2 = pos.get(to);
    if (!p1 || !p2) continue;

    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) continue;
    const ux = dx / len, uy = dy / len;

    const hasReverse = graphDirected && graphEdges.some(e => e.from === to && e.to === from);
    const offPx = hasReverse ? -uy * 5 : 0;
    const offPy = hasReverse ?  ux * 5 : 0;

    const x1 = p1.x + ux * r       + offPx;
    const y1 = p1.y + uy * r       + offPy;
    const x2 = p2.x - ux * (r + (graphDirected ? 10 : 0)) + offPx;
    const y2 = p2.y - uy * (r + (graphDirected ? 10 : 0)) + offPy;

    // Determine edge class based on current algorithm state
    let edgeCls  = 'edge-line';
    let markerSuffix = '';
    if (ei === rejectEdgeIdx) {
      edgeCls += ' graph-edge-reject';
    } else if (ei === considerEdgeIdx) {
      edgeCls += ' graph-edge-consider';
      markerSuffix = '-consider';
    } else if (ei === relaxEdgeIdx) {
      edgeCls += ' graph-edge-relax';
      markerSuffix = '-relax';
    } else if (mstEdges.has(ei)) {
      edgeCls += ' graph-edge-mst';
      markerSuffix = '-mst';
    } else if (visitedSet.has(from) && visitedSet.has(to)) {
      edgeCls += ' graph-edge-visited';
    }

    const markerAttr = graphDirected ? ` marker-end="url(#garrow${markerSuffix})"` : '';
    svg += `<line class="${edgeCls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"${markerAttr}/>`;

    // Edge weight label — midpoint, slightly offset perpendicular
    const mx = (x1 + x2) / 2 - uy * 10;
    const my = (y1 + y2) / 2 + ux * 10;
    if (weight !== undefined) {
      svg += `<text class="graph-weight-label" x="${mx.toFixed(1)}" y="${my.toFixed(1)}" text-anchor="middle" dominant-baseline="central">${weight}</text>`;
    }
  }

  // Nodes
  for (const node of graphNodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    const isCurrent = hlSet.has(node.id);
    const isVisited = visitedSet.has(node.id);
    const isMSTNode = mstNodes.has(node.id);
    let cls = 'node-circle';
    if (isCurrent)      cls += ' highlight';
    else if (isMSTNode) cls += ' mst-node';
    else if (isVisited) cls += ' visited';
    svg += `<circle class="${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}"/>`;
    svg += `<text class="node-text" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}">${node.id}</text>`;
  }

  svg += '</svg>';
  c.innerHTML = svg;
}

function _renderGraphAdjList(c, hlSet, visitedSet) {
  const adj = _buildGraphAdj();
  let h = `<div class="graph-adj-view"><div class="impl-section-label">Adjacency List \u2014 ${graphDirected ? 'directed' : 'undirected'}</div>`;
  for (const node of graphNodes) {
    const nbrs    = adj.get(node.id) || [];
    const isCurr  = hlSet.has(node.id);
    const isVis   = visitedSet.has(node.id);
    const rowCls  = 'graph-adj-row' + (isCurr ? ' graph-adj-current' : isVis ? ' graph-adj-visited' : '');
    const nbrHtml = nbrs.length
      ? nbrs.map(n => `<span class="graph-adj-nbr">${n}</span>`).join('<span class="graph-adj-arrow"> \u2192 </span>')
      : `<span class="graph-adj-empty">\u2205</span>`;
    h += `<div class="${rowCls}"><span class="graph-adj-node">${node.id}</span>` +
         `<span class="graph-adj-arrow"> \u2192 </span>${nbrHtml}</div>`;
  }
  h += `<div class="impl-info-row"><span class="impl-stat">V\u00a0=\u00a0${graphNodes.length}</span>` +
       `<span class="impl-stat">E\u00a0=\u00a0${graphEdges.length}</span></div></div>`;
  c.innerHTML = h;
}

function _renderGraphAdjMatrix(c, hlSet, visitedSet) {
  const ids     = graphNodes.map(n => n.id);
  const n       = ids.length;
  const idx     = new Map(ids.map((id, i) => [id, i]));
  const mat     = Array.from({ length: n }, () => Array(n).fill(0));
  for (const { from, to } of graphEdges) {
    const ri = idx.get(from), ci = idx.get(to);
    if (ri !== undefined && ci !== undefined) {
      mat[ri][ci] = 1;
      if (!graphDirected) mat[ci][ri] = 1;
    }
  }

  let h = `<div class="graph-adj-view"><div class="impl-section-label">Adjacency Matrix \u2014 ${graphDirected ? 'directed' : 'undirected'}</div>`;
  h += '<table class="graph-matrix-table"><thead><tr><th></th>';
  ids.forEach(id => {
    const cls = hlSet.has(id) ? ' class="gmat-hl"' : visitedSet.has(id) ? ' class="gmat-vis"' : '';
    h += `<th${cls}>${id}</th>`;
  });
  h += '</tr></thead><tbody>';
  for (let i = 0; i < n; i++) {
    const rid = ids[i];
    const rCls = hlSet.has(rid) ? ' class="gmat-hl"' : visitedSet.has(rid) ? ' class="gmat-vis"' : '';
    h += `<tr><th${rCls}>${rid}</th>`;
    for (let j = 0; j < n; j++) {
      h += `<td class="${mat[i][j] ? 'gmat-one' : 'gmat-zero'}">${mat[i][j]}</td>`;
    }
    h += '</tr>';
  }
  h += `</tbody></table>`;
  h += `<div class="impl-info-row"><span class="impl-stat">V\u00a0=\u00a0${n}</span>` +
       `<span class="impl-stat">E\u00a0=\u00a0${graphEdges.length}</span></div></div>`;
  c.innerHTML = h;
}

function _renderGraphMSTView(c, ex) {
  // Shows edges sorted by weight (Kruskal view) or current cut info (generic)
  const edgeOrder = ex.edgeOrder || graphEdges.map((_, i) => i);
  const mstEdges  = ex.mstEdges  || new Set();
  const cIdx      = ex.considerEdgeIdx !== undefined ? ex.considerEdgeIdx : null;
  const rIdx      = ex.rejectEdgeIdx   !== undefined ? ex.rejectEdgeIdx   : null;
  const algo      = ex.mstAlgo || 'kruskal';

  let h = `<div class="graph-mst-view">`;
  h += `<div class="impl-section-label">${algo === 'prim' ? "Prim\u2019s" : "Kruskal\u2019s"} \u2014 edges by weight</div>`;

  for (const idx of edgeOrder) {
    const e = graphEdges[idx];
    if (!e) continue;
    let cls = 'graph-mst-row';
    if (idx === rIdx)          cls += ' mst-rejected';
    else if (idx === cIdx)     cls += ' mst-consider';
    else if (mstEdges.has(idx)) cls += ' mst-accepted';
    const arrow = '\u00a0\u2014\u00a0';
    h += `<div class="${cls}">` +
         `<span class="graph-adj-node">${e.from}</span>${arrow}<span class="graph-adj-node">${e.to}</span>` +
         `<span class="graph-mst-weight">wt\u00a0${e.weight || 1}</span></div>`;
  }

  const mstW = [...mstEdges].reduce((s, i) => s + (graphEdges[i]?.weight || 1), 0);
  if (mstEdges.size > 0) {
    h += `<div class="impl-info-row" style="margin-top:0.4rem"><span class="impl-stat">MST\u00a0weight\u00a0=\u00a0${mstW}</span></div>`;
  }
  h += `</div>`;
  c.innerHTML = h;
}

function _renderGraphDijkstraView(c, hlSet, visitedSet, ex) {
  const dist   = ex.dijkstraDist || new Map();
  const prev   = ex.dijkstraPrev || new Map();
  const relaxIdx = ex.relaxEdgeIdx !== undefined ? ex.relaxEdgeIdx : null;
  // Find which node is being relaxed to (destination of relax edge)
  let relaxTo = null;
  if (relaxIdx !== null && graphEdges[relaxIdx]) relaxTo = graphEdges[relaxIdx].to;

  let h = `<div class="graph-dist-view">`;
  h += `<div class="impl-section-label">Dijkstra \u2014 distance table</div>`;
  h += `<table class="graph-dist-table"><thead><tr><th>node</th><th>dist</th><th>via</th></tr></thead><tbody>`;
  for (const nd of graphNodes) {
    const d  = dist.get(nd.id);
    const p  = prev.get(nd.id);
    const isCurr  = hlSet.has(nd.id);
    const isVisit = visitedSet.has(nd.id);
    const isRelax = nd.id === relaxTo;
    let rowCls = '';
    if (isCurr)       rowCls = 'dist-current';
    else if (isRelax) rowCls = 'dist-relax';
    else if (isVisit) rowCls = 'dist-visited';
    const dStr = d === undefined || d === Infinity ? '\u221e' : d;
    const pStr = p !== null && p !== undefined ? p : '\u2014';
    h += `<tr class="${rowCls}"><td>${nd.id}</td><td>${dStr}</td><td>${pStr}</td></tr>`;
  }
  h += `</tbody></table></div>`;
  c.innerHTML = h;
}

// ═══════════════════════════════════════════════
//  GRAPH — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function _animateGraphSteps(steps) {
  for (const { current, visited, processed } of steps) {
    const vis = visited || processed || new Set();
    renderGraph(new Set([current]), vis);
    await sleep(480);
  }
}

// ═══════════════════════════════════════════════
//  GRAPH — OPERATIONS
// ═══════════════════════════════════════════════
function graphAddNode() {
  if (graphAnimating) return;
  if (graphNodes.length >= GRAPH_MAX_NODES) {
    log('graphLog', 'add-node', `max ${GRAPH_MAX_NODES} nodes reached`); return;
  }
  const id = graphNextId++;
  graphNodes.push({ id });
  renderGraph();
  log('graphLog', 'add-node', `node <span class="val">${id}</span> added`);
}

function graphAddEdge() {
  if (graphAnimating) return;
  const from   = parseInt($('graphFromInput').value, 10);
  const to     = parseInt($('graphToInput').value, 10);
  const wRaw   = parseInt($('graphWeightInput').value, 10);
  const weight = isNaN(wRaw) || wRaw < 1 ? 1 : wRaw;
  $('graphFromInput').value = ''; $('graphToInput').value = ''; $('graphWeightInput').value = '';
  if (isNaN(from) || isNaN(to)) { log('graphLog', 'add-edge', 'enter valid From and To node IDs'); return; }
  if (!graphNodes.find(n => n.id === from)) { log('graphLog', 'add-edge', `node <span class="val">${from}</span> does not exist`); return; }
  if (!graphNodes.find(n => n.id === to))   { log('graphLog', 'add-edge', `node <span class="val">${to}</span> does not exist`); return; }
  if (graphEdges.find(e => e.from === from && e.to === to)) {
    log('graphLog', 'add-edge', `edge <span class="val">${from}\u00a0\u2192\u00a0${to}</span> already exists`); return;
  }
  graphEdges.push({ from, to, weight });
  renderGraph();
  const arrow = graphDirected ? '\u00a0\u2192\u00a0' : '\u00a0\u2014\u00a0';
  log('graphLog', 'add-edge', `edge <span class="val">${from}${arrow}${to}</span> (wt\u00a0${weight}) added`);
}

async function graphBFS() {
  if (graphAnimating) return;
  const src = parseInt($('graphSrcInput').value, 10);
  if (isNaN(src) || !graphNodes.find(n => n.id === src)) {
    log('graphLog', 'BFS', 'enter a valid source node ID'); return;
  }
  graphAnimating = true;
  const steps = _graphBFSSteps(src);
  await _animateGraphSteps(steps);
  const order = steps.map(s => s.current);
  renderGraph(new Set(), steps[steps.length - 1].visited);
  await sleep(300);
  renderGraph();
  log('graphLog', 'BFS', `from <span class="val">${src}</span>\u00a0\u2192\u00a0` +
    order.map(id => `<span class="val">${id}</span>`).join(' \u2192 '));
  graphAnimating = false;
}

async function graphDFS() {
  if (graphAnimating) return;
  const src = parseInt($('graphSrcInput').value, 10);
  if (isNaN(src) || !graphNodes.find(n => n.id === src)) {
    log('graphLog', 'DFS', 'enter a valid source node ID'); return;
  }
  graphAnimating = true;
  const steps = _graphDFSSteps(src);
  await _animateGraphSteps(steps);
  const order = steps.map(s => s.current);
  renderGraph(new Set(), steps[steps.length - 1].visited);
  await sleep(300);
  renderGraph();
  log('graphLog', 'DFS', `from <span class="val">${src}</span>\u00a0\u2192\u00a0` +
    order.map(id => `<span class="val">${id}</span>`).join(' \u2192 '));
  graphAnimating = false;
}

async function graphTopoSort() {
  if (graphAnimating) return;
  if (!graphDirected) { log('graphLog', 'topo-sort', 'topological sort requires a directed graph'); return; }
  if (graphNodes.length === 0) { log('graphLog', 'topo-sort', 'graph is empty'); return; }
  graphAnimating = true;

  const { steps, order, hasCycle } = _graphTopoSteps();

  for (const { current, processed } of steps) {
    renderGraph(new Set([current]), processed);
    await sleep(500);
  }
  renderGraph(new Set(), order.length ? new Set(order) : new Set());
  await sleep(350);
  renderGraph();

  if (hasCycle) {
    log('graphLog', 'topo-sort', 'cycle detected \u2014 topological order does not exist');
  } else {
    log('graphLog', 'topo-sort',
      'order:\u00a0' + order.map(id => `<span class="val">${id}</span>`).join(' \u2192 '));
  }
  graphAnimating = false;
}

async function _animateGraphMST(steps, algo) {
  for (const step of steps) {
    const ex = {
      mstEdges: step.mstEdges,
      mstNodes: step.mstNodes || new Set(),
      mstAlgo: algo,
      edgeOrder: step.edgeOrder || []
    };
    // 'consider' → orange dashed  |  'accept' → green (via mstEdges)  |  'reject' → red briefly
    if (step.phase === 'consider') {
      ex.considerEdgeIdx = step.edgeIdx;
    } else if (step.phase === 'reject') {
      ex.rejectEdgeIdx = step.edgeIdx;
    }
    // 'accept' phase: edge already in step.mstEdges — no extra state needed
    renderGraph(new Set(), new Set(), ex);
    await sleep(step.phase === 'consider' ? 460 : 300);
  }
}

async function _animateGraphDijkstra(steps) {
  for (const step of steps) {
    const ex = {
      dijkstraDist: step.distances,
      dijkstraPrev: step.prev,
      relaxEdgeIdx: step.relaxEdgeIdx
    };
    renderGraph(new Set([step.current]), step.visited, ex);
    await sleep(step.relaxEdgeIdx !== null ? 380 : 480);
  }
}

async function graphKruskal() {
  if (graphAnimating) return;
  if (graphNodes.length === 0) { log('graphLog', 'kruskal', 'graph is empty'); return; }
  if (graphEdges.length === 0) { log('graphLog', 'kruskal', 'no edges to build MST from'); return; }
  graphAnimating = true;

  const { steps, mstWeight, edgeOrder } = _graphKruskalSteps();
  await _animateGraphMST(steps.map(s => ({ ...s, edgeOrder: edgeOrder.map(e => e.idx) })), 'kruskal');

  // Final: show MST edges only
  const finalMST = steps.length ? steps[steps.length - 1].mstEdges : new Set();
  renderGraph(new Set(), new Set(), { mstEdges: finalMST, mstAlgo: 'kruskal', edgeOrder: edgeOrder.map(e => e.idx) });
  await sleep(400);
  renderGraph();

  const mstSize = finalMST.size;
  if (mstSize < graphNodes.length - 1) {
    log('graphLog', 'kruskal', `MST incomplete \u2014 graph may be disconnected (${mstSize} of ${graphNodes.length - 1} edges)`);
  } else {
    log('graphLog', 'kruskal', `MST found \u2014 ${mstSize} edges, total weight\u00a0${mstWeight}`);
  }
  graphAnimating = false;
}

async function graphPrim() {
  if (graphAnimating) return;
  if (graphNodes.length === 0) { log('graphLog', 'prim', 'graph is empty'); return; }
  if (graphEdges.length === 0) { log('graphLog', 'prim', 'no edges to build MST from'); return; }
  const src = graphNodes[0].id; // start from first node
  graphAnimating = true;

  const { steps, mstWeight } = _graphPrimSteps(src);

  // Build edge order for impl view (sort by weight for display)
  const edgeOrder = graphEdges.map((_, i) => i).sort((a, b) => (graphEdges[a].weight||1) - (graphEdges[b].weight||1));
  await _animateGraphMST(steps.map(s => ({ ...s, edgeOrder })), 'prim');

  const finalMST   = steps.length ? steps[steps.length - 1].mstEdges  : new Set();
  const finalNodes = steps.length ? steps[steps.length - 1].mstNodes  : new Set([src]);
  renderGraph(new Set(), new Set(), { mstEdges: finalMST, mstNodes: finalNodes, mstAlgo: 'prim', edgeOrder });
  await sleep(400);
  renderGraph();

  const mstSize = finalMST.size;
  if (mstSize < graphNodes.length - 1) {
    log('graphLog', 'prim', `MST incomplete \u2014 graph may be disconnected (${mstSize} of ${graphNodes.length - 1} edges)`);
  } else {
    log('graphLog', 'prim', `MST found (from node\u00a0${src}) \u2014 ${mstSize} edges, total weight\u00a0${mstWeight}`);
  }
  graphAnimating = false;
}

async function graphDijkstra() {
  if (graphAnimating) return;
  const src = parseInt($('graphSrcInput').value, 10);
  if (isNaN(src) || !graphNodes.find(n => n.id === src)) {
    log('graphLog', 'dijkstra', 'enter a valid source node ID'); return;
  }
  graphAnimating = true;

  const { steps, dist, prev } = _graphDijkstraSteps(src);
  await _animateGraphDijkstra(steps);

  // Final settled state
  const allVisited = new Set(graphNodes.map(n => n.id).filter(id => dist.get(id) !== Infinity));
  renderGraph(new Set(), allVisited, { dijkstraDist: dist, dijkstraPrev: prev });
  await sleep(400);
  renderGraph();

  const reachable = [...dist.entries()].filter(([, d]) => d !== Infinity);
  const summary   = reachable.map(([id, d]) => `${id}:${d}`).join(', ');
  log('graphLog', 'dijkstra', `from <span class="val">${src}</span>\u00a0\u2014\u00a0distances\u00a0{${summary}}`);
  graphAnimating = false;
}

function graphClear() {
  if (graphAnimating) return;
  graphNodes = []; graphEdges = []; graphNextId = 1;
  renderGraph();
  log('graphLog', 'clear', 'graph cleared');
}

// ─── Init Graph ───
setGraphImpl('adjacency-list');

// ═══════════════════════════════════════════════
//  GRAPH ALGO PANEL — WRAPPERS
//  Thin shims that read from the algo-section
//  inputs and delegate to the shared graph fns.
// ═══════════════════════════════════════════════
function algoGraphAddEdge() {
  // Temporarily swap input IDs so graphAddEdge reads from the algo panel
  const fEl = $('graphFromInput');
  const tEl = $('graphToInput');
  const wEl = $('graphWeightInput');
  fEl.value = $('algoGFromInput').value;
  tEl.value = $('algoGToInput').value;
  wEl.value = $('algoGWeightInput').value;
  graphAddEdge();
  // Restore (graphAddEdge clears the inputs it owns; clear the algo ones too)
  $('algoGFromInput').value = '';
  $('algoGToInput').value   = '';
  $('algoGWeightInput').value = '';
}

function graphBFS_algo() {
  const src = $('algoGSrcInput').value;
  $('graphSrcInput').value = src;
  graphBFS().then(() => { $('algoGSrcInput').value = ''; });
}

function graphDFS_algo() {
  const src = $('algoGSrcInput').value;
  $('graphSrcInput').value = src;
  graphDFS().then(() => { $('algoGSrcInput').value = ''; });
}

function graphTopoSort_algo() { graphTopoSort(); }
function graphKruskal_algo()  { graphKruskal(); }
function graphPrim_algo()     { graphPrim(); }

function graphDijkstra_algo() {
  const src = $('algoGSrcInput').value;
  $('graphSrcInput').value = src;
  graphDijkstra().then(() => { $('algoGSrcInput').value = ''; });
}

// ═══════════════════════════════════════════════
//  ALGORITHMS — NAVIGATION
// ═══════════════════════════════════════════════

document.getElementById('algoNavStrip').addEventListener('click', e => {
  const btn = e.target.closest('[data-algo]');
  if (!btn) return;
  document.querySelectorAll('[data-algo]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const key = btn.dataset.algo;
  document.querySelectorAll('#section-algorithms .panel').forEach(p => p.classList.remove('active'));
  document.getElementById('algo-panel-' + key).classList.add('active');
  _updateAlgoSidebar(key);
  if (key === 'graph-algos') renderGraph(); // sync algo canvas on first visit
});

// ═══════════════════════════════════════════════
//  ALGORITHMS — SIDEBAR
// ═══════════════════════════════════════════════

const _algoSidebarInfo = {
  'selection-sort': {
    desc: 'Finds the minimum from the unsorted portion and swaps it to the front — repeated n−1 times. Simple but always Θ(n²) comparisons.',
    rows: [['comparisons','Θ(n²)'],['swaps','O(n)'],['space','O(1)'],['stable','No']],
    note: 'Minimum number of swaps among O(n²) sorts. Best and worst cases are identical — n(n−1)/2 comparisons always.'
  },
  'insertion-sort': {
    desc: 'Grows a sorted prefix one element at a time by inserting each new element into its correct position via shifting.',
    rows: [['best','O(n)'],['average','O(n²)'],['worst','O(n²)'],['space','O(1)'],['stable','Yes']],
    note: 'Best case O(n) on nearly-sorted input. Preferred over selection sort when the array is partially ordered.'
  },
  'merge-sort': {
    desc: 'Recursively splits the array in half, sorts each half, then merges them. Guaranteed O(n log n) in all cases.',
    rows: [['all cases','O(n log n)'],['space','O(n)'],['stable','Yes']],
    note: 'Requires O(n) auxiliary space for the merge buffer. Excellent for linked lists and external sorting.'
  },
  'tree-traversals': {
    desc: 'Four ways to visit every node in a BST. The visit order depends on the traversal type used.',
    rows: [['all traversals','O(n)'],['recursive space','O(h)'],['level-order space','O(w)']],
    note: 'In-order on a BST always yields a sorted sequence. h = tree height, w = max width of any level.'
  },
  'graph-algos': {
    desc: 'Graph algorithms operate on G\u00a0=\u00a0(V,\u00a0E). BFS and DFS explore reachability; topological sort orders a DAG; Kruskal\u2019s and Prim\u2019s build a minimum spanning tree on undirected weighted graphs; Dijkstra\u2019s finds shortest paths from a source.',
    rows: [['BFS / DFS','O(V\u00a0+\u00a0E)'],['Topo sort','O(V\u00a0+\u00a0E)'],['Dijkstra (list)','O((V\u00a0+\u00a0E)\u00a0log\u00a0V)'],['Kruskal','O(E\u00a0log\u00a0E)'],['Prim (list)','O((V\u00a0+\u00a0E)\u00a0log\u00a0V)']],
    note: 'Build a graph with \u201cAdd Node\u201d and \u201cAdd Edge\u201d, then run any algorithm. Edge weights are used by Kruskal\u2019s, Prim\u2019s, and Dijkstra\u2019s; BFS/DFS/Topo ignore them.'
  }
};

function _updateAlgoSidebar(key) {
  const d = _algoSidebarInfo[key];
  if (!d) return;
  let html = `<div class="sidebar-section"><h3>About</h3><p>${d.desc}</p></div>`;
  html += `<div class="sidebar-section"><h3>Complexity</h3><table class="complexity-table">`;
  d.rows.forEach(([op, c]) => { html += `<tr><td>${op}</td><td>${c}</td></tr>`; });
  html += '</table></div>';
  if (d.note) html += `<div class="sidebar-section"><h3>Note</h3><p>${d.note}</p></div>`;
  document.getElementById('algoSidebar').innerHTML = html;
}

_updateAlgoSidebar('selection-sort');

// ═══════════════════════════════════════════════
//  ALGORITHMS — SORT STATE & PSEUDOCODE
// ═══════════════════════════════════════════════

const _sortStates = {
  sel: { frames: [], idx: 0, running: false },
  ins: { frames: [], idx: 0, running: false },
  mrg: { frames: [], idx: 0, running: false }
};

const _sortPseudo = {
  sel: [
    'for i \u2190 0 to n\u22122:',
    '    minIdx \u2190 i',
    '    for j \u2190 i+1 to n\u22121:',
    '        if arr[j] < arr[minIdx]:',
    '            minIdx \u2190 j',
    '    swap(arr[i], arr[minIdx])'
  ],
  ins: [
    'for i \u2190 1 to n\u22121:',
    '    key \u2190 arr[i]',
    '    j \u2190 i \u2212 1',
    '    while j \u2265 0 and arr[j] > key:',
    '        arr[j+1] \u2190 arr[j]',
    '        j \u2190 j \u2212 1',
    '    arr[j+1] \u2190 key'
  ],
  mrg: [
    'mergeSort(l, r):',
    '    if l \u2265 r: return',
    '    m \u2190 \u230a(l+r)/2\u230b',
    '    mergeSort(l, m)',
    '    mergeSort(m+1, r)',
    '    merge(l, m, r)',
    '',
    'merge(l, m, r):',
    '    L \u2190 arr[l..m],  R \u2190 arr[m+1..r]',
    '    place smaller of L[i], R[j] \u2192 arr[k++]',
    '    copy remaining elements'
  ]
};

// ═══════════════════════════════════════════════
//  ALGORITHMS — FRAME GENERATORS
// ═══════════════════════════════════════════════

function _selFrames(arr) {
  const a = [...arr], n = a.length;
  const frames = [], sorted = new Set();
  const push = ex => frames.push({
    a: [...a], sorted: new Set(sorted),
    compare: [], swap: [], minIdx: null,
    label: '', pLine: -1, done: false, ...ex
  });

  push({ label: 'Initial array', pLine: 0 });
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    push({ compare: [i], minIdx: i, label: `i=${i}: search for min in arr[${i}..${n-1}]`, pLine: 1 });
    for (let j = i + 1; j < n; j++) {
      push({ compare: [j], minIdx, label: `Compare arr[${j}]=${a[j]} with min arr[${minIdx}]=${a[minIdx]}`, pLine: 3 });
      if (a[j] < a[minIdx]) {
        minIdx = j;
        push({ compare: [minIdx], minIdx, label: `New min: arr[${minIdx}]=${a[minIdx]}`, pLine: 4 });
      }
    }
    if (minIdx !== i) {
      push({ swap: [i, minIdx], label: `Swap arr[${i}]=${a[i]} \u2194 arr[${minIdx}]=${a[minIdx]}`, pLine: 5 });
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      push({ swap: [i, minIdx], label: 'Swapped', pLine: 5 });
    } else {
      push({ compare: [i], minIdx: i, label: `arr[${i}]=${a[i]} is already minimum \u2014 no swap`, pLine: 5 });
    }
    sorted.add(i);
    push({ label: `arr[${i}]=${a[i]} is in its final position`, pLine: 0 });
  }
  sorted.add(n - 1);
  push({ label: 'Array sorted!', done: true });
  return frames;
}

function _insFrames(arr) {
  const a = [...arr], n = a.length;
  const frames = [], sorted = new Set([0]);
  const push = ex => frames.push({
    a: [...a], sorted: new Set(sorted),
    compare: [], shift: [], insertAt: null,
    label: '', pLine: -1, done: false, ...ex
  });

  push({ label: 'arr[0] is trivially sorted (single element)', pLine: 0 });
  for (let i = 1; i < n; i++) {
    const key = a[i];
    push({ compare: [i], label: `key \u2190 arr[${i}] = ${key}`, pLine: 1 });
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      push({ compare: [j], label: `arr[${j}]=${a[j]} > key=${key}: shift right`, pLine: 3 });
      a[j + 1] = a[j];
      push({ shift: [j + 1], label: `arr[${j+1}] \u2190 arr[${j}] (shifted)`, pLine: 4 });
      j--;
    }
    a[j + 1] = key;
    sorted.add(i);
    push({ insertAt: j + 1, label: `key=${key} placed at arr[${j+1}]`, pLine: 6 });
  }
  push({ label: 'Array sorted!', done: true });
  return frames;
}

function _mrgFrames(originalArr) {
  const a = [...originalArr], n = a.length;
  const frames = [];
  const push = ex => frames.push({
    a: [...a], mergeZone: null,
    leftZone: null, rightZone: null, placing: null,
    label: '', pLine: -1, done: false, ...ex
  });

  push({ label: 'Initial array \u2014 begin merge sort', pLine: 0 });

  function ms(l, r) {
    if (l >= r) return;
    const m = Math.floor((l + r) / 2);
    push({ mergeZone: [l, r], label: `Split arr[${l}..${r}] at mid=${m}`, pLine: 2 });
    ms(l, m);
    ms(m + 1, r);

    push({ mergeZone: [l, r], leftZone: [l, m], rightZone: [m+1, r],
           label: `Merge arr[${l}..${m}] and arr[${m+1}..${r}]`, pLine: 7 });

    const L = a.slice(l, m + 1), R = a.slice(m + 1, r + 1);
    let li = 0, ri = 0, k = l;

    while (li < L.length && ri < R.length) {
      if (L[li] <= R[ri]) {
        a[k] = L[li++];
        push({ mergeZone: [l, r], placing: k,
               label: `L[${li-1}]=${a[k]} \u2264 R[${ri}]=${R[ri]}: place ${a[k]} at arr[${k}]`, pLine: 9 });
      } else {
        a[k] = R[ri++];
        push({ mergeZone: [l, r], placing: k,
               label: `R[${ri-1}]=${a[k]} < L[${li}]=${L[li]}: place ${a[k]} at arr[${k}]`, pLine: 9 });
      }
      k++;
    }
    while (li < L.length) {
      a[k] = L[li++];
      push({ mergeZone: [l, r], placing: k, label: `Copy remaining left: arr[${k}]=${a[k]}`, pLine: 10 });
      k++;
    }
    while (ri < R.length) {
      a[k] = R[ri++];
      push({ mergeZone: [l, r], placing: k, label: `Copy remaining right: arr[${k}]=${a[k]}`, pLine: 10 });
      k++;
    }
    push({ mergeZone: [l, r], label: `arr[${l}..${r}] merged and sorted`, pLine: 7 });
  }

  ms(0, n - 1);
  push({ label: 'Array sorted!', done: true });
  return frames;
}

// ═══════════════════════════════════════════════
//  ALGORITHMS — SORT RENDERER
// ═══════════════════════════════════════════════

function _renderSortFrame(key, frame) {
  if (!frame) return;
  const canvas = document.getElementById(`sortCanvas-${key}`);
  const pseudoEl = document.getElementById(`sortPseudo-${key}`);
  const infoEl = document.getElementById(`sortInfo-${key}`);
  if (!canvas) return;

  const { a, sorted, compare, swap, shift, insertAt, placing,
          mergeZone, leftZone, rightZone, label, pLine, done } = frame;
  const n = a.length;
  const maxVal = Math.max(...a, 1);

  // Bar chart
  let barsHtml = '<div class="sort-bars-wrap"><div class="sort-bars-area">';
  let idxHtml = '</div><div class="sort-idx-area">';

  for (let i = 0; i < n; i++) {
    const hpct = Math.round((a[i] / maxVal) * 80) + 12;
    let cls = '';

    if (done) {
      cls = 'sorted';
    } else {
      if (sorted && sorted.has(i)) cls = 'sorted';

      // Merge sort zones (applied before specific overlays)
      if (mergeZone && i >= mergeZone[0] && i <= mergeZone[1]) {
        if (!cls) cls = 'merge-zone';
        if (leftZone && i >= leftZone[0] && i <= leftZone[1]) cls = 'merge-left';
        if (rightZone && i >= rightZone[0] && i <= rightZone[1]) cls = 'merge-right';
        if (placing === i) cls = 'placing';
      }

      // Selection / insertion sort overlays (highest priority)
      if (compare && compare.includes(i)) cls = 'compare';
      if (swap && swap.includes(i)) cls = 'swap';
      if (shift && shift.includes(i)) cls = 'swap';
      if (insertAt === i) cls = 'placing';

      // Selection sort: mark confirmed minimum distinctly when not also in compare
      if (frame.minIdx !== null && frame.minIdx !== undefined &&
          i === frame.minIdx && !(compare && compare.includes(i))) {
        cls = 'min-idx';
      }
    }

    barsHtml += `<div class="sort-bar ${cls}" style="height:${hpct}%"><span class="sort-bar-val">${a[i]}</span></div>`;
    idxHtml += `<div class="sort-bar-idx">${i}</div>`;
  }

  canvas.innerHTML = barsHtml + idxHtml + '</div>';

  // Pseudocode
  _renderPseudoPane(key, pLine);

  if (infoEl) infoEl.textContent = label;
}

// ═══════════════════════════════════════════════
//  ALGORITHMS — SORT CONTROLS
// ═══════════════════════════════════════════════

function sortGenerate(key) {
  const st = _sortStates[key];
  if (st.running) return;
  const arr = Array.from({ length: 12 }, () => Math.floor(Math.random() * 88) + 8);
  st.frames = key === 'sel' ? _selFrames(arr) : key === 'ins' ? _insFrames(arr) : _mrgFrames(arr);
  st.idx = 0;
  st.running = false;
  _renderSortFrame(key, st.frames[0]);
  document.getElementById(`sortRunBtn-${key}`).textContent = 'Run';
  document.getElementById(`sortStepBtn-${key}`).disabled = false;
  const infoEl = document.getElementById(`sortInfo-${key}`);
  if (infoEl) infoEl.textContent = 'Array generated. Press Run or Step.';
  log(`sortLog-${key}`, 'generate', `new array: [${arr.join(', ')}]`);
}

function sortStep(key) {
  const st = _sortStates[key];
  if (st.running || !st.frames.length) return;
  if (st.idx < st.frames.length - 1) {
    st.idx++;
    _renderSortFrame(key, st.frames[st.idx]);
    if (st.frames[st.idx].done) {
      document.getElementById(`sortStepBtn-${key}`).disabled = true;
      log(`sortLog-${key}`, 'done', 'sort complete');
    }
  }
}

async function sortRunToggle(key) {
  const st = _sortStates[key];

  if (st.running) {
    st.running = false;
    document.getElementById(`sortRunBtn-${key}`).textContent = 'Run';
    document.getElementById(`sortStepBtn-${key}`).disabled = false;
    return;
  }

  if (!st.frames.length) { sortGenerate(key); await sleep(60); }
  if (st.frames[st.idx] && st.frames[st.idx].done) st.idx = 0;

  st.running = true;
  document.getElementById(`sortRunBtn-${key}`).textContent = 'Pause';
  document.getElementById(`sortStepBtn-${key}`).disabled = true;

  const speedEl = document.getElementById(`sortSpeed-${key}`);

  while (st.running && st.idx < st.frames.length) {
    _renderSortFrame(key, st.frames[st.idx]);
    if (st.frames[st.idx].done) break;
    st.idx++;
    const delay = speedEl ? (980 - parseInt(speedEl.value)) : 420;
    await sleep(delay);
  }

  st.running = false;
  document.getElementById(`sortRunBtn-${key}`).textContent = 'Run';
  const isDone = st.frames[st.idx] && st.frames[st.idx].done;
  document.getElementById(`sortStepBtn-${key}`).disabled = !!isDone;
  if (isDone) log(`sortLog-${key}`, 'done', 'sort complete');
}

function sortReset(key) {
  const st = _sortStates[key];
  st.running = false;
  document.getElementById(`sortRunBtn-${key}`).textContent = 'Run';
  if (!st.frames.length) return;
  st.idx = 0;
  _renderSortFrame(key, st.frames[0]);
  const infoEl = document.getElementById(`sortInfo-${key}`);
  if (infoEl) infoEl.textContent = 'Reset to initial array.';
  document.getElementById(`sortStepBtn-${key}`).disabled = false;
}

// ═══════════════════════════════════════════════
//  ALGORITHMS — TREE TRAVERSALS
// ═══════════════════════════════════════════════

let algoTreeRoot = null;
let algoTreeNextId = 1;
let algoTreeAnimating = false;

function algoTreeInsert() {
  if (algoTreeAnimating) return;
  const inp = document.getElementById('algoTreeInput');
  const v = parseInt(inp.value, 10);
  if (isNaN(v)) return;
  inp.value = '';

  const node = { v, left: null, right: null, id: algoTreeNextId++ };
  if (!algoTreeRoot) {
    algoTreeRoot = node;
  } else {
    let cur = algoTreeRoot;
    while (true) {
      if (v < cur.v) {
        if (!cur.left)  { cur.left  = node; break; }
        cur = cur.left;
      } else if (v > cur.v) {
        if (!cur.right) { cur.right = node; break; }
        cur = cur.right;
      } else {
        log('algoTreeLog', 'insert', `<span class="val">${v}</span> already in tree`);
        return;
      }
    }
  }

  _renderAlgoTree(new Set([node.id]));
  setTimeout(() => _renderAlgoTree(), 500);
  log('algoTreeLog', 'insert', `<span class="val">${v}</span> inserted`);
}

function algoTreeClear() {
  if (algoTreeAnimating) return;
  algoTreeRoot = null;
  algoTreeNextId = 1;
  _renderAlgoTree();
  const sc = document.getElementById('algoTreeSeqCanvas');
  sc.innerHTML = '<div class="empty-state"><span class="ornament">\u00a7</span>Run a traversal to see the visit order</div>';
  log('algoTreeLog', 'clear', 'tree cleared');
}

async function algoTreeTraverse(order) {
  if (algoTreeAnimating) return;
  if (!algoTreeRoot) { log('algoTreeLog', 'traverse', 'tree is empty'); return; }
  algoTreeAnimating = true;

  const nodes = _algoTreeCollect(algoTreeRoot, order);
  const seqCanvas = document.getElementById('algoTreeSeqCanvas');
  seqCanvas.innerHTML = '<div class="traversal-sequence" id="algoTreeSeq"></div>';
  const seqEl = document.getElementById('algoTreeSeq');

  const visited = new Set();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    visited.add(n.id);
    _renderAlgoTree(visited);

    if (i > 0) {
      const arr = document.createElement('span');
      arr.className = 'traversal-seq-arrow';
      arr.textContent = '\u2192';
      seqEl.appendChild(arr);
    }
    const valEl = document.createElement('span');
    valEl.className = 'traversal-seq-val active';
    valEl.textContent = n.v;
    seqEl.appendChild(valEl);

    await sleep(460);
    valEl.classList.remove('active');
    valEl.classList.add('visited');
  }

  _renderAlgoTree();

  const names = {
    inorder:    'In-order (L\u2192N\u2192R)',
    preorder:   'Pre-order (N\u2192L\u2192R)',
    postorder:  'Post-order (L\u2192R\u2192N)',
    levelorder: 'Level-order (BFS)'
  };
  log('algoTreeLog', 'traverse',
    `${names[order]}: ${nodes.map(n => `<span class="val">${n.v}</span>`).join(' \u2192 ')}`);
  algoTreeAnimating = false;
}

function _algoTreeCollect(root, order) {
  const out = [];
  if (!root) return out;
  if (order === 'inorder')        { (function w(n){if(!n)return;w(n.left);out.push(n);w(n.right);})(root); }
  else if (order === 'preorder')  { (function w(n){if(!n)return;out.push(n);w(n.left);w(n.right);})(root); }
  else if (order === 'postorder') { (function w(n){if(!n)return;w(n.left);w(n.right);out.push(n);})(root); }
  else { const q=[root]; while(q.length){const n=q.shift();out.push(n);if(n.left)q.push(n.left);if(n.right)q.push(n.right);} }
  return out;
}

// ═══════════════════════════════════════════════
//  ALGO TREE TRAVERSALS — RANDOM
// ═══════════════════════════════════════════════
function algoTreeRandom() {
  if (algoTreeAnimating) return;
  algoTreeRoot = null; algoTreeNextId = 1;
  const vals = _rndArr(_rndInt(5, 9), 1, 99);
  vals.forEach(v => {
    const node = { v, left: null, right: null, id: algoTreeNextId++ };
    if (!algoTreeRoot) { algoTreeRoot = node; return; }
    let cur = algoTreeRoot;
    while (true) {
      if (v < cur.v) { if (!cur.left) { cur.left = node; break; } cur = cur.left; }
      else if (v > cur.v) { if (!cur.right) { cur.right = node; break; } cur = cur.right; }
      else break;
    }
  });
  const sc = document.getElementById('algoTreeSeqCanvas');
  sc.innerHTML = '<div class="empty-state"><span class="ornament">\u00a7</span>Run a traversal to see the visit order</div>';
  _renderAlgoTree();
  log('algoTreeLog', 'random', `[${vals.join(', ')}]`);
}

function _renderAlgoTree(highlightSet) {
  const canvas = document.getElementById('algoTreeCanvas');
  const hl = highlightSet || new Set();

  if (!algoTreeRoot) {
    canvas.innerHTML = '<div class="empty-state"><span class="ornament">\u00a7</span>Insert values to build a BST</div>';
    return;
  }

  const W = 520, lH = 72, top = 36, r = 20;
  const pos = layoutBinaryTree(algoTreeRoot, W, lH, top);
  let maxY = 0;
  for (const p of pos.values()) maxY = Math.max(maxY, p.y);

  let svg = `<svg viewBox="0 0 ${W} ${maxY+r+30}" style="width:100%;height:${maxY+r+30}px;display:block">`;

  for (const [node, {x,y}] of pos) {
    if (node.left  && pos.has(node.left))  { const p=pos.get(node.left);  svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
    if (node.right && pos.has(node.right)) { const p=pos.get(node.right); svg+=`<line class="edge-line" x1="${x}" y1="${y}" x2="${p.x}" y2="${p.y}"/>`; }
  }
  for (const [node, {x,y}] of pos) {
    const isHl = hl.has(node.id);
    svg += `<circle class="node-circle${isHl ? ' highlight' : ''}" cx="${x}" cy="${y}" r="${r}"/>`;
    svg += `<text class="node-text" x="${x}" y="${y}">${node.v}</text>`;
  }

  svg += '</svg>';
  canvas.innerHTML = svg;
}

// ═══════════════════════════════════════════════
//  PSEUDOCODE — C++ DATA & LANGUAGE TOGGLE
// ═══════════════════════════════════════════════

const _sortCpp = {
  sel: [
    'void selectionSort(int a[], int n) {',
    '    for (int i = 0; i < n - 1; i++) {',
    '        int minIdx = i;',
    '        for (int j = i+1; j < n; j++)',
    '            if (a[j] < a[minIdx])',
    '                minIdx = j;',
    '        swap(a[i], a[minIdx]);',
    '    }',
    '}'
  ],
  ins: [
    'void insertionSort(int a[], int n) {',
    '    for (int i = 1; i < n; i++) {',
    '        int key = a[i];',
    '        int j = i - 1;',
    '        while (j >= 0 && a[j] > key) {',
    '            a[j + 1] = a[j];',
    '            j--;',
    '        }',
    '        a[j + 1] = key;',
    '    }',
    '}'
  ],
  mrg: [
    'void merge(int a[], int l, int m, int r) {',
    '    vector<int> L(a+l, a+m+1);',
    '    vector<int> R(a+m+1, a+r+1);',
    '    int i=0, j=0, k=l;',
    '    while (i<L.size() && j<R.size())',
    '        a[k++]=(L[i]<=R[j]) ? L[i++]:R[j++];',
    '    while (i<L.size()) a[k++]=L[i++];',
    '    while (j<R.size()) a[k++]=R[j++];',
    '}',
    '',
    'void mergeSort(int a[], int l, int r) {',
    '    if (l >= r) return;',
    '    int m = (l + r) / 2;',
    '    mergeSort(a, l, m);',
    '    mergeSort(a, m+1, r);',
    '    merge(a, l, m, r);',
    '}'
  ]
};

const _pseudoLang = { sel: 'pseudo', ins: 'pseudo', mrg: 'pseudo' };

function _renderPseudoPane(key, activeLine = -1) {
  const pseudoEl = document.getElementById(`sortPseudo-${key}`);
  if (!pseudoEl) return;
  const isCpp = _pseudoLang[key] === 'cpp';
  const lines = isCpp ? (_sortCpp[key] || []) : (_sortPseudo[key] || []);
  // In C++ mode, never highlight a line (line mapping differs)
  const highlightLine = isCpp ? -1 : activeLine;
  let pHtml = '<div class="sort-pseudo">';
  lines.forEach((line, idx) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    pHtml += `<div class="pseudo-line${idx === highlightLine ? ' active' : ''}">${esc || '\u00a0'}</div>`;
  });
  pHtml += '</div>';
  pseudoEl.innerHTML = pHtml;
}

function togglePseudoLang(key) {
  _pseudoLang[key] = _pseudoLang[key] === 'pseudo' ? 'cpp' : 'pseudo';
  const isCpp = _pseudoLang[key] === 'cpp';
  const labelEl = document.getElementById(`pseudoLangLabel-${key}`);
  const btnEl   = document.getElementById(`pseudoToggle-${key}`);
  if (labelEl) labelEl.textContent = isCpp ? 'C++' : 'Pseudocode';
  if (btnEl)   { btnEl.textContent = isCpp ? 'Pseudo' : 'C++'; btnEl.classList.toggle('active', isCpp); }
  // Re-render at current frame if one exists, else just render the pane
  const st = _sortStates[key];
  if (st && st.frames.length) {
    _renderSortFrame(key, st.frames[st.idx]);
  } else {
    _renderPseudoPane(key, -1);
  }
}

// Show pseudocode immediately on load (no array needed)
(function initSortPseudo() {
  ['sel', 'ins', 'mrg'].forEach(key => _renderPseudoPane(key, -1));
})();

// ═══════════════════════════════════════════════
//  RANDOM GENERATE
// ═══════════════════════════════════════════════
function _rndInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function _rndArr(n, lo, hi) {
  const used = new Set(), arr = [];
  while (arr.length < n) {
    const v = _rndInt(lo, hi);
    if (!used.has(v)) { used.add(v); arr.push(v); }
  }
  return arr;
}

function stackRandom() {
  if (isAnimating) return;
  stackData = _rndArr(_rndInt(4, 7), 1, 99);
  log('stackLog', 'random', `generated [${stackData.join(', ')}]`);
  renderStack();
}

function llRandom() {
  if (llAnimating) return;
  llData = _rndArr(_rndInt(4, 7), 1, 99);
  log('llLog', 'random', `generated [${llData.join(', ')}]`);
  renderLinkedList(true);
}

function queueRandom() {
  if (queueAnimating) return;
  const vals = _rndArr(_rndInt(4, 6), 1, 99);
  queueData = [];
  circularSlots = Array(QUEUE_CAP).fill(null);
  queueFront = 0; queueRear = -1; queueCount = 0;
  twoStacksInbox = []; twoStacksOutbox = [];
  if (queueImpl === 'circular') {
    vals.forEach(v => { queueRear = (queueRear + 1) % QUEUE_CAP; circularSlots[queueRear] = v; queueCount++; });
  } else if (queueImpl === 'two-stacks') {
    twoStacksInbox = [...vals];
  } else if (queueImpl === 'sll-rear-head') {
    // rear at head: enqueue prepends, so stored as [latest,...,oldest] = [rear...,front]
    queueData = [...vals].reverse();
  } else {
    queueData = [...vals];
  }
  log('queueLog', 'random', `generated [${vals.join(', ')}]`);
  renderQueue();
}

function heapRandom() {
  if (heapAnimating) return;
  heapData = _rndArr(_rndInt(5, 8), 1, 99);
  const isMin = heapImpl === 'min-heap';
  const n = heapData.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    let k = i;
    while (true) {
      const l = 2*k+1, r = 2*k+2; let t = k;
      if (l < n && (isMin ? heapData[l] < heapData[t] : heapData[l] > heapData[t])) t = l;
      if (r < n && (isMin ? heapData[r] < heapData[t] : heapData[r] > heapData[t])) t = r;
      if (t !== k) { [heapData[k], heapData[t]] = [heapData[t], heapData[k]]; k = t; } else break;
    }
  }
  log('heapLog', 'random', `generated [${heapData.join(', ')}]`);
  renderHeap();
}

function btRandom() {
  if (btAnimating) return;
  btRoot = null; btNextId = 1;
  const vals = _rndArr(_rndInt(5, 9), 1, 99);
  vals.forEach(v => {
    const node = { v, left: null, right: null, id: btNextId++ };
    if (!btRoot) { btRoot = node; }
    else { const s = _btNextSlot(btRoot); s.parent[s.side] = node; }
  });
  log('btLog', 'random', `generated [${vals.join(', ')}]`);
  renderBT();
}

function bstRandom() {
  if (bstAnimating) return;
  bstRoot = null; bstNextId = 1;
  const vals = _rndArr(_rndInt(5, 9), 1, 99);
  vals.forEach(v => {
    const path = _bstInsertPath(bstRoot, v);
    if (path.length && path[path.length-1].v === v) return;
    const node = { v, left: null, right: null, id: bstNextId++ };
    if (!bstRoot) { bstRoot = node; }
    else { const par = path[path.length-1]; if (v < par.v) par.left = node; else par.right = node; }
  });
  log('bstLog', 'random', `generated [${vals.join(', ')}]`);
  renderBST();
}

function avlRandom() {
  if (avlAnimating) return;
  avlRoot = null; avlNextId = 1;
  const vals = _rndArr(_rndInt(5, 9), 1, 99);
  vals.forEach(v => { avlRoot = _avlInsert(avlRoot, v, []); });
  log('avlLog', 'random', `generated [${vals.join(', ')}]`);
  renderAVL();
}

function btreeRandom() {
  if (btreeAnimating) return;
  btreeRoot = null;
  const vals = _rndArr(_rndInt(6, 12), 1, 99);
  vals.forEach(v => _btreeInsert(v, []));
  log('btreeLog', 'random', `generated [${vals.join(', ')}]`);
  renderBTree();
}

function htRandom() {
  htChains = Array.from({length: HT_SIZE}, () => []);
  htSlots  = Array(HT_SIZE).fill(null);
  const keys = _rndArr(_rndInt(4, 6), 1, 50);
  const vals = keys.map(() => _rndInt(1, 99));
  if (htImpl === 'chaining') {
    keys.forEach((k, i) => htChains[htHash(k)].push({ key: k, val: vals[i] }));
  } else {
    keys.forEach((k, i) => {
      const h = htHash(k);
      for (let p = 0; p < HT_SIZE; p++) {
        const idx = (h + p) % HT_SIZE;
        if (htSlots[idx] === null) { htSlots[idx] = { key: k, val: vals[i] }; break; }
      }
    });
  }
  log('htLog', 'random', `inserted ${keys.length} pairs`);
  renderHT();
}

function dictRandom() {
  dictHtSize = DICT_HT_INIT_SIZE;
  dictChains = Array.from({length: dictHtSize}, () => []);
  dictBSTRoot = null; dictBSTNextId = 1;
  const keys = _rndArr(_rndInt(4, 6), 1, 50);
  const vals = keys.map(() => _rndInt(1, 99));
  if (dictImpl === 'hashmap') {
    keys.forEach((k, i) => dictChains[dictHash(k)].push({ key: k, val: vals[i] }));
  } else {
    keys.forEach((k, i) => {
      const node = { key: k, val: vals[i], left: null, right: null, id: dictBSTNextId++ };
      if (!dictBSTRoot) { dictBSTRoot = node; return; }
      let cur = dictBSTRoot;
      while (true) {
        if (k < cur.key) { if (!cur.left)  { cur.left  = node; break; } cur = cur.left; }
        else if (k > cur.key) { if (!cur.right) { cur.right = node; break; } cur = cur.right; }
        else { cur.val = vals[i]; break; }
      }
    });
  }
  log('dictLog', 'random', `inserted ${keys.length} pairs`);
  renderDict();
}

function ufRandom() {
  if (ufAnimating) return;
  ufParent = Array(UF_MAX).fill(-1);
  ufRank   = Array(UF_MAX).fill(0);
  ufExists = Array(UF_MAX).fill(false);
  const n = _rndInt(5, 8);
  for (let i = 0; i < n; i++) { ufExists[i] = true; ufParent[i] = i; }
  const useRank = ufImpl === 'rank' || ufImpl === 'both';
  const numUnions = _rndInt(2, Math.floor(n / 2));
  for (let u = 0; u < numUnions; u++) {
    const a = _rndInt(0, n-1), b = _rndInt(0, n-1);
    if (a === b) continue;
    const ra = _ufFindRoot(a), rb = _ufFindRoot(b);
    if (ra === rb) continue;
    if (useRank) {
      if (ufRank[ra] < ufRank[rb])      ufParent[ra] = rb;
      else if (ufRank[ra] > ufRank[rb]) ufParent[rb] = ra;
      else { ufParent[rb] = ra; ufRank[ra]++; }
    } else {
      ufParent[rb] = ra;
    }
  }
  log('ufLog', 'random', `${n} elements, ${numUnions} union attempts`);
  renderUF();
}

function graphRandom() {
  if (graphAnimating) return;
  graphNodes = []; graphEdges = []; graphNextId = 1;
  const n = _rndInt(4, 7);
  for (let i = 0; i < n; i++) graphNodes.push({ id: graphNextId++ });
  const ids = graphNodes.map(nd => nd.id);
  // Ensure connected via spanning chain, then add a few extra edges
  for (let i = 1; i < ids.length; i++) graphEdges.push({ from: ids[i-1], to: ids[i], weight: _rndInt(1, 15) });
  const extras = _rndInt(1, Math.min(3, n));
  for (let e = 0; e < extras; e++) {
    const from = ids[_rndInt(0, ids.length-1)];
    const to   = ids[_rndInt(0, ids.length-1)];
    if (from !== to && !graphEdges.find(ed => ed.from === from && ed.to === to)) {
      graphEdges.push({ from, to, weight: _rndInt(1, 15) });
    }
  }
  log('graphLog', 'random', `${n} nodes, ${graphEdges.length} edges`);
  renderGraph();
}
