import assert from 'node:assert/strict';
import test from 'node:test';
import { createDetailTransitions } from './detail-transitions.js';

// Exercise real transition ownership and SVG references without a browser or dependencies.
// Native SVG painting and CSS interpolation are covered by the browser checks.
class SVGNode extends EventTarget {
  constructor(name = 'g') {
    super();
    this.localName = name;
    this.nodeType = 1;
    this.parentNode = null;
    this.children = [];
    this.values = new Map();
    const tokens = () => (this.getAttribute('class') || '').split(/\s+/u).filter(Boolean);
    this.classList = {
      contains: name => tokens().includes(name),
      add: (...names) => this.setAttribute('class', [...new Set([...tokens(), ...names])].join(' ')),
      remove: (...names) => this.setAttribute('class', tokens().filter(name => !names.includes(name)).join(' ')),
      toggle: (name, force) => {
        const add = force ?? !tokens().includes(name);
        add ? this.classList.add(name) : this.classList.remove(name);
        return add;
      }
    };
    this.style = {
      setProperty: (name, value) => {
        const declarations = (this.getAttribute('style') || '').split(';').filter(text => text.trim());
        const filtered = declarations.filter(text => text.slice(0, text.indexOf(':')).trim() !== name);
        this.setAttribute('style', [...filtered, `${name}: ${value}`].join('; '));
      },
      getPropertyValue: name => {
        const declaration = (this.getAttribute('style') || '').split(';').find(text => text.slice(0, text.indexOf(':')).trim() === name);
        return declaration ? declaration.slice(declaration.indexOf(':') + 1).trim() : '';
      },
      removeProperty: name => {
        const value = this.style.getPropertyValue(name);
        const declarations = (this.getAttribute('style') || '').split(';').filter(text => text.trim() && text.slice(0, text.indexOf(':')).trim() !== name);
        this.setAttribute('style', declarations.join('; '));
        return value;
      }
    };
  }
  get parentElement() { return this.parentNode; }
  get ownerDocument() { return globalThis.document; }
  get childNodes() { return this.children; }
  get isConnected() { return this.localName === 'svg-document' || Boolean(this.parentNode?.isConnected); }
  get id() { return this.getAttribute('id') || ''; }
  set id(value) { this.setAttribute('id', value); }
  get attributes() {
    return [...this.values].map(([name, value]) => ({ name, value, localName: name.split(':').at(-1), namespaceURI: name.startsWith('xlink:') ? 'http://www.w3.org/1999/xlink' : null }));
  }
  getAttribute(name) { return this.values.get(name) ?? null; }
  getAttributeNames() { return [...this.values.keys()]; }
  getAttributeNS(namespace, name) { return this.getAttribute(namespace === 'http://www.w3.org/1999/xlink' ? `xlink:${name}` : name); }
  hasAttribute(name) { return this.values.has(name); }
  setAttribute(name, value) { this.values.set(name, String(value)); }
  setAttributeNS(namespace, name, value) { this.setAttribute(name, value); }
  removeAttribute(name) { this.values.delete(name); }
  removeAttributeNS(namespace, name) { this.removeAttribute(namespace === 'http://www.w3.org/1999/xlink' ? `xlink:${name}` : name); }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  appendChild(node) {
    node.remove();
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  removeChild(node) {
    this.children = this.children.filter(child => child !== node);
    node.parentNode = null;
    return node;
  }
  remove() { this.parentNode?.removeChild(this); }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  querySelectorAll(selector) {
    const nodes = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
    if (selector === '*') return nodes;
    if (selector === '[id]') return nodes.filter(node => node.hasAttribute('id'));
    if (selector === '[href]') return nodes.filter(node => node.hasAttribute('href'));
    if (selector.startsWith('#')) return nodes.filter(node => node.id === selector.slice(1));
    throw new Error(`Unexpected selector in transition tests: ${selector}`);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

function svg(name = 'g', attributes = {}, ...children) {
  const node = new SVGNode(name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

async function harness(run) {
  const names = ['document', 'setTimeout', 'clearTimeout', 'performance'];
  const descriptors = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const root = new SVGNode('svg-document');
  const timers = new Map();
  let serial = 0, now = 0;
  const assign = (name, value) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  assign('document', {
    documentElement: root,
    createElementNS: (namespace, name) => new SVGNode(name),
    getElementById: id => root.id === id ? root : root.querySelector(`#${id}`),
    querySelectorAll: selector => root.querySelectorAll(selector)
  });
  assign('setTimeout', (callback, delay = 0) => {
    const id = ++serial;
    timers.set(id, { callback, due: now + delay });
    return id;
  });
  assign('clearTimeout', id => timers.delete(id));
  assign('performance', { now: () => now });
  const advance = milliseconds => {
    const target = now + milliseconds;
    while (true) {
      const ready = [...timers].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
      if (!ready) break;
      const [id, timer] = ready;
      now = timer.due;
      timers.delete(id);
      timer.callback();
    }
    now = target;
  };
  const animateEnd = (node, name) => {
    const event = new Event('animationend');
    if (name) Object.defineProperty(event, 'animationName', { value: name });
    Object.defineProperty(event, 'timeStamp', { value: now });
    node.dispatchEvent(event);
  };
  try { await run({ root, timers, advance, animateEnd }); }
  finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

const count = node => 1 + node.querySelectorAll('*').length;
const attributes = node => Object.fromEntries(node.values);

test('reservation namespaces local SVG references across both layers while preserving global references', async () => {
  await harness(async h => {
    const clip = svg('clipPath', { id: 'room-clip' }, svg('path', { d: 'M0 0H10V10Z' }));
    const label = svg('title', { id: 'book-label' });
    const shape = svg('path', { fill: 'url(#wood)', 'clip-path': 'url(#room-clip)' });
    const staticRoot = svg('g', { id: 'tile', class: 'tile  shelves', 'aria-hidden': 'false' }, clip, label, shape);
    const actor = svg('use', {
      id: 'mouse', href: '#room-clip', 'xlink:href': '#book-label',
      'aria-labelledby': 'book-label  global-label', 'aria-describedby': 'global-label book-label',
      'aria-controls': 'room-clip global-control', 'aria-owns': 'mouse global-owner',
      style: "clip-path: url( '#room-clip' ); fill: url(#wood)",
      'data-external': 'https://example.test/#room-clip'
    });
    const motionRoot = svg('g', { id: 'motion', class: 'moving' }, actor);
    h.root.append(svg('pattern', { id: 'wood' }), svg('title', { id: 'global-label' }), staticRoot, motionRoot);
    const originals = [staticRoot, clip, label, shape, motionRoot, actor].map(attributes);
    const manager = createDetailTransitions();
    const handle = manager.reserve({ outgoing: [staticRoot, motionRoot], owner: 'tile' });
    assert.ok(handle);
    assert.notEqual(clip.id, 'room-clip');
    assert.notEqual(label.id, 'book-label');
    assert.equal(shape.getAttribute('fill'), 'url(#wood)');
    assert.match(shape.getAttribute('clip-path'), new RegExp(`#${clip.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.equal(actor.getAttribute('href'), `#${clip.id}`);
    assert.equal(actor.getAttribute('xlink:href'), `#${label.id}`);
    assert.ok(actor.getAttribute('aria-labelledby').includes(label.id));
    assert.ok(actor.getAttribute('aria-labelledby').includes('global-label'));
    assert.ok(actor.getAttribute('aria-describedby').includes(label.id));
    assert.ok(actor.getAttribute('aria-controls').includes(clip.id));
    assert.ok(actor.getAttribute('aria-controls').includes('global-control'));
    assert.ok(actor.getAttribute('aria-owns').includes(actor.id));
    assert.ok(actor.getAttribute('aria-owns').includes('global-owner'));
    assert.ok(actor.getAttribute('style').includes(`#${clip.id}`));
    assert.ok(actor.getAttribute('style').includes('url(#wood)'));
    assert.equal(actor.getAttribute('data-external'), 'https://example.test/#room-clip');
    assert.equal(staticRoot.classList.contains('detail-outgoing'), true);
    assert.equal(staticRoot.getAttribute('pointer-events'), 'none');
    assert.equal(motionRoot.getAttribute('aria-hidden'), 'true');
    assert.equal(manager.activeCount, 1);
    assert.equal(manager.retainedNodes, count(staticRoot) + count(motionRoot));
    handle.finish();
    [staticRoot, clip, label, shape, motionRoot, actor].forEach((node, index) => assert.deepEqual(attributes(node), originals[index]));
    assert.equal(staticRoot.isConnected, false);
    assert.equal(motionRoot.isConnected, false);
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
  });
});

test('incoming can attach original IDs immediately, and outgoing roots are detached and restored before callbacks', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'tile', class: 'original  shelf', 'aria-hidden': 'false' }, svg('path', { id: 'spine' }));
    const motion = svg('g', { class: 'old-motion' });
    h.root.append(outgoing, motion);
    const before = attributes(outgoing);
    const events = [];
    let manager;
    manager = createDetailTransitions({ onFinish() {
      events.push('manager');
      assert.equal(manager.activeCount, 0);
      assert.equal(manager.retainedNodes, 0);
    } });
    const handle = manager.reserve({ outgoing: [outgoing, motion], owner: 'tile', onFinish() {
      events.push('tile');
      assert.equal(outgoing.parentNode, null, 'Detach before restoring IDs used by incoming artwork.');
      assert.deepEqual(attributes(outgoing), before);
      assert.equal(motion.hasAttribute('aria-hidden'), false);
      assert.equal(outgoing.children[0].id, 'spine');
    } });
    const incoming = svg('g', { id: 'tile', class: 'fresh shelf' }, svg('path', { id: 'spine' }));
    const incomingMotion = svg('g', { class: 'fresh-motion' });
    h.root.append(incoming, incomingMotion);
    const liveIDs = h.root.querySelectorAll('[id]').map(node => node.id);
    assert.equal(new Set(liveIDs).size, liveIDs.length, 'Namespacing precedes insertion of replacement IDs.');
    handle.start([incoming, incomingMotion]);
    assert.equal(incoming.classList.contains('detail-incoming'), true);
    assert.equal(incomingMotion.classList.contains('detail-incoming'), true);
    h.advance(240);
    assert.equal(manager.activeCount, 0);
    assert.equal(incoming.classList.contains('detail-incoming'), false);
    assert.equal(incomingMotion.classList.contains('detail-incoming'), false);
    assert.equal(incoming.isConnected, true);
    assert.equal(incomingMotion.isConnected, true);
    assert.equal(events.length, 2);
    assert.deepEqual(new Set(events), new Set(['tile', 'manager']));
    assert.equal(h.timers.size, 0);
  });
});

test('disabled transitions leave artwork unchanged and never retain roots', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'original', class: 'shelf', 'aria-hidden': 'false' });
    h.root.append(outgoing);
    const before = attributes(outgoing);
    const manager = createDetailTransitions({ enabled: () => false });
    assert.equal(manager.canStart(), false);
    assert.equal(manager.reserve({ outgoing: [outgoing], owner: 'tile' }), null);
    assert.deepEqual(attributes(outgoing), before);
    assert.equal(outgoing.isConnected, true);
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(h.timers.size, 0);
  });
});

