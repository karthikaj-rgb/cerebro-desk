// Cerebro · Ink of Light
// The AI sketches Maya's whole platform as living blooms of light on an open canvas.
// You can scribble on it; circle things to talk about them together; drag things around;
// open anything into a full-screen one-on-one room with a voice.
import { GREETING, ITEMS, THREADS, LASSO, FALLBACK } from './data.js'

const $ = (s, r = document) => r.querySelector(s)
const root = document.documentElement
const desk = $('#desk')
const heat = Object.fromEntries(ITEMS.map((it) => [it.id, it.heat]))
const done = {}

// ── Theme ────────────────────────────────────────────────────────────────────
const saved = (() => {
  try {
    return localStorage.getItem('desk-theme')
  } catch {
    return null
  }
})()
root.dataset.theme = saved ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
$('#theme').onclick = () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem('desk-theme', root.dataset.theme)
  } catch {}
}
// Look: 'calm' (quiet, professional) or 'ink' (luminous, playful). Same experience, different skin.
const savedLook = (() => {
  try {
    return localStorage.getItem('desk-look')
  } catch {
    return null
  }
})()
root.dataset.look = savedLook ?? 'calm'
const lookName = () => ($('#lookName').textContent = root.dataset.look === 'calm' ? 'Calm' : 'Ink')
lookName()
$('#look').onclick = () => {
  root.dataset.look = root.dataset.look === 'calm' ? 'ink' : 'calm'
  lookName()
  try {
    localStorage.setItem('desk-look', root.dataset.look)
  } catch {}
}
const fitScale = () => root.style.setProperty('--s', String(Math.max(0.72, Math.min(1.3, innerWidth / 1440))))
fitScale()

// ── Ink helpers: seeded wobble so every stroke looks hand-drawn ──────────────
function rng(seed) {
  let a = seed * 9301 + 49297
  return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648)
}
/** Smooth path through points (Catmull-Rom), with a little hand wobble. */
function inkPath(pts, wobble = 0.8, seed = 1) {
  const r = rng(seed)
  const p = pts.map(([x, y]) => [x + (r() - 0.5) * wobble, y + (r() - 0.5) * wobble])
  if (p.length < 2) return ''
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}
const series = (vals, w, h, pad = 2) => {
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  return vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)])
}
/** Make every .draw path draw itself on, in order. */
function primeDraw(el, base = 0) {
  el.querySelectorAll('path.draw, circle.draw, polyline.draw').forEach((p, i) => {
    const len = p.getTotalLength ? Math.ceil(p.getTotalLength()) + 2 : 400
    p.style.setProperty('--len', len)
    p.style.setProperty('--d', `${base + i * 0.12}s`)
  })
}

