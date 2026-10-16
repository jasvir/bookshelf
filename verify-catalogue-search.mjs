import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { BOOKS } from './catalog.js';

const source = (await readFile(new URL('./catalogue-search.js', import.meta.url), 'utf8'))
  .replace(/^export /m, '') + '\n;globalThis.createCatalogueSearch = createCatalogueSearch;';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function harness({ reduced = false, onApproach } = {}) {
  let now = 0, nextTimer = 0;
  const timers = new Map();
  class Element {
    constructor(id = '', tagName = 'div') {
      this.id = id; this.tagName = tagName; this.listeners = new Map(); this.attributes = new Map(id ? [['id', id]] : []); this.dataset = {};
      this.value = ''; this._textContent = ''; this.open = false; this.disabled = false; this.children = []; this.parentNode = null; this.rootConnected = false;
      this.classes = new Set();
      this.classList = { add: (...names) => names.forEach(name => this.classes.add(name)), remove: (...names) => names.forEach(name => this.classes.delete(name)), contains: name => this.classes.has(name), toggle: (name, force) => { const value = force ?? !this.classes.has(name); value ? this.classes.add(name) : this.classes.delete(name); return value; } };
      const properties = new Map();
      this.style = { setProperty(name, value) { properties.set(name, String(value)); }, getPropertyValue(name) { return properties.get(name) || ''; } };
    }
    get isConnected() { return this.rootConnected || !!this.parentNode?.isConnected; }
    get parentElement() { return this.parentNode; }
    get childNodes() { return this.children; }
    get textContent() { return this._textContent + this.children.map(child => child.textContent).join(''); }
    set textContent(value) { for (const child of this.children) child.parentNode = null; this.children = []; this._textContent = String(value); }
    get className() { return [...this.classes].join(' '); }
    set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    addEventListener(name, callback, options = {}) { const list = this.listeners.get(name) || []; list.push({ callback, once: options?.once }); this.listeners.set(name, list); }
    removeEventListener(name, callback) { this.listeners.set(name, (this.listeners.get(name) || []).filter(listener => listener.callback !== callback)); }
    dispatch(name, extra = {}) {
      const event = { target: this, defaultPrevented: false, propagationStopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, ...extra };
      for (const listener of [...this.listeners.get(name) || []]) { listener.callback(event); if (listener.once) this.removeEventListener(name, listener.callback); }
      return event;
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'id') this.id = String(value); if (name === 'class') this.className = value; }
    getAttribute(name) { return name === 'class' ? this.className : this.attributes.get(name) ?? null; }
    hasAttribute(name) { return name === 'class' ? !!this.classes.size : this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); if (name === 'id') this.id = ''; if (name === 'class') this.classes.clear(); }
    matches(selector) { return selector.split(',').some(part => { const value = part.trim(); if (value.startsWith('.')) return value.slice(1).split('.').every(name => this.classes.has(name)); if (value.startsWith('#')) return this.id === value.slice(1); const attribute = /^\[([^=\]]+)(?:="?([^"\]]*)"?)?\]$/.exec(value); if (attribute) return this.hasAttribute(attribute[1]) && (attribute[2] === undefined || this.getAttribute(attribute[1]) === attribute[2]); return value === '*' || this.tagName === value; }); }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
    appendChild(node) { this.append(node); return node; }
    insertBefore(node, reference) { node.remove(); const index = this.children.indexOf(reference); if (index < 0) this.children.push(node); else this.children.splice(index, 0, node); node.parentNode = this; return node; }
    before(node) { this.parentNode?.insertBefore(node, this); }
    after(node) { if (!this.parentNode) return; const parent = this.parentNode, index = parent.children.indexOf(this); node.remove(); parent.children.splice(index + 1, 0, node); node.parentNode = parent; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
    cloneNode(deep = false) { const copy = new Element(this.id, this.tagName); for (const [name, value] of this.attributes) copy.setAttribute(name, value); copy.className = this.className; copy.dataset = { ...this.dataset }; copy._textContent = this._textContent; copy.disabled = this.disabled; if (deep) for (const child of this.children) copy.append(child.cloneNode(true)); return copy; }
    getBoundingClientRect() { return this.id === 'catalogue-form' ? { top: 290, left: 20, width: 350, height: 99 } : { top: 0, left: 0, width: 380, height: 410, right: 380, bottom: 410 }; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const names = ['catalogue-search', 'catalogue-query', 'catalogue-form', 'catalogue-result', 'catalogue-result-title', 'catalogue-result-author', 'catalogue-result-original', 'catalogue-result-number', 'catalogue-status', 'search-btn', 'catalogue-close'];
  const elements = Object.fromEntries(names.map(name => [name, new Element(name)]));
  const tray = new Element('', 'div'); tray.className = 'catalogue-tray';
  elements['catalogue-search'].rootConnected = true; elements['search-btn'].rootConnected = true;
  elements['catalogue-result'].tagName = 'button'; elements['catalogue-result'].className = 'catalogue-result';
  for (const name of ['number', 'title', 'author', 'original']) elements['catalogue-result'].append(elements[`catalogue-result-${name}`]);
  tray.append(elements['catalogue-result'], elements['catalogue-form']); elements['catalogue-form'].append(elements['catalogue-query']);
  elements['catalogue-search'].append(tray, elements['catalogue-close'], elements['catalogue-status']);
  const document = { getElementById: name => elements[name], activeElement: elements['search-btn'] };
  const window = new Element('window');
  const media = new Element('media'); media.matches = reduced;
  Object.assign(window, { innerWidth: 900, innerHeight: 800, matchMedia: () => media, visualViewport: null });
  const events = { choices: [], cancels: 0, announcements: [] };
  const context = vm.createContext({ document, window, console, setTimeout(callback, delay = 0) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; }, clearTimeout: id => timers.delete(id) });
  vm.runInContext(source, context, { filename: 'catalogue-search.js' });
  const controller = context.createCatalogueSearch({ books: BOOKS, onApproach: onApproach || (async () => ({ x: 300, y: 450, width: 350, height: 90 })), onChoose: id => { events.choices.push(id); }, onCancel: () => { events.cancels++; }, announce: text => events.announcements.push(text) });
  const get = name => elements[`catalogue-${name}`];
  async function advance(amount) {
    const end = now + amount;
    for (;;) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      now = due[1].at; timers.delete(due[0]); due[1].callback(); await flush();
    }
    now = end; await flush();
  }
  function type(value) { get('query').value = value; get('query').dispatch('input'); }
  return { controller, get, events, advance, type, document, window, timers, tray, media, ghosts: () => tray.querySelectorAll('.catalogue-departing-card') };
}

