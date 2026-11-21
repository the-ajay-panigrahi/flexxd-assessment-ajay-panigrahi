# flexxd-assessment-ajay-panigrahi

MVP 1 and MVP 2 booking API using Node.js, Express, and in-memory arrays. Requires Node.js 24 or newer for the included tests.

## Run

```sh
npm install
npm start
```

The API runs at `http://localhost:3000`. Set `PORT` to use a different port.

```sh
npm test
```

## Seed data

| User ID | Name | Visit credits |
| --- | --- | --- |
| `user-1` | Ajay | 3 |
| `user-2` | Priya | 1 |

| Venue ID | Name | Price per visit | Daily capacity |
| --- | --- | --- | --- |
| `venue-1` | Flex Gym | 100 | 2 |
| `venue-2` | Yoga Studio | 200 | 3 |

Restarting restores the seeds and clears bookings.

## Postman verification

Import `postman/booking-api-mvp1.postman_collection.json` into Postman. Start the API with fresh seed data and run the collection in order. It saves the redemption code automatically and includes nine response assertions. Restart the API before repeating the collection.

1. Send `POST http://localhost:3000/bookings` with a JSON body of `{"userId":"user-1","venueId":"venue-1"}`. Expect `201` and the booking with a `redemptionCode`.
2. Send `POST http://localhost:3000/bookings/redeem` with `{"redemptionCode":"<code from step 1>"}`. Expect `200`, `redeemed: true`, and `redeemedAt`.
3. Send `GET http://localhost:3000/users/user-1`. Expect `200`, two remaining credits, and the redeemed booking.
4. Repeat step 2. Expect `409` with `error.code` of `ALREADY_REDEEMED`.

For POST requests select Body > raw > JSON. Errors use `{"error":{"code":"...","message":"..."}}`.

Bookings use the server's UTC date and cost one credit. Accepted bookings consume daily venue capacity even after redemption or code expiry.

## MVP 2 expiry

Unredeemed codes expire ten minutes after `createdAt`. Redemption at or after that deadline returns `409` with `error.code: CODE_EXPIRED`. Redeemed bookings stay redeemed; repeated redemption returns `ALREADY_REDEEMED` even after the deadline. Expiry does not change stored bookings, refund credits, or release daily capacity. There are no background jobs.

The tests control Node.js's clock to check one millisecond before, exactly at, and one millisecond after expiry. Run them together with the core tests using `npm test`.

Import `postman/booking-api-mvp2.postman_collection.json` for the core requests and expiry checks. Run requests 1 through 4 against a freshly started API. Request 5 expects request 4's code to have reached its ten-minute deadline; requests 6 and 7 then check that the expired booking is retained and the earlier redeemed booking stays redeemed. Request 5 can be repeated after the deadline. The API exposes no clock-control endpoint; automated boundary verification is in the integration tests.

See [the implementation context](docs/context.md) and [assumptions](docs/assumptions.md) for the agreed scope.

## Code structure

- `src/models/store.js`: seeded users, venues, and bookings in memory.
- `src/routes/index.js`: the three route definitions.
- `src/controllers/`: booking, redemption, and user request handling.
- `src/utils/`: response and validation helpers, with status and error codes in `constants.js`.
- `src/app.js`: Express setup; `src/server.js`: server startup.
