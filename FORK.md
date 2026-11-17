# Fork notes (dereklucas/streamyfin)

A personal fork of [streamyfin/streamyfin](https://github.com/streamyfin/streamyfin)
for fixing iPad Pro issues. It ships to my own TestFlight under its own
bundle ID, and fixes go back upstream as PRs.

## Branches

| Branch        | What it holds                                                                 |
| ------------- | ----------------------------------------------------------------------------- |
| `develop`     | Mirror of upstream `develop`. Never commit here.                              |
| `development` | `develop` + the fork-only commits + my fixes. **Push/merge here = TestFlight.** |
| `fix/*`       | One branch per fix, cut from `development`, merged back via PR.               |

Fork-only changes live in their own commits (`chore(fork): ...`) and touch
only `app.json`, `eas.json`, `package.json`/`bun.lock` (expo-updates),
`.eas/workflows/testflight.yml`, `FORK.md` and the fork note at the end of
`CLAUDE.md`. Keep fixes out of those commits, so a fix
can be cherry-picked onto `develop` for an upstream PR without the fork
config.

### Sync with upstream

```sh
git remote add upstream https://github.com/streamyfin/streamyfin.git  # once
git fetch upstream
git push origin upstream/develop:develop        # refresh the mirror
git checkout development && git merge upstream/develop
```

### Send a fix upstream

```sh
git checkout -b upstream/my-fix upstream/develop
git cherry-pick <fix commits>       # never the chore(fork) ones
git push origin upstream/my-fix     # then open a PR to streamyfin/streamyfin:develop
```

## How builds work

The app is Expo (CNG): `ios/` isn't committed and gets regenerated on every
build, which rules out Xcode Cloud. Builds run on **EAS Workflows** instead.

`.eas/workflows/testflight.yml` runs on every push to `development` and
picks one of two paths, based on the iOS native fingerprint
(`fingerprint.config.js`):

- **JS-only change** (an EAS build with the same fingerprint already exists):
  publishes an over-the-air update to the `production` channel. It's ready a
  few minutes after the push. **Force-quit and reopen the app** to get it:
  on launch the app waits up to 5 s for a new update and starts on it.
  Settings shows the commit it's running.
- **Native change** (Swift/Kotlin in `modules/`, `targets/`, `plugins/`,
  native dependencies, app.json native config): full EAS build, then a
  TestFlight upload with the commit message as "What to Test". The build
  number auto-increments on EAS.

`runtimeVersion` uses the same fingerprint policy, so an update only ever
reaches a binary whose native code matches it. A JS update can't crash an
older binary.

Force a native build anyway:
`eas workflow:run .eas/workflows/testflight.yml -F full_build=true`.

Native code in this app: the video player controls
(`modules/mpv-player/ios/NativePlayer/Views`), the home hero carousel
(`modules/hero-carousel`), downloads and the Live Activity. Everything in
`app/` and `components/` is JS.

### Developer screen and branch previews

More → **Developer** (fork only) shows what's running: the app version
and build, whether the JS is built in or an update (and which), the commit,
the branch being followed, and the native fingerprint. From there you can:

- **Check for update now**: fetch and reload into the latest update right
  away, instead of waiting for the next launch.
- **Follow a branch**: every push to a `fix/*` or `feat/*` branch publishes
  an update to a channel named after it (`.eas/workflows/preview-branches.yml`),
  as long as its native code matches an existing build. Picking the branch
  switches the app's update channel (`Updates.setUpdateRequestHeadersOverride`)
  and loads that update. Picking `development` goes back to the build's own
  channel. A branch with native changes has nothing this build can run, and
  the app stays where it was.

### Dependencies note (cloud sessions)

`react-native-track-player` is a GitHub dependency. If the network blocks
GitHub tarball downloads, `bun install` fails with a 403. Seed bun's cache
from a git checkout instead:

```sh
git clone https://github.com/lovegaoshi/react-native-track-player /tmp/rntp
T=~/.bun/install/cache/@GH@lovegaoshi-react-native-track-player-d371784@@@1
mkdir -p "$T" && git -C /tmp/rntp archive d371784 | tar -x -C "$T"
bun install --frozen-lockfile
```

## One-time setup

1. **Expo**: done. Project `@dereklucas/streamyfin`
   (`d39c717a-c991-493f-a43a-822de189d6f8`) is in `app.json`.
2. **App Store Connect**: done. App `6835696183` is in `eas.json`.
3. **Credentials**: run `eas credentials -p ios` and pick the `production`
   profile. Let EAS create the distribution cert and provisioning profiles,
   including the `StreamyfinDownloadActivity` Live Activity extension and the
   `group.science.vgood.streamyfin.downloads` app group. Then, under
   "App Store Connect API Key", let EAS create a key so CI can upload
   without a login.
4. **Link GitHub**: expo.dev → project → Project settings → GitHub →
   connect `dereklucas/streamyfin`. Push triggers need this link.
5. **TestFlight**: in App Store Connect → TestFlight, create an internal
   group with **automatic distribution** on and add yourself to it.
6. Smoke test: `eas workflow:run .eas/workflows/testflight.yml`, or push to
   `development`. The first run always does a full build (no earlier build to
   match); later JS-only pushes become updates.

## Costs and speed

- The EAS free plan includes a small number of iOS builds per month on a
  low-priority queue, which can be slow. For fast iteration the
  Starter/Production plans give priority macOS workers. Check expo.dev/pricing.
- A full iOS build of this app (MPVKit, static frameworks) takes a while, but
  only native changes need one. JS updates don't count against EAS build
  quota (EAS Update has its own, generous free tier).
- GitHub Actions are disabled by default on forks. Leave them off: upstream's
  workflows assume upstream's secrets and runners.