// ── Mini visuals (inside each bloom), drawn in ink ───────────────────────────
function mini(v, seed) {
  const W = 100
  const H = 32
  const svg = (inner, vb = `0 0 ${W} ${H}`) => `<svg class="mini" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`
  switch (v.kind) {
    case 'bars': {
      const max = Math.max(...v.rows.map((r) => r[1]))
      return svg(v.rows.map(([, n], i) => `<rect class="bar" x="${18 + i * 24}" y="${H - (n / max) * (H - 4)}" width="14" height="${(n / max) * (H - 4)}" rx="3"/>`).join(''))
    }
    case 'flat':
      return svg(`<path class="ln draw" d="${inkPath(series([60, 64, 58, 63, 61, 20, 3, 2, 2, 2], W, H), 0.6, seed)}"/>`)
    case 'spark':
      return svg(`<path class="ln draw" d="${inkPath(series(v.points, W, H), 0.6, seed)}"/>`)
    case 'stars':
      return svg(Array.from({ length: 5 }, (_, i) => `<text x="${12 + i * 19}" y="24" font-size="20" fill="currentColor" opacity="${i < 4 ? 1 : 0.55}">★</text>`).join(''))
    case 'wave':
      return svg(Array.from({ length: 18 }, (_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 1.7 + seed)) * 22
        return `<rect class="wv" x="${4 + i * 5.3}" y="${(H - h) / 2}" width="2.6" height="${h}" rx="1.3" style="animation-delay:${(i % 6) * 0.11}s"/>`
      }).join(''))
    case 'face':
      return svg(`<path class="ln draw" d="${inkPath(Array.from({ length: 13 }, (_, i) => [50 + Math.cos((i / 12) * Math.PI * 2) * 15, 16 + Math.sin((i / 12) * Math.PI * 2) * 14]), 1.6, seed)}"/><text x="50" y="21" text-anchor="middle" font-size="13" font-family="Nanum Pen Script" fill="currentColor">${v.initials}</text>`)
    case 'dots':
      return svg(Array.from({ length: v.n }, (_, i) => `<circle class="dot ${[3, 11, 16, 22].includes(i) ? 'on' : ''}" cx="${10 + (i % 9) * 10}" cy="${6 + Math.floor(i / 9) * 10}" r="2.6" style="animation-delay:${(i % 4) * 0.3}s"/>`).join(''))
    case 'ring': {
      const c = 2 * Math.PI * 13
      return svg(`<circle cx="50" cy="16" r="13" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="3.5"/><circle class="draw" cx="50" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${(c * v.pct) / 100} ${c}" transform="rotate(-90 50 16)" style="--len:${c}"/>`)
    }
    case 'cal':
      return svg(v.slots.map((s, i) => `<rect x="${6 + i * 9}" y="9" width="7" height="14" rx="2" fill="currentColor" opacity="${s ? 0.85 : 0.15}"/>`).join(''))
    case 'tally':
      return svg([0, 1, 2].map((i) => `<path class="ln draw" d="${inkPath([[38 + i * 10, 4], [36 + i * 10, 28]], 1.5, seed + i)}"/>`).join(''))
    case 'plus':
      return svg(`<path class="ln draw" d="${inkPath([[50, 2], [51, 30]], 1.2, seed)}"/><path class="ln draw" d="${inkPath([[36, 16], [64, 15]], 1.2, seed + 2)}"/>`)
    case 'clock':
      return svg(`<circle class="ln draw" cx="50" cy="16" r="13"/><path class="ln draw" d="M50 16 L50 7 M50 16 L57 19"/>`)
  }
  return ''
}

// ── Blooms ───────────────────────────────────────────────────────────────────
const arrow = (seed) => `<svg viewBox="0 0 34 30"><path class="draw" d="${inkPath([[30, 28], [18, 22], [8, 12], [4, 3]], 1.2, seed)}"/><path class="draw" d="${inkPath([[4, 3], [3, 11]], 0.6, seed + 1)}"/><path class="draw" d="${inkPath([[4, 3], [11, 6]], 0.6, seed + 2)}"/></svg>`
const blooms = {}
ITEMS.forEach((it, n) => {
  const b = document.createElement('div')
  b.className = 'bloom'
  b.dataset.id = it.id
  b.dataset.heat = heat[it.id]
  b.dataset.side = it.pos[0] > 74 ? 'left' : 'right'
  b.style.cssText = `--size:${it.size}px;--tilt:${it.tilt}deg;left:${it.pos[0]}%;top:${it.pos[1]}%;--morph:${10 + (n % 5) * 1.6}s;--morph-delay:-${n * 1.3}s`
  b.innerHTML = `<div class="aura"></div><div class="blob"></div>
    ${it.heat === 'hot' ? '<span class="spark">✳</span>' : ''}
    <div class="body"><div class="lbl">${it.label}</div><div class="val">${it.value}${it.unit ? `<small>${it.unit}</small>` : ''}</div>${mini(it.viz, n + 3)}<div class="sub">${it.sub}</div></div>
    <div class="note">${arrow(n + 7)}<span>${it.note}</span></div>`
  b.setAttribute('role', 'button')
  b.setAttribute('tabindex', '0')
  b.setAttribute('aria-label', `${it.label}: ${it.value}. ${it.note}`)
  desk.appendChild(b)
  blooms[it.id] = b
})

