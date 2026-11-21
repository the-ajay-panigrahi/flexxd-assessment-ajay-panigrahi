function createStore() {
  return {
    users: [
      { id: 'user-1', name: 'Ajay', visitCredits: 3 },
      { id: 'user-2', name: 'Priya', visitCredits: 1 },
    ],
    venues: [
      { id: 'venue-1', name: 'Flex Gym', pricePerVisit: 100, dailyCapacity: 2 },
      { id: 'venue-2', name: 'Yoga Studio', pricePerVisit: 200, dailyCapacity: 3 },
    ],
    bookings: [],
  };
}

module.exports = { createStore };
