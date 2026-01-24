import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncedState, useSyncedStateWithRefresh } from "./hooks";

describe("useSyncedState", () => {
  it("should initialize with the prop value", () => {
    const { result } = renderHook(() => useSyncedState("initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("should allow local state updates", () => {
    const { result } = renderHook(() => useSyncedState("initial"));
    
    act(() => {
      result.current[1]("updated");
    });
    
    expect(result.current[0]).toBe("updated");
  });

  it("should sync with prop changes after initial render", () => {
    let propValue = "first";
    const { result, rerender } = renderHook(() => useSyncedState(propValue));
    
    expect(result.current[0]).toBe("first");
    
    // Simulate prop change (e.g., from router.refresh())
    propValue = "second";
    rerender();
    
    expect(result.current[0]).toBe("second");
  });

  it("should preserve local changes until prop changes", () => {
    let propValue = "original";
    const { result, rerender } = renderHook(() => useSyncedState(propValue));
    
    // Make local change
    act(() => {
      result.current[1]("local change");
    });
    expect(result.current[0]).toBe("local change");
    
    // Rerender with same prop - local change preserved
    rerender();
    expect(result.current[0]).toBe("local change");
    
    // Rerender with new prop - syncs to new value
    propValue = "new from server";
    rerender();
    expect(result.current[0]).toBe("new from server");
  });
});

describe("useSyncedStateWithRefresh", () => {
  it("should provide state and setState", () => {
    const { result } = renderHook(() => 
      useSyncedStateWithRefresh("initial")
    );
    
    expect(result.current.state).toBe("initial");
    
    act(() => {
      result.current.setState("updated");
    });
    
    expect(result.current.state).toBe("updated");
  });

  it("should call onRefresh callback when refresh is called", () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(() => 
      useSyncedStateWithRefresh("test", onRefresh)
    );
    
    act(() => {
      result.current.refresh();
    });
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("should sync with prop changes", () => {
    let propValue = "first";
    const { result, rerender } = renderHook(() => 
      useSyncedStateWithRefresh(propValue)
    );
    
    expect(result.current.state).toBe("first");
    
    propValue = "second";
    rerender();
    
    expect(result.current.state).toBe("second");
  });
});