const cases = [];
async function test(name, run) { await run(); cases.push(name); console.log(`✓ ${name}`); }
const alphabeticalCards = BOOKS.map((book, id) => ({ book, id })).sort((a, b) => new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare(a.book.title, b.book.title) || a.id - b.id);
const authorCards = author => alphabeticalCards.filter(entry => entry.book.author === author);
const currentCardId = h => Number(h.get('result-number').textContent.match(/\d+/)?.[0]) - 1;
const pressArrow = (h, key, extra = {}, target = 'query') => h.get(target).dispatch('keydown', { key, ...extra });

await test('Empty drawer shows the first alphabetical book and focuses its label', async () => {
  const h = harness(); await h.controller.open();
  const expected = BOOKS.map((book, id) => ({ book, id })).sort((a, b) => new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare(a.book.title, b.book.title) || a.id - b.id)[0];
  assert.equal(h.get('result-title').textContent, expected.book.title);
  assert.equal(h.document.activeElement, h.get('query'));
  assert.equal(h.get('search').open, true);
  await h.controller.close({ reason: 'navigation' });
});

await test('Original titles, pun titles and accented or punctuated authors match', async () => {
  const h = harness(); await h.controller.open();
  for (const [query, expected] of [['GREAT GATSBY', 'The Great Catsby'], ['Great Catsby', 'The Great Catsby'], ['Gabriel Garcia Marquez', 'One Hundred Years of Soli-tea'], ['J. R. R. Tolkien', null]]) {
    h.type(query);
    assert.equal(h.get('result').disabled, false, query);
    if (expected) assert.equal(h.get('result-title').textContent, expected, query);
    else assert.match(h.get('result-author').textContent, /Tolkien/);
  }
  await h.controller.close({ reason: 'navigation' });
});

await test('Ambiguous author search chooses the first alphabetical matching title', async () => {
  const h = harness(); await h.controller.open(); h.type('Jane Austen');
  const expected = BOOKS.filter(book => book.author === 'Jane Austen').sort((a, b) => new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare(a.title, b.title))[0];
  assert.equal(h.get('result-title').textContent, expected.title);
  await h.controller.close({ reason: 'navigation' });
});

