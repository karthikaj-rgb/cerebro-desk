# The Desk · audit · 4 Nov 2026

Scope: V1 and V2 of the Desk prototype (the-desk), every prototype option, the room, the website/funnel builder, the generated sites, at 1440×900, 1024×768 and 375×812 (iPhone). Checked in the app's browser plus a static code review of desk.js, desk.css, index.html, data.js, work.js, site/index.html and api/intent.js.

Legend: **Fixed** = corrected during the audit and deployed. **Open** = needs your call or more work. **By design** = not a bug, flagging so you know.

## 1. Breaks (anything that stops a flow)

- **Open · Hands-free voice can only be verified in Chrome with a real mic.** The app's browser blocks the microphone, so the listen → pause → resume loop, "fix them", and the Kokoro voice were tested by typing the same phrases and by simulated events. Everything behaved, but the actual recognition path is untested by me.
- **Open · Kokoro first load is slow.** First visit in V2 downloads ~330 MB (WebGPU, fp32) and takes about two minutes before the same voice as the greeting is available; until then replies use the browser voice. Cached afterwards. On a phone without WebGPU it uses the 92 MB WASM model and is slower per sentence. If this is too heavy for demos, the alternative is a cloud voice (needs a key).
- **Open · Claude understanding needs the key.** `/api/intent` is deployed and returns "no key" until `ANTHROPIC_API_KEY` is set on the cerebro-desk Vercel project. Until then speech is matched by the built-in rules only.
- **Fixed · Generated websites had no headline on phones.** The word-reveal animation never completed under 900 px, so the hero was blank. Now shown without the animation on phones.
- **Fixed · Scribble layout + V2 dashboard: the Back link was buried under the scattered cards.**
- **Fixed · Mic tap collided with the hands-free listener** (second recognition can't start while one runs), so a tap did nothing.
- **Fixed · Room voice/chat mode shared a storage key with the Desk option**, so the room could open in a mode called "one".

## 2. Visible glitches

- **Fixed · Funnel countdown stacked vertically on phones.**
- **Fixed · Phone: "Make something" line ran into "Made today".**
- **Fixed · Big orb leaked into chat bubbles and the panel thread in V2.**
- **Open · Panel canvas sometimes renders black for a moment after a resize** (the stitched lilac field is WebGL). Seen in the app's browser at 1024 px; verify in Chrome. Harmless if it's only the pane.
- **Open · V1 has no phone layout.** At 375 px V1 shows the desktop layout squeezed (panel takes the whole width, columns off-screen). V2 is the one with the phone layout. If V1 should work on phones too, that's new work.
- **Open · V2 Focus + Spotlight/One column front pages.** The Front page option only applies inside the dashboard view in V2 (Focus ignores it). Works, but the option row still shows on landing, which may confuse.
- **Open · Extra fonts load on every look.** Caveat, IBM Plex Mono, Inter Tight, JetBrains Mono and upright Instrument Serif are fetched even in Modern (they belong to Scribbles/Editorial). Not broken, just ~200 KB of unnecessary downloads on first paint.
- **By design · Frost look hides the lilac panel** (that's the team's V1 prototype style).
- **By design · Greeting waits for the first click.** Chrome won't autoplay audio; the first tap anywhere starts it.

## 3. Responsiveness

| Screen | 1440 | 1024 | 375 (phone) |
|---|---|---|---|
| V1 three columns | ok | ok | not supported (see above) |
| V1 One column / Spotlight | ok | ok | — |
| V1 Scribble (all three looks) | ok | ok | — |
| V1 room (creature, bar, chat, live) | ok | ok | — |
| V1 build + drafts + pop-up | ok | ok | — |
| V2 Focus, chip, Make something | ok | ok | ok |
| V2 empty state (Quiet day) | ok | ok | ok |
| V2 dashboard + Back | ok | ok | ok |
| V2 room voice / chat | ok | ok | ok |
| V2 build (site pane) | ok | ok | ok, full screen |
| V2 expanded draft + change chat | ok | ok | ok, chat as bottom sheet |
| V2 Scribble layout | ok | ok | ok |
| Phone tab (iPhone frame) | ok | ok | — |
| Generated site / funnel | ok | ok | ok (after fix) |
| Prototype panel | ok | ok | scrolls |

No horizontal overflow on any of the above. No JavaScript errors thrown during the pass (the 404s in the console are the app's browser probing for files that don't exist, not the Desk).

## 4. Options that interact

- V2 + Ask box "In the panel": works; the thread shows in the panel, rooms open beside it, the rail goes back.
- V2 + One AI: the Focus list picks up the One AI extras (four items).
- V2 + Editorial / Frost / Scribbles looks: Focus renders in each; Scribble layout shows the stack in pencil.
- V2 + Day Quiet: the empty state; the panel line reads "All quiet".
- Phone tab shares settings with the desktop (same browser storage), so flipping an option on the desktop changes the phone too.

## 5. Behaviour and animations

- Room open/close iris, card flips Stage↔Scribble, draft pop-up grow-from-click, build steps ticking, sparks on fix: all run.
- Hands-free loop: pauses while the AI speaks (so it doesn't hear itself), resumes after, dims to "Take your time" on silence.
- "Fix them": runs the first fix, then carries to the next room by itself, ends with "That's everything".
- Timers: build timer, hands-free loop and auto-run are cleared on close. (See code review below for anything the static pass flagged.)

## 5b. Second pass (evening)

- **Fixed · V1 now has a phone layout.** Panel becomes a strip (brand + the one line), columns stack, Make/Team chips wrap, room/build/pop-up/drafts all reflow. Scribble is forced to Stage under 760px and the switch is hidden there.
- **Fixed · Room no longer grows.** The stage keeps its height; new blocks (Doing it now, previews, Next) scroll into view and the earlier ones tuck under a soft fade at the top.
- **Fixed · Two voices.** Every fixed reply the desk composes (brief, quiet day, didn't catch that, that's everything, dashboard, thanks, help, the "Sure, let's make a…" lines, the draft-chat replies) is now a recorded Kokoro clip like the greeting. Only free-form Claude replies still depend on the in-browser model, which now falls back from WebGPU to WASM if the first fails.
- **Fixed · Phone details:** draft card stacks, row hover padding, sticky hover on touch, spoken line wrapping over the data block, voice bar over the build buttons, panel ask box pushing the desk off-screen, chips wrapping mid-word.
- **Cleanup done:** clashing `breathe` keyframes renamed, missing font weights added (Inter Tight 300, Frost 200→300), dead selectors removed (`.water`, `.hello-unused`, old chart classes, panel rules that never matched), dead V2 panel-strip rules removed, dead branch in Tidy removed.
- **Options, not yet decided:** where the "Next · needs you" card goes (mockups/next-placement.html) and how the phone voice bar holds its controls (mockups/phone-bar.html).

## 5c. Missed in the first pass, found later

- **Phone · room in chat mode was never checked.** The avatar orb in chat messages grew to 150px on phones (a V2 phone rule enlarged every orb), squeezing the text into a thin column. Fixed: 24px on phones.
- **Chat order.** The data block sat above the conversation. Fixed: it now rides under the AI's latest message, in both desktop and phone chat.
- **Glow crops.** The small orb in chat and the big orb in light mode had wide glows that the scrolling column cut into hard edges. Fixed in both themes; the room glow is also subtler.

## 6. Code review (static)

A second pass read every file without running it. What it found, and what happened to each:

**Fixed and deployed**
- One column front page showed no cards at all (a Spotlight-only rule hid every card). V1 bug since Spotlight was added.
- V2 + One AI: tapping the "Two callers" row threw, because the focus list looked items up in the wrong list.
- Hands-free listening stopped for good after the first spoken reply (the voice object was never cleared when a clip finished naturally).
- Pausing hands-free did not actually stop the recognition, so the mic could hear the AI's own words; same for the greeting. It now aborts the recognition before any line is spoken.
- Closing the room mid-build left the build timer running and threw once the room was empty.
- Phone frame: the iframe had no microphone permission, so every mic tap inside it failed. Also its scale on short screens was computed with invalid CSS; now computed in code.
- V2 + Bar voice (the default): the "I'm listening / Take your time" copy and the spoken line were hidden by a V1 rule.
- V2 + Editorial / Frost looks: the Focus stack sat under the greeting band.
- Ask box "In the panel" + Editorial / Frost: the room, veil and pop-up were shifted right by a panel that wasn't there; the panel thread dangled over the desk.
- Phone + Ask box "In the panel": there was no input at all. The bottom bar now shows on phones in that mode.
- Toasts inside a room were underneath the room (z-index). Now above.
- "Next · needs you" and "fix everything" could offer One-AI-only items in Today mode.
- Card "Later" and "Undo" now keep the shared state in sync and refresh the V2 list.
- "Fix everything" echoed your sentence and the chip label as two bubbles.
- Upright Instrument Serif was never loaded (empty state headline and Scribble rows fell back to Georgia).
- One-AI-only cards lost the flex layout in that mode.
- The phone frame no longer loads a second copy of the Kokoro model.
- Hands-free listens on the panel mic when the ask box is in the panel.
- Switching back to Voice no longer opens the mic over the AI's line.
- Media-element audio nodes are now disconnected after each clip (they accumulated for the session).
- The intent function reports a model/auth error as "unavailable" so the desk stops retrying it on every sentence.

**Open (cosmetic or needs a decision)**
- Three `@keyframes breathe` definitions fight; Editorial's hot/warm dots scale instead of fade. Rename.
- Frost uses Inter 200, and Editorial/Scribbles use weight 300 of Inter Tight, neither loaded; the browser synthesises them. Add the weights to the runtime font links.
- V2 dashboard view honours the Front page option (One column / Spotlight) instead of always showing three columns. Works; decide whether that's wanted.
- In Scribble + V2 the panel's pencil line "I circled three things" still shows on a Quiet day.
- The phone frame shares storage with the desktop page, so switching the desktop to V1 collapses the phone layout.
- Pause pressed while Kokoro is still generating a line flips the UI but the audio still plays when it arrives.
- Dead CSS and duplicated blocks (about 40 selectors, several rules defined twice with the later winning), unused `BOARD` table and `desk-layout` storage, an unused `greet.m4a` clip. Harmless; worth a cleanup pass before handing the code over.
- `claude-sonnet-5-5` as the model id in `api/intent.js` should be confirmed when the key goes in; a wrong id now shows as "unavailable" rather than breaking anything.

**Confirmed clean**
- Every line id in data.js has a clip in `audio/` and a duration; every step and key references a real item.
- The generated site's fonts cover every weight and style it uses.
- `api/intent.js` only uses APIs available on Vercel's edge runtime.

## 7. V2 re-audit (Nov 4, evening): fixed, see 7b

**Breaks the voice flow**
1. The room stops listening ~8 s after its intro: the intro starts hands-free twice and the second call cancels the first, so after Chrome's silence timeout the mic just goes dark.
2. When the AI starts talking, half a sentence you were saying gets sent as a command (aborted listening still submits its partial words).
3. After "Back to desktop", the hidden phone frame keeps listening and answering in the background; the desktop's own mic doesn't restart.
4. If the first click is the Phone tab, both copies talk: the desktop's greeting plays and the phone hears it and answers.
5. After pressing Stop mid-fix, hands-free never resumes and the last line stays dimmed; "fix them" chaining also stays on.
6. "Call Jen" during "fix them" gets replaced by the next room a second later.
7. "No, don't send it" runs the fix ("do it", "ok", "go" match without a negation check; chip matching is loose).
8. "Find new leads" opens Harbor's ads room ("ads" inside "leads"; same for agent/agency, post, pay).
9. Saying "later" in a room jumps to the next item, but the Later button puts it off: opposite meanings.
10. "Mic is on" + chime shows while the AI is still answering, though nothing is listening.
11. Switching V1 → V2 without a reload never turns hands-free on.
12. Asking for the dashboard / Later list from inside a room answers on the desk and leaves the room deaf.

**Wrong content or visuals**
13. Room equaliser goes flat while you talk (a style conflict).
14. Build room orb is 88px on desktop (a phone-only size leaked).
15. Quiet day: greeting says "three things need you" then "nothing needs you"; "fix them" still opens Revenue.
16. Revenue fix says Harbor's ads are back on, but Ads is still offered and fixed again.
17. "What do I need", "What should I do", "Turn them back on", "Send all 41 replies" go to the wrong place or the guess card.
18. Short replies ("ok", "no", "go", "hi") are dropped by the noise filter.
19. Tapping the lilac mic doesn't turn it off.
20. "Take your time" flashes for a split second on every silent restart.
21. Bar voice label says "Ready" while the AI is speaking.
22. "Just talk" chip gives no live feedback.
23. Phone: no way to put an item off from the landing list.
24. Make room always says Glow (also seen in the browser pass).
25. "Restart now anyway" leaves "$1.2k still at risk until Monday" under the heading.

**From the browser pass**
26. "Mic is on" line and its chips sit on top of cards (dashboard, Made today) with nothing behind them, desktop and phone.
27. Build view: two × buttons stacked; "Nothing is live until you say so" twice.
28. Voice bar shows two waveforms while listening; "Listening" is said twice (under the orb and in the bar).
29. Used choices stay on screen greyed out.
30. Phone draft pop-up header sits under the Dynamic Island.

**Minor**: clip timing can reopen the mic on a clip's last word; browser voice can block hands-free if Chrome drops its end event; Pause during the Kokoro wait doesn't pause; opening the phone resets the desktop's Scribble layout; "bring them all back" not understood.

### 7b · Status after the fix pass (2026-11-04, v20261105n, deployed)
Fixed and tested with the scripted mic: room hands-free rests after 2 silences; tap mic toggles on/off; half-sentences not sent when the AI speaks; "no / don't" never acts; "later" puts off the current item; "bring them back" restores; whole-word matching ("find new leads" → New lead); brief wording; Quiet-day greeting and "fix them" answer "Nothing needs you"; Make room uses the built brand's name; revenue fix also clears Ads; phone frame unloads on Back to desktop; one close button in site pop-up; used chips hidden; hint gets a backing on the bar.
Still open: "call them back" shows a guess card in Today mode, because Callers lives only in One-AI mode. Claude intent API stays off until ANTHROPIC_API_KEY is set in Vercel.
