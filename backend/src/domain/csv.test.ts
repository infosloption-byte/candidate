import assert from 'node:assert/strict';
import test from 'node:test';
import { csvRowsToObjects, parseCsv } from './csv.js';

test('csv parser handles quoted commas', () => {
  assert.deepEqual(
    parseCsv('name,profession\n"Perera, Kamal",Mason\n'),
    [['name', 'profession'], ['Perera, Kamal', 'Mason']],
  );
});

test('csv object parser normalizes headers', () => {
  assert.deepEqual(
    csvRowsToObjects('Name,Email\nKamal,kamal@example.com\n'),
    [{ name: 'Kamal', email: 'kamal@example.com' }],
  );
});

test('csv object parser lowercases camel-case experience header', () => {
  assert.deepEqual(
    csvRowsToObjects('name,experienceYears\nKamal,8\n'),
    [{ name: 'Kamal', experienceyears: '8' }],
  );
});
