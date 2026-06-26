export function migrateConditions(conditions) {
  if (!conditions || !Array.isArray(conditions)) return [];
  if (conditions.length === 0) return [];

  // Check if it is already in the new nested group format
  if (conditions[0].rules !== undefined) {
    return conditions;
  }

  // Legacy flat conditions format to nested groups
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
}

function evaluateRule(colVal, operator, condVal, isNumeric) {
  if (operator === 'IS NULL') {
    return colVal === undefined || colVal === null || colVal.toString().trim() === '';
  }
  if (operator === 'IS NOT NULL') {
    return colVal !== undefined && colVal !== null && colVal.toString().trim() !== '';
  }

  if (condVal === undefined || condVal === null) return false;
  const condValStr = condVal.toString().trim();

  if (operator === 'IN' || operator === 'NOT IN') {
    const searchValues = condValStr.split(',').map(v => v.trim().toLowerCase());
    const itemValStr = (colVal !== undefined && colVal !== null) ? colVal.toString().toLowerCase() : '';

    if (isNumeric) {
      const itemValNum = Number(colVal);
      const inList = searchValues.some(v => Number(v) === itemValNum);
      return operator === 'IN' ? inList : !inList;
    } else {
      const inList = searchValues.includes(itemValStr);
      return operator === 'IN' ? inList : !inList;
    }
  }

  // Scalar operators (=, !=, >, <, >=, <=, LIKE, NOT LIKE)
  if (operator === 'LIKE' || operator === 'NOT LIKE') {
    const escapedPattern = condValStr
      .replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
    const regex = new RegExp(`^${escapedPattern}$`, 'i');
    const matches = regex.test(colVal !== undefined && colVal !== null ? colVal.toString() : '');
    return operator === 'LIKE' ? matches : !matches;
  }

  if (isNumeric) {
    const rowNum = Number(colVal);
    const condNum = Number(condValStr);

    if (!isNaN(rowNum) && !isNaN(condNum)) {
      switch (operator) {
        case '=': return rowNum === condNum;
        case '!=': return rowNum !== condNum;
        case '>': return rowNum > condNum;
        case '<': return rowNum < condNum;
        case '>=': return rowNum >= condNum;
        case '<=': return rowNum <= condNum;
        default: return false;
      }
    }
  }

  // Fallback to string comparisons
  const rowStr = (colVal !== undefined && colVal !== null ? colVal.toString() : '').toLowerCase();
  const condStr = condValStr.toLowerCase();
  switch (operator) {
    case '=': return rowStr === condStr;
    case '!=': return rowStr !== condStr;
    case '>': return rowStr > condStr;
    case '<': return rowStr < condStr;
    case '>=': return rowStr >= condStr;
    case '<=': return rowStr <= condStr;
    default: return false;
  }
}

/**
 * Executes a simulated SQL query against the parsed CSV data rows.
 * 
 * @param {Object[]} rows Array of row objects from CSV
 * @param {Object} queryConfig Query configurations
 * @param {string[]} queryConfig.selectColumns Columns to project (empty array = SELECT *)
 * @param {Object[]} queryConfig.conditions WHERE conditions (either legacy flat or nested groups)
 * @param {string} queryConfig.groupBy Column to group by
 * @param {Object} queryConfig.orderBy Sorting clause ({ column, direction })
 * @param {number|string} queryConfig.limit Slicing limit
 * @param {Record<string, 'numeric'|'string'>} columnTypes Detected column data types
 * @returns {Object[]} Processed rows matching query specifications
 */
