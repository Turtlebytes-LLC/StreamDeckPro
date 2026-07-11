# Tasks: Phase 3 - Beauty

`[x]` = done and tested this session (headless). `[ ]` = needs a display or the
physical deck (Zach), or a follow-up change.

## 1. Icon packs

- [x] 1.1 Create streamdeckpro/iconpacks.py (validate_manifest, load_pack, list_packs, pack_icons, resolve_icon; prune nested packs). Verify: `python -m pytest tests/test_iconpacks.py -q`.
- [x] 1.2 Ship icons/pack.json making the existing set the `builtin` pack. Verify: `python -c "from streamdeckpro.iconpacks import load_pack; from streamdeckpro.config import SDP_HOME; print(load_pack(SDP_HOME/'icons')['name'])"` prints `builtin`.

## 2. Animated icons

- [x] 2.1 Add .gif/.webp to load_image_for_button and add load_animation_frames + is_animated to rendering.py. Verify: `python -m pytest tests/test_animation.py -q`.
- [ ] 2.2 Implement the daemon frame-cycling loop (per-key opt-in, CPU cap) and HUMAN VERIFY animation on the physical deck. (Needs hardware - follow-up change.)

## 3. Widgets

- [x] 3.1 Create streamdeckpro/widgets.py (clock + stats render fns, /proc data sources, active-profile-aware writer, CLI runner). Verify: `python -m pytest tests/test_widgets.py -q`.
- [ ] 3.2 Add media (MPRIS) and weather widgets. (New deps + visual review - follow-up.)
- [ ] 3.3 HUMAN VERIFY: run `python -m streamdeckpro.widgets clock --element touch-1` and confirm it repaints the bar. (Needs the deck - Zach.)

## 4. Configurator overhaul

- [ ] 4.1 Live device mirror, profile/page UI, onboarding, icon-pack browser, light/dark themes in configurator-electron. (Electron + visual - needs a display and Zach's review.)
- [ ] 4.2 HUMAN VERIFY: screenshot-worthy pass on the real UI.

## 5. Docs

- [x] 5.1 Document icon packs, animated icons, and widgets in docs/BEAUTY.md. Verify: file exists and covers all three.
