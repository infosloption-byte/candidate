import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from './app.js';

test('health endpoint responds from a clean backend foundation', async () => {
  const app = buildApp();

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { success: boolean; data: { status: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  } finally {
    await app.close();
  }
});
