

export default function SelectColumnsStep({
  searchColumnQuery,
  setSearchColumnQuery,
  handleSelectAllColumns,
  handleDeselectAllColumns,
  filteredHeaders,
  queryConfig,
  joinedData,
  handleToggleColumn,
  handleUpdateColumnAggregate,
  handleUpdateColumnAlias,
  isAdvancedMode
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-300 text-left">
        Select fields to include. If no fields are checked, all columns are retrieved (<code>SELECT *</code>).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Filter columns..."
          value={searchColumnQuery}
          onChange={(e) => setSearchColumnQuery(e.target.value)}
          className="flex-grow bg-zinc-900/60 border border-zinc-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 placeholder:text-zinc-500"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSelectAllColumns}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-[10px] font-semibold text-zinc-100 transition-all cursor-pointer shadow-sm"
          >
            All
          </button>
          <button
            onClick={handleDeselectAllColumns}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-[10px] font-semibold text-zinc-100 transition-all cursor-pointer shadow-sm"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-zinc-900 p-2.5 rounded bg-[#070708]">
        {filteredHeaders.length === 0 ? (
          <div className="col-span-full py-4 text-center text-[10px] text-zinc-400">
            No columns found
          </div>
        ) : (
          filteredHeaders.map((col) => {
            const isSelected = queryConfig.selectColumns.includes(col);
            const type = joinedData.columnTypes[col] || 'string';
            const isNumeric = type === 'numeric';
            return (
              <div
                key={col}
                className={`p-2.5 rounded-lg border text-[10px] select-none transition-all flex flex-col space-y-2 ${
                  isNumeric
                    ? isSelected
                      ? 'border-amber-500/35 bg-amber-950/20 text-amber-200 ring-1 ring-amber-500/25'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-amber-700/50 hover:bg-amber-950/30'
                    : isSelected
                      ? 'border-indigo-500/35 bg-indigo-950/20 text-indigo-200 ring-1 ring-indigo-500/25'
                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-indigo-700/50 hover:bg-indigo-950/30'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleColumn(col)}
                    className={`rounded border-zinc-800 bg-zinc-900 focus:ring-opacity-20 w-3.5 h-3.5 mt-0.5 cursor-pointer ${
                      isNumeric 
                        ? 'text-amber-500 focus:ring-amber-500/20 accent-amber-600' 
                        : 'text-indigo-500 focus:ring-indigo-500/20 accent-indigo-600'
                    }`}
                  />
                  <div className="truncate flex-grow text-left cursor-pointer" onClick={() => handleToggleColumn(col)}>
                    <span className="block font-semibold truncate text-zinc-250" title={col}>{col}</span>
                    <span className={`text-[8px] font-mono uppercase font-bold px-1 py-0.2 rounded border ${
                      isNumeric 
                        ? 'bg-amber-950/40 border-amber-900/35 text-amber-400' 
                        : 'bg-indigo-950/40 border-indigo-900/35 text-indigo-400'
                    }`}>
                      {type}
                    </span>
                  </div>
                </div>

                {isAdvancedMode && isSelected && (
                  <div className="pt-2 border-t border-zinc-900/60 space-y-1.5 text-left animate-slide-down">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-zinc-400 uppercase tracking-wider block font-semibold">Function</span>
                      <select
                        value={queryConfig.columnAggregates[col] || 'None'}
                        onChange={(e) => handleUpdateColumnAggregate(col, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-[9px] text-zinc-200 focus:outline-none"
                      >
                        <option value="None">None</option>
                        <option value="COUNT">COUNT</option>
                        {isNumeric && <option value="SUM">SUM</option>}
                        {isNumeric && <option value="AVG">AVG</option>}
                        <option value="MIN">MIN</option>
                        <option value="MAX">MAX</option>
                      </select>
                    </div>
                    
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-zinc-400 uppercase tracking-wider block font-semibold">Alias (AS)</span>
                      <input
                        type="text"
                        value={queryConfig.columnAliases[col] || ''}
                        onChange={(e) => handleUpdateColumnAlias(col, e.target.value)}
                        placeholder="e.g. total_val"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[9px] text-zinc-200 focus:outline-none placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
