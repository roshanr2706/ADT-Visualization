# Structures — Developer Guide for AI Agents

## 1. Overview

**Structures** is a single-page, browser-native visualizer for the abstract data types covered in UBC CPSC 221. Every ADT lives in the same HTML file, styled with a deliberate editorial/newspaper aesthetic: warm paper tones, double-rule borders, a masthead title, and a three-column layout that mirrors a broadsheet. The visual metaphor is intentional — data structures are typeset like articles, operations are logged like news copy, and implementation variants are treated as different "editions" of the same story.

The design system is opinionated. Colour tokens come from a single `:root` block. Typography uses exactly three fonts: a large Instrument Serif display face for headings, Source Serif 4 for body copy, and DM Mono for metadata, timestamps, and code labels. Animations are CSS-transition-driven — SVG attributes are changed between renders and the browser tweens for free. There is no bundler, no framework, and no build step. The entire application is three files.

---

## 2. Running It

```
Open index.html in a browser. No build, no dependencies.
```

All fonts are loaded from Google Fonts via `<link>` tags in `index.html`. No npm, no Node, no Webpack. Drag the file into a browser tab and it works.

---

## 3. File Layout

| File | Role |
|------|------|
| `index.html` | All markup: masthead, nav strip, panels, sidebar, modal shells |
| `styles.css` | The entire design system — tokens, typography, layout, components, animations |
| `app.js` | All modules — deliberately single-file for easy sharing and no build step |

`app.js` is long by design. Splitting it would require a bundler or ES module server, which breaks the "open the HTML file" contract.

---

## 4. Currently Implemented Modules

All eight modules are in `app.js`. Their panel IDs, state prefixes, and approximate start lines are:

| Module | Panel ID | Prefix | `<m>Data` | State start |
|--------|----------|--------|-----------|-------------|
| Stack | `stack` | `stack` | `stackData` (array) | line 21 |
| Linked List | `linkedlist` | `ll` | `llData` (array of node objects) | line 412 |
| Queue | `queue` | `queue` | `queueData` (array) + variant state | line 788 |
| Heap | `heap` | `heap` | `heapData` (array) | line 1331 |
| Binary Tree | `binarytree` | `bt` | `btRoot` (node or null) | line 1642 |
| BST | `bst` | `bst` | `bstRoot` (node or null) | line 1884 |
| AVL Tree | `avl` | `avl` | `avlRoot` (node or null) | line 2138 |
| B-Tree | `btree` | `btree` | `btreeRoot` (node or null) | line 2444 |

Tree-based modules (Binary Tree, BST, AVL, B-Tree) also carry `<m>NextId` — a monotonically increasing counter used to stamp each node with a stable identity for `highlightSet` lookups.

**Queue extra state.** The Queue module carries additional variables for its non-trivial variants:
```js
// Circular array
const QUEUE_CAP = 8;
let circularSlots = Array(QUEUE_CAP).fill(null);
let queueFront = 0;
let queueRear  = -1;
let queueCount = 0;

// Two-stacks
let twoStacksInbox  = [];  // enqueue here
let twoStacksOutbox = [];  // dequeue from here
```
These are module-level globals alongside `queueData`. New Queue operations must branch on `queueImpl` to update whichever set of state is live.

---

## 5. The Module Skeleton

Every ADT module in `app.js` follows the same six-section structure, delimited by `══` banner comments:

