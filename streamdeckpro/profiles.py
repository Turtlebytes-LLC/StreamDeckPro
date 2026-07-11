"""Profile-aware path resolution.

Filesystem-as-config, one directory tree per profile:

    profiles/<name>/{buttons,dials,touchscreen}/

The active profile is named in the ``.profile`` file at the repo root. When
``.profile`` is absent, empty, or names ``default``, element directories fall
back to the legacy top-level ``buttons/``, ``dials/``, ``touchscreen/`` dirs so
phase-1 setups keep working with zero migration.

``ProfileManager`` duck-types as the config module for path purposes: it
exposes ``BUTTONS_DIR``/``DIALS_DIR``/``TOUCH_DIR`` as live properties reflecting
the active profile and delegates every other attribute to the wrapped config.
That lets the daemon hand one object to the event dispatcher, watcher, and
renderer wherever they previously read ``config``.
"""

import logging


class ProfileManager:
    DEFAULT = "default"

    def __init__(self, config):
        # object.__setattr__ so __getattr__ delegation never sees a missing _config
        object.__setattr__(self, "_config", config)

    # --- active profile ------------------------------------------------------

    def active_profile_name(self):
        """Name in .profile, or 'default' when absent/empty."""
        f = self._config.PROFILE_FILE
        try:
            if f.exists():
                name = f.read_text().strip()
                if name:
                    return name
        except Exception as e:
            logging.debug(f"Could not read profile file: {e}")
        return self.DEFAULT

    def _profile_root(self):
        name = self.active_profile_name()
        if name == self.DEFAULT:
            return self._config.SDP_HOME
        root = self._config.PROFILES_DIR / name
        if not root.is_dir():
            logging.warning(f"Profile '{name}' has no directory; using default")
            return self._config.SDP_HOME
        return root

    def list_profiles(self):
        """['default', ...named profiles...] sorted, default always first."""
        names = [self.DEFAULT]
        profiles_dir = self._config.PROFILES_DIR
        if profiles_dir.is_dir():
            names += sorted(p.name for p in profiles_dir.iterdir() if p.is_dir())
        return names

    # --- profile-aware element dirs (override the wrapped config) ------------

    @property
    def BUTTONS_DIR(self):
        return self._profile_root() / "buttons"

    @property
    def DIALS_DIR(self):
        return self._profile_root() / "dials"

    @property
    def TOUCH_DIR(self):
        return self._profile_root() / "touchscreen"

    # --- everything else is the wrapped config -------------------------------

    def __getattr__(self, item):
        return getattr(self._config, item)