test('transition and retained-node caps reject reservations and recover exactly after finish', async () => {
  await harness(async h => {
    const a = svg('g', { id: 'a' }, svg('path'));
    const b = svg('g', { id: 'b' }, svg('path'));
    const c = svg('g', { id: 'c' }, svg('path'));
    h.root.append(a, b, c);
    const manager = createDetailTransitions({ maxTransitions: 2, maxNodes: 4 });
    const first = manager.reserve({ outgoing: [a], owner: 'a' });
    assert.ok(first);
    assert.equal(manager.retainedNodes, 2);
    assert.equal(manager.canStart(2), true);
    assert.equal(manager.canStart(3), false);
    const second = manager.reserve({ outgoing: [b], owner: 'b' });
    assert.ok(second);
    assert.equal(manager.activeCount, 2);
    assert.equal(manager.retainedNodes, 4);
    assert.equal(manager.peakNodes, 4);
    assert.equal(manager.reserve({ outgoing: [c], owner: 'c' }), null);
    assert.equal(c.id, 'c');
    assert.equal(c.classList.contains('detail-outgoing'), false);
    assert.equal(manager.canStart(), false);
    first.finish();
    assert.equal(manager.activeCount, 1);
    assert.equal(manager.retainedNodes, 2);
    assert.equal(manager.canStart(2), true);
    const third = manager.reserve({ outgoing: [c], owner: 'c' });
    assert.ok(third);
    manager.finishAll();
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(manager.peakNodes, 4);
  });
});

