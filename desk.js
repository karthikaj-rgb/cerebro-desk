// Cerebro · The Desk
// Stage: your platform laid out as aligned cards. Scribble: the same cards, placed by hand, with pencil
// notes; tidy them back any time. Circle things to talk about them together. Click anything to open
// a room: a call with the AI, centred on its voice; switch to chat whenever you'd rather type.
import { GREETING, GREETING_ONE, ITEMS, ONE_ITEMS, THREADS, LASSO, FALLBACK, BUILD_LINES, DYN } from './data.js?v=20261108a'
import { LIVE, STEPS, STEER, RESULT } from './work.js?v=20261108a'
// Everything that can be on the desk, including the One AI option's extras (ONE_ITEMS).
const ALL = [...ITEMS, ...ONE_ITEMS]
const CARDED = ALL.filter((it) => !it.nocard)
import { createStitch } from './stitch.js?v=20261108a'
import { initPresence, setPresenceStyle, setPresenceAmp, nextPhrase } from './presence.js?v=20261108a'

const $ = (s, r = document) => r.querySelector(s)
const root = document.documentElement
const desk = $('#desk')
const heat = Object.fromEntries(ALL.map((it) => [it.id, it.heat]))
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {}
  },
}

// ── Theme and layout ─────────────────────────────────────────────────────────
root.dataset.theme = store.get('desk-theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
$('#theme').onclick = () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  store.set('desk-theme', root.dataset.theme)
  stitchTheme()
}
// ?layout=scribble opens straight into Scribble (the gallery links to it).
const layoutParam = new URLSearchParams(location.search).get('layout')
// Always open in Stage; Scribble is a choice for the session (or ?layout=scribble), not a remembered one.
let layout = ['stage', 'scribble'].includes(layoutParam) ? layoutParam : 'stage'

// Prototype options: how the AI's voice shows in the room (the centred creature, or a HighLevel AI bar).
let voiceStyle = store.get('desk-voice') ?? 'bar'
const HINTS = { creature: 'The AI in the middle: its words under the creature, one big mic.', bar: 'A bar along the bottom: waveform, the line as it’s spoken, Aa to type, pause, close.' }
function setVoiceStyle(v) {
  voiceStyle = v
  store.set('desk-voice', v)
  document.querySelectorAll('[data-voice]').forEach((b) => b.setAttribute('aria-selected', b.dataset.voice === v))
  $('#pbHint').textContent = HINTS[v]
  if (!roomEl.hidden) roomEl.dataset.voice = v
}
// The prototype panel lives at the page level so it can open over a room too (room's settings button).
document.body.appendChild($('#pbox'))
$('#proto').onclick = () => ($('#pbox').hidden = !$('#pbox').hidden)
document.addEventListener('click', (e) => { if (e.target.closest?.('[data-proto]')) $('#pbox').hidden = !$('#pbox').hidden })
document.querySelectorAll('[data-voice]').forEach((b) => (b.onclick = () => setVoiceStyle(b.dataset.voice)))
addEventListener('pointerdown', (e) => {
  if (!e.target.closest?.('#pbox, #proto, [data-proto]')) $('#pbox').hidden = true
})

// ── Small helpers ────────────────────────────────────────────────────────────
function rng(seed) {
  let a = seed * 9301 + 49297
  return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648)
}
/** A smooth path through points with a little hand wobble. */
function inkPath(pts, wobble = 0.8, seed = 1) {
  const r = rng(seed)
  const p = pts.map(([x, y]) => [x + (r() - 0.5) * wobble, y + (r() - 0.5) * wobble])
  if (p.length < 2) return ''
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]
    const [p1, p2] = [p[i], p[i + 1]]
    const p3 = p[i + 2] ?? p2
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}
const series = (vals, w, h, pad = 2) => {
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  return vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - pad * 2), h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2)])
}
function primeDraw(el, base = 0.3) {
  el.querySelectorAll('.draw').forEach((p, i) => {
    const len = p.getTotalLength ? Math.ceil(p.getTotalLength()) + 2 : 400
    p.style.setProperty('--len', len)
    p.style.setProperty('--dd', `${base + i * 0.1}s`)
  })
}
const esc = (t) => t.replace(/</g, '&lt;')

// ── Charts inside cards: tiny and plain, one shape beside the number, in the card's colour ──
function mini(v, seed) {
  const W = 72
  const H = 26
  const id = `g${seed}`
  const svg = (inner, defs = '') => `<svg class="mini" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid meet">${defs}${inner}</svg>`
  const fade = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>`
  const line = (points) => {
    const pts = series(points, W, H - 6, 2).map(([x, y]) => [x, y + 2])
    const d = inkPath(pts, 0.3, seed)
    const [ex, ey] = pts.at(-1)
    return svg(`<path class="fill" d="${d} L${W - 2} ${H} L2 ${H}Z" fill="url(#${id})"/><path class="ln draw" d="${d}"/><circle class="glow" cx="${ex}" cy="${ey}" r="5"/><circle class="end" cx="${ex}" cy="${ey}" r="2.4"/>`, fade)
  }
  switch (v.kind) {
    case 'lolli': {
      const max = Math.max(...v.rows.map((r) => r[1]))
      return svg(v.rows.map(([, val], i) => `<rect class="bar draw-w" x="${W - (val / max) * W}" y="${3 + i * 7.5}" width="${(val / max) * W}" height="5" rx="2.5" style="animation-delay:${i * 0.08}s"/>`).join(''))
    }
    case 'cliff':
    case 'area':
      return line(v.points)
    case 'ring':
      return svg(Array.from({ length: v.n }, (_, i) => `<circle class="dot ${v.on.includes(i) ? 'on' : ''}" cx="${W - 2 - (13 - (i % 14)) * 5}" cy="${8 + Math.floor(i / 14) * 9}" r="1.9" style="animation-delay:${(i % 4) * 0.3}s"/>`).join(''))
    case 'gauge': {
      const c = 2 * Math.PI * 9
      return svg(`<circle cx="${W - 11}" cy="13" r="9" class="track"/><circle class="draw" cx="${W - 11}" cy="13" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * v.pct) / 100} ${c}" transform="rotate(-90 ${W - 11} 13)" style="--len:${c}"/><text class="lb on" x="${W - 26}" y="16" text-anchor="end">${v.pct}%</text>`)
    }
    case 'slots':
      return svg(v.slots.map((on, i) => `<rect class="${on ? 'slot' : 'gap'}" x="${W - 70 + i * 7}" y="7" width="5.5" height="12" rx="2"/>`).join(''))
    case 'hist': {
      const full = Math.floor(4.8)
      return svg(Array.from({ length: 5 }, (_, i) => `<text class="star ${i < full ? 'on' : 'half'}" x="${W - 66 + i * 13}" y="19">★</text>`).join(''))
    }
    case 'aging':
      return svg(v.rows.map(([, d], i) => `<rect class="bar ${d > 7 ? '' : 'dim'} draw-w" x="${W - d * 3.6}" y="${3 + i * 7.5}" width="${d * 3.6}" height="5" rx="2.5" style="animation-delay:${i * 0.08}s"/>`).join(''))
    case 'wave':
      return svg(Array.from({ length: 18 }, (_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 1.3 + seed)) * 16
        return `<rect class="wv ${i / 18 < v.at ? '' : 'dim'}" x="${W - 70 + i * 4}" y="${(H - h) / 2}" width="2.2" height="${h}" rx="1.1" style="animation-delay:${(i % 6) * 0.11}s"/>`
      }).join(''))
    case 'week':
      return svg(v.days.map((_, i) => `<circle class="${v.state[i] === 'next' ? 'end' : v.state[i] === 'set' ? 'dot' : v.state[i] === 'empty' ? 'gap' : 'none'}" cx="${W - 62 + i * 10}" cy="13" r="${v.state[i] === 'next' ? 4 : 3}"/>`).join(''))
    case 'lead':
      return svg(`<circle class="av" cx="${W - 13}" cy="13" r="12"/><text class="lb on" x="${W - 13}" y="16.5" text-anchor="middle">${v.initials}</text>`)
    case 'plus':
      return svg(`<path class="ln" d="M${W - 13} 4v18M${W - 22} 13h18"/>`)
  }
  return ''
}

// ── Cards ────────────────────────────────────────────────────────────────────
const cards = {}
CARDED.forEach((it, n) => {
  const c = document.createElement('button')
  c.type = 'button'
  c.className = 'card' + (it.id === 'make' ? ' mkcard' : '')
  c.dataset.id = it.id
  c.dataset.heat = heat[it.id]
  if (it.only) c.dataset.only = it.only
  c.dataset.shape = it.shape
  c.dataset.side = it.pos[0] > 74 ? 'left' : 'right'
  c.style.setProperty('--d', `${0.15 + n * 0.07}s`)
  c.style.setProperty('--w', `${Math.round(it.size * 0.95)}px`)
  c.style.setProperty('--x', `${it.pos[0]}%`)
  c.style.setProperty('--y', `${it.pos[1]}%`)
  if (it.problem) {
    c.classList.add('intent')
    c.innerHTML = `<div class="eb">${it.label}</div><div class="prob">${it.problem}</div>${it.cost ? `<span class="cost">${it.cost}</span>` : ''}${it.cause ? `<div class="cause">${it.cause}</div>` : ''}
      <div class="fix"><span class="fx">✦</span><div class="ft">${it.fix}</div></div>
      <div class="acts"><button type="button" class="go1" data-act="${it.id}">${it.act}</button><button type="button" class="go2" data-later="${it.id}">Later</button></div>`
  } else
    c.innerHTML = `<div class="eb">${it.label}</div><div class="vrow"><div class="val">${it.value}${it.unit ? `<small>${it.unit}</small>` : ''}</div>${mini(it.viz, n + 3)}</div><div class="sub">${it.sub}</div><div class="note">${it.note.replace(/^I can /, '')}</div>`
  c.setAttribute('aria-label', `${it.label}: ${it.value}. ${it.note}`)
  const sec = it.id === 'make' ? 'cool' : it.heat
  desk.querySelector(`.col[data-sec='${sec}'] .cards`).appendChild(c)
  primeDraw(c, 0.5 + n * 0.07)
  cards[it.id] = c
  c.addEventListener('click', (e) => {
    if (c.dataset.dragged) return
    const act = e.target.closest?.('[data-act]')
    const later = e.target.closest?.('[data-later]')
    const rule = e.target.closest?.('[data-rule]')
    const undo = e.target.closest?.('[data-undo]')
    if (rule) {
      e.stopPropagation()
      c.querySelector('.rule').innerHTML = rule.dataset.rule === 'always' ? '<i class="ti ti-check"></i> On my own from now on' : '<i class="ti ti-check"></i> I’ll ask each time'
      if (rule.dataset.rule === 'always') bumpTrust()
      return toast(rule.dataset.rule === 'always' ? 'Noted. I’ll do that on my own from now on.' : 'Okay. I’ll ask you each time.')
    }
    if (undo) {
      e.stopPropagation()
      heat[it.id] = it.heat
      c.dataset.heat = it.heat
      c.querySelector('.tick')?.remove()
      c.querySelector('.receipt')?.remove()
      c.querySelector('.rule')?.remove()
      c.querySelector('.acts').innerHTML = `<button type="button" class="go1" data-act="${it.id}">${it.act}</button><button type="button" class="go2" data-later="${it.id}">Later</button>`
      if (desk.hasAttribute('data-v2')) renderFocus()
      return toast('Undone. Nothing changed, and I’ll leave it to you.')
    }
    if (later) {
      e.stopPropagation()
      heat[it.id] = 'later'
      c.dataset.heat = 'later'
      if (desk.hasAttribute('data-v2')) renderFocus()
      placeV2Later()
      c.querySelector('.acts').innerHTML = '<span class="saved">Saved for tomorrow’s brief</span>'
      return toast(`Okay. I’ll bring “${it.problem}” back tomorrow morning.`)
    }
    openRoom([it], c, act ? { direct: 0 } : {})
  })
})
// Make something: chips in Stage (the 'make' card shows in Scribble instead).
const MAKE = [
  ['ti-world', 'Website', 'A booking page for Glow'],
  ['ti-filter', 'Funnel', 'A booking page for Glow'],
  ['ti-mail', 'Campaign', 'A spring offer campaign'],
  ['ti-robot', 'Agent', 'A spring offer campaign'],
]
$('#makeChips').innerHTML = MAKE.map(([ic, t]) => `<button type="button" class="chip mk" data-make="${t}"><i class="ti ${ic}"></i>${t}</button>`).join('')
$('#makeChips').querySelectorAll('[data-make]').forEach((b) => (b.onclick = () => openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: b.dataset.make })))
// The One AI option names what each build promises.
const MAKE_ONE = { Website: 'draft in a minute', Funnel: 'ad to booking', Campaign: 'say it, approve, done', Agent: 'test mode first' }
$('#makeChips').querySelectorAll('[data-make]').forEach((b) => b.insertAdjacentHTML('beforeend', `<em class="promise"><i class="sep">· </i>${MAKE_ONE[b.dataset.make]}</em>`))

// ── Prototype option: Desk · Today | One AI ──────────────────────────────────
// One AI: the AI speaks for its whole team, the team shows as one row, fixed cards keep a receipt
// and ask for a rule, and "what I do on my own" sits on the desk.
// Older builds saved the room's voice/chat choice under this key; anything but 'one' means Today.
let deskMode = store.get('desk-mode') === 'one' ? 'one' : 'today'
const DESK_HINTS = { today: 'Today’s desk: three things need you, the rest is running.', one: 'One AI: every HighLevel AI product is one team under it. Fixed cards show a receipt and ask for a rule; the trust chip opens what it may do alone.' }
const TEAM = [
  ['ti-phone', 'Voice', '14 calls', '2 need you', 'callers', 'hot'],
  ['ti-message', 'Chats', '38 replies', '3 handed up', 'agents', ''],
  ['ti-star', 'Reviews', '41 drafted', 'waiting for yes', 'reviews', 'warm'],
  ['ti-pencil', 'Content', '5 posts', 'scheduled 4 PM', 'social', ''],
  ['ti-robot', 'Agents', '27', '4 working', 'agents', ''],
]
$('#team').innerHTML = `<h2>Your AI team <span>· one AI, many hands</span></h2><div class="tiles">${TEAM.map(([ic, n, v, sub, id, h]) => `<button type="button" class="tile" data-open="${id}" data-heat="${h}"><span class="tn"><i class="ti ${ic}"></i>${n}</span><b>${v}</b><small>${sub}</small></button>`).join('')}</div>`
$('#team').querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openRoom([ALL.find((i) => i.id === b.dataset.open)], b)))
let trustN = 9
function bumpTrust() {
  trustN++
  $('#trustchip').innerHTML = `<i></i>On my own · ${trustN} things · 0 undone`
}
$('#trustchip').innerHTML = `<i></i>On my own · ${trustN} things · 0 undone`
$('#trustchip').onclick = (e) => openRoom([ALL.find((i) => i.id === 'trust')], e.currentTarget)
function setDeskMode(v) {
  deskMode = v
  store.set('desk-mode', v)
  const one = v === 'one'
  document.querySelectorAll('[data-desk]').forEach((b) => b.setAttribute('aria-selected', b.dataset.desk === v))
  $('#pbHint2').textContent = DESK_HINTS[v]
  desk.toggleAttribute('data-one', one)
  $('#team').hidden = !one || layout !== 'stage'
  $('#trustchip').hidden = !one
  document.querySelector('.hello .line').innerHTML = one ? '<b>Your team handled 61 things since last night.</b> Three need you.' : '<b>Three things need you.</b> Everything else is running.'
  $('#reach').hidden = !one
  $('#ask').placeholder = one ? 'Ask or tell me anything — “set up Glow Med Spa from scratch”' : 'Ask your desk anything…'
  if (layout === 'scribble') setTimeout(() => (look === 'editorial' ? placeBoard() : scatter()), 50)
  if (typeof placeFront === 'function') placeFront()
}
document.querySelectorAll('[data-desk]').forEach((b) => (b.onclick = () => setDeskMode(b.dataset.desk)))

// ── Prototype option: In the room · Chat | Live work ─────────────────────────
// Live work: the data it works from is on screen from the start, and a fix ticks off step by step
// while it's spoken, with the numbers moving. Chat is the room as it was.
let roomStyle = store.get('desk-room') ?? 'live'
const ROOM_HINTS = { chat: 'The AI’s line, three numbers, the detail behind a button.', live: 'What it’s working from is always on screen; a fix ticks off step by step as it speaks, and the numbers move.' }
function setRoomStyle(v) {
  roomStyle = v
  store.set('desk-room', v)
  document.querySelectorAll('[data-room]').forEach((b) => b.setAttribute('aria-selected', b.dataset.room === v))
  $('#pbHint3').textContent = ROOM_HINTS[v]
  if (!roomEl.hidden) roomEl.dataset.room = v
}
document.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => setRoomStyle(b.dataset.room)))

// ── Prototype option: Ask box · Bottom | In the panel ───────────────────────
// In the panel: the lilac panel is the AI. The ask box moves to the bottom of the panel with the
// conversation above it and three suggestions; the desk on the right is what the AI is doing. A room
// opens beside the panel, not over it, and everything said lands in the panel's thread.
let askbox = store.get('desk-askbox') ?? 'bottom'
const ASKBOX_HINTS = { bottom: 'The ask bar sits under the desk.', panel: 'The panel is the AI: the box lives at its foot, the conversation above it, and rooms open beside it.' }
const thread = []
function pushThread(e) {
  thread.push(e)
  renderThread()
  const n = $('#railN')
  if (n) n.textContent = `${thread.length} in the thread`
}
function renderThread() {
  const el = $('#pthread')
  if (!el) return
  el.innerHTML = thread.slice(-14).map((e) => (e.who === 'me' ? `<div class="pm">${esc(e.text)}</div>` : `<div class="pa"><span class="creature small"><i></i><i></i><i></i></span><span>${esc(e.text)}</span></div>`)).join('')
  el.scrollTop = el.scrollHeight
}
function renderSuggest() {
  const el = $('#psug')
  if (!el) return
  const hot = CARDED.filter((it) => heat[it.id] === 'hot' && it.can?.length).slice(0, 2)
  el.innerHTML = hot.map((it) => `<button type="button" class="pchip" data-sug="${it.id}">${it.can[0].label}</button>`).join('') + `<button type="button" class="pchip" data-sug-make="Website"><i class="ti ti-world"></i> Build Glow’s booking page</button>`
  el.querySelectorAll('[data-sug]').forEach((b) => (b.onclick = () => { const it = ALL.find((i) => i.id === b.dataset.sug); openRoom([it], cards[it.id]?.offsetParent ? cards[it.id] : b, { direct: 0 }) }))
  el.querySelectorAll('[data-sug-make]').forEach((b) => (b.onclick = () => openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: b.dataset.sugMake })))
}
function setAskbox(v) {
  askbox = v
  store.set('desk-askbox', v)
  document.body.dataset.askbox = v
  document.querySelectorAll('[data-askbox]').forEach((b) => b.setAttribute('aria-selected', b.dataset.askbox === v))
  $('#pbHint6').textContent = ASKBOX_HINTS[v]
  $('#pchat').hidden = v !== 'panel'
  if (v === 'panel') { renderSuggest(); renderThread() }
}
document.querySelectorAll('[data-askbox]').forEach((b) => (b.onclick = () => setAskbox(b.dataset.askbox)))
if ($('#pform')) $('#pform').onsubmit = (e) => {
  e.preventDefault()
  const v = $('#pask').value.trim()
  $('#pask').value = ''
  if (!v) return
  if (room) heard(v)
  else ask(v)
}
if ($('#rail')) $('#rail').onclick = () => closeRoom()
if ($('#pmic')) $('#pmic').onclick = () => listen($('#pmic'), (t) => (room ? heard(t) : ask(t)))
queueMicrotask(() => setAskbox(askbox === 'panel' ? 'panel' : 'bottom'))

// ── Prototype option: Front page · Columns | One column | Spotlight ──────────
// One column: the AI says what's first; the needs-you cards are the only cards; everything that's
// running is a sentence with the numbers inline. Spotlight: the same, one card at a time, Next →.
let front = store.get('desk-front') ?? 'cols'
const FRONT_HINTS = { cols: 'Three columns: needs you, running for you, worth a look.', column: 'One column in the AI’s voice. Only what needs you is a card; the rest is a sentence you can ask about.', spot: 'The AI walks you through one thing at a time: the current card big, the next ones waiting, the rest a strip.' }
const frontEl = $('#front')
let spotAt = 0
const lower = (t) => (/^[A-Z][a-z]+ [a-z]/.test(t) && !/^(Jen|Dr|Dana|Mark|Harbor|Peak|Lumen|Glow|Agency|AI|MRR)\b/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t)
const andList = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] ?? '')
const hotItems = () => CARDED.filter((it) => it.heat === 'hot' && (!it.only || deskMode === 'one'))
const warmItems = () => CARDED.filter((it) => it.heat === 'warm' && (!it.only || deskMode === 'one'))
const coolItems = () => CARDED.filter((it) => it.heat === 'cool' && it.id !== 'make' && (!it.only || deskMode === 'one'))
/** The running sentence: one clause per thing that's fine, each a link into its room. */
const clause = (it) => `<button type="button" class="ln" data-open="${it.id}">${it.label} <b>${it.value}${it.unit ? ` ${it.unit}` : ''}</b>, ${lower(it.sub)}</button>`
function renderFront() {
  const hot = hotItems()
  const warm = warmItems()
  const cool = coolItems()
  const n = hot.length
  const words = ['', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'][n] ?? `${n} things`
  const doneN = hot.filter((it) => heat[it.id] === 'done').length
  const lead = doneN === n ? `<b>All ${n} done.</b> Nice morning. Everything else is running.` : `<b>${words} first.</b> ${andList(hot.filter((it) => heat[it.id] !== 'done').map((it) => lower(it.problem)))}.`
  frontEl.innerHTML = `<p class="lead" id="flead">${lead}</p>
    ${front === 'spot' ? `<div class="spot-nav"><span class="mono" id="fcount"></span><span class="spot-btns"><button type="button" class="chip" id="fprev"><i class="ti ti-arrow-left"></i> Back</button><button type="button" class="chip" id="fnext">Next <i class="ti ti-arrow-right"></i></button></span></div>` : ''}
    <div class="front-cards" id="fcards"></div>
    ${front === 'spot' ? `<div class="next-list" id="fnextlist"></div>` : ''}
    <p class="run"><b>Worth a look.</b> ${warm.map((it) => `<button type="button" class="ln" data-open="${it.id}">${heat[it.id] === 'done' ? '✓ ' : ''}${lower(it.problem)}</button>`).join(' · ')}</p>
    <p class="run"><b>Everything else is running.</b> ${cool.map(clause).join(' ')} <button type="button" class="ln ask" data-ask>Ask about any of it.</button></p>
    <p class="run make"><b>Want to make something?</b> ${['Website', 'Funnel', 'Campaign', 'Agent'].map((m) => `<button type="button" class="ln" data-make="${m}">${lower(m)}</button>`).join(' · ')}</p>`
  frontEl.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openRoom([ALL.find((i) => i.id === b.dataset.open)], b)))
  frontEl.querySelectorAll('[data-make]').forEach((b) => (b.onclick = () => openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: b.dataset.make })))
  frontEl.querySelector('[data-ask]').onclick = () => $('#ask').focus()
  const box = $('#fcards')
  hot.forEach((it) => box.appendChild(cards[it.id]))
  if (front === 'spot') {
    $('#fprev').onclick = () => spotTo(spotAt - 1)
    $('#fnext').onclick = () => spotTo(spotAt + 1)
    spotTo(spotAt)
  } else hot.forEach((it) => cards[it.id].classList.remove('spot'))
}
/** Spotlight: one hot card big; the others wait as small rows below it. */
function spotTo(k) {
  const hot = hotItems()
  spotAt = ((k % hot.length) + hot.length) % hot.length
  hot.forEach((it, i) => cards[it.id].classList.toggle('spot', i === spotAt))
  $('#fcount').textContent = `${spotAt + 1} of ${hot.length}`
  $('#fnextlist').innerHTML = hot.map((it, i) => (i === spotAt ? '' : `<button type="button" class="nx" data-i="${i}"><i class="${heat[it.id] === 'done' ? 'ti ti-check good' : 'dot'}"></i>${it.problem}</button>`)).join('')
  $('#fnextlist').querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => spotTo(+b.dataset.i)))
}
/** Put the cards where the front page wants them: in the column, or back in their columns. */
function placeFront() {
  const on = front !== 'cols' && layout === 'stage'
  if (on) desk.dataset.front = front
  else desk.removeAttribute('data-front')
  frontEl.hidden = !on
  if (on) renderFront()
  else
    CARDED.forEach((it) => {
      cards[it.id].classList.remove('spot')
      const sec = it.id === 'make' ? 'cool' : it.heat
      const home = desk.querySelector(`.col[data-sec='${sec}'] .cards`)
      if (cards[it.id].parentElement !== home) home.appendChild(cards[it.id])
    })
  placeV2()
}
function setFront(v) {
  front = v
  store.set('desk-front', v)
  document.querySelectorAll('[data-front]').forEach((b) => b.setAttribute('aria-selected', b.dataset.front === v))
  $('#pbHint4').textContent = FRONT_HINTS[v]
  placeFront()
}
document.querySelectorAll('[data-front]').forEach((b) => (b.onclick = () => setFront(b.dataset.front)))


