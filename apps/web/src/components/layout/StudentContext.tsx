'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserProfileData } from './AccountMenu';

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  lastActivityAt?: string;
}

export interface StudentContextValue {
  sessions: ChatSessionItem[];
  isLoadingSessions: boolean;
  userProfile: UserProfileData;
  isLoadingUser: boolean;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  refreshSessions: (force?: boolean) => Promise<void>;
  setSessions: React.Dispatch<React.SetStateAction<ChatSessionItem[]>>;
  addSession: (session: ChatSessionItem) => void;
  updateSessionTitle: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfileData>) => void;
}

// Scoped in-memory caches to prevent refetching during client-side navigation
let memoryUserId: string | null = null;
let memoryUserProfile: UserProfileData | null = null;
let memorySessions: ChatSessionItem[] | null = null;
let inFlightSessionsPromise: Promise<ChatSessionItem[]> | null = null;
let inFlightUserPromise: Promise<{ userId: string; profile: UserProfileData } | null> | null = null;
let hasFetchedUserFromDb = false;

/**
 * Purges all cached student profile and conversation data.
 * Called immediately upon sign out to prevent cross-user data leakage.
 */
export function clearStudentCache() {
  memoryUserId = null;
  memoryUserProfile = null;
  memorySessions = null;
  inFlightSessionsPromise = null;
  inFlightUserPromise = null;
  hasFetchedUserFromDb = false;

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('sentimate_cached_user');
      sessionStorage.removeItem('sentimate_cached_sessions');
    } catch {
      // Ignore storage errors
    }
  }
}

