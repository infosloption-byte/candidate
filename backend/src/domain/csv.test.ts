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
