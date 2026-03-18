// ═══════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════
const $ = id => document.getElementById(id);
const now = () => new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

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
  // sll-head: most recently pushed = head (left)
  // sll-tail/dll: most recently pushed = tail (right)
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
    const isNew = isTop; // top is the most recently pushed

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
//  STACK — OPERATIONS
// ═══════════════════════════════════════════════
function stackPush() {
  const v = $('stackInput').value;
  if (v === '') return;
  stackData.push(Number(v));
  log('stackLog', 'push', `<span class="val">${v}</span> → top of stack (size: ${stackData.length})`);
  $('stackInput').value = '';
  renderStack();
}

function stackPop() {
  if (!stackData.length) { log('stackLog', 'pop', 'stack is empty — underflow'); return; }
  const v = stackData.pop();
  log('stackLog', 'pop', `<span class="val">${v}</span> removed from top (size: ${stackData.length})`);
  renderStack();
}

function stackPeek() {
  if (!stackData.length) { log('stackLog', 'peek', 'stack is empty'); return; }
  log('stackLog', 'peek', `top = <span class="val">${stackData[stackData.length - 1]}</span>`);
}

function stackClear() {
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
