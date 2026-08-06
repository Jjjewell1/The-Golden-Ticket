import { useEffect, useRef } from 'react';

const ROW_COUNT = 16;
const BAND_COUNT = 3;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function Theater() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let rows = [];
    let bands = [];
    let figures = [];
    let seated = new Set();
    let raf = 0;
    let spawnIn = 900;
    let last = 0;

    const scaleAt = (y) => {
      const y0 = rows[0].y;
      const span = rows[rows.length - 1].y - y0;
      return 0.55 + Math.pow((y - y0) / span, 1.1) * 1.55;
    };

    function buildGeometry() {
      rows = [];
      const y0 = H * 0.4;
      const y1 = H * 1.08;
      for (let i = 0; i < ROW_COUNT; i++) {
        const t = i / (ROW_COUNT - 1);
        rows.push({ y: y0 + (y1 - y0) * Math.pow(t, 1.5) });
      }
      for (let i = 0; i < ROW_COUNT; i++) {
        const row = rows[i];
        row.s = scaleAt(row.y);
        const spacing = row.s * 12;
        const maxSeats = Math.max(9, Math.floor(W / spacing));
        const startX = (W - (maxSeats - 1) * spacing) / 2;
        const seats = [];
        for (let j = 0; j < maxSeats; j++) seats.push({ x: startX + j * spacing });
        row.aisles = [seats[Math.floor(maxSeats / 3)].x, seats[Math.floor((maxSeats * 2) / 3)].x];
        row.seats = seats.filter(
          (s) => Math.abs(s.x - row.aisles[0]) > spacing * 0.7 && Math.abs(s.x - row.aisles[1]) > spacing * 0.7,
        );
        row.band = Math.min(BAND_COUNT - 1, Math.floor((i / ROW_COUNT) * BAND_COUNT));
      }
    }

    function aisleXAt(y, idx) {
      const last = rows[rows.length - 1];
      if (y <= rows[0].y) return rows[0].aisles[idx];
      if (y >= last.y) return last.aisles[idx];
      for (let i = 0; i < rows.length - 1; i++) {
        if (y >= rows[i].y && y <= rows[i + 1].y) {
          const t = (y - rows[i].y) / (rows[i + 1].y - rows[i].y);
          return rows[i].aisles[idx] + (rows[i + 1].aisles[idx] - rows[i].aisles[idx]) * t;
        }
      }
      return last.aisles[idx];
    }

    function drawSeat(c, x, y, s) {
      const bw = s * 6;
      const bh = s * 5;
      c.fillStyle = 'rgba(255,255,255,0.055)';
      roundedRect(c, x - bw / 2, y - bh, bw, bh, s * 1.4);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.11)';
      roundedRect(c, x - bw * 0.62, y - bh * 0.7, bw * 1.24, bh * 0.42, s * 1.4);
      c.fill();
    }

    function drawScreen(c) {
      const top = H * 0.1;
      const bottom = H * 0.38;
      const topW = W * 0.44;
      const botW = W * 0.62;
      c.beginPath();
      c.moveTo(W / 2 - topW / 2, top);
      c.lineTo(W / 2 + topW / 2, top);
      c.lineTo(W / 2 + botW / 2, bottom);
      c.lineTo(W / 2 - botW / 2, bottom);
      c.closePath();
      const g = c.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, '#171c2e');
      g.addColorStop(1, '#0a0c16');
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(130,150,255,0.20)';
      c.lineWidth = 1.5;
      c.stroke();
      const inner = c.createLinearGradient(0, top, 0, bottom);
      inner.addColorStop(0, 'rgba(150,170,255,0.05)');
      inner.addColorStop(1, 'rgba(150,170,255,0)');
      c.fillStyle = inner;
      c.fill();
    }

    function drawExit(c, x, y) {
      c.save();
      c.shadowColor = 'rgba(255,80,80,0.9)';
      c.shadowBlur = 16;
      c.fillStyle = 'rgba(255,80,80,0.85)';
      roundedRect(c, x - 15, y - 6, 30, 12, 3);
      c.fill();
      c.restore();
    }

    function drawPerson(c, x, y, s, opts) {
      const h = 30 * s;
      const bob = opts.walking ? Math.sin(opts.phase) * 0.9 * s : 0;
      const sit = opts.sit || 0;
      const cy = y - bob;
      const hh = h * (1 - sit * 0.72);
      c.save();
      c.fillStyle = '#0d0f1a';
      c.strokeStyle = 'rgba(255,255,255,0.05)';
      c.lineWidth = 1;
      c.beginPath();
      const legSw = Math.sin(opts.phase || 0) * 2.4 * s;
      c.moveTo(x - legSw * 0.5, cy - hh * 0.3);
      c.lineTo(x - s * 3, cy);
      c.moveTo(x + legSw * 0.5, cy - hh * 0.3);
      c.lineTo(x + s * 3, cy);
      c.stroke();
      const ty = cy - hh * 0.72;
      roundedRect(c, x - h * 0.16, ty, h * 0.32, hh * 0.74, h * 0.16);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(x, ty - h * 0.1, h * 0.13, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }

    function seedSeated(count) {
      for (let n = 0; n < count; n++) {
        const r = Math.floor(Math.pow(Math.random(), 0.7) * ROW_COUNT);
        const free = rows[r].seats.map((_, j) => j).filter((j) => !seated.has(`${r}:${j}`));
        if (!free.length) continue;
        const j = free[Math.floor(Math.random() * free.length)];
        const seat = rows[r].seats[j];
        seated.add(`${r}:${j}`);
        figures.push({ row: r, seat: j, x: seat.x, y: rows[r].y, phase: Math.random() * 6.28, state: 'seated', sit: 1 });
      }
    }

    function spawnFigure() {
      const candidates = [];
      for (let r = 0; r < ROW_COUNT; r++) {
        if (rows[r].seats.some((_, j) => !seated.has(`${r}:${j}`))) candidates.push(r);
      }
      if (!candidates.length) return;
      const r = candidates[Math.floor(Math.pow(Math.random(), 0.55) * candidates.length)];
      const free = rows[r].seats.map((_, j) => j).filter((j) => !seated.has(`${r}:${j}`));
      const j = free[Math.floor(Math.random() * free.length)];
      const seat = rows[r].seats[j];
      const aisleIdx = Math.abs(seat.x - rows[r].aisles[0]) <= Math.abs(seat.x - rows[r].aisles[1]) ? 0 : 1;
      figures.push({
        row: r,
        seat: j,
        x: aisleXAt(H * 1.08, aisleIdx),
        y: H * 1.08,
        aisle: aisleIdx,
        targetX: seat.x,
        targetY: rows[r].y,
        phase: Math.random() * 6.28,
        state: 'walk',
        sit: 0,
        speed: 0.85 + Math.random() * 0.6,
      });
    }

    function update(dt) {
      for (const f of figures) {
        if (f.state === 'walk') {
          f.phase += dt * 9;
          const step = Math.max(0.7, (f.y - rows[0].y) * 0.04) * dt * f.speed;
          if (f.y - step > f.targetY) {
            f.y -= step;
            f.x = aisleXAt(f.y, f.aisle);
          } else {
            f.y = f.targetY;
            f.state = 'glide';
          }
        } else if (f.state === 'glide') {
          f.phase += dt * 9;
          const s = scaleAt(f.y);
          const step2 = Math.max(0.9, s * 5) * dt;
          if (Math.abs(f.targetX - f.x) <= step2) {
            f.x = f.targetX;
            f.state = 'sit';
            seated.add(`${f.row}:${f.seat}`);
          } else {
            f.x += Math.sign(f.targetX - f.x) * step2;
          }
        } else if (f.state === 'sit') {
          f.sit = Math.min(1, f.sit + dt * 0.8);
          if (f.sit >= 1) f.state = 'seated';
        }
      }
    }

    function render(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W * dpr, H * dpr);
      const byBand = [[], [], []];
      for (const f of figures) {
        let band;
        if (f.state === 'seated') band = rows[f.row].band;
        else band = Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(((f.y - rows[0].y) / (rows[rows.length - 1].y - rows[0].y)) * BAND_COUNT)));
        byBand[band].push(f);
      }
      for (let b = 0; b < BAND_COUNT; b++) {
        if (bands[b]) ctx.drawImage(bands[b], 0, 0, W * dpr, H * dpr);
        byBand[b].sort((a, c) => a.y - c.y);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const f of byBand[b]) {
          const s = f.state === 'seated' ? rows[f.row].s : scaleAt(f.y);
          if (f.state === 'seated') drawPerson(ctx, f.x, f.y + s * 2, s, { sit: 1 });
          else drawPerson(ctx, f.x, f.y, s, { walking: true, phase: f.phase, sit: f.state === 'sit' ? f.sit : 0 });
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pulse = 0.028 + 0.02 * Math.sin(t * 0.0012);
      const cg = ctx.createRadialGradient(W / 2, H * 0.24, 0, W / 2, H * 0.24, W * 0.5);
      cg.addColorStop(0, `rgba(150,170,255,${pulse.toFixed(4)})`);
      cg.addColorStop(1, 'rgba(150,170,255,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function renderBands() {
      bands = [];
      for (let b = 0; b < BAND_COUNT; b++) {
        const off = document.createElement('canvas');
        off.width = W * dpr;
        off.height = H * dpr;
        const c = off.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (b === 0) {
          const g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, '#0a0912');
          g.addColorStop(0.45, '#07060e');
          g.addColorStop(1, '#04040a');
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
          drawScreen(c);
          if (W > 560) {
            drawExit(c, W * 0.085, H * 0.05);
            drawExit(c, W * 0.915, H * 0.05);
          }
        }
        for (let i = 0; i < ROW_COUNT; i++) {
          const row = rows[i];
          if (row.band !== b) continue;
          for (const seat of row.seats) drawSeat(c, seat.x, row.y, row.s);
        }
        bands[b] = off;
      }
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      figures = [];
      seated = new Set();
      buildGeometry();
      renderBands();
      if (reduced) {
        seedSeated(20);
        render(0);
        return;
      }
      seedSeated(14);
    }

    resize();
    if (!reduced) {
      window.addEventListener('resize', resize);
      last = performance.now();
      const frame = (now) => {
        const dt = Math.min(3, (now - last) / 16.7) || 1;
        last = now;
        spawnIn -= dt;
        if (spawnIn <= 0) {
          if (seated.size < 52 && figures.length < 70) spawnFigure();
          spawnIn = 1600 + Math.random() * 2600;
        }
        update(dt);
        render(now);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="theater" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