// ── Prototype option: Look · Modern | Scribbles ──────────────────────────────
// Scribbles: Rich's v1 board. Paper, handwriting, sticky notes and polaroids, blue ink notes, red string.
const LOOKS = ['modern', 'scribbles', 'editorial', 'frost']
let look = LOOKS.includes(store.get('desk-look')) ? store.get('desk-look') : 'modern'
const LOOK_HINTS = { modern: 'Tonal cards, Inter, one accent.', scribbles: 'Rich’s v1 board: paper and ink. Sticky notes, index cards, a polaroid, a receipt; notes in blue handwriting. Light and dark.', editorial: 'Rich’s v2 Modern board: near-black, serif numerals, mono eyebrows, blue arrow actions, thin rims. Light and dark.', frost: 'The team’s V1 prototype: cloud background, frosted glass cards, corner glows, Inter, brand blue.' }
// Scribble under Editorial: the board's own placement (left %, top %, width px; top-left anchored).
const BOARD = {
  ads: [4, 33, 270], lead: [25, 31.5, 250], voicemail: [11, 61, 290], mrr: [46, 19, 300], agents: [70, 13, 220], spend: [86, 25, 180],
  bookings: [69, 41, 230], social: [48, 48, 220], reviews: [86, 52, 180], revenue: [4, 88, 270], calls: [25, 86, 250], invoices: [46, 100, 220],
  make: [69, 72, 220], callers: [4, 114, 270], idea: [86, 80, 180],
}
function placeBoard() {
  const dr = desk.getBoundingClientRect()
  // Board widths made the cards too big to all fit under the greeting; the common 240px width reads better.
  CARDED.forEach((it) => cards[it.id].style.removeProperty('--ew'))
  setTimeout(() => scatter(), 50)
}
function setLook(v) {
  look = v
  store.set('desk-look', v)
  document.querySelectorAll('#pbox [data-look]').forEach((b) => b.setAttribute('aria-selected', b.dataset.look === v))
  $('#pbHint5').textContent = LOOK_HINTS[v]
  root.dataset.look = v
  if (v === 'editorial' && layout === 'scribble') placeBoard()
  else if (layout === 'scribble') { CARDED.forEach((it) => cards[it.id].style.removeProperty('--ew')); setTimeout(() => scatter(), 50) }
  if (v === 'editorial' && !$('#edfonts')) {
    const l = document.createElement('link')
    l.id = 'edfonts'
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter+Tight:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(l)
  }
  if (v === 'scribbles' && !$('#scribfonts')) {
    const l = document.createElement('link')
    l.id = 'scribfonts'
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@300;400;500;600&display=swap'
    document.head.appendChild(l)
  }
  stitchTheme()
}
document.querySelectorAll('#pbox [data-look]').forEach((b) => (b.onclick = () => setLook(b.dataset.look)))
const tone = (t) => (t === 'hot' ? 'hot' : t === 'warm' ? 'warm' : t === 'good' ? 'good' : '')
/** What the AI is working from: numbers and rows, in their "before" state. */
/** V2 results: one row per account. Falls back to the live rows when an item has no sentences written. */
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
let lastBuild = null
function resultOf(it) {
  if (it.id === 'make' && RESULT.make) {
    const brand = lastBuild ? lastBuild.title.split(' · ')[0] : null
    const fill = (s) => (brand ? s.replaceAll('{brand}', brand) : s.replaceAll('{brand}’s', 'the brand’s').replaceAll('{brand}', 'the brand'))
    return { ...RESULT.make, rows: RESULT.make.rows.map((r) => ({ ...r, bad: fill(r.bad), before: fill(r.before), after: fill(r.after) })) }
  }
  if (RESULT[it.id]) return RESULT[it.id]
  const L = LIVE[it.id]
  return {
    head: [it.problem ?? it.label, L.expect],
    sub: ['', ''],
    rows: L.rows.map(([n, b, a]) => ({ name: n, bad: cap(b), tone: it.problem ? 'bad' : 'neutral', before: '', after: '', state: /✓/.test(a) ? 'ok' : 'wait', label: cap(a.replace(/\s*✓\s*/, '')) })),
  }
}
function resultHtml(it) {
  const R = resultOf(it)
  return `<div class="rs2" data-id="${it.id}"><div class="rs2-head"><b class="rs2-h">${R.head[0]}</b>${R.sub[0] ? `<span class="rs2-s">${R.sub[0]}</span>` : ''}</div>
    ${R.rows.map((r, i) => `<div class="rs2-row" data-i="${i}"><div class="rs2-t"><b>${r.name}</b>${r.before ? `<span class="rs2-w">${r.before}</span>` : ''}</div><span class="rs2-p ${r.tone ?? 'bad'}">${r.bad}</span></div>`).join('')}</div>`
}
const PILL = { ok: '<i class="ti ti-check"></i>', you: '<i class="ti ti-hand-finger"></i>', wait: '<i class="ti ti-clock"></i>' }
/** Rows switch from what was wrong to what I did; the one being worked on shows Working… */
function resultFlip(it, n, working = false) {
  const box = document.querySelector(`.rs2[data-id="${it.id}"]`)
  if (!box) return
  const R = resultOf(it)
  R.rows.forEach((r, i) => {
    const row = box.querySelector(`.rs2-row[data-i="${i}"]`)
    if (!row) return
    const p = row.querySelector('.rs2-p')
    if (i < n && row.dataset.state !== r.state) {
      row.dataset.state = r.state
      const w = row.querySelector('.rs2-w')
      if (r.after) { if (w) w.textContent = r.after; else row.querySelector('.rs2-t').insertAdjacentHTML('beforeend', `<span class="rs2-w">${r.after}</span>`) }
      p.className = `rs2-p ${r.state}`
      p.innerHTML = `${PILL[r.state]}${r.label}`
      if (r.acts) {
        row.insertAdjacentHTML('beforeend', `<div class="rs2-acts">${r.acts.map((a, k) => `<button type="button" class="chip${k ? '' : ' main'}" data-ra="${k}">${a.label}</button>`).join('')}</div>`)
        row.querySelectorAll('[data-ra]').forEach((b) => (b.onclick = () => {
          const a = r.acts[+b.dataset.ra]
          if (a.open) { autoRun = false; return openRoom([ALL.find((x) => x.id === a.open)], b, {}) }
          if (a.toast) toast(a.toast)
          if (a.resolve) {
            row.dataset.state = 'ok'; p.className = 'rs2-p ok'; p.innerHTML = `${PILL.ok}${a.resolve}`; row.querySelector('.rs2-acts')?.remove()
            if (a.head) box.querySelector('.rs2-h').textContent = a.head
            const s = box.querySelector('.rs2-s')
            if (s) { if (a.sub) s.textContent = a.sub; else s.remove() }
          }
        }))
      }
    } else if (i === n && working && !row.dataset.state) {
      p.className = 'rs2-p now'
      p.innerHTML = '<i class="ti ti-loader-2"></i>Working…'
    }
  })
  if (n >= R.rows.length) {
    box.dataset.done = 'on'
    box.querySelector('.rs2-h').textContent = R.head[1]
    const s = box.querySelector('.rs2-s')
    if (R.sub[1]) { if (s) s.textContent = R.sub[1]; else box.querySelector('.rs2-head').insertAdjacentHTML('beforeend', `<span class="rs2-s">${R.sub[1]}</span>`) }
  }
}
function liveHtml(it) {
  const L = LIVE[it.id]
  if (!L) return ''
  if (V2()) return resultHtml(it)
  return `<div class="lv-cap">What I’m working from <em>· live</em></div>
    <div class="lv-stats">${L.stats.map(([l, b, a, t], i) => `<div class="lv-stat" data-i="${i}"><small>${l}</small><b class="${tone(t)}">${b}</b></div>`).join('')}</div>
    <div class="lv-rows">${L.rows.map(([n, b, a], i) => `<div class="lv-row" data-i="${i}"><span>${n}</span><span class="st">${b}</span></div>`).join('')}</div>
    <div class="lv-expect"><i class="ti ti-chart-line"></i>${L.expect}</div>`
}
/** The fix has run: numbers and rows flip to their "after" state. */
function liveAfter(it) {
  const L = LIVE[it.id]
  const box = $('#rlive')
  if (!L || !box) return
  if (V2()) return resultFlip(it, resultOf(it).rows.length)
  L.stats.forEach(([l, b, a, t], i) => {
    const el = box.querySelector(`.lv-stat[data-i="${i}"] b`)
    if (el && a !== b) {
      el.textContent = a
      el.className = tone(t === 'hot' ? 'good' : t)
      el.classList.add('flip')
    }
  })
  L.rows.forEach(([n, b, a], i) => {
    const el = box.querySelector(`.lv-row[data-i="${i}"] .st`)
    if (el && a !== b) {
      el.textContent = a
      el.classList.add('done')
    }
  })
}
/** A fix ticking off while it's spoken. */
function startSteps(c) {
  const steps = STEPS[c.id]
  const box = $('#rdoing')
  if (!steps || !box) return null
  box.hidden = false
  box.innerHTML = `<div class="lv-cap">Doing it now <em id="rdcount">· 0 of ${steps.length}</em></div>${steps.map(([l, d], i) => `<div class="step" data-i="${i}"><i class="ti ti-circle"></i><span>${l}${d ? `<em>· ${d}</em>` : ''}</span></div>`).join('')}`
  const rows = box.querySelectorAll('.step')
  let at = -1
  const to = (k) => {
    k = Math.min(steps.length, k)
    if (k === at) return
    at = k
    rows.forEach((r, i) => {
      r.dataset.state = i < k ? 'done' : i === k ? 'now' : ''
      r.querySelector('i').className = `ti ${i < k ? 'ti-check' : i === k ? 'ti-loader' : 'ti-circle'}`
    })
    $('#rdcount').textContent = `· ${Math.min(k, steps.length)} of ${steps.length}`
    // Rows flip as the steps reach them.
    const L = LIVE[c.item.id]
    if (L && V2()) {
      const R = resultOf(c.item)
      const n = Math.floor((k / steps.length) * R.rows.length)
      resultFlip(c.item, n, k < steps.length)
    } else if (L) {
      const n = Math.round((k / steps.length) * L.rows.length)
      L.rows.slice(0, n).forEach(([, b, a], i) => {
        const el = $('#rlive')?.querySelector(`.lv-row[data-i="${i}"] .st`)
        if (el && a !== b && !el.classList.contains('done')) {
          el.textContent = a
          el.classList.add('done')
        }
      })
    }
  }
  to(0)
  return { to, finish: () => to(steps.length) }
}

const h1 = $('#hi')
h1.innerHTML = 'Good morning, Maya.'
  .split(' ')
  .map((w, i) => `<span class="w" style="animation-delay:${0.9 + i * 0.1}s">${w}</span>`)
  .join(' ')

// The panel: a stitched field of light. Get started ripples the cloth and opens the first decision.
const stitch = createStitch($('#stitch'))
function stitchTheme() {
  stitch?.theme(root.dataset.theme)
  const dark = root.dataset.theme === 'dark'
  $('#theme').innerHTML = `<i class="ti ${dark ? 'ti-moon' : 'ti-sun'}"></i>`
  $('#theme').setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark')
}
stitchTheme()
window.__desk = { stitch }
$('#go').onclick = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  stitch?.rippleAt(r.left + r.width / 2, r.top + r.height / 2, 1)
  const first = front === 'spot' && desk.hasAttribute('data-front') ? hotItems()[spotAt] : ITEMS.find((it) => heat[it.id] === 'hot') ?? ITEMS[0]
  setTimeout(() => openRoom([first], cards[first.id].offsetParent ? cards[first.id] : null), 350)
}

