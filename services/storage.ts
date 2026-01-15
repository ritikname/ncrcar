import { Car, ViewMode, Booking, UserProfile, OwnerSettings } from '../types';
import { STORAGE_KEYS, INITIAL_CARS } from '../constants';

export const getStoredCars = (): Car[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CARS);
    if (!stored) {
      // Initialize with dummy data if empty
      localStorage.setItem(STORAGE_KEYS.CARS, JSON.stringify(INITIAL_CARS));
      return INITIAL_CARS;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to parse cars from storage', error);
    return INITIAL_CARS;
  }
};

export const saveCars = (cars: Car[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CARS, JSON.stringify(cars));
  } catch (error) {
    console.error('Failed to save cars to storage', error);
    alert('Storage full! Please delete some items.');
  }
};

export const getStoredBookings = (): Booking[] => {
  try {
    const stored = localStorage.getItem('delhi_ncr_bookings_v2'); // Bumped version
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const saveBookings = (bookings: Booking[]): void => {
  try {
    localStorage.setItem('delhi_ncr_bookings_v2', JSON.stringify(bookings));
  } catch (error) {
    console.error('Failed to save bookings', error);
  }
};

export const getStoredViewMode = (): ViewMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    if (stored === 'owner' || stored === 'customer') {
      return stored as ViewMode;
    }
    return 'customer';
  } catch (error) {
    return 'customer';
  }
};

export const saveViewMode = (mode: ViewMode): void => {
  localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
};

// --- User Profile Storage ---
// Gets the current session user
export const getUserProfile = (): UserProfile | null => {
  // DEMO CHANGE: Always return null so onboarding shows on every refresh
  return null;
  /* 
  try {
    const stored = localStorage.getItem('delhi_ncr_user_profile');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
  */
};

// Saves current session user
export const saveUserProfile = (profile: UserProfile): void => {
  // DEMO CHANGE: Data not saved to localStorage to allow testing onboarding on refresh
  // localStorage.setItem('delhi_ncr_user_profile', JSON.stringify(profile));
};

// --- All Users Registry (For Owner View) ---
export const getAllUsers = (): (UserProfile & { joinedAt: number })[] => {
  try {
    const stored = localStorage.getItem('delhi_ncr_all_users_registry');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addUserToRegistry = (user: UserProfile): (UserProfile & { joinedAt: number })[] => {
  try {
    const currentList = getAllUsers();
    // Check for duplicates based on phone
    if (!currentList.some(u => u.phone === user.phone)) {
      const newUser = { ...user, joinedAt: Date.now() };
      const newList = [newUser, ...currentList];
      localStorage.setItem('delhi_ncr_all_users_registry', JSON.stringify(newList));
      return newList;
    }
    return currentList;
  } catch {
    return [];
  }
};

// --- Owner Settings Storage (QR Code) ---
export const getOwnerSettings = (): OwnerSettings => {
  try {
    const stored = localStorage.getItem('delhi_ncr_owner_settings');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveOwnerSettings = (settings: OwnerSettings): void => {
  localStorage.setItem('delhi_ncr_owner_settings', JSON.stringify(settings));
};