test('a large root is rejected by the node budget even when a transition slot is free', async () => {
  await harness(async h => {
    const large = svg('g', { id: 'large' }, svg('path'), svg('path'), svg('path'));
    h.root.append(large);
    const manager = createDetailTransitions({ maxTransitions: 2, maxNodes: 3 });
    assert.equal(manager.reserve({ outgoing: [large], owner: 'large' }), null);
    assert.equal(large.id, 'large');
    assert.equal(large.isConnected, true);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(manager.peakNodes, 0);
  });
});

test('owner cleanup affects only the matching owner and finishAll drains the remaining roots', async () => {
  await harness(async h => {
    const owner = {}, other = {};
    const roots = [svg('g', { id: 'a' }), svg('g', { id: 'b' }), svg('g', { id: 'c' })];
    h.root.append(...roots);
    const manager = createDetailTransitions({ maxTransitions: 3 });
    const finished = [];
    for (let index = 0; index < roots.length; index++) {
      manager.reserve({ outgoing: [roots[index]], owner: index === 1 ? other : owner, onFinish: () => finished.push(index) });
    }
    manager.finishOwner(owner);
    assert.deepEqual(new Set(finished), new Set([0, 2]));
    assert.equal(manager.activeCount, 1);
    assert.equal(manager.retainedNodes, 1);
    assert.equal(roots[1].isConnected, true);
    assert.equal(roots[1].classList.contains('detail-outgoing'), true);
    manager.finishAll();
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(finished.length, 3);
    assert.equal(roots[1].isConnected, false);
  });
});

