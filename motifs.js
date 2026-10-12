/** Small, original SVG inhabitants for the infinitely curious bookshelf.
 * Every drawing is anchored at its floor (0, 0) and fits approximately within
 * x = -50…50, y = -100…0. Ladder and focal architectural motifs are taller.
 * No fonts, images, or outside assets are needed. The fishbowl owns a stable
 * clip ID derived from its placement, so swimming fish stay inside the glass.
 */

const ink = '#302822';
const paper = '#f2dfac';
const cream = '#fff1c9';
const gold = '#d4a54b';
const red = '#cf6256';
const blue = '#559eab';
const green = '#779779';
const plum = '#8f6886';

const line = (d, stroke = ink, opacity = 1, width = .85) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`;
const dot = (x, y, r = 1.3, fill = ink) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="none"/>`;
// Separate subpaths share one paint operation. Batch only disjoint shapes with
// the same paint, leaving overlapping translucent layers in their original order.
const ellipsePath = (x, y, rx, ry = rx) =>
  `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
const dots = (points, fill = ink, radius = 1.3) =>
  `<path d="${points.map(([x, y, r = radius]) => ellipsePath(x, y, r)).join('')}" fill="${fill}" stroke="none"/>`;
const shadow = (rx = 30) =>
  `<ellipse cx="0" cy="-1.8" rx="${rx}" ry="2.4" fill="#302822" opacity=".13" stroke="none"/>`;
const stitches = (x, y, n = 6, step = 4) =>
  line(Array.from({ length: n }, (_, i) => `M${x + i * step} ${y}l2 -2`).join(''), ink, .26, .6);
const motifToken = (value) => {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};

function mouse(seed) {
  return `${shadow(35)}<g class="running-mouse">
    ${line('M-23 -18C-46 -32 -49 -7 -30 -6C-21 -6 -23 -1 -36 -2', red, 1, 1.65)}
    <path d="M-26 -7Q-32 -18 -17 -27Q-1 -34 18 -23L33 -14Q42 -11 34 -7Q21 -2 5 -5Q-8 1 -26 -7Z" fill="#b3a7a0"/>
    <path d="M-25 -12Q-15 -4 4 -8L18 -6Q1 0 -15 -4Z" fill="#d9ccc0" stroke="none"/>
    <path d="M-4 -26C-17 -34 -16 -44 -9 -43C-1 -43 4 -34 2 -27Z" fill="#b3a7a0"/>
    <path d="M-7 -28C-12 -34 -13 -40 -9 -39Q-2 -38 -1 -29Z" fill="#d99390" stroke-width=".6"/>
    <path d="M13 -22C9 -32 12 -40 18 -38Q27 -35 22 -23Z" fill="#c4b5aa"/>
    <path d="M16 -24Q13 -34 18 -34Q23 -33 20 -25Z" fill="#d99390" stroke-width=".6"/>
    <path d="M-17 -5l-5 4h9l5 -4M15 -5l4 4h10l-3 -4" fill="#d99390" stroke-width="1"/>
    ${dot(26, -17, 2)}${dot(26.4, -17.6, .55, cream)}${dot(37, -10, 1.6, red)}
    ${line('M30 -11l13 -5M30 -9l15 -1M30 -7l11 4', ink, .8, .65)}
    ${line('M-21 -24l2 4m3 -6l2 4m3 -6l2 4m3 -5l2 4', ink, .26, .65)}
    <path d="M1 -26l-7 3l8 5l2 -6l5 6l4 -7l-10 1" fill="${seed % 2 ? green : red}" stroke-width=".9"/>
    ${dot(3, -23, 1.5, gold)}
  </g>`;
}

function mushrooms(seed) {
  const cap = [red, plum, '#bd743f'][Math.abs(seed) % 3];
  return `${shadow(36)}
    <path d="M-14 -30Q-19 -11 -14 -3Q-7 1 3 -3Q-3 -18 0 -34Z" fill="${cream}"/>
    <path d="M-14 -30Q-16 -12 -11 -6L-8 -5Q-12 -23 -8 -31Z" fill="#c9b68e" stroke="none"/>
    ${line('M-8 -25l1 14m4 -18l1 18', '#9a815d', .6, .65)}
    <path d="M-39 -33Q-36 -56 -15 -62Q2 -69 18 -43L25 -33Q0 -21 -39 -33Z" fill="${cap}"/>
    <path d="M-39 -33Q-6 -43 25 -33Q2 -20 -27 -27Z" fill="#e8cba2"/>
    ${line('M-30 -32l17 4m-10 -6l13 6m-4 -7l5 7m4 -7l-1 7m8 -6l-6 6m13 -5l-9 5', '#9b7154', .7, .7)}
    <path d="M-32 -37Q-29 -51 -15 -56" fill="none" stroke="#f3c28d" stroke-width="2" opacity=".7"/>
    <path d="M-22 -51q-3 -6 3 -6q6 0 4 6q-3 3 -7 0M-6 -59q3 -3 5 1q1 5 -4 5q-4 -1 -1 -6M9 -46q-5 -2 -4 4q1 5 6 3q4 -3 -2 -7M-29 -42q-5 0 -4 4q3 4 6 1q2 -4 -2 -5" fill="${cream}" stroke-width=".6"/>
    <path d="M25 -20Q21 -7 24 -2Q29 0 33 -3L30 -21" fill="${paper}"/>
    <path d="M12 -21Q19 -43 31 -37Q43 -33 45 -21Q28 -13 12 -21Z" fill="${gold}"/>
    <path d="M12 -21Q28 -25 45 -21Q30 -14 12 -21Z" fill="#d3be94"/>
    ${dot(26, -31, 2.6, cream)}${dot(35, -26, 2, cream)}${dot(20, -25, 1.7, cream)}
    ${line('M-36 -2l3 -8l3 7m38 1l-2 -7l5 5m25 0l2 -7l2 7', green, 1, 1)}
    <path d="M-26 -2q2 -5 6 -4q1 5 -6 4M36 -2q-1 -6 4 -7q4 4 -4 7" fill="${green}" stroke-width=".7"/>`;
}

function teapot() {
  return `${shadow(37)}
    <path d="M23 -38C47 -52 49 -15 26 -16L23 -23C39 -20 39 -38 26 -31Z" fill="${blue}"/>
    <path d="M-22 -31L-34 -40L-46 -42L-44 -35L-33 -30L-23 -16Z" fill="${blue}"/>
    <path d="M-26 -32Q-28 -7 -10 -4L15 -4Q32 -12 26 -32Q4 -45 -26 -32Z" fill="${blue}"/>
    <path d="M-20 -29Q-21 -11 -6 -8L-12 -8Q-29 -13 -23 -31Z" fill="#83bdba" stroke="none"/>
    <path d="M-28 -32Q-22 -42 25 -32L28 -29Q-3 -23 -28 -29Z" fill="#e1b34f"/>
    <path d="M-10 -38q-1 -11 7 -11q8 2 6 11" fill="${gold}"/>
    <path d="M-16 -5l-2 3h35l-3 -3" fill="${gold}"/>
    ${line('M-22 -32Q-2 -38 21 -32M-18 -5h31', '#6c5540', .8, .8)}
    <path d="M-2 -24l2 5l5 1l-4 4l1 5l-5 -2l-4 2l1 -5l-4 -4l6 -1Z" fill="${paper}" stroke-width=".8"/>
    ${dot(-14, -18, 1.6, gold)}${dot(15, -18, 1.6, gold)}
    ${line('M-17 -12l2 3m28 -2l-2 3', cream, .6, .8)}
    ${line('M-40 -43q-4 -6 1 -12q5 -7 0 -12M-32 -44q-3 -6 1 -10', '#a08b71', .55, .85)}`;
}

function toyboat() {
  return `${shadow(42)}
    <path d="M-42 -22L39 -22L23 -3L-25 -3Z" fill="${red}"/>
    <path d="M-37 -18L34 -18L27 -11H-31Z" fill="#e29b6c" stroke="none"/>
    <path d="M-42 -22l4 -4h72l5 4Z" fill="${gold}"/>
    <path d="M-2 -24V-87h4v63" fill="#96734d"/>
    <path d="M-4 -80Q-12 -48 -35 -32L-5 -32Z" fill="${cream}"/>
    <path d="M4 -74Q27 -61 32 -31L4 -31Z" fill="${blue}"/>
    ${line('M-9 -70L-13 -38l-14 1M10 -67Q23 -53 26 -37', '#ad916e', .6, .8)}
    ${line('M-30 -32Q-22 -53 -5 -77M5 -32Q21 -35 30 -31', ink, .6, .65)}
    <path d="M2 -87l16 4l-16 7Z" fill="${red}"/>
    <path d="M-17 -23v-5h27v5" fill="${green}"/>
    <path d="${[-23, -10, 3, 16].map(x => ellipsePath(x, -14, 2.6)).join('')}" fill="${cream}" stroke-width=".75"/>
    ${line('M-28 -6h49', '#703f3c', .6, .7)}
    ${line('M-44 -1q5 -4 11 0q6 -4 11 0m35 0q6 -4 11 0q6 -4 11 0', blue, .7, 1)}`;
}

function owl(seed = 0) {
  if (Math.abs(seed) % 3 === 1) return barnowl();
  if (Math.abs(seed) % 3 === 2) return snowyowl();
  return `${shadow(24)}
    <path d="M-23 -61l2 -17l16 10q8 -4 17 0l13 -11l-1 21Q30 -39 20 -13Q6 -4 -9 -12Q-31 -28 -23 -61Z" fill="#a98765"/>
    <path d="M-15 -34Q0 -40 16 -31Q21 -19 11 -10Q-6 -8 -15 -21Z" fill="${paper}"/>
    <path d="M-21 -59Q-9 -74 2 -57Q13 -73 24 -59L20 -36Q7 -28 1 -42Q-11 -27 -23 -41Z" fill="${cream}"/>
    <path d="M-23 -42Q-32 -29 -19 -16L-12 -13Q-20 -29 -14 -38" fill="#806b54"/>
    <path d="M23 -40Q31 -25 18 -14L10 -11Q20 -26 14 -37" fill="#806b54"/>
    <circle cx="-10" cy="-52" r="7.5" fill="${gold}"/><circle cx="13" cy="-52" r="7.5" fill="${gold}"/>
    ${dot(-9, -51, 3)}${dot(12, -51, 3)}${dot(-10, -53, 1, cream)}${dot(11, -53, 1, cream)}
    <path d="M-3 -45l8 0l-4 10Z" fill="#c98542"/>
    <path d="M-12 -10l-1 7m-4 -1l4 -3l4 4m15 -13l1 8m-4 2l4 -3l4 3" fill="none" stroke="#976341" stroke-width="1.4"/>
    ${line('M-10 -26l3 4l3 -4m5 0l3 4l3 -4m-11 8l3 4l3 -4M-21 -32l4 4m-5 2l4 4m20 -10l-4 4m5 2l-4 4', ink, .5, .65)}
    <path d="M-20 -67l12 3M10 -65l11 -4" fill="none" stroke="${ink}" stroke-width="1.5"/>
    <path d="M-29 -4Q0 0 30 -4l-1 4h-58Z" fill="#876441"/>
    ${line('M-24 -2h48', '#e0bb78', .5, .65)}`;
}

function cat(seed) {
  return `${shadow(33)}
    <path d="M13 -8C46 6 50 -18 38 -24C29 -29 26 -17 33 -16C44 -13 34 -4 20 -14Z" fill="#a4836a"/>
    <path d="M-15 -37Q-26 -19 -17 -5Q3 3 22 -5Q29 -19 11 -38Z" fill="#bb9678"/>
    <path d="M-20 -50l-4 -18l16 9Q-2 -61 8 -58l16 -10l-2 22Q24 -30 2 -27Q-18 -28 -20 -50Z" fill="#bb9678"/>
    <path d="M-20 -61l3 12l7 -8M19 -61l-8 6l9 6" fill="#d59c96" stroke-width=".6"/>
    <path d="M-15 -41q6 -6 12 0M7 -41q6 -6 12 0" fill="none" stroke="${ink}" stroke-width="1.5"/>
    <path d="M-3 -37h8l-4 4Z" fill="#9c6264"/>
    ${line('M1 -33v4m-1 0q-3 1 -6 -2m7 2q3 1 6 -2M-10 -36l-17 -3m17 6l-17 1m40 -4l17 -4m-17 7l16 2', ink, .8, .75)}
    <path d="M-10 -28Q1 -25 14 -29L15 -24Q-1 -20 -12 -24Z" fill="${seed % 2 ? blue : green}"/>
    <circle cx="2" cy="-21" r="3.3" fill="${gold}" stroke-width=".8"/>
    ${line('M2 -22v2m-1 1h2', ink, .8, .6)}
    <path d="M-8 -22L-11 -5l-6 2h12l3 -16M10 -21l2 16l-4 2h12l-3 -19" fill="#cda688"/>
    ${line('M-20 -17l7 2m-7 4l5 1m23 -44l3 -5m-10 4l1 -5M-4 -56l-1 5', '#6f554a', .6, 1.1)}
    ${line('M-13 -3v-3m3 3v-3m25 3v-3m3 3v-3', ink, .6, .6)}`;
}

function plant() {
  return `${shadow(25)}
    <path d="M-19 -29L-13 -4Q0 1 15 -4L21 -29Z" fill="${red}"/>
    <path d="M-18 -26l5 18l4 2l-4 -22Z" fill="#e39a78" stroke="none"/>
    <path d="M-23 -32l45 0l1 7Q0 -20 -23 -25Z" fill="#d58764"/>
    <ellipse cx="-.5" cy="-32" rx="22.5" ry="4" fill="#71604b"/>
    ${line('M-10 -10l2 -12m18 12l2 -12m-28 -7Q0 -25 20 -29', ink, .3, .7)}
    ${line('M0 -33Q-3 -55 1 -82M0 -46Q-18 -58 -24 -70M0 -58Q20 -62 29 -80M1 -74Q-11 -87 -15 -93', '#586d4e', 1, 1.5)}
    <path d="M1 -81Q-11 -96 7 -98Q15 -86 1 -81Z" fill="${green}"/>
    <path d="M-20 -66Q-39 -82 -27 -87Q-11 -89 -20 -66Z" fill="#86a480"/>
    <path d="M-8 -54Q-35 -66 -34 -53Q-30 -41 -8 -54Z" fill="#75976d"/>
    <path d="M14 -63Q13 -86 30 -85Q34 -66 14 -63Z" fill="#99ac7a"/>
    <path d="M7 -47Q17 -65 31 -56Q29 -39 7 -47Z" fill="#86a480"/>
    <path d="M-7 -81Q-24 -80 -23 -95Q-7 -100 -7 -81Z" fill="#b1ba82"/>
    ${line('M3 -94l-2 11m-27 0l5 13m-9 17l16 -1m40 -25l-9 13m14 12l-18 7m-28 -47l10 10', '#516c51', .7, .65)}
    <path d="M-5 -34q-18 -10 -20 -2q5 5 20 2M6 -34q11 -10 15 -3q-3 4 -15 3" fill="#76946e" stroke-width=".8"/>`;
}

function balloon(seed) {
  const color = [red, blue, plum, '#caac54'][Math.abs(seed) % 4];
  return `${shadow(12)}
    ${line('M0 -51C-21 -40 15 -29 -1 -18C-11 -11 8 -5 0 -3', '#76634f', 1, 1)}
    <path d="M0 -51C-14 -55 -26 -69 -22 -83Q-17 -98 0 -98Q20 -97 24 -82Q27 -64 0 -51Z" fill="${color}"/>
    <path d="M-15 -84Q-11 -92 -3 -93" fill="none" stroke="${cream}" stroke-width="3" opacity=".65"/>
    <path d="M0 -52l-4 5l9 0Z" fill="${color}"/>
    ${line('M12 -93Q26 -71 8 -57', ink, .26, 1)}
    ${line('M-10 -70l3 3m17 -2l3 -3', cream, .6, .9)}
    <path d="M-9 -4h20L9 -1h-18Z" fill="${paper}"/>
    ${line('M-7 -3h14', '#a68b65', .8, .65)}`;
}

function telescope() {
  return `${shadow(36)}
    <path d="M-3 -37L-31 -2h5l27 -32L22 -2h6L4 -38Z" fill="#936a49"/>
    <path d="M0 -37l2 35h5L5 -39Z" fill="#ab8055"/>
    ${line('M-27 -6l23 -27m9 -1l19 29m-19 -4l-1 -24', '#e0b675', .6, .7)}
    <circle cx="1" cy="-38" r="5" fill="${gold}"/>
    <path d="M-34 -55l9 -20L37 -48l-8 21Z" fill="${gold}"/>
    <path d="M-29 -57l5 -11L32 -44l-4 11Z" fill="#ecc778" stroke="none"/>
    <path d="M-36 -56l10 -22l7 3l-10 23Z" fill="#6f8790"/>
    <path d="M22 -54l-8 20l7 3l8 -20Z" fill="#9b7543"/>
    <path d="M29 -50l-9 22l12 5l9 -22Z" fill="#b48d4f"/>
    <ellipse cx="36" cy="-33" rx="5" ry="12" transform="rotate(22 36 -33)" fill="#5a8289"/>
    <ellipse cx="37" cy="-33" rx="2.8" ry="8" transform="rotate(22 37 -33)" fill="#c8dcd0" stroke-width=".7"/>
    ${line('M35 -37l3 5', cream, .8, .9)}
    <path d="M-34 -64l-7 -3l-4 9l7 4Z" fill="#725740"/>
    ${line('M-23 -64l4 -8m27 14l-4 11m-5 -14l-4 11', ink, .22, .7)}`;
}

function snail() {
  return `${shadow(40)}
    <path d="M-38 -4Q-14 -12 13 -11Q21 -17 26 -26L29 -13Q47 -7 44 -4Q13 2 -38 -4Z" fill="#c3bd8c"/>
    <path d="M-33 -4Q-4 -4 17 -6Q37 -8 41 -5" fill="none" stroke="#7f8763" stroke-width=".8"/>
    <path d="M-22 -8C-35 -18 -33 -39 -19 -47C-4 -56 17 -48 20 -32C23 -17 8 -6 -22 -8Z" fill="#bb825c"/>
    <path d="M-22 -8C-34 -17 -29 -41 -13 -44C3 -47 17 -35 14 -25C11 -14 -8 -13 -13 -24C-18 -35 -5 -39 2 -34C9 -27 0 -21 -4 -28" fill="none" stroke="#664d3e" stroke-width="1.6"/>
    <path d="M-25 -34Q-23 -43 -14 -44M-22 -16Q-13 -10 -1 -13" fill="none" stroke="#e6b680" stroke-width="2"/>
    ${line('M-27 -25l-4 1m4 -7l-4 -1m9 -10l-2 -4m8 3v-5m8 5l2 -4m6 8l4 -3m0 11l5 1m-8 8l3 4', '#77533f', .6, .7)}
    ${line('M27 -17l1 -20m4 23l8 -18', '#8f9673', 1, 1.4)}
    <circle cx="28" cy="-38" r="3.2" fill="${paper}"/><circle cx="41" cy="-33" r="3.2" fill="${paper}"/>
    ${dot(29, -38, 1.2)}${dot(42, -33, 1.2)}
    ${line('M30 -12q3 3 6 0', ink, .7, .75)}
    <path d="M-6 -49l-1 -7l6 3l4 -5l3 7Z" fill="${gold}" stroke-width=".8"/>`;
}

function toyrobot(seed) {
  return `${shadow(26)}
    <path d="M-17 -18l-2 12h-5v5h18l-1 -17M8 -17l-1 16h18v-5h-5l-3 -12" fill="#8a9790"/>
    <path d="M-20 -51l-7 4l-5 22l8 2l8 -19M20 -51l8 4l5 18l-8 5l-7 -20" fill="${gold}"/>
    <path d="M-33 -24l-2 7l4 4l4 -5l4 5l3 -3l-4 -9M25 -23l-2 6l4 4l4 -4l4 1l2 -6l-5 -5" fill="#8d9d94"/>
    <path d="M-20 -51L19 -51l3 32l-42 1Z" fill="${seed % 2 ? blue : green}"/>
    <path d="M-15 -44h28v18h-28Z" fill="#d2b56c"/>
    <path d="M-5 -26h8v6h-8Z" fill="#809484"/>
    <path d="M-19 -80h38v25h-38Z" fill="#a4b6a5"/>
    <path d="M-23 -74h4v13h-4m42 -13h4v13h-4" fill="#879287"/>
    ${line('M0 -81l-2 -10', ink, 1, 1.4)}${dot(-2, -93, 3, red)}
    <rect x="-14" y="-74" width="10" height="8" rx="2" fill="${cream}"/>
    <rect x="5" y="-74" width="10" height="8" rx="2" fill="${cream}"/>
    ${dot(-8, -70, 2)}${dot(9, -70, 2)}
    <path d="M-8 -61h18" fill="none" stroke="${ink}" stroke-width="1"/>
    ${line('M-4 -63v4m5 -4v4m5 -4v4', ink, .7, .7)}
    <path d="M-7 -39l4 -4l4 4l-4 6Z" fill="${red}" stroke-width=".7"/>
    ${dot(7, -37, 2, red)}${dot(7, -30, 1.2, cream)}
    <path d="${[-17, 16].map(x => [-49, -21, -78, -58].map(y => ellipsePath(x, y, 1.3)).join('')).join('')}" fill="#d8ddbe" stroke-width=".6"/>
    ${line('M-14 -12h6m17 0h7m-44 -24l5 1m22 -10l7 -2', ink, .4, .75)}`;
}

function fox() {
  return `${shadow(38)}
    <path d="M15 -9Q40 -5 41 -28Q37 -40 28 -35Q37 -24 18 -23Z" fill="#bf734c"/>
    <path d="M39 -31Q47 -20 38 -12L30 -14Q39 -19 33 -29Z" fill="${cream}"/>
    <path d="M-17 -38Q-28 -22 -18 -7Q-1 2 20 -7Q26 -21 10 -40Z" fill="#bf734c"/>
    <path d="M-12 -34Q-2 -24 8 -32L13 -10Q0 -3 -11 -11Z" fill="${cream}"/>
    <path d="M-20 -45l-8 -29l20 12Q1 -67 12 -61l17 -15l-5 30L3 -26Z" fill="#cc8255"/>
    <path d="M-23 -66l5 18l8 -10M23 -67l-13 9l10 10" fill="#5d4840" stroke-width=".7"/>
    <path d="M-20 -44l21 17l5 -8l-10 -15ZM24 -45L1 -27l-4 -8l10 -16Z" fill="${cream}" stroke-width=".8"/>
    ${dot(-9, -46, 1.9)}${dot(14, -46, 1.9)}
    <path d="M-3 -32q3 -4 8 0l-4 5Z" fill="#493a30"/>
    <path d="M-14 -24l-6 8l2 12h10l-1 -17m20 -3l5 9l-1 11H5l3 -17" fill="#805943"/>
    <path d="M-17 -29q14 7 34 0l1 7Q1 -14 -17 -22Z" fill="${blue}"/>
    <path d="M9 -22l-3 18h7l5 -17Z" fill="${blue}"/>
    ${line('M7 -6h7m-5 -14l5 1m-26 -9l2 3m3 -2l2 3m18 -6l2 3', cream, .6, .7)}
    ${line('M-18 -54l3 2m3 -7l3 2m15 -2l-3 2m14 3l-3 2', ink, .3, .75)}`;
}

function openbook() {
  return `${shadow(40)}
    <path d="M-43 -17l6 -39Q-12 -55 0 -48Q17 -57 40 -55L45 -15Q20 -19 0 -10Q-18 -18 -43 -17Z" fill="${red}"/>
    <path d="M-39 -20l5 -37Q-13 -57 -1 -50L0 -15Q-18 -22 -39 -20Z" fill="${cream}"/>
    <path d="M1 -50Q18 -59 37 -57l4 37Q18 -22 0 -15Z" fill="${paper}"/>
    <path d="M-34 -57q25 -7 34 3v39Q-11 -26 -38 -23Z" fill="#fff1cf"/>
    <path d="M0 -54q13 -9 35 -6l6 37Q12 -27 0 -15Z" fill="#f5e6bd"/>
    ${line('M0 -54v37M-41 -18Q-18 -20 0 -12Q20 -20 43 -17', '#8c7556', .6, .8)}
    ${line([-49, -44, -39, -34, -29].map((y, i) => `M-29 ${y}q${15 - i} -1 ${23 - i * 2} ${3 + i * .3}M7 ${y - 2}q12 -3 ${23 - i} -2`).join(''), '#9c8765', .65, .6)}
    <path d="M15 -58l1 34l4 -4l4 2l-2 -34Z" fill="${blue}" stroke-width=".6"/>
    <path d="M-29 -50h4v5h-4Z" fill="${red}" stroke="none"/>
    ${line('M-36 -25q20 -1 34 7M3 -18q12 -7 35 -5', ink, .25, .65)}`;
}

function window() {
  return `${shadow(42)}
    <path d="M-37 -4V-57Q-36 -96 0 -98Q36 -96 37 -57V-4Z" fill="#bf8568"/>
    <path d="M-29 -10v-47Q-27 -86 0 -88Q28 -86 29 -57v47Z" fill="#315360"/>
    <path d="M-27 -55Q-24 -86 0 -86Q25 -83 27 -55V-39Q2 -49 -27 -36Z" fill="#7bb4b5" stroke="none"/>
    <circle cx="13" cy="-68" r="9" fill="#f1d273" stroke="none"/>
    <path d="M-28 -30l10 -16l12 13l10 -10l14 17l10 -11v27h-56Z" fill="#637d70" stroke="none"/>
    <path d="M-28 -21q22 -15 56 1v10h-56Z" fill="#829674" stroke="none"/>
    <path d="M-3 -86h6v77h-6ZM-29 -53h58v5h-58Z" fill="#b49165"/>
    <path d="M-34 -8h69l7 5h-84Z" fill="#cfac7a"/>
    ${line('M-32 -8v-50Q-29 -90 0 -93Q31 -90 33 -57v49M-38 -4h76', '#754f40', .9, .85)}
    ${line('M-17 -75l-7 13m12 -17l-11 21m38 16l8 -8m-7 17l9 -10', cream, .4, .8)}
    ${line([-77, -63, -48, -33, -18].map(y => `M-37 ${y}h7M30 ${y - 3}h7`).join(''), ink, .35, .7)}
    <path d="M-32 -80l6 3l-6 6M29 -81l-6 4l6 6" fill="none" stroke="#e7b787" stroke-width="1"/>
    ${dot(-13, -70, 1, cream)}${dot(20, -82, .8, cream)}
    <path d="M-10 -32q2 -6 5 -6q4 0 5 6q-3 -1 -5 -4q-2 3 -5 4" fill="#35434a" stroke="none"/>`;
}

function moon() {
  return `${shadow(30)}
    <path d="M22 -87Q-16 -83 -15 -49Q-14 -24 21 -22Q-8 -5 -29 -29Q-51 -57 -22 -83Q-2 -97 22 -87Z" fill="${gold}"/>
    <path d="M5 -89Q-32 -78 -31 -50Q-32 -28 -13 -17Q-36 -30 -37 -50Q-37 -77 5 -89Z" fill="#ecc677" stroke="none"/>
    ${line('M-16 -69q-6 -1 -8 5', ink, 1, 1.3)}
    <path d="M-24 -61l-1 9l7 2l-6 3" fill="none" stroke="${ink}" stroke-width="1"/>
    ${line('M-20 -42q5 4 11 0', ink, 1, .9)}
    ${dot(-27, -45, 2.8, '#d18b59')}
    ${line('M-30 -70l-2 -2m-2 7l-3 -1m9 34l-2 2m8 1l-2 3', '#9e7643', .5, .7)}
    <path d="M26 -65l2 6l6 1l-5 4l1 6l-5 -3l-6 3l2 -6l-5 -4l7 -1Z" fill="${paper}" stroke-width=".8"/>
    <path d="M10 -11l1 4l4 1l-3 3l1 3l-3 -2l-4 2l1 -4l-3 -2l4 -1Z" fill="${blue}" stroke-width=".7"/>
    ${dot(38, -78, 1.4, paper)}${dot(17, -37, 1.4, paper)}${dot(-40, -16, 1.1, paper)}`;
}

function clock() {
  return `${shadow(32)}
    <path d="M-24 -20l-7 17h9l7 -12M23 -20l8 17h-9l-7 -12" fill="#8a5e45"/>
    <path d="M-3 -78v-7h6v7M-6 -86h12v4h-12" fill="${gold}"/>
    <path d="M-19 -71l-10 -9l-5 5l11 10M19 -71l10 -9l5 5l-11 10" fill="#9c754c"/>
    <path d="M-34 -75Q-24 -97 -12 -78l-2 7l-19 1Z" fill="${red}"/>
    <path d="M12 -78Q24 -97 34 -75l-1 5l-19 -1Z" fill="${red}"/>
    <circle cx="0" cy="-43" r="31" fill="${blue}"/>
    <circle cx="0" cy="-43" r="26" fill="${cream}"/>
    <circle cx="0" cy="-43" r="23.5" fill="none" stroke="#c2a47b" stroke-width=".7"/>
    ${[false, true].map(major => line(Array.from({length: 12}, (_, i) => {
      if ((i % 3 === 0) !== major) return '';
      const a = i * Math.PI / 6, x1 = Math.sin(a) * 20, y1 = -43 - Math.cos(a) * 20;
      const x2 = Math.sin(a) * (major ? 16.8 : 18.2), y2 = -43 - Math.cos(a) * (major ? 16.8 : 18.2);
      return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }).join(''), ink, .9, major ? 1.2 : .65)).join('')}
    <path d="M0 -43l-9 -11M0 -43l16 -5" fill="none" stroke="${ink}" stroke-width="2"/>
    <path d="M0 -43l-4 14" fill="none" stroke="${red}" stroke-width=".8"/>
    ${dot(0, -43, 2.6, gold)}
    ${line('M-27 -52q-1 16 11 26M18 -64q6 5 9 15', cream, .5, 1.3)}
    ${line('M-31 -79l2 1m2 -4l2 1m48 0l2 -1m2 4l2 -1', '#7f4d41', .7, .65)}
    ${stitches(-21, -21, 11, 4)}`;
}

// A flight of stairs drawn in its own little perspective. The three flights
// intentionally disagree about which direction is up at their shared landings.
function stairFlight(a, b, width, count, colors, rise = 0) {
  const pt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - rise * t];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const down = [0, 6];
  let svg = '';
  for (let i = 0; i < count; i++) {
    const p = at(i / count), q = at((i + 1) / count);
    const r = add(q, width), s = add(p, width);
    svg += `<path d="M${pt(p)}L${pt(q)}L${pt(add(q, down))}L${pt(add(p, down))}Z" fill="${colors[2]}" stroke-width=".8"/>`;
    svg += `<path d="M${pt(q)}L${pt(r)}L${pt(add(r, down))}L${pt(add(q, down))}Z" fill="${colors[1]}" stroke-width=".8"/>`;
    svg += `<path d="M${pt(p)}L${pt(q)}L${pt(r)}L${pt(s)}Z" fill="${i % 3 === 0 ? colors[3] : colors[0]}" stroke-width=".8"/>`;
    const h1 = add(p, [width[0] * .12, width[1] * .12]);
    const h2 = add(q, [width[0] * .83, width[1] * .83]);
    svg += line(`M${pt(h1)}L${pt(h2)}`, '#fff0c4', .35, .65);
    if (i % 2 === 0) {
      const h3 = add(q, [width[0] * .35, width[1] * .35 + 1]);
      svg += line(`M${pt(h3)}l-1 3m3 -2l-1 2`, '#6d4d3f', .42, .65);
    }
  }
  const railStart = add(at(0), [width[0] * .95, width[1] * .95 - 18]);
  const railEnd = add(at(1), [width[0] * .95, width[1] * .95 - 18]);
  let posts = '', highlights = '', nails = '';
  for (let i = 0; i <= count; i += 2) {
    const base = add(at(i / count), [width[0] * .95, width[1] * .95]);
    posts += `M${pt(base)}v-18`;
    highlights += `M${base[0] + .6} ${base[1] - 2}v-15`;
    nails += ellipsePath(base[0], base[1] - 18, 1.2);
  }
  svg += line(posts, '#584833', 1, 1.8) + line(highlights, '#d8b85e', .9, .8) + `<path d="${nails}" fill="#e0bd61" stroke="none"/>`;
  svg += line(`M${pt(railStart)}L${pt(railEnd)}`, '#443a2a', 1, 2.9);
  svg += line(`M${railStart[0]} ${railStart[1] - .5}L${railEnd[0]} ${railEnd[1] - .5}`, '#d7b45b', 1, 1.35);
  return svg;
}

function impossible() {
  const upper = ['#dba385', '#b76b58', '#845745', '#e5b38d'];
  const lower = ['#e9bd8b', '#c28267', '#8f5d4e', '#efc99a'];
  const left = ['#cd9478', '#9a5f4f', '#724a42', '#dda98c'];
  return `${shadow(84)}
    <path d="M-83 -51L-4 -139L87 -49L72 -28L-68 -25Z" fill="#b78566"/>
    <path d="M-4 -124L-60 -49L55 -47Z" fill="#f0d6a7" stroke-width="1"/>
    <path d="M-4 -124L-4 -95L32 -53L55 -47Z" fill="#d2ad82" stroke="none"/>
    <path d="M-68 -25L-66 -8L76 -10L72 -28Z" fill="#8b5c4a"/>
    <path d="M-66 -8l-6 7h149l-2 -9Z" fill="#bc8965"/>
    ${line('M-58 -18l17 -1m4 1l15 -1m5 0l17 -1m5 0l17 -1m5 -1l13 0m5 -1l19 0M-48 -9l-3 -10m39 9l-3 -10m42 9l-3 -12m33 11l-3 -11', '#593f34', .55, .7)}
    ${line('M-57 -5l22 -1m7 0h19m13 0h15m9 -1h31', '#e6bc86', .5, .7)}
    <path d="M-23 -30v-26Q-23 -83 1 -84Q26 -82 25 -56v26Z" fill="#765d47"/>
    <path d="M-17 -31v-25Q-17 -74 1 -76Q19 -75 19 -56v25Z" fill="#4e7662"/>
    <path d="M-16 -49Q-2 -60 18 -47v16h-34Z" fill="#6f9870" stroke="none"/>
    <path d="M-5 -31Q-9 -49 0 -65Q9 -54 5 -31" fill="#354f3e" stroke-width=".75"/>
    <path d="M-1 -52Q-17 -64 -13 -68Q1 -68 -1 -52M2 -54Q2 -71 12 -68Q17 -59 2 -54M-3 -39Q-18 -45 -15 -51Q-3 -53 -3 -39M4 -40Q17 -49 18 -40Q15 -34 4 -40" fill="#91a874" stroke-width=".7"/>
    ${line('M0 -63l1 28m-13 -31l10 11m14 -11l-9 12m-16 9l10 6m19 -2l-13 5', '#344e3d', .7, .6)}
    <path d="M-22 -30h47l3 4h-53Z" fill="#dda968"/>
    ${stairFlight([-78, -47], [-6, -129], [20, 9], 11, left)}
    <path d="M-12 -135l20 -8l16 15l-23 10Z" fill="#e9ba8d"/>
    <path d="M1 -118l23 -10v9l-22 12Z" fill="#b37159"/>
    ${stairFlight([5, -126], [82, -41], [-20, 8], 12, upper)}
    <path d="M63 -37l19 -9l13 13l-22 10Z" fill="#edbd87"/>
    <path d="M73 -23l22 -10v9l-22 12Z" fill="#a46651"/>
    ${stairFlight([79, -35], [-70, -35], [-2, -20], 14, lower, 16)}
    <path d="M-88 -54l21 -7l13 10l-19 9Z" fill="#e5b48a"/>
    <path d="M-88 -54v16l15 10v-14Z" fill="#a26250"/>
    <path d="M-73 -42l19 -9v6l-19 9Z" fill="#bd8063"/>
    ${line('M-88 -54l13 6m-11 0l12 7m-12 -1l11 7', '#724c3f', .5, .65)}
    <path d="M-85 -55v-20l16 -6v18M-7 -132v-18l12 -5l17 16v18M83 -45v-18l10 10v18" fill="none" stroke="#5e4932" stroke-width="2.5"/>
    <path d="M-85 -75l16 -6M-7 -150l12 -5l17 16M83 -63l10 10" fill="none" stroke="#e2ba60" stroke-width="1.3"/>
    ${dot(-85, -75, 1.3, gold)}${dot(-7, -150, 1.3, gold)}${dot(22, -139, 1.3, gold)}
    <g transform="translate(36 -83) rotate(48) scale(.23)">${mouse(0)}</g>
    <path d="M-60 -9q-9 -8 -12 -4q0 6 12 4M64 -11q5 -9 11 -7q1 6 -11 7" fill="#748967" stroke-width=".7"/>
    ${line('M-65 -11l-8 -5m142 3l7 -7', '#425c43', .8, .65)}
    ${dot(-34, -26, 1, '#e5b86d')}${dot(35, -27, 1, '#e5b86d')}`;
}

function gardenbook() {
  return `${shadow(54)}
    <path d="M-57 -151Q-12 -161 44 -151l5 143Q-1 -18 -57 -7Z" fill="#8c4f62"/>
    <path d="M-51 -149Q-9 -159 45 -149l2 6Q-5 -152 -49 -140Z" fill="#eee0b5"/>
    ${line('M-45 -147Q-2 -155 39 -148M-43 -144Q-2 -151 37 -145', '#ad906c', .7, .55)}
    <path class="book-cover" d="M-48 -142Q-7 -151 48 -141l8 134Q1 -19 -48 -6Z" fill="#b04f70"/>
    <path d="M-57 -151l9 9V-6l-9 -1Z" fill="#713d53"/>
    <path d="M-54 -149l2 139" fill="none" stroke="#c67b81" stroke-width="1.5"/>
    ${[-137, -126, -25, -15].map(y => `<path d="M-57 ${y}l9 2v4l-9 -2Z" fill="#d3a856" stroke-width=".6"/>`).join('')}
    <path d="M-42 -137Q1 -145 43 -136l7 121Q1 -25 -42 -13Z" fill="none" stroke="#e2ba66" stroke-width="2.1"/>
    <path d="M-38 -131Q0 -139 39 -130l6 108Q0 -30 -38 -19Z" fill="none" stroke="#d69c50" stroke-width=".65"/>
    <path d="M-34 -25v-72Q-34 -131 1 -135Q35 -133 37 -99l5 74Q2 -34 -34 -25Z" fill="#79c7cc"/>
    <path d="M-31 -93Q-31 -127 0 -132Q25 -130 33 -109Q15 -119 -31 -93Z" fill="#a0dddd" stroke="none"/>
    <path d="M-24 -107q4 -6 12 -4q5 -7 11 -3q2 4 8 2M8 -122q5 -6 12 -1" fill="none" stroke="#d3f0dc" stroke-width="2.1" opacity=".9"/>
    <circle cx="21" cy="-103" r="8" fill="#f0d27b" stroke="none"/>
    <path d="M-33 -77Q-13 -89 5 -73Q25 -87 38 -73l1 26Q4 -55 -33 -46Z" fill="#65977a" stroke="none"/>
    <path d="M-33 -61Q-13 -75 7 -55Q18 -64 39 -59l2 29Q5 -35 -33 -29Z" fill="#90ad78" stroke="none"/>
    <path d="M-32 -43Q-13 -52 0 -45Q21 -52 40 -40l1 14Q2 -32 -32 -25Z" fill="#b0bd7b" stroke="none"/>
    <path d="M9 -55Q3 -46 9 -42Q19 -38 0 -31L-12 -28L5 -27Q33 -40 17 -43Q9 -47 12 -55Z" fill="#f1cd6a" stroke-width=".6"/>
    ${line('M10 -54Q7 -46 14 -43M19 -39q-5 6 -13 8', '#c79a47', .7, .7)}
    <path d="M-20 -48l2 -43l5 0l1 43Z" fill="#6f6750"/>
    <path d="M-18 -81l-7 -10m9 15l10 -16m-11 3l-2 -11" fill="none" stroke="#5b5743" stroke-width="1.4"/>
    <path d="M-32 -88q-2 -10 8 -15q-2 -8 9 -12q10 -4 14 8q10 0 11 10q5 8 -5 14q-7 5 -17 0q-11 8 -20 -5Z" fill="#376d54"/>
    <path d="M-28 -99q5 -10 14 -9q7 -6 10 4q-4 4 -8 3q-7 7 -16 2M-25 -86q-2 -5 4 -5q9 4 17 -3q8 -4 10 2q-8 12 -18 7Z" fill="#54885e" stroke="none"/>
    ${line('M-26 -97l3 -3m7 -7l4 1m5 4l4 -1m-26 14l4 2m12 -2l3 -1m6 -4l3 1', '#93af75', .8, .75)}
    ${dot(-24, -94, 1.6, '#d9875a')}${dot(-12, -103, 1.7, '#dfad65')}${dot(-7, -89, 1.7, '#d9875a')}
    <path d="M28 -58l1 -27h3l2 27Z" fill="#6e6550" stroke-width=".7"/>
    <path d="M20 -79q-5 -11 4 -13q3 -9 11 -4q9 0 5 10q4 9 -7 10q-8 6 -13 -3Z" fill="#3e795a" stroke-width=".9"/>
    <path d="M23 -87q3 -8 11 -5m-10 12q7 4 12 -1" fill="none" stroke="#7d9c67" stroke-width="1.6"/>
    ${dot(24, -82, 1.4, '#d9a765')}${dot(35, -88, 1.5, '#d9875a')}
    <path d="M4 -57h17v-15H4Z" fill="#efdb9c" stroke-width=".75"/>
    <path d="M0 -70l12 -11l14 11Z" fill="#c95b56" stroke-width=".85"/>
    <path d="M16 -79v-7h4v10" fill="#af6051" stroke-width=".7"/>
    <path d="M10 -57v-9h5v9" fill="#715a49" stroke-width=".6"/>
    <path d="M6 -68h3v4H6m12 -4h3v4h-3" fill="#f4cc57" stroke-width=".55"/>
    ${line('M4 -69h17M6 -74l14 0m-10 -3h8', '#8d473f', .55, .55)}
    ${line('M18 -87q-3 -4 0 -7q3 -3 1 -6', '#d5e6c8', .85, .9)}
    <path d="M-11 -44v9m15 -11v9M-12 -40l17 -2m-17 5l17 -2m-13 0v-4m5 4v-4m5 3v-4" fill="none" stroke="#eadab1" stroke-width="1.1"/>
    ${line('M-28 -48q6 -2 11 -1M-5 -55l4 1M25 -53l9 -1M-26 -35l6 -1m9 -2l4 -1M30 -32l6 1', '#527b57', .65, .65)}
    <path d="M-34 -25v-72Q-34 -131 1 -135Q35 -133 37 -99l5 74" fill="none" stroke="#684253" stroke-width="2.4"/>
    <path d="M-36 -25v-72Q-36 -134 1 -137Q37 -135 39 -99l5 74" fill="none" stroke="#edc878" stroke-width="1.1"/>
    <path d="M-38 -25Q0 -36 47 -25l2 6Q3 -31 -38 -19Z" fill="#dbac5f"/>
    ${line('M-30 -23Q1 -29 41 -23', '#896c47', .6, .7)}
    <path d="M-38 -119q-6 -10 -10 -6q0 7 10 6M41 -115q10 -6 9 -12q-8 0 -9 12M-35 -40q-13 -7 -12 -14q8 -3 12 14M43 -44q10 -8 8 -14q-9 1 -8 14" fill="#86a270" stroke-width=".65"/>
    ${line('M-43 -123l5 4m10 1l-5 5m-10 73l-4 -9m53 2l5 -10', '#536c4b', .8, .6)}
    <path d="M-31 -13q-10 -7 -11 -3q-1 5 11 3m-5 -2q-11 -11 -8 -14q8 1 8 14m67 1q7 -10 13 -5q-3 6 -13 5m6 -4q4 -12 11 -10q0 7 -11 10" fill="#62966a" stroke-width=".7"/>
    <g transform="translate(-34 -8) scale(.27)">${mushrooms(0)}</g>
    <g transform="translate(35 -8) scale(.21)">${mushrooms(1)}</g>
    <path d="M-16 -17q1 -6 6 -5q3 4 -6 5m34 0q-3 -8 3 -9q5 4 -3 9" fill="#93aa70" stroke-width=".65"/>
    ${dot(-30, -129, 1.2, '#efcc7b')}${dot(33, -126, 1.2, '#efcc7b')}${dot(1, -140, 1.4, '#efcc7b')}
    <path d="M-8 -19l2 -4l4 2l4 -2l3 3l-6 3Z" fill="#e9c376" stroke-width=".7"/>
    ${line('M-47 -118v72m100 -65l1 62', '#d1838b', .45, .65)}
    ${line('M-55 -113l3 1m-3 5l3 1m-3 5l3 1m-3 5l3 1m-3 5l3 1', '#321e2f', .4, .55)}`;
}

function ladder() {
  const levels = Array.from({ length: 12 }, (_, i) => -17 - i * 15);
  return `${shadow(20)}
    <path d="${levels.map(y => `M-15 ${y}h30v5h-30Z`).join('')}" fill="#b8915e" stroke-width=".9"/>
    ${line(levels.map(y => `M-13 ${y + 1.4}h25`).join(''), '#f2cb8c', .7, .65)}
    ${dots(levels.flatMap(y => [[-12, y + 2.5, .7], [12, y + 2.5, .7]]))}
    <path d="M-19 -198h6l1 196l-7 1Z" fill="#b48a54"/>
    <path d="M13 -198h6l1 197l-7 -1Z" fill="#bd955d"/>
    ${line('M-17 -193l1 186m31 -184l1 186', '#f0c88c', .65, 1.2)}
    ${line('M-15 -190v31q-3 4 -1 10v37q-2 5 0 8v20m0 10v20q-3 6 0 9v24m31 -162v27q-2 4 0 10v24q2 4 0 8v41m0 7v29', '#6d523b', .55, .6)}
    <path d="M-17 -82q-2 -7 0 -10q3 3 0 10Zm33 -49q-2 -6 0 -9q2 3 0 9Z" fill="#8b693f" stroke-width=".55"/>
    <path d="M-19 -4h8v4h-8M12 -4h9v4h-9" fill="#6d5b4a" stroke-width=".65"/>
    <path d="M-19 -198l2 -3h4v3m26 0l2 -3h4v3" fill="#d4ad73" stroke-width=".7"/>
    ${line('M-18 -24l4 1m27 -67l5 -1M-18 -173l4 1', '#62503a', .5, .65)}`;
}

function toyhouse(seed) {
  const siding = seed % 2 ? '#cf9c86' : '#ddb77a';
  const windowBox = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-8 -15h16V0H-8Z" fill="#715c47"/><path d="M-6 -13H6v11H-6Z" fill="#edcb72" stroke-width=".6"/><path d="M-11 -16h3V1h-3m19 -17h3V1H8" fill="#628e8b" stroke-width=".7"/>${line('M0 -13v11m-6 -5H6m-17 -6h3m-3 4h3m19 -4h3m-3 4h3', ink, .65, .55)}<path d="M-10 1h20v2h-20Z" fill="#b68758" stroke-width=".7"/></g>`;
  return `${shadow(45)}
    <path d="M-37 -62h73v54h-73Z" fill="${siding}"/>
    <path d="M36 -62l8 8v43l-8 3Z" fill="#b28669"/>
    ${line([-53, -44, -35, -26, -17].map(y => `M-36 ${y}h72M37 ${y + 2}l5 4`).join(''), '#9c7053', .45, .6)}
    <path d="M-27 -82v-18h10v26" fill="#be765e"/>
    <path d="M-30 -101h16v4h-16Z" fill="#d8a579"/>
    ${line('M-27 -92h10m-10 7h10m-6 -14v6m3 1v6', '#7b5141', .65, .65)}
    <path d="M-48 -60L0 -94l48 34l-8 5L0 -84L-40 -55Z" fill="#5b837f"/>
    <path d="M-41 -61L0 -89l41 28L0 -84Z" fill="#749d93" stroke="none"/>
    ${[-80, -74, -68, -62].map((y, i) => {
      const w = 11 + i * 9;
      return line(`M${-w} ${y}h${w * 2}m${-w * 1.5} 0l2 5m5 -5l2 5m5 -5l2 5m5 -5l2 5`, '#3d605b', .75, .7);
    }).join('')}
    <circle cx="0" cy="-75" r="6.6" fill="#e6c27b"/><circle cx="0" cy="-75" r="4.4" fill="#435c5a" stroke-width=".7"/>
    ${line('M0 -79v8m-4 -4h8', '#dcb67a', 1, .8)}
    ${windowBox(-22, -37)}${windowBox(22, -37)}${windowBox(-23, -14)}
    <path d="M4 -8v-22q0 -8 8 -8q8 0 8 8v22Z" fill="#8c4c67"/>
    <path d="M7 -10v-20q0 -5 5 -5q5 0 5 5v20Z" fill="#b96c7e" stroke-width=".7"/>
    <path d="M9 -28h6v5H9Z" fill="#e9bd63" stroke-width=".65"/>
    ${dot(15, -18, 1.2, gold)}${line('M9 -17v5h4v-5Z', '#75435a', .7, .65)}
    <path d="M-40 -8h80v4h-80ZM0 -4h26v3H0" fill="#a5916b"/>
    ${line('M-34 -6h25m6 0h13m18 0h11m-33 3h17', '#dac99e', .6, .7)}
    <path d="M-15 -10h8l-1 -5h-6Z" fill="#b86d55" stroke-width=".6"/>
    ${line('M-11 -15v-7m0 4l-4 -3m4 1l4 -3', '#526d4d', 1, .8)}
    ${dot(-11, -24, 2.1, '#d7a751')}${dot(-16, -22, 1.6, red)}${dot(-6, -24, 1.6, red)}
    ${line('M-23 -101q-3 -3 0 -5q3 -2 1 -4', '#a69179', .5, .75)}`;
}

