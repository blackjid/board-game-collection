"use client";

import { useState, useCallback } from "react";

/**
 * A hook that syncs local state with a prop value while still allowing local mutations.
 *
 * This solves a common Next.js pattern where:
 * 1. A server component fetches data and passes it to a client component
 * 2. The client component needs local state for optimistic updates (e.g., deleting an item)
 * 3. After a dialog action, router.refresh() is called to re-fetch server data
 * 4. The local state needs to sync with the new prop value
 *
 * Without this hook, useState(initialValue) only uses the initial value on mount,
 * so router.refresh() doesn't update the UI.
 *
 * Implementation note: Stores the prop value directly as part of the state tuple
 * so we can detect when it changes and return the new value. This follows the
 * React-recommended pattern for adjusting state based on props during render.
 * See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 *
 * @param propValue - The prop value from the parent (server) component
 * @returns [state, setState] - Same API as useState
 *
 * @example
 * ```tsx
 * // Instead of:
 * const [plays, setPlays] = useState(initialPlays);
 *
 * // Use:
 * const [plays, setPlays] = useSyncedState(initialPlays);
 * ```
 */
export function useSyncedState<T>(propValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Store both the current state and the prop value we derived it from
  // This lets us detect when the prop changes and update accordingly
  const [[state, prevProp], setStateAndProp] = useState<[T, T]>([propValue, propValue]);

  // Wrapper setState that only updates the state part, keeping track of current prop
  const setState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setStateAndProp(([currentState, currentProp]) => {
        const newState = typeof action === "function"
          ? (action as (prev: T) => T)(currentState)
          : action;
        return [newState, currentProp];
      });
    },
    []
  );

  // If the prop has changed since we last saw it, return the new prop value
  // and schedule an update to sync the internal state
  if (prevProp !== propValue) {
    // During this render, return the new prop value
    // Also update the internal state for future renders
    setStateAndProp([propValue, propValue]);
    return [propValue, setState];
  }

  return [state, setState];
}

/**
 * A hook that provides both synced state and a refresh callback.
 *
 * Useful when you want to trigger a refresh after a mutation and have
 * the local state automatically update.
 *
 * @param propValue - The prop value from the parent (server) component
 * @param onRefresh - Optional callback when refresh is triggered (e.g., router.refresh())
 * @returns { state, setState, refresh } - State tuple plus a refresh function
 *
 * @example
 * ```tsx
 * const { state: plays, setState: setPlays, refresh } = useSyncedStateWithRefresh(
 *   initialPlays,
 *   () => router.refresh()
 * );
 *
 * // In dialog callback:
 * onPlayLogged: refresh
 * ```
 */
export function useSyncedStateWithRefresh<T>(
  propValue: T,
  onRefresh?: () => void
): {
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
  refresh: () => void;
} {
  const [state, setState] = useSyncedState(propValue);

  const refresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  return { state, setState, refresh };
}
