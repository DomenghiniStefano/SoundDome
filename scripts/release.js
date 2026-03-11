const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function runSilent(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

const TYPE = process.argv[2] || 'minor';

if (!['major', 'minor', 'patch'].includes(TYPE)) {
  console.error('Usage: npm run release -- [major|minor|patch]');
  console.error('Default: minor');
  process.exit(1);
}

const branch = runSilent('git branch --show-current');
if (branch !== 'develop') {
  console.error(`Error: must be on develop branch (currently on ${branch})`);
  process.exit(1);
}

const status = runSilent('git status --porcelain');
if (status) {
  console.error('Error: working directory is not clean');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
let version;
if (TYPE === 'major') version = `${major + 1}.0.0`;
else if (TYPE === 'minor') version = `${major}.${minor + 1}.0`;
else version = `${major}.${minor}.${patch + 1}`;

console.log(`Releasing ${version} (${TYPE})...`);

// Create release branch from develop
run(`git checkout -b release/${version}`);

// Bump version
run(`npm version ${TYPE} --no-git-tag-version`);
run('git add package.json package-lock.json');
run(`git commit -m "${version}"`);

// Merge into master and tag
run('git checkout master');
run('git pull origin master');
run(`git merge --no-ff release/${version} -m "Merge release ${version} into master"`);
run(`git tag -a ${version} -m "${version}"`);

// Merge back into develop
run('git checkout develop');
run(`git merge --no-ff release/${version} -m "Merge release ${version} into develop"`);

// Clean up release branch
run(`git branch -d release/${version}`);

// Push everything
run('git push origin master develop');
run(`git push origin ${version}`);

console.log(`\nDone! ${version} pushed. GitHub Actions will build and publish the release.`);