function rockinghorse(seed = 0) {
  return `${shadow(46)}<g class="rocking-horse" data-rock-pivot="0,0" style="--rock-duration:${(3.2 + Math.abs(seed % 5) * .17).toFixed(2)}s;--rock-delay:${(-1.3 - Math.abs(seed % 11) * .37).toFixed(2)}s;--rock-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box">
    <path d="M-49 -17Q0 8 49 -17L46 -10Q0 10 -46 -10Z" fill="#9d6d47"/>
    <path d="M-47 -15Q0 6 47 -15" fill="none" stroke="#ddb377" stroke-width="1.5"/>
    ${line('M-39 -10Q0 9 39 -10', '#5c4937', .55, .65)}
    <path d="M-29 -46l-9 29l6 3l15 -29M-19 -42l5 30h7l-3 -32M16 -45l8 31l7 -2l-7 -29M23 -47l16 26l-5 5l-21 -27" fill="#bb8d5d"/>
    <path d="M-39 -18l8 3l-1 4l-8 -3m25 1h8v4h-8m31 -7l10 -1l1 4l-10 1m15 -9l6 -4l3 4l-6 4" fill="#6f5440" stroke-width=".75"/>
    <path d="M-32 -51C-42 -55 -45 -46 -39 -41Q-49 -39 -46 -48Q-48 -62 -35 -62L-28 -58Z" fill="#714c3d"/>
    <path d="M-35 -56Q-18 -70 14 -57L23 -81L21 -91L29 -97L34 -87L45 -82L43 -71L32 -69L29 -50Q18 -38 -9 -41Q-30 -35 -35 -56Z" fill="#c49b6a"/>
    <path d="M-30 -52Q-9 -61 14 -51Q25 -53 28 -71l1 16Q14 -40 -8 -44Q-24 -37 -30 -52Z" fill="#dcba82" stroke="none"/>
    <path d="M17 -60l-6 -5l8 -6l-3 -6l7 -5l-2 -6l6 -7l3 8l-5 7l1 5l-5 5l2 5Z" fill="#775443" stroke-width=".8"/>
    ${line('M26 -90l-2 6m1 7l-4 4m-1 7l-3 3M-43 -48q-1 -9 7 -9', '#b48756', .8, .65)}
    <path d="M-16 -62Q-2 -66 10 -59l-3 15l-22 -1Z" fill="#b65e65"/>
    <path d="M-15 -63Q-3 -68 12 -62l-1 6Q-3 -62 -17 -57Z" fill="#744552"/>
    ${line('M-12 -57l-1 8h17l2 -6', '#e4b56b', 1, .8)}
    ${stitches(-10, -47, 4, 4)}
    <path d="M3 -58L-2 -37l7 2l5 -22" fill="none" stroke="#564b3c" stroke-width="1.2"/>
    <path d="M-3 -39q-2 7 3 8q6 1 6 -6Z" fill="none" stroke="#d0a658" stroke-width="1.2"/>
    <path d="M34 -85l-4 15l10 2M32 -77l12 2M31 -73Q16 -79 8 -63" fill="none" stroke="#845849" stroke-width="1.1"/>
    ${dot(36, -81, 1.7)}${dot(43, -75, 1)}${dot(36.3, -81.4, .4, cream)}
    ${line('M-27 -53Q-14 -59 -6 -55m-19 6q7 -4 13 -2m8 -1l12 2M23 -60l3 -8m-48 30l-10 15m20 -19l4 23m27 -24l7 22', '#765638', .5, .6)}
    <path d="${[-26, -9, 20, 28].map((x, i) => ellipsePath(x, -43 - i, 1.8)).join('')}" fill="#e1b76c" stroke-width=".65"/>
    <path d="M-24 -52q-4 -2 -5 0q2 3 5 0Z" fill="none" stroke="#866239" stroke-width=".55"/></g>`;
}

