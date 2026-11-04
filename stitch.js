// A stitched field of light. Every stitch is a small spring: the pointer parts them like cloth and
// they settle back. The field stitches in from the middle on load; a ripple runs through it on demand.
// In the middle, the voice creature, stitched too: it idles slowly and swells with the voice.
export function createStitch(canvas, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const CELL = opts.cell ?? 7
  const DPR = Math.min(2, devicePixelRatio || 1)
  let cols = 0
  let rows = 0
  let cells = [] // { x, y, ox, oy, vx, vy, r, g, b, born }
  const pointer = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, down: false, on: false }
  const ripples = []
  const sparks = []
  let amp = 0
  let ampTarget = 0
  let t0 = performance.now()
  let W = 0
  let H = 0
  const now = () => (performance.now() - t0) / 1000

  function fit() {
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, Math.round(r.width))
    H = Math.max(1, Math.round(r.height))
    canvas.width = W * DPR
    canvas.height = H * DPR
    cols = Math.ceil(W / CELL) + 1
    rows = Math.ceil(H / CELL) + 1
    cells = []
    const cx = W / 2
    const cy = H * 0.66
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = i * CELL
        const y = j * CELL
        cells.push({ x, y, ox: 0, oy: 0, vx: 0, vy: 0, r: 0, g: 0, b: 0, born: Math.hypot(x - cx, y - cy) / 520 + Math.random() * 0.12 })
      }
    t0 = performance.now()
    sparks.length = 0
    for (let k = 0; k < 9; k++) sparks.push({ a: Math.random() * Math.PI * 2, d: 60 + Math.random() * 120, s: 0.08 + Math.random() * 0.1, p: Math.random() * 10 })
  }
  // Soft light: three drifting pools of colour on a pale field, and the creature in the middle.
  const THEMES = {
    light: {
      F: { r: 243, g: 240, b: 255 },
      P: [
        { r: 201, g: 184, b: 255, x: 0.15, y: 0.15, s: 0.55 }, // lilac
        { r: 190, g: 216, b: 255, x: 0.9, y: 0.45, s: 0.5 }, // periwinkle
        { r: 255, g: 214, b: 236, x: 0.5, y: 1.05, s: 0.55 }, // blush
      ],
      core: [139, 150, 255],
      hi: 'rgba(255,255,255,', hiA: 0.28, shade: 'rgba(80,60,160,', shadeA: 0.07,
    },
    dark: {
      F: { r: 17, g: 16, b: 28 },
      P: [
        { r: 76, g: 58, b: 150, x: 0.15, y: 0.15, s: 0.55 }, // indigo
        { r: 40, g: 72, b: 150, x: 0.9, y: 0.45, s: 0.5 }, // deep blue
        { r: 120, g: 48, b: 110, x: 0.5, y: 1.05, s: 0.55 }, // plum
      ],
      core: [110, 120, 255],
      hi: 'rgba(200,190,255,', hiA: 0.12, shade: 'rgba(0,0,0,', shadeA: 0.25,
    },
  }
  let TH = THEMES.light
  let F = TH.F
  let P = TH.P
  function paintColors(t) {
    const cx = W / 2
    const cy = H * 0.66
    const base = Math.min(W, H) * 0.19
    for (const c of cells) {
      let r = F.r
      let g = F.g
      let b = F.b
      for (let k = 0; k < 3; k++) {
        const p = P[k]
        const px = (p.x + Math.sin(t * 0.11 + k * 2.1) * 0.06) * W
        const py = (p.y + Math.cos(t * 0.09 + k * 1.3) * 0.06) * H
        const d = Math.hypot(c.x - px, c.y - py) / (p.s * Math.max(W, H))
        const w = Math.max(0, 1 - d * d) * 0.95
        r += (p.r - r) * w
        g += (p.g - g) * w
        b += (p.b - b) * w
      }
      // The creature: an organic disc that breathes, and swells with the voice.
      const ang = Math.atan2(c.y - cy, c.x - cx)
      const wobble = 1 + 0.08 * Math.sin(ang * 3 + t * 0.9) + 0.06 * Math.sin(ang * 5 - t * 1.3)
      const rad = base * (1 + amp * 0.35) * wobble
      const d = Math.hypot(c.x - cx, c.y - cy)
      if (d < rad * 1.25) {
        const k = Math.max(0, 1 - d / rad)
        const core = Math.pow(k, 0.9)
        // outside→in: periwinkle → lilac → white
        const cr = TH.core[0] + (255 - TH.core[0]) * core
        const cg = TH.core[1] + (255 - TH.core[1]) * core
        const cb = TH.core[2] + (255 - TH.core[2]) * core
        const mix = Math.min(1, Math.max(0, (rad * 1.25 - d) / (rad * 0.35))) * (0.55 + 0.45 * k)
        r += (cr - r) * mix
        g += (cg - g) * mix
        b += (cb - b) * mix
      }
      c.r = r
      c.g = g
      c.b = b
    }
  }

  function physics(dt) {
    // A wide, soft dome under the pointer rather than a hard hole: the push is gentle, reaches far,
    // and the stitches drift back slowly. The pointer itself is eased so quick moves still feel soft.
    const R = 190
    const strength = pointer.down ? 0.95 : 0.55
    const spring = 34
    const damp = Math.exp(-dt * 4.2)
    const ease = 1 - Math.exp(-dt * 9)
    pointer.sx += (pointer.x - pointer.sx) * ease
    pointer.sy += (pointer.y - pointer.sy) * ease
    const t = now()
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 1.4) ripples.splice(i, 1)
    for (const c of cells) {
      let fx = 0
      let fy = 0
      if (pointer.on || Math.hypot(pointer.x - pointer.sx, pointer.y - pointer.sy) > 1) {
        const dx = c.x + c.ox - pointer.sx
        const dy = c.y + c.oy - pointer.sy
        const d2 = dx * dx + dy * dy
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1
          // Smootherstep dome: a soft plateau in the middle, fading to nothing at R with no visible edge.
          const u = 1 - d / R
          const k = u * u * u * (u * (u * 6 - 15) + 10)
          const f = k * 300 * strength
          fx += (dx / d) * f
          fy += (dy / d) * f
        }
      }
      for (const rp of ripples) {
        const age = t - rp.t0
        const dx = c.x - rp.x
        const dy = c.y - rp.y
        const d = Math.hypot(dx, dy) || 1
        const front = age * 420
        const k = Math.exp(-((d - front) * (d - front)) / 900) * Math.exp(-age * 2.2) * rp.s
        fx += (dx / d) * k * 2600
        fy += (dy / d) * k * 2600
      }
      if (fx === 0 && fy === 0 && Math.abs(c.ox) < 0.02 && Math.abs(c.oy) < 0.02 && Math.abs(c.vx) < 0.5 && Math.abs(c.vy) < 0.5) continue
      c.vx = (c.vx + (fx - c.ox * spring) * dt) * damp
      c.vy = (c.vy + (fy - c.oy * spring) * dt) * damp
      c.ox += c.vx * dt
      c.oy += c.vy * dt
    }
  }

  let last = performance.now()
  let colorTick = 0
  function frame() {
    const nowMs = performance.now()
    const dt = Math.min(0.05, (nowMs - last) / 1000)
    last = nowMs
    const t = now()
    amp += (ampTarget - amp) * 0.2
    if (colorTick++ % 2 === 0) paintColors(t)
    physics(dt)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.fillStyle = `rgb(${F.r},${F.g},${F.b})`
    ctx.fillRect(0, 0, W, H)
    const s = CELL - 1.2
    for (const c of cells) {
      const a = Math.min(1, Math.max(0, (t - c.born) * 2.2))
      if (a <= 0) continue
      const x = c.x + c.ox
      const y = c.y + c.oy
      const lift = Math.min(1, Math.hypot(c.ox, c.oy) / 4)
      // The stitch: a soft square, a lighter thread across it, a touch of shade below. Lifted ones catch more light.
      ctx.fillStyle = `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`
      ctx.fillRect(x, y, s, s)
      ctx.fillStyle = `${TH.hi}${(TH.hiA + lift * 0.35) * a})`
      ctx.fillRect(x, y, s, 1.2)
      ctx.fillStyle = `${TH.shade}${(TH.shadeA + lift * 0.08) * a})`
      ctx.fillRect(x, y + s - 1.2, s, 1.2)
    }
    // Sparks: small bright stitches drifting around the creature, like thoughts.
    const cx = W / 2
    const cy = H * 0.66
    for (const sp of sparks) {
      sp.a += sp.s * dt
      const d = sp.d + Math.sin(t * 0.7 + sp.p) * 14
      const x = cx + Math.cos(sp.a) * d
      const y = cy + Math.sin(sp.a) * d * 0.8
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + sp.p * 3)
      ctx.fillStyle = `rgba(255,255,255,${0.35 + tw * 0.55})`
      ctx.fillRect(Math.round(x / CELL) * CELL, Math.round(y / CELL) * CELL, s, s)
    }
  }
  function loop() {
    frame()
    requestAnimationFrame(loop)
  }

  fit()
  requestAnimationFrame(loop)
  new ResizeObserver(fit).observe(canvas)
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    pointer.x = e.clientX - r.left
    pointer.y = e.clientY - r.top
    if (!pointer.on) {
      pointer.sx = pointer.x
      pointer.sy = pointer.y
    }
    pointer.on = true
  })
  canvas.addEventListener('pointerleave', () => {
    pointer.on = false
    // Let the dome fade where it is instead of snapping away.
    pointer.x = pointer.sx
    pointer.y = pointer.sy
  })
  canvas.addEventListener('pointerdown', (e) => {
    pointer.down = true
    const r = canvas.getBoundingClientRect()
    ripple(e.clientX - r.left, e.clientY - r.top, 0.6)
  })
  addEventListener('pointerup', () => (pointer.down = false))

  function ripple(x, y, s = 1) {
    ripples.push({ x, y, t0: now(), s })
  }
  return {
    ripple,
    /** A ripple from a point in page coordinates. */
    rippleAt(clientX, clientY, s = 1) {
      const r = canvas.getBoundingClientRect()
      ripple(clientX - r.left, clientY - r.top, s)
    },
    /** How loud the voice is right now (0..1): the creature swells with it. */
    amp(a) {
      ampTarget = Math.max(0, Math.min(1, a))
    },
    restitch() {
      fit()
    },
    theme(name) {
      TH = THEMES[name] ?? THEMES.light
      F = TH.F
      P = TH.P
    },
    /** Draw one frame now (for checks in a throttled tab). */
    tick() {
      frame()
    },
    debug: () => ({ W, H, cols, rows, n: cells.length, c: cells[Math.floor(cells.length / 2) + Math.floor(cols / 2)], amp, t: now() }),
    pointer(x, y, on = true) {
      pointer.x = x
      pointer.y = y
      if (!pointer.on && on) {
        pointer.sx = x
        pointer.sy = y
      }
      pointer.on = on
    },
  }
}