// ── Layouts: Stage ↔ Scribble, with the cards flying between the two ───────
function setLayout(next, animate = true) {
  const before = Object.fromEntries(Object.entries(cards).map(([id, c]) => [id, c.getBoundingClientRect()]))
  layout = next
  if (!new URLSearchParams(location.search).has('phone')) store.set('desk-layout', next)
  $('#team').hidden = deskMode !== 'one' || next !== 'stage'
  desk.dataset.layout = next
  document.body.dataset.layout = next
  $('#lay-stage').setAttribute('aria-selected', next === 'stage')
  $('#lay-scribble').setAttribute('aria-selected', next === 'scribble')
  $('#tidy').hidden = next !== 'scribble'
  cards.make.style.display = next === 'scribble' ? 'flex' : ''
  placeFront()
  if (next === 'scribble' && look === 'editorial') placeBoard()
  else if (next === 'scribble') scatter()
  if (next === 'scribble') setTimeout(() => layout === 'scribble' && (look === 'editorial' ? relax() : scatter()), 900)
  if (next !== 'scribble') desk.style.setProperty('--ss', '1')
  for (const [id, c] of Object.entries(cards)) {
    const it = ALL.find((x) => x.id === id)
    c.classList.add('flip')
    c.style.transition = 'none'
    c.style.transform = ''
    const after = c.getBoundingClientRect()
    const b = before[id]
    if (!animate || !b.width || !after.width) {
      c.style.transform = next === 'scribble' ? `rotate(${it.tilt * 0.45}deg)` : ''
      c.style.transition = ''
      continue
    }
    const dx = b.left + b.width / 2 - (after.left + after.width / 2)
    const dy = b.top + b.height / 2 - (after.top + after.height / 2)
    const sx = b.width / after.width
    c.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}) rotate(${next === 'scribble' ? 0 : it.tilt * 0.45}deg)`
    void c.offsetWidth
    c.style.transition = `transform 0.7s var(--spring) ${(Object.keys(cards).indexOf(id) * 25) / 1000}s`
    c.style.transform = next === 'scribble' ? `rotate(${it.tilt * 0.45}deg)` : ''
  }
  setTimeout(drawThreads, animate ? 800 : 50)
}
const phoneWide = () => matchMedia('(max-width: 760px)').matches
if (phoneWide() && layout === 'scribble') layout = 'stage'
matchMedia('(max-width: 760px)').addEventListener('change', (e) => { if (e.matches && layout === 'scribble') setLayout('stage', false) })
$('#lay-stage').onclick = () => { setPhone(false); setLayout('stage') }
$('#lay-scribble').onclick = () => { setPhone(false); setLayout('scribble') }
$('#tidy').onclick = () => {
  // Tidy: spread the cards over the desk again (the board placement under Editorial).
  if (look === 'editorial') placeBoard()
  else scatter()
}
ALL.forEach((it) => (it.home = [...it.pos]))

/** Keep a Scribble card fully on the desk (and clear of the controls at the top). */
/** Space kept clear at the top of a Scribble desk (the Frost look puts the welcome there). */
const topPad = () => parseFloat(getComputedStyle(desk).getPropertyValue('--desk-top')) || 48
function clampCard(it, c) {
  const dr = desk.getBoundingClientRect()
  const w = c.offsetWidth
  const h = c.offsetHeight
  if (!w || !dr.width) return
  const pad = 14
  const minX = ((w / 2 + pad) / dr.width) * 100
  const maxX = ((dr.width - w / 2 - pad) / dr.width) * 100
  const minY = ((h / 2 + topPad() + 8) / dr.height) * 100
  // Only the top is bounded: the desk scrolls, so a card may sit below the fold.
  it.pos = [Math.min(maxX, Math.max(minX, it.pos[0])), Math.max(minY, it.pos[1])]
  c.style.setProperty('--x', `${it.pos[0]}%`)
  c.style.setProperty('--y', `${it.pos[1]}%`)
}
function clampAll() {
  if (layout !== 'scribble') return
  CARDED.forEach((it) => clampCard(it, cards[it.id]))
}
/**
 * Spread the Scribble cards evenly: start from each card's spot, then nudge any two that sit too
 * close apart, a few times, keeping everything on the desk. Not a grid, just good air between things.
 */
/** Scribble cards shrink together when the desk is full, so everything stays in view. */
const scribScale = () => parseFloat(getComputedStyle(desk).getPropertyValue('--ss')) || 1
/**
 * Spread the Scribble cards over the visible desk: a loose grid with a little jitter and a tilt
 * per card, scaled down just enough that nothing needs scrolling. Negative space is used evenly.
 */
function scatter() {
  const dr = desk.getBoundingClientRect()
  if (!dr.width) return
  // Editorial keeps the greeting top-left like the board; cards fill the space around it.
  const avoid = look === 'editorial' ? { w: 640, h: 280 } : null
  const top = avoid ? 48 : topPad()
  const H = dr.height - top - 100
  const all = CARDED.filter((it) => cards[it.id].offsetParent)
  if (!all.length) return
  // What's finished stacks down the right edge, newest on top; the live cards keep the rest.
  const done = all.filter((it) => heat[it.id] === 'done')
  const vis = all.filter((it) => heat[it.id] !== 'done')
  const n = vis.length
  const pileW = done.length ? 250 : 0
  const W = dr.width - 28 - pileW
  desk.style.setProperty('--ss', '1')
  const gap = 30
  const cardW = Math.max(...all.map((it) => cards[it.id].offsetWidth))
  const hs = all.map((it) => cards[it.id].offsetHeight).sort((a, b) => b - a)
  const rowH = (hs[0] + hs[Math.floor(hs.length / 2)]) / 2
  // Shrink the cards together until a grid of whole cells (minus the ones under the greeting) holds them all.
  let s = 1
  let free = []
  for (; s >= 0.78 && n; s -= 0.02) {
    const cols = Math.max(1, Math.floor(W / (cardW * s + gap)))
    const rows = Math.max(1, Math.floor(H / (rowH * s + gap)))
    const cw = W / cols
    const ch = H / rows
    free = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = 14 + c * cw
        const y = top + r * ch
        if (avoid && x < avoid.w && y < avoid.h) continue
        free.push([x + cw / 2, y + ch / 2, cw, ch])
      }
    if (free.length >= n) break
  }
  s = Math.max(0.78, s)
  desk.style.setProperty('--ss', s.toFixed(3))
  const place = (it, x, y) => {
    it.pos = [(x / dr.width) * 100, (y / dr.height) * 100]
    cards[it.id].style.setProperty('--x', `${it.pos[0]}%`)
    cards[it.id].style.setProperty('--y', `${it.pos[1]}%`)
  }
  // Cells run column by column from the left, so what needs you lands leftmost, where the eye starts;
  // then warm, then cool. A fixed jitter per card keeps the scatter stable.
  free.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const rank = { hot: 0, warm: 1, cool: 2 }
  const order = [...vis].sort((a, b) => rank[a.heat] - rank[b.heat])
  order.forEach((it, i) => {
    const cell = free[i % Math.max(1, free.length)] ?? [W / 2, top + H / 2, W, H]
    const jx = (((i * 7919) % 100) / 100 - 0.5) * cell[2] * 0.2
    const jy = (((i * 104729) % 100) / 100 - 0.5) * cell[3] * 0.2
    place(it, cell[0] + jx, cell[1] + jy)
  })
  // The done pile: a tidy column on the right, most recent on top.
  let y = top + 20
  done
    .slice()
    .reverse()
    .forEach((it) => {
      const h = cards[it.id].offsetHeight * s
      place(it, dr.width - 14 - pileW / 2, y + h / 2)
      y += h + 18
    })
  relax(120)
  drawThreads()
  setTimeout(drawThreads, 1000)
}
function relax(iterations = 160) {
  const dr = desk.getBoundingClientRect()
  if (!dr.width) return
  const gap = 30
  const boxes = CARDED.filter((it) => cards[it.id].offsetParent).map((it) => {
    const c = cards[it.id]
    // Tilted cards take a little more room than their box.
    const t = (Math.abs(it.tilt) * 0.45 * Math.PI) / 180
    const sc = scribScale()
    const w = (c.offsetWidth * Math.cos(t) + c.offsetHeight * Math.sin(t)) * sc
    const h = (c.offsetHeight * Math.cos(t) + c.offsetWidth * Math.sin(t)) * sc
    return { it, c, w, h, x: (it.pos[0] / 100) * dr.width, y: (it.pos[1] / 100) * dr.height }
  })
  for (let n = 0; n < iterations; n++) {
    // Clamp first, separate second: the last thing done in a pass is pushing cards apart, so a
    // card pinned to the edge never ends up sitting on its neighbour.
    // No bottom bound: a full desk grows downward and scrolls, rather than stacking cards.
    for (const o of boxes) {
      o.x = Math.min(dr.width - o.w / 2 - 14, Math.max(o.w / 2 + 14, o.x))
      o.y = Math.max(o.h / 2 + topPad(), o.y)
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const px = (a.w + b.w) / 2 + gap - Math.abs(dx)
        const py = (a.h + b.h) / 2 + gap - Math.abs(dy)
        if (px <= 0 || py <= 0) continue
        // Move apart along the axis that needs less movement.
        if (px < py) {
          const m = (px / 2) * Math.sign(dx || 1)
          a.x -= m
          b.x += m
        } else {
          const m = (py / 2) * Math.sign(dy || 1)
          a.y -= m
          b.y += m
        }
      }
  }
  for (const o of boxes) {
    o.x = Math.min(dr.width - o.w / 2 - 14, Math.max(o.w / 2 + 14, o.x))
    o.y = Math.max(o.h / 2 + topPad(), o.y)
  }
  // Let the desk scroll far enough that the lowest card clears the ask bar.
  desk.style.setProperty('--reach', `${Math.max(...boxes.map((o) => o.y + o.h / 2), 0) + 96}px`)
  for (const o of boxes) {
    o.it.pos = [(o.x / dr.width) * 100, (o.y / dr.height) * 100]
    o.c.style.setProperty('--x', `${o.it.pos[0]}%`)
    o.c.style.setProperty('--y', `${o.it.pos[1]}%`)
  }
}
addEventListener('resize', () => layout === 'scribble' && (look === 'editorial' ? relax(20) : scatter()))
// Card sizes settle once the fonts are in; spread them again then.
document.fonts?.ready.then(() => layout === 'scribble' && (look === 'editorial' ? relax() : scatter()))
setTimeout(() => layout === 'scribble' && (look === 'editorial' ? relax() : scatter()), 700)

function drawThreads() {
  const svg = $('#threads')
  if (layout !== 'scribble') return (svg.innerHTML = '')
  const dr = desk.getBoundingClientRect()
  svg.innerHTML = THREADS.map(([a, b, label], i) => {
    const ra = cards[a].getBoundingClientRect()
    const rb = cards[b].getBoundingClientRect()
    const A = [ra.left + ra.width / 2 - dr.left, ra.top + ra.height / 2 - dr.top]
    const B = [rb.left + rb.width / 2 - dr.left, rb.top + rb.height / 2 - dr.top]
    const M = [(A[0] + B[0]) / 2 - 20, (A[1] + B[1]) / 2 + 24]
    return `<path class="draw" d="${inkPath([A, M, B], 2, 40 + i)}"/><text x="${M[0] - 26}" y="${M[1] + 22}" transform="rotate(-6 ${M[0]} ${M[1]})">${label}</text>`
  }).join('')
  primeDraw(svg, 0.1)
}

// Drag cards around in Scribble.
let press = null
desk.addEventListener('pointerdown', (e) => {
  const c = e.target.closest?.('.card')
  if (!c || layout !== 'scribble' || e.button !== 0) return
  const r = c.getBoundingClientRect()
  press = { c, x: e.clientX, y: e.clientY, ox: e.clientX - (r.left + r.width / 2), oy: e.clientY - (r.top + r.height / 2), drag: false }
  delete c.dataset.dragged
})
addEventListener('pointermove', (e) => {
  if (!press) return
  if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
    press.drag = true
    press.c.classList.add('dragging')
    press.c.dataset.dragged = '1'
  }
  if (!press.drag) return
  const dr = desk.getBoundingClientRect()
  const it = ALL.find((x) => x.id === press.c.dataset.id)
  it.pos = [((e.clientX - press.ox - dr.left) / dr.width) * 100, ((e.clientY - press.oy - dr.top + desk.scrollTop) / dr.height) * 100]
  clampCard(it, press.c)
  drawThreads()
  $('#threads').querySelectorAll('.draw').forEach((p) => (p.style.animation = 'none'))
})
addEventListener('pointerup', () => {
  if (!press) return
  const p = press
  press = null
  p.c.classList.remove('dragging')
  // Let the click handler see "dragged" for this click only.
  setTimeout(() => delete p.c.dataset.dragged, 0)
})
addEventListener('resize', () => drawThreads())

// ── Voice ───────────────────────────────────────────────────────────────────
let DUR = {}
fetch('audio/durations.json?v=20261108a')
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => (DUR = d))
  .catch(() => {})
let voice = null
let actx = null
let muted = store.get('desk-muted') === '1'
function stopVoice() {
  voice?.stop()
  voice = null
  window.speechSynthesis?.cancel()
}
function setMuted(m) {
  muted = m
  store.set('desk-muted', m ? '1' : '0')
  voice?.mute?.(m)
  document.querySelectorAll('[data-mute]').forEach((b) => {
    b.innerHTML = `<i class="ti ${m ? 'ti-volume-off' : 'ti-volume'}"></i>`
    b.setAttribute('aria-label', m ? 'Unmute' : 'Mute')
    b.classList.toggle('on', m)
  })
}
function togglePause() {
  if (!voice?.pause) return
  const p = !voice.paused
  if (p) voice.pause()
  else voice.resume()
  document.querySelectorAll('[data-pause]').forEach((b) => {
    b.innerHTML = `<i class="ti ${p ? 'ti-player-play' : 'ti-player-pause'}"></i>`
    b.setAttribute('aria-label', p ? 'Resume' : 'Pause')
    b.classList.toggle('on', p)
  })
  document.querySelectorAll('[data-steer="Pause"]').forEach((b) => (b.textContent = p ? 'Resume' : 'Pause'))
  const st = $('#rstatus')
  if (st) {
    st.textContent = p ? 'Paused' : 'Speaking'
    st.dataset.on = p ? 'paused' : 'speaking'
  }
  const bs = $('#rbstate')
  if (bs) bs.textContent = p ? 'Paused' : 'Speaking'
}
/** Sound waits for the first tap or key on the page (browser rule). Queue what was blocked and show a cue. */
let soundQueue = []
function whenSoundAllowed(fn) {
  soundQueue.push(fn)
  if (soundQueue.length > 1) return
  if (!$('#soundcue')) document.body.insertAdjacentHTML('beforeend', '<button type="button" class="soundcue" id="soundcue"><i class="ti ti-volume"></i> Tap to hear your briefing</button>')
  const go = () => {
    removeEventListener('pointerdown', go, true)
    removeEventListener('keydown', go, true)
    $('#soundcue')?.remove()
    try { actx?.resume?.() } catch {}
    const q = soundQueue
    soundQueue = []
    q.forEach((f) => f())
  }
  addEventListener('pointerdown', go, true)
  addEventListener('keydown', go, true)
}
/** Plays a clip, reveals words in time, and reports loudness for the creature. */
function speak(line, { onWord, onAmp, onEnd } = {}, src) {
  stopVoice()
  const words = line.t.split(' ')
  const ms = DUR[line.id] ?? line.ms ?? words.length * 330
  const audio = new Audio(src ?? `audio/${line.id}.m4a`)
  let analyser = null
  src = null
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)()
    actx.resume?.()
    src = actx.createMediaElementSource(audio)
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
  let paused = false
  let pausedAt = 0
  audio.muted = muted
  const ok = () => {
    audible = true
    start = performance.now()
    dispatchEvent(new Event('deskvoice'))
  }
  audio.play().then(ok, (e) => {
    // The browser blocks sound until the first tap or key on the page. Hold the line instead of
    // running it silently, and play it from the top the moment the person does anything.
    if (stopped || e?.name !== 'NotAllowedError') return
    paused = true
    pausedAt = performance.now()
    onAmp?.(0)
    whenSoundAllowed(() => {
      if (stopped) return
      paused = false
      start = performance.now()
      onWord?.(0)
      audio.currentTime = 0
      audio.play().then(ok, () => {})
    })
  })
  const timer = setInterval(() => {
    if (paused) return
    const t = audible ? audio.currentTime * 1000 : performance.now() - start
    onWord?.(Math.min(words.length, Math.ceil((t / ms) * words.length)))
    let amp = 0
    // Speech-like motion for when there's nothing to measure (muted, or the audio graph is silent).
    const fake = () => Math.max(0.08, 0.34 + Math.sin(t / 90) * 0.22 + Math.sin(t / 37) * 0.12)
    if (analyser && audible && !audio.muted) {
      analyser.getByteTimeDomainData(buf)
      let s = 0
      for (const v of buf) s += ((v - 128) / 128) ** 2
      amp = Math.min(1, Math.sqrt(s / buf.length) * 5)
      if (amp < 0.01 && t > 400 && !audio.paused) amp = fake() * 0.7
    } else amp = fake()
    onAmp?.(amp)
    setPresenceAmp(amp)
    // End when the clip really ends (DUR is only a guide); without audio, fall back to the estimate.
    if ((audible && (audio.ended || t >= ms + 4000)) || (!audible && t >= ms + 120)) finish()
  }, 40)
  function finish() {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    try { src?.disconnect?.() } catch {}
    onWord?.(words.length)
    onAmp?.(0)
    if (voice === me) voice = null
    onEnd?.()
  }
  const me = {
    stop() {
      audio.pause()
      if (!stopped) {
        stopped = true
        clearInterval(timer)
        onAmp?.(0)
      }
    },
    pause() {
      if (stopped || paused) return
      paused = true
      pausedAt = performance.now()
      audio.pause()
      onAmp?.(0)
    },
    resume() {
      if (stopped || !paused) return
      paused = false
      start += performance.now() - pausedAt
      if (audible) audio.play().catch(() => {})
    },
    get paused() {
      return paused
    },
    mute(m) {
      audio.muted = m
    },
  }
  voice = me
  return voice
}
// V2 · one voice for everything: Kokoro (af_heart, the voice of the clips) running in the browser.
// Loads once (WebGPU where it exists, WASM otherwise) and is cached; until it's ready, the browser voice fills in.
let kokoro = null
let kokoroLoading = null
function loadKokoro() {
  if (kokoro || kokoroLoading || !V2() || PHONE()) return kokoroLoading
  kokoroLoading = import('https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm')
    .then(async (m) => {
      const load = (device) => m.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: device === 'webgpu' ? 'fp32' : 'q8', device })
      try { kokoro = await load(navigator.gpu ? 'webgpu' : 'wasm') } catch (e) { console.warn('Kokoro on WebGPU failed, trying WASM', e); kokoro = await load('wasm') }
      return kokoro
    })
    .catch((e) => { console.warn('Kokoro could not load; using the browser voice.', e); kokoroLoading = null; return null })
  return kokoroLoading
}
function speakDyn(text, go = {}) {
  if (V2() && !kokoro) loadKokoro()
  // V2 keeps one voice. On phones (no model download) or before the voice has loaded, a line without a
  // recorded clip is shown, not read in a second, robotic voice.
  // Muted means silent: show the words, never fall back to the browser voice.
  if (muted) return speakQuiet(text, go)
  if (V2() && !kokoro && !muted) {
    if (!PHONE() && kokoroLoading) {
      stopVoice()
      let cancelled = false
      const ph = { stop() { cancelled = true }, pause() {}, resume() {}, get paused() { return false }, mute() {} }
      voice = ph
      const give = setTimeout(() => { cancelled = true; if (voice === ph) speakQuiet(text, go) }, 6000)
      kokoroLoading.then((k) => { clearTimeout(give); if (!cancelled && voice === ph) (k ? speakDyn(text, go) : speakQuiet(text, go)) })
      return ph
    }
    return speakQuiet(text, go)
  }
  if (!V2() || !kokoro || muted) return speakBrowser(text, go)
  stopVoice()
  let cancelled = false
  go.onAmp?.(0.2)
  const ph = { _p: false, stop() { cancelled = true; go.onAmp?.(0) }, pause() { this._p = true }, resume() { this._p = false }, get paused() { return this._p }, mute() {} }
  voice = ph
  kokoro.generate(text, { voice: 'af_heart', speed: 1 })
    .then((a) => {
      if (cancelled) return
      const url = URL.createObjectURL(new Blob([a.toWav()], { type: 'audio/wav' }))
      const v = speak({ id: null, t: text, ms: (a.audio.length / a.sampling_rate) * 1000 }, go, url)
      if (ph._p) v.pause()
    })
    .catch(() => { if (!cancelled) speakBrowser(text, go) })
  return voice
}
/** Phones: true phone screens, the phone frame, or touch-first devices. */
function PHONE() { return inPhone || matchMedia('(max-width: 760px)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) }
/** A line with no clip in V2 when the voice isn't available: shown as words, no second voice. */
function speakQuiet(text, { onWord, onAmp, onEnd } = {}) {
  stopVoice()
  const words = text.split(' ')
  let stopped = false
  onWord?.(words.length)
  onAmp?.(0)
  const t = setTimeout(() => { if (!stopped) { stopped = true; if (voice === me) voice = null; onEnd?.() } }, Math.min(6000, 600 + words.length * 120))
  const me = { stop() { stopped = true; clearTimeout(t) }, pause() {}, resume() {}, get paused() { return false }, mute() {} }
  voice = me
  return me
}
/** A line with no recorded clip and no Kokoro yet: the browser's own voice, words revealed as it goes. */
function speakBrowser(text, { onWord, onAmp, onEnd } = {}) {
  stopVoice()
  const words = text.split(' ')
  const synth = window.speechSynthesis
  let n = 0
  let ended = false
  const finish = () => { if (ended) return; ended = true; clearInterval(tick); onWord?.(words.length); onAmp?.(0); if (voice === me) voice = null; onEnd?.() }
  const tick = setInterval(() => { if (!synth || muted) { onWord?.(++n); onAmp?.(0.3 + Math.random() * 0.4); if (n >= words.length) finish() } else onAmp?.(0.25 + Math.random() * 0.4) }, 260)
  let u = null
  if (synth && !muted) {
    synth.cancel()
    u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1
    const v = synth.getVoices().find((x) => /Samantha|Google US English|Karen|Daniel|en-US/.test(x.name + x.lang))
    if (v) u.voice = v
    let seen = 0
    u.onboundary = (e) => { if (e.name === 'word') onWord?.(Math.min(words.length, ++seen)) }
    u.onend = finish
    u.onerror = finish
    synth.speak(u)
    // Chrome sometimes never fires onend after a cancel: don't let that block the mic forever.
    setTimeout(finish, words.length * 450 + 2500)
  }
  const me = { stop() { if (ended) return; ended = true; clearInterval(tick); synth?.cancel(); onAmp?.(0) }, pause() { synth?.pause() }, resume() { synth?.resume() }, get paused() { return !!synth?.paused }, mute() {} }
  voice = me
  return voice
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let activeRec = null
let activeSend = null
const GRACE = 1600
/**
 * Listens until you've finished: words show live (onInterim), a pause starts a short grace period
 * (onGrace) and only ~1.6 s of silence ends the turn. then(text, alternatives) gets the whole sentence.
 * Tapping the same mic while it's listening sends what it has right away.
 */
function listen(btn, then, status, opts = {}) {
  if (!SR) return toast('Voice works in Chrome. You can type instead.')
  // A tap on a live mic sends what it heard; with nothing heard it turns the mic off.
  if (btn.classList.contains('live') && activeSend) {
    if (!activeSend()) { stopHandsFree(); setTimeout(() => opts.onTapOff?.(), 80) }
    return
  }
  stopVoice()
  // A tap takes over from the hands-free loop; the loop's own calls keep their token.
  if (!opts.hf) { if (typeof hf === 'number') clearTimeout(hf); hf = null }
  if (activeRec) activeRec.__killed = true
  try { activeRec?.abort() } catch {}
  const rec = new SR()
  activeRec = rec
  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 3
  btn.__icon ??= btn.innerHTML
  const icon = btn.__icon
  const resumed = btn.classList.contains('live')
  btn.classList.add('live')
  if (!resumed) btn.innerHTML = `${icon}<span class="bloom"></span>`
  status?.('listening')
  const stir = setInterval(() => {
    const a = 0.25 + Math.random() * 0.45
    $('#creature')?.style.setProperty('--amp', a.toFixed(2))
    stitch?.amp(a)
  }, 120)
  let finalText = ''
  let interim = ''
  let alts = []
  let sent = false
  let got = false
  let t1 = null
  let t2 = null
  const send = () => {
    if (sent) return
    sent = true
    clearTimeout(t1)
    clearTimeout(t2)
    const text = `${finalText} ${interim}`.replace(/\s+/g, ' ').trim()
    try { rec.stop() } catch {}
    if (text) {
      got = true
      opts.onFinal?.(text)
      then(text, alts)
    }
    return !!text
  }
  activeSend = send
  rec.onresult = (e) => {
    interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const tx = r[0].transcript.trim()
      // Noise: a word or two the recogniser itself doubts is not you talking.
      const noise = tx.length < 2 || (r.isFinal && r[0].confidence > 0 && r[0].confidence < 0.4 && tx.split(' ').length <= 2)
      if (noise) continue
      if (r.isFinal) {
        const before = finalText
        finalText = `${finalText} ${tx}`.trim()
        alts = [...r].slice(1).map((x) => `${before} ${x.transcript}`.trim())
      } else interim += r[0].transcript
    }
    if (!finalText && !interim.trim()) return
    opts.onInterim?.(finalText, interim.trim())
    clearTimeout(t1)
    clearTimeout(t2)
    opts.onGrace?.(false)
    t1 = setTimeout(() => opts.onGrace?.(true, GRACE - 400), 400)
    t2 = setTimeout(send, GRACE)
  }
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { opts.onDenied?.(); toast('I need microphone access to listen. Allow it in your browser, then tap the mic again.') }
  }
  const stop = () => {
    const mine = activeRec === rec
    if (mine) activeRec = null
    if (activeSend === send) activeSend = null
    clearTimeout(t1)
    clearTimeout(t2)
    clearInterval(stir)
    $('#creature')?.style.setProperty('--amp', '0')
    stitch?.amp(0)
    // Hands-free and nothing heard: Chrome just timed out. The loop restarts at once, so keep the UI as is.
    const keep = opts.hf && !got && opts.willRestart?.()
    if (!keep) {
      btn.classList.remove('live')
      btn.innerHTML = icon
      delete btn.__icon
      // Only the listener that owned the UI resets it; one that was cut off (the AI started talking) leaves it alone.
      if (mine && !rec.__killed) status?.('')
    }
    opts.onEnd?.(got)
  }
  rec.onend = () => {
    // A listener cut off on purpose never sends its half-sentence.
    if (!sent && !rec.__killed && `${finalText}${interim}`.trim()) send()
    stop()
  }
  try {
    rec.start()
  } catch {
    stop()
  }
}

// ── Scribbling on the desk, and circle to ask ────────────────────────────────
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
addEventListener('resize', fitCanvas)
const strokes = []
let current = null
const inkColor = () => getComputedStyle(root).getPropertyValue('--ink').trim()
function paint() {
  const now = performance.now()
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  ctx.clearRect(0, 0, innerWidth, innerHeight)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = inkColor()
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    const age = s.drawing ? 0 : now - s.born
    if (age > 3000) {
      strokes.splice(i, 1)
      continue
    }
    ctx.globalAlpha = Math.max(0, 1 - age / 3000) * 0.9
    ctx.lineWidth = 2.2
    ctx.beginPath()
    s.pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  requestAnimationFrame(paint)
}
requestAnimationFrame(paint)
addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || document.body.classList.contains('room-open')) return
  if (e.target.closest?.('.card, .top, .bar, .lasso, .toast, .tidy, .chip')) return
  current = { pts: [[e.clientX, e.clientY]], born: 0, drawing: true }
  strokes.push(current)
  closeLasso()
})
addEventListener('pointermove', (e) => {
  if (!current) return
  const last = current.pts.at(-1)
  if (Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 2) current.pts.push([e.clientX, e.clientY])
})
addEventListener('pointerup', () => {
  if (!current) return
  const s = current
  current = null
  s.drawing = false
  s.born = performance.now()
  checkLasso(s)
})
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
  const picked = CARDED.filter((it) => {
    const c = cards[it.id]
    if (!c.offsetParent) return false
    const r = c.getBoundingClientRect()
    return inside([r.left + r.width / 2, r.top + r.height / 2], p)
  })
  if (!picked.length) {
    if (!hinted) toast('Nice loop. Draw it around cards and I’ll talk about them together.')
    hinted = true
    return
  }
  if (picked.length === 1) return openRoom(picked, cards[picked[0].id])
  const pair = picked.length === 2 && picked.some((i) => i.id === 'ads') && picked.some((i) => i.id === 'revenue')
  const line = pair ? LASSO.pair : { ...LASSO.many, t: `You circled ${listOf(picked)}. ${LASSO.many.t}` }
  const el = $('#lasso')
  el.hidden = false
  const x = xs.reduce((a, b) => a + b) / xs.length
  el.style.left = `${Math.max(20, Math.min(innerWidth - 320, x - 150))}px`
  el.style.top = `${Math.max(80, Math.min(innerHeight - 220, Math.max(...ys) + 14))}px`
  el.innerHTML = `<div class="who">Cerebro · ${picked.length} things</div><p>${line.t}</p>
    <div class="row"><button class="chip main" id="lgo"><i class="ti ti-phone"></i> Talk about these</button><button class="chip" id="lno">Not now</button></div>`
  $('#lgo').onclick = () => {
    closeLasso()
    openRoom(picked, null, { at: [x, Math.max(...ys)] })
  }
  $('#lno').onclick = closeLasso
  if (pair) speak(line)
}
const listOf = (items) => {
  const n = items.map((i) => i.label.split(' · ')[0].toLowerCase())
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : n[0]
}
function closeLasso() {
  const el = $('#lasso')
  if (el.hidden) return
  el.hidden = true
  stopVoice()
}
let toastT = 0
function toast(text, line) {
  const t = $('#toast')
  t.hidden = false
  t.textContent = text
  clearTimeout(toastT)
  toastT = setTimeout(() => (t.hidden = true), 5000)
  if (line) speak(line)
}

// ── The room: a call ───────────────────────────────────────────────────────
const roomEl = $('#room')
let room = null
let mode = ['voice', 'chat'].includes(store.get('desk-rmode')) ? store.get('desk-rmode') : 'voice'

function nums(it) {
  const v = it.big
  // An item can name its own three numbers (the One AI items do).
  if (it.nums) return it.nums.map(([b, a]) => `<span class="n"><b>${b}</b>${a}</span>`).join('')
  if (v?.kind === 'bars') return v.rows.map(([n, val]) => `<span class="n"><b class="${it.heat === 'hot' ? 'hot' : ''}">${v.neg ? '−' : ''}$${val}k</b>${n.split(' ')[0]}</span>`).join('')
  if (v?.kind === 'list') return v.rows.slice(0, 3).map(([a, b]) => `<span class="n"><b>${b.split(' · ')[0]}</b>${a}</span>`).join('')
  return `<span class="n"><b class="${it.heat === 'hot' ? 'hot' : ''}">${it.value}${it.unit ? ` <small>${it.unit}</small>` : ''}</b>${it.sub}</span>`
}
function detail(v) {
  if (!v) return ''
  const W = 520
  switch (v.kind) {
    case 'bars': {
      const max = Math.max(...v.rows.map((r) => r[1]))
      return `<svg viewBox="0 0 ${W} ${v.rows.length * 44}">${v.rows
        .map(([n, val, why], i) => {
          const end = (val / max) * (W - 230)
          return `<text x="0" y="${i * 44 + 16}">${n}</text><path class="ln draw" d="M0 ${i * 44 + 28} H${end}" style="stroke-width:8"/><text x="${end + 10}" y="${i * 44 + 32}" style="fill:currentColor">${v.neg ? '−' : ''}$${val}k</text><text class="why" x="${end + 80}" y="${i * 44 + 32}">${why ?? ''}</text>`
        })
        .join('')}</svg>`
    }
    case 'line': {
      const pts = series(v.points, W, 130, 8)
      return `<svg viewBox="0 0 ${W} 156"><path class="ln draw" d="${inkPath(pts, 0.6, 9)}"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="4" fill="currentColor"/><text x="0" y="152">${v.label}</text></svg>`
    }
    case 'flow':
      return `<svg viewBox="0 0 ${W} 80">${v.nodes
        .map((n, i) => {
          const x = 20 + i * ((W - 60) / (v.nodes.length - 1))
          return `${i ? `<path class="ln draw" d="M${x - (W - 60) / (v.nodes.length - 1) + 20} 26 H${x - 20}"/>` : ''}<circle class="ln draw" cx="${x}" cy="26" r="14"/><text x="${x}" y="66" text-anchor="middle">${n}</text>`
        })
        .join('')}</svg>`
    case 'ring': {
      const c = 2 * Math.PI * 48
      return `<svg viewBox="0 0 ${W} 130"><circle cx="70" cy="64" r="48" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="10"/><circle class="draw" cx="70" cy="64" r="48" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * v.pct) / 100} ${c}" transform="rotate(-90 70 64)" style="--len:${c}"/><text x="150" y="70">${v.label}</text></svg>`
    }
    case 'cal':
      return `<svg viewBox="0 0 ${W} 90">${v.slots.map((s, i) => `<rect x="${i * 52}" y="6" width="44" height="52" rx="8" fill="currentColor" opacity="${s ? 0.75 : 0.12}"/>${s ? '' : `<text class="why" x="${i * 52 + 22}" y="37" text-anchor="middle">gap</text>`}`).join('')}<text x="0" y="84">${v.label}</text></svg>`
    case 'list':
      return v.rows.map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join('')
    case 'quote':
      return `<div class="r-quote"><div class="who">${v.who}</div><q>${v.q}</q><div class="reply"><small>My draft, in your voice</small>${v.a}</div></div>`
    case 'make':
      return ['Website', 'Funnel', 'Email campaign', 'Voice agent', 'Booking page'].map((m) => `<div class="row"><span>${m}</span><span>Describe it, I’ll build it</span></div>`).join('')
  }
  return ''
}
const previews = {
  'd-make-page': `<div class="r-preview"><div class="pv-cap">Draft 1 · Glow Med Spa · booking page</div><div class="pv-bar"></div><h3>Glow, on your schedule.</h3><div class="pv-sub">10% off your first visit · Open Saturdays</div><div class="pv-row"><i style="animation-delay:.2s"></i><i style="animation-delay:.35s"></i><i style="animation-delay:.5s"></i></div><div class="pv-cta">Book a visit</div></div>`,
  'd-make-camp': `<div class="r-preview email"><div class="pv-cap">Draft 1 · email 1 of 3 · spring offer</div><h3>We miss you at Glow.</h3><div class="pv-sub">To past clients · sends Tuesday 9 AM</div><div class="pv-line" style="width:92%;animation-delay:.2s"></div><div class="pv-line" style="width:78%;animation-delay:.3s"></div><div class="pv-line" style="width:84%;animation-delay:.4s"></div><div class="pv-cta" style="margin-top:6px">Claim 15% off</div></div>`,
}

