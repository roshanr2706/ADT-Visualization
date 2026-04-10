// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const now = () => new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let isAnimating = false;

function log(logId, op, detail) {
  const el = $(logId);
  const entry = document.createElement('span');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="timestamp">${now()}</span><span class="op">${op}</span> ${detail}`;
  el.prepend(entry);
  if (el.children.length > 50) el.removeChild(el.lastChild);
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
const sidebarData = {
  stack: {
    description: 'A stack is a linear collection where elements are added and removed from the same end — the <em>top</em>. Think of a stack of plates: the last placed is the first taken.',
  },
};

function updateSidebar(panel) {
  const data = sidebarData[panel];
  if (!data) return;
  const meta = implMeta[implType];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${data.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => {
    const isWarn = c === 'O(n)' && op !== 'search';
    html += `<tr><td>${op}</td><td${isWarn ? ' class="complexity-warn"' : ''}>${c}</td></tr>`;
  });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Memory Layout</h3><p>${
    implType === 'array'
      ? 'Contiguous block — O(1) random access, cache-friendly.'
      : implType === 'dll'
      ? 'Each node allocated separately, holding data + two pointers (next, prev).'
      : 'Each node allocated separately, holding data + one pointer (next).'
  }</p></div>`;
  $('sidebarContent').innerHTML = html;
}

// ═══════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════
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

// ─── Extend updateSidebar ───
const _origUpdateSidebar = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'linkedlist') { _origUpdateSidebar(panel); return; }
  const data = sidebarData.linkedlist;
  const meta = llImplMeta[llImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${data.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => {
    const warn = c === 'O(n)' && op !== 'search' && op !== 'insertAt';
    html += `<tr><td>${op}</td><td${warn ? ' class="complexity-warn"' : ''}>${c}</td></tr>`;
  });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Memory Layout</h3><p>${
    llImpl === 'dll'
      ? 'Each node holds <em>data</em> + two pointers (next, prev). More memory per node but enables O(1) removal from both ends.'
      : 'Each node holds <em>data</em> + one pointer (next). Smaller nodes but deletion from the tail requires traversal.'
  }</p></div>`;
  $('sidebarContent').innerHTML = html;
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

// ─── Extend updateSidebar ───
const _prevUpdateSidebar = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'queue') { _prevUpdateSidebar(panel); return; }
  const data = sidebarData.queue;
  const meta = queueImplMeta[queueImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${data.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => {
    const warn = c === 'O(n)' && op !== 'search';
    html += `<tr><td>${op}</td><td${warn ? ' class="complexity-warn"' : ''}>${c}</td></tr>`;
  });
  html += `</table></div>`;
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
  html += `<div class="sidebar-section"><h3>Memory Layout</h3><p>${memNote}</p></div>`;
  $('sidebarContent').innerHTML = html;
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

// ─── Extend updateSidebar ───
const _prevUpdateSidebar2 = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'heap') { _prevUpdateSidebar2(panel); return; }
  const data = sidebarData.heap;
  const meta = heapImplMeta[heapImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${data.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => {
    html += `<tr><td>${op}</td><td>${c}</td></tr>`;
  });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Structure Property</h3><p>Complete binary tree — all levels full except possibly the last, filled left-to-right. Stored as a flat array: parent(i) = ⌊(i−1)/2⌋.</p></div>`;
  $('sidebarContent').innerHTML = html;
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

const _prevUpdateSidebar3 = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'binarytree') { _prevUpdateSidebar3(panel); return; }
  const meta = btImplMeta[btImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${sidebarData.binarytree.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => { html += `<tr><td>${op}</td><td>${c}</td></tr>`; });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Traversals</h3><p>In-order (L→N→R), Pre-order (N→L→R), Post-order (L→R→N), Level-order (BFS). Without an ordering invariant, in-order does not produce a sorted sequence.</p></div>`;
  $('sidebarContent').innerHTML = html;
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

const _prevUpdateSidebar4 = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'bst') { _prevUpdateSidebar4(panel); return; }
  const meta = bstImplMeta[bstImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${sidebarData.bst.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity (h = height)</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => { html += `<tr><td>${op}</td><td>${c}</td></tr>`; });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Worst Case</h3><p>Inserting sorted input (1,2,3,…) degenerates the BST into a linked list with h = n and O(n) ops. An AVL or Red-Black tree prevents this with rotations.</p></div>`;
  $('sidebarContent').innerHTML = html;
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

const _prevUpdateSidebar5 = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'avl') { _prevUpdateSidebar5(panel); return; }
  const meta = avlImplMeta[avlImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${sidebarData.avl.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => { html += `<tr><td>${op}</td><td>${c}</td></tr>`; });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Rotations</h3><p>LL: right-rotate at imbalanced node. RR: left-rotate. LR: left-rotate child, then right-rotate ancestor. RL: right-rotate child, then left-rotate ancestor. Balance factor colours: grey\u00a0=\u00a00, accent\u00a0=\u00a0\u00b11, red\u00a0=\u00a0\u00b12 (triggers rotation).</p></div>`;
  $('sidebarContent').innerHTML = html;
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

const _prevUpdateSidebar6 = updateSidebar;
updateSidebar = function(panel) {
  if (panel !== 'btree') { _prevUpdateSidebar6(panel); return; }
  const meta = btreeImplMeta[btreeImpl];
  let html = `<div class="sidebar-section"><h3>About</h3><p>${sidebarData.btree.description}</p></div>`;
  html += `<div class="sidebar-section"><h3>Time Complexity</h3>`;
  html += `<div class="sidebar-impl-badge">${meta.label}</div>`;
  html += `<table class="complexity-table">`;
  meta.complexity.forEach(([op, c]) => { html += `<tr><td>${op}</td><td>${c}</td></tr>`; });
  html += `</table></div>`;
  html += `<div class="sidebar-section"><h3>Split Property</h3><p>When a node is full (2t\u22121 keys), it splits: the median key promotes to the parent, and the left/right halves become two sibling nodes. All leaves remain at the same depth.</p></div>`;
  $('sidebarContent').innerHTML = html;
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
