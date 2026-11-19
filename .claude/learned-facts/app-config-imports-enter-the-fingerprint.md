# A file app.config.ts imports becomes part of the native fingerprint

**Date**: 2026-11-18
**Category**: build-and-tooling
**Key files**: `app.config.ts`, `fingerprint.config.js`

## Detail

`@expo/fingerprint` hashes the files the app config loads, not only the
config it evaluates to. `fingerprint.config.js` keeps `extra` out of the
hash, so build metadata written into `extra.build` changes nothing, but an
`import` from `app.config.ts` adds the imported file to the sources. Moving
a few lines of JS into `utils/` and importing them from the config changed
the iOS fingerprint (the new file showed up as a source), which on the fork
means a full native build for a change with no native code in it.

Keep logic the config needs inline in `app.config.ts`, or check the
fingerprint before and after (`bun x fingerprint fingerprint:generate
--platform ios | jq -r .hash`; diff `.sources[]` to see what entered).