// ── Make: Website / Funnel → pick what to build, then watch it get built ─────
// Picking a kind asks what to make. Picking one starts the build: the chat narrows, a preview pane
// slides in on the right, the page appears block by block as the steps tick, and the finished draft
// can be expanded into a pop-up in the app or opened in the browser.
const BUILD_ASK = { Website: { id: 'd-ask-site', t: BUILD_LINES['d-ask-site'] }, Funnel: { id: 'd-ask-funnel', t: BUILD_LINES['d-ask-funnel'] } }
const BUILDS = {
  Website: [
    { id: 'b-glow', label: 'A booking page for Glow Med Spa', t: BUILD_LINES['b-glow'], url: 'site/?r=8&brand=glow', title: 'Glow Med Spa · booking page', steps: [['Pulled Glow’s brand', 'lilac, blush, Instrument Serif'], ['Wrote the hero', '“Glow, on your schedule.”'], ['Laid out five treatments', 'with prices from the catalogue'], ['Added stories', '3 of 412 reviews'], ['Connected the calendar', 'next six open slots'], ['Draft 1 ready', 'nothing is live until you say']] },
    { id: 'b-harbor', label: 'A new site for Harbor Dental', t: BUILD_LINES['b-harbor'], url: 'site/?r=8&brand=harbor', title: 'Harbor Dental · site', steps: [['Pulled Harbor’s brand', 'teal, mint, soft type'], ['Wrote the hero', '“A calm kind of dentist.”'], ['Laid out five services', 'with transparent prices'], ['Added stories', '3 of 1,204 reviews'], ['Connected the calendar', 'next six open slots'], ['Draft 1 ready', 'nothing is live until you say']] },
    { id: 'b-peak', label: 'A launch page for Peak Fitness Eastside', t: BUILD_LINES['b-peak'], url: 'site/?r=8&brand=peak', title: 'Peak Fitness · launch page', steps: [['Pulled Peak’s brand', 'lime, charcoal, big type'], ['Wrote the hero', '“Train like you mean it.”'], ['Laid out the programs', 'strength, conditioning, lifting'], ['Added member stories', '3 of 688 reviews'], ['Connected class sign-up', 'first week free'], ['Draft 1 ready', 'nothing is live until you say']] },
  ],
  Funnel: [
    { id: 'f-glow', label: 'Spring offer · Glow Med Spa', t: BUILD_LINES['f-glow'], url: 'site/?r=8&brand=glow&v=funnel', title: 'Glow Med Spa · spring offer funnel', steps: [['Wrote the offer', '15% off first visit, this week'], ['Built the page', 'one hero, one form'], ['Added a countdown', 'ends Friday'], ['Connected the calendar', 'three-step booking'], ['Hooked up the ad', 'Google Ads → this page'], ['Draft 1 ready', 'nothing is live until you say']] },
    { id: 'f-harbor', label: 'New patient special · Harbor Dental', t: BUILD_LINES['f-harbor'], url: 'site/?r=8&brand=harbor&v=funnel', title: 'Harbor Dental · new patient funnel', steps: [['Wrote the offer', 'exam + x-rays, $79'], ['Built the page', 'one hero, one form'], ['Added a countdown', 'ends Friday'], ['Connected the calendar', 'three-step booking'], ['Hooked up the ad', 'Google Ads → this page'], ['Draft 1 ready', 'nothing is live until you say']] },
    { id: 'f-peak', label: 'First week free · Peak Fitness', t: BUILD_LINES['f-peak'], url: 'site/?r=8&brand=peak&v=funnel', title: 'Peak Fitness · launch funnel', steps: [['Wrote the offer', 'first week free, opens April 4'], ['Built the page', 'one hero, one form'], ['Added a countdown', 'to opening day'], ['Connected class sign-up', 'three steps'], ['Hooked up the ad', 'Instagram → this page'], ['Draft 1 ready', 'nothing is live until you say']] },
  ],
}
// The draft, full size, in a pop-up that grows out of wherever it was clicked. Works from the room or the desk.
function openPop(c, from) {
  if ($('#rpop')) return
  document.body.insertAdjacentHTML('beforeend', `<div class="r-pop" id="rpop"><div class="rp-card"><div class="rp-head"><span class="eb"><b></b>${c.title} · Draft 1</span><div class="rs-acts"><button type="button" class="rs-btn" data-open title="Open in your browser"><i class="ti ti-brand-chrome"></i></button><button type="button" class="rs-btn" data-closepop title="Close"><i class="ti ti-x"></i></button></div></div><div class="rp-body"><iframe src="${c.ops?.length ? `${c.base ?? c.url}&ops=${encodeURIComponent(encOps(c.ops))}` : c.url}" title="${c.title}"></iframe>${V2() ? `<aside class="rp-chat"><div class="rc-head"><b>Change something</b><span>Draft 1 · tell me, or tap a chip</span></div><div class="rc-thread" id="rcThread"><div class="rc-ai"><span class="creature small"><i></i><i></i><i></i></span><span>Here’s ${c.title.split(' · ')[0]}. Tell me what to change: colours, fonts, any text, sections. Or click any text on the page to edit it.</span></div></div><div class="rc-chips" id="rcChips"></div><form class="rc-ask" id="rcForm" autocomplete="off"><span class="spark">✦</span><input id="rcAsk" placeholder="Tell me what to change…" /><button type="button" class="mic" id="rcMic" aria-label="Talk"><i class="ti ti-microphone"></i></button></form></aside>` : ''}</div></div></div>`)
  const pop = $('#rpop'), card = pop.querySelector('.rp-card')
  let cur = c.url
  if (V2()) wirePopChat(pop, c, (u) => (cur = u))
  requestAnimationFrame(() => {
    const to = card.getBoundingClientRect()
    card.style.transformOrigin = '0 0'
    if (from) { card.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`; card.style.opacity = '0.6' }
    requestAnimationFrame(() => { pop.dataset.in = 'on'; card.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1), opacity .5s'; card.style.transform = ''; card.style.opacity = '1' })
  })
  const closePop = () => { pop.dataset.in = ''; card.style.transform = from ? `translate(${from.left}px, ${from.top}px) scale(0.3)` : 'scale(0.96)'; card.style.opacity = '0'; setTimeout(() => pop.remove(), 450) }
  pop.querySelector('[data-closepop]').onclick = closePop
  pop.querySelector('[data-open]').onclick = () => window.open(cur, '_blank', 'noopener')
  pop.onclick = (e) => { if (e.target === pop) closePop() }
}
// ── Drafts: everything that's been made today lives on the desk ─────────────
// A finished build is saved as a draft: a small live preview on the desk under "Made today", with
// Open, Open in browser and Publish. The Make card shows how many are waiting. Nothing is live
// until Publish is pressed, and that only shows a confirmation here.
const drafts = []
function saveDraft(c) {
  const d = { ...c, n: drafts.length + 1, at: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), published: false }
  drafts.unshift(d)
  renderDrafts()
  const mk = cards.make?.querySelector('.note')
  if (mk) mk.textContent = `${drafts.length} draft${drafts.length > 1 ? 's' : ''} ready to review`
  if (cards.make) cards.make.dataset.heat = 'warm'
  pushThread({ who: 'ai', text: `Saved “${c.title}” to your desk, under Made today.` })
  return d
}
function renderDrafts() {
  if (V2() && v2view === 'dash' && dstyle !== 'columns') setTimeout(renderDalt, 0)
  const el = $('#drafts')
  if (!el) return
  el.hidden = !drafts.length
  $('#draftsN').textContent = drafts.length ? `· ${drafts.length} draft${drafts.length > 1 ? 's' : ''} · nothing live yet` : ''
  $('#dcards').innerHTML = drafts.map((d, i) => `<article class="dcard" data-i="${i}"${d.published ? ' data-live' : ''}>
      <button type="button" class="dview" data-view="${i}" aria-label="Open ${d.title}"><iframe src="${d.url}" title="${d.title}" tabindex="-1" loading="lazy"></iframe><span class="dhint"><i class="ti ti-arrows-maximize"></i> Open</span></button>
      <div class="dmeta"><span class="eb">${d.published ? '<b class="live"></b>Live' : '<b></b>Draft 1'} · ${d.at}</span><h3>${d.title}</h3>
        <div class="dacts"><button type="button" class="chip main" data-publish="${i}"${d.published ? ' disabled' : ''}>${d.published ? '<i class="ti ti-check"></i> Published' : 'Publish'}</button><button type="button" class="chip" data-browser="${i}"><i class="ti ti-brand-chrome"></i> Open in browser</button><button type="button" class="chip" data-edit="${i}">Change it</button></div></div></article>`).join('')
  el.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => openPop(drafts[+b.dataset.view], b.getBoundingClientRect())))
  el.querySelectorAll('[data-browser]').forEach((b) => (b.onclick = () => window.open(drafts[+b.dataset.browser].url, '_blank', 'noopener')))
  el.querySelectorAll('[data-publish]').forEach((b) => (b.onclick = () => { const d = drafts[+b.dataset.publish]; d.published = true; renderDrafts(); toast(`Published. ${d.title} is live at ${d.url.replace('site/?', 'glow.highlevelsites.com/?')}.`) }))
  el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => { const d = drafts[+b.dataset.edit]; openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: d.url.includes('funnel') ? 'Funnel' : 'Website' }) }))
}
let build = null
function startBuild(c) {
  lastBuild = c
  build?.stop?.()
  roomEl.querySelector('#rsite')?.remove()
  roomEl.dataset.build = 'on'
  const n = c.steps.length
  roomEl.insertAdjacentHTML('beforeend', `<aside class="r-site" id="rsite" style="--p:0">
    <div class="rs-head"><span class="eb"><b></b>Building · ${c.title}</span><span class="rs-status" id="rsStatus">Step 1 of ${n}</span>
      <div class="rs-acts"><button type="button" class="rs-btn" data-expand title="Expand" disabled><i class="ti ti-arrows-maximize"></i></button><button type="button" class="rs-btn" data-open title="Open in your browser" disabled><i class="ti ti-external-link"></i></button><button type="button" class="rs-btn" data-closep title="Close preview"><i class="ti ti-x"></i></button></div></div>
    <div class="rs-frame"><div class="rs-chrome"><i></i><i></i><i></i><span>${c.url.replace('site/?', 'glow.highlevelsites.com/?')}</span></div><div class="rs-view"><iframe src="${c.url}" title="${c.title}" tabindex="-1"></iframe><div class="rs-veil"><div class="rs-shimmer"></div></div><button type="button" class="rs-click" data-expand aria-label="Expand the draft" disabled><span><i class="ti ti-arrows-maximize"></i> Click to expand</span></button></div></div>
    <ol class="rs-steps" id="rsSteps">${c.steps.map(([a, b]) => `<li><i></i><span>${a}</span><small>${b}</small></li>`).join('')}</ol>
    <div class="rs-foot" id="rsFoot" hidden><button type="button" class="chip main" data-expand><i class="ti ti-arrows-maximize"></i> Expand</button><button type="button" class="chip" data-open><i class="ti ti-brand-chrome"></i> Open in browser</button><span class="rs-note">Nothing is live until you say so.</span></div></aside>`)
  const el = $('#rsite'), lis = [...el.querySelectorAll('li')]
  let k = 0, timer = null, done = false
  const tick = () => {
    if (k > 0) lis[k - 1].dataset.state = 'done'
    if (k < n) {
      lis[k].dataset.state = 'now'
      $('#rsStatus').textContent = k === n - 1 ? 'Finishing…' : `Step ${k + 1} of ${n}`
      el.style.setProperty('--p', String((k + 1) / n))
      k++
      timer = setTimeout(tick, 1100 + Math.random() * 500)
    } else {
      done = true
      el.dataset.done = 'on'
      $('#rsStatus').textContent = `Draft 1 · ready · ${n} steps`
      el.querySelectorAll('[data-expand],[data-open]').forEach((b) => (b.disabled = false))
      $('#rsFoot').hidden = false
      el.querySelector('.rs-head .eb').innerHTML = `<b></b>${c.title} · Draft 1`
      saveDraft(c)
      if (roomStyle === 'live') liveAfter(c.item)
      say({ id: 'd-build-ready', t: BUILD_LINES['d-build-ready'] })
    }
  }
  timer = setTimeout(tick, 900)
  const open = () => window.open(c.url, '_blank', 'noopener')
  const expand = () => openPop(c, el.querySelector('.rs-view').getBoundingClientRect())
  el.querySelectorAll('[data-expand]').forEach((b) => (b.onclick = expand))
  el.querySelectorAll('[data-open]').forEach((b) => (b.onclick = open))
  el.querySelector('[data-closep]').onclick = () => { el.dataset.out = 'on'; setTimeout(() => { el.remove(); delete roomEl.dataset.build }, 450) }
  build = { stop: () => clearTimeout(timer), c, get done() { return done } }
}

function openRoom(items, fromEl, opts = {}) {
  // The desk's caption belongs to the desk: clear it when a room opens so it never sits over the room.
  clearTimeout(toastT)
  const tst = $('#toast')
  if (tst) tst.hidden = true
  if (!items.length) return
  clearTimeout(autoT)
  stopVoice()
  stopHandsFree()
  setListen('')
  guessEl?.remove()
  guessEl = null
  closeLasso()
  const group = items.length > 1
  const it = items[0]
  const r = fromEl?.getBoundingClientRect()
  const cx = r ? r.left + r.width / 2 : opts.at?.[0] ?? innerWidth / 2
  const cy = r ? r.top + r.height / 2 : opts.at?.[1] ?? innerHeight / 2
  const px = askbox === 'panel' ? 64 : 0
  roomEl.style.setProperty('--cx', `${cx - px}px`)
  roomEl.style.setProperty('--cy', `${cy}px`)
  roomEl.style.setProperty('--r', `${r ? Math.min(r.width, r.height) / 2 : 30}px`)
  delete roomEl.dataset.build
  build?.stop?.()
  document.body.classList.remove('room-closing')
  roomEl.dataset.heat = group ? (items.some((i) => heat[i.id] === 'hot') ? 'hot' : 'warm') : heat[it.id]
  roomEl.dataset.mode = mode
  roomEl.dataset.voice = voiceStyle
  roomEl.dataset.room = roomStyle
  let can = group ? items.flatMap((i) => i.can.slice(0, 1).map((c) => ({ ...c, item: i }))) : it.can.map((c) => ({ ...c, item: it }))
  // Website / Funnel: ask what kind first, then build it with a live preview on the right.
  if (BUILDS[opts.kind]) can = BUILDS[opts.kind].map((c) => ({ ...c, item: it, effect: 'build' }))
  const title = group ? `${items.length} things you circled` : it.label
  roomEl.innerHTML = `<div class="r-glow"></div>
    <div class="r-head"><span class="eb"><b></b>${title}</span>
      <div class="r-mode" role="tablist"><button role="tab" data-m="voice"><i class="ti ti-phone"></i> Voice</button><button role="tab" data-m="chat"><i class="ti ti-message"></i> Chat</button></div>
      <div class="r-tr"><button type="button" class="r-proto" data-proto aria-label="Prototype options" title="Prototype options"><i class="ti ti-adjustments-horizontal"></i></button><button class="r-close" aria-label="Close (Esc)"><i class="ti ti-x"></i></button></div>
      <div class="r-hacts"><button type="button" class="r-hb" data-pause aria-label="Pause"><i class="ti ti-player-pause"></i></button><button type="button" class="r-hb" data-mute aria-label="Mute"><i class="ti ti-volume"></i></button></div></div>
    <div class="r-stage">
      <div class="creature" id="creature"><i></i><i></i><i></i><b></b></div>
      <div class="r-status" id="rstatus"></div>
      <p class="r-say" id="rsay"></p>
      <div class="r-you" id="ryou"></div>
      <div class="r-work" id="rwork">${!group && roomStyle === 'live' && LIVE[it.id] ? `<div class="r-live" id="rlive">${liveHtml(it)}</div><div class="r-doing" id="rdoing" hidden></div>` : ''}${group ? `<div class="r-nums">${items.map((i) => nums(i)).join('')}</div>` : `<div class="r-nums">${nums(it)}</div>${it.big ? `<button type="button" class="r-more" id="rmore">Show ${it.big.kind === 'quote' ? 'the message' : it.big.kind === 'make' ? 'what I can make' : 'the detail'} <i class="ti ti-chevron-down"></i></button><div class="r-detail" id="rdetail">${detail(it.big)}</div>` : ''}`}
        <div id="rpreview"></div></div>
      <div class="r-can" id="rcan">${can.map((c, i) => `<button type="button" class="chip ${i ? '' : 'main'}" data-c="${i}">${c.label}</button>`).join('')}${V2() && !group && it?.problem ? '<button type="button" class="chip rlater" data-rlater><i class="ti ti-clock"></i> Later</button>' : ''}</div>
    </div>
    <div class="r-foot"><div class="r-ctl"><button type="button" class="sm" data-pause aria-label="Pause"><i class="ti ti-player-pause"></i></button><button type="button" class="big" id="rmic" aria-label="Talk"><i class="ti ti-microphone"></i></button><span class="bar-wave r-eq" aria-hidden="true">${"<i></i>".repeat(8)}</span><button type="button" class="sm" data-mute aria-label="Mute"><i class="ti ti-volume"></i></button></div><div class="hint">Tap to talk · pause or mute the AI</div></div>
    <div class="r-bar" id="rbar"><span class="rb-ic"><i class="ti ti-sparkles"></i></span><span class="rb-wave" id="rbwave">${'<i></i>'.repeat(16)}</span>
      <div class="rb-main"><div class="rb-lbl"><span class="rb-who">HighLevel AI · </span><span id="rbstate">Speaking</span></div><div class="rb-text" id="rbtext"></div></div>
      <button type="button" class="rb-btn" data-m="chat" aria-label="Type instead">Aa</button>
      <button type="button" class="rb-btn" data-pause aria-label="Pause"><i class="ti ti-player-pause"></i></button>
      <button type="button" class="rb-btn" data-mute aria-label="Mute"><i class="ti ti-volume"></i></button>
      <span class="bar-wave rb-eq" aria-hidden="true">${"<i></i>".repeat(8)}</span><button type="button" class="rb-btn" id="rbmic" aria-label="Talk"><i class="ti ti-microphone"></i></button>
      <button type="button" class="rb-btn dark" id="rbclose" aria-label="Close"><i class="ti ti-x"></i></button></div>
    <div class="r-chat"><div class="r-thread"><div class="r-data" id="rdata"></div><div class="r-log" id="rlog"></div>
      <form class="r-input" id="rform"><input id="rask" placeholder="Type a message…" autocomplete="off"/><button type="button" class="mic" id="rmic2" aria-label="Talk"><i class="ti ti-microphone"></i></button></form></div>
      <aside class="r-tm" id="rtm" aria-label="Done so far"></aside></div>`
  roomEl.hidden = false
  const stg = roomEl.querySelector('.r-stage')
  if (stg) stg.onscroll = () => stg.classList.toggle('scrolled', stg.scrollTop > 4)
  document.body.classList.add('room-open')
  void roomEl.offsetWidth
  roomEl.style.setProperty('--r', `${Math.hypot(innerWidth, innerHeight)}px`)
  primeDraw(roomEl, 0.4)
  room = { items, can, from: fromEl, log: [] }
  roomEl.querySelector('.r-close').onclick = closeRoom
  roomEl.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => setMode(b.dataset.m)))
  roomEl.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => runCan(+b.dataset.c)))
  $('#rmore') && ($('#rmore').onclick = () => $('#rdetail').classList.toggle('open'))
  $('#rform').onsubmit = (e) => {
    e.preventDefault()
    const v = $('#rask').value.trim()
    $('#rask').value = ''
    if (v) heard(v)
  }
  const status = (s) => {
    const el = $('#rstatus')
    if (!el) return
    el.textContent = s
    el.dataset.on = s
    const b = $('#rbstate')
    if (b) b.textContent = s ? s[0].toUpperCase() + s.slice(1) : 'Ready'
  }
  roomStatus = status
  if (V2()) roomEl.querySelector('.r-foot .hint').textContent = SR ? 'Just talk · I pause when you’re quiet' : 'Voice works in Chrome · type below'
  const resume = { onInterim: roomInterim, onTapOff: roomRest, onEnd: (got) => got && setTimeout(() => room && !room.speaking && handsFree(), 300) }
  $('#rmic').onclick = () => listen($('#rmic'), heard, status, resume)
  $('#rmic2').onclick = () => listen($('#rmic2'), heard, undefined, resume)
  $('#rbmic').onclick = () => listen($('#rbmic'), heard, status, resume)
  $('#rbclose').onclick = closeRoom
  roomEl.querySelectorAll('[data-pause]').forEach((b) => (b.onclick = togglePause))
  roomEl.querySelectorAll('[data-mute]').forEach((b) => (b.onclick = () => setMuted(!muted)))
  setMuted(muted)
  setMode(mode, false)
  if (askbox === 'panel') renderSuggest()
  const intro = BUILDS[opts.kind] ? BUILD_ASK[opts.kind] : group ? { id: null, t: `Here's ${listOf(items)} together. ${items.map((i) => `${i.label.split(' · ')[0]}: ${i.value}.`).join(' ')} Pick one to start, or ask me anything.` } : it.intro
  setTimeout(() => {
    if (opts.direct != null) return runCan(opts.direct)
    say(intro, () => handsFree())
    if (opts.kind && !BUILDS[opts.kind]) {
      const i = can.findIndex((c) => c.label === opts.kind)
      if (i >= 0) setTimeout(() => runCan(i), 1200)
    }
  }, 650)
}
function setMode(m, remember = true) {
  mode = m
  if (remember) store.set('desk-rmode', m)
  roomEl.dataset.mode = m
  roomEl.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-selected', b.dataset.m === m))
  // The live data (what it's working from, what it's doing) follows the mode: under the creature in
  // voice, on top of the thread in chat. Same nodes, so a running fix keeps ticking.
  const live = $('#rlive')
  const doing = $('#rdoing')
  if (m === 'chat') stopHandsFree()
  else if (remember && !room?.speaking) handsFree()
  if (m === 'chat') {
    if (live) $('#rdata').append(live)
    if (doing) $('#rdata').append(doing)
    renderLog()
    renderTimeMachine()
    setTimeout(() => $('#rask')?.focus(), 300)
  } else {
    const work = $('#rwork')
    if (work && live) work.prepend(live)
    if (work && doing) live ? live.after(doing) : work.prepend(doing)
  }
}
/** Time Machine (chat): everything finished so far, newest on top, as small receipts. */
function renderTimeMachine() {
  const tm = $('#rtm')
  if (!tm) return
  const done = ALL.filter((it) => heat[it.id] === 'done').slice().reverse()
  tm.classList.toggle('empty', !done.length)
  tm.innerHTML = done.length
    ? `<div class="tm-cap">Done so far <em>· ${done.length}</em></div><div class="tm-stack" id="tmstack">${done
        .map((it, i) => `<button type="button" class="tm-card" data-tm="${it.id}" style="--i:${i}"><span class="eb">${it.label} · ${done.length - i} of ${done.length}</span><b>${it.problem ?? it.value + (it.unit ? ' ' + it.unit : '')}</b><span class="rc"><i class="ti ti-check"></i>${it.receipt ?? 'Done'}</span></button>`)
        .join('')}</div><div class="tm-hint">${done.length > 1 ? 'Click to fan them out' : ''}</div>`
    : ''
  const stack = $('#tmstack')
  if (stack) {
    stack.onclick = (e) => {
      const b = e.target.closest('[data-tm]')
      // First click fans the pile; a click on a fanned card reopens it.
      if (!stack.classList.contains('fan') && done.length > 1) return stack.classList.add('fan')
      if (b) openRoom([ALL.find((i) => i.id === b.dataset.tm)], b)
    }
  }
}
/** The AI speaks: big in the middle (voice), and as a message (chat). */
function say(line, after) {
  if (!room) return
  const el = $('#rsay')
  const words = line.t.split(' ')
  el.innerHTML = words.map((w) => `<span class="w dim">${esc(w)}</span> `).join('')
  const bar = $('#rbtext')
  if (bar) bar.innerHTML = el.innerHTML
  const creature = $('#creature')
  const entry = { who: 'ai', text: line.t, work: line.effect === 'preview' ? previews[line.id] : null }
  room.log.push(entry)
  pushThread(entry)
  // The chat bubble reads out too: renderLog draws the entry being spoken word by word (room.speaking /
  // room.spoken), so switching to chat mid-sentence keeps the reveal going.
  room.speaking = entry
  room.spoken = 0
  stopHandsFree()
  renderLog()
  const groups = () => [el, bar, [...document.querySelectorAll('#rlog .ai .t')].at(-1)].filter(Boolean).map((g) => [...g.querySelectorAll('.w')])
  $('#rstatus').textContent = 'Speaking'
  $('#rstatus').dataset.on = 'speaking'
  $('#rbstate') && ($('#rbstate').textContent = 'Speaking')
  roomEl.querySelectorAll('[data-pause]').forEach((b) => {
    b.innerHTML = '<i class="ti ti-player-pause"></i>'
    b.classList.remove('on')
  })
  const done = () => {
    if (room) {
      room.speaking = null
      renderLog()
    }
    $('#rstatus').textContent = ''
    $('#rstatus').dataset.on = ''
    $('#rbstate') && ($('#rbstate').textContent = 'Ready')
    after?.()
    if (room && !room.speaking) handsFree()
  }
  const go = {
    onWord: (n) => {
      line.onWord?.(n, words.length)
      room.spoken = n
      groups().forEach((g) => g.forEach((s, i) => s.classList.toggle('dim', i >= n)))
      const live = bar?.querySelectorAll('.w')[Math.max(0, n - 1)]
      if (live && bar) { bar.scrollLeft = Math.max(0, live.offsetLeft - bar.clientWidth * 0.35); bar.scrollTop = Math.max(0, live.offsetTop - bar.clientHeight * 0.4) }
    },
    onAmp: (a) => {
      creature?.style.setProperty('--amp', a.toFixed(3))
      $('#rlog .creature.speaking')?.style.setProperty('--amp', a.toFixed(3))
      const wv = $('#rbwave')
      if (wv) { wv.style.setProperty('--amp', a.toFixed(3)); wv.classList.toggle('talking', a > 0.02) }
      stitch?.amp(a)
    },
    onEnd: done,
  }
  const clip = line.id ?? clipFor(line.t)
  if (clip && (line.id || DUR[clip])) speak({ ...line, id: clip }, go)
  else speakDyn(line.t, go)
}
function renderLog() {
  if (askbox === 'panel') renderSuggest()
  const mini = $('#rmini .rm-list')
  if (mini && room) mini.innerHTML = room.log.slice(-3).map((e) => `<div class="${e.who === 'me' ? 'me' : 'ai'}">${esc(e.text)}</div>`).join('')
  const log = $('#rlog')
  if (!log || !room) return
  const chips = room.can.map((c, i) => (c.used ? '' : `<button type="button" class="chip" data-c="${i}">${c.label}</button>`)).join('')
  // V2 chat: the data rides inside the AI's latest message instead of sitting above the conversation.
  const liveNode = V2() && mode === 'chat' ? $('#rlive') : null
  log.innerHTML = room.log
    .map((e) => (e.who === 'me' ? `<div class="me">${esc(e.text)}</div>` : `<div class="ai"><span class="creature small${e === room.speaking ? ' speaking' : ''}"><i></i><i></i><i></i></span><span class="t">${e === room.speaking ? e.text.split(' ').map((w, i) => `<span class="w${i >= (room.spoken ?? 0) ? ' dim' : ''}">${esc(w)}</span>`).join(' ') : esc(e.text)}</span></div>${e.work ? `<div class="work">${e.work}</div>` : ''}`))
    .join('')
  if (liveNode) {
    const att = document.createElement('div')
    att.className = 'ai-attach'
    att.append(liveNode)
    const lastAi = [...log.querySelectorAll(':scope > .ai')].at(-1)
    if (lastAi) lastAi.after(att)
    else log.prepend(att)
  }
  if (chips) log.insertAdjacentHTML('beforeend', `<div class="chips">${chips}</div>`)
  if (room.next !== undefined) {
    const n = room.next
    if (n || !V2()) log.insertAdjacentHTML('beforeend', n
      ? `<div class="next-up"><span class="eb">Next · needs you</span><b>${n.problem}</b>${n.cost ? `<span class="cost">${n.cost}</span>` : ''}<div class="acts"><button type="button" class="chip main" data-next="${n.id}">Take me there</button><button type="button" class="chip" data-next-later="${n.id}">Later</button></div></div>`
      : `<div class="next-up"><span class="eb">That’s everything</span><b>Nothing else needs you right now.</b></div>`)
    wireNext()
  }
  log.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => runCan(+b.dataset.c)))
  log.scrollTop = 1e6
}
function youSaid(text) {
  room.log.push({ who: 'me', text })
  pushThread({ who: 'me', text })
  $('#ryou').innerHTML = `You: <b>${esc(text)}</b>`
  renderLog()
}
function runCan(i, quiet = false) {
  const c = room?.can[i]
  if (!c || c.used) return
  c.used = true
  if (!quiet) youSaid(c.label)
  roomEl.querySelector(`.r-can [data-c="${i}"]`)?.classList.add('used')
  if (c.effect === 'build') startBuild(c)
  const pv = previews[c.id]
  if (pv) {
    $('#rpreview').innerHTML = pv
    c.effect = 'preview'
    reveal($('#rpreview'))
  }
  const run = roomStyle === 'live' && STEPS[c.id] ? startSteps(c) : null
  const canEl = $('#rcan')
  if (run) {
    canEl.dataset.was = canEl.innerHTML
    canEl.innerHTML = STEER.map((l) => `<button type="button" class="chip steer" data-steer="${l}">${l}</button>`).join('')
    canEl.querySelectorAll('[data-steer]').forEach((b) => (b.onclick = () => (b.dataset.steer === 'Pause' ? togglePause() : (stopVoice(), run.to(Math.max(0, [...$('#rdoing').querySelectorAll('.step')].findIndex((r) => r.dataset.state === 'now'))), finishRun(false)))))
    c.onWord = (n, total) => run.to(Math.floor((n / total) * STEPS[c.id].length))
  }
  const finishRun = (ok) => {
    if (!run || run.done) return
    run.done = true
    if (ok) {
      run.finish()
      liveAfter(c.item)
    } else {
      $('#rstatus').textContent = ''
      $('#rstatus').dataset.on = ''
      $('#rbstate') && ($('#rbstate').textContent = 'Stopped')
      $('#rdoing').insertAdjacentHTML('beforeend', '<div class="step stopped"><i class="ti ti-hand-stop"></i><span>Stopped here. Nothing else changes until you say so. Say “resume” or tap it again to finish the rest.</span></div>')
      if (room) room.stoppedAt = i
      autoRun = false
      if (room) { room.speaking = null; renderLog() }
      setTimeout(() => room && handsFree(), 300)
    }
    if (canEl.dataset.was) canEl.innerHTML = canEl.dataset.was
    canEl.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => runCan(+b.dataset.c)))
    // Stopped: the fix can be started again (by tapping it or saying "resume").
    if (!ok) { c.used = false; canEl.querySelector(`[data-c="${i}"]`)?.classList.remove('used') }
  }
  say(c, () => {
    finishRun(true)
    if (c.effect === 'heal') {
      heal(c.item)
      // Revenue's two safe fixes include Harbor's ads: that item is done too.
      if (c.item.id === 'revenue' && heat.ads === 'hot') healQuiet('ads')
      offerNext(c.item)
    }
  })
}
/** A new block in the room: slide it into view so the earlier ones tuck under the header. */
function reveal(el) {
  if (!el || mode !== 'voice') return
  requestAnimationFrame(() => el.scrollIntoView({ block: 'end', behavior: 'smooth', inline: 'nearest' }))
}
/** The next thing that needs you, offered where the choices were; one click carries the room over. */
/** After the last fix: wait for the AI to finish its line, then close the room and say we're done.
 *  Anything you do in the room first (speak, tap a chip, switch to chat) cancels it. */
