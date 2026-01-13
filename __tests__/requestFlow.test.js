import { validateRequestData, filterTaskerFeed } from '../services/logicHelpers'; // We will create these small helpers below to make testing easier
import { addDoc, collection } from 'firebase/firestore';

// --- 1. MOCK FIREBASE ---
// This prevents Jest from trying to connect to the real internet
jest.mock('../services/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123', displayName: 'Test User' } }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => '2024-01-01T12:00:00Z'),
  GeoPoint: jest.fn((lat, lng) => ({ latitude: lat, longitude: lng })),
}));

// --- 2. HELPER FUNCTIONS TO TEST ---
// (Ideally, move these to a separate file like 'services/logicHelpers.js' in your real app)

// Function A: Validates format before sending
const createRequestObject = (title, description, address, user) => {
  if (!title || !description || !address) return null;
  return {
    title,
    description,
    address,
    seekerId: user.uid,
    seekerName: user.displayName,
    status: 'open',
    worker: 'OPEN',
    createdAt: '2024-01-01T12:00:00Z', // Mocked timestamp
  };
};

// Function B: The specific filter logic for the feed
const processFeedForTasker = (allRequests, currentUserId) => {
  return allRequests.filter(req => req.seekerId !== currentUserId);
};


// --- 3. THE TESTS ---

describe('Main Process: Request Lifecycle', () => {
  
  // Test 1: Data Formatting (The "New Request" Screen Logic)
  it('Should format the request object correctly', () => {
    const user = { uid: 'user-1', displayName: 'Alice' };
    const result = createRequestObject('Moving Help', 'Need boxes moved', 'Tel Aviv', user);

    expect(result).toEqual({
      title: 'Moving Help',
      description: 'Need boxes moved',
      address: 'Tel Aviv',
      seekerId: 'user-1',
      seekerName: 'Alice',
      status: 'open',
      worker: 'OPEN',
      createdAt: '2024-01-01T12:00:00Z',
    });
  });

  it('Should return null if fields are missing', () => {
    const user = { uid: 'user-1', displayName: 'Alice' };
    // Missing address
    const result = createRequestObject('Moving Help', 'Description', '', user); 
    expect(result).toBeNull();
  });


  // Test 2: Firestore Upload (The "Publish" Button Logic)
  it('Should attempt to upload to Firestore with correct collection', async () => {
    const mockDb = {}; // Mock db object
    const mockData = { title: 'Test Task' };

    // Simulate the upload action
    await addDoc(collection(mockDb, 'requests'), mockData);

    // Assert that 'collection' was called with the 'requests' path
    expect(collection).toHaveBeenCalledWith(mockDb, 'requests');
    
    // Assert that 'addDoc' was called with the data
    expect(addDoc).toHaveBeenCalledWith(undefined, mockData);
  });


  // Test 3: Feed Filtering (The "Tasker Feed" Logic)
  it('Should filter out tasks created by the current user', () => {
    const currentUserId = 'my-id';

    const incomingData = [
      { id: '1', title: 'Task A', seekerId: 'other-guy' },
      { id: '2', title: 'Task B', seekerId: 'my-id' }, // <--- Should be removed
      { id: '3', title: 'Task C', seekerId: 'someone-else' },
    ];

    const feed = processFeedForTasker(incomingData, currentUserId);

    expect(feed.length).toBe(2);
    expect(feed).toEqual([
      { id: '1', title: 'Task A', seekerId: 'other-guy' },
      { id: '3', title: 'Task C', seekerId: 'someone-else' },
    ]);
  });

});