function goldfish(x, y, scale = 1, reverse = false, seed = 0, phase = 0) {
  const duration = (10.8 + Math.abs(seed % 6) * .6 + phase * 3.3).toFixed(1);
  const delay = (-2.4 - Math.abs(seed % 9) * .63 - phase * 5.2).toFixed(2);
  return `<g class="fish-position" transform="translate(${x} ${y}) scale(${reverse ? -scale : scale} ${scale})" stroke-width=".8"><g class="swimming-fish" style="--swim-duration:${duration}s;--swim-delay:${delay}s;--swim-direction:${phase ? 'reverse' : 'normal'}">
    <g class="fish-tail" style="transform-origin:-10px 0px;transform-box:view-box;--tail-duration:${(.85 + phase * .23).toFixed(2)}s;--tail-delay:${delay}s"><path d="M-9 -1l-11 -7l2 9l-3 7l12 -6Z" fill="#de8a4c"/>${line('M-14 -6l1 7m-5 -6l5 3m-9 4l7 -3', '#a45e39', .8, .6)}</g>
    <path d="M-8 -5q-2 -9 6 -7l6 7M-3 4l6 6l4 -6" fill="#f0ae59"/>
    <path d="M-12 0Q-9 -9 3 -7Q14 -6 15 0Q12 8 1 7Q-9 7 -12 0Z" fill="#e99d44"/>
    <path d="M-9 -2Q0 -6 10 -3" fill="none" stroke="#f3c878" stroke-width="1.5"/>
    <path d="M6 -6Q1 -1 6 6M-1 -2l-5 4l7 1" fill="none" stroke="#a15e39" stroke-width=".65"/>
    ${dot(10, -1, 1.5)}${dot(10.3, -1.5, .5, cream)}
    ${line('M15 0l2 1', '#a45e39', .8, .6)}
    ${line('M-6 -5l1 2m2 -3l1 2m-5 7l1 -2m3 2l1 -2', '#b76d37', .65, .55)}
  </g></g>`;
}

