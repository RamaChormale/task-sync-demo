import Button from '../common/Button';

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Displays both conflict versions side-by-side and lets the user pick one.
 * Props:
 *   task       — the task object with syncStatus === "conflict" and conflictVersions
 *   onResolve  — async (id, "local" | "github") => void
 *   loading    — bool
 */
export default function ConflictResolver({ task, onResolve, loading }) {
  if (!task || task.syncStatus !== 'conflict' || !task.conflictVersions) return null;

  const { local, github } = task.conflictVersions;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-orange-700">
        <span className="text-lg">⚠️</span>
        <p className="text-sm font-semibold">Conflict Detected</p>
        <span className="text-xs text-orange-500 ml-auto">Both local and GitHub were modified</span>
      </div>

      {/* Side-by-side versions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Local version */}
        <div className="bg-white rounded-lg border border-orange-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Local Version</p>
          <p className="text-sm font-medium text-gray-800 truncate">{local?.title}</p>
          {local?.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{local.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Status: {local?.status}</span>
            <span className="text-xs text-gray-400">{formatDate(local?.updatedAt)}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center mt-1"
            loading={loading}
            onClick={() => onResolve(task._id, 'local')}
          >
            Keep Local
          </Button>
        </div>

        {/* GitHub version */}
        <div className="bg-white rounded-lg border border-indigo-200 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GitHub Version</p>
          <p className="text-sm font-medium text-gray-800 truncate">{github?.title}</p>
          {github?.description && (
            <p className="text-xs text-gray-500 line-clamp-2">{github.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Status: {github?.status}</span>
            <span className="text-xs text-gray-400">{formatDate(github?.updatedAt)}</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center mt-1"
            loading={loading}
            onClick={() => onResolve(task._id, 'github')}
          >
            Keep GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
