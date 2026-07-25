import MetricCard from '../common/MetricCard';

const METRICS_CONFIG = [
  {
    key: 'totalTasks',
    label: 'Total Tasks',
    icon: '📋',
    color: { bg: 'bg-gray-100', text: 'text-gray-800' },
  },
  {
    key: 'synced',
    label: 'Synced',
    icon: '✅',
    color: { bg: 'bg-green-50', text: 'text-green-600' },
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: '🔄',
    color: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  },
  {
    key: 'conflict',
    label: 'Conflicts',
    icon: '⚠️',
    color: { bg: 'bg-orange-50', text: 'text-orange-600' },
  },
  {
    key: 'errors',
    label: 'Errors',
    icon: '❌',
    color: { bg: 'bg-red-50', text: 'text-red-600' },
  },
  {
    key: 'duplicateEvents',
    label: 'Duplicates Ignored',
    icon: '🔁',
    color: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  },
];

export default function SyncMetrics({ metrics, loading }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-gray-700 mb-3">Sync Metrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS_CONFIG.map(({ key, label, icon, color }) => (
          <MetricCard
            key={key}
            label={label}
            value={metrics?.[key]}
            icon={icon}
            color={color}
            loading={loading}
          />
        ))}
      </div>
    </section>
  );
}
