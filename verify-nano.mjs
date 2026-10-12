import assert from 'node:assert/strict';
import test from 'node:test';
import { createNanoWriter } from './nano.js';

const book = { title: 'The Great Catsby', blurb: 'A mysterious cat hosts moonlit parties for every mouse on the top shelf.' };
const prose = 'At midnight, Catsby straightened his silk whiskers and counted the tiny cups. Every mouse had received an invitation, even the one who lived behind the dictionary and never returned borrowed sugar. Tonight the staircase would become a ballroom, the moon a chandelier, and the cheese a magnificent orchestra. He hoped nobody would notice that he had eaten the conductor.';
const english = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

async function withAPI(api, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'LanguageModel');
  Object.defineProperty(globalThis, 'LanguageModel', { configurable: true, writable: true, value: api });
  try { await run(); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'LanguageModel', descriptor);
    else delete globalThis.LanguageModel;
  }
}

async function withActivation(isActive, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const activation = { isActive };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userActivation: activation } });
  try { await run(activation); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
}

function mockAPI({ state = 'available', response = prose } = {}) {
  const calls = { availability: [], create: [], prompt: [], destroyed: 0 };
  const api = {
    async availability(options) { calls.availability.push(options); return state; },
    async create(options) {
      calls.create.push(options);
      return {
        async prompt(prompt, options) { calls.prompt.push({ prompt, options }); return response; },
        destroy() { calls.destroyed++; }
      };
    }
  };
  return { api, calls };
}

test('feature detection and rejected availability safely report unavailable', async () => {
  for (const api of [undefined, {}, { availability() {} }, { create() {} }, {
    availability() { throw new DOMException('Unsupported language', 'NotSupportedError'); }, create() {}
  }]) {
    await withAPI(api, async () => assert.equal(await createNanoWriter().availability(), 'unavailable'));
  }
});

test('only a ready model can create a session; no downloads are initiated', async () => {
  for (const state of ['unavailable', 'downloadable', 'downloading', 'unexpected']) {
    const { api, calls } = mockAPI({ state });
    await withAPI(api, async () => {
      const writer = createNanoWriter();
      assert.equal(await writer.availability(), state === 'unexpected' ? 'unavailable' : state);
      await assert.rejects(writer.write(book), error => error.name === 'NanoUnavailableError');
      assert.equal(calls.create.length, 0);
    });
  }
});

test('availability and creation agree on English; one-shot sessions are destroyed and text is cached', async () => {
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    assert.equal(await writer.availability(), 'available');
    assert.deepEqual(await writer.write(book), { text: prose, generated: true });
    assert.deepEqual(await writer.write(book), { text: prose, generated: true });
    assert.equal(calls.create.length, 1);
    assert.equal(calls.prompt.length, 1);
    assert.equal(calls.destroyed, 1);
    for (const options of calls.availability) assert.deepEqual(options, english);
    const options = calls.create[0];
    assert.deepEqual({ expectedInputs: options.expectedInputs, expectedOutputs: options.expectedOutputs }, english);
    assert.equal(options.initialPrompts[0].role, 'system');
    assert.match(options.initialPrompts[0].content, /55–85 words/);
    assert.match(calls.prompt[0].prompt, /The Great Catsby/);
    assert.match(calls.prompt[0].prompt, /moonlit parties/);
    assert.equal(calls.prompt[0].options.signal, options.signal);
    assert.ok(!('topK' in options) && !('temperature' in options));
    writer.dispose();
    await writer.write(book);
    assert.equal(calls.create.length, 1, 'Closing the reader preserves cached text without retaining the model.');
  });
});

test('the LRU blurb cache holds at most 24 distinct books and includes descriptions in its key', async () => {
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    for (let index = 0; index < 25; index++) await writer.write({ ...book, title: `Book ${index}` });
    assert.equal(calls.create.length, 25);
    await writer.write({ ...book, title: 'Book 1' });
    assert.equal(calls.create.length, 25);
    await writer.write({ ...book, title: 'Book 0' });
    assert.equal(calls.create.length, 26, 'The least recently used entry was evicted.');
    await writer.write({ ...book, title: 'Book 1', blurb: 'A different premise.' });
    assert.equal(calls.create.length, 27);
    assert.equal(calls.destroyed, calls.create.length);
  });
});

test('invalid input never starts inference', async () => {
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    for (const value of [null, {}, { title: 'Title' }, { ...book, title: ' ' }, { ...book, blurb: 'x'.repeat(1201) }]) {
      await assert.rejects(writer.write(value), error => error.name === 'NanoInputError');
    }
    assert.equal(calls.create.length, 0);
    assert.equal(calls.availability.length, 0);
  });
});

