import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import SignupScreen from '../app/signup'; // Adjust path
import { createUserWithEmailAndPassword } from 'firebase/auth';

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
  }),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: 'new123', email: 'test@test.com' } })
  ),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: '',
}));

describe('SignupScreen UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Render Check 
  it('renders all signup fields correctly', () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    expect(getByTestId('name_input')).toBeTruthy();
    expect(getByTestId('email_input')).toBeTruthy();
    expect(getByTestId('password_input')).toBeTruthy();
    expect(getByTestId('confirm_input')).toBeTruthy();

    expect(getByText('Create Account')).toBeTruthy();
  });

  //TEST 2: Password Mismatch Validation 
    it('shows error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(<SignupScreen />);

    //Fill valid email & name
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('john@example.com'), 'valid@email.com');

    // Fill Mismatched Passwords
    fireEvent.changeText(getByTestId('password_input'), '123456');
    fireEvent.changeText(getByTestId('confirm_input'), '123459');

    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(getByText('Passwords do not match.')).toBeTruthy();
      expect(require('firebase/auth').createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  //TEST 3: Weak Password Validation 
  it('shows error for weak passwords (< 6 chars)', async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('name_input'), 'Test User');
    fireEvent.changeText(getByTestId('email_input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password_input'), '123');
    fireEvent.changeText(getByTestId('confirm_input'), '123');

    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters.')).toBeTruthy();
      expect(require('firebase/auth').createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  //TEST 4 : Happy Path 
  it('creates user and updates profile on valid submission', async () => {
    const { getByTestId, getByText } = render(<SignupScreen />);

    fireEvent.changeText(getByTestId('name_input'), 'Test User');
    fireEvent.changeText(getByTestId('email_input'), 'test@user.com');
    fireEvent.changeText(getByTestId('password_input'), '123456');
    fireEvent.changeText(getByTestId('confirm_input'), '123456');

    fireEvent.press(getByText('Sign Up'));

    await waitFor(() => {
      const auth = require('firebase/auth');
      expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@user.com',
        '123456'
      );
      expect(auth.updateProfile).toHaveBeenCalledWith(expect.anything(), { displayName: 'Test User' });
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
