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
  const tc = $('heapTreeCanvas');
  const ac = $('heapArrayCanvas');
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
  const tc = $('heapTreeCanvas');
  const ac = $('heapArrayCanvas');
  const rootCircle = tc.querySelector('.node-circle.highlight');
  const rootCell   = ac.querySelector('.impl-arr-cell.is-top .arr-val');
  if (rootCircle) rootCircle.classList.add('animate-pop-out');
  if (rootCell)   rootCell.classList.add('animate-pop-out');
  await sleep(440);
}

function animateHeapPeek(v) {
  const tc = $('heapTreeCanvas');
  const ac = $('heapArrayCanvas');
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
