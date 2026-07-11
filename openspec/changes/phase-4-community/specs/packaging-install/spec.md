# Packaging and Install

## ADDED Requirements

### Requirement: Distro packages (HUMAN VERIFY per target)

The system SHALL provide packaging for AUR (PKGBUILD), Debian/Ubuntu (.deb via a
debian/ dir), and Flatpak (manifest), each installing the streamdeckpro package,
install.sh, and assets, and depending on python3 + python-elgato-streamdeck +
pillow. The phase-1 one-command installer remains the primary path. Each target
is built and smoke-tested on that distro before release.

#### Scenario: AUR install (HUMAN VERIFY)
- **WHEN** `makepkg -si` runs on the PKGBUILD on Arch
- **THEN** the daemon installs and `streamdeckpro` starts (verified by Zach)

#### Scenario: deb install (HUMAN VERIFY)
- **WHEN** the built .deb is installed on Ubuntu
- **THEN** the daemon installs and starts (verified by Zach)

#### Scenario: Flatpak build (HUMAN VERIFY)
- **WHEN** `flatpak-builder` runs on the manifest
- **THEN** it builds and runs with USB access (verified by Zach)
