# LaunchBox / Big Box media

Tower Stacker media for the Vermilion cabinet's LaunchBox "Arcade" platform, made from the game itself by
`node scripts/launchbox-media.mjs` (default: the `latest` release the cabinet runs; `--ref .` for this checkout,
`--art-only` to recompose the logo and posters from the screenshots here). `SOURCE.txt` names the captured commit.
Needs system Google Chrome, the installed npm dependencies, and ffmpeg. Builds the selected ref in a temporary
worktree and serves it locally so bundled models and workers load correctly.

The folders mirror LaunchBox's own, and files are named `<Title>-01` so LaunchBox matches them to the game.
To install or restore, close LaunchBox and Big Box, then copy `Images/` and `Videos/` over
`C:\Users\arcade\LaunchBox\` (this tree is the backup; the cabinet's collector does not archive media).

The logo uses the game's bold Georgia title lettering and warm ivory (#f7efe0), with midnight-blue backgrounds
and gold accents from `src/styles.css`. No webfont is bundled. Tagline: "Stop. Stack. Reach the sky!" — the
stop-and-trim loop and escalating tower challenge in `docs/design.md`.

The intro is captured before its normal fade. Gameplay uses live simulation (`?test&paused=0&seed=7`): the
read-only state API observes alignment, then Playwright releases Space to place each slab. No teleporting,
scripted scores, stepping, or debug configuration changes. The capture logs score and requestAnimationFrame
rate and rejects video captures below 50 fps. Video is a silent 30-second, 720-wide H.264 snap.

Six PNGs (title, gameplay, transparent clear logo, box front, banner, background) and one MP4 follow the approved
Coin Quake template. Review contact sheets are kept separately under `/tmp`, not installed in LaunchBox.
