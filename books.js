import { BOOKS } from './catalog.js';

// Every spine uses the same local coordinates. Rotating the complete book also
// rotates its label, so a 90-degree book has a perfectly horizontal title.
const INK = '#382c27';
const COVERS = ['#ef4452', '#f19532', '#f4cb37', '#91c933', '#41af58', '#13b7a6', '#39bceb', '#4965d4', '#ab4dc4', '#ed6193'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const n = value => Number(value.toFixed(3));

function hash(value, salt = 2166136261) {
  let h = salt;
  for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function random(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function titleUnits(title) {
  return [...title].reduce((sum, c) => sum + (/\s/.test(c) ? .32 : /[I1'’.,:!]/.test(c) ? .35 : /[MW]/.test(c) ? .96 : /[JLT]/.test(c) ? .57 : .71), 0);
}

// A title is reused on many shelves. Its letter metrics and escaped text never
// depend on placement, so calculate them once instead of once per visible copy.
const TITLE_METRICS = BOOKS.map(book => {
  const title = book.title.toUpperCase();
  return { title, escapedTitle: escape(title), escapedName: escape(book.title), units: titleUnits(title) };
});

let bookPixelScale = Infinity;

// Rendering a miniature does not permanently change the detail of its parent.
// Print/export callers retain every label unless they explicitly supply scale.
export function withBookScale(pixelScale, draw) {
  const previous = bookPixelScale;
  bookPixelScale = Number.isFinite(pixelScale) && pixelScale >= 0 ? pixelScale : Infinity;
  try { return draw(); } finally { bookPixelScale = previous; }
}

/**
 * Render a floor-anchored, titled SVG book. The shared SVG definitions supply
 * #leather, #cloth, #book-scuffs, and #paper. This function owns only its unique
 * clipping IDs; it never installs shared definitions or depends on stylesheets.
 */
export function renderBook({ x, y, width, height, angle = 0, id = 0, seed = 1, detail = 'full' }) {
  if (![x, y, width, height, angle].every(Number.isFinite) || width <= 0 || height <= 0) return '';
  const bookId = ((Math.trunc(id) % BOOKS.length) + BOOKS.length) % BOOKS.length;
  const book = TITLE_METRICS[bookId], title = book.title;
  const compact = detail === 'compact';
  const distant = detail === 'distant', preview = detail === 'preview';
  const w = width, h = height, key = `${seed}:${x}:${y}:${bookId}:${angle}:${w}:${h}`;
  const clipKey = compact ? `${key}:compact` : key;
  const token = `${hash(clipKey).toString(36)}-${hash(clipKey, 3335557771).toString(36)}`;
  const clip = `spine-title-${token}`, coverClip = `spine-cover-${token}`;
  const r = random(hash(key)), color = COVERS[Math.floor(r() * COVERS.length)];
  const cloth = r() > .48, ornate = r() > .25, panel = r() > .62, window = w > 30 && h > 105 && r() > .72;
  const gold = '#ffe068', pale = '#fffef8';
  const darkCover = color === '#4965d4' || color === '#ab4dc4';
  const titleInk = darkCover ? pale : '#21182a';
  const titleOutline = darkCover ? '#39291e' : '#fff5c8';
  const margin = Math.min(5, w * .15), endZone = Math.min(30, h * .25);
  const labelX = margin, labelY = -h + endZone, labelW = w - margin * 2, labelH = h - endZone * 2;
  // The long axis is the book's height. Both the font estimate and exact SVG
  // textLength reserve space for every letter and the small tracking gaps.
  const availableLength = Math.max(.5, h < 120 ? labelH - 6 : Math.min(labelH - 6, h - 60));
  const units = book.units, tracking = .055;
  const font = Math.max(.3, Math.min(11.5, labelW * .62, availableLength / (units + Math.max(0, title.length - 1) * tracking)));
  const textLength = n(Math.min(availableLength, font * (units + Math.max(0, title.length - 1) * tracking) * .96));
  const showTitle = font * bookPixelScale >= 3.5;
  const cover = `M${n(Math.min(1.1,w*.12))} -1L${n(Math.min(1.6,w*.14))} ${n(-h+2.8)}Q${n(w*.47)} ${n(-h)} ${n(w-1)} ${n(-h+1.9)}L${n(w-.8)} -2.3Q${n(w*.48)} 0 .6 -1Z`;
  const topRib = -h + Math.min(12, h * .14), bottomRib = -Math.min(12, h * .14);
  // At a distance, the silhouette and binding bands identify a volume. The
  // inaccessible subpixel lettering, per-book clips and texture overlays are
  // absent from the DOM; the same seeded cover and transform survive zooming.
  if (distant || preview) {
    let out = `<g class="book" data-book="${bookId}" data-angle="${angle}" data-width="${n(w)}" data-height="${n(h)}" data-detail="${detail}" aria-label="${book.escapedName}" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})">${preview?'':`<title>${book.escapedName}</title>`}<path d="${cover}" fill="${color}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (distant) out += `<path d="M${n(w-3)} ${n(-h+3)}h2.1v${n(h-6)}h-2.1Z" fill="#c2b08d" opacity=".8"/><path d="M1.8 ${n(topRib)}H${n(w-1.8)}M1.8 ${n(bottomRib)}H${n(w-1.8)}" stroke="${gold}" stroke-width="1.55"/>`;
    return out + '</g>';
  }
  let lightMarks = '', darkMarks = '';
  for (let i = 0; !compact && i < 11; i++) {
    const px = 2 + r() * Math.max(.5, w - 4), py = -h + 4 + r() * Math.max(1, h - 8);
    const mark = `M${n(px)} ${n(py)}l${n(.4+r()*1.5)} ${n((r()-.5)*1.4)}`;
    if (i % 2) lightMarks += mark; else darkMarks += mark;
  }

  let out = `<g class="book" data-book="${bookId}" data-angle="${angle}" data-width="${n(w)}" data-height="${n(h)}" data-detail="${compact?'compact':'full'}" aria-label="${book.escapedName}" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})"><title>${book.escapedName}</title>
    ${showTitle||!compact?`<defs>${showTitle?`<clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><rect x="${n(labelX)}" y="${n(labelY)}" width="${n(labelW)}" height="${n(labelH)}"/></clipPath>`:''}${compact?'':`<clipPath id="${coverClip}" clipPathUnits="userSpaceOnUse"><path d="${cover}"/></clipPath>`}</defs>`:''}
    <path d="${cover}" fill="${color}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    ${compact?'':`<g clip-path="url(#${coverClip})">`}
      <path d="M${n(w-3)} ${n(-h+3)}h2.1v${n(h-6)}h-2.1Z" fill="#c2b08d" opacity=".8"/>
      ${compact?'':`<path d="M${n(w-2.4)} ${n(-h+5)}v${n(h-11)}" stroke="#e0cfab" stroke-width=".7"/>`}
      <path d="${cover}" fill="url(#leather)"/>
      <path d="${cover}" fill="url(#${cloth?'cloth':'paper'})" opacity="${cloth?'.55':'.65'}"/>
      <path d="${cover}" fill="url(#book-scuffs)" opacity=".6"/>`;
  if (!compact) out += `<path d="${lightMarks}" fill="none" stroke="#f6ddaa" stroke-width=".55" opacity=".35"/>
      <path d="${darkMarks}" fill="none" stroke="#30261e" stroke-width=".6" opacity=".3"/>
      <path d="M2.8 -4V${n(-h+5)}M${n(w-4.2)} -4V${n(-h+5)}" stroke="#f4d69a" stroke-width=".65" opacity=".35"/>
      <path d="M1.8 ${n(-h+6)}q${n(w*.45)} -2 ${n(w-4)} -1M${n(w-4)} -3l-3 -2M2.2 ${n(-h+4)}l3 3" fill="none" stroke="#ebcda0" stroke-width="1" opacity=".52"/>
      <path d="M${n(w-2.3)} ${n(-h+10)}l-2.2 3.6M2.4 -9l2.5 -2.2" fill="none" stroke="#261d1b" stroke-width=".8" opacity=".55"/>`;

  if (ornate && w > 15) {
    out += `<path d="M${n(margin)} -7V${n(-h+8)}H${n(w-margin)}V-7Z" fill="none" stroke="${gold}" stroke-width=".6" opacity=".72"/>`;
    if (!compact) out += `<path d="M${n(margin+2)} -9v-4M${n(w-margin-2)} -9v-4M${n(margin+2)} ${n(-h+10)}v4M${n(w-margin-2)} ${n(-h+10)}v4" stroke="${gold}" stroke-width=".6" opacity=".62"/>`;
  }
  if (panel) {
    out += `<rect x="${n(labelX+Math.min(1.5,labelW*.05))}" y="${n(labelY-1)}" width="${n(labelW-Math.min(3,labelW*.1))}" height="${n(labelH+2)}" rx="${n(Math.min(2,labelW*.1))}" fill="#2c2520" opacity=".19"/>`;
  }
  const ribPath = (offset, inset) => [topRib, bottomRib].map(yy => `M${inset} ${n(yy+offset)}H${n(w-inset)}`).join('');
  out += `<path d="${ribPath(1.4,1.8)}" stroke="#31261e" stroke-width="3.2" opacity=".45"/>
    <path d="${ribPath(0,1.8)}" stroke="${gold}" stroke-width="1.55"/>`;
  if (!compact) out += `<path d="${ribPath(-1.7,2.2)}" stroke="${pale}" stroke-width=".45" opacity=".85"/>`;
  if (w > 17 && h > 90) {
    const cy = -h + 22, radius = Math.min(4, w * .13);
    out += `<path d="M${n(w/2-radius)} ${n(cy)}l${n(radius)} ${n(-radius*.75)}l${n(radius)} ${n(radius*.75)}l${n(-radius)} ${n(radius*.75)}Z" fill="${gold}" stroke="#675039" stroke-width=".45"/>`;
    if (!compact) out += `<circle cx="${n(w/2)}" cy="${n(cy)}" r=".75" fill="#654833"/>`;
  }
  if (window) {
    const ww = Math.min(11, w * .3), xx = w/2 - ww/2;
    out += `<path d="M${n(xx-2)} -23L${n(w/2)} -28L${n(xx+ww+2)} -23" fill="#49352e" stroke="${INK}" stroke-width=".75"/>
      <rect x="${n(xx)}" y="-23" width="${n(ww)}" height="14" rx="${n(ww*.38)}" fill="#edcd78" stroke="${INK}" stroke-width=".7"/>`;
    if (!compact) out += `<path d="M${n(w/2)} -23v14M${n(xx)} -16h${n(ww)}" stroke="#675136" stroke-width=".55"/>`;
  } else if (!compact && w > 17 && h > 90) {
    out += `<path d="M${n(w/2-4)} -22q4 -5 8 0q-4 5 -8 0M${n(w/2)} -25v6" fill="none" stroke="${gold}" stroke-width=".65" opacity=".85"/>`;
  }
  out += `${compact?'':'</g>'}${showTitle?`<g class="title-region" data-title-box="${n(labelX)},${n(labelY)},${n(labelW)},${n(labelH)}" clip-path="url(#${clip})">
      ${compact?'':`<rect class="title-bounds" x="${n(labelX)}" y="${n(labelY)}" width="${n(labelW)}" height="${n(labelH)}" fill="none" stroke="none" pointer-events="none"/>`}
      <text class="spine-title" transform="translate(${n(w/2)} ${n(-h/2)}) rotate(-90)" x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="${n(font)}" letter-spacing="${n(font*tracking)}" textLength="${textLength}" lengthAdjust="spacingAndGlyphs" fill="${titleInk}" stroke="${titleOutline}" stroke-width=".32" paint-order="stroke fill" font-weight="bold">${book.escapedTitle}</text>
    </g>`:''}</g>`;
  return out;
}