function fishbowl(seed = 0, token = '0') {
  const gravelColors = ['#cfb17b', '#71958a', '#b68370', '#dfc990'];
  const clip = `fishbowl-interior-${token}`;
  // Stones within a row are disjoint; keep rows in order because the front row
  // can overlap the back row. This preserves the original layering of colors.
  const gravel = [0, 1].map(row => gravelColors.map((fill, color) => {
    const stones = Array.from({ length: row ? 10 : 11 }, (_, col) => {
      const i = row * 11 + col;
      if (i % 4 !== color) return '';
      const x = Number((-27 + col * 5.1).toFixed(2));
      const y = Number((-11 + row * 2.8 + Math.sin(i) * 1.2).toFixed(2));
      return ellipsePath(x, y, 1.5 + (i % 3) * .5, 1 + (i % 2) * .35);
    }).join('');
    return `<path d="${stones}" fill="${fill}" stroke-width=".45"/>`;
  }).join('')).join('');
  return `${shadow(31)}
    <defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><path d="M-36 -56Q-47 -37 -32 -17Q-21 -8 0 -8Q25 -7 34 -21Q46 -41 35 -56Z"/></clipPath></defs>
    <path d="M-23 -79C-18 -74 -25 -69 -34 -60C-57 -33 -36 -4 0 -4C38 -4 55 -33 33 -61C24 -70 18 -74 23 -79Z" fill="#d2e5d3" fill-opacity=".24"/>
    <path d="M-37 -57Q-48 -37 -33 -16Q-22 -6 0 -6Q25 -5 35 -21Q47 -41 36 -57Z" fill="#57b4b6" fill-opacity=".65" stroke="none"/>
    <ellipse cx="-.5" cy="-57" rx="37.5" ry="5.8" fill="#8cd0ca" fill-opacity=".7" stroke="#537f80" stroke-width=".7"/>
    ${line('M-25 -55q11 -4 22 -1m7 2q9 -2 20 -1m-49 26q9 1 16 0m23 6q10 -1 17 -3', '#d3ece1', .5, .65)}
    <path d="M17 -10Q10 -30 18 -52M17 -22Q29 -35 24 -42M17 -19Q4 -30 6 -40" fill="none" stroke="#4d7a62" stroke-width="1.1"/>
    <path d="M17 -42Q6 -55 11 -58Q19 -57 17 -42M17 -32Q22 -49 28 -43Q32 -36 17 -32M12 -26Q-1 -39 3 -43Q11 -42 12 -26M18 -16Q26 -30 30 -23Q32 -16 18 -16" fill="#65966a" stroke-width=".7"/>
    ${line('M11 -55l5 10m12 4l-9 8m-15 -13l7 14m17 5l-9 8', '#adc08c', .7, .6)}
    <g class="fishbowl-swimming-space" clip-path="url(#${clip})">${goldfish(-13, -33, .75, false, seed, 0)}${goldfish(15, -48, .52, true, seed, 1)}</g>
    ${gravel}
    <path d="M-25 -80C-18 -75 -25 -68 -34 -59C-57 -33 -36 -4 0 -4C38 -4 55 -33 33 -60C24 -69 18 -75 25 -80" fill="none" stroke="#567975" stroke-width="1.4"/>
    <ellipse cx="0" cy="-80" rx="25" ry="4" fill="#b7d8ca" fill-opacity=".5" stroke="#577d7a" stroke-width="1.1"/>
    <ellipse cx="0" cy="-80" rx="21" ry="2.1" fill="none" stroke="#f1f4d9" stroke-width=".8"/>
    <path d="M-34 -57Q-46 -37 -32 -22M-30 -18l4 3M35 -47Q42 -34 36 -26" fill="none" stroke="#f3f4d7" stroke-width="2.2" opacity=".78"/>
    <path d="${[-44, -52, -63].map((y, i) => ellipsePath(-6 + i * 2, y, 1.3 + i * .45)).join('')}" fill="none" stroke="#d0eece" stroke-width=".7"/>
    <path d="M-24 -4Q0 1 24 -4l-1 3Q0 1 -23 -1Z" fill="#a4c0b2" fill-opacity=".7" stroke="#5c7f77" stroke-width=".8"/>`;
}