test('empty, nontext, and excessively large responses are rejected and sessions released', async () => {
  for (const response of ['', ' \n\u0000 ', null, { text: prose }, 'x'.repeat(16001)]) {
    const { api, calls } = mockAPI({ response });
    await withAPI(api, async () => {
      await assert.rejects(createNanoWriter().write(book), error => error.name === 'NanoResponseError');
      assert.equal(calls.destroyed, 1);
    });
  }
});

test('prose stays plain text and retains Unicode while long responses fit the page', async () => {
  const response = `${'<em>café</em> 🐈 '.repeat(180)}the end`;
  const { api, calls } = mockAPI({ response });
  await withAPI(api, async () => {
    const result = await createNanoWriter().write(book);
    assert.match(result.text, /<em>café<\/em> 🐈/u);
    assert.ok(result.text.split(/\s+/u).length <= 110);
    assert.ok(Array.from(result.text).length <= 1301);
    assert.ok(!result.text.includes('\ufffd'));
    assert.equal(calls.destroyed, 1);
  });
  await withAPI(mockAPI({ response: '🦉'.repeat(3000) }).api, async () => {
    const result = await createNanoWriter().write(book);
    assert.equal(Array.from(result.text).length, 1301);
  });
});

test('an already aborted action never checks availability or starts a session', async () => {
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(createNanoWriter().write(book, { signal: controller.signal }), error => error.name === 'AbortError');
    assert.equal(calls.availability.length, 0);
    assert.equal(calls.create.length, 0);
  });
});

test('abort during availability prevents creation even if the browser ignores cancellation', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI();
  api.availability = () => gate.promise;
  await withAPI(api, async () => {
    const controller = new AbortController();
    const promise = createNanoWriter().write(book, { signal: controller.signal });
    controller.abort();
    await assert.rejects(promise, error => error.name === 'AbortError');
    gate.resolve('available');
    await tick();
    assert.equal(calls.create.length, 0);
  });
});

test('a session created after cancellation is destroyed and never prompted', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI();
  let prompted = 0;
  api.create = options => { calls.create.push(options); return gate.promise; };
  await withAPI(api, async () => {
    const controller = new AbortController();
    const promise = createNanoWriter().write(book, { signal: controller.signal });
    await tick();
    controller.abort();
    await assert.rejects(promise, error => error.name === 'AbortError');
    gate.resolve({ prompt() { prompted++; }, destroy() { calls.destroyed++; } });
    await tick();
    assert.equal(calls.destroyed, 1);
    assert.equal(prompted, 0);
  });
});

test('dispose stops inference promptly; late output is ignored and not cached', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI();
  const normalCreate = api.create;
  api.create = async options => {
    const session = await normalCreate(options);
    if (calls.create.length === 1) session.prompt = () => gate.promise;
    return session;
  };
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const promise = writer.write(book);
    await tick();
    writer.dispose();
    await assert.rejects(promise, error => error.name === 'AbortError');
    assert.equal(calls.destroyed, 1);
    gate.resolve('This stale output must never reach the next book.');
    await tick();
    assert.equal(calls.destroyed, 1);
    assert.deepEqual(await writer.write(book), { text: prose, generated: true });
    assert.equal(calls.create.length, 2);
    assert.equal(calls.destroyed, 2);
  });
});

test('a newer request cancels older inference and releases the old session', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI();
  const normalCreate = api.create;
  api.create = async options => {
    const session = await normalCreate(options);
    if (calls.create.length === 1) session.prompt = () => gate.promise;
    return session;
  };
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const older = writer.write(book);
    const rejection = assert.rejects(older, error => error.name === 'AbortError');
    await tick();
    assert.deepEqual(await writer.write({ ...book, title: 'War and Peas' }), { text: prose, generated: true });
    await rejection;
    gate.resolve(prose);
    await tick();
    assert.equal(calls.destroyed, 2);
  });
});

