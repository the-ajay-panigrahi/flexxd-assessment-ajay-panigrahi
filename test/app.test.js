const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createStore } = require('../src/store');

let store;
let app;

beforeEach(() => {
  store = createStore();
  app = createApp(store);
});

function book(userId = 'user-1', venueId = 'venue-1') {
  return request(app).post('/bookings').send({ userId, venueId });
}

function redeem(redemptionCode) {
  return request(app).post('/bookings/redeem').send({ redemptionCode });
}

function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.equal(response.body.error.code, code);
  assert.equal(typeof response.body.error.message, 'string');
  assert.ok(response.body.error.message.length > 0);
}

test('seeds exactly two users and two venues with all required fields', () => {
  assert.deepEqual(store.users, [
    { id: 'user-1', name: 'Ajay', visitCredits: 3 },
    { id: 'user-2', name: 'Priya', visitCredits: 1 },
  ]);
  assert.deepEqual(store.venues, [
    { id: 'venue-1', name: 'Flex Gym', pricePerVisit: 100, dailyCapacity: 2 },
    { id: 'venue-2', name: 'Yoga Studio', pricePerVisit: 200, dailyCapacity: 3 },
  ]);
  assert.deepEqual(store.bookings, []);
});

test('creates a linked booking and deducts exactly one credit regardless of venue price', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-21T12:30:00Z') });
  const response = await book('user-1', 'venue-2');
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    id: store.bookings[0].id,
    userId: 'user-1',
    venueId: 'venue-2',
    bookingDate: '2026-11-21',
    redemptionCode: store.bookings[0].redemptionCode,
    redeemed: false,
    createdAt: '2026-11-21T12:30:00.000Z',
    redeemedAt: null,
  });
  assert.match(response.body.id, /^[0-9a-f-]{36}$/);
  assert.match(response.body.redemptionCode, /^[0-9a-f-]{36}$/);
  assert.equal(store.users[0].visitCredits, 2);
  assert.equal(store.users[1].visitCredits, 1);
  assert.equal(store.bookings.length, 1);
});

test('returns an existing user with no bookings', async () => {
  const response = await request(app).get('/users/user-1');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ...store.users[0], bookings: [] });
});

test('retrieves current credits and all the user bookings, excluding other users', async () => {
  const first = await book();
  const second = await book('user-1', 'venue-2');
  await book('user-2', 'venue-2');
  const redeemed = await redeem(first.body.redemptionCode);
  const response = await request(app).get('/users/user-1');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 'user-1', name: 'Ajay', visitCredits: 1,
    bookings: [redeemed.body, second.body],
  });
});

test('redeems a booking once, records the timestamp, and preserves credits and capacity', async (t) => {
  const created = await book();
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-21T18:00:00Z') });
  const response = await redeem(created.body.redemptionCode);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    ...created.body, redeemed: true, redeemedAt: '2026-11-21T18:00:00.000Z',
  });
  assert.equal(store.users[0].visitCredits, 2);
  assert.equal(store.bookings.length, 1);
  assert.deepEqual(store.bookings[0], response.body);
});

for (const body of [
  {}, { userId: 'user-1' }, { venueId: 'venue-1' },
  { userId: '', venueId: 'venue-1' },
  { userId: 'user-1', venueId: '   ' },
  { userId: 1, venueId: 'venue-1' },
  { userId: 'user-1', venueId: null },
]) {
  test(`rejects invalid booking inputs without mutation: ${JSON.stringify(body)}`, async () => {
    const before = structuredClone(store);
    assertError(await request(app).post('/bookings').send(body), 400, 'INVALID_INPUT');
    assert.deepEqual(store, before);
  });
}

for (const body of [{}, { redemptionCode: '' }, { redemptionCode: '  ' }, { redemptionCode: 1 }]) {
  test(`rejects invalid redemption inputs without mutation: ${JSON.stringify(body)}`, async () => {
    await book();
    const before = structuredClone(store);
    assertError(await request(app).post('/bookings/redeem').send(body), 400, 'INVALID_INPUT');
    assert.deepEqual(store, before);
  });
}

