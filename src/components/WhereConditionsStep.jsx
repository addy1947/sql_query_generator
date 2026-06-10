

export default function WhereConditionsStep({
  queryConfig,
  joinedData,
  handleConditionChange,
  handleRemoveCondition,
  handleAddCondition
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-300 font-mono text-left">
        Filter values sequentially. Blank values will be skipped.
      </p>
      
      <div className="space-y-2.5">
        {queryConfig.conditions.map((cond, idx) => {
          const showConjunction = idx > 0;
          const hideValueField = cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL';
          const isColNumeric = joinedData.columnTypes[cond.column] === 'numeric';

          return (
            <div key={cond.id} className={`p-3 rounded-lg border space-y-2 transition-all ${
              isColNumeric 
                ? 'border-amber-900/30 bg-amber-950/15' 
                : 'border-indigo-900/30 bg-indigo-950/15'
            }`}>
              <div className="flex flex-wrap items-center gap-2">
                {showConjunction ? (
                  <select
                    value={cond.conjunction || 'AND'}
                    onChange={(e) => handleConditionChange(cond.id, 'conjunction', e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-300 font-semibold focus:outline-none"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                ) : (
                  <span className={`text-[9px] uppercase font-mono font-bold tracking-wider text-left block px-1.5 py-0.5 rounded border ${
                    isColNumeric
                      ? 'bg-amber-950/40 border-amber-900/35 text-amber-400'
                      : 'bg-indigo-950/40 border-indigo-900/35 text-indigo-400'
                  }`}>
                    Filter {idx + 1}
                  </span>
                )}

                <div className="flex-grow min-w-[110px]">
                  <select
                    value={cond.column}
                    onChange={(e) => handleConditionChange(cond.id, 'column', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    {joinedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h} ({joinedData.columnTypes[h] || 'string'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-[90px]">
                  <select
                    value={cond.operator}
                    onChange={(e) => handleConditionChange(cond.id, 'operator', e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="LIKE">LIKE</option>
                    <option value="NOT LIKE">NOT LIKE</option>
                    <option value="IN">IN</option>
                    <option value="NOT IN">NOT IN</option>
                    <option value="IS NULL">IS NULL</option>
                    <option value="IS NOT NULL">IS NOT NULL</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRemoveCondition(cond.id)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                  title="Remove row"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {!hideValueField && (
                <div className="flex flex-col gap-1 pl-1">
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => handleConditionChange(cond.id, 'value', e.target.value)}
                    placeholder={
                      cond.operator === 'IN' || cond.operator === 'NOT IN'
                        ? `Comma separated list (e.g. ${isColNumeric ? '10, 20' : 'London, New York'})`
                        : cond.operator.includes('LIKE')
                          ? "Wildcards e.g. %Manager%"
                          : "Enter target value..."
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-zinc-700 placeholder:text-zinc-500"
                  />
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={handleAddCondition}
          className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-[10px] font-semibold text-zinc-100 transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Condition Row</span>
        </button>
      </div>
    </div>
  );
}
