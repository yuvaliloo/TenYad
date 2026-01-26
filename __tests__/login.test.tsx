import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import LoginScreen from '../app/login'; // Adjust path if needed

//Mock Expo Router
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: '123' } })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // We can simulate a user NOT being logged in initially
    callback(null); 
    return () => {}; // return unsubscribe function
  }),
}));

// Mock Ionicons (to prevent icon rendering errors in tests)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: '',
}));

import { signInWithEmailAndPassword } from 'firebase/auth';
import { Alert } from 'react-native';

describe('LoginScreen UI Tests', () => {

  // Spy on Alert to verify error popups
  jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // RENDER CHECK
  it('renders all essential login elements', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    expect(getByTestId('email_input')).toBeTruthy();
    expect(getByTestId('password_input')).toBeTruthy();
    expect(getByTestId('login_button')).toBeTruthy();
    
    //Check for texts
    expect(getByText('TenYad')).toBeTruthy();
    expect(getByText('Welcome back!')).toBeTruthy();

    });

  //INPUT INTERACTION
  it('updates email and password state when typing', () => {
    const { getByTestId } = render(<LoginScreen />);

    const emailInput = getByTestId('email_input');
    const passwordInput = getByTestId('password_input');

    fireEvent.changeText(emailInput, 'test@test.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@test.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  //VALIDATION (Empty Fields)
  it('shows Alert when logging in with empty fields', () => {
    const { getByTestId } = render(<LoginScreen />);

    //Press login without typing anything
    fireEvent.press(getByTestId('login_button'));

    //Expect Alert to be called
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter both email and password.');
    
    // Ensure Firebase was NOT called
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();

     });

  // SUCCESSFUL LOGIN
  it('calls signInWithEmailAndPassword with correct data', async () => {
    const { getByTestId } = render(<LoginScreen />);

    // Fill inputs
    fireEvent.changeText(getByTestId('email_input'), 'user@valid.com');
    fireEvent.changeText(getByTestId('password_input'), 'secretPass');

    //Press Login
    fireEvent.press(getByTestId('login_button'));

    // Wait for async execution
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'user@valid.com',
        'secretPass'
      );
    });
  
  });
});
