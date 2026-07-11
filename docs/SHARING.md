# Sharing Profiles

Profiles are portable. Export one to a `.sdpack` file and share it - email it,
commit it, hand it to a friend. Import drops it in as a new profile. No accounts,
no cloud, just a file.

## Export

```bash
./install.sh profile export work            # -> work.sdpack
./install.sh profile export work desk.sdpack
# or directly:
python -m streamdeckpro.sharing export work work.sdpack
```

## Import

```bash
./install.sh profile import work.sdpack             # -> profiles/work/
./install.sh profile import work.sdpack --as work2  # rename on import
python -m streamdeckpro.sharing import work.sdpack --as work2
```

Then switch to it: `./install.sh profile use work2`.

## Format

A `.sdpack` is a gzipped tar with a top-level `manifest.json`:

```json
{ "format": "sdpack/v1", "name": "work", "subdirs": ["buttons", "touchscreen"] }
```

plus the profile's `buttons/`, `dials/`, `touchscreen/` trees. Import is
traversal-safe (it never writes outside the target profile) and refuses to
overwrite the `default` (top-level) layout - always import to a named profile.
