# UzHi motion specification

Source recipes: `charlie947/motion-graphics-skills`, `motion-effects`.
Brand source: `brand.md` and `frontend/design-tokens.json`.

| Role | Dark palette | Light palette |
| --- | --- | --- |
| ground | #102433 | #EDF3F3 |
| surface | #162F40 | #FFFFFF |
| ink | #EDF3F3 | #102433 |
| muted | #AAC0CA | #516672 |
| accent | #52CAB4 | #08786D |
| second accent | #70D9C5 | #06695F |

The self-contained walkthrough retains the approved dark brand canvas in either application theme. It embeds the approved logo and IBM Plex Sans and needs no external resources. Artboard: 1920 × 1080, scaled as a unit into a responsive 16:9 player. Horizontal margin: 140 px. Font weights: 400 and 550. The four steps use existing module names.

## Product animation

`frontend/public/effect.html` is generated from `frontend/src/experience/effect.template.html` by `frontend/scripts/build-motion-effect.mjs`, also run by `npm run build`.

- One deterministic 8-second clock; `window.seek(seconds)` reproduces a frame in any order.
- Move 0–2.2 s; hold through 6.6 s; eased return through 8 s. Frames 0 and 8 are identical.
- Card → workspace: the same card shell and title expand into the workflow. The contents wait for the shell to open.
- Masked type: the workspace headline enters through the shell's clip.
- Flowing paths: a pulse draws each connector, and destination nodes answer on arrival; a second wave animates the hold.
- `?render` disables autoplay; `?render&t=4.4` shows the readable still. `?mode=hold` retains the final composition.
- Explicit font loading precedes the first frame. No autonomous CSS animation, timer, unseeded randomness or external assets.

## Application interactions

The site uses the recipes as interactions with real content, rather than looping operational forms.

- Tabs → panels and sidebar: one measured selection surface moves between destinations, including wrapping tabs, fonts and resize.
- Search → results: real search results enter in sequence; API behavior is unchanged.
- Card → workspace: dialogs expand from the initiating control.
- Dashboard zoom: a secondary KPI expand control opens the same figure in a larger card, growing from the original tile's exact position and dimensions over a dimmed dashboard. The value and interpretation remain visible; Escape restores focus. The main tile retains direct registry navigation.
- Staged entrances: content and checklist items enter in a bounded sequence, once as they become visible.
- Chart morph: criticality bars narrow to a line through the same values. The line draws on, then points arrive. Numbers and filtering remain available in both views.
- Flowing paths: existing dependencies receive subtle pulses, limited to 24 paths. Offscreen/hidden scenes stop their clock.
- Masked type: login and welcome headings reveal once.

UI durations are 240–740 ms, with at most 180 ms total entrance staggering. The product scene alone repeats over 8 s. Application interactions have a persistent pause control. `prefers-reduced-motion` takes precedence and updates live. The player has independent pause/replay controls, native dialog focus trapping, Escape, focus restoration, and a readable still when motion is disabled. Print/report data is unchanged.
