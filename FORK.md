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
only `app.json`, `eas.json`, `.eas/workflows/testflight.yml`, `FORK.md` and the
fork note at the end of `CLAUDE.md`. Keep fixes out of those commits, so a fix
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
build, which rules out Xcode Cloud. Builds run on **EAS Workflows** instead:

`.eas/workflows/testflight.yml` triggers on every push to `development`, runs
the `production` EAS build profile (upstream's bun build steps in
`.eas/build/ios-production.yml`), then uploads the build to TestFlight with
the commit message as "What to Test". The build number auto-increments on EAS.

## One-time setup

1. **Expo**: create a free account at expo.dev, then on a Mac:
   `npm i -g eas-cli && eas login`. In a checkout of `development`, run
   `eas init`. It creates the project and prints the project ID and
   account name. Replace `EAS_PROJECT_ID` (twice) and `EXPO_ACCOUNT` in
   `app.json` with those values. (`eas init` can't write them itself because
   the repo uses a dynamic `app.config.ts`.)
2. **App Store Connect**: create the app under bundle ID
   `science.vgood.streamyfin`. Its numeric Apple ID (App Information →
   Apple ID) goes in `eas.json` → `submit.production.ios.ascAppId`. Your
   Team ID (developer.apple.com → Membership) goes in `appleTeamId` next to it.
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
   `development`.

## Costs and speed

- The EAS free plan includes a small number of iOS builds per month on a
  low-priority queue, which can be slow. For fast iteration the
  Starter/Production plans give priority macOS workers. Check expo.dev/pricing.
- A full iOS build of this app (MPVKit, static frameworks) takes a while. To
  avoid spending a build per commit, batch small fixes into one push to
  `development`.
- GitHub Actions are disabled by default on forks. Leave them off: upstream's
  workflows assume upstream's secrets and runners.