function cheese() {
  return `${shadow(43)}
    <path d="M-43 -7L-24 -48L42 -30L43 -6Z" fill="#dea549"/>
    <path d="M-43 -7L-24 -48L-24 -23Z" fill="#ba833d"/>
    <path d="M-24 -48L42 -30L-24 -23L-43 -7Z" fill="#efce73"/>
    <path d="M-24 -23l66 -7l1 24L-43 -7Z" fill="#e7b75c"/>
    <path d="M-43 -7L-24 -23l66 -7v4l-64 7l-17 14Z" fill="#f4d98b" stroke="none"/>
    <path d="M-43 -7L-22 -20l65 -8v5l-62 6l-20 12Z" fill="none" stroke="#9b7139" stroke-width=".7" opacity=".45"/>
    <ellipse cx="-13" cy="-39" rx="5" ry="2.6" transform="rotate(15 -13 -39)" fill="#ae7739" stroke-width=".65"/>
    <ellipse cx="15" cy="-35" rx="4" ry="2.1" transform="rotate(15 15 -35)" fill="#ba813d" stroke-width=".65"/>
    <ellipse cx="-23" cy="-28" rx="3.4" ry="1.8" transform="rotate(-25 -23 -28)" fill="#ba813d" stroke-width=".65"/>
    <ellipse cx="-7" cy="-14" rx="5" ry="3.8" fill="#b7803c" stroke-width=".7"/>
    <ellipse cx="21" cy="-18" rx="4.1" ry="4" fill="#b67c38" stroke-width=".7"/>
    <ellipse cx="31" cy="-11" rx="2.4" ry="2" fill="#c08b40" stroke-width=".6"/>
    <path d="M-10 -16q4 -3 7 0m23 -4q3 -2 4 1m-36 -23l4 1m26 5l3 1" fill="none" stroke="#8b6336" stroke-width=".7"/>
    <path d="M42 -27q-8 2 -5 6q-10 2 -6 7q-7 1 -5 6l17 2Z" fill="#f1dfb2"/>
    ${line('M37 -23l-3 1m-2 5l-3 1m-1 5l-2 1', '#bca678', .7, .55)}
    ${dot(-30, -6, 1.5, '#e7b75c')}${dot(-25, -2, 1.2, '#e7b75c')}${dot(27, -2, 1, '#e7b75c')}
    ${line('M-27 -16l8 -1m-13 6l7 -1m28 -19l7 -1', '#fff0b3', .7, .75)}
    ${line('M-26 -43l-4 8m-3 7l-4 8', '#7d633d', .4, .65)}`;
}

// Roman clock numerals are little pen strokes, so SVG exports are font independent.
function romanDial(cx, cy, radius) {
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const number = value => Number(value.toFixed(3));
  const strokes = numerals.map((n, i) => {
    const a = i * Math.PI / 6;
    // Keep the original dial's two-decimal placements and glyph spacing.
    const x = Number((cx + Math.sin(a) * radius).toFixed(2));
    const y = Number((cy - Math.cos(a) * radius).toFixed(2));
    return [...n].map((c, j) => {
      const gx = number(x + (j - (n.length - 1) / 2) * 3.2);
      if (c === 'I') return `M${gx} ${number(y - 2)}v4m-1 -4h2m-2 4h2`;
      if (c === 'V') return `M${number(gx - 1.3)} ${number(y - 2)}L${gx} ${number(y + 2)}l1.3 -4`;
      return `M${number(gx - 1.3)} ${number(y - 2)}l2.6 4m0 -4l-2.6 4`;
    }).join('');
  }).join('');
  return `<path d="${strokes}" fill="none" stroke-width=".65"/>`;
}

function mantelclock(seed) {
  return `${shadow(38)}
    <path d="M-32 -9v-43Q-33 -86 0 -88Q33 -87 32 -52v43Z" fill="#85534b"/>
    <path d="M-27 -9v-42Q-29 -80 0 -83Q29 -81 27 -51v42Z" fill="#af795e"/>
    <path d="M-32 -52Q-33 -86 0 -88Q33 -87 32 -52l-4 0Q27 -81 0 -83Q-29 -81 -28 -52Z" fill="#d6a854"/>
    <path d="M-38 -9h76v6h-76Zm-3 6h82v3h-82Z" fill="#a27955"/>
    <path d="M-31 -9h62v3h-62Z" fill="#d8b16c" stroke-width=".7"/>
    <circle cx="0" cy="-57" r="23.5" fill="#d6ac5f"/><circle cx="0" cy="-57" r="20.5" fill="${cream}"/>
    <circle cx="0" cy="-57" r="18.8" fill="none" stroke="#c4a06b" stroke-width=".6"/>
    ${romanDial(0, -57, 15.8)}
    <path d="M0 -57l-8 -8M0 -57l${seed % 2 ? 10 : -11} ${seed % 2 ? 2 : 5}" fill="none" stroke="#514036" stroke-width="1.35"/>
    ${dot(0, -57, 1.7, '#b48849')}
    <path d="M-12 -12v-15q0 -7 12 -7q12 0 12 7v15Z" fill="#4e625e"/>
    <path d="M-9 -12v-14q0 -6 9 -6q9 0 9 6v14Z" fill="#64847a" stroke-width=".65"/>
    <g class="pendulum-support" data-pivot="0,-32" transform="translate(0 -32)"><g class="clock-pendulum" style="--pendulum-duration:${(2.6 + Math.abs(seed % 5) * .13).toFixed(2)}s;--pendulum-delay:${(-.7 - Math.abs(seed % 7) * .31).toFixed(2)}s;--pendulum-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box">
      <path d="M0 0v11" fill="none" stroke="#dfbd6f" stroke-width="1.35"/>
      <circle cx="0" cy="14" r="5.2" fill="#d8b060" stroke-width=".8"/>
      <path d="M-2 11q4 -2 5 2" fill="none" stroke="#f5d58b" stroke-width=".8"/>
    </g></g>
    ${line('M-25 -44q-3 9 0 28m3 -24q-2 12 0 21m26 -25q3 9 0 28m-3 -24q2 11 0 20', '#69483d', .6, .65)}
    <path d="M-22 -21q-4 -4 -3 -7q3 1 3 7Zm47 -4q3 -5 1 -8q-2 2 -1 8Z" fill="none" stroke="#64473a" stroke-width=".6"/>
    ${line('M-29 -58Q-29 -81 -7 -84m18 1q16 6 18 23M-36 -5h72', '#f1cf85', .65, .8)}
    ${dot(-17, -10, 1, gold)}${dot(17, -10, 1, gold)}`;
}

function cuckooclock(seed = 0) {
  const chain = (x, top, bottom) => Array.from({ length: Math.floor((bottom - top) / 3) }, (_, i) => ellipsePath(x + (i % 2 ? .55 : -.55), top + i * 3, 1, 2)).join('');
  return `${shadow(23)}
    <path d="${chain(-16, -43, -10) + chain(17, -43, -14)}" fill="none" stroke="#ad874a" stroke-width=".65"/>
    <path d="M-16 -13Q-25 -8 -20 -2Q-17 2 -13 -2Q-8 -8 -16 -13ZM17 -18Q9 -13 13 -7Q17 -2 21 -8Q25 -14 17 -18Z" fill="#8e7651"/>
    ${line('M-20 -8l6 3m-6 0l5 2m-5 0l4 2m8 -15l6 3m-7 0l6 3m-5 0l4 2', '#c3a466', .9, .65)}
    <path d="M-29 -106l29 -17l29 17v62l-29 9l-29 -9Z" fill="#b18459"/>
    ${line([-99, -88, -77, -66, -55, -44].map(y => `M-27 ${y}h54`).join(''), '#785b40', .45, .6)}
    <path d="M-36 -102L0 -130l36 28l-4 6L0 -119L-32 -96Z" fill="#775b45"/>
    <path d="M-32 -103L0 -126l32 23L0 -119Z" fill="#ac8a61" stroke="none"/>
    ${line('M-20 -112l5 3m4 -9l5 4m3 -7l5 5m4 -5l-4 5m14 -2l-5 4m14 -2l-5 3m-42 5l5 3m5 -7l4 3m18 -3l-4 3m15 -1l-4 3', '#4f4434', .65, .75)}
    <path d="M-9 -93v-12q0 -10 9 -10q9 0 9 10v12Z" fill="#594d3c"/>
    <path d="M-9 -107l-6 3v12l6 -1m18 -14l6 3v12l-6 -1" fill="#b48a58" stroke-width=".75"/>
    <path d="M-5 -99Q-4 -108 3 -108Q8 -105 4 -100l4 3l-4 1l-6 4l-6 -3Z" fill="#79918a" stroke-width=".75"/>
    <path d="M4 -104l6 2l-6 2Z" fill="#d8ac5b" stroke-width=".55"/>
    ${dot(3, -104, 1)}${line('M-4 -99q4 2 5 -2', '#ced9ad', .8, .65)}
    <circle cx="0" cy="-70" r="21" fill="#d4ac64"/><circle cx="0" cy="-70" r="17.7" fill="#efe0b2"/>
    ${romanDial(0, -70, 13.7)}
    <path d="M0 -70l-7 -7M0 -70l11 3" fill="none" stroke="#514434" stroke-width="1.35"/>
    ${dot(0, -70, 1.65, '#b68a47')}
    <path d="M-9 -43v10h18v-10" fill="none" stroke="#ba935a" stroke-width="1.1"/>
    <g class="pendulum-support" data-pivot="0,-33" transform="translate(0 -33)"><g class="clock-pendulum" style="--pendulum-duration:${(2.85 + Math.abs(seed % 4) * .17).toFixed(2)}s;--pendulum-delay:${(-1.4 - Math.abs(seed % 9) * .27).toFixed(2)}s;--pendulum-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box">
      <path d="M0 0v13" fill="none" stroke="#ba935a" stroke-width="1.1"/>
      <path d="M-8 14Q0 4 8 14Q0 25 -8 14Z" fill="#c3a268" stroke-width=".8"/>
      ${line('M0 10v9m-4 -7l4 3l4 -3', '#795f42', .7, .65)}
    </g></g>
    <path d="M-26 -92Q-40 -99 -41 -90Q-37 -80 -26 -84M27 -91Q40 -97 41 -89Q37 -80 27 -83M-28 -62Q-41 -68 -42 -60Q-38 -49 -27 -51M28 -63Q41 -68 42 -59Q39 -49 28 -51" fill="#69876c" stroke-width=".8"/>
    ${line('M-40 -90l13 4m-13 26l12 6m13 -37l13 -4m-11 32l11 -7', '#405c47', .75, .65)}
    <path d="M-26 -43l8 7l18 6l18 -6l8 -7l-26 7Z" fill="#856746"/>
    ${line('M-25 -84v8m0 5v12m49 -45v10m1 29v9M-8 -42l5 2m6 0l5 -2', '#654c37', .55, .65)}
    ${dot(-24, -98, 1.1, '#d1af70')}${dot(24, -98, 1.1, '#d1af70')}
    <path d="M-5 -121q5 -9 10 0" fill="none" stroke="#d0ae72" stroke-width="1"/>`;
}