```js
// ═══════════════════════════════════════════════
//  {{MODULE}} — DATA & METADATA
// ═══════════════════════════════════════════════
let {{m}}Data = ...;          // (or {{m}}Root for trees)
let {{m}}Impl = '...';
let {{m}}Animating = false;
// let {{m}}NextId = 1;       // tree modules only

const {{m}}ImplMeta = { ... };

// ─── Extend sidebar data ───
sidebarData.{{panel}} = { description: '...' };

// ─── Extend updateSidebar ───
const _prev{{Module}}UpdateSidebar = updateSidebar;
updateSidebar = function(panel) { ... };

// ═══════════════════════════════════════════════
//  {{MODULE}} — IMPL SWITCHER
// ═══════════════════════════════════════════════
function set{{Module}}Impl(type) { ... }

// ═══════════════════════════════════════════════
//  {{MODULE}} — CORE ALGORITHMS
// ═══════════════════════════════════════════════
// Pure functions that return step arrays — no side effects, no DOM touches.

// ═══════════════════════════════════════════════
//  {{MODULE}} — RENDER
// ═══════════════════════════════════════════════
function render{{Module}}(highlightSet) { ... }

// ═══════════════════════════════════════════════
//  {{MODULE}} — ANIMATION HELPERS
// ═══════════════════════════════════════════════
async function animate{{Module}}X(steps) { ... }

// ═══════════════════════════════════════════════
//  {{MODULE}} — OPERATIONS
// ═══════════════════════════════════════════════
async function {{m}}Insert() { ... }
// ...
set{{Module}}Impl('default-impl');   // ← init call at the bottom
```

Replace `{{MODULE}}` with the uppercase label, `{{Module}}` with PascalCase, `{{m}}` with the camelCase prefix, and `{{panel}}` with the panel's data-panel string.

> **Stack is the legacy exception.** Stack was written before the naming convention solidified. It uses `implType` (not `stackImpl`), `implMeta` (not `stackImplMeta`), and `setImpl()` (not `setStackImpl()`). The base `updateSidebar` function (line 56) handles Stack directly — Stack does not monkey-patch. All modules written after Stack follow the full convention above.

---

## 6. State Naming Convention

For a module with prefix `m`:

| Variable | Purpose |
|----------|---------|
| `<m>Data` | The live data structure (array, tree root node, etc.) |
| `<m>Impl` | String key for the current implementation variant |
| `<m>Animating` | Boolean lock — prevents concurrent operations |
| `<m>NextId` | (tree modules only) Monotonic node ID counter |

The metadata object for a module's implementation variants is `<m>ImplMeta`. Its shape:

```js
const heapImplMeta = {
  'min-heap': {
    label: 'Min-Heap',
    note: 'HTML string describing the variant...',
    complexity: [['insert', 'O(log n)'], ['extractMin', 'O(log n)'], ...]
  },
  'max-heap': { ... }
};
```

---

## 7. The Sidebar Monkey-Patch

`updateSidebar(panel)` is a module-level function variable, not a method. The base version (line 56) handles Stack only. Each new ADT module wraps the previous version using a closure chain.

**The naming ladder** (as it exists in the codebase):

| Module | Capture variable | Line |
|--------|-----------------|------|
| Stack | *(base function — no monkey-patch)* | 56 |
| Linked List | `_origUpdateSidebar` | 440 |
| Queue | `_prevUpdateSidebar` | 842 |
| Heap | `_prevUpdateSidebar2` | 1356 |
| Binary Tree | `_prevUpdateSidebar3` | 1659 |
| BST | `_prevUpdateSidebar4` | 1901 |
| AVL Tree | `_prevUpdateSidebar5` | 2155 |
| B-Tree | `_prevUpdateSidebar6` | 2461 |

When adding the next module, capture with `_prevUpdateSidebar7`. Use numbered suffixes to avoid collisions — the exact name doesn't matter as long as it is unique in the file.

