// Live work for the room (prototype option "In the room · Live work").
// LIVE: what the AI is working from, per item: a few numbers, the rows it touches, and what to expect.
// A row is [name, before, after]; a stat is [label, before, after, tone?]. "after" is what shows once the fix has run.
// STEPS: what it does when a fix runs, per line id: [label, detail]. They tick off as the line is spoken.

export const LIVE = {
  revenue: {
    stats: [['Lost this month', '−$4.8k', '−$1.2k', 'hot'], ['Won back', '$0', '+$3.6k/mo', 'good']],
    rows: [['Harbor Dental · ads', 'paused', 'live ✓'], ['Peak Fitness · widget', 'broken', 'fixed ✓'], ['Lumen Spa · reviews', 'stopped', 'Monday, needs Jen']],
    expect: 'All three back by Monday: $4.6k/mo',
  },
  ads: {
    stats: [['At risk', '−$2.4k/mo', '$0', 'hot'], ['Spend', '$0/wk', '$640/wk', 'good']],
    rows: [['Card ending 2210', 'expired', 'removed'], ['Card ending 4411', 'on file', 'default ✓'], ['3 campaigns', 'paused', 'live ✓']],
    expect: 'First clicks within the hour, ~14 bookings a week',
  },
  calls: {
    stats: [['Missed after 5 PM', '31', '31', 'hot'], ['Texted back', '0', '14 clinics', 'good']],
    rows: [['Harbor Dental', '9 missed', 'tested ✓'], ['Peak Fitness', '6 missed', 'live ✓'], ['Lumen Spa', '4 missed', 'live ✓'], ['+ 11 clinics', '12 missed', 'live ✓']],
    expect: '~9 of 31 callers book: about $1.1k/week',
  },
  reviews: {
    stats: [['Waiting', '41', '0', 'warm'], ['Sent', '0', '41', 'good']],
    rows: [['Oldest · 6 days', 'drafted', 'sent ✓'], ['4–5★ · 33', 'drafted', 'sent ✓'], ['1–3★ · 8', 'drafted', 'sent, softer tone ✓']],
    expect: 'Replies lift rating ~0.2★ in a month',
  },
  voicemail: {
    stats: [['Jen · Lumen Spa', '0:48', 'replied', 'warm'], ['Bad reviews', '3', 'on the 2 PM call']],
    rows: [['Reply', 'drafted in your voice', 'sent by text ✓'], ['Call', 'none', '2:00 PM today ✓'], ['Review requests', 'stopped', 'restart after call']],
    expect: 'Lumen stays: $800/mo kept',
  },
  lead: {
    stats: [['Call', '11:00', '11:00'], ['Brief', 'none', 'in the invite', 'good']],
    rows: [['Smile Studio', 'booked 2:14 AM', 'brief ready ✓'], ['Harbor Dental', 'similar clinic', 'cited: 4.1 → 4.8★'], ['Offer', 'none', 'reviews plan, $240/mo']],
    expect: 'A $240/mo account if she signs',
  },
  spend: {
    stats: [['This month', '$1,920', '$1,920'], ['Cap', 'none', '$2,500', 'good']],
    rows: [['Projected', '$2,410', 'under cap ✓'], ['If close', 'nothing', 'pause least-used agents'], ['You get told', 'never', 'at $2,300']],
    expect: 'Never over budget without your okay',
  },
  bookings: {
    stats: [['Gaps today', '3', '1', 'warm'], ['Waitlist texted', '0', '12', 'good']],
    rows: [['2:00 PM', 'open', 'taken ✓'], ['3:30 PM', 'open', 'taken ✓'], ['4:45 PM', 'open', 'still open']],
    expect: 'Two slots filled: about $300 today',
  },
  invoices: {
    stats: [['Overdue', '$2,140', '$2,140', 'warm'], ['Reminded', '0', '3', 'good']],
    rows: [['Bright Smiles · $900', '12 days', 'reminder + link ✓'], ['Peak Fitness · $740', '9 days', 'reminder + link ✓'], ['Lumen Spa · $500', '6 days', 'reminder + link ✓']],
    expect: 'Most pay within 3 days of a nudge',
  },
  make: {
    stats: [['Drafts', '0', '1', 'good'], ['Goes out', 'nothing', 'only after your okay']],
    rows: [['Brand', 'Glow Med Spa', 'colours + services pulled ✓'], ['Copy', 'none', 'first draft ✓'], ['Send / publish', 'off', 'waiting for you']],
    expect: 'Ready to review in about a minute',
  },
  social: {
    stats: [['Scheduled', '1', '6', 'good'], ['Next post', '4 PM', '4 PM']],
    rows: [['Tue · before/after', 'drafted', 'scheduled ✓'], ['Thu · review quote', 'drafted', 'scheduled ✓'], ['Sat · offer', 'drafted', 'scheduled ✓']],
    expect: 'A post every weekday through next week',
  },
  callers: {
    stats: [['Asked for you', '2', '0', 'hot'], ['Quotes', '0', '1 sent', 'good']],
    rows: [['Dana Ruiz · Bright Smiles', '6:12 PM · two-clinic plan', 'called ✓'], ['Mark Chen · Riverside Dental', '7:40 PM · setup cost', 'quote sent ✓']],
    expect: 'Two clinics each: ~$480/mo if both sign',
  },
  idea: {
    stats: [['Dentists', '12', '12'], ['New patients', '0', '~3 each / mo', 'good']],
    rows: [['Offer', 'none', 'refer a friend, both get a whitening'], ['Tracking', 'none', 'one code per clinic'], ['Launch', 'none', 'text past patients, then a post']],
    expect: 'Nothing goes out until you say so',
  },
  newbiz: {
    stats: [['Connected', '0 of 4', '4 of 4', 'good'], ['Built', '0', '3 by tonight', 'good']],
    rows: [['Google · email · social · phone', 'not connected', 'one sign-in ✓'], ['Booking page', 'none', 'draft ✓'], ['Missed-call text-back', 'none', 'tested ✓'], ['Review requests', 'none', 'on ✓']],
    expect: 'First 12 win-back texts on day 3',
  },
}