/** The AI sketches the desk: words write in, blooms bloom one by one, ink draws itself. */
function sketch(first) {
  const h1 = $('#hi')
  h1.innerHTML = GREETING.t.split('.')[0].concat('.').split(' ').map((w, i) => `<span class="w" style="animation-delay:${0.15 + i * 0.12}s">${w}</span>`).join(' ')
  const note = $('#hiNote')
  note.style.animation = 'none'
  void note.offsetWidth
  note.style.animation = ''
  const order = ITEMS.map((it) => it.id).sort((a, b) => dist(a) - dist(b))
  order.forEach((id, i) => {
    const b = blooms[id]
    b.classList.remove('in')
    if (!first) {
      const it = ITEMS.find((x) => x.id === id)
      it.tilt = Math.round((Math.random() - 0.5) * 16)
      b.style.setProperty('--tilt', `${it.tilt}deg`)
    }
    setTimeout(() => {
      b.classList.add('in')
      primeDraw(b, 0.25)
      b.querySelectorAll('.draw').forEach((p) => {
        p.style.animation = 'none'
        void p.getBoundingClientRect()
        p.style.animation = ''
      })
    }, 700 + i * 140)
  })
  setTimeout(drawThreads, 700 + order.length * 140 + 400)
}
function dist(id) {
  const it = ITEMS.find((x) => x.id === id)
  return Math.hypot(it.pos[0] - 10, (it.pos[1] - 20) * 1.4)
}

// Threads the AI draws between related things ("same story").
function drawThreads() {
  const svg = $('#threads')
  svg.innerHTML = THREADS.map(([a, b, label], i) => {
    const ra = blooms[a].getBoundingClientRect()
    const rb = blooms[b].getBoundingClientRect()
    const A = [ra.left + ra.width / 2, ra.top + ra.height / 2]
    const B = [rb.left + rb.width / 2, rb.top + rb.height / 2]
    const M = [(A[0] + B[0]) / 2 - 30, (A[1] + B[1]) / 2 + 20]
    return `<path class="draw" d="${inkPath([A, M, B], 3, 40 + i)}"/><text x="${M[0] - 30}" y="${M[1] + 26}" transform="rotate(-8 ${M[0]} ${M[1]})">${label}</text>`
  }).join('')
  primeDraw(svg)
}

// ── Voice: plays a clip, reveals words in time, and drives the creature's breathing ─
let DUR = {}
fetch('audio/durations.json')
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => (DUR = d))
  .catch(() => {})
let voice = null
let actx = null
function stopVoice() {
  if (!voice) return
  voice.stop()
  voice = null
}
function speak(line, { onWord, onAmp, onEnd } = {}) {
  stopVoice()
  const words = line.t.split(' ')
  const ms = DUR[line.id] ?? words.length * 330
  const audio = new Audio(`audio/${line.id}.m4a`)
  let analyser = null
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)()
    actx.resume?.()
    const src = actx.createMediaElementSource(audio)
    analyser = actx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    analyser.connect(actx.destination)
  } catch {
    analyser = null
  }
  const buf = new Uint8Array(128)
  let start = performance.now()
  let audible = false
  let stopped = false
  audio.play().then(
    () => {
      audible = true
      start = performance.now()
    },
    () => {},
  )
  const timer = setInterval(() => {
    const t = audible ? audio.currentTime * 1000 : performance.now() - start
    onWord?.(Math.min(words.length, Math.ceil((t / ms) * words.length)))
    let amp = 0
    if (analyser && audible) {
      analyser.getByteTimeDomainData(buf)
      let s = 0
      for (const v of buf) s += ((v - 128) / 128) ** 2
      amp = Math.min(1, Math.sqrt(s / buf.length) * 5)
    } else amp = 0.35 + Math.sin(t / 90) * 0.25
    onAmp?.(amp)
    if (t >= ms + 120 || (audible && audio.ended)) finish()
  }, 40)
  function finish() {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    onWord?.(words.length)
    onAmp?.(0)
    onEnd?.()
  }
  const v = {
    stop() {
      audio.pause()
      if (!stopped) {
        stopped = true
        clearInterval(timer)
        onAmp?.(0)
      }
    },
  }
  voice = v
  return v
}