test('navigation cancels a pending prompt and progress callbacks are bounded and cleaned up', async () => {
  const browser = new EventTarget();
  const descriptors = ['addEventListener', 'removeEventListener'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.addEventListener = browser.addEventListener.bind(browser);
  globalThis.removeEventListener = browser.removeEventListener.bind(browser);
  try {
    const gate = deferred();
    const monitor = new EventTarget();
    const { api, calls } = mockAPI();
    const values = [];
    api.create = async options => {
      calls.create.push(options);
      options.monitor(monitor);
      for (const loaded of [-1, .42, 2, NaN]) {
        const event = new Event('downloadprogress');
        event.loaded = loaded;
        monitor.dispatchEvent(event);
      }
      return { prompt: () => gate.promise, destroy() { calls.destroyed++; } };
    };
    await withAPI(api, async () => {
      const promise = createNanoWriter().write(book, { onProgress: value => values.push(value) });
      await tick();
      assert.deepEqual(values, [0, .42, 1]);
      browser.dispatchEvent(new Event('pagehide'));
      await assert.rejects(promise, error => error.name === 'AbortError');
      assert.equal(calls.destroyed, 1);
      gate.resolve(prose);
      const event = new Event('downloadprogress');
      event.loaded = .75;
      monitor.dispatchEvent(event);
      assert.deepEqual(values, [0, .42, 1]);
    });
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test('prompt failures still release sessions, even if destroy also throws', async () => {
  const { api, calls } = mockAPI();
  api.create = async () => ({
    prompt() { throw new DOMException('The model stopped.', 'OperationError'); },
    destroy() { calls.destroyed++; throw new Error('Already released.'); }
  });
  await withAPI(api, async () => {
    await assert.rejects(createNanoWriter().write(book), error => error.name === 'OperationError');
    assert.equal(calls.destroyed, 1);
  });
});

test('startup prepares a ready model before Look Inside and the first book consumes it without another create', async () => {
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const preparing = writer.prepare();
    assert.equal(calls.availability.length, 1, 'Preparation starts the check synchronously.');
    assert.equal(await preparing, 'available');
    assert.equal(calls.create.length, 1);
    assert.equal(calls.prompt.length, 0, 'Prewarming never invents a story before a book is selected.');
    assert.equal(calls.destroyed, 0);
    assert.equal(await writer.availability(), 'available');
    assert.deepEqual(await writer.write(book), { text: prose, generated: true });
    assert.equal(calls.create.length, 1, 'The warm session is used directly.');
    assert.equal(calls.destroyed, 1);
    await writer.write({ ...book, title: 'War and Peas' });
    assert.equal(calls.create.length, 2, 'A different book gets a fresh session without previous story context.');
    assert.equal(calls.destroyed, 2);
    for (const options of calls.create) assert.equal(options.initialPrompts.length, 1);
    writer.dispose();
  });
});

test('startup leaves a missing model untouched even when a gesture happens to be active', async () => {
  const { api, calls } = mockAPI({ state: 'downloadable' });
  await withActivation(true, () => withAPI(api, async () => {
    const writer = createNanoWriter();
    assert.equal(await writer.prepare(), 'downloadable');
    assert.equal(calls.create.length, 0);
    writer.dispose();
  }));
});

test('startup immediately joins an ongoing browser model download without a gesture', async () => {
  const { api, calls } = mockAPI({ state: 'downloading' });
  await withActivation(false, () => withAPI(api, async () => {
    const writer = createNanoWriter();
    assert.equal(await writer.prepare(), 'available');
    assert.equal(calls.create.length, 1);
    assert.equal(calls.prompt.length, 0);
    await writer.write(book);
    assert.equal(calls.create.length, 1);
    assert.equal(calls.destroyed, 1);
    writer.dispose();
  }));
});

test('older activation checks keep ongoing-download availability and retry on the next valid gesture', async () => {
  const { api, calls } = mockAPI({ state: 'downloading' });
  const normalCreate = api.create;
  await withActivation(false, activation => withAPI(api, async () => {
    api.create = options => {
      if (!activation.isActive) {
        calls.create.push(options);
        throw new DOMException('A user gesture is required by this browser.', 'NotAllowedError');
      }
      return normalCreate(options);
    };
    const writer = createNanoWriter();
    assert.equal(await writer.prepare(), 'downloading');
    assert.equal(calls.create.length, 1);
    assert.equal(calls.destroyed, 0);
    activation.isActive = true;
    assert.equal(await writer.prepare({ allowDownload: true }), 'available');
    assert.equal(calls.create.length, 2);
    await writer.write(book);
    assert.equal(calls.create.length, 2);
    assert.equal(calls.destroyed, 1);
    writer.dispose();
  }));
});

test('activation rejected inside native creation leaves a new download retryable', async () => {
  const { api, calls } = mockAPI({ state: 'downloadable' });
  const normalCreate = api.create;
  await withActivation(true, activation => withAPI(api, async () => {
    api.create = async options => {
      if (!calls.create.length) {
        calls.create.push(options);
        activation.isActive = false;
        await Promise.resolve();
        throw new DOMException('Activation expired during native availability checking.', 'NotAllowedError');
      }
      return normalCreate(options);
    };
    const writer = createNanoWriter();
    assert.equal(await writer.prepare({ allowDownload: true }), 'downloadable');
    assert.equal(calls.create.length, 1);
    activation.isActive = true;
    assert.equal(await writer.prepare({ allowDownload: true }), 'available');
    assert.equal(calls.create.length, 2);
    await writer.write(book);
    assert.equal(calls.create.length, 2);
    assert.equal(calls.destroyed, 1);
    writer.dispose();
  }));
});

test('an authorized active gesture prepares a downloadable or already downloading model', async () => {
  for (const state of ['downloadable', 'downloading']) {
    const { api, calls } = mockAPI({ state });
    await withActivation(true, () => withAPI(api, async () => {
      const writer = createNanoWriter();
      assert.equal(await writer.prepare({ allowDownload: true }), 'available');
      assert.equal(calls.create.length, 1);
      const options = calls.create[0];
      assert.deepEqual({ expectedInputs: options.expectedInputs, expectedOutputs: options.expectedOutputs }, english);
      assert.equal(options.initialPrompts[0].role, 'system');
      assert.equal(await writer.availability(), 'available');
      await writer.write(book);
      assert.equal(calls.create.length, 1);
      assert.equal(calls.destroyed, 1);
      writer.dispose();
    }));
  }
});

test('download authorization without active user activation never calls create', async () => {
  const { api, calls } = mockAPI({ state: 'downloadable' });
  await withActivation(false, activation => withAPI(api, async () => {
    const writer = createNanoWriter();
    assert.equal(await writer.prepare({ allowDownload: true }), 'downloadable');
    assert.equal(calls.create.length, 0);
    activation.isActive = true;
    assert.equal(await writer.prepare({ allowDownload: true }), 'available');
    assert.equal(calls.create.length, 1);
    writer.dispose();
    assert.equal(calls.destroyed, 1);
  }));
});

test('a first gesture upgrades the same pending startup preparation without duplicate checks or models', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI({ state: 'downloadable' });
  api.availability = options => { calls.availability.push(options); return gate.promise; };
  await withActivation(false, activation => withAPI(api, async () => {
    const writer = createNanoWriter();
    const startup = writer.prepare();
    assert.equal(calls.availability.length, 1);
    activation.isActive = true;
    const gesture = writer.prepare({ allowDownload: true });
    const repeated = writer.prepare({ allowDownload: true });
    assert.equal(gesture, startup);
    assert.equal(repeated, startup);
    gate.resolve('downloadable');
    assert.equal(await gesture, 'available');
    assert.equal(calls.availability.length, 1);
    assert.equal(calls.create.length, 1);
    writer.dispose();
  }));
});

test('a slow check must not download after activation expires, and a later gesture retries', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI({ state: 'downloadable' });
  api.availability = options => { calls.availability.push(options); return gate.promise; };
  await withActivation(true, activation => withAPI(api, async () => {
    const writer = createNanoWriter();
    const preparing = writer.prepare({ allowDownload: true });
    activation.isActive = false;
    gate.resolve('downloadable');
    assert.equal(await preparing, 'downloadable');
    assert.equal(calls.create.length, 0);
    activation.isActive = true;
    assert.equal(await writer.prepare({ allowDownload: true }), 'available');
    assert.equal(calls.create.length, 1);
    writer.dispose();
  }));
});

