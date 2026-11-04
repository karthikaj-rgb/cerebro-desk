// The desk's ear: turns whatever was said into one action the prototype can do.
// Needs ANTHROPIC_API_KEY in the Vercel project; without it, the desk falls back to its built-in rules.
export const config = { runtime: 'edge' }

const SYSTEM = `You are the voice of "The Desk", an AI assistant for a marketing agency owner named Maya. You get what she said plus the current desk state. Reply with ONE JSON object only, no prose:
{"intent": <one of: brief | fix_all | open | act | build | dashboard | focus | chat | close>,
 "target": <item id when intent is open/act, else null>,
 "kind": <"Website" | "Funnel" | "Campaign" | "Agent" when intent is build, else null>,
 "reply": <one short spoken sentence in a warm, plain voice, max 22 words>}
Rules: "brief" = she asks what needs her / what's up. "fix_all" = fix/handle everything. "act" = do the main fix for one item (target = its id). "open" = look at / talk about one item. "build" = make/create/build/design a website, page, site, funnel, campaign, email, agent, bot. "dashboard" = see numbers / everything / the dashboard. "focus" = back to what needs her. "close" = stop / cancel / never mind / go back. "chat" = anything else (greetings, thanks, questions, jokes): answer it briefly in "reply" using the desk state when relevant, and offer one next step. Never invent items that are not in the state.`

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return Response.json({ ok: false, reason: 'no-key' }, { status: 503 })
  let body
  try { body = await req.json() } catch { return Response.json({ ok: false, reason: 'bad-json' }, { status: 400 }) }
  const { text, state } = body ?? {}
  if (!text) return Response.json({ ok: false, reason: 'no-text' }, { status: 400 })
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.DESK_MODEL || 'claude-sonnet-5-5',
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Desk state (JSON): ${JSON.stringify(state ?? {})}\n\nShe said: "${text}"` }],
      }),
    })
    if (!r.ok) return Response.json({ ok: false, reason: `api-${r.status}` }, { status: r.status >= 400 && r.status < 500 ? 503 : 502 })
    const data = await r.json()
    const raw = data.content?.map((c) => c.text ?? '').join('') ?? ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ ok: false, reason: 'no-json' }, { status: 502 })
    return Response.json({ ok: true, ...JSON.parse(m[0]) })
  } catch (e) {
    return Response.json({ ok: false, reason: 'error' }, { status: 502 })
  }
}