// ── Pen: your cursor is a pen of light; drag on the canvas to scribble ───────
const pen = $('#pen')
const canvas = $('#ink')
const ctx = canvas.getContext('2d')
const DPR = Math.min(2, devicePixelRatio || 1)
function fitCanvas() {
  canvas.width = innerWidth * DPR
  canvas.height = innerHeight * DPR
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
}
fitCanvas()
const strokes = [] // { pts:[[x,y]], born, drawing }
const trail = [] // recent pen positions, for the light trail
let current = null
let press = null // a press on a bloom: maybe a drag, maybe a click

function inkColor() {
  return getComputedStyle(root).getPropertyValue('--ink').trim() || '#a9b1ff'
}
function paint() {
  const now = performance.now()
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  const ink = inkColor()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = ink
  ctx.shadowColor = ink
  // Scribbles: bright while drawing, then they evaporate over a few seconds.
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    const age = s.drawing ? 0 : now - s.born
    const life = s.lasso ? 2600 : 4200
    if (age > life) {
      strokes.splice(i, 1)
      continue
    }
    ctx.globalAlpha = Math.max(0, 1 - age / life)
    ctx.lineWidth = 3.2
    ctx.shadowBlur = 14
    ctx.beginPath()
    s.pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  // The pen's light trail.
  while (trail.length && now - trail[0][2] > 260) trail.shift()
  if (trail.length > 1 && !document.body.classList.contains('portal-open')) {
    ctx.shadowBlur = 10
    for (let j = 1; j < trail.length; j++) {
      const k = j / trail.length
      ctx.globalAlpha = k * 0.5
      ctx.lineWidth = 1 + k * 3
      ctx.beginPath()
      ctx.moveTo(trail[j - 1][0], trail[j - 1][1])
      ctx.lineTo(trail[j][0], trail[j][1])
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  requestAnimationFrame(paint)
}
requestAnimationFrame(paint)

const isUi = (t) => !!t?.closest?.('.top, .bar, .lasso, .portal, .toast, .hello button')
addEventListener('pointermove', (e) => {
  pen.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
  trail.push([e.clientX, e.clientY, performance.now()])
  pen.classList.toggle('over', !!e.target.closest?.('.bloom') && !press?.drag)
  // Gentle depth: blooms drift against the pen, bigger ones (closer) more.
  if (!current && !press?.drag && !document.body.classList.contains('portal-open')) {
    const nx = e.clientX / innerWidth - 0.5
    const ny = e.clientY / innerHeight - 0.5
    for (const it of ITEMS) {
      const k = it.size / 270
      blooms[it.id].style.setProperty('--px', `${(-nx * 14 * k).toFixed(1)}px`)
      blooms[it.id].style.setProperty('--py', `${(-ny * 10 * k).toFixed(1)}px`)
    }
  }
  if (current) {
    const last = current.pts.at(-1)
    if (Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 2) current.pts.push([e.clientX, e.clientY])
  }
  if (press) {
    if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
      press.drag = true
      press.el.classList.add('dragging')
    }
    if (press.drag) {
      const it = ITEMS.find((x) => x.id === press.el.dataset.id)
      it.pos = [((e.clientX - press.ox) / innerWidth) * 100, ((e.clientY - press.oy) / innerHeight) * 100]
      press.el.style.left = `${it.pos[0]}%`
      press.el.style.top = `${it.pos[1]}%`
      drawThreadsNow()
    }
  }
})
addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || isUi(e.target) || document.body.classList.contains('portal-open')) return
  const b = e.target.closest?.('.bloom')
  if (b) {
    const r = b.getBoundingClientRect()
    press = { el: b, x: e.clientX, y: e.clientY, ox: e.clientX - (r.left + r.width / 2), oy: e.clientY - (r.top + r.height / 2), drag: false }
    return
  }
  // Empty canvas: start a scribble.
  current = { pts: [[e.clientX, e.clientY]], born: 0, drawing: true }
  strokes.push(current)
  pen.classList.add('drawing')
  closeLasso()
})
addEventListener('pointerup', (e) => {
  if (press) {
    const p = press
    press = null
    p.el.classList.remove('dragging')
    if (!p.drag) openPortal([ITEMS.find((x) => x.id === p.el.dataset.id)], p.el)
    return
  }
  if (!current) return
  const s = current
  current = null
  s.drawing = false
  s.born = performance.now()
  pen.classList.remove('drawing')
  checkLasso(s, e)
})
addEventListener('resize', () => {
  fitScale()
  fitCanvas()
  drawThreadsNow()
})
function drawThreadsNow() {
  drawThreads()
  $('#threads').querySelectorAll('.draw').forEach((p) => (p.style.animation = 'none'))
}
desk.addEventListener('keydown', (e) => {
  const b = e.target.closest?.('.bloom')
  if (b && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault()
    openPortal([ITEMS.find((x) => x.id === b.dataset.id)], b)
  }
})

