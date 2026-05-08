interface Props {
  step: number;
  total: number;
  labels: string[];
}

export function ProgressBar({ step, total, labels }: Props) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2">
        {labels.map((label, i) => {
          const idx = i + 1;
          const active = idx <= step;
          const current = idx === step;
          return (
            <div key={label} className="flex-1 flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all
                  ${active ? 'bg-gold text-ink-900' : 'bg-ink-700 text-gray-500'}
                  ${current ? 'ring-2 ring-gold/40 ring-offset-2 ring-offset-ink-900' : ''}`}
              >
                {idx < step ? '✓' : idx}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className={`text-xs font-medium truncate ${active ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </div>
              </div>
              {i < total - 1 && (
                <div className={`flex-1 h-px ${idx < step ? 'bg-gold' : 'bg-ink-500'} mx-1`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
