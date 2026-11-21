# Summarized assumptions

Each bullet condenses a distinct point from `assumptions.md`; related approved clarifications are included where relevant.

- Bookings use the server's current UTC date because the request contains only user and venue IDs; future dates and time slots are outside scope.
- Successful booking creation returns the booking together with its redemption code.
- Each accepted booking consumes one place in the venue's daily capacity; count stored bookings for that venue and date rather than maintaining a separate capacity counter.
- Daily capacity means accepted visits for the day, not current occupancy; redemption does not release a place, and failed requests consume none.
- Each successful booking costs exactly one visit credit; venue price is retained as information without payment processing or price-to-credit conversion.
- A user may book multiple times while credits and capacity allow; overlap restrictions and guest bookings are outside scope.
- Generate redemption codes with built-in `crypto.randomUUID()` without an extra UUID package; check every retained booking and regenerate collisions, including codes belonging to redeemed or expired bookings.
- Validate inputs, user, venue, credits, and capacity before mutation; perform successful booking changes synchronously so rejected requests leave credits and bookings unchanged.
- The three required endpoints form MVP 1, which must be completed and verified first; unused codes do not expire at UTC midnight in this stage.
- Ten-minute redemption-code expiry is optional MVP 2 and should be considered only after MVP 1 is complete, if time permits.
- Add and run integration tests after each implemented MVP; Supertest is an option.
- Demonstrate and verify all three endpoints in Postman before moving from MVP 1 to optional MVP 2, then repeat relevant checks if expiry is added.
- Expiry does not refund credits or release capacity, and expired bookings and their codes remain retained in memory.
- Keep errors structured with `error.code` and `error.message`; use `201` for created bookings, `200` for successful retrieval/redemption, `400` for malformed inputs, `404` for unknown users/venues/codes, and `409` for insufficient credits, full capacity, repeated redemption, or optional expiry.