function goHomeWhenDone(r) {
  const started = Date.now()
  const mine = () => r.log.filter((e) => e.who === 'me').length
  const log = mine()
  const tick = () => {
    if (room !== r || mine() > log) return
    if (voice && Date.now() - started < 12000) return setTimeout(tick, 300)
    setTimeout(() => {
      if (room !== r || mine() > log) return
      closeRoom()
      setTimeout(() => !room && deskSay(DYN['d-all-done']), 900)
    }, 1400)
  }
  setTimeout(tick, 600)
}
function offerNext(after) {
  if (!room) return
  const next = openNeeds().find((it) => it.id !== after.id)
  room.next = next ?? null
  if (autoRun) {
    if (next) autoT = setTimeout(() => room && autoRun && openRoom([next], cards[next.id]?.offsetParent ? cards[next.id] : null, { direct: healIndex(next) }), 1400)
    else autoRun = false
  }
  // V2 · Nothing left: once the result has been said, close the room and land on "All done".
  if (V2() && !next) goHomeWhenDone(room)
  const html = next
    ? `<div class="next-up"><span class="eb">Next · needs you</span><b>${next.problem}</b>${next.cost ? `<span class="cost">${next.cost}</span>` : ''}<div class="acts"><button type="button" class="chip main" data-next="${next.id}">Take me there</button><button type="button" class="chip" data-next-later="${next.id}">Later</button></div></div>`
    : `<div class="next-up"><span class="eb">That’s everything</span><b>Nothing else needs you right now.</b></div>`
  const can = $('#rcan')
  if (V2()) {
    roomEl.querySelector('.r-next')?.remove()
    // Only a real next thing gets a card; "that's everything" isn't worth one.
    if (next) roomEl.insertAdjacentHTML('beforeend', `<div class="r-next">${html}</div>`)
  } else if (can) {
    can.querySelector('.next-up')?.remove()
    can.insertAdjacentHTML('beforeend', html)
    reveal(can.querySelector('.next-up'))
  }
  renderLog()
  wireNext()
}
function wireNext() {
  roomEl.querySelectorAll('[data-next]').forEach((b) => (b.onclick = () => openRoom([ALL.find((i) => i.id === b.dataset.next)], cards[b.dataset.next]?.offsetParent ? cards[b.dataset.next] : null)))
  roomEl.querySelectorAll('[data-next-later]').forEach((b) => (b.onclick = () => {
    const it = ALL.find((i) => i.id === b.dataset.nextLater)
    heat[it.id] = 'later'
    cards[it.id].dataset.heat = 'later'
    toast(`Okay. I’ll bring “${it.problem}” back tomorrow morning.`)
    if (desk.hasAttribute('data-v2')) renderFocus()
    offerNext(it)
  }))
}
const norm = (s) => s.toLowerCase().replace(/[’'“”".,!?]/g, '').replace(/\s+/g, ' ').trim()
const healIndex = (it) => Math.max(0, (it.can ?? []).findIndex((c) => c.effect === 'heal' || c.effect === 'build'))
const YES = /\b(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|do that|fix it|fix that|fix this|run it|run them|run the|go|turn them|send them|send it|set it up|take care|handle it|sort it)\b/
const NO = /\b(no|nope|not|dont|don t|never|wait|hold on|hang on)\b/
const STOP = new Set(['the', 'and', 'for', 'you', 'your', 'them', 'this', 'that', 'with', 'what', 'why', 'did'])
const ALL_OF_IT = /\b(everything|all of them|all of it|all three|all of these|all of those|them all|it all|each of them|fix them|do them|handle them|sort them|run them all)\b/
function heard(text, alts = []) {
  if (!room) return
  const t = norm(text)
  // While a fix runs: "pause" pauses it, "resume" picks it up, "stop" stops the fix (not the room).
  const steer = (n) => $(`#rcan [data-steer="${n}"]`)
  if (/\b(resume|continue|keep going|go on|carry on|unpause|pick (it )?up|finish (it|the rest))\b/.test(t)) {
    youSaid(text)
    if (voice?.paused) return togglePause()
    if (room.stoppedAt != null) { const k = room.stoppedAt; room.stoppedAt = null; return runCan(k) }
    return say(L('d-ok'))
  }
  if (/\b(pause|hold on|hold it|hang on|wait)\b/.test(t) && voice && !voice.paused) { youSaid(text); return togglePause() }
  if (/\bstop\b/.test(t) && steer('Stop')) { youSaid(text); return steer('Stop').click() }
  if (/\b(stop|cancel|never mind|nevermind|close|go back|back to the desk)\b/.test(t)) return closeRoom()
  // "Later" puts THIS off (same as the button); "next" / "skip" moves on.
  if (/\b(later|not now|put (it|this|that) off|tomorrow)\b/.test(t)) {
    youSaid(text)
    const it = room.items[0]
    if (it?.problem) { heat[it.id] = 'later'; if (cards[it.id]) cards[it.id].dataset.heat = 'later'; if (desk.hasAttribute('data-v2')) renderFocus(); placeV2Later() }
    say(L('d-putoff'))
    return offerNext(it)
  }
  if (/\b(skip|next( one)?|move on)\b/.test(t) && room.next) { youSaid(text); return openRoom([room.next], cards[room.next.id]?.offsetParent ? cards[room.next.id] : null, { direct: healIndex(room.next) }) }
  // "No", "don't", "wait": never act on a negative.
  if (NO.test(t)) { youSaid(text); return say(L('d-ok')) }
  if (ALL_OF_IT.test(t)) { autoRun = true; youSaid(text); const i = room.can.findIndex((c) => !c.used && (c.effect === 'heal' || c.effect === 'build')); return i >= 0 ? runCanQuiet(i) : fixAll() }
  const first = room.can.find((x) => !x.used)
  const words = (l) => norm(l).split(' ').filter((w) => w.length > 2 && !STOP.has(w)).slice(0, 2)
  const pick = (s) => room.can.findIndex((c) => !c.used && (norm(c.label) === s || (words(c.label).length && words(c.label).every((w) => new RegExp(`\\b${w}\\b`).test(s))) || (YES.test(s) && c === first)))
  let i = pick(t)
  for (const a of alts) { if (i >= 0) break; i = pick(norm(a)) }
  if (i >= 0) return runCan(i)
  youSaid(text)
  if (!V2()) return say(FALLBACK)
  understandLLM(text).then((u) => {
    u ??= understandRules(text)
    if (u.intent === 'chat' || u.intent === 'brief') return say({ id: clipFor(u.reply ?? DYN['d-catch-room']), t: u.reply ?? DYN['d-catch-room'] })
    if (u.intent === 'act' && room.items.some((i) => i.id === u.target)) { const i = room.can.findIndex((c) => !c.used); return i >= 0 ? runCan(i) : say(L('d-done-already')) }
    act(u, text)
  })
}
/** Run a choice after the user already said something (so it isn't echoed twice). */
function runCanQuiet(i) { runCan(i, true) }
// "Fix everything": goes through what needs you, one room after another, without another click.
let autoRun = false
let autoT = 0
function fixAll() {
  const next = openNeeds()[0]
  if (!next) { autoRun = false; return room ? say(L('d-quiet2')) : deskSay(DYN['d-quiet2']) }
  autoRun = true
  openRoom([next], cards[next.id]?.offsetParent ? cards[next.id] : $(`.fit[data-fopen='${next.id}']`), { direct: healIndex(next) })
}
// V2 · Undo: every fix can be taken back for a little while, by tapping Undo or saying "undo that".
let undoGroup = null
function noteDone(id) {
  if (!V2()) return
  if (undoGroup && Date.now() - undoGroup.t < 15000) { if (!undoGroup.ids.includes(id)) undoGroup.ids.push(id); undoGroup.t = Date.now() }
  else undoGroup = { ids: [id], t: Date.now() }
  let el = $('#undopill')
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div class="undopill" id="undopill" role="status" hidden><i class="ti ti-circle-check"></i><span></span><button type="button">Undo</button></div>')
    el = $('#undopill')
    el.querySelector('button').onclick = () => undoLast(false)
  }
  const first = byId(undoGroup.ids[0])
  el.querySelector('span').textContent = undoGroup.ids.length > 1 ? `${undoGroup.ids.length} fixes done` : first?.receipt ?? 'Done'
  el.hidden = false
  clearTimeout(noteDone.t)
  noteDone.t = setTimeout(() => { if ($('#undopill')) $('#undopill').hidden = true }, 10000)
}
function undoLast(spoken) {
  const g = undoGroup
  if ($('#undopill')) $('#undopill').hidden = true
  if (!g || Date.now() - g.t > 120000) return spoken ? (room ? say({ id: 'd-undo-none', t: DYN['d-undo-none'] }) : deskSay(DYN['d-undo-none'])) : null
  undoGroup = null
  autoRun = false
  const wasRoom = !!room
  if (room) closeRoom()
  g.ids.forEach((id) => {
    const it = byId(id)
    if (!it) return
    bringBack(it)
    const c = cards[id]
    c?.querySelector('.tick')?.remove()
    c?.querySelector('.receipt')?.remove()
    c?.querySelector('.rule')?.remove()
  })
  setTimeout(() => { if (desk.hasAttribute('data-v2')) renderFocus(); placeV2Later() }, wasRoom ? 800 : 0)
  deskSay(DYN['d-undone'])
}
/** Something got fixed: sparks, the room turns calm green, and its card on the desk shows it. */
function heal(item) {
  heat[item.id] = 'done'
  noteDone(item.id)
  roomEl.dataset.heat = 'done'
  const c = cards[item.id]
  if (c) {
    c.dataset.heat = 'done'
    if (!c.querySelector('.tick')) c.insertAdjacentHTML('beforeend', '<span class="tick"><i class="ti ti-check"></i></span>')
    if (c.querySelector('.note')) c.querySelector('.note').textContent = 'Done'
    if (c.querySelector('.acts')) {
      if (deskMode === 'one' && item.receipt) {
        // One AI: the card keeps a receipt, offers Undo, and asks whether it may do this alone next time.
        c.querySelector('.acts').innerHTML = `<div class="receipt"><i class="ti ti-check"></i>${item.receipt}<button type="button" class="undo" data-undo="${item.id}">Undo</button></div>${item.rule ? `<div class="rule">${item.rule}</div><div class="rule-acts"><button type="button" class="go1" data-rule="always">Yes, always</button><button type="button" class="go2" data-rule="ask">Ask each time</button></div>` : ''}`
      } else c.querySelector('.acts').innerHTML = '<span class="saved done"><i class="ti ti-check"></i> Done</span>'
    }
  }
  const hotMarks = [...document.querySelectorAll('.hello .marks i.hot')]
  hotMarks[0]?.classList.replace('hot', 'done')
  if (desk.hasAttribute('data-front')) setTimeout(() => desk.hasAttribute('data-front') && renderFront(), 800)
  if (desk.hasAttribute('data-v2')) setTimeout(renderFocus, 800)
  if (layout === 'scribble') setTimeout(scatter, 900)
  renderTimeMachine()
  const r = $('#creature').getBoundingClientRect()
  const burst = document.createElement('div')
  burst.className = 'sparks'
  burst.style.left = `${r.left + r.width / 2}px`
  burst.style.top = `${r.top + r.height / 2}px`
  burst.innerHTML = Array.from({ length: 18 }, (_, k) => {
    const a = (k / 18) * Math.PI * 2
    const d = 70 + Math.random() * 60
    return `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px"></i>`
  }).join('')
  document.body.appendChild(burst)
  setTimeout(() => burst.remove(), 1000)
  if (THREADS.some(([a, b]) => a === item.id || b === item.id)) $('#threads').querySelectorAll('path').forEach((p) => (p.style.stroke = 'var(--good)'))
}
/** Mark something done without the room's sparks (it was fixed as part of another fix). */
function healQuiet(id) {
  heat[id] = 'done'
  noteDone(id)
  const c = cards[id]
  if (c) { c.dataset.heat = 'done'; const a = c.querySelector('.acts'); if (a) a.innerHTML = '<span class="saved done"><i class="ti ti-check"></i> Done</span>' }
  if (desk.hasAttribute('data-v2')) setTimeout(renderFocus, 800)
}
function closeRoom() {
  if (roomEl.hidden) return
  stopVoice()
  stopHandsFree()
  const r = room?.from?.getBoundingClientRect()
  if (r) {
    roomEl.style.setProperty('--cx', `${r.left + r.width / 2 - (askbox === 'panel' ? 64 : 0)}px`)
    roomEl.style.setProperty('--cy', `${r.top + r.height / 2}px`)
  }
  roomEl.style.setProperty('--r', `${r ? Math.min(r.width, r.height) / 2 : 0}px`)
  room = null
  document.body.classList.remove('room-open')
  document.body.classList.add('room-closing')
  if (askbox === 'panel') renderSuggest()
  autoRun = false
  build?.stop?.()
  build = null
  setTimeout(() => {
    roomEl.hidden = true
    roomEl.innerHTML = ''
    delete roomEl.dataset.build
    document.body.classList.remove('room-closing')
    deskHandsFree()
  }, 700)
}
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!roomEl.hidden) closeRoom()
  else closeLasso()
})

