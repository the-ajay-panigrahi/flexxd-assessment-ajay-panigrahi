# Booking API implementation context

## Goal and sources

Build the small fitness booking API described in `Flexxd_Technical_Assessment_Full_Stack_Developer.pdf`, using Node.js, Express, and in-memory arrays of objects. Apply the decisions in `assumptions.md` and the approved discussion, summarized in `summarized assumptions.md`.

This file records the agreed plan. Creating it does not begin implementation.

## MVP 1 scope

Implement exactly these three routes, with no additional route aliases:

| Route | Request | Successful response |
| --- | --- | --- |
| `POST /bookings` | JSON containing `userId` and `venueId` | `201`, returning the created booking, including its redemption code |
| `POST /bookings/redeem` | JSON containing `redemptionCode` | `200`, returning the booking marked as redeemed |
| `GET /users/:id` | User ID in the URL; the PDF writes this as `/users/{id}` | `200`, returning the user, current credits, and all their bookings |

The creation route is plural: `/bookings`, not `/booking`.

## Data and storage

- Maintain separate `users`, `venues`, and `bookings` arrays. Link bookings to existing user and venue records by their IDs when created.
- Seed exactly two users and two venues. Names and sample numeric values may be chosen during implementation; the assessment does not prescribe them. Begin with no bookings.
- User fields: `id`, `name`, `visitCredits`.
- Venue fields: `id`, `name`, `pricePerVisit`, `dailyCapacity`.
- Booking fields: `id`, `userId`, `venueId`, `bookingDate`, `redemptionCode`, `redeemed`, `createdAt`, and `redeemedAt`. New bookings start with `redeemed: false` and `redeemedAt: null`.
- Use the server's UTC date for `bookingDate` and UTC timestamps for creation and redemption. Capture creation time once so the date and timestamp agree across midnight.
- Store data only in memory. Do not persist booking data to JSON, text files, or a database. Restarting clears bookings and restores seeded data.

## Booking rules

- Requests do not select dates, future visits, or time slots. Each new booking belongs to the server's current UTC date.
- Each successful booking costs exactly one visit credit. Venue price is stored information; it does not affect credit deduction. No payments or price-to-credit conversion.
- A user may make multiple bookings while they have credits and the venue has daily capacity.
- Each successful booking reserves one place for its venue and booking date. Derive usage by counting stored bookings for that venue and date; do not maintain a second mutable capacity counter.
- Count accepted bookings regardless of whether they have been redeemed. Redemption does not release capacity or deduct another credit.
- Validate the request, user, venue, available credits, and daily capacity before changing any stored state.
- Generate redemption codes using Node.js built-in `crypto.randomUUID()`. Check against every retained booking and regenerate on collision, regardless of redemption status or future expiry.
- Complete validation, code generation, credit deduction, and booking insertion synchronously, without yielding between the checks and mutations. This is a single-process prototype, not a production transaction design.
- Every rejected booking leaves credits, bookings, and derived capacity unchanged. Every rejected redemption leaves the booking unchanged.
- In MVP 1, unused codes remain redeemable after UTC midnight. The booking date controls capacity accounting, not code expiry.

## Redemption and responses

- Reject unknown redemption codes and attempts to redeem a booking more than once.
- Successful redemption sets `redeemed` to `true` and records `redeemedAt`.
- Use a consistent JSON error structure with `error.code` for programmatic handling and `error.message` for a clear explanation.
- Return `400` for missing or malformed request inputs, `404` for an unknown user, venue, or redemption code, and `409` for insufficient credits, full daily capacity, or an already redeemed code.
- Return `200` only for successful user retrieval or redemption and `201` for successful booking creation.
- An existing user without bookings receives an empty bookings array. Retrieval includes both unredeemed and redeemed bookings.

## Verification before MVP 2

- Add integration tests for all three routes; Supertest is an option, not a mandatory dependency.
- Cover successful booking, exactly one credit deducted, linked IDs, returned code, successful redemption, and user retrieval with current credits and all bookings.
- Cover invalid inputs, unknown users and venues, insufficient credits, full capacity, unknown codes, repeated redemption, and unchanged state after rejection.
- Check repeated bookings, capacity remaining consumed after redemption, UTC date accounting, redemption after midnight in MVP 1, and code regeneration on collision.
- Demonstrate all three endpoints in Postman and verify the returned data. Complete MVP 1 checks before considering optional expiry.

## Optional MVP 2

- Only after MVP 1 is complete and verified, consider adding a ten-minute expiry measured from booking creation.
- Reject an unredeemed code at or after its expiry with `409` and a clear expiry error code and message.
- Retain expired bookings and their codes. Expiry does not refund credits or release reserved capacity for the booking date.
- Validate expiry when redemption is requested; no scheduled cleanup or background jobs are needed.
- Add expiry boundary tests and repeat the relevant integration and Postman checks.

## Exclusions and assessment walkthrough

No frontend, database, file persistence, login/authentication, guest bookings, scheduling, slots, cancellation, refunds, or additional endpoints.

For the required suspicious-redemption explanation, use the booking's user ID, venue ID, status, and timestamps to inspect what the API recorded. These records cannot identify who submitted the redemption or prove physical attendance, and they disappear on restart. Discuss stronger verification and durable audit records as future work rather than implementing them in this MVP.

The assessment also asks for a recorded walkthrough, explanation of assumptions and AI use, commits during the build, and a public repository plus recording submission. These are delivery requirements, not additional API features.
