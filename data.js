// The Desk · "Ink of Light": everything on Maya's desk, what it shows, what the AI can do, and what it says.
// `t` is what's shown; `say` (optional) is how the voice reads it. Clip ids double as audio/<id>.m4a.

export const GREETING = {
  id: 'd-greet2',
  t: 'Good morning, Maya. Three things need you today. Everything else is running.',
}
// The One AI option: the AI speaks for its whole team.
export const GREETING_ONE = {
  id: 'd-greet3',
  t: 'Good morning, Maya. Your team handled 61 things since last night. Three need you.',
}

// heat: 'hot' needs you now · 'warm' worth a look · 'cool' running fine.
// pos: % of the canvas (x, y) for the bloom's center; size: bloom diameter in px at 1440 wide; tilt: degrees.
export const ITEMS = [
  {
    id: 'revenue', heat: 'hot', agent: 'workflows', pos: [38, 60], size: 270, tilt: -4, shape: 0,
    receipt: '2 fixes ran · +$3.6k/mo from today', rule: 'When a booking widget breaks, can I fix it before telling you?',
    problem: 'Three accounts dipped', cost: '−$4.8k/mo', cause: 'Ads paused · booking widget broke · review requests stopped', fix: 'Two fixes are safe to run now and win back $3.6k a month.', act: 'Run the 2 fixes',
    label: 'Revenue · 3 accounts', value: '−$4.8k', unit: '/mo', sub: 'Harbor, Peak and Lumen dipped',
    viz: { kind: 'lolli', rows: [['Harbor', 2.4], ['Peak', 1.6], ['Lumen', 0.8]] },
    note: 'I can win back $3.6k',
    intro: { id: 'd-rev-intro', t: 'Harbor, Peak and Lumen are down $4.8k a month. Harbor’s ads paused, Peak’s booking widget broke, and Lumen stopped asking for reviews. Two fixes are safe to run now.', say: 'Harbor, Peak and Lumen are down 4.8 thousand dollars a month. Harbor’s ads paused, Peak’s booking widget broke, and Lumen stopped asking for reviews. Two fixes are safe to run now.' },
    big: { kind: 'bars', rows: [['Harbor Dental', 2.4, 'Ads paused'], ['Peak Fitness', 1.6, 'Widget broke'], ['Lumen Spa', 0.8, 'Reviews stopped']], neg: true },
    can: [
      { label: 'Run the 2 safe fixes', id: 'd-rev-run', t: 'Done. Harbor’s ads are back on and Peak’s booking widget works again. You’re winning back $3.6k a month, starting today.', say: 'Done. Harbor’s ads are back on and Peak’s booking widget works again. You’re winning back 3.6 thousand dollars a month, starting today.', effect: 'heal' },
      { label: 'Why did Harbor’s ads stop?', id: 'd-rev-why', t: 'Harbor’s card on Google Ads expired on October 28, so the campaign stopped. There’s a new card on file I can use.' },
      { label: 'Hold Lumen until Monday', id: 'd-rev-hold', t: 'Okay. Lumen Spa’s review requests restart Monday at 9, so 214 requests don’t go out at once.' },
    ],
  },
  {
    id: 'ads', heat: 'hot', agent: 'ads', pos: [50, 81], size: 200, tilt: 5, shape: 1,
    receipt: 'Live again · card 4411 · $640/week · 9:41', rule: 'Next time a card expires, can I switch and resume on my own?',
    problem: 'Ads paused since Tuesday', cost: '−$2.4k/mo at risk', cause: 'The card on file expired.', fix: 'I can switch to the new card and turn them back on.', act: 'Turn them back on',
    label: 'Harbor Dental · Ads', value: 'Paused', unit: '', sub: 'since Tuesday · card expired',
    viz: { kind: 'cliff', points: [62, 64, 60, 66, 63, 65, 64, 2, 2, 2, 2], at: 7, label: 'Tue' },
    note: 'I can turn them back on',
    intro: { id: 'd-ads-intro', t: 'Harbor Dental’s Google Ads stopped on Tuesday when the card expired. That’s about $2.4k a month in bookings. Want me to switch to the new card and turn them back on?', say: 'Harbor Dental’s Google Ads stopped on Tuesday when the card expired. That’s about 2.4 thousand dollars a month in bookings. Want me to switch to the new card and turn them back on?' },
    big: { kind: 'line', points: [62, 64, 60, 66, 63, 65, 18, 4, 2, 2, 2], label: 'Clicks per day · last 11 days' },
    can: [
      { label: 'Turn them back on', id: 'd-ads-on', t: 'Ads are live again on the new card, at $640 a week. First clicks should come in within the hour.', say: 'Ads are live again on the new card, at 640 dollars a week. First clicks should come in within the hour.', effect: 'heal' },
      { label: 'Lower the budget first', id: 'd-ads-low', t: 'Sure. I can restart at $450 a week and raise it once bookings recover. Say the word.', say: 'Sure. I can restart at 450 dollars a week and raise it once bookings recover. Say the word.' },
    ],
  },
  {
    id: 'calls', heat: 'hot', agent: 'voice', pos: [40, 35], size: 230, tilt: 3, shape: 2,
    receipt: 'Text-back live at all 14 clinics tonight', rule: 'Can I roll a tested agent out to new clinics on my own?',
    problem: 'Missing calls after 5 PM', cost: '+18% this month', cause: 'The front desk has gone home by then.', fix: 'A text-back would answer within a minute, from each clinic’s number.', act: 'Set up text-back',
    label: 'Missed calls · 14 clinics', value: '+18%', unit: '', sub: 'mostly after 5 PM',
    viz: { kind: 'area', points: [10, 11, 10, 12, 13, 12, 14, 15, 15, 17, 18], labels: ['Oct 1', 'today'] },
    note: 'I can text them back in a minute',
    intro: { id: 'd-calls-intro', t: 'Missed calls are up 18% at your 14 dental clients, mostly after 5 PM when the front desk has gone home. A text-back can reply within a minute.' },
    big: { kind: 'flow', nodes: ['Missed call', 'Wait 1 min', 'Text back', 'Book'] },
    can: [
      { label: 'Set up text-back', id: 'd-calls-set', t: 'Built and tested. The text goes out a minute after a missed call, from each clinic’s own number. It’s live at all 14 tonight.', effect: 'heal' },
      { label: 'What will the text say?', id: 'd-calls-text', t: '“Sorry we missed you! Reply here to book, or tap this link.” You can change it anytime.' },
    ],
  },
  {
    id: 'reviews', heat: 'warm', agent: 'reviews', pos: [64, 15], size: 180, tilt: -6, shape: 3,
    receipt: 'All 41 sent, in your voice', rule: 'Can I send 4–5★ replies on my own, and show you 1–3★?',
    problem: '41 reviews waiting for a reply', cost: 'oldest is 6 days', cause: '6 clinics · avg 4.7★', fix: 'I’ve drafted a warm reply to each, in your brand voice.', act: 'Send all 41',
    label: 'Reviews', value: '4.8★', unit: '', sub: '41 waiting for a reply',
    viz: { kind: 'hist', rows: [['5★', 78], ['4★', 14], ['3★', 5], ['2★', 2], ['1★', 1]], note: '41 new' },
    note: 'I can reply in your voice',
    intro: { id: 'd-rev2-intro', t: '41 new reviews are waiting for a reply across 6 clinics. The oldest is 6 days. I’ve drafted a warm reply to each one, in your brand voice.' },
    big: { kind: 'quote', who: 'Dana R. · Harbor Dental ★★★★★', q: '“Dr. Lee was so gentle with my son. We’ll be back!”', a: 'Thank you, Dana! We loved meeting your son. See you both at the next cleaning.' },
    can: [
      { label: 'Send all 41 replies', id: 'd-rev2-send', t: 'Sending now. All 41 replies will be out in a few minutes, and you’ll see each one in tomorrow’s brief.', effect: 'heal' },
      { label: 'Let me approve each one', id: 'd-rev2-approve', t: 'Okay. They’ll wait in your inbox, and you can approve them in one swipe each.' },
    ],
  },
  {
    id: 'voicemail', heat: 'warm', agent: 'voice', pos: [64, 58], size: 200, tilt: -3, shape: 4,
    receipt: 'Reply sent · call with Jen at 2 PM',
    problem: 'Jen at Lumen Spa is upset', cost: '0:48 voicemail', cause: 'Three bad reviews this week, no callback yet.', fix: 'I’ve drafted a reply and can book a call at 2 PM.', act: 'Send the reply',
    label: 'Voicemail · Lumen Spa', value: '0:48', unit: '', sub: 'Jen sounds upset',
    viz: { kind: 'wave', at: 0.64 },
    note: 'I can draft a callback',
    intro: { id: 'd-vm-intro', t: 'Jen from Lumen Spa left a 48 second voicemail. She’s upset about three bad reviews this week and says nobody called her back.' },
    big: { kind: 'quote', who: 'Jen · Lumen Spa · 8:12 AM', q: '“…three bad reviews this week, and nobody called me back. I need someone to look at this today.”', a: 'Hi Jen, it’s Maya. I heard your message. I’m on it, and I’ll call you at 2 with a plan for those reviews.' },
    can: [
      { label: 'Send that reply', id: 'd-vm-send', t: 'Sent by text from your number, and I put a call with Jen on your calendar at 2 PM.', effect: 'heal' },
      { label: 'Summarize the reviews', id: 'd-vm-sum', t: 'All three mention long waits on Saturday. It’s one scheduling issue, not three separate problems.' },
    ],
  },
  {
    id: 'lead', heat: 'warm', agent: 'bookings', pos: [66, 38], size: 170, tilt: 6, shape: 5,
    receipt: 'Brief is in the 11:00 invite',
    problem: 'New lead booked a call at 11:00', cost: 'Dr. Priya Nair', cause: 'Smile Studio · 2 clinics · wants reviews and missed calls', fix: 'I can prep a one-page brief, leading with Harbor Dental’s results.', act: 'Prep me',
    label: 'New lead · 2:14 AM', value: 'Dr. Priya Nair', unit: '', sub: 'Smile Studio · call at 11:00',
    viz: { kind: 'lead', initials: 'PN', who: 'Smile Studio · 2 clinics', tags: ['reviews', 'missed calls'] },
    note: 'I can prep you for 11:00',
    intro: { id: 'd-lead-intro', t: 'Dr. Priya Nair from Smile Studio booked a call at 11. She runs two clinics and wants help with reviews and missed calls. Both are things you just fixed for others.' },
    big: { kind: 'list', rows: [['Clinics', '2 · Austin'], ['Wants', 'Reviews, missed calls'], ['Found you', 'Google search'], ['Budget', '~$1.5k/mo']] },
    can: [
      { label: 'Prep me for the call', id: 'd-lead-prep', t: 'Lead with Harbor Dental: same size, and reviews went from 4.1 to 4.8 in two months. I put a one-page brief in your calendar invite.', effect: 'heal' },
      { label: 'Send her a case study', id: 'd-lead-case', t: 'Sent the Harbor Dental case study with a short note. She opened it a minute ago.' },
    ],
  },
  {
    id: 'agents', heat: 'cool', agent: 'workflows', pos: [89, 13], size: 150, tilt: -2, shape: 6,
    label: 'AI team', value: '27', unit: 'agents', sub: '4 working right now',
    viz: { kind: 'ring', n: 27, on: [3, 11, 16, 22] },
    note: 'I can show you their work',
    intro: { id: 'd-agents-intro', t: 'Your 27 agents are all healthy. Four are working right now: two answering chats, one booking calls, and one sending review requests.' },
    big: { kind: 'list', rows: [['Conversation AI', '12 · 2 working'], ['Voice AI', '6 · 1 working'], ['Reviews AI', '5 · 1 working'], ['Workflow AI', '4 · idle']] },
    can: [
      { label: 'What did they do overnight?', id: 'd-agents-night', t: 'They replied to 148 leads, tagged 96, booked 4 calls after hours, and fixed a broken trigger at Peak Fitness.' },
      { label: 'Set up a new agent', id: 'd-agents-new', t: 'Tell me what it should do, like answer calls after hours or reply to new reviews, and I’ll build it with you.' },
    ],
  },
  {
    id: 'mrr', heat: 'cool', agent: 'billing', pos: [15, 14], size: 190, tilt: 2, shape: 7,
    label: 'Agency MRR', value: '$412.8k', unit: '', sub: '+6.2% on September',
    viz: { kind: 'area', points: [30, 32, 31, 35, 34, 33, 28, 36, 40, 42, 45], labels: ['Sep', 'Oct'] },
    note: 'I can explain the dip',
    intro: { id: 'd-mrr-intro', t: 'Monthly revenue is $412.8k, up 6.2% on September. The small dip mid-month is the same three accounts on your desk.', say: 'Monthly revenue is 412.8 thousand dollars, up 6.2 percent on September. The small dip mid-month is the same three accounts on your desk.' },
    big: { kind: 'line', points: [30, 32, 31, 35, 34, 33, 28, 36, 40, 42, 45], label: 'MRR · last 11 weeks', good: true },
    can: [
      { label: 'Show me by client', id: 'd-mrr-client', t: 'Your top five clients are 31% of revenue. Harbor Dental is the only one trending down, and that’s the ads.' },
    ],
  },
  {
    id: 'spend', heat: 'cool', agent: 'billing', pos: [90, 36], size: 140, tilt: 4, shape: 8,
    label: 'AI spend · Oct', value: '$1,920', unit: '', sub: 'of $2,500',
    viz: { kind: 'gauge', pct: 77, proj: 96 },
    note: 'I can cap it',
    intro: { id: 'd-spend-intro', t: 'You’ve spent $1,920 of your $2,500 AI budget this month. At this pace you’ll land around $2,410.', say: 'You’ve spent 1,920 dollars of your 2,500 dollar AI budget this month. At this pace you’ll land around 2,410.' },
    big: { kind: 'ring', pct: 77, label: '$1,920 of $2,500 · projected $2,410' },
    can: [
      { label: 'Cap it at $2,500', id: 'd-spend-cap', t: 'Capped. If you get close, I’ll pause the least useful agents first and tell you.', effect: 'heal' },
    ],
  },
  {
    id: 'bookings', heat: 'cool', agent: 'bookings', pos: [88, 60], size: 150, tilt: -5, shape: 9,
    label: 'Bookings today', value: '23', unit: '', sub: '3 gaps this afternoon',
    viz: { kind: 'slots', slots: [1, 1, 1, 0, 1, 1, 0, 1, 0, 1], labels: ['9a', '5p'] },
    note: 'I can fill the gaps',
    intro: { id: 'd-book-intro', t: '23 bookings today across your clinics, with three open slots this afternoon at Harbor Dental.' },
    big: { kind: 'cal', slots: [1, 1, 1, 0, 1, 1, 0, 1, 0, 1], label: 'Harbor Dental · today' },
    can: [
      { label: 'Fill the 3 gaps', id: 'd-book-fill', t: 'I texted 12 patients on the waitlist. Two have already taken the 2 and 3:30 slots.', effect: 'heal' },
    ],
  },
  {
    id: 'invoices', heat: 'warm', agent: 'billing', pos: [13, 59], size: 150, tilt: 7, shape: 10,
    receipt: 'Reminders sent to 3 · follow-up Thursday', rule: 'Can I send first reminders on my own?',
    problem: '3 invoices overdue', cost: '$2,140', cause: 'Oldest is 12 days, from Harbor Dental.', fix: 'I can send a friendly reminder with a pay link to all three.', act: 'Send a nudge',
    label: 'Invoices', value: '$2,140', unit: '', sub: '3 overdue',
    viz: { kind: 'aging', rows: [['Harbor', 12, '$1,200'], ['Glow', 5, '$640'], ['Peak', 3, '$300']] },
    note: 'I can nudge them',
    intro: { id: 'd-inv-intro', t: 'Three invoices are overdue, $2,140 in total. The oldest is 12 days, from Harbor Dental.', say: 'Three invoices are overdue, 2,140 dollars in total. The oldest is 12 days, from Harbor Dental.' },
    big: { kind: 'list', rows: [['Harbor Dental', '$1,200 · 12 days'], ['Glow Med Spa', '$640 · 5 days'], ['Peak Fitness', '$300 · 3 days']] },
    can: [
      { label: 'Send a friendly nudge', id: 'd-inv-nudge', t: 'Sent a friendly reminder with a pay link to all three. I’ll follow up Thursday if they’re still open.', effect: 'heal' },
    ],
  },
  {
    id: 'make', heat: 'cool', agent: 'content', pos: [14, 37], size: 160, tilt: -8, shape: 11,
    label: 'Make something', value: '+', unit: '', sub: 'site · funnel · campaign · agent',
    viz: { kind: 'plus' },
    note: 'Tell me what to make',
    intro: { id: 'd-make-intro', t: 'What should we make? I can build a website, a funnel, an email campaign or a new agent. Just describe it.' },
    big: { kind: 'make' },
    can: [
      { label: 'A spring offer campaign', id: 'd-make-camp', t: 'Drafting a three-email spring offer for your past clients. You’ll see it here in a minute, before anything sends.', effect: 'heal' },
      { label: 'A booking page for Glow', id: 'd-make-page', t: 'Building a one-page booking site for Glow Med Spa with their colors and services. First draft in two minutes.', effect: 'heal' },
    ],
  },
  {
    id: 'social', heat: 'cool', agent: 'content', pos: [40, 12], size: 120, tilt: 3, shape: 12,
    label: 'Social', value: '4 PM', unit: '', sub: 'next post scheduled',
    viz: { kind: 'week', days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], state: ['next', 'none', 'set', 'empty', 'empty', 'empty', 'empty'], note: 'queue runs out Thu' },
    note: 'I can write 5 more',
    intro: { id: 'd-social-intro', t: 'Your next post goes out at 4 PM for Harbor Dental. The queue runs out on Thursday.' },
    big: { kind: 'list', rows: [['Today 4 PM', 'Harbor · “Smile season”'], ['Wed 10 AM', 'Glow · before & after'], ['Thu', 'Queue empty']] },
    can: [
      { label: 'Write 5 more', id: 'd-social-more', t: 'Five new posts drafted for next week, in each clinic’s voice. They’re waiting in your planner.', effect: 'heal' },
    ],
  },
]