// ── Ask bar ─────────────────────────────────────────────────────────────────
const KEYS = {
  revenue: ['revenue', 'dip', 'dipped', 'money', 'lumen spa down', 'three accounts'],
  ads: ['ads', 'google', 'campaign stopped', 'turn them back on', 'card'],
  calls: ['missed call', 'calls', 'text back', 'text-back', 'phone'],
  reviews: ['review', 'stars', 'rating', 'send all', 'replies'],
  voicemail: ['voicemail', 'jen', 'message'],
  lead: ['priya', 'lead', 'smile studio', '11'],
  agents: ['agent', 'team', 'overnight'],
  mrr: ['mrr', 'how are we doing'],
  spend: ['spend', 'budget', 'cost'],
  bookings: ['booking', 'calendar', 'gaps', 'appointment'],
  invoices: ['invoice', 'overdue', 'payment', 'pay'],
  make: ['make', 'build', 'website', 'funnel', 'create', 'page'],
  social: ['social', 'post', 'instagram'],
  callers: ['caller', 'pricing', 'voice', 'quote', 'dana', 'mark', 'call them back'],
  idea: ['idea', 'referral', 'dentist'],
  trust: ['on your own', 'on my own', 'allowed', 'permission', 'what can you do', 'never', 'trust', 'ask first'],
  newbiz: ['glow', 'set up', 'from scratch', 'new customer', 'onboard'],
}
$('#bar').onsubmit = (e) => {
  e.preventDefault()
  const v = $('#ask').value.trim()
  $('#ask').value = ''
  if (v) ask(v)
}
/** What still needs you (V2 follows the Focus list: Quiet day and Later count). */
const openNeeds = () => (V2() ? focusItems().filter((it) => heat[it.id] === 'hot' && it.problem) : CARDED.filter((it) => heat[it.id] === 'hot' && it.problem && (!it.only || deskMode === 'one')))
/** What needs you, said out loud on the desk. */
function brief() {
  const open = openNeeds()
  if (!open.length) return deskSay(DYN['d-quiet'])
  const n = ['', 'One thing needs', 'Two things need', 'Three things need', 'Four things need'][open.length] ?? `${open.length} things need`
  deskSay(`${n} you. ${open.map((it) => it.problem).join('. ')}. Say “fix them” and I’ll take care of all of it, or name one.`)
}
/** The desk's ear. Claude when the key is set (see api/intent.js), the built-in rules otherwise. */
const KINDS = { website: 'Website', site: 'Website', page: 'Website', 'landing page': 'Website', 'booking page': 'Website', funnel: 'Funnel', offer: 'Funnel', campaign: 'Campaign', email: 'Campaign', emails: 'Campaign', newsletter: 'Campaign', agent: 'Agent', bot: 'Agent', assistant: 'Agent', 'voice agent': 'Agent' }
const VERB_MAKE = /\b(build|make|create|design|draft|set up|spin up|launch|generate|put together|write|start)\b/
const VERB_ACT = /\b(fix|run|turn|send|set up|do|handle|sort|book|prep|switch|restart|resolve|take care|deal with|go ahead|approve|reply|answer|call)\b/
function deskState() {
  const items = CARDED.filter((it) => !it.only || deskMode === 'one').map((it) => ({ id: it.id, label: it.label, problem: it.problem ?? null, value: it.value ?? null, sub: it.sub ?? null, state: heat[it.id], can: (it.can ?? []).map((c) => c.label) }))
  return { items, drafts: drafts.map((d) => d.title), version: version, inRoom: room ? room.items.map((i) => i.id) : null }
}
let llmOff = false
async function understandLLM(text) {
  if (llmOff || location.protocol === 'file:') return null
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 4000)
    const r = await fetch('/api/intent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, state: deskState() }), signal: ctl.signal })
    clearTimeout(t)
    if (r.status === 503 || r.status === 404 || r.status === 501) { llmOff = true; return null }
    if (!r.ok) return null
    const d = await r.json()
    return d.ok ? d : null
  } catch { return null }
}
function understandRules(text) {
  const t = norm(text)
  const pool = deskMode === 'one' ? ALL : ITEMS
  if (/\b(stop|cancel|never mind|nevermind|close|go back|back to the desk)\b/.test(t)) return { intent: 'close' }
  // Hold, undo and "I'm busy" come before anything that acts, so they can never trigger a fix.
  if (/\b(pause|hold off|hold everything|hold it|freeze|don.?t (run|do|touch|fix|change))\b/.test(t)) return { intent: 'hold', reply: DYN['d-hold'] }
  if (/\b(undo|take (that|it) back|revert|reverse (that|it)|put it back)\b/.test(t)) return { intent: 'undo' }
  if (/\b(i.?m busy|i am busy|not now|remind me (tomorrow|later)|do (it|this|them) later|later today|tomorrow)\b/.test(t) && !/\b(what|bring)\b/.test(t)) return { intent: 'putoff_all' }
  if (/\b(best|top|biggest|largest) (client|clients|account|accounts|customer|customers)\b/.test(t)) return { intent: 'open', target: 'mrr' }
  const kindWord = Object.keys(KINDS).sort((a, b) => b.length - a.length).find((k) => new RegExp(`\\b${k}\\b`).test(t))
  if (kindWord && (VERB_MAKE.test(t) || /\b(i need|i want|can you|could you|new)\b/.test(t))) return { intent: 'build', kind: KINDS[kindWord], brand: (t.match(/\b(glow|harbor|peak)\b/) || [])[1], reply: DYN[`d-make-${KINDS[kindWord].toLowerCase()}`] }
  if (/\bbring\b.*\bback\b/.test(t)) return { intent: 'later_back' }
  if (/\b(put off|postponed|saved for later|later list|what did i (put off|postpone|skip|save)|what.s (on )?later)\b/.test(t)) return { intent: 'later' }
  if (NO.test(t) && !/\bnot now\b/.test(t)) return { intent: 'chat', reply: DYN['d-ok'] }
  if (/\b(dashboard|numbers|everything that.s running|running for you|show me everything|the full desk|metrics|how are we doing|how is business|mrr)\b/.test(t)) return { intent: 'dashboard', reply: DYN['d-dash'] }
  if (/\b(what needs|needs me|what do i need|what should i( do)?|what.s up|whats up|anything (urgent|new|wrong)|brief|good morning|morning|hello|hi|hi there|hey)\b/.test(t) && !/\b(fix|run|turn|send|set up|handle|switch|restart)\b/.test(t)) return { intent: 'brief' }
  // "Everything" alone isn't an order: it needs a doing word ("fix everything"), or to be the whole answer.
  if ((ALL_OF_IT.test(t) && (/\b(fix|handle|sort|run|do|take care|deal with|clear|resolve)\b/.test(t) || /^(everything|all of it|all of them|all three|them all|it all)$/.test(t))) || /^(yes|yeah|yep|go ahead|do it|fix it|ok|okay|sure|please|go)$/.test(t)) return { intent: 'fix_all' }
  // Whole words only: "leads" is not "ads", "agency" is not "agent".
  const has = (k) => new RegExp(`(^|\\b)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?\\b`).test(t)
  const hit = pool.find((it) => (KEYS[it.id] ?? []).some(has))
  if (hit) return { intent: VERB_ACT.test(t) ? 'act' : 'open', target: hit.id }
  if (/\b(fix|handle|sort|run|do|take care of)\b/.test(t) && /\b(them|those|these|all|everything|it all)\b/.test(t)) return { intent: 'fix_all' }
  if (/\b(thank|thanks|cheers|great|nice|perfect|awesome|love it)\b/.test(t)) return { intent: 'chat', reply: DYN['d-thanks'] }
  if (/\b(what can you do|help|how does this work|what are you)\b/.test(t)) return { intent: 'chat', reply: DYN['d-help'] }
  if (/\b(who are you|your name)\b/.test(t)) return { intent: 'chat', reply: DYN['d-who'] }
  if (/\b(focus|what needs me|back to the list)\b/.test(t)) return { intent: 'focus' }
  return { intent: 'chat', reply: V2() ? DYN['d-catch-desk'] : FALLBACK.t }
}
let guessEl = null
const tri = (s) => { const x = norm(s).replace(/[^a-z0-9]/g, ''); const out = new Set(); for (let i = 0; i < x.length - 2; i++) out.add(x.slice(i, i + 3)); return out }
const sim = (a, b) => { const A = tri(a), B = tri(b); let n = 0; A.forEach((g) => B.has(g) && n++); return n / Math.max(1, A.size + B.size - n) }
function guesses(text, alts = []) {
  const open = openNeeds()
  const C = ['Fix them all', 'What needs me?', 'Build me a website', 'Build me a funnel', 'Show me the dashboard', ...open.map((it) => `Fix ${lower(it.problem)}`)]
  const all = [text, ...alts]
  const ranked = C.map((c) => [c, Math.max(...all.map((a) => sim(a, c)))]).sort((x, y) => y[1] - x[1])
  const out = ranked.slice(0, 3).map(([c]) => c)
  out.score = ranked[0]?.[1] ?? 0
  return out
}
function showGuess(heardText, opts, cant = false) {
  guessEl?.remove()
  document.body.insertAdjacentHTML('beforeend', `<div class="guess" id="guess" role="dialog"><div class="q">${cant ? `I can’t do <i>“${esc(heardText)}”</i> yet. Here’s what I can do:` : `I heard <i>“${esc(heardText)}”</i>. Did you mean:`}</div><div class="opts">${opts.map((o, i) => `<button type="button" class="chip${i ? '' : ' main'}" data-g="${esc(o)}">${esc(o)}</button>`).join('')}<button type="button" class="chip" data-g="">Say it again</button></div></div>`)
  guessEl = $('#guess')
  guessEl.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { const g = b.dataset.g; guessEl?.remove(); guessEl = null; if (g) ask(g); else deskHandsFree() }))
  const me = guessEl
  setTimeout(() => { if (guessEl === me) { me.remove(); guessEl = null } }, 15000)
}
async function ask(text, alts = []) {
  clearTimeout(toastT)
  if ($('#toast')) $('#toast').hidden = true
  if (guessEl) {
    const first = guessEl.querySelector('[data-g]')?.dataset.g
    guessEl.remove()
    guessEl = null
    if (first && /^(yes|yeah|yep|yup|that one|the first one|first one|ok|okay|sure|correct|right)\b/.test(norm(text))) return ask(first)
  }
  let u = await understandLLM(text)
  if (!u) {
    u = understandRules(text)
    if (u.reply === DYN['d-catch-desk']) for (const a of alts) { const v = understandRules(a); if (v.reply !== DYN['d-catch-desk']) { u = v; break } }
  }
  if (V2() && u.intent === 'chat' && u.reply === DYN['d-catch-desk']) {
    // Close to something we can do: offer the nearest. Nothing close: say so honestly and show what we can do.
    const g = guesses(text, alts)
    if (g.score < 0.18) {
      showGuess(text, ['What needs me?', 'Fix them all', 'Show me the dashboard'], true)
      return deskSay(DYN['d-cant'], true)
    }
    showGuess(text, g)
    return deskSay(DYN['d-catch-short'], true)
  }
  act(u, text)
}
function act(u, text) {
  // Desk things asked from inside a room: close the room first, then do them on the desk.
  if (room && ['dashboard', 'focus', 'later', 'later_back', 'brief', 'putoff_all'].includes(u.intent)) { closeRoom(); return setTimeout(() => act(u, text), 750) }
  if (room && u.intent === 'chat') return say({ id: clipFor(u.reply ?? DYN['d-ok']), t: u.reply ?? DYN['d-ok'] })
  const it = u.target ? ALL.find((i) => i.id === u.target) : null
  const from = (id) => cards[id]?.offsetParent ? cards[id] : $(`.fit[data-fopen='${id}']`)
  switch (u.intent) {
    case 'brief': return brief()
    case 'fix_all': return fixAll()
    case 'act': if (it) return openRoom([it], from(it.id), { direct: healIndex(it) }); break
    case 'open': if (it) return openRoom([it], from(it.id)); break
    case 'build': {
      // Named the client too ("a landing page for Peak")? Skip the question and start building it.
      const kind = BUILDS[u.kind] ? u.kind : 'Website'
      const di = u.brand ? BUILDS[kind].findIndex((c) => c.id.endsWith(`-${u.brand}`)) : -1
      return openRoom([ITEMS.find((i) => i.id === 'make')], $('[data-fmake]') ?? $('#makeChips'), di >= 0 ? { kind, direct: di } : { kind })
    }
    case 'dashboard': if (V2()) setV2View('dash'); return deskSay(u.reply ?? DYN['d-dash'])
    case 'focus': if (V2()) setV2View('focus'); return deskSay(u.reply ?? DYN['d-focus'])
    case 'close':
      if (room) return closeRoom()
      if (V2() && v2view === 'dash') { setV2View('focus'); return deskSay(DYN['d-focus']) }
      return deskSay(DYN['d-home'])
    case 'hold': autoRun = false; if (room) closeRoom(); return deskSay(DYN['d-hold'])
    case 'undo': return undoLast(true)
    case 'putoff_all': {
      const open = openNeeds()
      if (!open.length) return deskSay(DYN['d-quiet'])
      open.forEach((x) => { heat[x.id] = 'later'; if (cards[x.id]) cards[x.id].dataset.heat = 'later' })
      if (desk.hasAttribute('data-v2')) renderFocus()
      placeV2Later()
      return deskSay(DYN['d-putoff-all'])
    }
    case 'later': { const items = laterItems(); openLater([...document.querySelectorAll('[data-later-open]')].find((e) => e.offsetParent)); if (items.length) deskSay(`${DYN['d-later']} ${items.map((i) => i.problem).join('. ')}.`); return }
    case 'later_back': { const items = laterItems(); if (!items.length) return deskSay(DYN['d-later-none']); items.forEach(bringBack); closeLater(); if (desk.hasAttribute('data-v2')) renderFocus(); placeV2Later(); return deskSay(DYN['d-back']) }
  }
  return deskSay(u.reply ?? DYN['d-ok'])
}
/** The desk talks back: a toast you can read, and the voice. Fixed lines have a recorded clip; free text is made on the fly. */
const L = (id) => ({ id, t: DYN[id] })
const clipFor = (text) => Object.entries(DYN).find(([, t]) => t === text)?.[0] ?? null
function deskSay(text, quiet = false) {
  if (!quiet) toast(text)
  pushThread({ who: 'ai', text })
  stopHandsFree()
  if ($('#bar')?.dataset.listen !== 'got') setListen('')
  const go = { onAmp: (a) => stitch?.amp(a), onEnd: () => setTimeout(deskHandsFree, 300) }
  const id = clipFor(text)
  if (id && DUR[id]) speak({ id, t: text }, go)
  else speakDyn(text, go)
}
const HINT0 = $('#barHint')?.textContent ?? ''
let chimed = false
function chime() {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)()
    const now = actx.currentTime
    ;[[660, 0], [880, 0.11]].forEach(([f, d]) => {
      const o = actx.createOscillator(), g = actx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0, now + d)
      g.gain.linearRampToValueAtTime(0.06, now + d + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.22)
      o.connect(g).connect(actx.destination)
      o.start(now + d)
      o.stop(now + d + 0.25)
    })
  } catch {}
}
/** V2: what the ask bar says about the mic. on · hearing · grace · got · off · (none) */
function setListen(s, ms) {
  const b = $('#bar')
  if (!b || !V2()) return
  const was = b.dataset.listen
  if (s) b.dataset.listen = s
  else delete b.dataset.listen
  if (ms) b.style.setProperty('--grace', `${ms}ms`)
  if (s === 'on' && !['on', 'hearing', 'grace'].includes(was) && !muted) chime()
  if (!s || s === 'on' || s === 'off' || s === 'idle') $('#barLive').innerHTML = ''
  const h = $('#barHint')
  if (!h) return
  if (s === 'on' || s === 'hearing') h.innerHTML = `<span class="ldot"></span><b>Mic is on.</b> Ask me anything, or say “fix them”.<span class="lchips">${['Fix them', 'What needs me?', 'Build me a website'].map((t) => `<button type="button" data-say="${t}">“${t}”</button>`).join('')}</span>`
  else if (s === 'grace') h.innerHTML = '<span class="ldot"></span>Still listening… keep going, or I’ll go in a second'
  else if (s === 'got') h.innerHTML = '<i class="ti ti-check"></i> Got it'
  else if (s === 'idle') h.innerHTML = '<i class="ti ti-microphone-off"></i> Mic is resting. <b>Tap the mic</b> to talk, or type.'
  else if (s === 'off') h.innerHTML = SR ? 'Mic is off. <b>Type below</b>, or <button type="button" class="lon">turn on the mic</button> to talk.' : 'Voice works in Chrome. <b>Type below.</b>'
  else h.textContent = HINT0
  h.querySelectorAll('[data-say]').forEach((x) => (x.onclick = () => ask(x.dataset.say)))
  const on = h.querySelector('.lon')
  if (on) on.onclick = () => askForMic(true)
}
const deskStatus = (s) => {
  if (!V2()) { const a = $('#ask'); if (a) a.placeholder = s === 'listening' ? 'Listening… just talk' : 'Ask your desk anything…'; $('#bar')?.classList.toggle('live', s === 'listening'); return }
  if (s === 'listening' || s === 'take your time') setListen('on')
}
/** Each burst of words kicks the equaliser, so it moves with your voice. */
function kickEq() {
  document.querySelectorAll('.bar-wave i').forEach((b, i) => b.style.setProperty('--h', `${6 + Math.round(Math.random() * 16)}px`))
}
const deskInterim = (fin, live) => {
  kickEq()
  $('#barLive').innerHTML = `<span class="heard">${esc(fin)}</span> <span class="live">${esc(live)}</span>`
  setListen('hearing')
}
const deskGrace = (on, ms) => setListen(on ? 'grace' : 'hearing', ms)
const deskGot = (text) => {
  $('#barLive').innerHTML = `<span class="heard">${esc(text)}</span>`
  setListen('got')
  setTimeout(() => { if ($('#bar').dataset.listen === 'got') setListen(activeRec && !voice && !room ? 'on' : '') }, 1400)
}
const deskOpts = (extra = {}) => ({ onInterim: deskInterim, onGrace: deskGrace, onFinal: deskGot, onTapOff: () => setListen('idle'), ...extra })
/** V2: the desk listens on its own once you're in, so you can just say what to do. */
let micOK = false
let deskMiss = 0
const MISSES = 2
function deskHandsFree(cont = false) {
  if (!V2() || room || !SR || !micOK || voice || phoneOn) return
  if (activeRec) return
  if (!cont) deskMiss = 0
  if (typeof hf === 'number') clearTimeout(hf)
  hf = null
  const btn = askbox === 'panel' ? $('#pmic') : $('#mic')
  if (!btn) return
  const token = {}
  hf = token
  listen(btn, (t, alts) => ask(t, alts), deskStatus, deskOpts({
    hf: true,
    onDenied: () => { if (hf === token) hf = null; micOK = false; setListen('off') },
    willRestart: () => hf === token && !room && deskMiss + 1 < MISSES,
    onEnd: (got) => {
      if (hf !== token || room) return
      if (got) { deskMiss = 0; hf = setTimeout(() => { if (hf) deskHandsFree(true) }, 600); return }
      if (++deskMiss >= MISSES) { hf = null; return setListen('idle') }
      hf = setTimeout(() => { if (hf) deskHandsFree(true) }, 60)
    },
  }))
}
async function askForMic(fromTap = false) {
  if (!V2()) return
  if (!SR || !navigator.mediaDevices?.getUserMedia) return setListen('off')
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    s.getTracks().forEach((t) => t.stop())
    micOK = true
    if (!voice && !room) deskHandsFree()
  } catch {
    micOK = false
    setListen('off')
    if (fromTap) toast('The browser is blocking the microphone. Click the icon left of the address, allow Microphone, then try again.')
  }
}
$('#mic').onclick = () => listen($('#mic'), (t, alts) => ask(t, alts), deskStatus, deskOpts({ onEnd: (got) => got && setTimeout(deskHandsFree, 300) }))


// ── Prototype option: Version · V1 | V2 (Rich's feedback, Nov 3) ─────────────
// V2: landing is only what needs you (a light stack) with the dashboard folded into a chip; the chip
// opens the desk as it was, with a Back link. The room listens the moment it opens and pauses when
// you're quiet. The expanded draft has a chat to change it. When nothing needs you, an open space.
let version = store.get('desk-version') === '2' ? '2' : '1'
let day = store.get('desk-day') === 'quiet' ? 'quiet' : 'busy'
let v2view = 'focus'
let landing = ['sentence', 'sheet'].includes(store.get('desk-brief')) ? store.get('desk-brief') : 'list'
let briefSig = ''
// Phone sentence: the words light up once the AI's voice actually starts (it may wait for a first tap).
let karaPending = false
let karaT = 0
addEventListener('deskvoice', () => {
  if (!karaPending) return
  const p = document.querySelector('#focus:not([hidden]) .fsent.fkara')
  if (!p) return
  karaPending = false
  clearTimeout(karaT)
  const ws = [...p.querySelectorAll('.fw')]
  const cap = p.parentElement.querySelector('.fcap')
  p.classList.remove('done')
  cap?.classList.add('speaking')
  ws.forEach((w, i) => setTimeout(() => w.classList.add('on'), 120 + i * 230))
  setTimeout(() => { p.classList.add('done'); cap?.classList.remove('speaking') }, 120 + ws.length * 230 + 300)
})
let dstyle = ['ribbon', 'timeline'].includes(store.get('desk-dstyle')) ? store.get('desk-dstyle') : 'columns'
let tlTimer = 0
const V2 = () => version === '2'
const VERSION_HINTS = { 1: 'The desk as built so far: three columns, the room opens on a click.', 2: 'Rich’s feedback.' }
const DAY_HINTS = { busy: 'Three things need you.', quiet: 'Nothing needs you: the open space.' }
const focusEl = $('#focus')
const focusItems = () => (day === 'quiet' ? [] : hotItems().filter((it) => heat[it.id] !== 'later'))
const byId = (id) => ALL.find((i) => i.id === id)
function chipDash() {
  const n = (id) => byId(id)?.value ?? ''
  return `<button type="button" class="chipdash" id="chipdash"><span><b>${n('mrr')}</b>MRR</span><span><b>${n('bookings')}</b>bookings</span><span><b>${n('agents')}</b>agents</span><span><b>${byId('spend')?.viz?.pct ?? 77}%</b>AI spend</span><span class="o">Dashboard <i class="ti ti-arrow-right"></i></span></button>`
}
// Later: what you put off stays one tap away, with Bring back.
const laterItems = () => CARDED.filter((it) => heat[it.id] === 'later' && it.problem && (!it.only || deskMode === 'one'))
const laterChip = () => { const n = laterItems().length; return n ? `<button type="button" class="chiplater" data-later-open><i class="ti ti-clock"></i>Later · ${n}</button>` : '' }
function bringBack(it) {
  heat[it.id] = it.heat
  const c = cards[it.id]
  if (c) {
    c.dataset.heat = it.heat
    const acts = c.querySelector('.acts')
    if (acts) acts.innerHTML = `<button type="button" class="go1" data-act="${it.id}">${it.act}</button><button type="button" class="go2" data-later="${it.id}">Later</button>`
  }
}
function closeLater() { $('#laterpop')?.remove() }
function openLater(from) {
  closeLater()
  const items = laterItems()
  if (!items.length) return deskSay(DYN['d-later-none'])
  document.body.insertAdjacentHTML('beforeend', `<div class="laterpop" id="laterpop" role="dialog" aria-label="Put off for later">
    <div class="lp-head"><span class="eb">Put off · ${items.length}</span><button type="button" class="lp-x" aria-label="Close"><i class="ti ti-x"></i></button></div>
    ${items.map((it) => `<div class="lp-row"><div class="lp-t"><b>${it.problem}</b><small>${it.cost ?? it.sub ?? ''}</small></div><button type="button" class="chip" data-back="${it.id}">Bring back</button></div>`).join('')}
    ${items.length > 1 ? '<button type="button" class="chip main lp-all" data-back-all>Bring all back</button>' : ''}
    <p class="lp-note">I’ll bring these up again in tomorrow’s brief.</p></div>`)
  const pop = $('#laterpop')
  const r = from?.getBoundingClientRect?.()
  if (r && r.width && innerWidth > 760) { pop.style.left = `${Math.min(innerWidth - 340, Math.max(12, r.left))}px`; pop.style.top = `${r.bottom + 8}px` }
  pop.querySelector('.lp-x').onclick = closeLater
  const done = (msg) => { closeLater(); if (desk.hasAttribute('data-v2')) renderFocus(); if (desk.hasAttribute('data-front')) renderFront(); placeV2Later(); toast(msg) }
  pop.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => { bringBack(ALL.find((i) => i.id === b.dataset.back)); done('Back on your list.') }))
  pop.querySelector('[data-back-all]')?.addEventListener('click', () => { laterItems().forEach(bringBack); done('All back on your list.') })
  setTimeout(() => addEventListener('pointerdown', function off(e) { if (!pop.isConnected) return removeEventListener('pointerdown', off); if (!pop.contains(e.target) && !e.target.closest('[data-later-open]')) { closeLater(); removeEventListener('pointerdown', off) } }), 0)
}
/** The dashboard's Back row also carries the Later chip. */
function placeV2Later() {
  const top = $('#dashtop')
  if (!top) return
  top.querySelector('[data-later-open]')?.remove()
  top.insertAdjacentHTML('beforeend', laterChip())
  top.querySelector('[data-later-open]')?.addEventListener('click', (e) => openLater(e.currentTarget))
}
function renderFocus() {
  focusEl?.classList.remove('fsheet-on')
  if (!focusEl || focusEl.hidden) { if (V2() && v2view === 'dash' && dstyle !== 'columns') renderDalt(); return }
  const items = focusItems()
  const open = items.filter((it) => heat[it.id] !== 'done')
  const line = document.querySelector('.hello .line')
  // The panel's marks follow the stack: red per open thing, green when done, gone when nothing needs you.
  const marks = document.querySelector('.hello .marks')
  if (marks) marks.hidden = true
  if (!open.length) {
    const doneN = items.filter((it) => heat[it.id] === 'done').length
    focusEl.innerHTML = `<div class="fempty"><div class="forb"><i></i><i></i><i></i></div>
      <h1 class="fbig">Hi Maya. <em>${doneN ? 'All done' : 'Nothing needs you'}</em> today.</h1>
      <p>Want a hand with something?</p>
      <div class="fsug"><button type="button" class="chip" data-fask="new leads">Find new leads</button><button type="button" class="chip" data-fask="social posts">Draft next week’s posts</button><button type="button" class="chip" data-fmake="Website">Build a page</button><button type="button" class="chip" data-ftalk><i class="ti ti-microphone"></i> Just talk</button></div>
      <div class="frow">${chipDash()}${laterChip()}</div></div>`
    if (line) line.innerHTML = doneN ? '<b>All done.</b> Nothing circled.' : '<b>All quiet.</b> Nothing circled.'
  } else if (landing === 'sentence' || landing === 'sheet') {
    const words = ['', 'One thing needs', 'Two things need', 'Three things need', 'Four things need'][open.length] ?? `${open.length} things need`
    const low = (s) => s.charAt(0).toLowerCase() + s.slice(1)
    const done = items.filter((it) => heat[it.id] === 'done')
    const T = (cls, txt, id) => ({ cls, txt, id })
    const parts = ['Morning, Maya. Overnight your team handled ', T('ok', '61 things', ''), `. ${words} you: `]
    open.forEach((it, i) => {
      if (i) parts.push(i === open.length - 1 ? ', and ' : ', ')
      parts.push(T('hot', low(it.problem), it.id))
      if (it.cost) parts.push(' ', T('cost', it.cost, it.id))
    })
    parts.push('.')
    if (done.length) { parts.push(' Already fixed: '); done.forEach((it, i) => { if (i) parts.push(', '); parts.push(T('ok', `✓ ${low(it.problem)}`, it.id)) }); parts.push('.') }
    parts.push(' Revenue is up ', T('num', '6.2% this month', 'dash'), '.')
    // In the sheet the greeting is already the heading, so the brief starts with the news.
    if (landing === 'sheet' && (inPhone || matchMedia('(max-width: 760px)').matches)) parts[0] = 'Overnight your team handled '
    const sig = parts.map((p) => (typeof p === 'string' ? p : p.txt)).join('')
    // Screen readers get the finished sentence once, not every word as it's typed.
    setTimeout(() => { const sr = focusEl.querySelector('.sr-only'); if (sr) sr.textContent = sig }, 50)
    // Sheet (phones): a calm greeting with the orb up top, the brief in a sheet under your thumb.
    const sheet = landing === 'sheet' && (inPhone || matchMedia('(max-width: 760px)').matches)
    focusEl.classList.toggle('fsheet-on', sheet)
    const fixBtn = `<button type="button" class="chip main" data-ffix>${open.length > 1 ? `Fix all ${open.length}` : `${open[0].act}`}</button>`
    const talkBtn = '<button type="button" class="chip" data-ftalk><i class="ti ti-microphone"></i> Just talk</button>'
    if (sheet) focusEl.innerHTML = `<div class="fsheet-hero"><span class="fsheet-orb"><span class="creature fsv1"><i></i><i></i><i></i><b></b></span></span><h1>Morning, Maya.</h1><span class="eb">${words} you</span></div>
      <div class="fsheet"><span class="fsheet-grab"></span><p class="fsent" aria-hidden="true"></p><p class="sr-only" aria-live="polite"></p>
      <div class="fsent-chips">${fixBtn}${talkBtn}<button type="button" class="chip" id="chipdash"><i class="ti ti-layout-dashboard"></i> Dashboard</button>${laterChip()}</div></div>`
    else focusEl.innerHTML = `<div class="fcap"><span class="eb">Needs you · ${open.length}</span><span class="fspk" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div><p class="fsent" aria-hidden="true"></p><p class="sr-only" aria-live="polite"></p>
      <div class="fsent-chips"><button type="button" class="chip main" data-ffix>${open.length > 1 ? `Fix all ${open.length}` : `${open[0].act}`}</button><button type="button" class="chip" data-ftalk><i class="ti ti-microphone"></i> Just talk</button></div>
      <div class="frow">${chipDash()}${laterChip()}</div>
      <p class="fmake"><b>Make something</b> ${['Website', 'Funnel', 'Campaign', 'Agent'].map((m) => `<button type="button" class="ln" data-fmake="${m}">${m}</button>`).join(' · ')}</p>`
    if (line) line.innerHTML = `<b>${words} you.</b> Everything else is running.`
    const p = focusEl.querySelector('.fsent')
    const tok = (t) => { const b = document.createElement('button'); b.type = 'button'; b.className = `ftok ${t.cls}`; b.textContent = t.txt; if (t.id) b.dataset.ftok = t.id; return b }
    const instant = sig === briefSig || matchMedia('(prefers-reduced-motion: reduce)').matches
    if (instant) briefSig = sig
    const phoneMode = inPhone || matchMedia('(max-width: 760px)').matches
    if (instant && !phoneMode) parts.forEach((x) => p.append(typeof x === 'string' ? x : tok(x)))
    else if (phoneMode) {
      // On a phone the whole sentence lands at once (a glance is enough). As the AI speaks, each word
      // lights up, like captions. If no voice starts (blocked or muted), it simply shows in full.
      p.classList.add('fkara')
      parts.forEach((x) => {
        if (typeof x !== 'string') { const t = tok(x); t.classList.add('fw'); return p.append(t) }
        x.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) return p.append(w); const s = document.createElement('span'); s.className = 'fw'; s.textContent = w; p.append(s) })
      })
      if (!instant) {
        briefSig = sig
        karaPending = true
        clearTimeout(karaT)
        karaT = setTimeout(() => focusEl.querySelector('.fsent.fkara')?.classList.add('done'), 3500)
      } else if (!karaPending) p.classList.add('done')
    }
    else {
      const caret = document.createElement('span'); caret.className = 'fcaret'; p.append(caret)
      let i = 0
      const step = () => {
        if (!p.isConnected) return
        if (i >= parts.length) { briefSig = sig; return setTimeout(() => caret.remove(), 1600) }
        const x = parts[i++]
        if (typeof x !== 'string') { caret.before(tok(x)); return setTimeout(step, 180) }
        const w = x.split(/(\s+)/); let k = 0
        const t = () => { if (!p.isConnected) return; if (k >= w.length) return step(); caret.before(w[k++]); setTimeout(t, 38) }
        t()
      }
      step()
    }
    p.onclick = (e) => { const b = e.target.closest('[data-ftok]'); if (!b) return; if (b.dataset.ftok === 'dash') return setV2View('dash'); const it = byId(b.dataset.ftok); if (it && heat[it.id] !== 'done') openRoom([it], b) }
    focusEl.querySelector('[data-ffix]').onclick = () => (open.length > 1 ? fixAll() : openRoom([open[0]], focusEl.querySelector('[data-ffix]'), { direct: 0 }))
  } else {
    const words = ['', 'One thing needs', 'Two things need', 'Three things need', 'Four things need'][open.length] ?? `${open.length} things need`
    focusEl.innerHTML = `<div class="fcap"><span class="eb">Needs you · ${open.length}</span></div><h1 class="fh1">${words} you.<small>Everything else is running.</small></h1>
      <div class="fstack">${items.map((it) => {
        const done = heat[it.id] === 'done'
        return `<div class="fit${done ? ' done' : ''}" data-fopen="${it.id}"><i class="fdot"></i><div class="ft"><span class="ftt">${it.problem}</span><small>${done ? `<i class="ti ti-check"></i> ${it.receipt ?? 'Done'}` : `${it.cause ? it.cause.split(' · ').slice(0, 2).join(' · ') : it.sub}${it.cost ? ` · <b>${it.cost}</b>` : ''}`}</small></div>${done ? '' : `<button type="button" class="fact" data-fact="${it.id}">${it.act}</button><button type="button" class="flater" data-flater="${it.id}" aria-label="Later">Later</button>`}</div>`
      }).join('')}</div>
      <div class="frow">${chipDash()}${laterChip()}</div>
      <p class="fmake"><b>Make something</b> ${['Website', 'Funnel', 'Campaign', 'Agent'].map((m) => `<button type="button" class="ln" data-fmake="${m}">${m}</button>`).join(' · ')}</p>`
    if (line) line.innerHTML = `<b>${words} you.</b> Everything else is running.`
  }
  focusEl.querySelectorAll('[data-fopen]').forEach((row) => (row.onclick = (e) => { if (e.target.closest('button')) return; openRoom([byId(row.dataset.fopen)], row) }))
  focusEl.querySelectorAll('[data-fact]').forEach((b) => (b.onclick = () => openRoom([byId(b.dataset.fact)], b.closest('.fit'), { direct: 0 })))
  focusEl.querySelectorAll('[data-flater]').forEach((b) => (b.onclick = () => { const it = byId(b.dataset.flater); heat[it.id] = 'later'; if (cards[it.id]) cards[it.id].dataset.heat = 'later'; toast(`Okay. I’ll bring “${it.problem}” back tomorrow morning.`); renderFocus() }))
  focusEl.querySelectorAll('[data-fmake]').forEach((b) => (b.onclick = () => openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: b.dataset.fmake })))
  focusEl.querySelectorAll('[data-fask]').forEach((b) => (b.onclick = () => ask(b.dataset.fask)))
  focusEl.querySelectorAll('[data-ftalk]').forEach((b) => (b.onclick = () => { const m = askbox === 'panel' ? $('#pmic') : $('#mic'); if (m.classList.contains('live')) return setListen('on'); listen(m, (t, alts) => ask(t, alts), deskStatus, deskOpts({ onEnd: (got) => got && setTimeout(deskHandsFree, 300) })) }))
  const cd = $('#chipdash')
  if (cd) cd.onclick = () => setV2View('dash')
  focusEl.querySelectorAll('[data-later-open]').forEach((b) => (b.onclick = () => openLater(b)))
  placeV2Later()
}
function setV2View(v) {
  v2view = v
  placeV2()
  if (v === 'dash') desk.scrollTo({ top: 0 })
  if (v === 'dash' && layout === 'scribble' && dstyle === 'columns') setTimeout(() => (look === 'editorial' ? placeBoard() : scatter()), 50)
}
function placeV2() {
  const on = V2()
  desk.toggleAttribute('data-v2', on)
  desk.dataset.v2view = on ? v2view : ''
  focusEl.hidden = !on || v2view !== 'focus'
  $('#dashtop').hidden = !on || v2view !== 'dash'
  const alt = on && v2view === 'dash' && dstyle !== 'columns'
  if (alt) desk.dataset.dstyle = dstyle
  else delete desk.dataset.dstyle
  $('#dalt').hidden = !alt
  if (alt) renderDalt(); else clearInterval(tlTimer)
  if (on && v2view === 'focus') renderFocus()
  else if (!on) { const line = document.querySelector('.hello .line'); if (line && deskMode !== 'one') line.innerHTML = '<b>Three things need you.</b> Everything else is running.'; const m = document.querySelector('.hello .marks'); if (m) { m.hidden = false; m.innerHTML = '<i class="hot"></i>'.repeat(3) + '<i></i>'.repeat(3) } }
}
function setVersion(v) {
  // V3 (the Timeline concept) is its own app in v3/, built from cerebro-timeline. It keeps the same options.
  if (v === '3') { store.set('desk-version', '3'); location.href = 'v3/' + (inPhone ? '?phone=1' : ''); return }
  version = v
  store.set('desk-version', v)
  document.body.dataset.v = v
  document.querySelectorAll('[data-version]').forEach((b) => b.setAttribute('aria-selected', b.dataset.version === v))
  $('#pbHint0').textContent = VERSION_HINTS[v]
  $('#pbDay').hidden = v !== '2'
  $('#pbHintDay').hidden = v !== '2'
  $('#pbBrief').hidden = v !== '2'
  $('#pbDash').hidden = v !== '2'
  $('#pbPresence') && ($('#pbPresence').hidden = v !== '2')
  if (typeof presence !== 'undefined') setPresenceStyle(v === '2' ? presence : 'orb')
  $('#segDevice').hidden = v !== '2'
  if (v !== '2') { setPhone(false); stopHandsFree() }
  else {
    loadKokoro()
    // Don't pop the browser's mic prompt on landing. If the mic is already allowed, start listening;
    // otherwise the bar offers "turn on the mic" and we ask when you tap it.
    if (!micOK) navigator.permissions?.query({ name: 'microphone' }).then((p) => { if (p.state === 'granted') askForMic() }).catch(() => {})
  }
  v2view = 'focus'
  placeV2()
}
function setDay(v) {
  day = v
  store.set('desk-day', v)
  document.querySelectorAll('[data-day]').forEach((b) => b.setAttribute('aria-selected', b.dataset.day === v))
  $('#pbHintDay').textContent = DAY_HINTS[v]
  placeV2()
}
document.querySelectorAll('[data-version]').forEach((b) => (b.onclick = () => setVersion(b.dataset.version)))
document.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => setDay(b.dataset.day)))
function setBrief(v) {
  if (!V2()) setVersion('2')
  landing = v
  store.set('desk-brief', v)
  briefSig = ''
  document.querySelectorAll('[data-brief]').forEach((b) => b.setAttribute('aria-selected', b.dataset.brief === v))
  placeV2()
}
document.querySelectorAll('[data-brief]').forEach((b) => (b.onclick = () => setBrief(b.dataset.brief)))
function setDstyle(v) {
  if (!V2()) setVersion('2')
  dstyle = v
  store.set('desk-dstyle', v)
  document.querySelectorAll('[data-dstyle]').forEach((b) => b.setAttribute('aria-selected', b.dataset.dstyle === v))
  if (V2()) setV2View('dash')
}
document.querySelectorAll('[data-dstyle]').forEach((b) => { b.setAttribute('aria-selected', b.dataset.dstyle === dstyle); b.onclick = () => setDstyle(b.dataset.dstyle) })

