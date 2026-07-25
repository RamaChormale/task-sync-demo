import { useState, useEffect, useCallback, useRef } from 'react';
import { taskService } from '../services/taskService';

export function useTasks({ onDuplicate, onConflict } = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState(false);

  // Tracks in-flight mutation keys to prevent duplicate requests
  const inFlight = useRef(new Set());

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await taskService.getAll();
      setTasks(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

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
      // Find the current task to send its version for optimistic locking
      const current = tasks.find((t) => t._id === id);
      const payload = { ...data, version: current?.version };

      const res = await taskService.update(id, payload);

      // Server detected a conflict — both local and GitHub were modified
      if (res.conflict) {
        setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
        onConflict?.(res.data);
        return { success: true, conflict: true, data: res.data };
      }

      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      return { success: true };
    } catch (err) {
      // HTTP 409 = version mismatch (optimistic lock failure)
      if (err.message?.includes('Version conflict') || err.status === 409) {
        return { success: false, versionConflict: true, error: err.message };
      }
      return { success: false, error: err.message };
    } finally {
      inFlight.current.delete(key);
      setMutating(false);
    }
  };

  const deleteTask = async (id) => {
    const key = `delete-${id}`;
    if (inFlight.current.has(key)) return { success: false, error: 'Request already in progress' };
    inFlight.current.add(key);
    setMutating(true);
    try {
      await taskService.remove(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return { success: true };
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

  return { tasks, loading, error, mutating, fetchTasks, createTask, updateTask, deleteTask, resolveConflict };
}