/**
 * V2 results (option A): one row per account, in plain sentences.
 * head/sub: [before the fix, after]. A row: { name, bad, before, after, state: ok | you | wait, label, acts }.
 * acts: { label, open } opens another room; { label, toast, resolve } settles the row here.
 */
export const RESULT = {
  make: {
    head: ['Let’s make something', 'Draft 1 is ready to look at'],
    sub: ['Pick what to build and I’ll start right away.', 'Nothing goes live until you say so.'],
    rows: [
      { name: 'Brand', bad: 'Not picked', tone: 'neutral', before: 'Pick one below and I’ll pull its colours, fonts and services.', after: '{brand}’s colours and services pulled in.', state: 'ok', label: 'Done' },
      { name: 'Copy', bad: 'Not started', tone: 'neutral', before: 'Headline, services and booking section.', after: 'First draft written in {brand}’s voice.', state: 'ok', label: 'Written' },
      { name: 'Publishing', bad: 'Off', tone: 'neutral', before: 'Stays a draft while we work on it.', after: 'Waiting for your okay to go live.', state: 'wait', label: 'Your call' },
    ],
  },
  revenue: {
    head: ['3 accounts are down $4.8k a month', '2 of 3 fixed · $3.6k a month back'],
    sub: ['Two fixes are safe to run now. One needs you.', '$1.2k still at risk until Lumen restarts on Monday.'],
    rows: [
      { name: 'Harbor Dental · ads', bad: 'Paused', before: 'Google Ads stopped when the card on file expired.', after: 'Switched to the new card; 3 campaigns are live.', state: 'ok', label: 'Fixed' },
      { name: 'Peak Fitness · booking widget', bad: 'Broken', before: 'The booking widget stopped taking bookings.', after: 'Repaired and tested; 1 booking already in.', state: 'ok', label: 'Fixed' },
      { name: 'Lumen Spa · review requests', bad: 'Stopped', before: 'Review requests stopped after Jen’s complaint.', after: 'Paused on purpose. Call Jen first, then I restart them Monday.', state: 'you', label: 'Needs you', acts: [{ label: 'Call Jen', open: 'voicemail' }, { label: 'Restart now anyway', toast: 'Okay. Lumen’s review requests restart now.', resolve: 'Restarted', head: 'All 3 back on · $4.8k a month back', sub: 'Lumen’s review requests restarted now, not Monday.' }] },
    ],
  },
  ads: {
    head: ['Harbor’s ads have been off since Tuesday', 'Harbor’s ads are live again'],
    sub: ['About $2.4k a month in bookings at risk.', 'First clicks within the hour · $640 a week.'],
    rows: [
      { name: 'Card ending 2210', bad: 'Expired', before: 'Expired on Oct 28, so Google stopped the ads.', after: 'Removed from the account.', state: 'ok', label: 'Removed' },
      { name: 'Card ending 4411', bad: 'Unused', before: 'A newer card is already on file.', after: 'Set as the default card.', state: 'ok', label: 'Default' },
      { name: '3 campaigns', bad: 'Paused', before: 'All three campaigns are paused.', after: 'Resumed; Google confirmed.', state: 'ok', label: 'Live' },
    ],
  },
  calls: {
    head: ['31 calls missed after 5 PM this month', 'Text-back is live at all 14 clinics'],
    sub: ['Up 18%; the front desk has gone home by then.', 'About 9 of 31 callers should book: ~$1.1k a week.'],
    rows: [
      { name: 'Harbor Dental', bad: '9 missed', before: 'Nine calls went unanswered after hours.', after: 'Tested: a text went out 42 seconds after a missed call.', state: 'ok', label: 'Live' },
      { name: 'Peak Fitness', bad: '6 missed', before: 'Six calls went unanswered after hours.', after: 'Text-back on, from the clinic’s own number.', state: 'ok', label: 'Live' },
      { name: 'Lumen Spa', bad: '4 missed', before: 'Four calls went unanswered after hours.', after: 'Text-back on, from the clinic’s own number.', state: 'ok', label: 'Live' },
      { name: '11 more clinics', bad: '12 missed', before: 'Twelve calls missed across the rest.', after: 'Live tonight; first report tomorrow at 9.', state: 'ok', label: 'Live' },
    ],
  },
  reviews: {
    head: ['41 reviews waiting for a reply', 'All 41 replies sent'],
    sub: ['The oldest has waited 6 days.', 'Expect about +0.2★ within a month.'],
    rows: [
      { name: 'The oldest one', bad: '6 days', before: 'Waiting the longest.', after: 'Replied first.', state: 'ok', label: 'Sent' },
      { name: '33 happy reviews', bad: 'Waiting', before: '4–5★, a reply drafted for each.', after: 'Warm thank-yous sent from each clinic.', state: 'ok', label: 'Sent' },
      { name: '8 unhappy reviews', bad: 'Waiting', before: '1–3★, these need care.', after: 'Sent with a softer tone and an offer to talk.', state: 'ok', label: 'Sent' },
    ],
  },
  voicemail: {
    head: ['Jen at Lumen Spa left an upset voicemail', 'Jen has a reply and a 2 PM call'],
    sub: ['48 seconds · three bad reviews this week.', 'Lumen stays: $800 a month kept.'],
    rows: [
      { name: 'Reply', bad: 'Drafted', before: 'An apology drafted in your voice.', after: 'Sent by text from your number.', state: 'ok', label: 'Sent' },
      { name: 'Call', bad: 'None', before: 'No call booked yet.', after: 'On your calendar at 2:00 PM today.', state: 'ok', label: 'Booked' },
      { name: 'Review requests', bad: 'Still on', before: 'Still going out to Lumen’s clients.', after: 'Paused until you’ve talked to her.', state: 'wait', label: 'After the call' },
    ],
  },
  lead: {
    head: ['A new lead booked a call at 11:00', 'Your 11:00 brief is ready'],
    sub: ['Dr. Priya Nair · Smile Studio.', 'A $240 a month account if she signs.'],
    rows: [
      { name: 'Smile Studio', bad: 'No brief', before: 'Booked at 2:14 AM; nothing prepared.', after: 'One-page brief added to the invite.', state: 'ok', label: 'Ready' },
      { name: 'Harbor Dental', bad: 'Similar', before: 'A clinic like hers you already run.', after: 'Cited as proof: 4.1 → 4.8★ in two months.', state: 'ok', label: 'Cited' },
      { name: 'Offer', bad: 'None', before: 'No offer yet.', after: 'Reviews plan at $240 a month.', state: 'ok', label: 'Drafted' },
    ],
  },
  invoices: {
    head: ['3 invoices overdue · $2,140', 'All three reminded'],
    sub: ['The oldest is 12 days late.', 'Most pay within 3 days of a nudge.'],
    rows: [
      { name: 'Bright Smiles · $900', bad: '12 days', before: 'Twelve days overdue.', after: 'Friendly reminder sent with a pay link.', state: 'ok', label: 'Reminded' },
      { name: 'Peak Fitness · $740', bad: '9 days', before: 'Nine days overdue.', after: 'Friendly reminder sent with a pay link.', state: 'ok', label: 'Reminded' },
      { name: 'Lumen Spa · $500', bad: '6 days', before: 'Six days overdue.', after: 'Friendly reminder sent with a pay link.', state: 'ok', label: 'Reminded' },
    ],
  },
  bookings: {
    head: ['3 gaps in the calendar this afternoon', '2 of 3 gaps filled'],
    sub: ['23 bookings today so far.', 'About $300 more today.'],
    rows: [
      { name: '2:00 PM', bad: 'Open', before: 'Empty slot.', after: 'Taken from the waitlist in 4 minutes.', state: 'ok', label: 'Taken' },
      { name: '3:30 PM', bad: 'Open', before: 'Empty slot.', after: 'Taken from the waitlist in 9 minutes.', state: 'ok', label: 'Taken' },
      { name: '4:45 PM', bad: 'Open', before: 'Empty slot.', after: 'Still open; I’ll keep asking the waitlist.', state: 'wait', label: 'Still open' },
    ],
  },
  callers: {
    head: ['2 callers asked for you', 'Both callers answered'],
    sub: ['Voice AI took both calls after 6 PM.', 'Two clinics each: about $480 a month if both sign.'],
    rows: [
      { name: 'Dana Ruiz · Bright Smiles', bad: 'Waiting', before: 'Wants a plan for two clinics.', after: 'Called back with the family plan.', state: 'ok', label: 'Called' },
      { name: 'Mark Chen · Riverside Dental', bad: 'Waiting', before: 'Asked about the setup cost.', after: 'Quote sent by text.', state: 'ok', label: 'Quoted' },
    ],
  },
}

