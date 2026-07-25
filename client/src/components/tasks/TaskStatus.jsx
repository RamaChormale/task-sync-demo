const syncStyles = {
  synced: { dot: 'bg-green-500', text: 'text-green-700', label: 'Synced' },
  pending: { dot: 'bg-yellow-400', text: 'text-yellow-700', label: 'Pending' },
  conflict: { dot: 'bg-orange-400', text: 'text-orange-700', label: 'Conflict' },
  error: { dot: 'bg-red-500', text: 'text-red-700', label: 'Error' },
};

export default function TaskStatus({ syncStatus }) {
  const style = syncStyles[syncStatus] ?? syncStyles.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
