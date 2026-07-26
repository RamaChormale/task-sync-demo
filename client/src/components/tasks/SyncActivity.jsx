const TYPE_CONFIG = {
  synced: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Synced',
    dot:    'bg-green-500',
    icon_bg:'bg-green-100 text-green-600',
    border: 'border-l-green-400',
    badge:  'bg-green-100 text-green-700',
    title:  'text-gray-800',
  },
  duplicate: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Duplicate',
    dot:    'bg-indigo-400',
    icon_bg:'bg-indigo-100 text-indigo-600',
    border: 'border-l-indigo-400',
    badge:  'bg-indigo-100 text-indigo-700',
    title:  'text-gray-800',
  },
  conflict: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    label: 'Conflict',
    dot:    'bg-orange-400',
    icon_bg:'bg-orange-100 text-orange-600',
    border: 'border-l-orange-400',
    badge:  'bg-orange-100 text-orange-700',
    title:  'text-gray-800',
  },
  error: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Error',
    dot:    'bg-red-500',
    icon_bg:'bg-red-100 text-red-600',
    border: 'border-l-red-400',
    badge:  'bg-red-100 text-red-700',
    title:  'text-gray-800',
  },
  retry: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    label: 'Retry',
    dot:    'bg-blue-400',
    icon_bg:'bg-blue-100 text-blue-600',
    border: 'border-l-blue-400',
    badge:  'bg-blue-100 text-blue-700',
    title:  'text-gray-800',
  },
  rate_limited: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Rate Limited',
    dot:    'bg-yellow-400',
    icon_bg:'bg-yellow-100 text-yellow-600',
    border: 'border-l-yellow-400',
    badge:  'bg-yellow-100 text-yellow-700',
    title:  'text-gray-800',
  },
};

// Relative time: "2 min ago", "just now", etc.
const relativeTime = (d) => {
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 10)  return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fullTime = (d) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

// Skeleton row
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/5" />
        <div className="h-2.5 bg-gray-100 rounded w-2/5" />
      </div>
      <div className="h-5 w-16 bg-gray-100 rounded-full" />
    </div>
  );
}

export default function SyncActivity({ activities, loading, error }) {
  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Recent Sync Activity</h2>
          {/* Live pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 10s</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">No sync activity yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Events will appear here once tasks start syncing</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
            {activities.map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.error;
              const isFirst = idx === 0;
              return (
                <li
                  key={item._id}
                  className={`flex items-center gap-4 px-5 py-3.5 border-l-4 ${cfg.border} hover:bg-gray-50 transition-colors`}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.icon_bg}`}>
                    {cfg.icon}
                  </div>

                  {/* Message + time */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${cfg.title}`}>
                      {item.message}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{relativeTime(item.createdAt)}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{fullTime(item.createdAt)}</span>
                      {isFirst && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          latest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer */}
        {!loading && !error && activities.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Showing latest {activities.length} events</span>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const count = activities.filter((a) => a.type === type).length;
                if (!count) return null;
                return (
                  <span key={type} className={`inline-flex items-center gap-1 font-medium ${cfg.badge} px-2 py-0.5 rounded-full`}>
                    {cfg.label} · {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
