#!/usr/bin/env python3
"""
Called by checkUpstream.yml to generate a new StarOS version file and update
startos/versions/index.ts when i2pd is bumped on Alpine edge.

Required env vars (set by the workflow):
  SEMVER      - new semver, e.g. "2.60.0"
  NEW_CONST   - new TS export const name, e.g. "v_2_60_0_0_b0"
  OLD_CONST   - current TS export const name, e.g. "v_2_59_0_0_b0"
  NEW_FILE    - path for the new version file, e.g. "startos/versions/v2.60.0.0.b0.ts"
"""

import os

semver = os.environ["SEMVER"]
new_const = os.environ["NEW_CONST"]
old_const = os.environ["OLD_CONST"]
new_file = os.environ["NEW_FILE"]

ts = (
    "import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'\n"
    "\n"
    f"export const {new_const} = VersionInfo.of({{\n"
    f"  version: '{semver}:0-beta.0',\n"
    "  releaseNotes: {\n"
    f"    en_US: 'i2pd {semver} — see https://github.com/PurpleI2P/i2pd/releases',\n"
    f"    es_ES: 'i2pd {semver} — ver https://github.com/PurpleI2P/i2pd/releases',\n"
    f"    de_DE: 'i2pd {semver} — siehe https://github.com/PurpleI2P/i2pd/releases',\n"
    f"    pl_PL: 'i2pd {semver} — patrz https://github.com/PurpleI2P/i2pd/releases',\n"
    f"    fr_FR: 'i2pd {semver} — voir https://github.com/PurpleI2P/i2pd/releases',\n"
    "  },\n"
    "  migrations: {\n"
    "    up: async ({ effects }) => {},\n"
    "    down: IMPOSSIBLE,\n"
    "  },\n"
    "})\n"
)
with open(new_file, "w") as f:
    f.write(ts)

idx = open("startos/versions/index.ts").read()
new_import = f"import {{ {new_const} }} from './v{semver}.0.b0'\n"
idx = idx.replace("export const versionGraph", new_import + "export const versionGraph", 1)
idx = idx.replace(f"current: {old_const},", f"current: {new_const},")
idx = idx.replace("other: [],", f"other: [{old_const}],")
open("startos/versions/index.ts", "w").write(idx)

print(f"Generated {new_file} and updated startos/versions/index.ts")
