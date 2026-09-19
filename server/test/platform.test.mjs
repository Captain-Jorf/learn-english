import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, applyMigrations } from '../lib/db.mjs';
import { createServices } from '../lib/services.mjs';
import { issueSession, rotateRefreshToken, verifyAccessToken } from '../lib/auth.mjs';
import { seedContent } from '../seed.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(directory, '..');

function testConfig() {
  return {
    databaseUrl: 'sqlite::memory:',
    sqlitePath: ':memory:',
    jwtSecret: 'unit-test-secret-that-is-never-used-in-production',
    jwtIssuer: 'lexora-test',
    jwtAudience: 'lexora-test-mobile',
    accessTokenMinutes: 15,
    refreshTokenDays: 30,
    retentionDays: 90,
    ageGate: { minimumAge: 13, parentalConsentEnabled: false },
    aiGateway: { url: '', token: '', model: '', timeoutMs: 100 },
    bootstrapAdmin: { email: '', password: '' },
  };
}

async function platform() {
  const config = testConfig();
  const database = await createDatabase(config);
  await applyMigrations(database, join(serverRoot, 'migrations'));
  await seedContent(database);
  return { config, database, services: createServices({ database, config }) };
}

test('original editorial content is seeded into the real catalog', async (t) => {
  const { database, services } = await platform();
  t.after(async () => database.close());
  const catalog = await services.getCatalog({ domain: 'Ideas' });
  assert.equal(catalog.total, 3);
  assert.equal(catalog.words[0].provenance, 'Lexora Editorial');
  assert.ok(catalog.words.every((word) => word.definition.length > 20));
});

test('13+ launch gate rejects an under-13 account until parental consent exists', async (t) => {
  const { database, services } = await platform();
  t.after(async () => database.close());
  await assert.rejects(
    services.registerUser({ email: 'child@example.com', password: 'this-password-is-long-enough', ageBand: 'under_13' }),
    { code: 'AGE_RESTRICTED' },
  );
});

test('a learner receives real review state and a spaced-repetition transition', async (t) => {
  const { database, services } = await platform();
  t.after(async () => database.close());
  const user = await services.registerUser({ email: 'learner@example.com', password: 'this-password-is-long-enough', ageBand: 'adult', displayName: 'Taylor' });
  const firstReview = await services.getNextReview(user.id);
  assert.ok(firstReview?.id);
  const graded = await services.gradeReview(user.id, firstReview.id, 'good');
  assert.equal(graded.intervalDays, 1);
  assert.equal(graded.repetitions, 1);
  assert.ok(new Date(graded.nextReviewAt).getTime() > Date.now());
});

test('issued access token is signed, audience-bound, and verified', async (t) => {
  const { config, database, services } = await platform();
  t.after(async () => database.close());
  const user = await services.registerUser({ email: 'signed@example.com', password: 'this-password-is-long-enough', ageBand: 'teen' });
  const session = await issueSession(database, user, config, { deviceId: 'android-test' });
  const claims = verifyAccessToken(session.accessToken, config);
  assert.equal(claims.sub, user.id);
  assert.equal(claims.aud, 'lexora-test-mobile');
  assert.ok(session.refreshToken.length > 32);

  const rotated = await rotateRefreshToken(database, session.refreshToken, config, { deviceId: 'android-test' });
  assert.equal(rotated.user.id, user.id);
  assert.equal(verifyAccessToken(rotated.session.accessToken, config).sub, user.id);
  assert.equal(await rotateRefreshToken(database, session.refreshToken, config), null, 'a rotated refresh token must not be reusable');
});