test('write can await an authorized preparation and uses its eventual session once', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI({ state: 'downloadable' });
  api.create = options => { calls.create.push(options); return gate.promise; };
  await withActivation(true, () => withAPI(api, async () => {
    const writer = createNanoWriter();
    const preparing = writer.prepare({ allowDownload: true });
    await tick();
    const writing = writer.write(book);
    gate.resolve({
      async prompt(prompt) { calls.prompt.push({ prompt }); return prose; },
      destroy() { calls.destroyed++; }
    });
    assert.equal(await preparing, 'available');
    assert.deepEqual(await writing, { text: prose, generated: true });
    assert.equal(calls.create.length, 1);
    assert.equal(calls.prompt.length, 1);
    assert.equal(calls.destroyed, 1);
    writer.dispose();
  }));
});

test('dispose aborts preparation and destroys a session that resolves after cancellation', async () => {
  const gate = deferred();
  const { api, calls } = mockAPI();
  api.create = options => { calls.create.push(options); return gate.promise; };
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const preparing = writer.prepare();
    await tick();
    writer.dispose();
    assert.equal(await preparing, 'unavailable');
    assert.equal(calls.create[0].signal.aborted, true);
    gate.resolve({ destroy() { calls.destroyed++; } });
    await tick();
    assert.equal(calls.destroyed, 1);
    assert.equal(calls.prompt.length, 0);
  });
});

