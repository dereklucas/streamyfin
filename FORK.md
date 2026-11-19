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
`.eas/workflows/`, `.github/workflows/fork-ios.yml`, `FORK.md` and the fork note at the end of
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
build, which rules out Xcode Cloud. Builds run on **GitHub Actions**: free
with no minute limit for a public repository, macOS runners included. (They
ran on EAS Workflows first, until the free plan's 60 CI minutes a month ran
out; `.eas/workflows/` still holds those, manual-only now.)

`.github/workflows/fork-ios.yml` runs on every push to `development` and
picks one of two paths, based on the iOS native fingerprint
(`fingerprint.config.js`):

- **JS-only change** (a build with the same fingerprint has shipped: tag
  `ios-build/<fingerprint>`, or an older EAS build):
  publishes an over-the-air update to the `production` channel. It's ready a
  few minutes after the push. **Force-quit and reopen the app** to get it:
  on launch the app waits up to 5 s for a new update and starts on it.
  Settings shows the commit it's running.
- **Native change** (Swift/Kotlin in `modules/`, `targets/`, `plugins/`,
  native dependencies, app.json native config, `.eas/build`): `eas build
  --local` on a macOS runner with the production profile's custom steps and
  Expo-managed signing, then `eas submit` to TestFlight, then the
  `ios-build/<fingerprint>` tag. The .ipa is also kept as a run artifact for
  14 days. The build number auto-increments on EAS. The runner pins the
  runtime version to the source fingerprint (FORK_RUNTIME_VERSION, read by
  app.config.ts), so it always matches what the updates target.

`runtimeVersion` uses the same fingerprint policy, so an update only ever
reaches a binary whose native code matches it. A JS update can't crash an
older binary.

Force a native build anyway: Actions → "🍎 Fork: ship iOS" → Run workflow
on `development` with "full build" ticked. Run it on a `fix/*` or `feat/*`
branch to build that branch for testing native work before merging; then
follow the branch from More → Developer for its JS updates. Or push it as
`build/<name>`: a push there builds whenever its native code has no build
yet (what a Claude session uses, as it cannot start a run by hand). Without a session or Actions,
`eas build -p ios --profile production --auto-submit` builds on EAS (its
own monthly build quota).

The build runs on macos-26 (`.github/workflows/fork-ios-build.yml`): its
Xcode is the only one that compiles `expo-modules-jsi`, macos-15's 26.3
rejects it. Its runners are scarce, and a job no runner takes within about
15 minutes shows as cancelled with no log (GitHub's "job was not acquired").
The run then tries again, up to twice more; if all three attempts miss,
nothing in the change is wrong: re-run the failed jobs from Actions, or
push again.

Native code in this app: the video player controls
(`modules/mpv-player/ios/NativePlayer/Views`), the home hero carousel
(`modules/hero-carousel`), downloads and the Live Activity. Everything in
`app/` and `components/` is JS.

### What to test

Every build and update carries the commits since the build it is made on
(`scripts/fork/build-notes.sh`, newest first, without the fork's own
plumbing). In the app, More → Developer lists them under **What to test**:
an update's own list while one runs, the build's otherwise, with the commit
and branch it was made from above.

TestFlight's own "What to Test" stays empty: `eas submit` sets it only on
EAS's Enterprise plan. Setting it would take an App Store Connect API key
as a repository secret, for the workflow to call App Store Connect itself.

### Developer screen and branch previews

More → **Developer** (fork only) shows what's running: the app version
and build, whether the JS is built in or an update (and which), the commit,
the branch being followed, and the native fingerprint. From there you can:

- **Check for update now**: fetch and reload into the latest update right
  away, instead of waiting for the next launch.
- **Follow a branch**: every push to a `fix/*` or `feat/*` branch publishes
  an update to a channel named after it (same GitHub workflow),
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
6. **GitHub Actions**: enable Actions on the fork (Actions tab), add the
   repository secret `EXPO_TOKEN` (an Expo robot token), and disable the
   upstream workflows in the Actions tab (each one's ⋯ → Disable workflow):
   they assume upstream's secrets and mostly run on `develop`.
7. Smoke test: push to `development`, or run the workflow by hand.

## Costs and speed

- GitHub Actions: free for a public repository. If the fork ever goes
  private, macOS minutes count 10× against 2,000 a month (about 200 real
  minutes), and builds move back to EAS.
- EAS: builds and CI minutes are not used. EAS Update (JS updates) and EAS
  Submit (TestFlight uploads) are free at this size; signing stays
  Expo-managed.
- The upstream workflows stay disabled in the Actions tab (see setup).
