import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService } from '../services/taskService';

export function useTasks({ onDuplicate, onConflict } = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState(false);
  const [filter, setFilter] = useState('open'); // default: open tasks only

  const inFlight = useRef(new Set());

  const fetchTasks = useCallback(async (f) => {
    try {
      setLoading(true);
      setError(null);
      const res = await taskService.getAll(f ?? filter);
      setTasks(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const changeFilter = useCallback((f) => {
    setFilter(f);
    fetchTasks(f);
  }, [fetchTasks]);

  const createTask = async (data) => {
    if (inFlight.current.has('create')) return { success: false, error: 'Request already in progress' };
    inFlight.current.add('create');
    setMutating(true);
    try {
      const res = await taskService.create(data);
      if (res.message === 'Duplicate webhook ignored') {
        onDuplicate?.('Duplicate webhook ignored');
        return { success: true, duplicate: true };
      }
      setTasks((prev) => [res.data, ...prev]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      inFlight.current.delete('create');
      setMutating(false);
    }
  };

  const updateTask = async (id, data) => {
    const key = `update-${id}`;
    if (inFlight.current.has(key)) return { success: false, error: 'Request already in progress' };
    inFlight.current.add(key);
    setMutating(true);
    try {
      // Always use the latest version from live state — never trust the caller's copy
      const current = tasks.find((t) => t._id === id);
      const { version: _ignored, ...rest } = data; // strip any version the caller passed
      const payload = { ...rest, version: current?.version };
      const res = await taskService.update(id, payload);

      if (res.conflict) {
        setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
        onConflict?.(res.data);
        return { success: true, conflict: true, data: res.data };
      }

      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      return { success: true };
    } catch (err) {
      if (err.message?.includes('Version conflict') || err.status === 409) {
        return { success: false, versionConflict: true, error: err.message };
      }
      return { success: false, error: err.message };
    } finally {
      inFlight.current.delete(key);
      setMutating(false);
    }
  };

  // Closes the task — sets status=closed, closes GitHub issue, keeps DB record
  const closeTask = async (id) => {
    const key = `close-${id}`;
    if (inFlight.current.has(key)) return { success: false, error: 'Request already in progress' };
    inFlight.current.add(key);
    setMutating(true);
    try {
      const res = await taskService.close(id);
      // Remove from list when viewing open tasks; update in place for all/closed views
      if (filter === 'open') {
        setTasks((prev) => prev.filter((t) => t._id !== id));
      } else {
        setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      }
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      inFlight.current.delete(key);
      setMutating(false);
    }
  };

  const resolveConflict = async (id, resolution) => {
    const key = `resolve-${id}`;
    if (inFlight.current.has(key)) return { success: false, error: 'Request already in progress' };
    inFlight.current.add(key);
    setMutating(true);
    try {
      const res = await taskService.resolveConflict(id, resolution);
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      inFlight.current.delete(key);
      setMutating(false);
    }
  };

  return { tasks, loading, error, mutating, filter, fetchTasks, changeFilter, createTask, updateTask, closeTask, resolveConflict };
}
