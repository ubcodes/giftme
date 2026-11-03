# GiftMe launch film

A 40-second, 16:9 product film made entirely in code: one canvas, `window.seek(t)`, rendered
frame by frame in headless Chrome. The voice is a Fish Audio clone of the owner's voice; the
music and sound effects are synthesized. Shot list: [docs/shotlist.md](docs/shotlist.md).

```
film/timeline.js   scenes, voice placement and sound cues (local times, so beats can be inserted)
film/index.html    the film; open it through a local server to watch it live
film/gifts3d.js    the 3D gift (same as the landing hero) and celebration items, via three.js
film/audio.mjs     score + SFX + voice stems → out/*.wav
film/captions.mjs  WebVTT captions from the voice lines
scripts/           demo data and real-screen captures
assets/            real screens (2x) and element boxes used by the film
```

Tools live in the global kit at `~/.claude/skills/motion-reel/kit` (render, sfx, mix).

## Rebuild

1. Demo data and screens (only if the app's UI changed). Run a second dev server on port 3300
   with `DATABASE_URL=file:video/demo.db`, no Clerk keys (dev sign-in) and the local Blnk, then:
   ```bash
   DATABASE_URL=file:video/demo.db npx tsx --env-file=<local env> video/scripts/seed-demo.mts
   node video/scripts/capture.mjs <cookie> && node video/scripts/capture2.mjs <cookie>
   ```
   (`seed-demo.mts` prints the dev session cookie.)
2. Audio, captions and picture, from `video/`:
   ```bash
   node film/audio.mjs
   node film/captions.mjs > ../public/video/giftme-film.vtt
   K=~/.claude/skills/motion-reel/kit
   node $K/render.mjs --gpu --root .. --html film/index.html --w 1920 --h 1080 --fps 60 --sub 4 --dur 39.5 --out out/silent.mp4
   VOICE_GAIN=1.7 MUSIC_GAIN=0.3 SFX_GAIN=1.1 bash $K/mix.sh out/silent.mp4 out/voice.wav out/music.wav out/sfx.wav out/final.mp4
   ```
   `--gpu` matters: the 3D gifts (film/gifts3d.js, three.js) are ~50x slower in the software renderer.
   `--root ..` serves the repo, because the film imports three from node_modules.
3. Watch live while editing: `node $K/render.mjs --root .. --html film/index.html --serve --port 4400`, then open
   the printed URL (add `&t=14` to start at 14 s).

The voice recordings (`audio/`), renders (`out/`) and `demo.db` are not committed.
