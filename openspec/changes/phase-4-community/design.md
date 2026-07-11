# Design: Phase 4 - Community

The sharing format is the one piece buildable and testable headless; it is
implemented. Packaging (AUR/deb/Flatpak) and the docs site need build tooling
and hosting, so they are specced and tasked for a session with those tools.

## Decision 1: Sharing is a .sdpack (gzipped tar + manifest)

`streamdeckpro/sharing.py` exports a profile to a portable `.sdpack`: a
gzipped tar with a top-level `manifest.json` (`format: sdpack/v1`, name,
subdirs) plus the profile's buttons/dials/touchscreen tree. Import drops it
into `profiles/<name>/`. This keeps sharing filesystem-as-config: no database,
no accounts, just a file you can email or commit.

Functions: `export_profile(name, config, dest)`, `read_manifest(path)`,
`import_pack(path, config, as_name=None)`. CLI: `python -m streamdeckpro.sharing
export|import`, surfaced as `./install.sh profile export|import`.

Security: import is hardened against tar path traversal - only `manifest.json`
and members under the known subdirs are extracted; any absolute or `..` member
is dropped (`_is_safe`). Importing over `default` is refused (it would clobber
the top-level layout); a target name is always required.

## Decision 2: Packaging targets share one source of truth

AUR PKGBUILD, a .deb via a simple debian/ dir, and a Flatpak manifest all
install the same tree (streamdeckpro package + install.sh + assets) and depend
on the same runtime (python3, python-elgato-streamdeck, pillow). They are build
+ distro work that must be verified on each target, so they are tasked, not
implemented here. The one-command installer from phase 1 remains the primary
path; packages are convenience on top.

## Decision 3: Docs site is content over the shipped Markdown

docs/ already holds PROFILES, PLUGINS, BEAUTY, WRITING-ACTIONS. The site
(quick start, action gallery, plugin/widget authoring, sharing) is a static-site
build over that content - hosting + visual review, so tasked.

## Gotchas

- `.sdpack` must not embed absolute paths (use `arcname` on add) or import
  turns dangerous. Tested with a hand-crafted malicious pack.
- Import must never write `default`; enforce a non-default target name.
