// useSearch.js - Search API hook
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function useSearch(userId, sessionHistory) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const search = useCallback(async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_BASE}/api/search`, {
        query,
        userId,
        sessionHistory
      });
      setResult(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Search failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, sessionHistory]);

  const sendFeedback = useCallback(async (rating, resultId) => {
    try {
      await axios.post(`${API_BASE}/api/feedback`, { userId, rating, resultId });
    } catch {}
  }, [userId]);

  const checkHealth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/health`);
      return data;
    } catch {
      return null;
    }
  }, []);

  return { search, sendFeedback, checkHealth, loading, result, error };
}