// V2 · Dashboard options without cards. Ribbon: numbers across the top, one list by urgency.
// Day: today on a time axis, what the AI did left of now, what it plans right, what needs you pinned.
const daltEl = $('#dalt')
const DASH_RIB = ['mrr', 'spend', 'bookings', 'agents', 'social']
const RIB_SUB = { mrr: '+6.2% on Sept', spend: '77% of $2,500', bookings: '3 gaps this pm', agents: '4 working now', social: 'next post' }
const RIB_TIP = {
  mrr: 'Monthly recurring revenue across all your clients.',
  spend: 'What your AI agents cost this month, against your $2,500 budget.',
  bookings: 'Appointments booked across clients today, and the open slots left.',
  agents: 'Your AI team: 27 agents, and how many are working right now.',
  social: 'When your next social post goes out, and this week’s plan.',
}
const RIB_LBL = { mrr: 'Agency MRR', spend: 'AI spend · Oct', bookings: 'Bookings today', agents: 'AI team', social: 'Social' }
const SHORT = { revenue: 'Ads paused · widget broke', ads: 'Card on file expired', calls: '14 clinics', reviews: 'Replies drafted', voicemail: '0:48 voicemail', lead: 'Dr. Priya Nair', invoices: 'Reminders drafted', callers: 'Both about pricing' }
const TAG = { revenue: '−$4.8k/mo', ads: '−$2.4k/mo', calls: '+18%', reviews: '6 days', voicemail: 'today', lead: '11:00', invoices: '$2,140', callers: 'today' }
const dashList = () => CARDED.filter((it) => (it.heat === 'hot' || it.heat === 'warm') && it.problem && (!it.only || deskMode === 'one') && heat[it.id] !== 'later')
  .sort((a, b) => (a.heat === b.heat ? 0 : a.heat === 'hot' ? -1 : 1))