The standard monkey-patch pattern (from [app.js:439–460](app.js#L439-L460)):

```js
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
  $('sidebarContent').innerHTML = html;
};
```

---

## 8. Rendering & the `highlightSet` Contract

Every render function has the signature:

```js
function renderX(highlightSet) { ... }
```

`highlightSet` is a `Set` of node IDs (for tree/graph structures) or array indices (for array-backed structures). When the argument is omitted or `undefined`, nothing is highlighted.

During animation, the animator calls `renderX(new Set([...]))` repeatedly with different highlight sets to drive visual state. Between calls, `await sleep(ms)` gives the browser time to paint. The render function itself is pure with respect to animation — it only reads `<m>Data` and `highlightSet`; it never sleeps.

---

## 9. Animation Patterns

### The `<m>Animating` gate

Every public operation starts with:

```js
if (heapAnimating) return;
heapAnimating = true;
// ... do work ...
heapAnimating = false;
```

This prevents a user from triggering a second operation while one is already in flight. The lock is reset at the end of the async function, not in a `finally` block — keep it simple.

### Step precomputation

Core algorithms compute a full list of steps **without touching `<m>Data`** or the DOM. From [app.js:1409–1422](app.js#L1409-L1422):

```js
// Compute bubble-up steps WITHOUT modifying heapData
function heapBubbleUpSteps(startIdx) {
  const tmp = [...heapData];   // shadow copy
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
```

The shadow copy `[...heapData]` lets the algorithm run to completion and record every swap index before a single pixel changes.

### Step replay

The animator replays the step array against the live `<m>Data`, mutating it one step at a time. From [app.js:1528–1536](app.js#L1528-L1536):

```js
async function animateHeapSwaps(steps) {
  for (const { from, to } of steps) {
    renderHeap(new Set([from, to]));   // highlight both nodes before swap
    await sleep(480);
    [heapData[from], heapData[to]] = [heapData[to], heapData[from]];  // commit swap
    renderHeap(new Set([to]));         // highlight destination after swap
    await sleep(220);
  }
}
```

Mutating `heapData` between renders is intentional — it keeps live state and DOM in sync at every frame. Never batch all mutations before rendering.

### CSS-transition tweening

`.node-circle`, `.edge-line`, and `.node-rect` all carry `transition: all 0.4s ease` in `styles.css`. This means changing SVG attributes (`cx`, `cy`, `x`, `y`, `x1`, `y1`, `x2`, `y2`) between full re-renders causes the browser to tween positions for free. This is why tree rotation animations look smooth without any manual interpolation code.

### `spawnPeekBubble`

A reusable floating callout for peek/return operations ([app.js:342–347](app.js#L342-L347)):

```js
function spawnPeekBubble(v, anchor) {
  const bubble = document.createElement('div');
  bubble.className = 'peek-bubble';
  bubble.innerHTML = `<span class="peek-arrow">→</span>\u00a0return\u00a0<span class="peek-val">${v}</span>`;
  anchor.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1600);
}
```

Call it with the value to display and the DOM element to attach the bubble to. It self-destructs after 1.6 s. Used by stack peek, queue peek, heap peek, etc.

---

## 10. Design Tokens

From [styles.css:1–15](styles.css#L1-L15):

```css
:root {
  --ink: #1a1a1a;
  --paper: #f5f1eb;
  --paper-warm: #ece6da;
  --accent: #c4440a;
  --accent-light: #e8d5c4;
  --muted: #8a8075;
  --rule: #d4cdc2;
  --node-fill: #fff;
  --node-stroke: #1a1a1a;
  --highlight: #fef3e0;
  --success: #2d6a4f;
  --danger: #c4440a;
  --canvas-bg: #faf8f4;
}
```

All colours in the codebase reference these variables. Never hard-code a hex value in component CSS.

---

## 11. Typography

The three-font system:

| Font | Weight | Used for |
|------|--------|----------|
| **Instrument Serif** | 400 (roman + italic) | Display headings — masthead, panel titles, section names |
| **Source Serif 4** | 400 / 600 | Body copy — sidebar text, notes, descriptions |
| **DM Mono** | 400 / 500 | Metadata — timestamps, implementation badges, edition bar, `.ctrl-input` labels |

Italic in Instrument Serif is used for the accented word in the masthead (`<em>Structures</em>`). Avoid mixing the mono face into prose.

---

## 12. Reusable Components

| Class | What it's for |
|-------|--------------|
| `.viz-dual` | Two-column canvas wrapper — abstract view left, impl view right |
| `.impl-view` | Container for the implementation-specific canvas pane |
| `.impl-section-label` | Small all-caps DM Mono label above an impl pane section |
| `.impl-info-row` | Horizontal row pairing a label with a value in the impl sidebar |
| `.impl-stat` | Monospaced stat chip (e.g. "size: 4") |
| `.ctrl-btn` | Primary operation button — accent background, triggers on Enter via global handler |
| `.impl-btn` | Implementation-switcher pill button; add `data-*-impl` attribute for the switcher to toggle `.active` |
| `.node-circle` | SVG `<circle>` + `<text>` combo for tree/graph nodes; gets `.highlight` class during animation |
| `.node-rect` | SVG `<rect>` + `<text>` combo for B-tree / rectangular node layouts |
| `.edge-line` | SVG `<line>` for edges; transitions position smoothly |
| `.empty-state` | Centred placeholder shown when a structure has no elements; contains an `.ornament` glyph |
| `.op-log` | Scrollable log column for operation history |
| `.log-entry` | Single log line with `.timestamp`, `.op`, and detail text |

---

## 13. The Global Enter Handler

From [app.js:397–403](app.js#L397-L403):

```js
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (!e.target.classList.contains('ctrl-input')) return;
  const btn = e.target.parentElement.querySelector('.ctrl-btn');
  if (btn) btn.click();
});
```

Any `<input class="ctrl-input">` whose parent element also contains a `<button class="ctrl-btn">` gets Enter-key submission for free. **Do not add per-module `keydown` handlers.** Structure your HTML so the input and its primary button share a direct parent element.

---

## 14. Trees Section

### `layoutBinaryTree`

The shared helper ([app.js:1624](app.js#L1624)) lays out any binary tree (BST, AVL, plain BT) using an in-order traversal for x-coordinates and depth for y-coordinates:

```js
function layoutBinaryTree(root, width, levelH, topPad) { ... }
```

It returns a `Map<node, {x, y}>`. Each in-order position maps to an evenly-spaced x slot; each depth level maps to `topPad + depth * levelH`. This handles arbitrary shapes including unbalanced trees.

**This formula does NOT generalise to the heap.** The heap renders its tree using the array-index formula `x = col * slotW + slotW/2`, `y = level * levelH + topPad` derived from the `1`-indexed heap structure. Applying `layoutBinaryTree` to the heap would produce wrong positions for a full/complete tree.

**B-Tree** uses a completely different horizontal layout: each node is a multi-key rectangle (`<m>NextId`-stamped, minimum degree `BTREE_T = 2`, so 1–3 keys per node), and children are positioned relative to their parent key gaps. Its layout logic lives inline in the B-Tree render section.

### Balance factor labels (AVL)

AVL nodes render a small balance-factor label (`bf: +1`, `bf: 0`, `bf: -1`) below each circle. This is computed during the post-order height pass in `_avlHeight`. The label uses the `.node-bf` class, coloured red when `|bf| > 1` to signal a violation.

### Node IDs in tree modules

Binary Tree, BST, AVL, and B-Tree each maintain a `<m>NextId` counter. When a new node is created, it receives `{ v, id: <m>NextId++, left: null, right: null }`. The `id` field is what gets passed inside `highlightSet` — render functions check `highlightSet.has(node.id)` to decide whether to apply the `.highlight` class.

---

## 15. Walkthrough: Adding a Trie Module

Follow these eight steps in order.

**Step 1 — Markup (`index.html`)**

Add a nav button and a panel div:

```html
<!-- in .nav-strip -->
<button class="nav-btn" data-panel="trie">Trie</button>

<!-- in main content area -->
<div class="panel" id="panel-trie">
  <div class="panel-header">
    <h2>Trie</h2>
  </div>
  <div class="viz-dual">
    <div class="canvas-area" id="trieCanvas"></div>
    <div class="impl-view" id="trieImplCanvas"></div>
  </div>
  <div class="ctrl-row">
    <input class="ctrl-input" id="trieInput" placeholder="word" />
    <button class="ctrl-btn" onclick="trieInsert()">insert</button>
    <button class="ctrl-btn" onclick="trieSearch()">search</button>
  </div>
  <div class="op-log" id="trieLog"></div>
</div>
```

**Step 2 — Sidebar data & monkey-patch (`app.js`)**

```js
sidebarData.trie = {
  description: 'A trie stores strings as paths from root to leaf...'
};

const _prevUpdateSidebar7 = updateSidebar;   // next in the numbering ladder
updateSidebar = function(panel) {
  if (panel !== 'trie') { _prevUpdateSidebar7(panel); return; }
  // build and inject sidebar HTML
  $('sidebarContent').innerHTML = `...`;
};
```

**Step 3 — State & metadata**

```js
let trieData = { children: {}, isEnd: false };  // root node
let trieImpl = 'array-map';
let trieAnimating = false;

const trieImplMeta = {
  'array-map': { label: 'Array map', note: '...', complexity: [...] },
  'hash-map':  { label: 'Hash map',  note: '...', complexity: [...] }
};
```

**Step 4 — Impl switcher**

```js
function setTrieImpl(type) {
  trieImpl = type;
  document.querySelectorAll('[data-trie-impl]').forEach(b => {
    b.classList.toggle('active', b.dataset.trieImpl === type);
  });
  updateSidebar('trie');
  renderTrie();
}
```

**Step 5 — Pure core algorithms**

Write functions that accept the trie root and return step arrays without touching the DOM or `trieData` directly:

```js
function trieInsertSteps(root, word) {
  const tmp = deepCloneTrie(root);
  const steps = [];
  let node = tmp;
  for (const ch of word) {
    if (!node.children[ch]) node.children[ch] = { children: {}, isEnd: false };
    steps.push({ char: ch, nodeId: /* stable id */ });
    node = node.children[ch];
  }
  node.isEnd = true;
  return steps;
}
```

**Step 6 — `renderTrie` and sub-renders**

```js
function renderTrie(highlightSet) {
  const c = $('trieCanvas');
  if (!trieData /* empty */) { c.innerHTML = TRIE_EMPTY; return; }
  // walk trieData, build SVG, apply .highlight to nodes in highlightSet
  c.innerHTML = `<svg ...>...</svg>`;
}
```

**Step 7 — Animation helpers**

```js
async function animateTrieInsert(steps) {
  for (const { char, nodeId } of steps) {
    renderTrie(new Set([nodeId]));
    await sleep(400);
  }
}
```

**Step 8 — Operations + init**

```js
async function trieInsert() {
  if (trieAnimating) return;
  const w = $('trieInput').value.trim();
  if (!w) return;
  trieAnimating = true;
  $('trieInput').value = '';
  const steps = trieInsertSteps(trieData, w);
  await animateTrieInsert(steps);
  log('trieLog', 'insert', `<span class="val">${w}</span> inserted`);
  renderTrie();
  trieAnimating = false;
}

setTrieImpl('array-map');  // ← always end with the init call
```

---

## 16. Don'ts

- **Don't add per-module Enter handlers.** The global handler at [app.js:397–403](app.js#L397-L403) covers all `.ctrl-input` + `.ctrl-btn` pairs automatically.
- **Don't use React, Vue, or any framework.** The app is a single HTML file opened directly in a browser. Introducing a framework requires a build step, which breaks the core UX contract.
- **Don't introduce new colour tokens without adding them to `:root` in `styles.css`.** Hard-coded hex values in component CSS defeat the design system and make theme changes painful.
- **Don't mutate `<m>Data` inside a step-computation function.** Always operate on a shadow copy (`[...arr]` or `deepClone`) and return a step array. Mutation happens only during replay in the animation helper.
- **Don't duplicate `.node-circle`, `.node-rect`, or `.edge-line` styles.** All SVG node and edge primitives reuse these classes. Adding module-specific duplicates creates specificity conflicts and maintenance burden.
- **Don't follow the Stack naming convention for new modules.** Stack's legacy names (`implType`, `implMeta`, `setImpl`) predate the standard. All new modules must use the `<m>Impl` / `<m>ImplMeta` / `set<Module>Impl` pattern.
- **Don't skip the `<m>NextId` counter for tree modules.** Node IDs are the only stable reference that links the live data structure to the SVG elements highlighted during animation. Without IDs, `highlightSet` lookups will not work correctly.