test('cancelled reservations restore once and ignore a later start', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'shelf', class: 'original' });
    h.root.append(outgoing);
    let completed = 0;
    const manager = createDetailTransitions();
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'shelf', onFinish: () => completed++ });
    handle.finish();
    handle.finish();
    const incoming = svg('g', { id: 'shelf', class: 'replacement' });
    h.root.append(incoming);
    handle.start([incoming]);
    assert.equal(incoming.classList.contains('detail-incoming'), false);
    assert.equal(outgoing.id, 'shelf');
    assert.equal(outgoing.getAttribute('class'), 'original');
    assert.equal(completed, 1);
    assert.equal(manager.activeCount, 0);
    assert.equal(h.timers.size, 0);
  });
});

test('late animation events and queued fallback callbacks never complete a transition twice', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'a' });
    const incoming = svg('g', { id: 'a' });
    h.root.append(outgoing);
    let completed = 0;
    const manager = createDetailTransitions();
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'a', onFinish: () => completed++ });
    h.root.append(incoming);
    handle.start([incoming]);
    const queued = [...h.timers.values()].map(timer => timer.callback);
    handle.finish();
    h.animateEnd(outgoing);
    h.animateEnd(incoming);
    for (const callback of queued) callback();
    h.advance(1000);
    assert.equal(completed, 1);
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(h.timers.size, 0);
  });
});

test('only the incoming root animation completes the fade; child and unrelated animations are ignored', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'room' });
    const child = svg('path');
    const incoming = svg('g', { id: 'room' }, child);
    h.root.append(outgoing);
    const manager = createDetailTransitions();
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'room' });
    h.root.append(incoming);
    assert.equal(handle.start([incoming]), true);
    assert.equal(incoming.style.getPropertyValue('--detail-duration'), '180ms');
    const childEvent = new Event('animationend');
    Object.defineProperty(childEvent, 'target', { value: child });
    Object.defineProperty(childEvent, 'animationName', { value: 'detail-arrive' });
    incoming.dispatchEvent(childEvent);
    assert.equal(manager.activeCount, 1);
    h.animateEnd(incoming, 'mouse-scamper');
    assert.equal(manager.activeCount, 1);
    h.animateEnd(incoming, 'detail-arrive');
    assert.equal(manager.activeCount, 0);
    assert.equal(outgoing.isConnected, false);
    assert.equal(incoming.isConnected, true);
    assert.equal(incoming.style.getPropertyValue('--detail-duration'), '');
    assert.equal(h.timers.size, 0);
  });
});

