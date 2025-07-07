# Release Process

Manual GitHub Actions workflow for releasing xeokit-sdk to NPM.

## Quick Steps

1. **Prepare Release**
   - Update `package.json` version 
   - Update `CHANGELOG.md` with release notes
   - Commit and push changes

2. **Trigger Release**
   - Go to **Actions** → **Release** workflow
   - Click **Run workflow**
   - Select target branch (default: `master`)
   - Click **Run workflow**

## What the Workflow Does

1. Checkouts specified branch (HEAD)
2. Installs dependencies (`npm ci`)
3. Builds project (`npm run build`)
4. Commits and pushes dist files
5. Creates GitHub release with changelog notes
6. Publishes to NPM

## Release Types

- **Master branch**: Normal release
- **Other branches**: Pre-release

## Required Secrets

- `NPM_TOKEN`: NPM authentication token
- `GITHUB_TOKEN`: Auto-provided by GitHub

## Troubleshooting

- **NPM publish fails**: Check `NPM_TOKEN` permissions
- **Build fails**: Verify code builds locally first
- **Release creation fails**: Check `GITHUB_TOKEN` permissions