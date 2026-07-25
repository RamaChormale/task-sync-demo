import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import TaskStatus from './TaskStatus';
import GithubIssueModal from './GithubIssueModal';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function TaskTable({ tasks, onEdit, onDelete, onResolveConflict, resolving }) {
  const [issueTask, setIssueTask] = useState(null);
  const hasConflicts = tasks.some((t) => t.syncStatus === 'conflict');

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Title', 'Status', 'Sync', 'Issue #', 'Last Synced', 'Created', ...(hasConflicts ? ['Conflict'] : []), 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tasks.map((task) => (
              <tr key={task._id} className={`hover:bg-gray-50 transition-colors ${task.syncStatus === 'conflict' ? 'bg-orange-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800 max-w-[200px] truncate">{task.title}</div>
                  {task.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{task.description}</div>}
                </td>
                <td className="px-4 py-3"><Badge variant={task.status} label={task.status.replace('_', ' ')} /></td>
                <td className="px-4 py-3"><TaskStatus syncStatus={task.syncStatus} /></td>
                <td className="px-4 py-3 text-indigo-600 font-medium">
                  {task.githubIssueNumber ? `#${task.githubIssueNumber}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(task.lastSyncedAt)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(task.createdAt)}</td>

                {hasConflicts && (
                  <td className="px-4 py-3">
                    {task.syncStatus === 'conflict' ? (
                      <div className="flex items-center gap-1">
                        <Button variant="secondary" size="sm" loading={resolving} onClick={() => onResolveConflict(task._id, 'local')}>Keep Local</Button>
                        <Button variant="primary" size="sm" loading={resolving} onClick={() => onResolveConflict(task._id, 'github')}>Keep GitHub</Button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => onDelete(task)}>Delete</Button>
                    {task.githubIssueNumber && (
                      <button
                        onClick={() => setIssueTask(task)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        View Issue
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <GithubIssueModal
        task={issueTask}
        isOpen={!!issueTask}
        onClose={() => setIssueTask(null)}
      />
    </>
  );
}
