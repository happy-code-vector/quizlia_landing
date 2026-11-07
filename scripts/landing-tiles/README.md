# Landing "How it works" tiles

Source for `public/tiles/*.mp4` and `*.jpg`: three 10 s loops, 720x900 (4:5), 24 fps, drawn in HTML from the welcome-family tokens (paper-deck style, AR's pick on 2026-11-07).

| Key | Tile | Subject | Output |
|---|---|---|---|
| b1 | Add a lesson | History | learn-from-any-link |
| b2 | Read the notes | Science | youtube-summaries |
| b3 | Take the quiz | Spanish | quiz-yourself |

Keys a1 to a3 are the rejected app-card style, kept for reference.

## Re-render (run from this folder)
```
npm i --no-save puppeteer-core @fontsource/inter @fontsource/source-serif-4
for k in b1 b2 b3; do node frames.mjs $k; done
ffmpeg -framerate 24 -i f_b1/%03d.png -c:v libx264 -preset slow -crf 24 -tune animation -pix_fmt yuv420p -g 48 -movflags +faststart -an ../../public/tiles/learn-from-any-link.mp4
ffmpeg -i f_b1/000.png -q:v 6 ../../public/tiles/learn-from-any-link.jpg
```
Repeat the two ffmpeg lines for b2 and b3. Budgets: mp4 600 KB, jpg 40 KB. The poster is frame 0, and the last 0.7 s crossfades back to frame 0 so the loop has no jump. Delete the `f_*` folders after.
