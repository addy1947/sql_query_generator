

export default function DatasetPreviews({
  files,
  showCsvPreviewId,
  setShowCsvPreviewId
}) {
  return (
    <div className="space-y-2.5 text-left">
      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest text-left block">
        Original Datasets Previews
      </span>
      
      {files.map((f) => {
        const isExpanded = showCsvPreviewId === f.id;
        return (
          <div key={f.id} className="bg-[#0a0a0c] border border-zinc-900 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowCsvPreviewId(isExpanded ? '' : f.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <div>
                  <span className="font-semibold text-xs text-zinc-300 block truncate max-w-xs">{f.name}</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">
                    {f.headers.length} columns &bull; {f.totalRows} rows
                  </span>
                </div>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-zinc-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-900 bg-[#070708] p-3 animate-slide-down">
                <div className="overflow-x-auto rounded border border-blue-900">
                  <table className="min-w-full text-[9px] border-collapse">
                    <thead className="bg-blue-900 text-white uppercase font-mono">
                      <tr>
                        {f.headers.map((h) => {
                          const isNumeric = f.columnTypes[h] === 'numeric';
                          return (
                            <th key={h} className={`px-3 py-2.5 font-semibold border border-blue-800 ${isNumeric ? 'text-right' : 'text-left'}`}>
                              <div className="flex flex-col">
                                <span className="text-white">{h}</span>
                                <span className={`text-[8px] uppercase tracking-wide mt-0.5 font-bold ${isNumeric ? 'text-amber-300' : 'text-indigo-200'}`}>
                                  {f.columnTypes[h] || 'string'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-zinc-950 font-mono">
                      {f.rows.slice(0, 5).map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr key={idx} className={`${isEven ? 'bg-blue-100' : 'bg-blue-50'} hover:bg-blue-200 transition-colors`}>
                            {f.headers.map((h) => {
                              const isNumeric = f.columnTypes[h] === 'numeric';
                              return (
                                <td key={h} className={`px-3 py-2 border border-blue-200 truncate max-w-[150px] ${isNumeric ? 'text-right' : 'text-left'}`} title={row[h]}>
                                  {row[h] === undefined || row[h] === null || row[h] === '' ? (
                                    <span className="text-zinc-500 italic">null</span>
                                  ) : (
                                    row[h]
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