// ── Circle to ask ────────────────────────────────────────────────────────────
function inside([x, y], poly) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
let hinted = false
function checkLasso(s) {
  const p = s.pts
  if (p.length < 12) return
  const xs = p.map((q) => q[0])
  const ys = p.map((q) => q[1])
  const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const closed = Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < Math.max(70, diag * 0.3)
  if (!closed || diag < 80) return
  const picked = ITEMS.filter((it) => {
    const r = blooms[it.id].getBoundingClientRect()
    return inside([r.left + r.width / 2, r.top + r.height / 2], p)
  })
  if (!picked.length) {
    if (!hinted) toast('Nice loop. Draw it around things on the desk and I’ll talk about them together.')
    hinted = true
    return
  }
  s.lasso = true
  if (picked.length === 1) return openPortal(picked, blooms[picked[0].id])
  const pair = picked.length === 2 && picked.some((i) => i.id === 'ads') && picked.some((i) => i.id === 'revenue')
  const line = pair ? LASSO.pair : { ...LASSO.many, t: `You circled ${listOf(picked)}. ${LASSO.many.t}` }
  showLasso(picked, line, [xs.reduce((a, b) => a + b) / xs.length, Math.max(...ys)])
}
const listOf = (items) => {
  const n = items.map((i) => i.label.split(' · ')[0].toLowerCase())
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : n[0]
}
function showLasso(picked, line, [x, y]) {
  const el = $('#lasso')
  el.hidden = false
  el.style.left = `${Math.max(20, Math.min(innerWidth - 340, x - 160))}px`
  el.style.top = `${Math.max(80, Math.min(innerHeight - 260, y + 16))}px`
  el.innerHTML = `<div class="who"><span class="mark" style="width:14px;height:14px"></span>Cerebro · ${picked.length} things</div><p>${line.t}</p>
    <div class="row"><button class="btn main" id="lgo"><i class="ti ti-message-circle"></i> Talk about these</button><button class="btn" id="lno">Not now</button></div>`
  $('#lgo').onclick = () => {
    closeLasso()
    openPortal(picked, null, { x: x, y: y })
  }
  $('#lno').onclick = closeLasso
  if (line.id === LASSO.pair.id) speak(line)
}
function closeLasso() {
  const el = $('#lasso')
  if (el.hidden) return
  el.hidden = true
  stopVoice()
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastT = 0
function toast(text, line) {
  const t = $('#toast')
  t.hidden = false
  t.textContent = text
  clearTimeout(toastT)
  toastT = setTimeout(() => (t.hidden = true), 5200)
  if (line) speak(line)
}

// ── The portal: a full-screen one-on-one room for one thing (or a circled group) ─
const portal = $('#portal')
let room = null
function bigViz(v) {
  if (!v) return ''
  const W = 520
  const H = 160
  switch (v.kind) {
    case 'bars': {
      const max = Math.max(...v.rows.map((r) => r[1]))
      return `<svg viewBox="0 0 ${W} ${v.rows.length * 52}">${v.rows
        .map(([n, val, why], i) => {
          const end = (val / max) * (W - 220)
          return `<text x="0" y="${i * 52 + 20}">${n}</text>
          <path class="ln draw" d="${inkPath([[0, i * 52 + 34], [end, i * 52 + 34]], 0.8, i + 3)}" style="stroke-width:10"/>
          <text x="${end + 12}" y="${i * 52 + 39}" style="fill:currentColor;font-weight:600">${v.neg ? '−' : ''}$${val}k</text>
          <text class="hand-t" x="${end + 86}" y="${i * 52 + 41}">${why ?? ''}</text>`
        })
        .join('')}</svg>`
    }
    case 'line': {
      const pts = series(v.points, W, H, 8)
      return `<svg viewBox="0 0 ${W} ${H + 30}"><path class="ln draw" d="${inkPath(pts, 1, 9)}"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="5" fill="currentColor"/><text x="0" y="${H + 26}">${v.label}</text></svg>`
    }
    case 'flow':
      return `<svg viewBox="0 0 ${W} 90">${v.nodes
        .map((n, i) => {
          const x = 20 + i * ((W - 60) / (v.nodes.length - 1))
          return `${i ? `<path class="ln draw" d="${inkPath([[x - (W - 60) / (v.nodes.length - 1) + 22, 30], [x - 22, 30]], 1.4, i)}"/>` : ''}<circle class="ln draw" cx="${x}" cy="30" r="16"/><text x="${x}" y="72" text-anchor="middle">${n}</text>`
        })
        .join('')}</svg>`
    case 'ring': {
      const c = 2 * Math.PI * 60
      return `<svg viewBox="0 0 ${W} 170"><circle cx="90" cy="80" r="60" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="12"/><circle class="draw" cx="90" cy="80" r="60" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * v.pct) / 100} ${c}" transform="rotate(-90 90 80)" style="--len:${c}"/><text x="190" y="86">${v.label}</text></svg>`
    }
    case 'cal':
      return `<svg viewBox="0 0 ${W} 110">${v.slots.map((s, i) => `<rect x="${i * 52}" y="10" width="44" height="60" rx="10" fill="currentColor" opacity="${s ? 0.8 : 0.12}"/>${s ? '' : `<text class="hand-t" x="${i * 52 + 22}" y="48" text-anchor="middle">gap</text>`}`).join('')}<text x="0" y="100">${v.label}</text></svg>`
    case 'list':
      return v.rows.map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join('')
    case 'quote':
      return `<div class="p-quote"><div class="who">${v.who}</div><q>${v.q}</q><div class="reply"><small>My draft, in your voice</small>${v.a}</div></div>`
    case 'make':
      return ['Website', 'Funnel', 'Email campaign', 'Voice agent', 'Booking page'].map((m) => `<div class="row"><span>${m}</span><span>Describe it, I’ll build it</span></div>`).join('')
  }
  return ''
}

function openPortal(items, fromEl, at) {
  if (!items.length) return
  stopVoice()
  closeLasso()
  const group = items.length > 1
  const it = items[0]
  const r = fromEl?.getBoundingClientRect()
  const cx = r ? r.left + r.width / 2 : at?.x ?? innerWidth / 2
  const cy = r ? r.top + r.height / 2 : at?.y ?? innerHeight / 2
  portal.style.setProperty('--cx', `${cx}px`)
  portal.style.setProperty('--cy', `${cy}px`)
  portal.style.setProperty('--r', `${r ? r.width / 2 : 40}px`)
  portal.dataset.heat = group ? (items.some((i) => heat[i.id] === 'hot') ? 'hot' : 'warm') : heat[it.id]
  const can = group ? items.flatMap((i) => i.can.slice(0, 1).map((c) => ({ ...c, item: i }))) : it.can.map((c) => ({ ...c, item: it }))
  const intro = group ? { id: null, t: `Here’s ${listOf(items)} together. ${items.map((i) => `${i.label.split(' · ')[0]}: ${i.value}.`).join(' ')} Pick one to start, or ask me anything.` } : it.intro
  portal.innerHTML = `<div class="p-bg"></div><div class="p-wrap">
    <div class="p-head"><span class="lbl"><b></b>${group ? `${items.length} things you circled` : it.label}</span><button class="p-close" aria-label="Close (Esc)"><i class="ti ti-x"></i></button></div>
    <div class="p-left"><div class="creature" id="creature"><i></i><i></i><i></i><b></b></div><p class="p-say" id="psay"></p></div>
    <div class="p-right">
      ${group ? `<div class="p-viz">${items.map((i) => `<div class="row"><span>${i.label}</span><span>${i.value} · ${i.sub}</span></div>`).join('')}</div>` : `<div><div class="p-value">${it.value}${it.unit ? `<small> ${it.unit}</small>` : ''}</div><div class="p-sub">${it.sub}</div></div><div class="p-viz">${bigViz(it.big)}</div>`}
      <div class="p-can">${can.map((c, i) => `<button class="btn ${i ? '' : 'main'}" data-c="${i}">${c.label}</button>`).join('')}</div>
    </div>
    <div class="p-foot"><div class="p-log" id="plog"></div>
      <form class="p-input" id="pform"><input id="pask" placeholder="Talk to me about ${group ? 'these' : it.label.split(' · ')[0].toLowerCase()}…" autocomplete="off"/><button type="button" class="mic" id="pmic" aria-label="Talk"><i class="ti ti-microphone"></i></button></form></div>
  </div>`
  portal.hidden = false
  document.body.classList.add('portal-open')
  void portal.offsetWidth
  portal.style.setProperty('--r', `${Math.hypot(innerWidth, innerHeight)}px`)
  primeDraw(portal, 0.5)
  room = { items, can, from: fromEl, said: null }
  portal.querySelector('.p-close').onclick = closePortal
  portal.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => runCan(+b.dataset.c, b)))
  $('#pform').onsubmit = (e) => {
    e.preventDefault()
    const v = $('#pask').value.trim()
    $('#pask').value = ''
    if (v) heard(v)
  }
  $('#pmic').onclick = () => listen($('#pmic'), heard)
  setTimeout(() => say(intro), 650)
}

