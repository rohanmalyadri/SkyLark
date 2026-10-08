"use client";

import { useEffect, useState } from "react";

export interface GeoOption {
  code: string;
  name: string;
}

type State = { data: GeoOption[] | null; loading: boolean; error: boolean };

// Reference data never changes during a session: share one request per URL across components.
const cache = new Map<string, Promise<GeoOption[]>>();

function load(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<GeoOption[]>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

function useGeo(url: string | null): State & { retry: () => void } {
  const [state, setState] = useState<State>({ data: null, loading: !!url, error: false });
  const [attempt, setAttempt] = useState(0);
  const [key, setKey] = useState(url);
  if (key !== url) {
    setKey(url);
    setState({ data: null, loading: !!url, error: false });
  }

  useEffect(() => {
    if (!url) return;
    let alive = true;
    load(url)
      .then((data) => alive && setState({ data, loading: false, error: false }))
      .catch(() => alive && setState({ data: null, loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, [url, attempt]);

  return { ...state, retry: () => (setState((s) => ({ ...s, loading: true, error: false })), setAttempt((a) => a + 1)) };
}

export const useCountries = () => useGeo("/api/geo/countries");
export const useRegions = (country: string) => useGeo(country ? `/api/geo/countries/${encodeURIComponent(country)}/regions` : null);
