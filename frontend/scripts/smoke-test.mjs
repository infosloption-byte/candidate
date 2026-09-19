import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

for (const path of [
  'dist/index.html',
  'src/app/App.tsx',
  'src/app/components/AppShell.tsx',
  'src/app/components/Sidebar.tsx',
  'src/shared/components/Button.tsx',
  'src/shared/components/Card.tsx',
  'src/shared/components/FormField.tsx',
  'src/shared/components/DataTable.tsx',
  'src/shared/components/StateMessage.tsx',
]) {
  assert.equal(existsSync(resolve(root, path)), true, 'Expected frontend artifact/file: ' + path);
}

const sidebar = read('src/app/components/Sidebar.tsx');
const app = read('src/app/App.tsx');
const packageJson = JSON.parse(read('package.json'));
const candidatesPage = read('src/features/candidates/CandidatesPage.tsx');
const settingsPage = read('src/features/settings/SettingsPage.tsx');

for (const role of ['ADMIN', 'AGENCY', 'INTERVIEWER', 'INTERVIEWEE']) {
  assert.match(sidebar, new RegExp(role));
}
for (const view of ['dashboard', 'jobs', 'candidates', 'interviews', 'criteria', 'agencies', 'settings']) {
  assert.match(app, new RegExp(view));
}

assert.match(candidatesPage, /Bulk candidate onboarding/);
assert.match(candidatesPage, /View details/);
assert.match(candidatesPage, /Review onboarding/);
assert.match(candidatesPage, /experienceYears/);
assert.match(settingsPage, /Candidate lifecycle/);
assert.doesNotMatch(settingsPage, /Applications/);

assert.equal(packageJson.scripts.build, 'tsc -b && vite build');
assert.equal(packageJson.scripts['test:smoke'], 'node scripts/smoke-test.mjs');

console.log('Frontend smoke checks passed: bundle, shell, role navigation, and shared UI contracts.');