export function executeQuery(
  rows,
  { selectColumns, conditions, groupBy, orderBy, limit, offset, columnAggregates = {}, columnAliases = {} },
  columnTypes
) {
    if (!rows || rows.length === 0) return [];

    let processedRows = [...rows];

    // 1. WHERE filtering
    const groups = migrateConditions(conditions);

    // Filter out empty groups or groups with no valid rules
    const validGroups = groups
      ? groups.map(group => {
        const validRules = group.rules.filter(rule => {
          if (!rule.column) return false;
          if (rule.operator === 'IS NULL' || rule.operator === 'IS NOT NULL') return true;
          return rule.value !== undefined && rule.value !== null && rule.value.trim() !== '';
        });
        return { ...group, rules: validRules };
      }).filter(group => group.rules.length > 0)
      : [];

    if (validGroups.length > 0) {
      processedRows = processedRows.filter((row) => {
        let finalMatch = true;

        for (let i = 0; i < validGroups.length; i++) {
          const group = validGroups[i];
          const ruleMatches = group.rules.map(rule => {
            const colVal = row[rule.column];
            const isNumeric = columnTypes[rule.column] === 'numeric';
            return evaluateRule(colVal, rule.operator, rule.value, isNumeric);
          });

          let groupMatch;
          if (ruleMatches.length > 0) {
            if (group.logic === 'OR') {
              groupMatch = ruleMatches.some(m => m);
            } else {
              groupMatch = ruleMatches.every(m => m);
            }
          } else {
            groupMatch = true;
          }

          if (i === 0) {
            finalMatch = groupMatch;
          } else {
            const conj = group.conjunction || 'AND';
            if (conj === 'OR') {
              finalMatch = finalMatch || groupMatch;
            } else {
              finalMatch = finalMatch && groupMatch;
            }
          }
        }

        return finalMatch;
      });
    }

    // 2. GROUP BY and Aggregations
    const hasAggregates = selectColumns && selectColumns.some(col => columnAggregates[col] && columnAggregates[col] !== 'None');
    const isAggregatedMode = (groupBy || hasAggregates) && selectColumns && selectColumns.length > 0;

    if (isAggregatedMode) {
      const groups = new Map();
      for (const r of processedRows) {
        const key = groupBy && r[groupBy] !== undefined && r[groupBy] !== null ? r[groupBy].toString() : '';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(r);
      }

      const aggregatedRows = [];
      groups.forEach((groupRows, groupKey) => {
        const aggregatedRow = {};
        selectColumns.forEach((col) => {
          const alias = columnAliases[col] || col;
          const agg = columnAggregates[col] || 'None';

          if (agg === 'None') {
            if (groupBy && col === groupBy) {
              aggregatedRow[alias] = groupRows[0] ? groupRows[0][col] : groupKey;
            } else {
              aggregatedRow[alias] = groupRows[0] ? groupRows[0][col] : '';
            }
          } else if (agg === 'COUNT') {
            let count = 0;
            groupRows.forEach(r => {
              if (r[col] !== undefined && r[col] !== null && r[col].toString().trim() !== '') {
                count++;
              }
            });
            aggregatedRow[alias] = count;
          } else if (agg === 'SUM') {
            let sum = 0;
            groupRows.forEach(r => {
              const val = Number(r[col]);
              if (!isNaN(val)) {
                sum += val;
              }
            });
            aggregatedRow[alias] = sum;
          } else if (agg === 'AVG') {
            let sum = 0;
            let count = 0;
            groupRows.forEach(r => {
              const val = Number(r[col]);
              if (!isNaN(val)) {
                sum += val;
                count++;
              }
            });
            aggregatedRow[alias] = count > 0 ? (sum / count) : 0;
          } else if (agg === 'MIN') {
            let min = null;
            const isNumeric = columnTypes[col] === 'numeric';
            groupRows.forEach(r => {
              const rawVal = r[col];
              if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== '') {
                const val = isNumeric ? Number(rawVal) : rawVal;
                if (min === null || val < min) {
                  min = val;
                }
              }
            });
            aggregatedRow[alias] = min !== null ? min : '';
          } else if (agg === 'MAX') {
            let max = null;
            const isNumeric = columnTypes[col] === 'numeric';
            groupRows.forEach(r => {
              const rawVal = r[col];
              if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== '') {
                const val = isNumeric ? Number(rawVal) : rawVal;
                if (max === null || val > max) {
                  max = val;
                }
              }
            });
            aggregatedRow[alias] = max !== null ? max : '';
          }
        });
        aggregatedRows.push(aggregatedRow);
      });

      processedRows = aggregatedRows;
    } else {
      // If not in aggregated mode but groupBy is set, just collapse by key (legacy behavior)
      if (groupBy && processedRows[0] && Object.prototype.hasOwnProperty.call(processedRows[0], groupBy)) {
        const groupedMap = new Map();
        for (const row of processedRows) {
          const key = row[groupBy] !== undefined && row[groupBy] !== null ? row[groupBy].toString() : '';
          if (!groupedMap.has(key)) {
            groupedMap.set(key, row);
          }
        }
        processedRows = Array.from(groupedMap.values());
      }
    }

    // 3. ORDER BY sorting
    if (orderBy && orderBy.column) {
      const colName = orderBy.column;
      const aliasName = columnAliases[colName] || '';
      const isAsc = orderBy.direction !== 'DESC';
      const isNumeric = columnTypes[colName] === 'numeric' ||
        ['COUNT', 'SUM', 'AVG'].includes(columnAggregates[colName] || '');

      const firstRow = processedRows[0];
      const keyToSortBy = firstRow && Object.prototype.hasOwnProperty.call(firstRow, colName)
        ? colName
        : firstRow && aliasName && Object.prototype.hasOwnProperty.call(firstRow, aliasName)
          ? aliasName
          : '';

      if (keyToSortBy) {
        processedRows.sort((a, b) => {
          const valA = a[keyToSortBy];
          const valB = b[keyToSortBy];

          if (valA === undefined || valA === null) return isAsc ? -1 : 1;
          if (valB === undefined || valB === null) return isAsc ? 1 : -1;

          if (isNumeric) {
            const numA = Number(valA);
            const numB = Number(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
              return isAsc ? numA - numB : numB - numA;
            }
          }

          const strA = valA.toString().toLowerCase();
          const strB = valB.toString().toLowerCase();
          return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
      }
    }

    // 4. LIMIT & OFFSET slicing
    const start = offset !== undefined && offset !== null && offset !== '' ? parseInt(offset, 10) : 0;
    const numOffset = !isNaN(start) && start >= 0 ? start : 0;

    if (limit !== undefined && limit !== null && limit !== '') {
      const numLimit = parseInt(limit, 10);
      if (!isNaN(numLimit) && numLimit >= 0) {
        processedRows = processedRows.slice(numOffset, numOffset + numLimit);
      } else if (numOffset > 0) {
        processedRows = processedRows.slice(numOffset);
      }
    } else if (numOffset > 0) {
      processedRows = processedRows.slice(numOffset);
    }

    // 5. SELECT column projection (mapping) - only if we did NOT do aggregated mode already
    if (!isAggregatedMode && selectColumns && selectColumns.length > 0) {
      processedRows = processedRows.map((row) => {
        const projected = {};
        selectColumns.forEach((col) => {
          const alias = columnAliases[col] || col;
          projected[alias] = row[col];
        });
        return projected;
      });
    }

    return processedRows;
  }
