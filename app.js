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
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const panel = btn.dataset.panel;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    $('panel-' + panel).classList.add('active');
    updateSidebar(panel);
  });
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
document.querySelectorAll('.ctrl-input').forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const btn = input.parentElement.querySelector('.ctrl-btn');
      if (btn) btn.click();
    }
  });
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
