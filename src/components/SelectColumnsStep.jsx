

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
      <p className="text-[11px] text-brand-text-muted text-left">
        Select fields to include. If no fields are checked, all columns are retrieved (<code>SELECT *</code>).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Filter columns..."
          value={searchColumnQuery}
          onChange={(e) => setSearchColumnQuery(e.target.value)}
          className="flex-grow bg-white border border-brand-border rounded px-3 py-1.5 text-xs text-brand-text-dark focus:outline-none focus:border-brand-accent/50 placeholder:text-brand-text-muted"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSelectAllColumns}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[10px] font-semibold text-brand-text-dark transition-all cursor-pointer shadow-sm"
          >
            All
          </button>
          <button
            onClick={handleDeselectAllColumns}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[10px] font-semibold text-brand-text-dark transition-all cursor-pointer shadow-sm"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-brand-border p-2.5 rounded-xl bg-brand-primary/40">
        {filteredHeaders.length === 0 ? (
          <div className="col-span-full py-4 text-center text-[10px] text-brand-text-muted">
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
                  isSelected
                    ? 'border-brand-accent/45 bg-brand-accent-light/45 text-brand-text-dark ring-1 ring-brand-accent/15 shadow-sm'
                    : 'border-brand-border bg-white text-brand-text-dark hover:border-brand-accent/35 hover:bg-brand-accent-light/15'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleColumn(col)}
                    className="rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent/20 w-3.5 h-3.5 mt-0.5 cursor-pointer accent-brand-accent"
                  />
                  <div className="truncate flex-grow text-left cursor-pointer" onClick={() => handleToggleColumn(col)}>
                    <span className="block font-semibold truncate text-brand-text-dark" title={col}>{col}</span>
                    <span className={`text-[8px] font-mono uppercase font-bold px-1 py-0.2 rounded border ${
                      isNumeric 
                        ? 'bg-brand-accent-light border-brand-accent/25 text-brand-accent' 
                        : 'bg-stone-100 border-stone-200 text-brand-text-muted'
                    }`}>
                      {type}
                    </span>
                  </div>
                </div>

                {isAdvancedMode && isSelected && (
                  <div className="pt-2 border-t border-brand-border/60 space-y-1.5 text-left animate-slide-down">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-brand-text-muted uppercase tracking-wider block font-semibold">Function</span>
                      <select
                        value={queryConfig.columnAggregates[col] || 'None'}
                        onChange={(e) => handleUpdateColumnAggregate(col, e.target.value)}
                        className="w-full bg-white border border-brand-border rounded px-1.5 py-0.5 text-[9px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 cursor-pointer"
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
                      <span className="text-[8px] text-brand-text-muted uppercase tracking-wider block font-semibold">Alias (AS)</span>
                      <input
                        type="text"
                        value={queryConfig.columnAliases[col] || ''}
                        onChange={(e) => handleUpdateColumnAlias(col, e.target.value)}
                        placeholder="e.g. total_val"
                        className="w-full bg-white border border-brand-border rounded px-1.5 py-0.5 text-[9px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 placeholder:text-brand-text-muted/65"
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