function hourglass() {
  return `${shadow(26)}
    <path d="M-24 -74h48v5h-48Zm-4 -5h56v5h-56Z" fill="#a17c4e"/>
    <path d="M-24 -8h48v5h-48Zm-4 5h56v3h-56Z" fill="#a17c4e"/>
    <path d="M-24 -70h4v61h-4m44 -61h4v61h-4" fill="#bd955f"/>
    ${line('M-22 -67v55m44 -55v55M-24 -77h48M-24 -1h48', '#e2be7e', .7, .8)}
    <path d="M-16 -69C-19 -54 -6 -49 -3 -40C-5 -30 -19 -25 -16 -9H16C20 -25 5 -30 3 -40C5 -49 19 -54 16 -69Z" fill="#b5d2c3" fill-opacity=".3" stroke="#698c83" stroke-width="1.1"/>
    <path d="M-14 -63Q-11 -53 0 -44Q11 -53 14 -63Z" fill="#d5b266" stroke-width=".6"/>
    <path d="M-15 -12Q-8 -19 0 -28Q9 -19 15 -12v3h-30Z" fill="#dfbd73" stroke-width=".6"/>
    <path d="M-14 -63Q0 -59 14 -63" fill="none" stroke="#f0d698" stroke-width="1.1"/>
    <path d="M0 -44v14" fill="none" stroke="#b6934f" stroke-width=".7"/>
    ${line('M-12 -65Q-13 -56 -6 -50m-7 33l2 -5m22 -3q6 7 4 14', '#f1f4d8', .8, 1.3)}
    ${dots([...Array.from({length: 15}, (_, i) => [-10 + (i % 6) * 4, -14 - Math.floor(i / 6) * 2]), ...Array.from({length: 10}, (_, i) => [-7 + (i % 5) * 3.5, -58 + Math.floor(i / 5) * 3])], '#9f804b', .4)}
    ${line('M-20 -18h-4m4 -9h-4m44 9h4m-4 -9h4', '#806143', .5, .6)}
    <path d="M-26 -76h2v3h-2m50 -3h2v3h-2m-52 68h2v3h-2m50 -3h2v3h-2" fill="#6e593e" stroke-width=".5"/>
    <path d="M-21 -43q-2 -7 0 -9q2 3 0 9Zm43 13q-2 -7 0 -9q2 3 0 9Z" fill="none" stroke="#80613e" stroke-width=".5"/>`;
}

function barnowl() {
  return `${shadow(25)}
    <path d="M-18 -60Q-27 -39 -22 -22Q-16 -7 0 -7Q20 -6 25 -28Q31 -52 16 -67Z" fill="#c69e6c"/>
    <path d="M-17 -37Q-10 -19 -5 -11h12Q20 -25 18 -39Z" fill="#f0d9a7"/>
    <path d="M-23 -60Q-29 -76 -15 -83Q-3 -90 2 -77Q12 -90 25 -79Q34 -66 24 -52Q10 -38 1 -34Q-11 -43 -23 -60Z" fill="#b88c62"/>
    <path d="M-20 -63Q-22 -77 -12 -78Q-1 -79 1 -67Q5 -81 17 -77Q28 -73 23 -60Q16 -48 1 -40Q-13 -50 -20 -63Z" fill="#f3e3bf"/>
    <path d="M-19 -59Q-14 -48 0 -41Q16 -49 23 -61" fill="none" stroke="#c4a273" stroke-width=".8"/>
    ${dot(-9, -63, 3.2, '#463a31')}${dot(12, -63, 3.2, '#463a31')}${dot(-10, -64, .8, cream)}${dot(11, -64, .8, cream)}
    <path d="M-2 -58h6l-3 9Z" fill="#b08a56" stroke-width=".7"/>
    <path d="M-23 -44Q-30 -30 -23 -18l9 7l-5 -19l7 -15M23 -45Q30 -30 22 -16l-8 5l6 -20l-7 -14" fill="#ac845c"/>
    ${line('M-22 -38l5 4m-6 3l5 4m-5 3l5 4m18 -18l-5 4m6 3l-5 4m4 3l-5 4', '#70583f', .65, .65)}
    ${dots(Array.from({length: 14}, (_, i) => [-9 + (i % 4) * 6, -34 + Math.floor(i / 4) * 5.5]), '#957550', .6)}
    ${line('M-8 -7l-2 5m-4 0l4 -3l4 3m13 -5l2 5m-4 0l4 -3l4 3', '#8b6c45', 1, 1.1)}
    <path d="M-30 -3h60v3h-60Z" fill="#876b4a" stroke-width=".8"/>
    ${line('M-25 -1h50', '#d4b783', .6, .6)}`;
}

function snowyowl() {
  return `${shadow(25)}
    <path d="M-23 -61Q-29 -43 -23 -20Q-16 -5 2 -6Q22 -7 27 -31Q31 -52 19 -67Z" fill="#e4dcc4"/>
    <path d="M-21 -39Q-28 -29 -23 -16l12 7l-6 -22M22 -40Q29 -30 24 -17l-12 8l6 -23" fill="#c9c9b4"/>
    <path d="M-23 -60Q-29 -81 -5 -87Q20 -91 28 -69Q35 -52 13 -43Q-8 -34 -23 -60Z" fill="#eae3cd"/>
    <path d="M-18 -58Q-22 -76 -9 -75Q2 -75 1 -58Q3 -77 17 -75Q28 -71 23 -57Q13 -43 1 -49Q-11 -43 -18 -58Z" fill="#f5ecd5" stroke-width=".75"/>
    <circle cx="-9" cy="-62" r="6.3" fill="#d9b354"/><circle cx="14" cy="-62" r="6.3" fill="#d9b354"/>
    ${dot(-8, -62, 2.6)}${dot(13, -62, 2.6)}${dot(-9, -63, .7, cream)}${dot(12, -63, .7, cream)}
    <path d="M-2 -56h7l-3 8Z" fill="#716652" stroke-width=".7"/>
    ${line('M-20 -77l6 2m1 -8l6 2m10 -1l5 -2m8 6l5 -2M-21 -35l5 3m-6 3l5 3m-5 3l5 3m20 -16l-5 3m6 3l-5 3m5 3l-5 3M-10 -38l3 2m6 -2l3 2m7 -1l3 -2m-22 8l3 2m6 -1l3 2m6 -3l3 -2m-14 11l3 2m6 -1l3 -2', '#756d5c', .7, .85)}
    ${line('M-9 -7l-2 5m-4 0l4 -3l4 3m14 -5l2 5m-4 0l4 -3l4 3', '#77694e', 1, 1.1)}
    <path d="M-29 -3Q1 -1 29 -3v3h-58Z" fill="#876b4a" stroke-width=".8"/>
    ${line('M-24 -1h48', '#d4b783', .6, .6)}`;
}

function ornamentBase(seed, width = 39) {
  return `${shadow(width+3)}<path d="M${-width} -7H${width}l4 4H${-width-4}Z" fill="#c9a065" stroke-width=".9"/><path d="M${-width-4} -3H${width+4}v3H${-width-4}Z" fill="#8b6646" stroke-width=".9"/>${line(`M${-width+2} -5h${width*2-4}`, '#efcd8a', .7, .65)}<path d="M-4 -5l4 -2l4 2l-4 2Z" fill="${seed%2?'#619a9f':'#c65d67'}" stroke-width=".55"/>`;
}

function penrosetriangle(seed, token, quality = 'full') {
  // Canonical three-face topology adapted from Bromskloss's public-domain
  // Penrose triangle.svg (Wikimedia Commons), with our own material and base.
  // Each face continues through a corner into the next apparent depth plane.
  const faces=[
    'M-32.351 -26.480L-22.613 -26.433L4.189 -73.066L42.568 -9.109L47.337 -17.808L4.319 -90.771Z',
    'M-47.337 -17.502L-42.825 -9.000L42.601 -9.059L4.194 -73.060L-0.626 -64.671L27.184 -17.554Z',
    'M-6.133 -90.870L-47.332 -17.517L27.196 -17.538L21.920 -26.452L-32.394 -26.444L4.361 -90.770Z'
  ];
  let out=ornamentBase(seed,38)+'<path d="M-28 -9v2h7v-2ZM21 -9v2h7v-2Z" fill="#79573e" stroke-width=".65"/>';
  out+='<g class="impossible-ornament penrose-tribar" data-depth-cycle="ab-over-bc,bc-over-ca,ca-over-ab" stroke-width="1.05">';
  faces.forEach((d,i)=>{out+=`<path d="${d}" fill="${['#eed49a','#aa7c4e','#d3ac6d'][i]}"/>`;});
  if(quality!=='compact')out+=`<path d="${faces.join('')}" fill="url(#grain)" stroke="none" opacity=".22"/>`;
  return out+'</g>';
}

function impossiblecube(seed, token, quality = 'full') {
  let out=ornamentBase(seed,35);
  const rod=(d,color)=>`<path d="${d}" fill="none" stroke="#3c3027" stroke-width="9" stroke-linecap="butt" stroke-linejoin="miter"/><path d="${d}" fill="none" stroke="${color}" stroke-width="6.3" stroke-linecap="butt" stroke-linejoin="miter"/>`;
  out+=`<g class="impossible-ornament impossible-cube" data-depth-cycle="vertical-over-rising,rising-over-falling,falling-over-vertical">`;
  out+=rod('M0 -93L39 -71V-29L0 -7L-39 -29V-71Z','#c49962');
  out+=rod('M0 -93V-7','#dcb971');
  out+=rod('M-39 -71L39 -29','#b48556');
  out+=rod('M39 -71L-39 -29','#e8c88a');
  // Each side of the middle junction reveals a different beam as the nearer
  // one. Bevels turn continuously from a front face into a supposed back face.
  out+=`<path d="M-4 -63H4V-43H-4Z" fill="#dcb971" stroke-width=".9"/>
    <path d="M-17 -64L10 -49L6 -42L-21 -57Z" fill="#b48556" stroke-width=".9"/>
    <path d="M-9 -49L16 -63L20 -56L-5 -42Z" fill="#e8c88a" stroke-width=".9"/>
    <path d="M-4 -49L0 -51L4 -49V-39H-4Z" fill="#dcb971" stroke-width=".9"/>
    <path d="M-4 -63v12m0 2v10M-17 -64l14 8M16 -63L4 -56" fill="none" stroke="#fae4b0" stroke-width=".8"/>
    <path d="M1 -89L35 -70M36 -66v35M-35 -68v35M-35 -29L-3 -11" fill="none" stroke="#efcf93" stroke-width=".8" opacity=".85"/>
    <path d="M-3 -92l4 -2l4 3l-4 2ZM35 -74l4 2l-4 2l-4 -2ZM-42 -72l4 -2l4 3l-4 2Z" fill="#ddb878" stroke-width=".65"/>`;
  if(quality!=='compact')out+=line('M-25 -77l5 2m7 5l5 2M35 -55v7m0 7v6M-34 -56v7m0 7v6M-22 -22l5 2m22 3l5 -2', '#72543a', .55, .65)+line('M-1 -82q3 -5 4 0q-2 5 -4 0M24 -37q4 -1 4 1q-3 2 -4 -1', '#8d673d', .65, .6);
  return out+'</g>';
}

function impossibletrident(seed, token, quality = 'full') {
  const card='#f1dfb7';
  let out=ornamentBase(seed,39);
  out+=`<g class="impossible-ornament impossible-trident" data-round-prongs="3" data-square-ends="2">
    <path d="M-47 -90Q0 -97 47 -90V-9H-47Z" fill="${card}" stroke="#806449" stroke-width="1.1"/>
    <path d="M-43 -86Q0 -91 43 -86V-14H-43Z" fill="none" stroke="#c6a56c" stroke-width=".7"/>
    <path d="M-34 -76H31v18H20L-16 -62H-34Z" fill="#e4c487" stroke="none"/>
    <path d="M-34 -40H-16L20 -44H31v18H-34Z" fill="#d8b476" stroke="none"/>
    <path d="M-34 -58H31v14H-34Z" fill="${card}" stroke="none"/>
    <path d="M-34 -76H31M-34 -62H-16L20 -58H31M-34 -58H31M-34 -44H31M-34 -40H-16L20 -44H31M-34 -26H31" fill="none" stroke="#46372b" stroke-width="1.5"/>
    <path d="M31 -76l8 4v18l-8 -4ZM31 -44l8 4v18l-8 -4Z" fill="#a77c4b" stroke-width="1.2"/>
    <path d="M31 -76V-58M31 -44V-26" fill="none" stroke="#433327" stroke-width="1.5"/>
    <path d="M-31 -74H26M-31 -28H26" fill="none" stroke="#fff0be" stroke-width="1"/>
    <ellipse cx="-34" cy="-69" rx="5.4" ry="7" fill="#d6b079" stroke-width="1.3"/>
    <ellipse cx="-34" cy="-51" rx="5.4" ry="7" fill="#dfbc83" stroke-width="1.3"/>
    <ellipse cx="-34" cy="-33" rx="5.4" ry="7" fill="#d6b079" stroke-width="1.3"/>
    <path d="M-35 -74q-3 3 0 8M-35 -56q-3 3 0 8M-35 -38q-3 3 0 8" fill="none" stroke="#fff0c0" stroke-width="1.1"/>
    <path d="M-37 -63q4 2 6 -1M-37 -45q4 2 6 -1M-37 -27q4 2 6 -1" fill="none" stroke="#93734d" stroke-width=".7"/>
    <path d="M-31 -86h62" fill="none" stroke="#d7ba81" stroke-width=".65"/>
    <path d="M-3 -84l3 -2l3 2l-3 2Z" fill="${seed%2?'#87a878':'#7397ac'}" stroke-width=".6"/>`;
  if(quality!=='compact')out+=line('M-24 -70h9m7 0h9m8 0h10M-24 -31h8m9 0h9m8 0h10M34 -67v7m0 27v7', '#aa8653', .6, .65)+line('M-42 -82v7m0 48v7M42 -82v7m0 48v7', '#d7bd88', .7, .6);
  return out+'</g>';
}

const motifPaint = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const motifMotion = (name, body, animate, extra = '') =>
  animate ? `<g class="${name}"${extra}>${body}</g>` : body;

function distantStairFlight(a, b, width, count, colors, rise = 0) {
  const number = value => Number(value.toFixed(2));
  const point = p => `${number(p[0])} ${number(p[1])}`;
  const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - rise * t];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const start = at(0), end = at(1), down = [0, 6];
  const railOffset = [width[0] * .95, width[1] * .95];
  const rail = t => add(at(t), railOffset);
  let sides = '', treads = '', posts = '';
  for (let i = 0; i <= count; i++) {
    const base = at(i / count), far = add(base, width);
    treads += `M${point(base)}L${point(far)}`;
    if (i) sides += `M${point(base)}L${point(far)}L${point(add(far, down))}L${point(add(base, down))}Z`;
    if (i % 2 === 0) posts += `M${point(rail(i / count))}v-18`;
  }
  const railStart = add(rail(0), [0, -18]), railEnd = add(rail(1), [0, -18]);
  return motifPaint(`M${point(start)}L${point(end)}L${point(add(end, down))}L${point(add(start, down))}Z`, colors[2]) +
    motifPaint(sides, colors[1]) +
    motifPaint(`M${point(start)}L${point(end)}L${point(add(end, width))}L${point(add(start, width))}Z`, colors[0]) +
    line(treads, ink, .8, .8) + line(posts, '#584833', 1, 1.8) +
    line(`M${point(railStart)}L${point(railEnd)}`, '#443a2a', 1, 2.9) +
    line(`M${point(add(railStart, [0, -.5]))}L${point(add(railEnd, [0, -.5]))}`, '#d7b45b', 1, 1.35);
}