test('a reservation that never starts has bounded retention and restores its detached roots', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'room', class: 'original' });
    h.root.append(outgoing);
    let finished = 0;
    const manager = createDetailTransitions();
    manager.reserve({ outgoing: [outgoing], owner: 'room', onFinish: () => finished++ });
    assert.equal(manager.activeCount, 1);
    h.advance(240);
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(outgoing.isConnected, false);
    assert.equal(outgoing.id, 'room');
    assert.equal(outgoing.getAttribute('class'), 'original');
    assert.equal(finished, 1);
    assert.equal(h.timers.size, 0);
  });
});

test('an empty or disabled start cancels and restores the reservation without touching incoming artwork', async () => {
  await harness(async h => {
    for (const kind of ['empty', 'invalid', 'disabled']) {
      const outgoing = svg('g', { id: kind, class: 'old-shelf' });
      const incoming = svg('g', { id: kind, class: 'fresh-shelf', style: 'opacity: 0.8' });
      const before = attributes(incoming);
      let enabled = true;
      h.root.append(outgoing);
      const manager = createDetailTransitions({ enabled: () => enabled });
      const handle = manager.reserve({ outgoing: [outgoing], owner: kind });
      h.root.append(incoming);
      if (kind === 'disabled') enabled = false;
      assert.equal(handle.start(kind === 'empty' ? [] : kind === 'invalid' ? [null, {}] : [incoming]), false);
      assert.equal(manager.activeCount, 0);
      assert.equal(manager.retainedNodes, 0);
      assert.equal(outgoing.id, kind);
      assert.equal(outgoing.isConnected, false);
      assert.deepEqual(attributes(incoming), before);
    }
    assert.equal(h.timers.size, 0);
  });
});

test('incoming raw class and style are restored exactly, including preexisting styles and whitespace', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'room' });
    const incoming = svg('g', { id: 'room', class: 'fresh  shelf', style: 'opacity: .8; --detail-duration: 17ms', 'aria-hidden': 'false' });
    h.root.append(outgoing);
    const before = attributes(incoming);
    const manager = createDetailTransitions({ duration: 160 });
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'room' });
    h.root.append(incoming);
    assert.equal(handle.start([incoming]), true);
    assert.equal(incoming.style.getPropertyValue('--detail-duration'), '160ms');
    handle.finish();
    assert.deepEqual(attributes(incoming), before);
    assert.equal(incoming.isConnected, true);
    assert.equal(manager.activeCount, 0);
  });
});

test('cleanup restores absent class, style, aria, and pointer attributes rather than leaving empty attributes', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'room' });
    const incoming = svg('g', { id: 'room' });
    const beforeOutgoing = attributes(outgoing), beforeIncoming = attributes(incoming);
    h.root.append(outgoing);
    const manager = createDetailTransitions();
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'room' });
    h.root.append(incoming);
    handle.start([incoming]);
    handle.finish();
    assert.deepEqual(attributes(outgoing), beforeOutgoing);
    assert.deepEqual(attributes(incoming), beforeIncoming);
    assert.equal(outgoing.isConnected, false);
    assert.equal(incoming.isConnected, true);
  });
});

test('finishAll snapshots old work and allows a reentrant callback to start a new transition safely', async () => {
  await harness(async h => {
    const first = svg('g', { id: 'first' });
    const second = svg('g', { id: 'second' }, svg('path'));
    h.root.append(first, second);
    const manager = createDetailTransitions({ maxTransitions: 1, maxNodes: 3 });
    let replacement = null;
    manager.reserve({ outgoing: [first], owner: 'first', onFinish() {
      assert.equal(manager.activeCount, 0);
      assert.equal(manager.retainedNodes, 0);
      replacement = manager.reserve({ outgoing: [second], owner: 'second' });
      assert.ok(replacement, 'Counters are released before callbacks reserve new work.');
    } });
    manager.finishAll();
    assert.equal(manager.activeCount, 1, 'The callback-created transition is outside the finishAll snapshot.');
    assert.equal(manager.retainedNodes, 2);
    assert.equal(second.isConnected, true);
    replacement.finish();
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(h.timers.size, 0);
  });
});