await test('Up and Down browse every matching author card alphabetically and wrap at both ends', async () => {
  const h = harness({ reduced: true }), expected = authorCards('Jane Austen'); assert.ok(expected.length > 2);
  await h.controller.open(); h.type('Jane Austen');
  assert.equal(currentCardId(h), expected[0].id);
  const previous = pressArrow(h, 'ArrowUp');
  assert.equal(previous.defaultPrevented, true); assert.equal(previous.propagationStopped, true); assert.equal(currentCardId(h), expected.at(-1).id);
  pressArrow(h, 'ArrowDown'); assert.equal(currentCardId(h), expected[0].id);
  for (let index = 1; index <= expected.length; index++) {
    const event = pressArrow(h, 'ArrowDown'); assert.equal(event.defaultPrevented, true);
    assert.equal(currentCardId(h), expected[index % expected.length].id);
    assert.equal(h.get('query').value, 'Jane Austen'); assert.equal(h.document.activeElement, h.get('query'));
  }
  await h.advance(0); assert.match(h.get('status').textContent, new RegExp(`Card 1 of ${expected.length} matches`)); assert.match(h.get('status').textContent, /Up and Down/);
  await h.controller.close({ reason: 'navigation' });
});

await test('An empty label browses all 600 catalogue titles without changing the input', async () => {
  const h = harness({ reduced: true }); await h.controller.open(); assert.equal(alphabeticalCards.length, 600);
  const visited = new Set([currentCardId(h)]);
  for (let index = 1; index <= alphabeticalCards.length; index++) {
    pressArrow(h, 'ArrowDown'); const expected = alphabeticalCards[index % alphabeticalCards.length];
    assert.equal(currentCardId(h), expected.id, `alphabetical card ${index % alphabeticalCards.length + 1}`);
    assert.equal(h.get('result-title').textContent, expected.book.title); assert.equal(h.get('query').value, ''); visited.add(currentCardId(h));
  }
  assert.equal(visited.size, BOOKS.length); assert.equal(h.document.activeElement, h.get('query'));
  pressArrow(h, 'ArrowUp'); assert.equal(currentCardId(h), alphabeticalCards.at(-1).id);
  await h.advance(0); assert.match(h.get('status').textContent, /Card 600 of 600/);
  await h.controller.close({ reason: 'navigation' });
});

await test('Editing the query resets its browsing cursor to the first match', async () => {
  const h = harness({ reduced: true }), expected = authorCards('Jane Austen'); await h.controller.open(); h.type('Jane Austen');
  pressArrow(h, 'ArrowDown'); pressArrow(h, 'ArrowDown'); assert.equal(currentCardId(h), expected[2].id);
  h.type('Jane Auste'); assert.equal(currentCardId(h), expected[0].id); await h.advance(0);
  assert.match(h.get('status').textContent, new RegExp(`Card 1 of ${expected.length} matches`));
  pressArrow(h, 'ArrowUp'); assert.equal(currentCardId(h), expected.at(-1).id);
  h.type('Hamlet'); assert.equal(h.get('result-title').textContent, 'Hamlet and Cheese');
  h.type('Jane Austen'); assert.equal(currentCardId(h), expected[0].id);
  await h.controller.close({ reason: 'navigation' });
});

await test('Rapid arrow browsing keeps one outgoing card and restarts the one-second quiet raise', async () => {
  const h = harness(), expected = authorCards('Jane Austen'); await h.controller.open(); h.type('Jane Austen'); await h.advance(340);
  let index = 0, firstGhost;
  for (let count = 0; count < 25; count++) {
    const oldTitle = expected[index].book.title; pressArrow(h, 'ArrowDown'); index = (index + 1) % expected.length;
    assert.equal(currentCardId(h), expected[index].id); assert.equal(h.ghosts().length, 1); assert.ok(h.ghosts()[0].textContent.includes(oldTitle));
    if (!firstGhost) firstGhost = h.ghosts()[0];
  }
  const latestGhost = h.ghosts()[0]; firstGhost.dispatch('animationend', { animationName: 'catalogue-card-away' }); assert.equal(h.ghosts()[0], latestGhost);
  await h.advance(999); assert.equal(h.ghosts().length, 0); assert.equal(h.get('search').classList.contains('is-raised'), false);
  await h.advance(1); assert.equal(h.get('search').classList.contains('is-raised'), true);
  assert.match(h.get('status').textContent, new RegExp(`Card ${index + 1} of ${expected.length} matches`)); assert.ok(h.get('status').textContent.includes(expected[index].book.title));
  assert.equal(h.get('query').value, 'Jane Austen'); await h.controller.close({ reason: 'navigation' });
});

