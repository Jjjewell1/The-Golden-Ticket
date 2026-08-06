import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { createElement as h } from 'satori/jsx';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, '..', '..', 'assets', 'fonts');

let fontsPromise;

async function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(path.join(fontsDir, 'Cinzel-Bold.ttf')).then((data) => ({
        name: 'Cinzel',
        data,
        weight: 700,
        style: 'normal',
      })),
      readFile(path.join(fontsDir, 'Inter-Medium.ttf')).then((data) => ({
        name: 'Inter',
        data,
        weight: 500,
        style: 'normal',
      })),
      readFile(path.join(fontsDir, 'Inter-SemiBold.ttf')).then((data) => ({
        name: 'Inter',
        data,
        weight: 600,
        style: 'normal',
      })),
    ]);
  }
  return fontsPromise;
}

function toDataUri(img) {
  return `data:${img.contentType};base64,${img.buffer.toString('base64')}`;
}

const GOLD = '#f0ce5a';
const GOLD_DIM = '#c9a227';
const INK = '#0a0910';

function Poster({ src, index }) {
  const tilt = [-2.5, 1.8, -1.4, 2.2][index % 4];
  return h(
    'div',
    {
      style: {
        display: 'flex',
        width: 150,
        height: 225,
        borderRadius: 10,
        overflow: 'hidden',
        border: '2px solid rgba(240,206,90,0.55)',
        transform: `rotate(${tilt}deg)`,
        boxShadow: '0 12px 28px rgba(0,0,0,0.55)',
        background: 'linear-gradient(160deg,#2a2440,#171226)',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    src
      ? h('img', { src, width: 150, height: 225, style: { objectFit: 'cover', width: '100%', height: '100%' } })
      : h('div', { style: { display: 'flex', color: 'rgba(240,206,90,0.35)', fontFamily: 'Cinzel', fontSize: 40 } }, '?'),
  );
}

export async function renderShareCard({ posters, games, url, siteName }) {
  const fonts = await loadFonts();
  const moviePosters = posters.slice(0, 4);
  const gameCovers = games.slice(0, 2);
  const slots = [...moviePosters, ...gameCovers];
  while (slots.length < 3) slots.push(null);

  const element = h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontFamily: 'Inter',
        background: 'radial-gradient(ellipse 900px 500px at 50% 0%, rgba(240,206,90,0.16), transparent 60%), linear-gradient(160deg, #0a0910 0%, #181224 55%, #241a12 100%)',
        overflow: 'hidden',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        },
      },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 12, color: GOLD_DIM, fontFamily: 'Inter', fontWeight: 600, fontSize: 22, letterSpacing: 6, textTransform: 'uppercase' } },
        h('div', { style: { display: 'flex', fontSize: 28 } }, '🎫'),
        'Jewellcore presents',
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'Cinzel', fontWeight: 700, fontSize: 76, color: GOLD, letterSpacing: 4, textAlign: 'center' } },
        'THE GOLDEN TICKET',
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'Inter', fontWeight: 500, fontSize: 26, color: '#efe9dc', textAlign: 'center', maxWidth: 760, lineHeight: 1.4, paddingTop: 4 } },
        'You\u2019ve been invited. Movies, games, and a little bit of magic \u2014 all in one place.',
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            gap: 26,
            marginTop: 30,
            paddingTop: 26,
            borderTop: '2px dashed rgba(240,206,90,0.35)',
            paddingLeft: 30,
            paddingRight: 30,
            justifyContent: 'center',
            alignItems: 'flex-end',
          },
        },
        slots.map((src, i) => Poster({ src, index: i })),
      ),
    ),
    h(
      'div',
      {
        style: {
          position: 'absolute',
          bottom: 22,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          color: 'rgba(239,233,220,0.55)',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 18,
          letterSpacing: 2,
        },
      },
      url,
    ),
  );

  const svg = await satori(element, { width: 1200, height: 630, fonts });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    background: INK,
  });
  const png = resvg.render().asPng();
  return Buffer.from(png);
}
