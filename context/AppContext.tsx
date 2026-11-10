"use client";

// context/AppContext.tsx
// Global state for user, plants, and initial app loading.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { auth, user as userApi, plants as plantsApi, getToken, clearTokens } from "@/lib/api";
import type { AuthUser, Plant } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  // Plants
  plants: Plant[];
  plantsLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshPlants: () => Promise<void>;
  setCurrentUser: (u: AuthUser | null) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function useCurrentUser() {
  const { currentUser, isAuthenticated, isInitializing } = useApp();
  return { currentUser, isAuthenticated, isInitializing };
}

export function usePlants() {
  const { plants, plantsLoading, refreshPlants } = useApp();
  return { plants, plantsLoading, refreshPlants };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(false);
  const initRan = useRef(false);

  // ── Helper fetch function ───────────────────────────────────────────────────
  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include",   // Crucial for httpOnly refreshToken cookie
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${res.status}`);
    }

    return res.json();
  }, []);

  // ── Fetch plants ────────────────────────────────────────────────────────────
  const refreshPlants = useCallback(async () => {
    setPlantsLoading(true);
    try {
      const res = await plantsApi.list(); // assuming this uses the api client
      setPlants(res.plants || []);
    } catch (err) {
      console.error("Failed to fetch plants", err);
      setPlants([]);
    } finally {
      setPlantsLoading(false);
    }
  }, []);

  // ── Fetch user profile ──────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await userApi.getProfile();
      setCurrentUser(res.user);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // ── Initialize on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    async function init() {
      const token = getToken();
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const [profileRes, plantsRes] = await Promise.allSettled([
          userApi.getProfile(),
          plantsApi.list(),
        ]);

        if (profileRes.status === "fulfilled") {
          setCurrentUser(profileRes.value.user);
        } else {
          clearTokens();
        }

        if (plantsRes.status === "fulfilled") {
          setPlants(plantsRes.value.plants || []);
        }
      } catch (err) {
        console.error("Init failed", err);
        clearTokens();
      } finally {
        setIsInitializing(false);
      }
    }

    init();
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const result = await auth.login(email, password); // this now calls correct URL
    setCurrentUser(result.user);
    await refreshPlants(); // preload plants
  }, [refreshPlants]);

  // ── Google login ────────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await auth.googleSignIn(idToken);
    setCurrentUser(result.user);
    await refreshPlants();
  }, [refreshPlants]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch (err) {
      console.error("Logout error", err);
    }
    setCurrentUser(null);
    setPlants([]);
    clearTokens();
    window.location.href = "/login";
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  const value: AppState = {
    currentUser,
    isAuthenticated: !!currentUser,
    isInitializing,
    plants,
    plantsLoading,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
    refreshPlants,
    setCurrentUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}