function distantFish(x, y, scale, reverse, seed, phase, animate) {
  const delay = (-2.4 - Math.abs(seed % 9) * .63 - phase * 5.2).toFixed(2);
  const body = `<path${animate ? ` class="fish-tail" style="transform-origin:-10px 0px;transform-box:view-box;--tail-duration:${(.85 + phase * .23).toFixed(2)}s;--tail-delay:${delay}s"` : ''} d="M-9 -1l-11 -7l2 9l-3 7l12 -6Z" fill="#de8a4c"/>` +
    motifPaint('M-12 0Q-9 -9 3 -7Q14 -6 15 0Q12 8 1 7Q-9 7 -12 0Z', '#e99d44') + dot(10, -1, 1.5);
  const motion = motifMotion('swimming-fish', body, animate, ` style="--swim-duration:${(10.8 + Math.abs(seed % 6) * .6 + phase * 3.3).toFixed(1)}s;--swim-delay:${delay}s;--swim-direction:${phase ? 'reverse' : 'normal'}"`);
  return `<g transform="translate(${x} ${y}) scale(${reverse ? -scale : scale} ${scale})" stroke-width=".8">${motion}</g>`;
}

// These drawings keep the same silhouette and floor anchoring as their close-up
// counterparts. Small marks are omitted from the SVG entirely at distant zoom;
// the detailed drawing is recreated when it becomes visible at a larger scale.
// Each moving inhabitant still owns a separate group so its pose and animation
// can be managed independently of the shelf. Portal previews are always still.
function distantMotif(kind, seed, token, animate) {
  const p = motifPaint;
  const s = shadow;
  switch (kind) {
    case 'mouse': return s(35) + motifMotion('running-mouse',
      line('M-23 -18C-46 -32 -49 -7 -30 -6C-21 -6 -23 -1 -36 -2', red, 1, 1.65) +
      p('M-26 -7Q-32 -18 -17 -27Q-1 -34 18 -23L33 -14Q42 -11 34 -7Q21 -2 5 -5Q-8 1 -26 -7Z', '#b3a7a0') +
      p('M-4 -26C-17 -34 -16 -44 -9 -43C-1 -43 4 -34 2 -27ZM13 -22C9 -32 12 -40 18 -38Q27 -35 22 -23Z', '#c4b5aa') +
      p('M-7 -28C-12 -34 -13 -40 -9 -39Q-2 -38 -1 -29ZM16 -24Q13 -34 18 -34Q23 -33 20 -25Z', '#d99390') +
      dot(26, -17, 2) + dot(37, -10, 1.6, red) +
      line('M30 -11l13 -5M30 -9l15 -1M30 -7l11 4', ink, .8, .65), animate);
    case 'mushrooms': return s(36) +
      p('M-14 -30Q-19 -11 -14 -3Q-7 1 3 -3Q-3 -18 0 -34ZM25 -20Q21 -7 24 -2Q29 0 33 -3L30 -21Z', cream) +
      p('M-39 -33Q-36 -56 -15 -62Q2 -69 18 -43L25 -33Q0 -21 -39 -33Z', [red, plum, '#bd743f'][Math.abs(seed) % 3]) +
      p('M-39 -33Q-6 -43 25 -33Q2 -20 -27 -27Z', '#e8cba2') +
      p('M12 -21Q19 -43 31 -37Q43 -33 45 -21Q28 -13 12 -21Z', gold) +
      dots([[-19, -54, 3], [-4, -55, 2.5], [10, -43, 2.8], [26, -31, 2.6], [35, -26, 2]], cream);
    case 'teapot': return s(37) +
      p('M23 -38C47 -52 49 -15 26 -16L23 -23C39 -20 39 -38 26 -31ZM-22 -31L-34 -40L-46 -42L-44 -35L-33 -30L-23 -16Z', blue) +
      p('M-26 -32Q-28 -7 -10 -4L15 -4Q32 -12 26 -32Q4 -45 -26 -32Z', blue) +
      p('M-28 -32Q-22 -42 25 -32L28 -29Q-3 -23 -28 -29ZM-10 -38q-1 -11 7 -11q8 2 6 11M-16 -5l-2 3h35l-3 -3Z', gold) +
      p('M-2 -24l2 5l5 1l-4 4l1 5l-5 -2l-4 2l1 -5l-4 -4l6 -1Z', paper);
    case 'toyboat': return s(42) +
      p('M-42 -22L39 -22L23 -3L-25 -3Z', red) +
      p('M-42 -22l4 -4h72l5 4Z', gold) +
      p('M-2 -24V-87h4v63Z', '#96734d') +
      p('M-4 -80Q-12 -48 -35 -32L-5 -32Z', cream) +
      p('M4 -74Q27 -61 32 -31L4 -31Z', blue) +
      p('M2 -87l16 4l-16 7Z', red) + dots([[-23, -14], [-10, -14], [3, -14], [16, -14]], cream, 2.6);
    case 'owl': {
      const variety = Math.abs(seed) % 3;
      const snowy = variety === 2;
      const barn = variety === 1;
      return s(25) + p(barn ? 'M-18 -60Q-27 -39 -22 -22Q-16 -7 0 -7Q20 -6 25 -28Q31 -52 16 -67Z' : snowy ? 'M-23 -61Q-29 -43 -23 -20Q-16 -5 2 -6Q22 -7 27 -31Q31 -52 19 -67Z' : 'M-23 -61l2 -17l16 10q8 -4 17 0l13 -11l-1 21Q30 -39 20 -13Q6 -4 -9 -12Q-31 -28 -23 -61Z', snowy ? '#e4dcc4' : '#a98765') +
        p('M-15 -34Q0 -40 16 -31Q21 -19 11 -10Q-6 -8 -15 -21Z', paper) +
        p(barn ? 'M-20 -63Q-22 -77 -12 -78Q-1 -79 1 -67Q5 -81 17 -77Q28 -73 23 -60Q16 -48 1 -40Q-13 -50 -20 -63Z' : 'M-21 -59Q-9 -74 2 -57Q13 -73 24 -59L20 -36Q7 -28 1 -42Q-11 -27 -23 -41Z', cream) +
        (barn ? '' : dots([[-10, -52, 7.5], [13, -52, 7.5]], gold)) + dots([[-9, barn ? -63 : -52, 3.2], [12, barn ? -63 : -52, 3.2]]) +
        p(barn ? 'M-2 -58h6l-3 9Z' : 'M-3 -45h8l-4 10Z', '#c98542') +
        line('M-12 -10l-1 7m-4 -1l4 -3l4 4m15 -13l1 8m-4 2l4 -3l4 3', '#976341', 1, 1.4) +
        p('M-29 -4Q0 0 30 -4l-1 4h-58Z', '#876441');
    }
    case 'cat': return s(33) +
      p('M13 -8C46 6 50 -18 38 -24C29 -29 26 -17 33 -16C44 -13 34 -4 20 -14Z', '#a4836a') +
      p('M-15 -37Q-26 -19 -17 -5Q3 3 22 -5Q29 -19 11 -38ZM-20 -50l-4 -18l16 9Q-2 -61 8 -58l16 -10l-2 22Q24 -30 2 -27Q-18 -28 -20 -50Z', '#bb9678') +
      p('M-3 -37h8l-4 4Z', '#9c6264') +
      line('M-15 -41q6 -6 12 0M7 -41q6 -6 12 0M-10 -36l-17 -3m17 6l-17 1m40 -4l17 -4m-17 7l16 2', ink, 1, 1) +
      p('M-10 -28Q1 -25 14 -29L15 -24Q-1 -20 -12 -24Z', seed % 2 ? blue : green) + dot(2, -21, 3.3, gold);
    case 'plant': return s(25) +
      p('M-19 -29L-13 -4Q0 1 15 -4L21 -29Z', red) +
      p('M-23 -32h45l1 7Q0 -20 -23 -25Z', '#d58764') +
      line('M0 -33Q-3 -55 1 -82M0 -46Q-18 -58 -24 -70M0 -58Q20 -62 29 -80', '#586d4e', 1, 1.5) +
      p('M1 -81Q-11 -96 7 -98Q15 -86 1 -81ZM-20 -66Q-39 -82 -27 -87Q-11 -89 -20 -66ZM-8 -54Q-35 -66 -34 -53Q-30 -41 -8 -54ZM14 -63Q13 -86 30 -85Q34 -66 14 -63ZM7 -47Q17 -65 31 -56Q29 -39 7 -47Z', '#86a480');
    case 'balloon': return s(12) +
      line('M0 -51C-21 -40 15 -29 -1 -18C-11 -11 8 -5 0 -3', '#76634f', 1, 1) +
      p('M0 -51C-14 -55 -26 -69 -22 -83Q-17 -98 0 -98Q20 -97 24 -82Q27 -64 0 -51ZM0 -52l-4 5h9Z', [red, blue, plum, '#caac54'][Math.abs(seed) % 4]) +
      line('M-15 -84Q-11 -92 -3 -93', cream, .65, 3) + p('M-9 -4h20L9 -1H-9Z', paper);
    case 'telescope': return s(36) +
      p('M-3 -37L-31 -2h5l27 -32L22 -2h6L4 -38ZM0 -37l2 35h5L5 -39Z', '#936a49') +
      p('M-34 -55l9 -20L37 -48l-8 21Z', gold) +
      p('M-29 -57l5 -11L32 -44l-4 11Z', '#ecc778', ' stroke="none"') +
      p('M-36 -56l10 -22l7 3l-10 23ZM29 -50l-9 22l12 5l9 -22Z', '#6f8790') +
      `<ellipse cx="36" cy="-33" rx="5" ry="12" transform="rotate(22 36 -33)" fill="#c8dcd0"/>`;
    case 'snail': return s(40) +
      p('M-38 -4Q-14 -12 13 -11Q21 -17 26 -26L29 -13Q47 -7 44 -4Q13 2 -38 -4Z', '#c3bd8c') +
      p('M-22 -8C-35 -18 -33 -39 -19 -47C-4 -56 17 -48 20 -32C23 -17 8 -6 -22 -8Z', '#bb825c') +
      line('M-22 -8C-34 -17 -29 -41 -13 -44C3 -47 17 -35 14 -25C11 -14 -8 -13 -13 -24C-18 -35 -5 -39 2 -34C9 -27 0 -21 -4 -28', '#664d3e', 1, 1.6) +
      line('M27 -17l1 -20m4 23l8 -18', '#8f9673', 1, 1.4) + dots([[28, -38, 3.2], [41, -33, 3.2]], paper) + dots([[29, -38, 1.2], [42, -33, 1.2]]);
    case 'toyrobot': return s(26) +
      p('M-17 -18l-2 12h-5v5h18l-1 -17M8 -17l-1 16h18v-5h-5l-3 -12M-20 -51l-7 4l-5 22l8 2l8 -19M20 -51l8 4l5 18l-8 5l-7 -20', '#8a9790') +
      p('M-20 -51H19l3 32l-42 1Z', seed % 2 ? blue : green) + p('M-19 -80h38v25h-38Z', '#a4b6a5') +
      p('M-14 -74h10v8h-10ZM5 -74h10v8H5Z', cream) + dots([[-8, -70, 2], [9, -70, 2]]) +
      line('M0 -81l-2 -10M-8 -61h18', ink, 1, 1.4) + dot(-2, -93, 3, red) + p('M-7 -39l4 -4l4 4l-4 6Z', red);
    case 'fox': return s(38) +
      p('M15 -9Q40 -5 41 -28Q37 -40 28 -35Q37 -24 18 -23ZM-17 -38Q-28 -22 -18 -7Q-1 2 20 -7Q26 -21 10 -40Z', '#bf734c') +
      p('M-20 -45l-8 -29l20 12Q1 -67 12 -61l17 -15l-5 30L3 -26Z', '#cc8255') +
      p('M-20 -44l21 17l5 -8l-10 -15ZM24 -45L1 -27l-4 -8l10 -16Z', cream) +
      dots([[-9, -46, 1.9], [14, -46, 1.9]]) + p('M-3 -32q3 -4 8 0l-4 5Z', '#493a30') +
      p('M-17 -29q14 7 34 0l1 7Q1 -14 -17 -22ZM9 -22L6 -4h7l5 -17Z', blue);
    case 'openbook': return s(40) +
      p('M-43 -17l6 -39Q-12 -55 0 -48Q17 -57 40 -55L45 -15Q20 -19 0 -10Q-18 -18 -43 -17Z', red) +
      p('M-39 -20l5 -37Q-13 -57 -1 -50L0 -15Q-18 -22 -39 -20Z', cream) +
      p('M1 -50Q18 -59 37 -57l4 37Q18 -22 0 -15Z', paper) +
      line('M0 -54v37M-29 -44q15 -1 23 3M7 -46q12 -3 23 -2', '#9c8765', .65, .8) + p('M15 -58l1 34l4 -4l4 2l-2 -34Z', blue);
    case 'window': return s(42) +
      p('M-37 -4V-57Q-36 -96 0 -98Q36 -96 37 -57V-4Z', '#bf8568') +
      p('M-29 -10v-47Q-27 -86 0 -88Q28 -86 29 -57v47Z', '#7bb4b5') + dot(13, -68, 9, '#f1d273') +
      p('M-28 -30l10 -16l12 13l10 -10l14 17l10 -11v27h-56Z', '#637d70') +
      p('M-3 -86h6v77h-6ZM-29 -53h58v5h-58Z', '#b49165') + p('M-34 -8h69l7 5h-84Z', '#cfac7a');
    case 'moon': return s(30) +
      p('M22 -87Q-16 -83 -15 -49Q-14 -24 21 -22Q-8 -5 -29 -29Q-51 -57 -22 -83Q-2 -97 22 -87Z', gold) +
      line('M-16 -69q-6 -1 -8 5M-24 -61l-1 9l7 2l-6 3M-20 -42q5 4 11 0', ink, 1, 1) + dot(-27, -45, 2.8, '#d18b59') +
      p('M26 -65l2 6l6 1l-5 4l1 6l-5 -3l-6 3l2 -6l-5 -4l7 -1Z', paper);
    case 'clock': return s(32) +
      p('M-24 -20l-7 17h9l7 -12M23 -20l8 17h-9l-7 -12M-3 -78v-7h6v7M-6 -86h12v4h-12Z', gold) +
      p('M-34 -75Q-24 -97 -12 -78l-2 7l-19 1ZM12 -78Q24 -97 34 -75l-1 5l-19 -1Z', red) +
      `<circle cy="-43" r="31" fill="${blue}"/><circle cy="-43" r="26" fill="${cream}"/>` +
      line('M0 -65v4M0 -21v-4M-22 -43h4M22 -43h-4', ink, 1, 1) + line('M0 -43l-9 -11M0 -43l16 -5', ink, 1, 2) + dot(0, -43, 2.6, gold);
    case 'impossible': return s(84) +
      p('M-83 -51L-4 -139L87 -49L72 -28L-68 -25Z', '#b78566') +
      p('M-4 -124L-60 -49L55 -47Z', '#f0d6a7') +
      p('M-68 -25L-66 -8L76 -10L72 -28ZM-66 -8l-6 7h149l-2 -9Z', '#8b5c4a') +
      p('M-23 -30v-26Q-23 -83 1 -84Q26 -82 25 -56v26Z', '#4e7662') +
      distantStairFlight([-78, -47], [-6, -129], [20, 9], 11, ['#cd9478', '#9a5f4f', '#724a42']) +
      p('M-12 -135l20 -8l16 15l-23 10Z', '#e9ba8d') +
      distantStairFlight([5, -126], [82, -41], [-20, 8], 12, ['#dba385', '#b76b58', '#845745']) +
      p('M63 -37l19 -9l13 13l-22 10Z', '#edbd87') +
      distantStairFlight([79, -35], [-70, -35], [-2, -20], 14, ['#e9bd8b', '#c28267', '#8f5d4e'], 16) +
      p('M-5 -31Q-9 -49 0 -65Q9 -54 5 -31ZM-1 -52Q-17 -64 -13 -68Q1 -68 -1 -52ZM2 -54Q2 -71 12 -68Q17 -59 2 -54Z', '#91a874');
    case 'gardenbook': return s(54) +
      p('M-57 -151Q-12 -161 44 -151l5 143Q-1 -18 -57 -7Z', '#8c4f62') +
      p('M-51 -149Q-9 -159 45 -149l2 6Q-5 -152 -49 -140Z', '#eee0b5') +
      p('M-48 -142Q-7 -151 48 -141l8 134Q1 -19 -48 -6Z', '#b04f70', ' class="book-cover"') +
      p('M-34 -25v-72Q-34 -131 1 -135Q35 -133 37 -99l5 74Q2 -34 -34 -25Z', '#79c7cc') + dot(21, -103, 8, '#f0d27b') +
      p('M-33 -77Q-13 -89 5 -73Q25 -87 38 -73l3 43Q5 -35 -33 -29Z', '#90ad78') +
      p('M-20 -48l2 -43h5l1 43Z', '#6f6750') +
      p('M-32 -88q-2 -10 8 -15q-2 -8 9 -12q10 -4 14 8q10 0 11 10q5 8 -5 14q-7 5 -17 0q-11 8 -20 -5Z', '#376d54') +
      p('M4 -57h17v-15H4Z', '#efdb9c') + p('M0 -70l12 -11l14 11Z', '#c95b56') +
      p('M-42 -137Q1 -145 43 -136l7 121Q1 -25 -42 -13Z', 'none', ' stroke="#e2ba66" stroke-width="2.1"');
    case 'ladder': {
      const levels = Array.from({ length: 12 }, (_, i) => -17 - i * 15);
      return s(20) + p(levels.map(y => `M-15 ${y}h30v5h-30Z`).join(''), '#b8915e') +
        p('M-19 -198h6l1 196l-7 1ZM13 -198h6l1 197l-7 -1Z', '#b48a54') + line('M-17 -193l1 186m31 -184l1 186', '#f0c88c', .65, 1.2);
    }
    case 'toyhouse': return s(45) +
      p('M-37 -62h73v54h-73ZM36 -62l8 8v43l-8 3Z', seed % 2 ? '#cf9c86' : '#ddb77a') +
      p('M-27 -82v-18h10v26Z', '#be765e') +
      p('M-48 -60L0 -94l48 34l-8 5L0 -84L-40 -55Z', '#5b837f') +
      p('M-30 -52h16v15h-16ZM14 -52h16v15H14ZM-31 -29h16v15h-16Z', '#edcb72') +
      line('M-22 -50v11m-6 -5h12M22 -50v11m-6 -5h12M-23 -27v11m-6 -5h12', '#715c47', 1, 1) +
      p('M4 -8v-22q0 -8 8 -8q8 0 8 8v22Z', '#8c4c67') + dot(15, -18, 1.2, gold) + p('M-40 -8h80v4h-80ZM0 -4h26v3H0Z', '#a5916b');
    case 'rockinghorse': return s(46) + motifMotion('rocking-horse',
      p('M-49 -17Q0 8 49 -17L46 -10Q0 10 -46 -10Z', '#9d6d47') +
      p('M-29 -46l-9 29l6 3l15 -29M-19 -42l5 30h7l-3 -32M16 -45l8 31l7 -2l-7 -29M23 -47l16 26l-5 5l-21 -27', '#bb8d5d') +
      p('M-32 -51C-42 -55 -45 -46 -39 -41Q-49 -39 -46 -48Q-48 -62 -35 -62L-28 -58Z', '#714c3d') +
      p('M-35 -56Q-18 -70 14 -57L23 -81L21 -91L29 -97L34 -87L45 -82L43 -71L32 -69L29 -50Q18 -38 -9 -41Q-30 -35 -35 -56Z', '#c49b6a') +
      p('M17 -60l-6 -5l8 -6l-3 -6l7 -5l-2 -6l6 -7l3 8l-5 7l1 5l-5 5l2 5Z', '#775443') +
      p('M-16 -62Q-2 -66 10 -59l-3 15l-22 -1Z', '#b65e65') + dot(36, -81, 1.7) +
      line('M34 -85l-4 15l10 2M32 -77l12 2M31 -73Q16 -79 8 -63', '#845849', 1, 1.1), animate,
      ` data-rock-pivot="0,0" style="--rock-duration:${(3.2 + Math.abs(seed % 5) * .17).toFixed(2)}s;--rock-delay:${(-1.3 - Math.abs(seed % 11) * .37).toFixed(2)}s;--rock-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box"`);
    case 'fishbowl': {
      const clip = `fishbowl-interior-${token}`;
      return s(31) + `<defs><clipPath id="${clip}" clipPathUnits="userSpaceOnUse"><path d="M-36 -56Q-47 -37 -32 -17Q-21 -8 0 -8Q25 -7 34 -21Q46 -41 35 -56Z"/></clipPath></defs>` +
        p('M-23 -79C-18 -74 -25 -69 -34 -60C-57 -33 -36 -4 0 -4C38 -4 55 -33 33 -61C24 -70 18 -74 23 -79Z', '#d2e5d3', ' fill-opacity=".24"') +
        p('M-37 -57Q-48 -37 -33 -16Q-22 -6 0 -6Q25 -5 35 -21Q47 -41 36 -57Z', '#57b4b6', ' fill-opacity=".65" stroke="none"') +
        p('M17 -10Q10 -30 18 -52M17 -22Q29 -35 24 -42M17 -19Q4 -30 6 -40', 'none', ' stroke="#4d7a62" stroke-width="1.8"') +
        `<g clip-path="url(#${clip})">${distantFish(-13, -33, .75, false, seed, 0, animate)}${distantFish(15, -48, .52, true, seed, 1, animate)}</g>` +
        line('M-25 -80C-18 -75 -25 -68 -34 -59C-57 -33 -36 -4 0 -4C38 -4 55 -33 33 -60C24 -69 18 -75 25 -80', '#567975', 1, 1.4) +
        `<ellipse cy="-80" rx="25" ry="4" fill="#b7d8ca" fill-opacity=".5" stroke="#577d7a" stroke-width="1.1"/>` +
        line('M-34 -57Q-46 -37 -32 -22M35 -47Q42 -34 36 -26', '#f3f4d7', .78, 2.2);
    }
    case 'cheese': return s(43) +
      p('M-43 -7L-24 -48L42 -30L43 -6Z', '#dea549') +
      p('M-24 -48L42 -30L-24 -23L-43 -7Z', '#efce73') +
      p('M-24 -23l66 -7l1 24L-43 -7Z', '#e7b75c') +
      `<path d="${ellipsePath(-13, -39, 5, 2.6) + ellipsePath(15, -35, 4, 2.1) + ellipsePath(-7, -14, 5, 3.8) + ellipsePath(21, -18, 4.1, 4)}" fill="#b7803c"/>` +
      p('M42 -27q-8 2 -5 6q-10 2 -6 7q-7 1 -5 6l17 2Z', '#f1dfb2');
    case 'mantelclock': return s(38) +
      p('M-32 -9v-43Q-33 -86 0 -88Q33 -87 32 -52v43Z', '#85534b') +
      p('M-27 -9v-42Q-29 -80 0 -83Q29 -81 27 -51v42Z', '#af795e') +
      p('M-38 -9h76v6h-76Zm-3 6h82v3h-82Z', '#a27955') +
      `<circle cy="-57" r="23.5" fill="#d6ac5f"/><circle cy="-57" r="20.5" fill="${cream}"/>` +
      line('M0 -74v3M0 -40v-3M-17 -57h3M17 -57h-3M0 -57l-8 -8M0 -57l10 2', '#514036', 1, 1.35) +
      p('M-12 -12v-15q0 -7 12 -7q12 0 12 7v15Z', '#4e625e') +
      `<g class="pendulum-support" data-pivot="0,-32" transform="translate(0 -32)">${motifMotion('clock-pendulum', line('M0 0v11', '#dfbd6f', 1, 1.35) + dot(0, 14, 5.2, '#d8b060'), animate, ` style="--pendulum-duration:${(2.6 + Math.abs(seed % 5) * .13).toFixed(2)}s;--pendulum-delay:-1s;--pendulum-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box"`)}</g>`;
    case 'cuckooclock': return s(23) +
      line('M-16 -43v33M17 -43v29', '#ad874a', 1, 1.1) +
      p('M-16 -13Q-25 -8 -20 -2Q-17 2 -13 -2Q-8 -8 -16 -13ZM17 -18Q9 -13 13 -7Q17 -2 21 -8Q25 -14 17 -18Z', '#8e7651') +
      p('M-29 -106l29 -17l29 17v62l-29 9l-29 -9Z', '#b18459') +
      p('M-36 -102L0 -130l36 28l-4 6L0 -119L-32 -96Z', '#775b45') +
      p('M-9 -93v-12q0 -10 9 -10q9 0 9 10v12Z', '#594d3c') +
      p('M-5 -99Q-4 -108 3 -108Q8 -105 4 -100l4 3l-4 1l-6 4l-6 -3Z', '#79918a') +
      `<circle cy="-70" r="21" fill="#d4ac64"/><circle cy="-70" r="17.7" fill="#efe0b2"/>` +
      line('M0 -85v3M0 -55v-3M-15 -70h3M15 -70h-3M0 -70l-7 -7M0 -70l11 3', '#514434', 1, 1.35) +
      `<g class="pendulum-support" data-pivot="0,-33" transform="translate(0 -33)">${motifMotion('clock-pendulum', line('M0 0v13', '#ba935a', 1, 1.1) + p('M-8 14Q0 4 8 14Q0 25 -8 14Z', '#c3a268'), animate, ` style="--pendulum-duration:${(2.85 + Math.abs(seed % 4) * .17).toFixed(2)}s;--pendulum-delay:-1.4s;--pendulum-origin:0px 0px;transform-origin:0px 0px;transform-box:view-box"`)}</g>` +
      p('M-26 -92Q-40 -99 -41 -90Q-37 -80 -26 -84M27 -91Q40 -97 41 -89Q37 -80 27 -83M-28 -62Q-41 -68 -42 -60Q-38 -49 -27 -51M28 -63Q41 -68 42 -59Q39 -49 28 -51', '#69876c');
    case 'hourglass': return s(26) +
      p('M-24 -74h48v5h-48Zm-4 -5h56v5h-56ZM-24 -8h48v5h-48Zm-4 5h56v3h-56Z', '#a17c4e') +
      p('M-24 -70h4v61h-4m44 -61h4v61h-4', '#bd955f') +
      p('M-16 -69C-19 -54 -6 -49 -3 -40C-5 -30 -19 -25 -16 -9H16C20 -25 5 -30 3 -40C5 -49 19 -54 16 -69Z', '#b5d2c3', ' fill-opacity=".3" stroke="#698c83" stroke-width="1.1"') +
      p('M-14 -63Q-11 -53 0 -44Q11 -53 14 -63Z', '#d5b266') +
      p('M-15 -12Q-8 -19 0 -28Q9 -19 15 -12v3h-30Z', '#dfbd73') + line('M0 -44v14', '#b6934f', 1, .7);
    case 'penrosetriangle': return penrosetriangle(seed, token, 'compact');
    case 'impossiblecube': return impossiblecube(seed, token, 'compact');
    case 'impossibletrident': return impossibletrident(seed, token, 'compact');
    default: return '';
  }
}

