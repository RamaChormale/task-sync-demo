import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import TaskStatus from './TaskStatus';
import Card from '../common/Card';
import ConflictResolver from './ConflictResolver';
import GithubIssueModal from './GithubIssueModal';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function TaskCard({ task, onEdit, onClose, onResolveConflict, resolving }) {
  const [showIssue, setShowIssue] = useState(false);
  const isClosed = task.status === 'closed';

  return (
    <>
      <Card className={`p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${isClosed ? 'opacity-75' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${isClosed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge variant={task.status} label={task.status.replace('_', ' ')} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <span className="font-medium text-gray-600">Sync: </span>
            <TaskStatus syncStatus={task.syncStatus} />
          </div>
          {task.githubIssueNumber && (
            <div>
              <span className="font-medium text-gray-600">Issue: </span>
              <span className="text-indigo-600">#{task.githubIssueNumber}</span>
            </div>
          )}
          <div><span className="font-medium text-gray-600">Synced: </span>{formatDate(task.lastSyncedAt)}</div>
          {isClosed
            ? <div><span className="font-medium text-gray-600">Closed: </span>{formatDate(task.closedAt)}</div>
            : <div><span className="font-medium text-gray-600">Created: </span>{formatDate(task.createdAt)}</div>
          }
        </div>

        {task.syncStatus === 'conflict' && (
          <ConflictResolver task={task} onResolve={onResolveConflict} loading={resolving} />
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          {/* Edit only available on open tasks */}
          {!isClosed && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          )}

          {/* Close Task — only shown on non-closed tasks */}
          {!isClosed && (
            <Button variant="ghost" size="sm" className="text-orange-600 hover:bg-orange-50" onClick={() => onClose(task)}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Close Task
            </Button>
          )}

          {/* Closed label */}
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Closed
            </span>
          )}

          {task.githubIssueNumber && (
            <button
              onClick={() => setShowIssue(true)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View Issue
            </button>
          )}
        </div>
      </Card>

      <GithubIssueModal task={task} isOpen={showIssue} onClose={() => setShowIssue(false)} />
    </>
  );
}