// Related things the AI drew a thread between.
// ── One AI option ────────────────────────────────────────────────────────────
// Shown only when the prototype option "Desk · One AI" is on.
export const ONE_ITEMS = [
  {
    id: 'callers', heat: 'hot', agent: 'voice', only: 'one', pos: [26, 83], size: 200, tilt: 3, shape: 1,
    nums: [['2', 'callers'], ['2', 'clinics each'], ['1', 'quote ready']],
    label: 'Voice AI · 2 callers', value: '2', unit: 'callers', sub: 'asked for you',
    viz: { kind: 'wave' },
    note: 'I can call them back with you',
    problem: 'Two callers asked for you', cost: 'both about pricing',
    cause: 'Voice AI took both calls after 6 PM; each wanted a quote for two clinics.',
    fix: 'Notes are ready. I can dial each one and brief you in a line first.',
    act: 'Call them back',
    receipt: 'Both called back · 1 quote sent', rule: 'Can I quote the standard price on calls myself?',
    intro: { id: 'd-callers-intro', t: 'Two callers asked for you last night, both about pricing for two clinics. I have notes on each. Want me to dial the first one?' },
    big: { kind: 'list', rows: [['Dana Ruiz · Bright Smiles', '6:12 PM · wants the two-clinic plan'], ['Mark Chen · Riverside Dental', '7:40 PM · asked about setup cost']] },
    can: [
      { label: 'Call them back', id: 'd-callers-call', t: 'Dialing Dana first. One line: she runs two clinics and wants the family plan. Mark is next; he asked about setup cost.', effect: 'heal' },
      { label: 'Text them a quote instead', id: 'd-callers-text', t: 'Sent both the standard two-clinic quote by text, from your number, with a link to book a call.', effect: 'heal' },
    ],
  },
  {
    id: 'idea', heat: 'cool', agent: 'content', only: 'one', pos: [76, 83], size: 170, tilt: -3, shape: 4,
    nums: [['12', 'dentists'], ['1', 'shared offer'], ['~3', 'new patients each a month']],
    label: 'Just an idea', value: '12', unit: 'dentists', sub: 'a referral loop?',
    viz: { kind: 'plus' },
    note: 'Want a sketch?',
    problem: '12 of your accounts are dentists', cost: '',
    cause: '',
    fix: 'A shared referral offer between them, tracked per clinic. I can draft it.',
    act: 'Sketch it',
    intro: { id: 'd-idea-intro', t: 'Just an idea. Twelve of your accounts are dentists. A referral loop between them could send each one a few new patients a month. Want a sketch?' },
    big: { kind: 'list', rows: [['Offer', 'Refer a friend, both get a free whitening'], ['Tracking', 'One code per clinic'], ['Launch', 'Text to past patients, then a post']] },
    can: [
      { label: 'Sketch it', id: 'd-idea-sketch', t: 'Here is the sketch: one shared offer, a code per clinic, and a text to past patients first. Nothing goes out until you say so.', effect: 'heal' },
      { label: 'Not for us', id: 'd-idea-no', t: 'Okay, I will drop it. I will not bring this one up again.' },
    ],
  },
  {
    id: 'trust', heat: 'cool', agent: 'workflows', only: 'one', nocard: true, pos: [50, 50], size: 160, tilt: 0, shape: 0,
    nums: [['3', 'on my own'], ['3', 'ask first'], ['2', 'never']],
    label: 'What I do on my own', value: '9', unit: 'things', sub: '312 actions this month · 0 undone',
    viz: { kind: 'ring', n: 12, on: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    note: 'Change it by saying it',
    intro: { id: 'd-trust-intro', t: 'Here is what I do on my own, what I ask you about first, and what I never touch. Change any of it by telling me.' },
    big: { kind: 'list', rows: [['Calls, texts, bookings', 'on my own'], ['4–5★ review replies', 'on my own'], ['Pause a losing ad', 'on my own'], ['Resume ads · raise budget', 'ask first'], ['1–3★ review replies', 'ask first'], ['Quote a price', 'ask first'], ['Refunds · change a price', 'never'], ['Cancel a booking', 'never']] },
    can: [
      { label: 'Stop replying to 3★ reviews on your own', id: 'd-trust-3star', t: 'Done. From now on I draft replies to one to three star reviews and wait for you.' },
      { label: 'Handle ads on your own', id: 'd-trust-ads', t: 'Okay. I can pause and resume ads on my own now, up to the budget you set. Raising the budget still comes to you.' },
    ],
  },
  {
    id: 'newbiz', heat: 'cool', agent: 'workflows', only: 'one', nocard: true, pos: [50, 50], size: 160, tilt: 0, shape: 0,
    nums: [['4', 'to connect'], ['3', 'builds on day 1'], ['12', 'clients to win back']],
    label: 'Glow Med Spa · day one', value: '4', unit: 'to connect', sub: 'Google · email · social · phone',
    viz: { kind: 'ring', n: 4, on: [] },
    note: 'One sign-in for all four',
    intro: { id: 'd-new-intro', t: 'Setting up Glow Med Spa. One sign-in connects Google, email, social and the phone line. Then I build the booking page, missed-call text-back and review requests. Want me to start?' },
    big: { kind: 'list', rows: [['Day 1', 'Connect the four accounts'], ['Day 1', 'Booking page · text-back · review requests'], ['Day 3', 'Win back 12 past clients']] },
    can: [
      { label: 'Start the setup', id: 'd-new-start', t: 'Connecting the four accounts now. The booking page, text-back and review requests will be ready for your okay in about ten minutes.', effect: 'heal' },
      { label: 'What will it cost?', id: 'd-new-cost', t: 'About 28 dollars a month at this size: a few cents a message, 13 cents a minute on calls, nothing while it is quiet.' },
    ],
  },
]

export const THREADS = [['ads', 'revenue', 'same story']]

// Circle-to-ask: what the AI says when you draw a loop around things.
export const LASSO = {
  pair: { id: 'd-lasso-pair', t: 'You circled the ads and the revenue dip. They’re the same story: Harbor’s card expired. One fix covers both. Want to talk about them together?' },
  many: { id: 'd-lasso-many', t: 'Got it. I pulled those into one conversation. Ask me anything about them together.' },
  one: { id: 'd-lasso-one', t: 'You circled one thing. Opening it.' },
}

export const FALLBACK = { id: 'd-fallback', t: 'I can only follow today’s desk in this prototype. Try one of the buttons, or circle something.' }
export const HEARD = { id: 'd-heard', t: 'On it.' }

/** Every line the voice speaks, for tools/gen-desk.mjs. */
// Make: Website / Funnel. What the AI says when asking what to build, when a build starts, and when the draft is ready.
export const BUILD_LINES = {
  'd-ask-site': 'What kind of site? I’ve got three I can start right now, from what’s on your desk. Pick one and you’ll see it build.',
  'd-ask-funnel': 'Which offer? A funnel is one page, one form, one thank-you. Pick one and I’ll build it while you watch.',
  'b-glow': 'Building Glow’s booking page: their colours, five treatments, and a form that books straight into the calendar. Watch it come together on the right.',
  'b-harbor': 'Building a calm, modern site for Harbor Dental: same-day visits up front, Invisalign and whitening, and online booking. Watch it on the right.',
  'b-peak': 'Building Peak’s launch page for the Eastside gym: bold type, class schedule, and a first-week-free sign-up. Watch it on the right.',
  'f-glow': 'Building the Spring Glow funnel: one page, 15% off a first visit, a three-step booking. Watch it on the right.',
  'f-harbor': 'Building Harbor’s new-patient funnel: exam and x-rays for $79, one form, straight into the calendar. Watch it on the right.',
  'f-peak': 'Building Peak’s launch funnel: first week free at Eastside, pick a class, done. Watch it on the right.',
  'd-build-ready': 'Draft one is ready. Expand it, open it in your browser, or tell me what to change. Nothing is live until you say so.',
}


// Lines the desk says on its own (recorded in the same voice as everything else).
export const DYN = {
  'd-greet-brief': 'Three accounts dipped. Ads paused since Tuesday. Missing calls after 5 PM. Say “fix them” and I’ll handle all of it.',
  'd-brief3': 'Three things need you. Three accounts dipped. Ads paused since Tuesday. Missing calls after 5 PM. Say “fix them” and I’ll take care of all of it, or name one.',
  'd-quiet': 'Nothing needs you today. Want a hand with something?',
  'd-quiet2': 'Nothing needs you right now. Everything else is running.',
  'd-catch-desk': 'I didn’t catch that. Ask what needs you, say “fix them”, or name one: Harbor’s ads, the reviews, the missed calls.',
  'd-later': 'Here’s what you put off.',
  'd-later-none': 'Nothing’s been put off. Everything that needs you is on the list.',
  'd-back': 'Done. They’re back on your list.',
  'd-putoff': 'Okay. I’ll bring it back tomorrow morning.',
  'd-catch-short': 'Did you mean one of these?',
  'd-catch-room': 'I didn’t catch that. You can say “fix it”, “fix everything”, or pick one of the choices.',
  'd-all-done': 'That’s everything. Nothing else needs you right now.',
  'd-dash': 'Here’s everything that’s running.',
  'd-focus': 'Back to what needs you.',
  'd-thanks': 'Any time. Say the word when you want the next thing done.',
  'd-help': 'I watch your desk and act on it. Ask what needs you, tell me to fix things, or say build me a website.',
  'd-who': 'I’m your desk. HighLevel AI, running your agency with you.',
  'd-ok': 'Okay.',
  'd-done-already': 'That one’s already done.',
  'd-make-website': 'Sure. Let’s make a website. Who is it for?',
  'd-make-funnel': 'Sure. Let’s make a funnel. Who is it for?',
  'd-make-campaign': 'Sure. Let’s make a campaign. Who is it for?',
  'd-make-agent': 'Sure. Let’s make an agent. Who is it for?',
  'p-short': 'Done: a shorter headline. Want it warmer too?',
  'p-dark': 'Done: the hero is darker now.',
  'p-warm': 'Done: warmer. The accent is blush now.',
  'p-pricing': 'Prices are already on each treatment. Want a pricing table under the hero instead?',
  'p-fewer': 'I can drop Stories or Stats. Which one?',
  'p-catch': 'I can change the headline, the hero, the colours or the sections. Which one?',
}

export function allLines() {
  const out = [GREETING, GREETING_ONE, LASSO.pair, LASSO.many, LASSO.one, FALLBACK, HEARD]
  for (const it of [...ITEMS, ...ONE_ITEMS]) out.push(it.intro, ...it.can)
  for (const [id, t] of Object.entries(BUILD_LINES)) out.push({ id, t })
  for (const [id, t] of Object.entries(DYN)) out.push({ id, t })
  return out.map((l) => ({ id: l.id, text: l.say ?? l.t }))
}
