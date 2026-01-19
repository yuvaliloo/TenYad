import { addDoc, collection } from 'firebase/firestore';
import { db } from '../app/services/firebase';
import { createRequestObject, processFeedForTasker } from '../app/services/logicHelpers';
import { createRequest } from '../app/services/requests';

// MOCK firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  GeoPoint: jest.fn((lat, lng) => ({ latitude: lat, longitude: lng })),
}));

jest.mock('../app/services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      displayName: 'Test User',
    },
  },
  db: { type: 'mock-db' },
}));

describe('Request Flow Unit Tests', () => {

  beforeEach(() => {
    // Reset mocks before each test to prevent "pollution" from previous tests
    jest.clearAllMocks();
    // Ensure addDoc returns success by default (since one test makes it fail)
    addDoc.mockImplementation(() => Promise.resolve({ id: 'mock-doc-id' }));
  });

  // Test 1: Data validation & formatting
  //This unit test verifies that the request creation logic correctly formats a task object using valid user input and user data.
  //It ensures that all required fields and default values are set before sending the request to the backend.
  test('Should create a valid request object', () => {
    const user = { uid: 'u1', displayName: 'Alice' };

    const result = createRequestObject(
      'Moving Help',
      'Need boxes moved',
      'Tel Aviv',
      user
    );

    expect(result).toEqual({
      title: 'Moving Help',
      description: 'Need boxes moved',
      address: 'Tel Aviv',
      seekerId: 'u1',
      seekerName: 'Alice',
      status: 'open',
      worker: 'OPEN',
    });
  });

  test('Should return null for invalid request object (missing fields)', () => {
    const user = { uid: 'u1', displayName: 'Alice' };

    // Missing address
    const result = createRequestObject(
      'Moving Help',
      'Need boxes moved',
      '', // Empty address
      user
    );

    expect(result).toBeNull();
  });

  test('Should return null specifically when title is missing', () => {
    const user = { uid: 'u1', displayName: 'Alice' };

    const result = createRequestObject(
      '', // Empty title should fail validation
      'Valid description',
      'Valid address',
      user
    );

    expect(result).toBeNull();
  });

  // Test 2: Real Service Interaction
  test('createRequest should call Firestore with enriched data', async () => {
    //Arrange: Prepare the input data
    const requestData = {
      title: 'Fix Sink',
      description: 'Leaking pipe',
      address: 'Haifa',
      latitude: 32.79,
      longitude: 34.99
    };

    const mockCollectionRef = { id: 'requests-collection' };// Mock collection reference
    collection.mockReturnValue(mockCollectionRef);// Mock the collection function to return our mock reference

    //Call the REAL service function
    await createRequest(requestData);

    //Check if Firestore was called with the correct internal logic
    // We expect the service to have added the current user properties and timestamps
    expect(collection).toHaveBeenCalledWith(db, 'requests');
    // Check that addDoc was called with the enriched request object
    expect(addDoc).toHaveBeenCalledWith(mockCollectionRef, expect.objectContaining({
      title: 'Fix Sink',
      seekerId: 'test-user-123',        // From the mocked auth.currentUser
      seekerName: 'Test User',          // From the mocked auth.currentUser
      status: 'open',
      worker: 'OPEN',
      createdAt: 'MOCK_TIMESTAMP',
      location: { latitude: 32.79, longitude: 34.99 } // Result of Mock GeoPoint
    }));
  });

  test('Should handle Firestore failure gracefully', async () => {
    //Arrange: Define sample data and mock failure
    const requestData = {
      title: 'Valid Request',
      description: 'Test description',
      address: 'Test Address'
    };
    
    // Create a mock collection ref so createRequest gets past the collection() call
    const mockCollectionRef = { id: 'requests-collection' };
    collection.mockReturnValue(mockCollectionRef);

    addDoc.mockRejectedValue(new Error('Network Error'));

    // Act and Assert: Expect createRequest to throw the same error
    await expect(createRequest(requestData)).rejects.toThrow('Network Error');
  });

  test('Should correctly handle request without coordinates (save null location)', async () => {
    //Arrange: Data without latitude/longitude
    const requestData = {
      title: 'Online Help',
      description: 'Zoom call',
      address: 'Remote'
      // Missing latitude/longitude on purpose
    };

    const mockCollectionRef = { id: 'requests-collection' };
    collection.mockReturnValue(mockCollectionRef);

    //Act - Call the real service function
    await createRequest(requestData);

    //Assert- Verify "location" is explicitly null in database call
    expect(addDoc).toHaveBeenCalledWith(mockCollectionRef, expect.objectContaining({
      title: 'Online Help',
      location: null 
    }));
  });

  // Test 3: Feed visibility logic
  test('Tasker should see tasks published by other seekers (but not their own or assigned ones)', () => {
    
    const taskerId = 'tasker-123';
    const otherSeekerId = 'seeker-999';

    // Realistic Firestore feed snapshot
    const feedData = [
      { 
        id: 'visible-task', 
        title: 'Walk Dog', 
        seekerId: otherSeekerId, // Created by someone else
        status: 'open',
        worker: 'OPEN'           // Available
      },
      { 
        id: 'my-own-task', 
        title: 'My Request', 
        seekerId: taskerId,      // Created by ME
        status: 'open',
        worker: 'OPEN'
      }, 
      { 
        id: 'taken-task', 
        title: 'Paint Wall', 
        seekerId: otherSeekerId, 
        status: 'assigned',
        worker: 'some-other-worker' // Already taken
      },
    ];

    const result = processFeedForTasker(feedData, taskerId);

    // Assertion: The tasker sees in his feed the task published by the seeker
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('visible-task');
    expect(result[0].seekerId).toBe(otherSeekerId);
    
    // Verify "my-own-task" and "taken-task" are gone
    expect(result.find(r => r.id === 'my-own-task')).toBeUndefined();
    expect(result.find(r => r.id === 'taken-task')).toBeUndefined();
  });

  test('Should show tasks with missing or null worker field (Backwards Compatibility)', () => {
    const taskerId = 'tasker-123';
    const feedData = [
      { 
        id: 'legacy-task-null', 
        seekerId: 'other-user', 
        worker: null 
      },
      { 
        id: 'legacy-task-undefined', 
        seekerId: 'other-user'
        // worker is undefined
      }
    ];

    const result = processFeedForTasker(feedData, taskerId);
    expect(result).toHaveLength(2);
  });

  test('Should return empty array when all tasks are either created by user or already assigned', () => {
    const me = 'my-uid';
    const input = [
      { id: '1', seekerId: me, worker: 'OPEN' },       // My own task (should be hidden)
      { id: '2', seekerId: 'other', worker: 'worker1' } // Taken task (should be hidden)
    ];
    
    const result = processFeedForTasker(input, me);
    expect(result).toEqual([]);
  });
});
