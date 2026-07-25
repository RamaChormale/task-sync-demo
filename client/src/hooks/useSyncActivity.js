import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export function useSyncActivity() {
  const [metrics, setMetrics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetch = useCallback(async () => {
    try {
      setError(null);
      const { data } = await axios.get('/api/sync/activity');
      setMetrics(data.metrics);
      setActivities(data.activities);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    // Auto-refresh every 10 seconds
    intervalRef.current = setInterval(fetch, 10_000);
    return () => clearInterval(intervalRef.current);
  }, [fetch]);

  return { metrics, activities, loading, error, refresh: fetch };
}
