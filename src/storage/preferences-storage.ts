import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const USERS_REGISTRY_KEY = 'campus_timetable_users_registry';
export const CURRENT_USER_KEY = 'campus_timetable_current_user';
export const LEGACY_PREFS_KEY = 'campus_timetable_user_prefs';

export interface UserAccount {
  username: string;
  password?: string;
  branchId: string;
  branchCode: string;
  branchLabel: string;
  divisionId: string;
  divisionLabel: string;
  subdivisionId: string;
  subdivisionLabel: string;
  createdAt: string;
  updatedAt: string;
}

// Backward-compatible alias
export type UserTimetablePrefs = UserAccount;

export async function storageGet(key: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    if (Platform.OS === 'web' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn(`Storage get error for ${key}:`, e);
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    if (Platform.OS === 'web' && window.localStorage) {
      window.localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Storage set error for ${key}:`, e);
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    if (Platform.OS === 'web' && window.localStorage) {
      window.localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`Storage remove error for ${key}:`, e);
  }
}

/**
 * Get all registered user accounts
 */
export async function getRegisteredUsers(): Promise<Record<string, UserAccount>> {
  try {
    const raw = await storageGet(USERS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Register a new user account with branch, division, batch and credentials
 */
export async function registerUser(account: UserAccount): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedUsername = account.username.trim();
    if (!trimmedUsername) {
      return { success: false, error: 'Username is required' };
    }
    if (!account.password || account.password.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters' };
    }

    const key = trimmedUsername.toLowerCase();
    const allUsers = await getRegisteredUsers();

    if (allUsers[key]) {
      return { success: false, error: 'An account with this username already exists' };
    }

    allUsers[key] = {
      ...account,
      username: trimmedUsername,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storageSet(USERS_REGISTRY_KEY, JSON.stringify(allUsers));
    // Automatically set as current logged in user
    await setCurrentUser(allUsers[key]);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Registration failed' };
  }
}

/**
 * Log in an existing user with username & password
 */
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const key = username.trim().toLowerCase();
    if (!key) {
      return { success: false, error: 'Please enter your username' };
    }
    const allUsers = await getRegisteredUsers();
    const user = allUsers[key];

    if (!user) {
      return { success: false, error: 'Username not found. Please register first.' };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    await setCurrentUser(user);
    return { success: true, user };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Login error' };
  }
}

/**
 * Get currently logged-in user
 */
export async function getCurrentUser(): Promise<UserAccount | null> {
  try {
    const raw = await storageGet(CURRENT_USER_KEY);
    if (raw) return JSON.parse(raw);

    // Fallback to legacy single-user storage if exists
    const legacyRaw = await storageGet(LEGACY_PREFS_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      return {
        ...legacy,
        createdAt: legacy.updatedAt || new Date().toISOString(),
        updatedAt: legacy.updatedAt || new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set active user
 */
export async function setCurrentUser(user: UserAccount | null): Promise<void> {
  if (user) {
    await storageSet(CURRENT_USER_KEY, JSON.stringify(user));
    // also sync to legacy key for backwards compatibility
    await storageSet(LEGACY_PREFS_KEY, JSON.stringify(user));
  } else {
    await storageRemove(CURRENT_USER_KEY);
    await storageRemove(LEGACY_PREFS_KEY);
  }
}

/**
 * Update current user preferences (branch, division, batch)
 */
export async function updateCurrentUser(updates: Partial<UserAccount>): Promise<UserAccount | null> {
  const current = await getCurrentUser();
  if (!current) return null;

  const updated: UserAccount = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setCurrentUser(updated);

  // Sync into registered users registry as well
  const allUsers = await getRegisteredUsers();
  const key = updated.username.toLowerCase();
  if (allUsers[key]) {
    allUsers[key] = updated;
    await storageSet(USERS_REGISTRY_KEY, JSON.stringify(allUsers));
  }

  return updated;
}

/**
 * Log out
 */
export async function logoutUser(): Promise<void> {
  await storageRemove(CURRENT_USER_KEY);
  await storageRemove(LEGACY_PREFS_KEY);
}

// Backwards compatibility functions
export async function getStoredTimetablePrefs(): Promise<UserTimetablePrefs | null> {
  return getCurrentUser();
}

export async function saveStoredTimetablePrefs(prefs: Partial<UserAccount>): Promise<void> {
  await updateCurrentUser(prefs);
}

export async function clearStoredTimetablePrefs(): Promise<void> {
  await logoutUser();
}
