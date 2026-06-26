

export default function WhereConditionsStep({
  queryConfig,
  joinedData,
  handleAddGroup,
  handleRemoveGroup,
  handleGroupLogicChange,
  handleGroupConjunctionChange,
  handleAddRule,
  handleRemoveRule,
  handleRuleChange
}) {
  const migrateConditions = (conditions) => {
    if (!conditions || !Array.isArray(conditions)) return [];
    if (conditions.length === 0) return [];
    if (conditions[0].rules !== undefined) return conditions;
    return conditions.map((cond, idx) => ({
      id: `migrated-group-${cond.id || idx}`,
      conjunction: cond.conjunction || 'AND',
      logic: 'AND',
      rules: [
        {
          id: cond.id || `migrated-rule-${idx}`,
          column: cond.column || '',
          operator: cond.operator || '=',
          value: cond.value || ''
        }
      ]
    }));
  };

  const groups = migrateConditions(queryConfig.conditions);

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-zinc-400 font-medium text-left leading-relaxed">
        Filter rows using logical groups. Empty query inputs are skipped automatically.
      </p>

      {groups.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-zinc-900 border-dashed bg-zinc-950/20 text-[10px] text-zinc-500 font-medium">
          No filters applied to this query.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, groupIdx) => {
            return (
              <div
                key={group.id}
                className="p-3 border border-zinc-900 bg-[#0c0c0e]/30 hover:border-zinc-800 rounded-xl space-y-3 transition-colors text-left animate-slide-down"
              >
                {/* Group Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900/50 pb-2">
                  <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-zinc-400">
                    {groupIdx > 0 ? (
                      <select
                        value={group.conjunction || 'AND'}
                        onChange={(e) => handleGroupConjunctionChange(group.id, e.target.value)}
                        className="bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-[9px] text-amber-400 font-mono font-bold focus:outline-none"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    ) : (
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">WHERE</span>
                    )}

                    <span className="pl-1">Match</span>
                    <select
                      value={group.logic || 'AND'}
                      onChange={(e) => handleGroupLogicChange(group.id, e.target.value)}
                      className="bg-zinc-950 border border-zinc-850 rounded px-1.5 py-0.5 text-[9px] text-indigo-400 font-mono font-bold focus:outline-none"
                    >
                      <option value="AND">ALL (AND)</option>
                      <option value="OR">ANY (OR)</option>
                    </select>
                    <span>of the rules in this group:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(group.id)}
                    className="text-[9px] font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center space-x-0.5 cursor-pointer"
                    title="Delete group"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Group</span>
                  </button>
                </div>

                {/* Group Rules List */}
                <div className="space-y-3.5">
                  {group.rules.map((rule, ruleIdx) => {
                    const hideValueField = rule.operator === 'IS NULL' || rule.operator === 'IS NOT NULL';
                    const isColNumeric = joinedData.columnTypes[rule.column] === 'numeric';

                    return (
                      <div
                        key={rule.id}
                        className={`p-2.5 rounded-lg border space-y-2 transition-all ${
                          isColNumeric
                            ? 'border-amber-900/20 bg-amber-950/5'
                            : 'border-indigo-900/20 bg-indigo-950/5'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[8px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                              isColNumeric
                                ? 'bg-amber-950/40 border-amber-900/35 text-amber-400'
                                : 'bg-indigo-950/40 border-indigo-900/35 text-indigo-400'
                            }`}
                          >
                            Rule {ruleIdx + 1}
                          </span>

                          {/* Column Select */}
                          <div className="flex-grow min-w-[110px]">
                            <select
                              value={rule.column}
                              onChange={(e) => handleRuleChange(group.id, rule.id, 'column', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700"
                            >
                              {joinedData.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h} ({joinedData.columnTypes[h] || 'string'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Operator Select */}
                          <div className="min-w-[90px]">
                            <select
                              value={rule.operator}
                              onChange={(e) => handleRuleChange(group.id, rule.id, 'operator', e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-zinc-700"
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

                          {/* Delete Rule Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(group.id, rule.id)}
                            className="text-zinc-500 hover:text-zinc-350 p-1 rounded hover:bg-zinc-900 transition-colors cursor-pointer"
                            title="Remove filter rule"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Value Input */}
                        {!hideValueField && (
                          <div className="flex flex-col gap-1 pl-1">
                            <input
                              type="text"
                              value={rule.value}
                              onChange={(e) => handleRuleChange(group.id, rule.id, 'value', e.target.value)}
                              placeholder={
                                rule.operator === 'IN' || rule.operator === 'NOT IN'
                                  ? `Comma separated list (e.g. ${isColNumeric ? '10, 20' : 'London, New York'})`
                                  : rule.operator.includes('LIKE')
                                    ? "Wildcards e.g. %Manager%"
                                    : "Enter target value..."
                              }
                              className="w-full bg-zinc-900 border border-zinc-850 rounded px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-zinc-700 placeholder:text-zinc-650"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Group Footer Actions */}
                <div className="pt-1 flex justify-start">
                  <button
                    type="button"
                    onClick={() => handleAddRule(group.id)}
                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-350 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Rule to Group</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Add Filter Group Button */}
      <button
        type="button"
        onClick={handleAddGroup}
        className="w-full py-2.5 rounded bg-zinc-900/60 hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-200 transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm shadow-zinc-950/20"
      >
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Filter Group</span>
      </button>
    </div>
  );
}