test('callback errors do not leave roots, listeners, timers, or retained counters behind', async () => {
  await harness(async h => {
    const outgoing = svg('g', { id: 'room' });
    const incoming = svg('g', { id: 'room' });
    h.root.append(outgoing);
    let notified = 0;
    const manager = createDetailTransitions({ onFinish: () => notified++ });
    const handle = manager.reserve({ outgoing: [outgoing], owner: 'room', onFinish() { throw new Error('Consumer callback failed.'); } });
    h.root.append(incoming);
    handle.start([incoming]);
    assert.doesNotThrow(() => handle.finish());
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(outgoing.isConnected, false);
    assert.equal(outgoing.id, 'room');
    assert.equal(incoming.classList.contains('detail-incoming'), false);
    assert.equal(notified, 1);
    assert.equal(h.timers.size, 0);
  });
});

test('finishOwner snapshots old work and does not remove callback-created work for that same owner', async () => {
  await harness(async h => {
    const first = svg('g', { id: 'first' });
    const replacement = svg('g', { id: 'replacement' });
    h.root.append(first, replacement);
    const manager = createDetailTransitions({ maxTransitions: 1 });
    let next = null;
    manager.reserve({ outgoing: [first], owner: 'same-owner', onFinish() {
      next = manager.reserve({ outgoing: [replacement], owner: 'same-owner' });
    } });
    manager.finishOwner('same-owner');
    assert.ok(next);
    assert.equal(manager.activeCount, 1);
    assert.equal(manager.retainedNodes, 1);
    assert.equal(replacement.isConnected, true);
    next.finish();
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(h.timers.size, 0);
  });
});

test('a queued old animation event cannot finish a later transition that reuses the same incoming root', async () => {
  await harness(async h => {
    const old = svg('g', { id: 'old' });
    const reused = svg('g', { id: 'reused', class: 'shelf' });
    h.root.append(old);
    const manager = createDetailTransitions();
    const first = manager.reserve({ outgoing: [old], owner: 'first' });
    h.root.append(reused);
    first.start([reused]);
    const queued = new Event('animationend');
    Object.defineProperty(queued, 'animationName', { value: 'detail-arrive' });
    Object.defineProperty(queued, 'timeStamp', { value: 0 });
    first.finish();
    h.advance(50);
    const nextOld = svg('g', { id: 'next-old' });
    h.root.append(nextOld);
    const next = manager.reserve({ outgoing: [nextOld], owner: 'next' });
    assert.equal(next.start([reused]), true);
    reused.dispatchEvent(queued);
    assert.equal(manager.activeCount, 1, 'The stale event belongs to the canceled earlier animation.');
    assert.equal(nextOld.isConnected, true);
    assert.equal(reused.classList.contains('detail-incoming'), true);
    h.animateEnd(reused, 'detail-arrive');
    assert.equal(manager.activeCount, 0);
    assert.equal(manager.retainedNodes, 0);
    assert.equal(nextOld.isConnected, false);
    assert.equal(reused.getAttribute('class'), 'shelf');
    assert.equal(h.timers.size, 0);
  });
});

test('overlapping reservations cannot take ownership of a subtree that is already fading', async () => {
  await harness(async h => {
    const child = svg('g', { id: 'child' }, svg('path'));
    const old = svg('g', { id: 'old' }, child);
    const incoming = svg('g', { id: 'new' }, svg('path'));
    h.root.append(old);
    const manager = createDetailTransitions({ maxTransitions: 3 });
    const first = manager.reserve({ outgoing: [old, child, old], owner: 'first' });
    assert.ok(first);
    assert.equal(manager.retainedNodes, 3, 'Nested and duplicate roots are counted once.');
    const isolatedID = child.id;
    assert.equal(manager.reserve({ outgoing: [child], owner: 'overlap' }), null);
    assert.equal(child.id, isolatedID);
    h.root.append(incoming);
    first.start([incoming]);
    assert.equal(manager.reserve({ outgoing: [incoming], owner: 'incoming-overlap' }), null);
    assert.equal(manager.activeCount, 1);
    assert.equal(manager.retainedNodes, 3);
    first.finish();
    assert.equal(child.id, 'child');
    assert.equal(manager.retainedNodes, 0);
    assert.equal(h.timers.size, 0);
  });
});