await test('Enter selects the browsed card rather than the first matching title', async () => {
  const h = harness(), expected = authorCards('Jane Austen'); await h.controller.open(); h.type('Jane Austen');
  pressArrow(h, 'ArrowDown'); pressArrow(h, 'ArrowDown'); assert.equal(currentCardId(h), expected[2].id);
  h.get('form').dispatch('submit'); assert.equal(h.ghosts().length, 0);
  await h.advance(280); assert.deepEqual(h.events.choices, [expected[2].id]); assert.equal(h.get('search').open, false);
});

await test('Arrow keys on a focused result preserve its focus and clicking selects that card', async () => {
  const h = harness({ reduced: true }), expected = authorCards('Jane Austen'); await h.controller.open(); h.type('Jane Austen'); h.get('result').focus();
  const event = pressArrow(h, 'ArrowDown', {}, 'result'); assert.equal(event.defaultPrevented, true); assert.equal(event.propagationStopped, true);
  assert.equal(currentCardId(h), expected[1].id); assert.equal(h.document.activeElement, h.get('result')); assert.equal(h.get('query').value, 'Jane Austen');
  h.get('result').dispatch('click'); await flush(); assert.deepEqual(h.events.choices, [expected[1].id]);
});

await test('Modified, composing, already handled, and horizontal arrows do not change the card', async () => {
  const h = harness(); await h.controller.open(); h.type('Jane Austen'); await h.advance(340); const before = currentCardId(h);
  for (const extra of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
    const event = pressArrow(h, 'ArrowDown', extra);
    assert.equal(currentCardId(h), before); assert.equal(h.ghosts().length, 0); assert.equal(event.defaultPrevented, !!extra.defaultPrevented); assert.equal(event.propagationStopped, false);
  }
  for (const key of ['ArrowLeft', 'ArrowRight']) { const event = pressArrow(h, key); assert.equal(event.defaultPrevented, false); assert.equal(currentCardId(h), before); }
  h.get('query').dispatch('compositionstart'); const composing = pressArrow(h, 'ArrowUp'); assert.equal(composing.defaultPrevented, false); assert.equal(currentCardId(h), before);
  h.get('query').dispatch('compositionend'); await h.controller.close({ reason: 'navigation' });
});

await test('No-match arrows cannot restore or choose a stale matching card', async () => {
  const h = harness(); await h.controller.open(); h.type('Jane Austen'); pressArrow(h, 'ArrowDown'); h.type('zxqv no such book'); await h.advance(340);
  const before = h.get('result-title').textContent;
  for (const key of ['ArrowUp', 'ArrowDown']) { const event = pressArrow(h, key); assert.equal(event.defaultPrevented, false); assert.equal(h.get('result-title').textContent, before); }
  assert.equal(h.get('result').disabled, true); assert.equal(h.ghosts().length, 0);
  h.get('form').dispatch('submit'); await h.advance(1200); assert.deepEqual(h.events.choices, []);
  await h.controller.close({ reason: 'navigation' });
});

await test('A single-match arrow prevents scrolling without retriggering its card animation', async () => {
  const h = harness(); await h.controller.open(); h.type('Great Catsby'); await h.advance(340); const before = currentCardId(h);
  for (const key of ['ArrowUp', 'ArrowDown']) { const event = pressArrow(h, key); assert.equal(event.defaultPrevented, true); assert.equal(currentCardId(h), before); assert.equal(h.ghosts().length, 0); }
  assert.equal(h.get('result').classList.contains('is-arriving'), false); await h.controller.close({ reason: 'navigation' });
});

