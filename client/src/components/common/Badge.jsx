const styles = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  error: 'bg-red-100 text-red-700',
  default: 'bg-gray-100 text-gray-600',
};

export default function Badge({ label, variant }) {
  const style = styles[variant] ?? styles.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label ?? variant}
    </span>
  );
}
