# Assumptions

- The first thing that is coming into my mind is that bookings are for only today, because if we go to this endpoint, let us say, in the POST request of bookings, we take a user ID and we take a venue ID.

It does not take which day it is. We also need to book, no? Which day it is, whether it is in the future, or whether it is in some particular slot, we don't know that.

For the time being, as this is a prototype and this is an assessment, whenever this API is called, we are just using the current date. Maybe you can use it as the current date. We can use it as UTC. From the server, we can check what the UTC is, and we can use this time instead of depending on the users to send their time and stuff.

There can be slots as well, but right now, slots and all are out of scope. Whenever this API is called, it just takes a user ID and a venue ID, and it takes that date itself or the UTC time from the server. The server assigns the booking date using UTC. We are done with that.

Also, I am choosing this because the brief does not include the date and time field and all those things.

Also, one more thing here: this API should return you the redemption code. This is what this booking API does, and with the redemption code, it returns the booking as well. Read it.

Also, there's another assumption right now. 

- Another assumption that is in my mind is that we have a capacity: every venue has a capacity. Each successful booking reserves one place in that venue's daily capacity. Once that capacity is full, further bookings are automatically rejected.

Also, one more thing to keep in mind is that redemption does not release a place. I'm treating daily capacity as the maximum number of visits accepted for that day at that particular venue, rather than current occupancy that is there.

Also, for example, assume the capacity means only 2 people, 2 accepted bookings. Redeeming one does not allow a third booking. If the capacity is 2 and 2 accepted bookings are there, a third booking is not allowed. Failed requests reserve nothing. Note that.

Also, count accepted bookings for the relevant venue and the date out there. A separate mutable capacity counter is unnecessary here. I would suggest that. 


- Another thing that I am thinking right now is that every successful booking costs exactly one visit credit, as specified, but there is one more thing called price per visit. That is stored as the venue information, but it won't change the credit deduction here. That is an ambiguity that is given in the file.

We are just storing the paper visit, but the brief does not define a converse conversion between the price and the credits there, so I won't go ahead. You should not go ahead and invent one.

What do I mean? Let me just simplify: a venue's price field, whatever is there, and the user's credit balance are separate fields. No payment processing or currency conversion is needed. As mentioned, price per visit is just stored as venue information, but each successful booking costs exactly one visit credit. I hope you understand that point. 


- A user may book more than once if they have some credits, and only the venue has that capacity out there. Assume I'm not overlapping or adding any slot restrictions and stuff for this prototype, this MVP, and this assessment out there. Guest bookings are also outside of this scope right now, but make sure this is also one of the things that you need to take care of. 

- I will use Node.js built-in crypto random. There's a thing called UUID. We can use that instead of downloading any other external package.

Also, Node, one very important assumption that you should make, which I'm making: I won't reuse codes from redeemed or expired bookings. Use the built-in generator and avoid any extra package and stuff.

One more thing is that collision must trigger regeneration. What I mean is, you should check every retained booking regardless of its status. For example, because the storage resets on restart and stuff, UUIDs make this reputation accidental, but let's not dive deep into that more. Keep it as simple as that.

UUID will generate the code, and check the generated redemption code against all the stored bookings, so it should always generate a unique redemption code. That's what I'm talking about. 


- I'll validate the requesting user, the credits, and the capacity before creating, booking, or deducting a credit. By the way, a rejected request does not reduce the user's balance or reserve capacity. We need to check all requirements first and then generate a unique code out there. We need to perform such successful booking changes together. Also, we need to keep this small in memory operations, synchronous operations, and production storage, and there's no need for any transactional security protection and stuff. 

- - Whatever we need to implement, consider this as MVP 1.
- There's another thing: you can see and review in the PDF that an optional 10-minute expiry one is mentioned, like a 10-minute expiry to a redemption code, and we reject the expired ones. That feature we can add as MVP 2 if time permits.
- Between each stage of MVP, it's better that we go ahead and write test cases, integration tests, maybe using super test. After each MVP is completed, write a test case and verify it.
- I have opened Postman, so we will also go ahead and verify each of the individual 3 endpoints in Postman. See if it is working, write test cases, run all those test cases, and make sure it works. Only then move to MVP 2 and do the same process with that, if time permits, but MVP 1 is what we need to do for sure.
This is one thing.

- And there is no one more thing that is coming into my mind: there is no need for any refund, or, you know what we will say, capacity policy expiry won't automatically refund the credit or release the reserved capacity in this prototype. That is very important. That keeps the optional feature limited to expiry validation and all those things, so this one more. 

- I want the error and response conventions. I want to keep the errors consistent. Do something like `error.code` for programmatic handling. Basically, whatever the API responses should be, they should be structured. It should be something like `error.code` for programmatic handling and `error.message` explaining what the problem is all about.
I want the output like that. For example, assume:
- If a user tries to retrieve anything, you give 200. It is successful.
- If the redemption succeeds, then maybe give a 200 status code.
- If booking is created, give 201, let us say.
- What else can we do? If daily capacity is reached or there are insufficient credits, give 409 or something.
- If it is already redeemed, still give 409.
- If expired, still give the code "is expired", so give 409.
- If the user is not there, then give a 404 error.
- If there's an unknown, when you give, let us say, a 404 error.
Make sure the response that we are getting from the API is structured the way I told you. Don't make it unnecessarily complicated.

