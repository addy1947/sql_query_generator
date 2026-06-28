export default function ResultsTable({
  queryResults,
  queryConfig,
  setQueryConfig,
  joinedData,
  showGroupByWarning,
  nonGroupedColumns,
  isAdvancedMode
}) {
  const handleExportCSV = () => {
    if (queryResults.length === 0) return;

    const headers = Object.keys(queryResults[0]);
    const csvLines = [];
    csvLines.push(headers.join(','));

    queryResults.forEach((row) => {
      const line = headers.map((h) => {
        const val = row[h];
        if (val === undefined || val === null) return '';
        const valStr = val.toString();
        if (valStr.includes(',') || valStr.includes('"') || valStr.includes('\n')) {
          return `"${valStr.replace(/"/g, '""')}"`;
        }
        return valStr;
      });
      csvLines.push(line.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'query_results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (queryResults.length === 0) return;

    const jsonContent = JSON.stringify(queryResults, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'query_results.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-brand-border bg-brand-primary/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-xs text-brand-text-dark">Query Execution results</span>
        </div>
        
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-brand-primary border border-brand-border text-brand-text-muted font-semibold">
            {queryResults.length} records
          </span>
 
          {queryResults.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleExportCSV}
                className="px-2 py-1.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[9px] font-bold text-brand-text-dark transition-all cursor-pointer shadow-sm flex items-center space-x-1"
                title="Export results as CSV"
              >
                <svg className="w-3 h-3 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export CSV</span>
              </button>
 
              <button
                onClick={handleExportJSON}
                className="px-2 py-1.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[9px] font-bold text-brand-text-dark transition-all cursor-pointer shadow-sm flex items-center space-x-1"
                title="Export results as JSON"
              >
                <svg className="w-3 h-3 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>
 
      {/* Post-Processing Toolbar (GROUP BY, ORDER BY, LIMIT, OFFSET) */}
      <div className="p-3 bg-brand-primary/20 border-b border-brand-border flex flex-wrap items-center gap-3 text-[10px] text-brand-text-muted">
        {/* Group By selector */}
        {isAdvancedMode && (
          <div className="flex items-center space-x-1.5 flex-1 min-w-[125px]">
            <span className="font-mono text-brand-text-dark flex-shrink-0">GROUP BY</span>
            <select
              value={queryConfig.groupBy}
              onChange={(e) => setQueryConfig(prev => ({ ...prev, groupBy: e.target.value }))}
              className="flex-grow bg-white border border-brand-border rounded px-2.5 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 cursor-pointer min-w-0"
            >
              <option value="">-- None --</option>
              {(queryConfig.selectColumns.length === 0 ? joinedData.headers : queryConfig.selectColumns).map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}
 
        {/* Order By selector */}
        <div className="flex items-center space-x-1.5 flex-1 min-w-[170px]">
          <span className="font-mono text-brand-text-dark flex-shrink-0">ORDER BY</span>
          <select
            value={queryConfig.orderBy.column}
            onChange={(e) => setQueryConfig(prev => ({
              ...prev,
              orderBy: { ...prev.orderBy, column: e.target.value }
            }))}
            className="flex-grow bg-white border border-brand-border rounded px-2.5 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 cursor-pointer min-w-0"
          >
            <option value="">-- None --</option>
            {joinedData.headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          {queryConfig.orderBy.column && (
            <button
              type="button"
              onClick={() => setQueryConfig(prev => ({
                ...prev,
                orderBy: { ...prev.orderBy, direction: prev.orderBy.direction === 'ASC' ? 'DESC' : 'ASC' }
              }))}
              className="flex-shrink-0 px-2 py-1 rounded bg-white hover:bg-brand-primary border border-brand-border text-[9px] text-brand-text-dark transition-all cursor-pointer font-bold shadow-sm"
              title={queryConfig.orderBy.direction === 'ASC' ? 'Ascending' : 'Descending'}
            >
              {queryConfig.orderBy.direction}
            </button>
          )}
        </div>
 
        {/* Limit input */}
        <div className="flex items-center space-x-1.5 min-w-[80px]">
          <span className="font-mono text-brand-text-dark flex-shrink-0">LIMIT</span>
          <input
            type="number"
            min="0"
            placeholder="Rows"
            value={queryConfig.limit}
            onChange={(e) => setQueryConfig(prev => ({ ...prev, limit: e.target.value }))}
            className="w-14 bg-white border border-brand-border rounded px-1.5 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50"
          />
        </div>
 
        {/* Offset input */}
        {queryConfig.limit !== undefined && queryConfig.limit !== null && queryConfig.limit !== '' && (
          <div className="flex items-center space-x-1.5 min-w-[90px] animate-fade-in">
            <span className="font-mono text-brand-text-dark flex-shrink-0">OFFSET</span>
            <input
              type="number"
              min="0"
              placeholder="Rows"
              value={queryConfig.offset || ''}
              onChange={(e) => setQueryConfig(prev => ({ ...prev, offset: e.target.value }))}
              className="w-14 bg-white border border-brand-border rounded px-1.5 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50"
            />
          </div>
        )}
      </div>
 
      <div className="p-4 bg-white text-left">
        {showGroupByWarning && (
          <div className="mb-3.5 p-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent-light/35 text-brand-text-dark text-[10px] flex items-start space-x-2 text-left animate-fade-in">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block text-brand-text-dark">Non-aggregated selection warning:</span>
              <p className="leading-relaxed mt-0.5 text-brand-text-muted">
                Columns (<code>{nonGroupedColumns.join(', ')}</code>) will reflect their values from the first row of each group.
              </p>
            </div>
          </div>
        )}
 
        {queryResults.length === 0 ? (
          <div className="py-10 text-center text-[10px] text-brand-text-muted font-mono bg-brand-primary/10 rounded-xl border border-dashed border-brand-border">
            Empty set returned (no records matched)
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-border max-h-[300px] shadow-sm">
            <table className="min-w-full text-[10px] border-collapse bg-white">
              <thead className="bg-brand-dark text-white uppercase font-mono sticky top-0 z-10">
                <tr>
                  {(queryConfig.selectColumns.length === 0 ? joinedData.headers : queryConfig.selectColumns).map((col) => {
                    const isNumeric = joinedData.columnTypes[col] === 'numeric';
                    return (
                      <th key={col} className={`px-4 py-2.5 border border-brand-border/30 ${isNumeric ? 'text-right' : 'text-left'}`}>
                        <div className="flex flex-col">
                          <span className="text-white">{col}</span>
                          <span className={`text-[8px] uppercase tracking-wide mt-0.5 font-bold ${isNumeric ? 'text-brand-accent' : 'text-zinc-400'}`}>
                            {joinedData.columnTypes[col] || 'string'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-brand-text-dark font-mono bg-white">
                {queryResults.map((row, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={idx} className={`${isEven ? 'bg-white' : 'bg-brand-primary/30'} hover:bg-brand-accent-light/35 transition-colors`}>
                      {(queryConfig.selectColumns.length === 0 ? joinedData.headers : queryConfig.selectColumns).map((col) => {
                        const isNumeric = joinedData.columnTypes[col] === 'numeric';
                        return (
                          <td key={col} className={`px-4 py-2 border border-brand-border/40 truncate max-w-[180px] ${isNumeric ? 'text-right' : 'text-left'}`} title={row[col]}>
                            {row[col] === undefined || row[col] === null || row[col] === '' ? (
                              <span className="text-brand-text-muted italic">null</span>
                            ) : (
                              row[col]
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
        )}
      </div>
    </div>
  );
}