await test('One second of quiet raises a card; new input restarts the timer', async () => {
  const h = harness(); await h.controller.open(); h.type('gatsby');
  await h.advance(700); assert.equal(h.get('search').classList.contains('is-raised'), false);
  h.type('hamlet'); await h.advance(999); assert.equal(h.get('search').classList.contains('is-raised'), false);
  await h.advance(1); assert.equal(h.get('search').classList.contains('is-raised'), true);
  assert.match(h.get('status').textContent, /Hamlet and Cheese/);
  await h.controller.close({ reason: 'navigation' }); await h.advance(2000);
  assert.equal(h.get('status').textContent, ''); assert.equal(h.timers.size, 0);
});

await test('Changing a match keeps the old card visible while a distinct new card arrives', async () => {
  const h = harness(); await h.controller.open(); await h.advance(420);
  const previous = h.get('result-title').textContent;
  h.type('Great Gatsby');
  assert.equal(h.get('result-title').textContent, 'The Great Catsby');
  assert.equal(h.get('result').classList.contains('is-arriving'), true);
  assert.equal(h.ghosts().length, 1);
  const oldCard = h.ghosts()[0];
  assert.ok(oldCard.textContent.includes(previous), 'old lettering remains on the departing paper');
  assert.ok(!oldCard.textContent.includes('The Great Catsby'), 'old card did not inherit the new lettering');
  assert.equal(oldCard.classList.contains('is-departing'), true);
  assert.equal(oldCard.disabled, true); assert.equal(oldCard.getAttribute('aria-hidden'), 'true');
  assert.equal(oldCard.getAttribute('tabindex'), '-1'); assert.equal(oldCard.hasAttribute('inert'), true);
  assert.equal(oldCard.hasAttribute('id'), false); assert.equal(oldCard.querySelectorAll('[id]').length, 0);
  assert.equal(oldCard.hasAttribute('aria-label'), false);
  assert.match(oldCard.style.getPropertyValue('--catalogue-depart-from'), /-28px/, 'raised card starts its departure from the raised pose');
  await h.controller.close({ reason: 'navigation' });
});

await test('Only the outgoing card animation finishes a card change', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby');
  const oldCard = h.ghosts()[0];
  oldCard.dispatch('animationend', { animationName: 'catalogue-card-arrive' });
  oldCard.dispatch('animationend', { target: oldCard.children[0], animationName: 'catalogue-card-away' });
  assert.equal(h.ghosts().length, 1); assert.equal(h.get('result').classList.contains('is-arriving'), true);
  oldCard.dispatch('animationend', { animationName: 'catalogue-card-away' });
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  assert.equal(oldCard.isConnected, false);
  await h.controller.close({ reason: 'navigation' });
});

await test('Rapid typing retains only the immediately previous card and ignores late animation events', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby');
  const firstGhost = h.ghosts()[0]; await h.advance(100); h.type('Hamlet');
  assert.equal(h.ghosts().length, 1); const currentGhost = h.ghosts()[0]; assert.notEqual(currentGhost, firstGhost);
  assert.equal(firstGhost.isConnected, false); assert.ok(currentGhost.textContent.includes('The Great Catsby'));
  assert.equal(h.get('result-title').textContent, 'Hamlet and Cheese');
  firstGhost.dispatch('animationend', { animationName: 'catalogue-card-away' });
  firstGhost.dispatch('animationcancel', { animationName: 'catalogue-card-away' });
  assert.equal(h.ghosts()[0], currentGhost); assert.equal(h.get('result').classList.contains('is-arriving'), true);
  await h.advance(240); assert.equal(h.ghosts()[0], currentGhost, 'the previous fallback cannot remove the latest card');
  await h.advance(99); assert.equal(h.ghosts().length, 1);
  await h.advance(1); assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.controller.close({ reason: 'navigation' });
});

await test('An animation cancellation removes its outgoing card and cancels its fallback', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby');
  const oldCard = h.ghosts()[0]; oldCard.dispatch('animationcancel', { animationName: 'catalogue-card-away' });
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.advance(340); assert.equal(h.ghosts().length, 0); assert.equal(h.get('result-title').textContent, 'The Great Catsby');
  await h.controller.close({ reason: 'navigation' });
});

await test('Keeping the same matching title does not turn another card but restarts its quiet timer', async () => {
  const h = harness(); await h.controller.open(); h.type('Great Gatsby'); await h.advance(600);
  h.type('Great Catsby'); assert.equal(h.get('result-title').textContent, 'The Great Catsby');
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.advance(999); assert.equal(h.get('search').classList.contains('is-raised'), false);
  await h.advance(1); assert.equal(h.get('search').classList.contains('is-raised'), true);
  await h.controller.close({ reason: 'navigation' });
});

