export default function MetricCard({ label, value, color, icon, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${color.bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        {loading ? (
          <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <p className={`text-2xl font-bold ${color.text}`}>{value ?? 0}</p>
        )}
      </div>
    </div>
  );
}
