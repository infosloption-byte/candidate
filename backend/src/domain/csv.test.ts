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

test('csv object parser accepts semicolon-delimited Excel CSV', () => {
  assert.deepEqual(
    csvRowsToObjects(
      'Agency Register No;First Name;Last Name;Birth Date;Passport Number;Passport Expiry;Requested Profession\n' +
      'AGR-2001;Kamal;Perera;1990-01-15;N1234567;2031-12-31;Mason\n',
    ),
    [{
      agencyregisterno: 'AGR-2001',
      firstname: 'Kamal',
      lastname: 'Perera',
      birthdate: '1990-01-15',
      passportnumber: 'N1234567',
      passportexpiry: '2031-12-31',
      requestedprofession: 'Mason',
    }],
  );
});

test('csv object parser removes invisible characters from headers and values', () => {
  assert.deepEqual(
    csvRowsToObjects(
      '\uFEFFAgency Register No,First Name,Last Name,Birth Date,Passport Number,Passport Expiry,Requested Profession\n' +
      'AGR-2001,\u00A0Kamal\u00A0,Perera,1990-01-15,N1234567,2031-12-31,Mason\n',
    ),
    [{
      agencyregisterno: 'AGR-2001',
      firstname: 'Kamal',
      lastname: 'Perera',
      birthdate: '1990-01-15',
      passportnumber: 'N1234567',
      passportexpiry: '2031-12-31',
      requestedprofession: 'Mason',
    }],
  );
});

test('csv object parser accepts Excel-style human-readable headers', () => {
  assert.deepEqual(
    csvRowsToObjects(
      'Agency Register No,First Name,Last Name,Birth Date,Passport Number,Passport Expiry,Requested Profession\n' +
      'AGR-2001,Kamal,Perera,1990-01-15,N1234567,2031-12-31,Mason\n',
    ),
    [{
      agencyregisterno: 'AGR-2001',
      firstname: 'Kamal',
      lastname: 'Perera',
      birthdate: '1990-01-15',
      passportnumber: 'N1234567',
      passportexpiry: '2031-12-31',
      requestedprofession: 'Mason',
    }],
  );
});