/** The AI talks in the room: the line is big in the middle, words light up as it speaks. */
function say(line, after) {
  if (!room) return
  const el = $('#psay')
  if (room.said) logAi(room.said)
  room.said = line.t
  const words = line.t.split(' ')
  el.innerHTML = words.map((w) => `<span class="w dim">${w}</span> `).join('')
  const spans = el.querySelectorAll('.w')
  const creature = $('#creature')
  const go = { onWord: (n) => spans.forEach((s, i) => s.classList.toggle('dim', i >= n)), onAmp: (a) => creature?.style.setProperty('--amp', a.toFixed(3)), onEnd: after }
  if (line.id) speak(line, go)
  else {
    // A line with no clip (a circled group): reveal at a speaking pace.
    stopVoice()
    let n = 0
    const t = setInterval(() => {
      go.onWord(++n)
      go.onAmp(0.3 + Math.random() * 0.4)
      if (n >= words.length) {
        clearInterval(t)
        go.onAmp(0)
        after?.()
      }
    }, 300)
    voice = { stop: () => clearInterval(t) }
  }
}
function logAi(t) {
  const d = document.createElement('div')
  d.className = 'ai'
  d.textContent = t
  $('#plog')?.appendChild(d)
  $('#plog') && ($('#plog').scrollTop = 1e6)
}
function logMe(t) {
  const d = document.createElement('div')
  d.className = 'me'
  d.textContent = t
  $('#plog')?.appendChild(d)
  $('#plog') && ($('#plog').scrollTop = 1e6)
}
function runCan(i, btn) {
  const c = room?.can[i]
  if (!c) return
  logMe(c.label)
  btn?.classList.add('used')
  say(c, () => c.effect === 'heal' && heal(c.item, btn))
}
const norm = (s) => s.toLowerCase().replace(/[’'“”".,!?]/g, '').replace(/\s+/g, ' ').trim()
function heard(text) {
  if (!room) return
  logMe(text)
  const t = norm(text)
  const i = room.can.findIndex((c) => norm(c.label) === t || norm(c.label).split(' ').slice(0, 2).every((w) => t.includes(w)) || (t.match(/\b(yes|do it|go ahead|sure|ok)\b/) && c === room.can[0]))
  if (i >= 0) return runCan(i, portal.querySelector(`[data-c="${i}"]`))
  say(FALLBACK)
}

/** Something got fixed: the portal turns calm green, sparks fly, and its bloom on the desk shows it's done. */
function heal(item, btn) {
  heat[item.id] = 'done'
  done[item.id] = true
  portal.dataset.heat = 'done'
  const b = blooms[item.id]
  b.dataset.heat = 'done'
  b.querySelector('.spark')?.remove()
  if (!b.querySelector('.done-tick')) b.insertAdjacentHTML('beforeend', '<span class="done-tick"><i class="ti ti-check"></i></span>')
  b.querySelector('.note span').textContent = 'Done ✓'
  const r = (btn ?? portal).getBoundingClientRect()
  const burst = document.createElement('div')
  burst.className = 'sparks'
  burst.style.left = `${r.left + r.width / 2}px`
  burst.style.top = `${r.top + r.height / 2}px`
  burst.innerHTML = Array.from({ length: 18 }, (_, k) => {
    const a = (k / 18) * Math.PI * 2
    const d = 60 + Math.random() * 70
    return `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"></i>`
  }).join('')
  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 1000)
  if (THREADS.some(([a, b2]) => a === item.id || b2 === item.id)) $('#threads').querySelectorAll('path').forEach((p) => (p.style.stroke = 'var(--good)'))
}

function closePortal() {
  if (portal.hidden) return
  stopVoice()
  const from = room?.from
  const r = from?.getBoundingClientRect()
  if (r) {
    portal.style.setProperty('--cx', `${r.left + r.width / 2}px`)
    portal.style.setProperty('--cy', `${r.top + r.height / 2}px`)
  }
  portal.style.setProperty('--r', `${r ? r.width / 2 : 0}px`)
  room = null
  setTimeout(() => {
    portal.hidden = true
    portal.innerHTML = ''
    document.body.classList.remove('portal-open')
  }, 700)
}
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!portal.hidden) closePortal()
  else closeLasso()
})

