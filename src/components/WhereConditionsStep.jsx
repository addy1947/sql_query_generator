export default function WhereConditionsStep({
  queryConfig,
  joinedData,
  handleAddGroup,
  handleRemoveGroup,
  handleGroupLogicChange,
  handleGroupConjunctionChange,
  handleAddRule,
  handleRemoveRule,
  handleRuleChange,
  isAdvancedMode = false
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
      <p className="text-[11px] text-brand-text-muted font-medium text-left leading-relaxed">
        Filter rows using logical rules. Connect each filter with a custom AND or OR operator. Empty query inputs are skipped automatically.
      </p>

      {groups.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-brand-border border-dashed bg-brand-primary/50 text-[10px] text-brand-text-muted font-medium">
          No filters applied to this query.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, idx) => {
            const rule = group.rules[0] || { id: '', column: '', operator: '=', value: '' };
            const hideValueField = rule.operator === 'IS NULL' || rule.operator === 'IS NOT NULL';

            return (
              <div key={group.id} className="space-y-3">
                {/* Connection Operator (AND / OR) between filter cards */}
                {idx > 0 && (
                  <div className="flex items-center justify-center space-x-2 py-1 animate-fade-in">
                    <div className="h-[1px] bg-brand-border flex-grow max-w-[60px]"></div>
                    <select
                      value={group.conjunction || 'AND'}
                      onChange={(e) => handleGroupConjunctionChange(group.id, e.target.value)}
                      className="bg-brand-accent-light border border-brand-accent/20 rounded-lg px-2 py-0.5 text-[9px] text-brand-accent font-mono font-bold focus:outline-none cursor-pointer hover:border-brand-accent/40 transition-colors"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                    <div className="h-[1px] bg-brand-border flex-grow max-w-[60px]"></div>
                  </div>
                )}

                {/* Filter Card */}
                <div
                  className="p-3 border border-brand-border bg-brand-card hover:border-brand-accent/35 rounded-xl space-y-3 transition-colors text-left animate-slide-down shadow-sm hover:bg-brand-accent-light/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[8px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border border-brand-accent/20 bg-brand-accent-light text-brand-accent flex-shrink-0"
                    >
                      Filter {idx + 1}
                    </span>

                    {/* Column Select */}
                    <div className="flex-grow min-w-[110px]">
                      <select
                        value={rule.column}
                        onChange={(e) => handleRuleChange(group.id, rule.id, 'column', e.target.value)}
                        className="w-full bg-white border border-brand-border rounded px-2 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 cursor-pointer"
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
                        className="w-full bg-white border border-brand-border rounded px-2 py-1 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 cursor-pointer"
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

                    {/* Delete Filter Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group.id)}
                      className="text-brand-text-muted hover:text-brand-text-dark p-1.5 rounded hover:bg-brand-primary transition-colors cursor-pointer ml-auto"
                      title="Remove filter"
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
                        value={rule.value || ''}
                        onChange={(e) => handleRuleChange(group.id, rule.id, 'value', e.target.value)}
                        placeholder={
                          rule.operator === 'IN' || rule.operator === 'NOT IN'
                            ? `Comma separated list (e.g. ${joinedData.columnTypes[rule.column] === 'numeric' ? '10, 20' : 'London, New York'})`
                            : rule.operator.includes('LIKE')
                              ? "Wildcards e.g. %Manager%"
                              : "Enter target value..."
                        }
                        className="w-full bg-white border border-brand-border rounded px-2.5 py-1.5 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 placeholder:text-brand-text-muted/65 font-sans"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Add Filter Button */}
      <button
        type="button"
        onClick={handleAddGroup}
        className="w-full py-2.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[10px] font-bold text-brand-text-dark transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-sm hover:border-brand-accent/30"
      >
        <svg className="w-3.5 h-3.5 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Filter</span>
      </button>
    </div>
  );
}