function wireDalt() {
  daltEl.querySelectorAll('[data-dopen]').forEach((r) => (r.onclick = (e) => { const btn = e.target.closest('button'); if (btn && btn !== r) return; const it = byId(r.dataset.dopen); if (it) openRoom([it], r) }))
  daltEl.querySelectorAll('[data-dact]').forEach((b) => (b.onclick = () => { const it = byId(b.dataset.dact); if (it) openRoom([it], b, { direct: 0 }) }))
}
/** A tiny chart for a number, from the data it already has. */
function vizMini(it) {
  const v = it?.viz
  if (!v) return ''
  if (v.kind === 'area' && v.points) {
    const p = v.points, lo = Math.min(...p), hi = Math.max(...p), W = 96, H = 22
    const pts = p.map((y, i) => `${((i / (p.length - 1)) * W).toFixed(1)},${(H - 2 - ((y - lo) / Math.max(1, hi - lo)) * (H - 4)).toFixed(1)}`).join(' ')
    return `<svg class="dviz" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  }
  if (v.kind === 'gauge') return `<span class="dviz dbar"><i style="width:${Math.min(100, v.pct)}%"></i></span>`
  if (v.kind === 'slots') return `<span class="dviz dslots">${v.slots.map((s) => `<i${s ? ' class="on"' : ''}></i>`).join('')}</span>`
  if (v.kind === 'ring') return `<span class="dviz ddots">${Array.from({ length: 14 }, (_, i) => `<i${v.on.some((o) => Math.floor((o / v.n) * 14) === i) ? ' class="on"' : ''}></i>`).join('')}</span>`
  if (v.kind === 'week') return `<span class="dviz dweek">${v.days.map((d, i) => `<i class="${v.state[i]}">${d}</i>`).join('')}</span>`
  return ''
}
/** Make something + Made today, shared by Ribbon and Day. */
function daltMake() {
  return `<div class="dmake"><span class="eb">Make something</span>${MAKE.map(([ic, t]) => `<button type="button" class="chip" data-dmake="${t}"><i class="ti ${ic}"></i>${t}</button>`).join('')}</div>`
}
function daltMade() {
  if (!drafts.length) return ''
  return `<div class="dmade"><div class="rhead"><span class="eb">Made today</span><span class="eb">${drafts.length} ${drafts.length > 1 ? 'drafts' : 'draft'}</span></div>${drafts.map((d, i) => `<div class="rr" data-dview="${i}" data-h="made"><i class="rdot"></i><div class="rt"><b>${d.title}</b><small>${d.published ? 'Live' : 'Draft 1'} · ${d.at}</small></div><button type="button" class="rbtn" data-dview="${i}">Open</button>${d.published ? '' : `<button type="button" class="rbtn main" data-dpub="${i}">Publish</button>`}</div>`).join('')}</div>`
}
function wireDaltExtras() {
  daltEl.querySelectorAll('[data-dmake]').forEach((b) => (b.onclick = () => openRoom([ITEMS.find((i) => i.id === 'make')], b, { kind: b.dataset.dmake })))
  daltEl.querySelectorAll('[data-dview]').forEach((b) => (b.onclick = (e) => { if (b.tagName !== 'BUTTON' && e.target.closest('button')) return; e.stopPropagation(); openPop(drafts[+b.dataset.dview], b.getBoundingClientRect()) }))
  daltEl.querySelectorAll('[data-dpub]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const d = drafts[+b.dataset.dpub]; d.published = true; renderDrafts(); toast(`Published. ${d.title} is live.`) }))
}
function renderDalt() {
  clearInterval(tlTimer)
  if (dstyle === 'ribbon') renderRibbon()
  else renderTimeline()
  wireDalt()
  wireDaltExtras()
}
function renderRibbon() {
  const list = dashList()
  const rib = DASH_RIB.map((id) => { const it = byId(id); return it ? `<button type="button" class="rk" data-dopen="${id}" aria-label="${RIB_LBL[id]}: ${it.value}. ${RIB_TIP[id]} Tap to ask the AI."><span class="rk-tip" role="tooltip">${RIB_TIP[id]}<em><i class="ti ti-sparkles"></i> Tap to ask the AI</em></span><span class="eb">${RIB_LBL[id]}</span><b>${it.value}</b><small>${RIB_SUB[id] ?? it.sub}</small>${vizMini(it)}</button>` : '' }).join('')
  const row = (it) => {
    const done = heat[it.id] === 'done'
    return `<div class="rr${done ? ' done' : ''}" data-dopen="${it.id}" data-h="${it.heat}"><i class="rdot"></i><div class="rt"><b>${it.problem}</b><small>${done ? `<i class="ti ti-check"></i> ${it.receipt ?? 'Done'}` : SHORT[it.id] ?? it.sub ?? ''}</small></div>${done ? '' : `<span class="rtag">${TAG[it.id] ?? it.cost ?? ''}</span><button type="button" class="rbtn${it.heat === 'hot' ? ' main' : ''}" data-dact="${it.id}">${it.act}</button>`}</div>`
  }
  const hot = list.filter((it) => it.heat === 'hot'), warm = list.filter((it) => it.heat !== 'hot')
  const hotOpen = hot.filter((it) => heat[it.id] !== 'done').length
  const rows = `${hot.length ? `<div class="rgroup hot"><div class="rhead"><span class="eb">${hotOpen ? `Needs you · ${hotOpen}` : 'Needs you · all done'}</span>${hotOpen ? '<span class="eb">Fix these first</span>' : ''}</div>${hot.map(row).join('')}</div>` : ''}${warm.length ? `<div class="rgroup warm"><div class="rhead"><span class="eb">Worth a look · ${warm.length}</span><span class="eb">When you have a minute</span></div>${warm.map(row).join('')}</div>` : ''}`
  daltEl.innerHTML = `<div class="rib">${rib}</div>${daltMake()}<div class="rlist">${rows}</div>${daltMade()}`
}
const TL = { t0: 6, t1: 19, now: 9 + 38 / 60 }
const TL_EVS = [
  { h: 6.25, t: 'Checked all 5 accounts', s: 'Overnight sweep', d: 'I read ads, calls, bookings and reviews for every account while you slept.' },
  { h: 7, t: 'Found 3 accounts dipping', s: '−$4.8k/mo', d: 'Harbor Dental, Peak Fitness and Lumen Spa are down. Two fixes are ready.', id: 'revenue' },
  { h: 7.75, t: 'Drafted 41 review replies', s: 'Ready to send', d: 'Every reply is written in the client’s voice and waits for one tap.', id: 'reviews' },
  { h: 8.5, t: 'Spotted Harbor’s ads paused', s: 'Card expired Tuesday', d: 'The card on file expired, so Google stopped the ads.', id: 'ads' },
  { h: 9, t: 'Drafted a reply to Jen', s: 'Lumen Spa · voicemail', d: 'Jen left an upset 0:48 voicemail. I drafted a calm reply and held a 2 PM call slot.', id: 'voicemail' },
  { h: 9.5, t: 'Wrote the 11:00 brief', s: 'Dr. Priya Nair', d: 'The brief for your new lead leads with Harbor Dental’s results.', id: 'lead' },
  { h: 11, t: 'Call with a new lead', s: 'Smile Studio', d: 'Dr. Priya Nair booked a call. Your brief is ready.', id: 'lead' },
  { h: 13.5, t: 'Fill 3 booking gaps', s: 'From the waitlist', d: 'There are 3 open slots this afternoon. I’ll text the waitlist at 1:30.', id: 'bookings' },
  { h: 14, t: 'Call Jen at Lumen Spa', s: 'Lumen Spa', d: 'If the reply goes out first, the call starts on a better note.', id: 'voicemail' },
  { h: 16, t: 'Social post goes out', s: 'Peak Fitness', d: 'The next post is scheduled. You can still change it.', id: 'social' },
  { h: 17, t: 'Text-back can start', s: 'Needs your yes', d: 'Missed calls after 5 PM are up 18%. Say yes and I’ll text every missed caller.', id: 'calls' },
  { h: 18, t: 'Chase 3 overdue invoices', s: '$2,140', d: 'I’ll send a friendly reminder to each client after hours.', id: 'invoices' },
]
const tlFmt = (h) => { let H = Math.floor(h), m = Math.round((h - H) * 60); if (m === 60) { H++; m = 0 } return `${H > 12 ? H - 12 : H}:${String(m).padStart(2, '0')} ${H >= 12 ? 'PM' : 'AM'}` }
function renderTimeline() {
  const pct = (h) => ((h - TL.t0) / (TL.t1 - TL.t0)) * 100
  const wait = focusItems()
  const m = (id) => byId(id)?.value ?? ''
  let track = `<div class="tl-axis"></div><div class="tl-past" style="width:${pct(TL.now)}%"></div>`
  for (let h = 8; h <= 18; h += 2) if (Math.abs(h - TL.now) > 0.7) track += `<span class="tl-hr" style="left:${pct(h)}%">${h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</span>`
  TL_EVS.forEach((e, i) => {
    const past = e.h < TL.now, above = i % 2 === 0, hi = (i >> 1) % 2 === 0
    const AX = 140, lt = above ? (hi ? 0 : 70) : (hi ? AX + 92 : AX + 24)
    const st = above ? `top:${lt}px;height:${AX - lt}px` : `top:${AX + 2}px;height:${lt - AX + 38}px`
    track += `<span class="tl-mk ${past ? 'dn' : 'pl'}" style="left:${pct(e.h)}%"></span><div class="tl-ev ${past ? 'dn' : 'pl'}${above ? '' : ' b'}${pct(e.h) > 72 ? ' r' : ''}" data-ev="${i}" style="left:${pct(e.h)}%;${st}"><div class="l">${e.t}<small>${tlFmt(e.h)} · ${e.s}</small></div></div>`
  })
  track += `<div class="tl-now" style="left:${pct(TL.now)}%"></div><div class="tl-nowo" style="left:${pct(TL.now)}%"></div><span class="tl-nowt" style="left:${pct(TL.now)}%">Now</span><div class="tl-scrub"></div>`
  daltEl.innerHTML = `<div class="tl-top"><div><span class="eb">Today, as the AI sees it · <em class="tl-sample">sample day</em></span><div class="tl-clock"><b>${tlFmt(TL.now)}</b><span>Drag the line. Left of now is done, right is planned.</span></div></div>
    <div class="tl-strip"><button type="button" data-dopen="mrr"><b>${m('mrr')}</b><span>MRR · <em>+6.2%</em></span></button><button type="button" data-dopen="spend"><b>${byId('spend')?.viz?.pct ?? 77}%</b>AI spend</button><button type="button" data-dopen="bookings"><b>${m('bookings')}</b>bookings today</button><button type="button" data-dopen="agents"><b>4/${m('agents')}</b>agents working</button></div></div>
    ${daltMake()}
    <div class="tl-wrap"><div class="tl-track">${track}</div></div>
    <div class="tl-bot"><div class="tl-det"></div><div class="tl-wait"><span class="eb">${wait.some((it) => heat[it.id] !== 'done') ? 'Waiting on you, right now' : 'Nothing waiting on you'}</span>
    ${wait.map((it) => { const done = heat[it.id] === 'done'; return `<div class="rr${done ? ' done' : ''}" data-dopen="${it.id}" data-h="hot"><i class="rdot"></i><div class="rt"><b>${it.problem}</b><small>${done ? `<i class="ti ti-check"></i> ${it.receipt ?? 'Done'}` : TAG[it.id] ?? it.cost ?? ''}</small></div>${done ? '' : `<button type="button" class="rbtn main" data-dact="${it.id}">${it.act}</button>`}</div>` }).join('')}</div></div>${daltMade()}`
  const trackEl = daltEl.querySelector('.tl-track'), det = daltEl.querySelector('.tl-det'), scrub = daltEl.querySelector('.tl-scrub'), clock = daltEl.querySelector('.tl-clock b')
  const evEls = [...daltEl.querySelectorAll('.tl-ev')]
  let cur = -1, hold = 0
  const show = (i) => {
    if (i === cur) return
    cur = i
    const e = TL_EVS[i], past = e.h < TL.now, it = e.id && byId(e.id), done = it && heat[it.id] === 'done'
    evEls.forEach((x, j) => x.classList.toggle('on', j === i))
    scrub.style.left = `${pct(e.h)}%`
    clock.textContent = tlFmt(e.h)
    det.classList.remove('swap'); void det.offsetWidth; det.classList.add('swap')
    det.innerHTML = `<div class="tg"><i class="${past ? 'dn' : 'pl'}"></i><span class="eb">${past ? 'Done by me' : 'Planned'} · ${tlFmt(e.h)}</span></div><h4>${e.t}</h4><p>${e.d}</p>${it ? `<div class="f">${done ? `<span class="tl-ok"><i class="ti ti-check"></i> ${it.receipt ?? 'Done'}</span>` : `<button type="button" class="rbtn${it.heat === 'hot' ? ' main' : ''}" data-tl-act="${it.id}">${it.act ?? 'Open'}</button>`}</div>` : ''}`
    det.querySelector('[data-tl-act]')?.addEventListener('click', (ev) => { const x = byId(ev.currentTarget.dataset.tlAct); if (x) openRoom([x], ev.currentTarget, x.act ? { direct: 0 } : {}) })
  }
  let i = TL_EVS.findIndex((e) => e.h > TL.now)
  show(i)
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tlTimer = setInterval(() => { if (!daltEl.isConnected || daltEl.hidden || !roomEl.hidden) return; if (performance.now() < hold) return; i = (i + 1) % TL_EVS.length; show(i) }, 2800)
  const pick = (ev) => { const r = trackEl.getBoundingClientRect(); const h = TL.t0 + ((ev.clientX - r.left) / r.width) * (TL.t1 - TL.t0); let b = 0; TL_EVS.forEach((e, j) => { if (Math.abs(e.h - h) < Math.abs(TL_EVS[b].h - h)) b = j }); i = b; show(b); hold = performance.now() + 8000 }
  let drag = false
  trackEl.onpointerdown = (e) => { drag = true; pick(e) }
  trackEl.onpointermove = (e) => drag && pick(e)
  addEventListener('pointerup', () => (drag = false))
  const wrap = trackEl.parentElement
  if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = (trackEl.clientWidth * pct(TL.now)) / 100 - wrap.clientWidth / 2
}
document.querySelectorAll('[data-brief]').forEach((b) => b.setAttribute('aria-selected', b.dataset.brief === landing))
$('#dashback').onclick = () => setV2View('focus')

// V2 · Phone: the whole desk inside a phone, live. It's the same page in a 390px frame, so every
// option, room and draft behaves exactly as it will on a phone.
let phoneOn = false
const inPhone = new URLSearchParams(location.search).has('phone')
if (inPhone) document.body.dataset.inphone = 'on'
function setPhone(on) {
  const was = phoneOn
  phoneOn = on
  const w = $('#phoneWrap')
  if (!w) return
  w.hidden = !on
  const frame = $('#phoneFrame')
  // The phone is a second copy of the desk: load it when it opens, unload it when it closes,
  // so it never listens or talks in the background.
  if (on && !frame.dataset.live) { frame.src = `${location.pathname}?phone=1&t=${Date.now()}`; frame.dataset.live = '1' }
  if (!on && frame.dataset.live) { frame.src = 'about:blank'; delete frame.dataset.live }
  if (on) { stopVoice(); stopHandsFree(); setListen('') }
  if (!on && was) setTimeout(() => deskHandsFree(), 400)
  const fit = () => $('.phone-frame')?.style.setProperty('--k', String(Math.min(1, (innerHeight - 120) / 930)))
  fit()
  if (on) addEventListener('resize', fit)
  if (on) closeRoom()
  document.body.classList.toggle('phone-on', on)
  $('#lay-phone').setAttribute('aria-selected', on)
  $('#view-desk').setAttribute('aria-selected', !on)
}
$('#lay-phone').onclick = () => setPhone(true)
$('#view-desk').onclick = () => setPhone(false)
$('#phoneX').onclick = () => setPhone(false)
// Restart from the phone: reload just the phone, fresh, without going back to desktop.
$('#phoneRestart').onclick = () => { const f = $('#phoneFrame'); f.src = `${location.pathname}?phone=1&t=${Date.now()}` }
// Restart the whole demo (works on a real phone too, from the prototype panel). Options are kept.
// Mute on the desk's ask bar: the same setting as the room's speaker, remembered between visits.
document.querySelectorAll('#bar [data-mute]').forEach((b) => (b.onclick = () => setMuted(!muted)))
setMuted(muted)
// V2 · One main button that always shows the next thing you can do: the mic when idle, a send arrow once
// you've typed, stop while the AI is talking, and the live listening look while it listens.
const MAIN_ICON = { mic: 'ti-microphone', send: 'ti-arrow-up', stop: 'ti-player-stop-filled' }
function setMainMode(b, m) {
  if (!b || b.dataset.mode === m) return
  b.dataset.mode = m
  const i = b.querySelector('i.ti')
  if (i) i.className = `ti ${MAIN_ICON[m]}`
  b.setAttribute('aria-label', m === 'send' ? 'Send' : m === 'stop' ? 'Stop talking' : 'Talk')
}
function syncMainButtons() {
  if (!V2()) return
  const talking = !!voice
  const typed = (id) => !!$(id)?.value.trim()
  const mode = (b, input, here) => (b?.classList.contains('live') ? 'mic' : input && typed(input) ? 'send' : talking && here ? 'stop' : 'mic')
  setMainMode($('#mic'), mode($('#mic'), '#ask', !room))
  setMainMode($('#rbmic'), mode($('#rbmic'), null, !!room))
  setMainMode($('#rmic2'), mode($('#rmic2'), '#rask', !!room))
}
setInterval(syncMainButtons, 150)
addEventListener('input', (e) => { if (e.target.id === 'ask' || e.target.id === 'rask') syncMainButtons() })
function stopTalking() {
  stopVoice()
  if (room) {
    $('#rsay')?.querySelectorAll('.w.dim').forEach((w) => w.classList.remove('dim'))
    room.speaking = null
    renderLog()
    setTimeout(() => room && handsFree(), 300)
  } else setTimeout(deskHandsFree, 300)
  syncMainButtons()
}
// Send and stop take over the click before the mic's own listener sees it.
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('#mic, #rbmic, #rmic2')
  if (!b || !V2()) return
  // The bar says "Mic is on" but the button is between listens (hands-free restarting): a tap turns it off.
  if (b.id === 'mic' && !b.classList.contains('live') && ['on', 'grace', 'hearing'].includes($('#bar')?.dataset.listen)) {
    e.stopPropagation()
    e.preventDefault()
    stopHandsFree()
    setListen('idle')
    return
  }
  const m = b.dataset.mode
  if (m !== 'send' && m !== 'stop') return
  e.stopPropagation()
  e.preventDefault()
  if (m === 'stop') return stopTalking()
  if (b.id === 'mic') $('#bar').requestSubmit()
  else $('#rform')?.requestSubmit()
  setTimeout(syncMainButtons, 0)
}, true)

// The room's Later chip (delegated, so it survives the run controls swapping the chips).
document.addEventListener('click', (e) => { if (e.target.closest?.('[data-rlater]') && room) heard('later') })
// V2 · Presence: how the AI looks everywhere it appears (room, chat, phone sheet, empty state).
const PRESENCES = ['orb', 'v1', 'swarm', 'chrome', 'culture']
let presence = PRESENCES.includes(store.get('desk-presence')) ? store.get('desk-presence') : 'orb'
initPresence({
  state: () => {
    if (voice && !voice.paused) return 'speaking'
    if (activeRec || ['on', 'hearing', 'grace'].includes($('#bar')?.dataset.listen) || $('#rbmic.live, #rmic.live, #rmic2.live')) return 'listening'
    if (room && $('#rdoing .step[data-state="now"]')) return 'thinking'
    return 'idle'
  },
})
addEventListener('deskvoice', nextPhrase)
function setPresence(v) {
  presence = v
  store.set('desk-presence', v)
  document.querySelectorAll('[data-presence-opt]').forEach((b) => b.setAttribute('aria-selected', b.dataset.presenceOpt === v))
  setPresenceStyle(V2() ? v : 'orb')
}
document.querySelectorAll('[data-presence-opt]').forEach((b) => (b.onclick = () => { if (!V2()) setVersion('2'); setPresence(b.dataset.presenceOpt) }))
setPresence(presence)
// The phone frame is its own page: when an option changes in the desktop panel, apply it here live too.
addEventListener('storage', (e) => {
  if (e.key === 'desk-presence' && PRESENCES.includes(e.newValue) && e.newValue !== presence) setPresence(e.newValue)
  if (e.key === 'desk-brief' && e.newValue && e.newValue !== landing) setBrief(e.newValue)
  if (e.key === 'desk-dstyle' && e.newValue && e.newValue !== dstyle) setDstyle(e.newValue)
  if (e.key === 'desk-day' && e.newValue && e.newValue !== day) setDay(e.newValue)
})
$('#pbRestart').onclick = () => { stopVoice(); stopHandsFree(); location.reload() }
// The panel's extra options fold away; remember whether they were open.
{ const m = $('#pbMore'); if (m) { m.open = store.get('desk-pbmore') === '1'; m.ontoggle = () => store.set('desk-pbmore', m.open ? '1' : '0') } }

// V2 · hands-free: the room listens as soon as the AI finishes a line, dims to "take your time"
// when you're quiet, and listens again. Any line it speaks pauses the mic so it doesn't hear itself.
let hf = null
let roomStatus = null
let roomMiss = 0
function handsFree(cont = false) {
  if (!V2() || !room || mode !== 'voice' || !SR) return
  if (activeRec) return
  if (!cont) roomMiss = 0
  if (typeof hf === 'number') clearTimeout(hf)
  hf = null
  const btn = voiceStyle === 'bar' ? $('#rbmic') : $('#rmic')
  if (!btn) return
  const token = {}
  hf = token
  listen(btn, (t, alts) => heard(t, alts), roomStatus, {
    hf: true,
    onInterim: roomInterim,
    onDenied: () => { if (hf === token) hf = null },
    willRestart: () => hf === token && !!room && roomMiss + 1 < MISSES + 1,
    onEnd: (got) => {
      if (hf !== token || !room) return
      if (got) { roomMiss = 0; hf = setTimeout(() => { if (hf) handsFree(true) }, 400); return }
      if (++roomMiss >= MISSES + 1) { hf = null; roomRest(); return }
      hf = setTimeout(() => { if (hf) handsFree(true) }, 60)
    },
  })
}
function roomRest() { roomStatus?.('resting'); const b = $('#rbstate'); if (b) b.textContent = 'Tap the mic to talk' }
/** Your words, live, while you talk in the room. */
let eqT = 0
function roomInterim(fin, live) {
  kickEq()
  roomEl.querySelectorAll('.r-eq, .rb-eq').forEach((e) => e.classList.add('talking'))
  clearTimeout(eqT)
  eqT = setTimeout(() => roomEl.querySelectorAll('.r-eq, .rb-eq').forEach((e) => e.classList.remove('talking')), 700)
  const html = `<span class="heard">${esc(fin)}</span> <span class="live">${esc(live)}</span>`
  const you = $('#ryou')
  if (you) you.innerHTML = `You: ${html}`
  const bt = $('#rbtext')
  if (bt) bt.innerHTML = html
  const st = $('#rbstate')
  if (st) st.textContent = 'Listening'
}
function stopHandsFree() {
  if (typeof hf === 'number') clearTimeout(hf)
  hf = null
  if (activeRec) activeRec.__killed = true
  try { activeRec?.abort() } catch {}
  activeRec = null
}

// V2 · the draft's chat: tell it what to change; a few changes really change the page.
// ── The draft editor: say or type anything; edits apply live inside the site (no reload). ──────
// Click any text on the page to select it: you get rewrites and actions for that piece, and what you
// type next applies to it. Edits are kept per draft, so reopening or "Open in browser" keeps them.
const POP_CHIPS = ['Purple theme', 'Light mode', 'Serif headings', 'Shorter headline', 'Hide reviews', 'Rounded buttons', 'Undo']
const COLORS = { purple: '#8b5cf6', violet: '#7c6cf0', lavender: '#b4a7ff', lilac: '#c4b5fd', blue: '#4f8cff', navy: '#3b5bdb', sky: '#38bdf8', teal: '#2dd4bf', cyan: '#22d3ee', aqua: '#22d3ee', mint: '#5eead4', green: '#34d399', emerald: '#10b981', lime: '#a3e635', olive: '#a3a35a', yellow: '#facc15', gold: '#eab308', amber: '#f59e0b', orange: '#fb923c', peach: '#fdba74', coral: '#fb7185', red: '#ef4444', crimson: '#dc2626', pink: '#f472b6', rose: '#fb7185', magenta: '#e879f9', fuchsia: '#d946ef', brown: '#b08968', grey: '#9ca3af', gray: '#9ca3af', silver: '#cbd5e1' }
const SECTION_WORDS = { reviews: 'reviews', review: 'reviews', testimonials: 'reviews', testimonial: 'reviews', stories: 'reviews', stats: 'stats', numbers: 'stats', services: 'services', treatments: 'services', booking: 'booking', form: 'booking', ticker: 'ticker', marquee: 'ticker', countdown: 'countdown', timer: 'countdown', offer: 'offer', 'trust line': 'trust' }
const TARGETS = { headline: 'h1|0', title: 'h1|0', heading: 'h1|0', hero: 'h1|0', intro: '#lede|0', subtitle: '#lede|0', subheading: '#lede|0', description: '#lede|0', tagline: '#eyebrow|0', 'top line': '#eyebrow|0', button: '#cta1|0', cta: '#cta1|0', offer: '#offerPill|0', name: '#brandName|0' }
const LABELS = { 'h1|0': 'Headline', '#lede|0': 'Intro', '#eyebrow|0': 'Top line', '#cta1|0': 'Main button', '#offerPill|0': 'Offer', '#brandName|0': 'Name' }
const REWRITES = { harbor: ['Dentistry, minus the dread.', 'Smile without the stress.', 'Calm care, same day.'], glow: ['Skin that glows.', 'Your glow, on schedule.', 'Real results. Zero fuss.'], peak: ['Train with purpose.', 'Stronger every week.', 'Lift. Learn. Repeat.'] }
const BTN_REWRITES = ['Book now', 'Book a visit today', 'See open times']
const shorten = (s) => {
  // Keep the first sentence; if it's long, cut at a natural break and never end on a dangling word.
  const first = s.split(/(?<=[.!?])\s/)[0].trim()
  const w = first.split(/\s+/)
  if (w.length <= 9) return first
  const head = w.slice(0, 9).join(' ')
  const cut = Math.max(head.lastIndexOf(','), head.lastIndexOf(';'), head.lastIndexOf(' and '))
  let out = (cut > 12 ? head.slice(0, cut) : w.slice(0, 7).join(' ')).split(/\s+/)
  while (out.length > 3 && /^(in|and|of|the|a|an|to|for|with|on|at|by|or|your|our|that|which|who|like|feels|is|are|it|so)$/i.test(out[out.length - 1])) out.pop()
  return `${out.join(' ').replace(/[,;:]$/, '')}.`
}
const encOps = (ops) => btoa(unescape(encodeURIComponent(JSON.stringify(ops))))
/** Turn one request into edits. Returns { ops, say[], undo, reset, hideSel } or null when it isn't an edit. */
function popParse(raw, sel, brandKey) {
  const out = { ops: [], say: [] }
  const t = norm(raw)
  if (/\b(undo|take that back|go back|revert)\b/.test(t)) return { ...out, undo: true }
  if (/\b(start over|reset|original( design| version)?|as it was)\b/.test(t) && !/colou?r/.test(t)) return { ...out, reset: true }
  // Text: "headline: X", "change the button to X", "make it say X", or "X" in quotes.
  const m = raw.match(/(?:change|set|make|update|rename)?\s*(?:the\s+)?(headline|title|heading|hero|intro|subtitle|subheading|description|tagline|top line|button|cta|offer|name)\s*(?:text\s*)?(?:to|:|=|says?|should say|reads?)\s+["“']?(.+?)["”']?\s*$/i)
  const q = raw.match(/["“]([^"”]{2,})["”]/)
  const it = raw.match(/^(?:change it to|make it say|it should say|have it say|say|replace (?:it )?with|rewrite (?:it )?as|to)\s+["“']?(.+?)["”']?\s*$/i)
  if (m) { const key = TARGETS[m[1].toLowerCase()]; out.ops.push({ t: 'text', key, text: m[2] }); out.say.push(`${LABELS[key] ?? m[1]} updated`) ; return out }
  if (sel && (it || q)) { out.ops.push({ t: 'text', key: sel.key, text: (it?.[1] ?? q[1]) }); out.say.push(`${sel.label} updated`); return out }
  if (q) { out.ops.push({ t: 'text', key: 'h1|0', text: q[1] }); out.say.push('Headline updated'); return out }
  const target = sel?.key ?? (/\b(button|cta)\b/.test(t) ? '#cta1|0' : /\b(intro|subtitle|subheading)\b/.test(t) ? '#lede|0' : 'h1|0')
  const tLabel = sel?.label?.toLowerCase() ?? LABELS[target]?.toLowerCase() ?? 'text'
  // Colour themes: any colour word or hex.
  const hex = t.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/)?.[0]
  const cw = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`).test(t))
  if (/\b(original|default|brand|old) colou?rs?\b/.test(t)) { out.ops.push({ t: 'color', hex: null }); out.say.push('original colours back') }
  else if (hex || cw) { const h = hex?.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex ?? COLORS[cw]; out.ops.push({ t: 'color', hex: h }); out.say.push(`${cw ?? h} theme`) }
  else if (/\bwarm(er)?\b/.test(t)) { out.ops.push({ t: 'color', hex: COLORS.coral }); out.say.push('warmer colours') }
  else if (/\bcool(er)?\b/.test(t)) { out.ops.push({ t: 'color', hex: COLORS.sky }); out.say.push('cooler colours') }
  // Light / dark.
  if (/\b(light (mode|theme|background)|white background|bright(er)?|light)\b/.test(t) && !/\blight(er)? (purple|blue|pink|green)\b/.test(t)) { out.ops.push({ t: 'tone', v: 'light' }); out.say.push('light mode') }
  else if (/\b(dark(er)?|black|night)\b/.test(t)) { out.ops.push({ t: 'tone', v: 'dark' }); out.say.push('dark mode') }
  // Fonts.
  if (/\b(serif|elegant|classic|editorial|fancy)\b/.test(t)) { out.ops.push({ t: 'font', v: 'serif' }); out.say.push('serif headings') }
  else if (/\b(mono|monospace|techy|tech|code|typewriter)\b/.test(t)) { out.ops.push({ t: 'font', v: 'mono' }); out.say.push('mono headings') }
  else if (/\b(sans|modern|clean|simple) (font|type|headings?)\b/.test(t)) { out.ops.push({ t: 'font', v: 'sans' }); out.say.push('clean sans headings') }
  // Size.
  if (/\b(bigger|larger|huge|bolder|increase)\b/.test(t)) { out.ops.push({ t: 'size', key: target, v: 'up' }); out.say.push(`bigger ${tLabel}`) }
  else if (/\b(smaller|tiny|decrease|less big)\b/.test(t)) { out.ops.push({ t: 'size', key: target, v: 'down' }); out.say.push(`smaller ${tLabel}`) }
  // Sections: hide / show.
  const sw = Object.keys(SECTION_WORDS).find((w) => new RegExp(`\\b${w}\\b`).test(t))
  if (sw && /\b(hide|remove|drop|delete|get rid of|lose|no)\b/.test(t)) { out.ops.push({ t: 'hide', key: SECTION_WORDS[sw], show: false }); out.say.push(`${SECTION_WORDS[sw]} hidden`) }
  else if (sw && /\b(show|add back|bring back|put back|restore)\b/.test(t)) { out.ops.push({ t: 'hide', key: SECTION_WORDS[sw], show: true }); out.say.push(`${SECTION_WORDS[sw]} back`) }
  else if (sel && /\b(hide|remove|delete|get rid of) (this|it)\b/.test(t)) { out.ops.push({ t: 'hideEl', key: sel.key }); out.say.push(`${sel.label} hidden`) }
  else if (/\bfewer sections\b|\bsimpler page\b|\bless busy\b/.test(t)) { out.ops.push({ t: 'hide', key: 'stats', show: false }, { t: 'hide', key: 'ticker', show: false }); out.say.push('fewer sections') }
  // Buttons.
  if (/\b(round(ed)?|pill)\b/.test(t) && /\bbuttons?\b/.test(t)) { out.ops.push({ t: 'btn', v: 'round' }); out.say.push('rounded buttons') }
  else if (/\b(square|sharp|boxy)\b/.test(t)) { out.ops.push({ t: 'btn', v: 'square' }); out.say.push('square buttons') }
  else if (/\bsoft(er)? (buttons?|corners?)\b/.test(t)) { out.ops.push({ t: 'btn', v: 'soft' }); out.say.push('softer buttons') }
  // Shorter / punchier copy.
  if (/\b(short(er)?|punch(y|ier)|tighter|snappier|catchier|fewer words)\b/.test(t)) {
    const text = target === 'h1|0' ? REWRITES[brandKey]?.[0] : target === '#cta1|0' ? BTN_REWRITES[0] : shorten(sel?.text ?? '')
    if (text) { out.ops.push({ t: 'text', key: target, text }); out.say.push(`shorter ${tLabel}`) }
  }
  if (/\bpric(e|es|ing)\b/.test(t) && !out.ops.length) return { ...out, info: DYN['p-pricing'] }
  return out.ops.length ? out : null
}
function wirePopChat(pop, c, onUrl) {
  const th = $('#rcThread'), frame = pop.querySelector('iframe'), chipsEl = $('#rcChips')
  const brandKey = (c.url.match(/brand=(\w+)/) || [])[1] || 'glow'
  c.base ??= c.url
  c.ops ??= []
  let sel = null
  const say2 = (text) => { th.insertAdjacentHTML('beforeend', `<div class="rc-ai"><span class="creature small"><i></i><i></i><i></i></span><span>${esc(text)}</span></div>`); th.scrollTop = 1e6; pushThread({ who: 'ai', text }); const id = clipFor(text); if (V2()) (id && DUR[id] ? speak({ id, t: text }) : speakDyn(text)) }
  const me = (text) => { th.insertAdjacentHTML('beforeend', `<div class="rc-me">${esc(text)}</div>`); th.scrollTop = 1e6; pushThread({ who: 'me', text }) }
  const urlNow = () => (c.ops.length ? `${c.base}&ops=${encodeURIComponent(encOps(c.ops))}` : c.base)
  const send = () => { frame.contentWindow?.postMessage({ type: 'ops', ops: c.ops }, '*'); onUrl(urlNow()) }
  const showChips = () => {
    if (!sel) {
      $('#rcAsk').placeholder = 'Tell me what to change… or click any text on the page'
      chipsEl.innerHTML = POP_CHIPS.map((l) => `<button type="button" class="pchip" data-chip="${esc(l)}">${l}</button>`).join('')
    } else {
      const sugg = sel.key.startsWith('h1') ? REWRITES[brandKey] ?? [] : sel.key.startsWith('#cta') ? BTN_REWRITES : [shorten(sel.text)].filter((x) => x && x !== sel.text)
      $('#rcAsk').placeholder = `How should the ${sel.label.toLowerCase()} change?`
      chipsEl.innerHTML = `<div class="rc-sel"><span><i class="ti ti-pointer"></i> Editing · <b>${esc(sel.label)}</b></span><button type="button" class="rc-x" data-desel aria-label="Stop editing this"><i class="ti ti-x"></i></button></div>${sugg.map((s) => `<button type="button" class="pchip sugg" data-set="${esc(s)}">“${esc(s)}”</button>`).join('')}<button type="button" class="pchip" data-chip="Bigger">Bigger</button><button type="button" class="pchip" data-chip="Smaller">Smaller</button><button type="button" class="pchip" data-chip="Hide this">Hide this</button>`
    }
    chipsEl.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => handle(b.dataset.chip)))
    chipsEl.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => { me(b.dataset.set); c.ops.push({ t: 'text', key: sel.key, text: b.dataset.set }); send(); say2(`Done. ${sel.label} changed.`) }))
    chipsEl.querySelector('[data-desel]')?.addEventListener('click', () => { sel = null; frame.contentWindow?.postMessage({ type: 'deselect' }, '*'); showChips() })
  }
  const handle = (text) => {
    me(text)
    const r = popParse(text, sel, brandKey)
    if (!r) return setTimeout(() => say2('I can change colours (“make it purple”), light or dark, fonts, sizes, any text (“headline: …”), and hide or show sections. Or click any text on the page.'), 250)
    if (r.info) return setTimeout(() => say2(r.info), 250)
    if (r.undo) { if (!c.ops.length) return say2('Nothing to undo yet.'); c.ops.pop(); send(); return say2('Undone.') }
    if (r.reset) { c.ops = []; send(); return say2('Back to the original draft.') }
    c.ops.push(...r.ops)
    send()
    const list = r.say.join(', ')
    say2(`Done: ${list.charAt(0).toLowerCase() + list.slice(1)}.`)
  }
  addEventListener('message', function onMsg(e) {
    if (!pop.isConnected) return removeEventListener('message', onMsg)
    if (e.source !== frame.contentWindow) return
    if (e.data?.type === 'site-ready') { frame.contentWindow.postMessage({ type: 'editmode', on: true }, '*'); if (c.ops.length) send() }
    if (e.data?.type === 'select') { sel = e.data; showChips(); $('#rcAsk').focus() }
  })
  showChips()
  $('#rcForm').onsubmit = (e) => { e.preventDefault(); const v = $('#rcAsk').value.trim(); $('#rcAsk').value = ''; if (v) handle(v) }
  $('#rcMic').onclick = () => listen($('#rcMic'), handle)
}

// ── Start ────────────────────────────────────────────────────────────────────
setLayout(layout, false)
setVoiceStyle(voiceStyle)
setDeskMode(deskMode)
setRoomStyle(roomStyle)
setFront(front)
setLook(look)
setDay(day)
setVersion(version)
if (V2() && new URLSearchParams(location.search).get('view') === 'dash') setV2View('dash')
requestAnimationFrame(() => root.classList.remove('booting'))
if (V2()) setTimeout(loadKokoro, 1200)
// Greet on landing. If the browser blocks sound until the first tap, speak() holds the line and shows
// "Tap anywhere to hear me", so it plays the moment you do anything.
let greeted = false
function greet() {
  if (greeted) return
  greeted = true
  const say = () => !room && !voice && !phoneOn && (stopHandsFree(), setListen(''), (V2() && !openNeeds().length ? (deskSay(DYN['d-quiet']), null) : speak(deskMode === 'one' ? GREETING_ONE : GREETING, { onAmp: (a) => stitch?.amp(a), onEnd: () => { if (V2()) setTimeout(() => !room && deskSay(V2() && focusItems().filter((it) => heat[it.id] !== 'done').length ? `${focusItems().filter((it) => heat[it.id] !== 'done').map((it) => it.problem).join('. ')}. Say “fix them” and I’ll handle all of it.` : DYN['d-quiet'], landing !== 'list'), 400) } })))
  say()
}
setTimeout(greet, 900)
addEventListener('pointerdown', () => setTimeout(greet, 150), { once: true })