// ── Ask bar and voice input ────────────────────────────────────────────────────
const KEYS = {
  revenue: ['revenue', 'dip', 'money', 'mrr down', 'lumen spa down'],
  ads: ['ads', 'google', 'harbor ads', 'campaign stopped'],
  calls: ['missed call', 'calls', 'text back', 'phone'],
  reviews: ['review', 'stars', 'rating'],
  voicemail: ['voicemail', 'jen', 'message'],
  lead: ['priya', 'lead', 'smile studio', '11'],
  agents: ['agent', 'team', 'overnight'],
  mrr: ['mrr', 'revenue total', 'how are we doing'],
  spend: ['spend', 'budget', 'cost'],
  bookings: ['booking', 'calendar', 'gaps', 'appointments'],
  invoices: ['invoice', 'overdue', 'payment', 'pay'],
  make: ['make', 'build', 'website', 'funnel', 'create', 'page'],
  social: ['social', 'post', 'instagram'],
}
$('#bar').onsubmit = (e) => {
  e.preventDefault()
  const v = $('#ask').value.trim()
  $('#ask').value = ''
  if (v) ask(v)
}
function ask(text) {
  const t = norm(text)
  const hit = ITEMS.find((it) => KEYS[it.id].some((k) => t.includes(k)))
  if (!hit) return toast(FALLBACK.t, FALLBACK)
  openPortal([hit], blooms[hit.id])
  // If the question matches something it can do, do that after the intro.
  const i = hit.can.findIndex((c) => norm(c.label).split(' ').slice(0, 2).every((w) => t.includes(w)))
  if (i >= 0) setTimeout(() => runCan(i, portal.querySelector(`[data-c="${i}"]`)), 900)
}
$('#mic').onclick = () => listen($('#mic'), ask)

const SR = window.SpeechRecognition || window.webkitSpeechRecognition
function listen(btn, then) {
  if (!SR) return toast('Voice works in Chrome. You can type instead.')
  stopVoice()
  const rec = new SR()
  rec.lang = 'en-US'
  rec.interimResults = false
  btn.classList.add('live')
  rec.onresult = (e) => then(e.results[0][0].transcript)
  rec.onerror = (e) => {
    if (e.error === 'not-allowed') toast('I need microphone access to listen. Allow it in your browser, then tap the mic again.')
  }
  rec.onend = () => btn.classList.remove('live')
  try {
    rec.start()
  } catch {
    btn.classList.remove('live')
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
$('#resketch').onclick = () => sketch(false)
sketch(true)
// The greeting speaks once the browser allows sound (after your first tap anywhere).
let greeted = false
addEventListener(
  'pointerdown',
  () => {
    if (greeted || !portal.hidden) return
    greeted = true
    setTimeout(() => !room && !voice && speak(GREETING), 200)
  },
  { once: true },
)