export const STEPS = {
  'd-rev-run': [['Switched Harbor’s ads to the new card', '3 campaigns live'], ['Fixed Peak’s booking widget', 'tested: 1 booking in'], ['Left Lumen for Jen', 'needs your call first'], ['Set a check for Monday', 'I’ll report then']],
  'd-ads-on': [['Removed the expired card', 'ending 2210'], ['Set card 4411 as default', 'on file ✓'], ['Resumed 3 campaigns', 'Google confirmed'], ['Watching for first clicks', 'within the hour']],
  'd-calls-set': [['Wrote the text', '“Sorry we missed you — reply here or we’ll call back in 10 min”'], ['Connected each clinic’s own number', '14 of 14'], ['Test call to Harbor Dental', 'text sent in 42s'], ['Rolled out to 13 more clinics', 'live tonight'], ['First report tomorrow 9 AM', '']],
  'd-rev2-send': [['Read all 41 reviews', '33 happy, 8 unhappy'], ['Drafted replies in your voice', 'softer tone on the 8'], ['Sending from each clinic’s profile', '41 of 41'], ['Each one lands in tomorrow’s brief', '']],
  'd-vm-send': [['Sent the reply by text', 'from your number'], ['Put a call on your calendar', 'Jen · 2:00 PM'], ['Paused review requests at Lumen', 'until you’ve talked']],
  'd-lead-prep': [['Pulled Smile Studio’s profile', '2 chairs, 4.1★'], ['Found the match', 'Harbor Dental: 4.1 → 4.8★ in 2 months'], ['Wrote a one-page brief', 'in the 11:00 invite']],
  'd-spend-cap': [['Set the cap', '$2,500'], ['Ranked agents by use', 'least useful first'], ['Set an alert', 'at $2,300']],
  'd-book-fill': [['Texted the waitlist', '12 patients'], ['2:00 PM taken', 'in 4 minutes'], ['3:30 PM taken', 'in 9 minutes'], ['4:45 still open', 'I’ll keep asking']],
  'd-inv-nudge': [['Wrote a friendly reminder', 'with a pay link'], ['Sent to all three', 'from your billing email'], ['Follow-up set', 'Thursday if still open']],
  'd-make-camp': [['Pulled past clients', '212 contacts'], ['Drafted email 1 of 3', 'spring offer'], ['Drafted emails 2 and 3', 'reminder, last call'], ['Waiting for your okay', 'nothing sends']],
  'd-make-page': [['Pulled Glow’s colours and services', ''], ['Wrote the page', 'hero, services, booking'], ['Connected the calendar', 'synced'], ['Draft 1 ready', 'two minutes']],
  'd-social-more': [['Picked 5 moments', 'reviews, before/after, offer'], ['Wrote the posts', 'in your brand voice'], ['Scheduled through next week', '4 PM each day']],
  'd-callers-call': [['Dialing Dana Ruiz', 'Bright Smiles · two clinics'], ['Briefed you in one line', 'family plan for both'], ['Dialing Mark Chen', 'Riverside Dental'], ['Setup cost answered', 'quote sent']],
  'd-callers-text': [['Wrote the two-clinic quote', 'standard price'], ['Texted both', 'from your number'], ['Added a booking link', 'for a call with you']],
  'd-idea-sketch': [['Drafted the offer', 'refer a friend, both get a whitening'], ['One code per clinic', '12 codes'], ['Wrote the first text', 'to past patients'], ['Waiting for your okay', '']],
  'd-new-start': [['One sign-in', 'Google, email, social, phone'], ['Built the booking page', 'draft'], ['Set up missed-call text-back', 'tested ✓'], ['Turned on review requests', ''], ['Day 3: win back 12 past clients', 'planned']],
}

/** Steering while it works: Pause and Stop act; the others are noted and change the plan. */
export const STEER = ['Pause', 'Stop']
