// A tiny working drawer: a few paper cards stand in for the whole catalogue.
export function createCatalogueSearch({ books, onApproach, onChoose, onCancel, announce = () => {} }) {
  const dialog = document.getElementById('catalogue-search');
  const query = document.getElementById('catalogue-query');
  const form = document.getElementById('catalogue-form');
  const result = document.getElementById('catalogue-result');
  const resultTitle = document.getElementById('catalogue-result-title');
  const resultAuthor = document.getElementById('catalogue-result-author');
  const resultOriginal = document.getElementById('catalogue-result-original');
  const resultNumber = document.getElementById('catalogue-result-number');
  const status = document.getElementById('catalogue-status');
  const trigger = document.getElementById('search-btn');
  const closeButton = document.getElementById('catalogue-close');
  if (!dialog || !query || !result) return { open: async () => {}, close: async () => {}, get isOpen() { return false; } };

  const fold = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu, '');
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  const entries = books.map((book, id) => ({ book, id, keys: [book.title, book.original, book.author].map(fold) }))
    .sort((a, b) => collator.compare(a.book.title, b.book.title) || a.id - b.id);
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => Boolean(motionPreference?.matches);
  let active = false, closing = false, session = 0, selected = null, composing = false;
  let previousFocus = null, anchor = null, raiseTimer = 0, statusTimer = 0, openingTimer = 0;
  let closePromise = null, choiceIntent = 0, cardChange = null;
  let closeReason = 'cancel', closeRestoreFocus = true, closeWaitTimer = 0, closeWaitResolve = null;

  function clearTimers() {
    clearTimeout(raiseTimer); clearTimeout(statusTimer); clearTimeout(openingTimer);
    raiseTimer = statusTimer = openingTimer = 0;
    finishCardChange();
  }

  function finishCardChange() {
    cardChange?.finish();
  }

  function departingCard(wasRaised) {
    finishCardChange();
    const card = result.cloneNode(true);
    // Keep the old paper and its lettering visible as it turns out of the way.
    // Only the live card is interactive, and there is never a second set of IDs.
    for (const node of [card, ...card.querySelectorAll('[id]')]) node.removeAttribute('id');
    card.classList.add('catalogue-departing-card', 'is-departing');
    card.classList.remove('is-arriving');
    card.disabled = true;
    card.setAttribute('tabindex', '-1');
    card.setAttribute('aria-hidden', 'true');
    card.setAttribute('inert', '');
    card.removeAttribute('aria-label');
    card.style.setProperty('--catalogue-depart-from', wasRaised ? 'translateY(-28px) rotate(0deg)' : 'translateY(10px) rotate(-1deg)');
    return card;
  }

  function turnCard(card) {
    const change = { card, timer: 0, finish: null };
    const finish = () => {
      if (cardChange !== change) return;
      cardChange = null;
      clearTimeout(change.timer);
      card.removeEventListener('animationend', ended);
      card.removeEventListener('animationcancel', ended);
      card.remove();
      result.classList.remove('is-arriving');
    };
    const ended = event => {
      if (event.target === card && event.animationName === 'catalogue-card-away') finish();
    };
    change.finish = finish;
    cardChange = change;
    card.addEventListener('animationend', ended);
    card.addEventListener('animationcancel', ended);
    result.before(card);
    result.classList.add('is-arriving');
    // Rapid typing can remove/re-add the same class within one style update.
    // Rewind its CSS animation without forcing a layout or running a frame loop.
    for (const animation of result.getAnimations?.() || []) {
      if (animation.animationName === 'catalogue-card-arrive') animation.currentTime = 0;
    }
    // A fallback also cleans up when the tab is hidden or CSS is unavailable.
    change.timer = setTimeout(finish, 340);
  }

  function position() {
    if (!dialog.open) return;
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const offsetX = viewport?.offsetLeft || 0, offsetY = viewport?.offsetTop || 0;
    dialog.classList.toggle('is-cramped', height < 540);
    dialog.style.setProperty('--catalogue-available-height', `${Math.max(120, Math.floor(height - 24))}px`);
    const bounds = dialog.getBoundingClientRect();
    const x = Number.isFinite(anchor?.x) ? anchor.x + (anchor.width || 0) / 2 : width / 2;
    const front = form.getBoundingClientRect();
    const frontCenter = front.top - bounds.top + front.height / 2;
    const y = Number.isFinite(anchor?.y) ? anchor.y + (anchor.height || 0) / 2 - frontCenter : (height - bounds.height) / 2;
    const left = Math.max(offsetX + 12, Math.min(x - bounds.width / 2, offsetX + width - bounds.width - 12));
    const top = Math.max(offsetY + 12, Math.min(y, offsetY + height - bounds.height - 12));
    dialog.style.left = `${Math.round(left)}px`;
    dialog.style.top = `${Math.round(top)}px`;
    dialog.style.setProperty('--drawer-origin-x', `${Math.round(x - left)}px`);
    dialog.style.setProperty('--drawer-origin-y', `${Math.round((anchor?.y || top + frontCenter) + (anchor?.height || 0) / 2 - top)}px`);
    dialog.style.setProperty('--drawer-origin-scale', String(Math.min(1.25, Math.max(.2, (anchor?.width || front.width) / front.width))));
  }

  function update({ welcome = false } = {}) {
    clearTimeout(raiseTimer); clearTimeout(statusTimer);
    const wasRaised = dialog.classList.contains('is-raised');
    status.textContent = '';
    const term = fold(query.value);
    const next = entries.find(entry => !term || entry.keys.some(key => key.includes(term))) || null;
    const changed = next?.id !== selected?.id;
    if (reduceMotion()) finishCardChange();
    const oldCard = changed && !welcome && !reduceMotion() ? departingCard(wasRaised) : null;
    dialog.classList.remove('is-raised');
    selected = next;
    result.disabled = !next;
    dialog.classList.toggle('has-no-result', !next);
    if (next) {
      resultTitle.textContent = next.book.title;
      resultAuthor.textContent = next.book.author;
      resultOriginal.textContent = `After ${next.book.original}`;
      resultNumber.textContent = `No. ${String(next.id + 1).padStart(3, '0')}`;
      result.setAttribute('aria-label', `Find ${next.book.title}, after ${next.book.original}, by ${next.book.author}`);
    } else {
      resultTitle.textContent = 'A little mystery…';
      resultAuthor.textContent = 'No matching card in this drawer.';
      resultOriginal.textContent = 'Try a title, its original, or an author.';
      resultNumber.textContent = 'Not filed here';
      result.removeAttribute('aria-label');
    }
    if (oldCard) turnCard(oldCard);
    const token = session;
    raiseTimer = setTimeout(() => {
      if (!active || closing || token !== session || composing) return;
      if (selected) dialog.classList.add('is-raised');
      status.textContent = selected
        ? `${selected.book.title}. ${term ? 'First alphabetical match. ' : ''}Press Enter or select the card to find it on the shelf.`
        : 'No matching book. Try another title or author.';
    }, welcome || reduceMotion() ? 0 : 1000);
  }

  async function close({ restoreFocus = true, reason = 'cancel' } = {}) {
    if (reason !== 'choose') ++choiceIntent;
    if (closing) {
      closeReason = reason;
      closeRestoreFocus = restoreFocus;
      if (reason === 'navigation' || reduceMotion()) {
        clearTimeout(closeWaitTimer);
        closeWaitResolve?.();
      }
      return closePromise;
    }
    if (!active && !dialog.open) return;
    closing = true;
    closeReason = reason;
    closeRestoreFocus = restoreFocus;
    const token = ++session;
    clearTimers();
    dialog.classList.remove('is-opening', 'is-raised');
    dialog.classList.add('is-closing');
    result.disabled = true;
    query.disabled = true;
    closePromise = (async () => {
      if (dialog.open && reason !== 'navigation' && !reduceMotion()) await new Promise(resolve => {
        closeWaitResolve = resolve;
        closeWaitTimer = setTimeout(resolve, 280);
      });
      clearTimeout(closeWaitTimer);
      closeWaitResolve = null;
      if (token !== session) return;
      if (dialog.open) dialog.close();
      active = false;
      closing = false;
      closePromise = null;
      trigger?.setAttribute('aria-expanded', 'false');
      dialog.classList.remove('is-closing');
      status.textContent = '';
      if (closeReason === 'cancel') await onCancel?.();
      if (closeRestoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    })();
    return closePromise;
  }

  async function choose() {
    if (!selected || !active || closing || composing) return;
    const id = selected.id;
    const intent = ++choiceIntent;
    await close({ restoreFocus: false, reason: 'choose' });
    if (intent !== choiceIntent) return;
    await onChoose?.(id);
  }

  async function open() {
    if (active || closing) return;
    active = true;
    const token = ++session;
    previousFocus = document.activeElement;
    trigger?.setAttribute('aria-expanded', 'true');
    try {
      anchor = await onApproach?.();
      if (!active || closing || token !== session) return;
      if (anchor === null) { await close(); return; }
      query.disabled = false;
      query.value = '';
      composing = false;
      selected = null;
      finishCardChange();
      dialog.classList.remove('is-closing', 'is-raised');
      dialog.showModal();
      position();
      dialog.classList.add('is-opening');
      update({ welcome: true });
      query.focus({ preventScroll: true });
      openingTimer = setTimeout(() => {
        if (token === session) dialog.classList.remove('is-opening');
      }, reduceMotion() ? 0 : 420);
    } catch (error) {
      if (token !== session) return;
      await close();
      if (error?.name === 'AbortError') return;
      announce('The catalogue drawer could not open. Please try again.');
      console.warn('The catalogue drawer could not open.', error);
    }
  }

  query.addEventListener('input', () => { if (!composing && !closing) update(); });
  query.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(raiseTimer); clearTimeout(statusTimer);
    finishCardChange();
    dialog.classList.remove('is-raised');
  });
  query.addEventListener('compositionend', () => { composing = false; if (!closing) update(); });
  query.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !(composing || event.isComposing || event.keyCode === 229)) {
      event.preventDefault();
      event.stopPropagation();
      void close();
      return;
    }
    if (event.key === 'Enter' && (composing || event.isComposing || event.keyCode === 229)) event.preventDefault();
  });
  form.addEventListener('submit', event => { event.preventDefault(); void choose(); });
  result.addEventListener('click', () => { void choose(); });
  closeButton.addEventListener('click', () => { void close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) void close();
  });
  window.addEventListener('resize', position);
  motionPreference?.addEventListener?.('change', event => { if (event.matches) finishCardChange(); });
  window.addEventListener('pagehide', () => { void close({ restoreFocus: false, reason: 'navigation' }); });
  window.visualViewport?.addEventListener('resize', position);
  window.visualViewport?.addEventListener('scroll', position);
  return { open, close, get isOpen() { return active || closing; } };
}
