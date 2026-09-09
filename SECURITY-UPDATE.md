# Builder 1.10.2 security update

This repository is a Frappe website builder. It can run in a VM, but does not provision VMs. Its previous release was 1.10.1 (2024).

## Changes

- Refresh the complete Yarn dependency tree, including development tools. Vite is 6.4.3, the patched release on the existing Rollup-based build line; Vue plugin is 6.0.8.
- Upgrade Frappe UI to 0.1.278 and align direct Tiptap packages at 3.31.3. Remove the old Showdown and extract-zip dependency paths, which had no patched releases.
- Migrate TextBlock to Tiptap 3: menu import and Floating UI options, explicit silent content synchronization, and disable duplicate/new StarterKit features to preserve existing editing behavior.
- Update Frappe UI stylesheet, Tailwind preset, proxy and build configuration. Preserve the existing Frappe HTML template variables and asset locations.
- Resolve ECharts to the patched 6.1 series because Frappe UI still requests the vulnerable 5.x series. Builder does not use chart components; reassess this override when updating Frappe UI.
- Remove the recursive postinstall and nonexistent local frappe-ui workspace. Pin Yarn 1.22.22; build/test on Node 22.12+ (22.x) or Node 24.
- Replace the obsolete CI branch trigger, pin Frappe integration tests to version-15, and remove Cypress Cloud recording and its embedded key. Tests run without sending recordings to a third party.
- Consolidate the retired server workflow into the integration job. Fix the route permission check to pass an empty document name: current Frappe 15 rejects null for its typed `docname` argument, preventing the editor from opening.

## Required verification

1. `yarn install --frozen-lockfile` from repository root; a frozen install must leave the lockfile unchanged.
2. `yarn test:unit`: actual TextBlock mount, formatting, links, font/color, silent external updates, undo, teardown, and the Tiptap prototype-attribute regression.
3. `yarn build`: compile the full application and copy the Frappe HTML entry point.
4. `yarn audit --groups 'dependencies devDependencies optionalDependencies'`: any advisory fails the job.
5. The integration CI job installs this app on a disposable Frappe 15 site, runs the existing Python tests, and exercises login, landing, edit/save/reload, preview and publish with Cypress. Python tests in this repository are currently placeholders; browser assertions provide the meaningful site-level coverage.

Tests are necessary here because Tiptap and Frappe UI change public APIs. For a future compatible transitive patch, frozen install, audit and build are the minimum; repeat affected component/browser tests when the dependency touches editor behavior, routing, authentication, file upload or published output.

## VM rollout

Before production, identify the actual bench/site and installed Frappe/Python/Node versions. Back up the site and files, record the existing commit, and validate this version on a staging clone with representative saved pages. Confirm formatting, toolbar positioning during zoom/pan, uploads, reusable components and mobile preview in a real browser. CI uses Frappe 15; another installed framework version needs its own compatibility run.

Deploy the reviewed commit through the normal bench app update, dependency installation, asset build, site migration and service restart process. Verify the editor and a published page after deployment. If verification fails, restore the prior app revision and rebuild; restore the matching site backup if a migration changed state. Repository publication alone does not update an existing VM.

## Sources

- [Tiptap advisory](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh)
- [Tiptap 3 migration guide](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)
- Current GitHub Dependabot alerts and npm registry audit responses, checked September 2026. The minimum patches in older alert emails do not cover every later advisory.