for (const path of ['/bookings', '/bookings/redeem']) {
  test(`rejects missing bodies and malformed JSON without mutation: ${path}`, async () => {
    const before = structuredClone(store);
    assertError(await request(app).post(path), 400, 'INVALID_INPUT');
    assertError(
      await request(app).post(path).set('Content-Type', 'application/json').send('{'),
      400, 'INVALID_INPUT',
    );
    assert.deepEqual(store, before);
  });
}

test('rejects an unknown booking user without mutation', async () => {
  const before = structuredClone(store);
  assertError(await book('unknown-user'), 404, 'USER_NOT_FOUND');
  assert.deepEqual(store, before);
});

test('rejects an unknown venue without mutation', async () => {
  const before = structuredClone(store);
  assertError(await book('user-1', 'unknown-venue'), 404, 'VENUE_NOT_FOUND');
  assert.deepEqual(store, before);
});

test('returns 404 for an unknown user retrieval', async () => {
  const before = structuredClone(store);
  assertError(await request(app).get('/users/unknown-user'), 404, 'USER_NOT_FOUND');
  assert.deepEqual(store, before);
});

test('rejects insufficient credits without consuming capacity or adding a booking', async () => {
  assert.equal((await book('user-2', 'venue-2')).status, 201);
  const before = structuredClone(store);
  assertError(await book('user-2', 'venue-2'), 409, 'INSUFFICIENT_CREDITS');
  assert.deepEqual(store, before);
});

test('allows repeated bookings but rejects full capacity even after redemption', async () => {
  const first = await book();
  const second = await book();
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.redemptionCode, second.body.redemptionCode);
  await redeem(first.body.redemptionCode);
  const before = structuredClone(store);
  assertError(await book(), 409, 'CAPACITY_FULL');
  assert.deepEqual(store, before);
  assert.equal((await book('user-1', 'venue-2')).status, 201);
});

test('rejects an unknown redemption code without mutation', async () => {
  await book();
  const before = structuredClone(store);
  assertError(await redeem('unknown-code'), 404, 'CODE_NOT_FOUND');
  assert.deepEqual(store, before);
});

test('rejects repeated redemption without mutation', async () => {
  const created = await book();
  await redeem(created.body.redemptionCode);
  const before = structuredClone(store);
  assertError(await redeem(created.body.redemptionCode), 409, 'ALREADY_REDEEMED');
  assert.deepEqual(store, before);
});

test('counts capacity by UTC date and allows redemption after midnight without expiry', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-21T23:59:59.999Z') });
  const first = await book();
  assert.equal((await book()).status, 201);
  assertError(await book(), 409, 'CAPACITY_FULL');
  assert.equal(first.body.bookingDate, '2026-11-21');
  assert.equal(first.body.createdAt, '2026-11-21T23:59:59.999Z');

  t.mock.timers.setTime(new Date('2026-11-22T00:00:00Z').getTime());
  const nextDay = await book();
  assert.equal(nextDay.status, 201);
  assert.equal(nextDay.body.bookingDate, '2026-11-22');

  t.mock.timers.setTime(new Date('2026-11-22T12:00:00Z').getTime());
  const response = await redeem(first.body.redemptionCode);
  assert.equal(response.status, 200);
  assert.equal(response.body.bookingDate, '2026-11-21');
  assert.equal(response.body.redeemedAt, '2026-11-22T12:00:00.000Z');
  assert.equal(store.users[0].visitCredits, 0);
});

for (const redeemed of [false, true]) {
  test(`regenerates a code colliding with a retained booking (redeemed=${redeemed})`, async (t) => {
    const existing = await book();
    if (redeemed) await redeem(existing.body.redemptionCode);
    const replacementCode = crypto.randomUUID();
    const bookingId = crypto.randomUUID();
    const generated = [existing.body.redemptionCode, replacementCode, bookingId];
    t.mock.method(crypto, 'randomUUID', () => generated.shift());
    const response = await book('user-1', 'venue-2');
    assert.equal(response.status, 201);
    assert.equal(response.body.redemptionCode, replacementCode);
    assert.equal(response.body.id, bookingId);
    assert.equal(generated.length, 0);
    assert.equal(store.bookings[0].redemptionCode, existing.body.redemptionCode);
  });
}

test('a fresh app restores seeds and has no bookings', async () => {
  await book();
  const response = await request(createApp()).get('/users/user-1');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 'user-1', name: 'Ajay', visitCredits: 3, bookings: [],
  });
});