await test('Enter during incoming motion selects the latest match and clears both animated cards first', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby'); h.type('Hamlet');
  assert.equal(h.ghosts().length, 1); assert.equal(h.get('result').classList.contains('is-arriving'), true);
  h.get('form').dispatch('submit');
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.advance(280);
  assert.deepEqual(h.events.choices, [BOOKS.findIndex(book => book.title === 'Hamlet and Cheese')]);
  assert.equal(h.get('search').open, false);
});

await test('No match disables the card and Enter cannot choose a stale result', async () => {
  const h = harness(); await h.controller.open(); h.type('zxqv no such book');
  assert.equal(h.get('result').disabled, true);
  h.get('form').dispatch('submit'); await h.advance(1200);
  assert.deepEqual(h.events.choices, []);
  assert.match(h.get('status').textContent, /No matching book/);
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.controller.close({ reason: 'navigation' });
});

await test('Closing and reopening discard departing cards, listeners, and animation timers', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby');
  const oldCard = h.ghosts()[0]; await h.controller.close({ reason: 'navigation' });
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false); assert.equal(h.timers.size, 0);
  await h.controller.open(); h.type('Hamlet'); const currentGhost = h.ghosts()[0];
  oldCard.dispatch('animationend', { animationName: 'catalogue-card-away' });
  assert.equal(h.ghosts()[0], currentGhost, 'old-session animation cannot remove the new session card');
  await h.controller.close({ reason: 'navigation' }); await h.advance(2000); assert.equal(h.ghosts().length, 0); assert.equal(h.timers.size, 0);
});

await test('IME composition suppresses Enter and delays searching until committed', async () => {
  const h = harness(); await h.controller.open();
  h.get('query').dispatch('compositionstart'); h.type('Hamlet');
  const event = h.get('query').dispatch('keydown', { key: 'Enter', isComposing: true });
  assert.equal(event.defaultPrevented, true);
  h.get('form').dispatch('submit'); await h.advance(1200); assert.deepEqual(h.events.choices, []);
  h.get('query').dispatch('compositionend'); assert.equal(h.get('result-title').textContent, 'Hamlet and Cheese');
  await h.controller.close({ reason: 'navigation' });
});

await test('IME composition cancels a running card turn before starting the committed match', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby'); assert.equal(h.ghosts().length, 1);
  h.get('query').dispatch('compositionstart'); assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  h.type('Hamlet'); await h.advance(1200); assert.equal(h.get('result-title').textContent, 'The Great Catsby'); assert.equal(h.get('search').classList.contains('is-raised'), false);
  h.get('query').dispatch('compositionend'); assert.equal(h.get('result-title').textContent, 'Hamlet and Cheese'); assert.equal(h.ghosts().length, 1);
  assert.ok(h.ghosts()[0].textContent.includes('The Great Catsby'));
  await h.controller.close({ reason: 'navigation' });
});

await test('Choosing closes the drawer before calling onChoose and calls it once', async () => {
  const h = harness(); await h.controller.open(); h.type('Great Gatsby');
  h.get('result').dispatch('click'); h.get('form').dispatch('submit');
  await h.advance(279); assert.deepEqual(h.events.choices, []); assert.equal(h.get('search').open, true);
  await h.advance(1); assert.equal(h.get('search').open, false);
  assert.deepEqual(h.events.choices, [BOOKS.findIndex(book => book.title === 'The Great Catsby')]);
  assert.equal(h.events.cancels, 0);
});

await test('Navigation interrupts an animated choice without a late book flight', async () => {
  const h = harness(); await h.controller.open(); h.type('Hamlet'); h.get('result').dispatch('click');
  await h.controller.close({ reason: 'navigation', restoreFocus: false }); await h.advance(500);
  assert.equal(h.controller.isOpen, false); assert.deepEqual(h.events.choices, []); assert.equal(h.events.cancels, 0);
});

await test('Escape during a choice cancels once and returns focus to Search', async () => {
  const h = harness(); await h.controller.open(); h.type('Hamlet'); h.get('result').dispatch('click');
  assert.equal(h.get('search').dispatch('cancel').defaultPrevented, true);
  await h.advance(280); assert.deepEqual(h.events.choices, []); assert.equal(h.events.cancels, 1);
  assert.equal(h.document.activeElement.id, 'search-btn');
});

