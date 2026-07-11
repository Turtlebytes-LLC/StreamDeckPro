# Tasks: Phase 4 - Community

`[x]` = done and tested this session. `[ ]` = needs build tooling, hosting, or a
target distro (Zach).

## 1. Profile sharing

- [x] 1.1 Create streamdeckpro/sharing.py (export_profile, read_manifest, import_pack; traversal-safe; refuse default). Verify: `python -m pytest tests/test_sharing.py -q`.
- [x] 1.2 CLI (`python -m streamdeckpro.sharing export|import`) and `./install.sh profile export|import`. Verify: export a seeded profile and import it as a copy (round-trip, done this session).
- [x] 1.3 Document sharing in docs/SHARING.md. Verify: file exists and covers export/import + the format.

## 2. Packaging

- [ ] 2.1 AUR PKGBUILD. HUMAN VERIFY: `makepkg -si` installs and starts on Arch. (Needs Arch build - Zach.)
- [ ] 2.2 Debian/Ubuntu .deb (debian/ dir). HUMAN VERIFY: install on Ubuntu. (Needs deb tooling - Zach.)
- [ ] 2.3 Flatpak manifest. HUMAN VERIFY: flatpak-builder builds with USB access. (Needs flatpak tooling - Zach.)

## 3. Docs site

- [ ] 3.1 Static docs site over docs/ (quick start, action gallery, authoring, sharing). HUMAN VERIFY: builds and reads well. (Needs hosting + review - Zach.)
