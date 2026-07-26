import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import EmptyState from '../components/common/EmptyState';
import Toast from '../components/common/Toast';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import SyncMetrics from '../components/tasks/SyncMetrics';
import SyncActivity from '../components/tasks/SyncActivity';
import { useSyncActivity } from '../hooks/useSyncActivity';

const VIEWS = { grid: 'grid', table: 'table' };
const FILTERS = [
  { key: 'open',   label: 'Open Tasks' },
  { key: 'closed', label: 'Closed Tasks' },
  { key: 'all',    label: 'All Tasks' },
];

export default function Dashboard() {
  const { toasts, addToast, dismissToast } = useToast();

  const {
    tasks, loading, error, mutating, filter,
    fetchTasks, changeFilter, createTask, updateTask, closeTask, resolveConflict,
  } = useTasks({
    onDuplicate: (msg) => addToast(msg, 'info'),
    onConflict: (task) => addToast(`⚠️ Conflict detected on "${task.title}" — please resolve below`, 'warning'),
  });

  const [view, setView] = useState(VIEWS.grid);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'close'
  const [selected, setSelected] = useState(null);
  const [formError, setFormError] = useState('');
  const [resolving, setResolving] = useState(false);

  const openCreate  = () => { setSelected(null); setFormError(''); setModal('create'); };
  const openEdit    = (task) => { setSelected(task); setFormError(''); setModal('edit'); };
  const openClose   = (task) => { setSelected(task); setModal('close'); };
  const closeModal  = () => { setModal(null); setSelected(null); setFormError(''); };

  const handleCreate = async (data) => {
    const res = await createTask(data);
    if (res.success) closeModal();
    else if (res.error) setFormError(res.error);
  };

  const handleUpdate = async (data) => {
    const res = await updateTask(selected._id, data);
    if (res.success) {
      if (!res.conflict) closeModal();
    } else if (res.versionConflict) {
      setFormError('This task was modified by another request. Please close and refresh.');
    } else if (res.error) {
      setFormError(res.error);
    }
  };

  const handleClose = async () => {
    const res = await closeTask(selected._id);
    closeModal();
    if (res.success) {
      addToast(`✅ "${selected.title}" closed and GitHub issue updated`, 'success');
    } else {
      addToast(`Failed to close task: ${res.error}`, 'error');
    }
  };

  const handleResolveConflict = async (id, resolution) => {
    setResolving(true);
    const res = await resolveConflict(id, resolution);
    setResolving(false);
    if (res.success) {
      addToast(`✅ Conflict resolved — kept ${resolution} version`, 'success');
    } else {
      addToast(`Failed to resolve conflict: ${res.error}`, 'error');
    }
  };

  const { metrics, activities, loading: syncLoading, error: syncError } = useSyncActivity();

  const syncedCount = tasks.filter((t) => t.syncStatus === 'synced').length;
  const overallSync = tasks.length === 0 ? 'idle' : syncedCount === tasks.length ? 'synced' : 'partial';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Task Sync Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              <span className={`w-2 h-2 rounded-full ${overallSync === 'synced' ? 'bg-green-500' : overallSync === 'partial' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {overallSync === 'synced' ? 'All Synced' : overallSync === 'partial' ? `${syncedCount}/${tasks.length} Synced` : 'No Tasks'}
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">U</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SyncMetrics metrics={metrics} loading={syncLoading} />
        <SyncActivity activities={activities} loading={syncLoading} error={syncError} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tasks', value: tasks.length, color: 'text-gray-800' },
            { label: 'Open', value: tasks.filter((t) => t.status === 'open').length, color: 'text-blue-600' },
            { label: 'Completed', value: tasks.filter((t) => t.status === 'completed').length, color: 'text-green-600' },
            { label: 'Closed', value: tasks.filter((t) => t.status === 'closed').length, color: 'text-gray-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[
                { key: VIEWS.grid,  icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                { key: VIEWS.table, icon: 'M3 10h18M3 14h18M3 6h18M3 18h18' },
              ].map(({ key, icon }) => (
                <button key={key} onClick={() => setView(key)} className={`p-2 transition-colors ${view === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                </button>
              ))}
            </div>

            <Button variant="secondary" size="md" onClick={() => fetchTasks()} loading={loading}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>

            <Button variant="primary" size="md" onClick={openCreate}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </Button>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => changeFilter(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => fetchTasks()} className="ml-auto text-red-600 underline font-medium">Retry</button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Loader message="Fetching tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            title={filter === 'closed' ? 'No closed tasks' : filter === 'open' ? 'No open tasks' : 'No tasks yet'}
            description={filter === 'open' ? 'Create your first task to get started.' : 'Nothing to show here.'}
            action={filter !== 'closed' && <Button variant="primary" size="md" onClick={openCreate}>Create First Task</Button>}
          />
        ) : view === VIEWS.grid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={openEdit}
                onClose={openClose}
                onResolveConflict={handleResolveConflict}
                resolving={resolving}
              />
            ))}
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            onEdit={openEdit}
            onClose={openClose}
            onResolveConflict={handleResolveConflict}
            resolving={resolving}
          />
        )}
      </main>

      {/* Create Modal */}
      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Create New Task">
        {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
        <TaskForm onSubmit={handleCreate} onCancel={closeModal} loading={mutating} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit Task">
        {formError && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
        <TaskForm initial={selected} onSubmit={handleUpdate} onCancel={closeModal} loading={mutating} />
      </Modal>

      {/* Close Confirmation Modal */}
      <Modal isOpen={modal === 'close'} onClose={closeModal} title="Close Task">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-orange-700">
              <p className="font-medium">This will close the task and its GitHub issue.</p>
              <p className="mt-0.5 text-orange-600">The task history will be preserved — nothing is deleted.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Close <span className="font-semibold text-gray-800">"{selected?.title}"</span>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" size="md" loading={mutating} onClick={handleClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Close Task
            </Button>
          </div>
        </div>
      </Modal>

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
