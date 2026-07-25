import Card from '../common/Card';

const TYPE_CONFIG = {
  synced:    { icon: '✅', label: 'Task synced to GitHub',      color: 'text-green-600',  bg: 'bg-green-50'  },
  duplicate: { icon: '🔁', label: 'Duplicate webhook ignored',  color: 'text-indigo-600', bg: 'bg-indigo-50' },
  conflict:  { icon: '⚠️', label: 'Conflict detected',          color: 'text-orange-600', bg: 'bg-orange-50' },
  error:     { icon: '❌', label: 'Sync failed',                color: 'text-red-600',    bg: 'bg-red-50'    },
  retry:     { icon: '🔄', label: 'Retry successful',           color: 'text-blue-600',   bg: 'bg-blue-50'   },
};

const formatTime = (d) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export default function SyncActivity({ activities, loading, error }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Recent Sync Activity</h2>
      <Card>
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-500 text-center">{error}</p>
        ) : activities.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">🔄</p>
            <p className="text-sm text-gray-500">No sync activity yet.</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here once webhooks are received.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activities.map((item) => {
              const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.error;
              return (
                <li key={item._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${cfg.bg}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${cfg.color}`}>{item.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatTime(item.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                    {item.type}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
