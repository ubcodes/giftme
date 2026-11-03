# GiftMe launch film: shot list

16:9, 1920×1080, 60 fps, 42.5 s, 120 BPM (one beat = 0.5 s; every scene starts on a beat).
Voice: Fish Audio clone of the owner (`583b7a3d…`), 9 lines in `audio/vo/`, all generated with an `[excited]` tag on s2.1-pro. Times below are global;
`film/timeline.js` is the source of truth (scenes in local time, so a beat can be inserted).

Look: warm cream canvas `#f7f3ee`, ink `#1c1917`, one accent purple `#a855f7` (guest cursors stay the app's
pink, the logo keeps its brand gradient). Type: Cormorant Garamond (display), Bilbo (script accent), Belleza (UI).
Real product UI only: crops of `assets/*.png` captured from the demo server, never redrawn screens.

| # | Time | Scene | Picture | Voice | Sound |
|---|------|-------|---------|-------|-------|
| S0 | 0.0–3.0 | Introducing | Night-violet frame with the brand aurora. A 3D gift rises on the right; *Introducing* types in, the GiftMe logo slams on the downbeat (1.0) as the lid pops, *giftme.website* under it. Light pours out of the box and opens like an iris onto the first shot. | — (music only) | swoosh, ticks, impact + kick + sparkle on the logo, clap build, riser, whoosh |
| S1 | 3.0–7.0 | Gift drop | A 3D purple gift falls into frame and lands on beat 1 (squash), the lid pops and small gifts burst toward camera and land around it. Huge serif words slam in on the voice: *Birthdays. Weddings. Baby showers.* | L1 | impact, pops, thumps, whoosh out |
| S2 | 7.0–11.0 | The question | Chat bubbles from friends pile up on every half beat ("Abeg send your wishlist", "Account number? 😅"). They fall out of focus as *So what do you actually want?* lands word by word. Everything is sucked into one point. | L2 | notifications, pops, riser |
| S3 | 11.0–13.0 | Meet GiftMe | A spinning gift, then the GiftMe logo hits on the downbeat (12.0) and shrinks toward where the app's nav logo will be. | L3 | impact + sparkle on the logo |
| S4 | 13.0–19.5 | Add gifts | Match cut into the real wishlist page; rows assemble. Cursor opens **Add a gift**, types a Jumia link, the Kenwood row drops into the top slot. Then it types "polaroid camera": result cards and shop links burst out of the search box, one is picked and lands in the list. Captions: *Paste any link. / Or just search.* | L4 | keys, drop, burst of pops |
| S5 | 19.5–22.5 | Share | Camera pushes into the share card, **Copy link** → copied. The link flies into a phone chat as a rich preview; replies pop in. Caption: *One link, for everyone.* | L5 | click, notify |
| S6 | 22.5–27.5 | Friends give | The phone opens the real guest page, scrolls to the mixer, taps Contribute; the real form fills in (₦20,000, Chioma, note) and is sent. Pull back: friends' gifts float in around the phone, and a gift shows **Reserved**. Caption: *Any amount. / Or reserve it.* | L6 | taps, coin, success, pops |
| S7 | 27.5–32.0 | Money lands | ₦591,000 counts up beside the real dashboard. A credit alert drops in. The real "Who gave" table: **Say thank you** → Thanked ✓, a note flies off. Caption: *Straight to your bank.* | L7 | ticks, notify, success |
| S7b | 32.0–36.5 | Find your people | The real Friends page. Typing "@kemicooks" brings up Kemi with her baby-shower countdown; **Follow** → Following. The window steps back; "People you know" cards and the handles friends use on Instagram, TikTok, X and Substack pop out. Caption: *Find your people. / Never miss their big day.* | L9 | keys, click, pops |
| S8 | 36.5–42.5 | End | Gifts rain into a pile. Logo slams on "GiftMe", the tagline lands word by word (*actually* in script, a callback to S2), CTA pill **Start your wishlist, it's free · giftme.website** gets clicked. | L8 | impact, thumps, sparkle |

Extending: a beat is an entry in `timeline.js`, a draw function in `index.html` and a voice line placed
with `vo.at`; S7b was added that way. Frames before an inserted beat don't change, so only the tail
needs re-rendering (trim `out/silent.mp4` to the insertion frame and concat).