function getInitialUserProfile(): { profile: UserProfileData; isLoading: boolean } {
  if (memoryUserProfile) {
    return { profile: memoryUserProfile, isLoading: false };
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('sentimate_cached_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.profile && parsed?.userId) {
          memoryUserId = parsed.userId;
          memoryUserProfile = parsed.profile;
          return { profile: parsed.profile, isLoading: false };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return {
    profile: { displayName: 'Student', fullName: 'Student', role: 'Student' },
    isLoading: true,
  };
}

function getInitialSessions(): { sessions: ChatSessionItem[]; isLoading: boolean } {
  if (memorySessions) {
    return { sessions: memorySessions, isLoading: false };
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('sentimate_cached_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          memorySessions = parsed;
          return { sessions: parsed, isLoading: false };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }
  return { sessions: [], isLoading: true };
}

const StudentContext = createContext<StudentContextValue | null>(null);

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const initialUser = getInitialUserProfile();
  const initialSessions = getInitialSessions();

  const [userProfile, setUserProfile] = useState<UserProfileData>(initialUser.profile);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(initialUser.isLoading);

  const [sessions, setSessions] = useState<ChatSessionItem[]>(initialSessions.sessions);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(initialSessions.isLoading);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // ── Fetch and Deduplicate User Profile ────────────────────────────────────────
  const fetchUser = useCallback(async (force = false) => {
    // If cached profile exists, hydrate UI immediately to eliminate skeleton flicker
    if (memoryUserProfile && memoryUserId) {
      setUserProfile(memoryUserProfile);
      setIsLoadingUser(false);
      if (!force && hasFetchedUserFromDb) {
        return;
      }
    }

    if (inFlightUserPromise) {
      const res = await inFlightUserPromise;
      if (res) {
        setUserProfile(res.profile);
      }
      setIsLoadingUser(false);
      return;
    }

    inFlightUserPromise = (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return null;
        }

        // If a different user logged in, clear prior user's cached sessions & profile
        if (memoryUserId && memoryUserId !== user.id) {
          clearStudentCache();
        }

        let fullName: string | undefined = undefined;
        let username: string | undefined = undefined;
        let avatarUrl: string | undefined = undefined;

        try {
          const [profileRes, studentRes] = await Promise.all([
            supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
            supabase.from('student_profiles').select('username').eq('id', user.id).maybeSingle(),
          ]);

          if (profileRes.data?.full_name && profileRes.data.full_name.trim().length > 0) {
            fullName = profileRes.data.full_name.trim();
          }

          if (studentRes.data?.username) {
            username = studentRes.data.username;
          } else if (user.email) {
            username = user.email.split('@')[0];
          }

          if (profileRes.data?.avatar_url) {
            avatarUrl = profileRes.data.avatar_url;
          }
        } catch {
          // Non-critical profile lookup failure
        }

        // Resilient fallback: If direct client query did not find full_name, try the profile API endpoint
        if (!fullName) {
          try {
            const apiRes = await fetch('/api/student/profile');
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData?.fullName && apiData.fullName !== 'Alex Student') {
                fullName = apiData.fullName.trim();
              }
              if (!avatarUrl && apiData?.avatarUrl) {
                avatarUrl = apiData.avatarUrl;
              }
              if (!username && apiData?.username) {
                username = apiData.username;
              }
            }
          } catch {
            // Ignore API fallback error
          }
        }

        if (!avatarUrl) {
          const meta = user.user_metadata || {};
          const identityMeta =
            (user.identities?.[0]?.identity_data as Record<string, string> | undefined) || {};
          avatarUrl =
            meta.avatar_url ||
            meta.picture ||
            meta.photoURL ||
            identityMeta.avatar_url ||
            identityMeta.picture ||
            undefined;
        }

        // Authoritative source: public.profiles.full_name.
        // Fallback to auth metadata only if public.profiles.full_name is not configured.
        const authFallback =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'Student';

        const finalFullName = fullName || authFallback;

        const resolvedProfile: UserProfileData = {
          displayName: finalFullName,
          fullName: finalFullName,
          email: user.email,
          username,
          avatarUrl,
          role: 'Student',
        };

        memoryUserId = user.id;
        memoryUserProfile = resolvedProfile;
        hasFetchedUserFromDb = true;

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(
              'sentimate_cached_user',
              JSON.stringify({ userId: user.id, profile: resolvedProfile })
            );
          } catch {
            // Ignore
          }
        }

        return { userId: user.id, profile: resolvedProfile };
      } catch {
        return null;
      } finally {
        inFlightUserPromise = null;
      }
    })();

    const result = await inFlightUserPromise;
    if (result) {
      setUserProfile(result.profile);
    }
    setIsLoadingUser(false);
  }, []);

  // ── Fetch and Deduplicate Chat Sessions ───────────────────────────────────────
  const refreshSessions = useCallback(async (force = false) => {
    if (!force && memorySessions) {
      setSessions(memorySessions);
      setIsLoadingSessions(false);
      return;
    }

    if (inFlightSessionsPromise) {
      const items = await inFlightSessionsPromise;
      setSessions(items);
      setIsLoadingSessions(false);
      return;
    }

    inFlightSessionsPromise = (async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        if (!res.ok) {
          return memorySessions ?? [];
        }
        const { sessions: dbSessions } = await res.json();
        const items: ChatSessionItem[] = (dbSessions ?? []).map((s: any) => ({
          id: s.id,
          title: s.title,
          createdAt: s.created_at,
          lastActivityAt: s.last_activity_at ?? s.updated_at ?? s.created_at,
        }));

        memorySessions = items;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('sentimate_cached_sessions', JSON.stringify(items));
          } catch {
            // Ignore
          }
        }
        return items;
      } catch {
        return memorySessions ?? [];
      } finally {
        inFlightSessionsPromise = null;
      }
    })();

    const result = await inFlightSessionsPromise;
    setSessions(result);
    setIsLoadingSessions(false);
  }, []);

  // ── Initial load only (never runs on route changes inside the layout) ────────
  useEffect(() => {
    fetchUser();
    refreshSessions();
  }, [fetchUser, refreshSessions]);

  // ── Add Session Immediately (e.g. upon first message) ───────────────────────
  const addSession = useCallback((newSession: ChatSessionItem) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== newSession.id);
      const updated = [newSession, ...filtered];
      memorySessions = updated;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('sentimate_cached_sessions', JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
      return updated;
    });
  }, []);

  // ── Rename Session Immediately ──────────────────────────────────────────────
  const updateSessionTitle = useCallback((id: string, newTitle: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
      memorySessions = updated;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('sentimate_cached_sessions', JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
      return updated;
    });
  }, []);

  // ── Delete Session Immediately with Server Sync ─────────────────────────────
  const deleteSession = useCallback(
    async (id: string) => {
      let previousSessions: ChatSessionItem[] = [];

      setSessions((prev) => {
        previousSessions = prev;
        const updated = prev.filter((s) => s.id !== id);
        memorySessions = updated;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('sentimate_cached_sessions', JSON.stringify(updated));
          } catch {
            // Ignore
          }
        }
        return updated;
      });

      try {
        const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          // Rollback on failure
          setSessions(previousSessions);
          memorySessions = previousSessions;
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || 'Failed to delete conversation on server.');
        }
      } catch (err) {
        setSessions(previousSessions);
        memorySessions = previousSessions;
        throw err;
      }
    },
    []
  );

  // ── Immediate Profile Update (from Profile Save event) ──────────────────────
  const updateUserProfile = useCallback((updates: Partial<UserProfileData>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.fullName && !updates.displayName) {
        updated.displayName = updates.fullName;
      }
      memoryUserProfile = updated;
      if (typeof window !== 'undefined' && memoryUserId) {
        try {
          sessionStorage.setItem(
            'sentimate_cached_user',
            JSON.stringify({ userId: memoryUserId, profile: updated })
          );
        } catch {
          // Ignore
        }
      }
      return updated;
    });
  }, []);

  // Listen to profile update broadcast
  useEffect(() => {
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl?: string; fullName?: string }>;
      if (customEvent.detail) {
        updateUserProfile({
          displayName: customEvent.detail.fullName ?? undefined,
          fullName: customEvent.detail.fullName ?? undefined,
          avatarUrl:
            customEvent.detail.avatarUrl !== undefined
              ? customEvent.detail.avatarUrl
              : undefined,
        });
      }
    };
    window.addEventListener('sentimate:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('sentimate:profile-updated', handleProfileUpdate);
  }, [updateUserProfile]);

  return (
    <StudentContext.Provider
      value={{
        sessions,
        isLoadingSessions,
        userProfile,
        isLoadingUser,
        activeSessionId,
        setActiveSessionId,
        refreshSessions,
        setSessions,
        addSession,
        updateSessionTitle,
        deleteSession,
        updateUserProfile,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent(): StudentContextValue {
  const context = useContext(StudentContext);
  if (!context) {
    // Graceful fallback for components rendered outside the provider
    return {
      sessions: [],
      isLoadingSessions: false,
      userProfile: { displayName: 'Alex', role: 'Student' },
      isLoadingUser: false,
      activeSessionId: null,
      setActiveSessionId: () => {},
      refreshSessions: async () => {},
      setSessions: () => {},
      addSession: () => {},
      updateSessionTitle: () => {},
      deleteSession: async () => {},
      updateUserProfile: () => {},
    };
  }
  return context;
}