test('a cancelled preparation cannot clear or destroy a newer preparation', async () => {
  const older = deferred();
  const newer = deferred();
  const { api, calls } = mockAPI();
  api.create = options => {
    calls.create.push(options);
    return calls.create.length === 1 ? older.promise : newer.promise;
  };
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const cancelled = writer.prepare();
    await tick();
    writer.dispose();
    const replacement = writer.prepare();
    assert.notEqual(cancelled, replacement);
    await tick();
    assert.equal(await cancelled, 'unavailable');
    assert.equal(writer.prepare(), replacement, 'Old cleanup preserves the newer shared promise.');
    older.resolve({ destroy() { calls.destroyed++; } });
    await tick();
    assert.equal(calls.destroyed, 1);
    newer.resolve({ destroy() { calls.destroyed++; } });
    assert.equal(await replacement, 'available');
    writer.dispose();
    assert.equal(calls.destroyed, 2);
  });
});

test('unused warm models expire after 90 seconds and dispose can release them earlier', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { api, calls } = mockAPI();
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    assert.equal(await writer.prepare(), 'available');
    t.mock.timers.tick(89999);
    assert.equal(calls.destroyed, 0);
    t.mock.timers.tick(1);
    assert.equal(calls.destroyed, 1);
    assert.equal(await writer.prepare(), 'available');
    writer.dispose();
    assert.equal(calls.destroyed, 2);
    t.mock.timers.tick(90000);
    assert.equal(calls.destroyed, 2, 'An old idle timer never releases a second session twice.');
  });
});

test('navigation releases a warm model and cancels pending preparation without retaining it', async () => {
  const browser = new EventTarget();
  const descriptors = ['addEventListener', 'removeEventListener'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.addEventListener = browser.addEventListener.bind(browser);
  globalThis.removeEventListener = browser.removeEventListener.bind(browser);
  try {
    const { api, calls } = mockAPI();
    await withAPI(api, async () => {
      const writer = createNanoWriter();
      assert.equal(await writer.prepare(), 'available');
      browser.dispatchEvent(new Event('pagehide'));
      assert.equal(calls.destroyed, 1);
      const gate = deferred();
      api.create = options => { calls.create.push(options); return gate.promise; };
      const preparing = writer.prepare();
      await tick();
      browser.dispatchEvent(new Event('pagehide'));
      assert.equal(await preparing, 'unavailable');
      gate.resolve({ destroy() { calls.destroyed++; } });
      await tick();
      assert.equal(calls.destroyed, 2);
      writer.dispose();
    });
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});

test('shared preparation progress is bounded, replayed to new subscribers, and removed after completion', async () => {
  const gate = deferred();
  const monitor = new EventTarget();
  const { api, calls } = mockAPI();
  const first = [], second = [];
  api.create = options => {
    calls.create.push(options);
    options.monitor(monitor);
    return gate.promise;
  };
  await withAPI(api, async () => {
    const writer = createNanoWriter();
    const preparing = writer.prepare({ onProgress: value => first.push(value) });
    await tick();
    const send = loaded => {
      const event = new Event('downloadprogress');
      event.loaded = loaded;
      monitor.dispatchEvent(event);
    };
    send(.25);
    assert.equal(writer.prepare({ onProgress: value => second.push(value) }), preparing);
    writer.prepare({ onProgress() { throw new Error('Detached progress UI.'); } });
    send(2);
    assert.deepEqual(first, [.25, 1]);
    assert.deepEqual(second, [.25, 1]);
    gate.resolve({ destroy() { calls.destroyed++; } });
    assert.equal(await preparing, 'available');
    send(.75);
    assert.deepEqual(first, [.25, 1]);
    assert.deepEqual(second, [.25, 1]);
    writer.dispose();
  });
});

test('unsupported and failed background preparation resolves safely without an unhandled rejection', async () => {
  for (const api of [undefined, {}, {
    availability() { throw new Error('Unsupported language.'); }, create() {}
  }, {
    async availability() { return 'available'; },
    create() { return Promise.reject(new Error('Model startup failed.')); }
  }]) {
    await withAPI(api, async () => {
      const writer = createNanoWriter();
      assert.equal(await writer.prepare(), 'unavailable');
      writer.dispose();
    });
  }
});