const drawings = {
  mouse, mushrooms, teapot, toyboat, owl, cat, plant, balloon, telescope,
  snail, toyrobot, fox, openbook, window, moon, clock, impossible, gardenbook,
  ladder, toyhouse, rockinghorse, fishbowl, cheese, mantelclock, cuckooclock, hourglass,
  penrosetriangle, impossiblecube, impossibletrident,
};

export const motifKinds = Object.freeze(Object.keys(drawings));

/** Return a floor-anchored SVG group. Unknown kinds produce no markup. */
export function motif(kind, x, y, scale = 1, seed = 0, quality = 'full') {
  const draw = drawings[kind];
  if (!Object.hasOwn(drawings, kind) || ![x, y, scale].every(Number.isFinite)) return '';
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const renderQuality = ['compact', 'distant', 'preview'].includes(quality) ? quality : 'full';
  const token = motifToken(`${kind}:${x}:${y}:${scale}:${safeSeed}:${renderQuality}`);
  const drawing = renderQuality === 'distant' || renderQuality === 'preview' ? distantMotif(kind, safeSeed, token, renderQuality !== 'preview') : draw(safeSeed, token, renderQuality);
  return `<g class="motif motif-${kind}" data-motif-quality="${renderQuality}" transform="translate(${x} ${y}) scale(${scale})" stroke="${ink}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}