await test('Escape in a nonempty search field closes on the first press and restores focus', async () => {
  const h = harness(); await h.controller.open(); h.type('Hamlet');
  const event = h.get('query').dispatch('keydown', { key: 'Escape', isComposing: false });
  assert.equal(event.defaultPrevented, true); assert.equal(event.propagationStopped, true);
  await h.advance(280);
  assert.equal(h.get('search').open, false); assert.equal(h.controller.isOpen, false);
  assert.equal(h.events.cancels, 1); assert.deepEqual(h.events.choices, []);
  assert.equal(h.document.activeElement.id, 'search-btn');
});

await test('Escape leaves an active IME composition to its native input behavior', async () => {
  const h = harness(); await h.controller.open(); h.get('query').dispatch('compositionstart');
  const event = h.get('query').dispatch('keydown', { key: 'Escape', isComposing: true });
  assert.equal(event.defaultPrevented, false); assert.equal(event.propagationStopped, false);
  assert.equal(h.get('search').open, true); assert.equal(h.events.cancels, 0);
  await h.controller.close({ reason: 'navigation' });
});

await test('Cancelled camera approach cannot reopen its drawer on late completion', async () => {
  const approach = deferred(); const h = harness({ onApproach: () => approach.promise });
  const opening = h.controller.open(); assert.equal(h.controller.isOpen, true);
  await h.controller.close({ reason: 'navigation' });
  approach.resolve({ x: 1, y: 1, width: 100, height: 50 }); await opening;
  assert.equal(h.get('search').open, false); assert.equal(h.controller.isOpen, false);
});

await test('An aborted or unavailable approach closes silently', async () => {
  for (const onApproach of [async () => null, async () => { const error = new Error('Interrupted'); error.name = 'AbortError'; throw error; }]) {
    const h = harness({ onApproach }); await h.controller.open();
    assert.equal(h.controller.isOpen, false); assert.equal(h.get('search').open, false); assert.deepEqual(h.events.announcements, []);
  }
});

await test('A stale approach error cannot cancel a newer open drawer', async () => {
  const first = deferred(); let count = 0;
  const h = harness({ onApproach: () => ++count === 1 ? first.promise : Promise.resolve({ x: 200, y: 400, width: 300, height: 90 }) });
  const stale = h.controller.open(); await h.controller.close({ reason: 'navigation' }); await h.controller.open();
  first.reject(new Error('Old approach failed')); await stale;
  assert.equal(h.get('search').open, true); assert.deepEqual(h.events.announcements, []);
  await h.controller.close({ reason: 'navigation' });
});

await test('Reduced motion opens and closes without animation delays', async () => {
  const h = harness({ reduced: true }); await h.controller.open(); h.type('Gatsby'); await h.advance(0);
  assert.equal(h.get('search').classList.contains('is-raised'), true);
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  h.get('result').dispatch('click'); await flush(); assert.equal(h.controller.isOpen, false); assert.equal(h.events.choices.length, 1);
});

await test('Changing to reduced motion immediately removes a running card turn', async () => {
  const h = harness(); await h.controller.open(); h.type('Gatsby'); const oldCard = h.ghosts()[0];
  h.media.matches = true; h.media.dispatch('change', { matches: true });
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  oldCard.dispatch('animationend', { animationName: 'catalogue-card-away' });
  h.type('Hamlet'); await h.advance(0);
  assert.equal(h.get('result-title').textContent, 'Hamlet and Cheese'); assert.equal(h.ghosts().length, 0); assert.equal(h.get('search').classList.contains('is-raised'), true);
  await h.controller.close({ reason: 'navigation' }); await h.advance(2000); assert.equal(h.timers.size, 0);
});

await test('Page hide clears the open drawer and all pending timers immediately', async () => {
  const h = harness(); await h.controller.open(); h.type('Hamlet'); h.window.dispatch('pagehide'); await flush();
  assert.equal(h.get('search').open, false); assert.equal(h.controller.isOpen, false);
  assert.equal(h.ghosts().length, 0); assert.equal(h.get('result').classList.contains('is-arriving'), false);
  await h.advance(2000); assert.equal(h.timers.size, 0); assert.deepEqual(h.events.choices, []);
});

console.log(`\n${cases.length} catalogue controller checks passed.`);
