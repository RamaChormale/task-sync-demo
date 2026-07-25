import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mutating, setMutating] = useState(false);

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
    setMutating(true);
    try {
      const res = await taskService.create(data);
      setTasks((prev) => [res.data, ...prev]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setMutating(false);
    }
  };

  const updateTask = async (id, data) => {
    setMutating(true);
    try {
      const res = await taskService.update(id, data);
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setMutating(false);
    }
  };

  const deleteTask = async (id) => {
    setMutating(true);
    try {
      await taskService.remove(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setMutating(false);
    }
  };

  return { tasks, loading, error, mutating, fetchTasks, createTask, updateTask, deleteTask };
}
