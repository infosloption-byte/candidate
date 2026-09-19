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

assert.match(candidatesPage, /Import candidates/);
assert.match(candidatesPage, /Open/);
assert.match(candidatesPage, /role="dialog"/);
assert.match(candidatesPage, /useFocusTrap/);
assert.match(candidatesPage, /Close candidate details/);
assert.match(candidatesPage, /Proceed with import/);
assert.match(candidatesPage, /experienceYears/);
assert.match(candidatesPage, /passportNumber/);
assert.match(candidatesPage, /placeholder="Name, reference, passport, contact, location or skill/);
assert.doesNotMatch(candidatesPage, /passportSearch/);
assert.match(candidatesPage, /sortBy/);
assert.match(candidatesPage, /countryFilter/);
assert.match(candidatesPage, /visaStatusFilter/);
assert.match(candidatesPage, /Passport expiry/);
assert.match(candidatesPage, /Current location/);
assert.match(candidatesPage, /All countries/);
assert.match(candidatesPage, /Any visa status/);
assert.match(candidatesPage, /Contact number/);
assert.match(candidatesPage, /alternatePhone/);
const interviewsPage = read('src/features/interviews/InterviewsPage.tsx');
assert.match(interviewsPage, /Create interview/);
assert.match(interviewsPage, /Candidates/);
assert.match(interviewsPage, /Open/);
assert.match(interviewsPage, /role=\"dialog\"/);
assert.match(interviewsPage, /interviews\/bulk/);
assert.match(interviewsPage, /Also schedule for other candidates/);
assert.match(interviewsPage, /Edit interview/);
assert.match(interviewsPage, /role="dialog"/);
assert.match(interviewsPage, /scheduleModalOpen/);
assert.match(interviewsPage, /sortBy/);
assert.match(interviewsPage, /typeFilter/);
assert.match(interviewsPage, /statusFilter/);
assert.match(interviewsPage, /Search interviews/);
assert.match(settingsPage, /Candidate lifecycle/);
assert.doesNotMatch(settingsPage, /Applications/);

assert.equal(packageJson.scripts.build, 'tsc -b && vite build');
assert.equal(packageJson.scripts['test:smoke'], 'node scripts/smoke-test.mjs');

console.log('Frontend smoke checks passed: bundle, shell, role navigation, and shared UI contracts.');
