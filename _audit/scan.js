// Audit helper (local only): overlaps, duplicates, overflow, off-screen controls, in the visible layer.
window.__scan = (label) => {
  const W = innerWidth, H = innerHeight
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return false; let n = e; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.35) return false; n = n.parentElement } return true }
  const room = document.getElementById('room')
  const roomOpen = room && !room.hidden && document.body.classList.contains('room-open')
  const scope = roomOpen ? [room] : [document.getElementById('desk'), document.querySelector('.bar'), document.querySelector('.top'), document.getElementById('laterpop'), document.getElementById('guess'), document.getElementById('rpop')].filter(Boolean)
  const leaves = []
  scope.forEach((s) => s.querySelectorAll('*').forEach((e) => {
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
    const ctl = e.matches('button, input, .chip, .mic, .rs2-p')
    if ((own || ctl) && vis(e)) leaves.push(e)
  }))
  const overlaps = []
  for (let i = 0; i < leaves.length; i++) for (let k = i + 1; k < leaves.length; k++) {
    const a = leaves[i], b = leaves[k]
    if (a.contains(b) || b.contains(a)) continue
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
    const ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)), iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top))
    const area = ix * iy, small = Math.min(ra.width * ra.height, rb.width * rb.height)
    if (area > 0.2 * small && area > 30) overlaps.push(`${(a.id || a.className || a.tagName).toString().slice(0, 24)} ↔ ${(b.id || b.className || b.tagName).toString().slice(0, 24)} :: "${(a.textContent || a.value || '').trim().slice(0, 30)}" / "${(b.textContent || b.value || '').trim().slice(0, 30)}"`)
  }
  const seen = {}
  leaves.forEach((e) => { const t = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(); if (t.length > 18) (seen[t] = seen[t] || []).push(e) })
  const dupes = Object.entries(seen).filter(([, v]) => v.length > 1).map(([t, v]) => `${v.length}× "${t.slice(0, 50)}"`)
  const off = leaves.filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.left < -1 }).map((e) => `${(e.className || e.tagName).toString().slice(0, 20)} "${e.textContent.trim().slice(0, 24)}"`)
  const clipped = leaves.filter((e) => e.matches('button, .chip, .rs2-p') && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).textOverflow !== 'ellipsis').map((e) => `"${e.textContent.trim().slice(0, 24)}"`)
  return { label, hscroll: document.documentElement.scrollWidth > W, overlaps: overlaps.slice(0, 12), dupes, off: off.slice(0, 8), clipped: clipped.slice(0, 8) }
}
