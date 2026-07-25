import Modal from '../common/Modal';

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const SYNC_COLOR = {
  synced:   'bg-green-100 text-green-700',
  pending:  'bg-yellow-100 text-yellow-700',
  conflict: 'bg-orange-100 text-orange-700',
  error:    'bg-red-100 text-red-700',
};

const STATUS_COLOR = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-purple-100 text-purple-700',
};

export default function GithubIssueModal({ task, isOpen, onClose }) {
  if (!task) return null;

  const isOpen_ = task.status !== 'completed';
  const githubUrl = `https://github.com/${import.meta.env.VITE_GITHUB_OWNER}/${import.meta.env.VITE_GITHUB_REPO}/issues/${task.githubIssueNumber}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-5 -mt-2">

        {/* ── Title + issue number ── */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 leading-snug">
            {task.title}
            {task.githubIssueNumber && (
              <span className="ml-2 font-normal text-gray-400">#{task.githubIssueNumber}</span>
            )}
          </h2>

          {/* Open / Closed pill + opened date — mirrors GitHub header */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white ${isOpen_ ? 'bg-green-600' : 'bg-purple-600'}`}>
              {isOpen_ ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7 8.94 5.78 7.72a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.75-3.75Z" />
                  <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z" />
                </svg>
              )}
              {isOpen_ ? 'Open' : 'Closed'}
            </span>
            <span className="text-xs text-gray-500">
              opened {fmt(task.createdAt)}
            </span>
            {task.lastSyncedAt && (
              <span className="text-xs text-gray-400">· last synced {fmt(task.lastSyncedAt)}</span>
            )}
          </div>
        </div>

        {/* ── Description bubble — mirrors GitHub comment box ── */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
            T
          </div>

          <div className="flex-1 min-w-0 border border-gray-200 rounded-xl overflow-hidden">
            {/* Bubble header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600">
                Task Sync Engine <span className="font-normal text-gray-400">· {fmt(task.createdAt)}</span>
              </span>
            </div>
            {/* Bubble body */}
            <div className="px-4 py-4 text-sm text-gray-700 whitespace-pre-wrap min-h-[56px]">
              {task.description || <span className="italic text-gray-400">No description provided.</span>}
            </div>
          </div>
        </div>

        {/* ── Sidebar metadata ── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-gray-100 text-xs">
          <div>
            <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Labels</p>
            <span className={`px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Sync Status</p>
            <span className={`px-2.5 py-0.5 rounded-full font-medium ${SYNC_COLOR[task.syncStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {task.syncStatus}
            </span>
          </div>

          {task.githubIssueNumber && (
            <div>
              <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Issue</p>
              <span className="text-indigo-600 font-medium">#{task.githubIssueNumber}</span>
            </div>
          )}

          <div>
            <p className="font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Version</p>
            <span className="text-gray-600 font-medium">v{task.version}</span>
          </div>
        </div>

        {/* ── Open on GitHub button ── */}
        {task.githubIssueNumber && (
          <div className="pt-3 border-t border-gray-100">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Open on GitHub
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
