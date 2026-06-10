/**
 * Executes a simulated SQL query against the parsed CSV data rows.
 * 
 * @param {Object[]} rows Array of row objects from CSV
 * @param {Object} queryConfig Query configurations
 * @param {string[]} queryConfig.selectColumns Columns to project (empty array = SELECT *)
 * @param {Object[]} queryConfig.conditions WHERE conditions (column, operator, value, conjunction)
 * @param {string} queryConfig.groupBy Column to group by
 * @param {Object} queryConfig.orderBy Sorting clause ({ column, direction })
 * @param {number|string} queryConfig.limit Slicing limit
 * @param {Record<string, 'numeric'|'string'>} columnTypes Detected column data types
 * @returns {Object[]} Processed rows matching query specifications
 */
export function executeQuery(
  rows,
  { selectColumns, conditions, groupBy, orderBy, limit, offset },
  columnTypes
) {
  if (!rows || rows.length === 0) return [];

  let processedRows = [...rows];

  // 1. WHERE filtering
  const validConditions = conditions
    ? conditions.filter((cond) => {
        if (!cond.column) return false;
        if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') return true;
        return cond.value !== undefined && cond.value !== null && cond.value.trim() !== '';
      })
    : [];

  if (validConditions.length > 0) {
    processedRows = processedRows.filter((row) => {
      let match = true;

      for (let i = 0; i < validConditions.length; i++) {
        const cond = validConditions[i];
        const colVal = row[cond.column];
        const isNumeric = columnTypes[cond.column] === 'numeric';
        
        let currentCondMatch;

        // Operator evaluations
        if (cond.operator === 'IS NULL') {
          currentCondMatch = colVal === undefined || colVal === null || colVal.toString().trim() === '';
        } else if (cond.operator === 'IS NOT NULL') {
          currentCondMatch = colVal !== undefined && colVal !== null && colVal.toString().trim() !== '';
        } else if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
          const searchValues = cond.value.split(',').map(v => v.trim().toLowerCase());
          const itemValStr = (colVal !== undefined && colVal !== null) ? colVal.toString().toLowerCase() : '';
          
          if (isNumeric) {
            const itemValNum = Number(colVal);
            const inList = searchValues.some(v => Number(v) === itemValNum);
            currentCondMatch = cond.operator === 'IN' ? inList : !inList;
          } else {
            const inList = searchValues.includes(itemValStr);
            currentCondMatch = cond.operator === 'IN' ? inList : !inList;
          }
        } else {
          // Scalar comparisons (=, !=, >, <, >=, <=, LIKE, NOT LIKE)
          const condVal = cond.value.trim();

          if (cond.operator === 'LIKE' || cond.operator === 'NOT LIKE') {
            // Escape regex spec characters, then convert SQL % to .* and _ to .
            const escapedPattern = condVal
              .replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
              .replace(/%/g, '.*')
              .replace(/_/g, '.');
            const regex = new RegExp(`^${escapedPattern}$`, 'i');
            const matches = regex.test(colVal !== undefined && colVal !== null ? colVal.toString() : '');
            currentCondMatch = cond.operator === 'LIKE' ? matches : !matches;
          } else {
            // Standard scalar comparisons
            if (isNumeric) {
              const rowNum = Number(colVal);
              const condNum = Number(condVal);
              
              if (!isNaN(rowNum) && !isNaN(condNum)) {
                switch (cond.operator) {
                  case '=': currentCondMatch = rowNum === condNum; break;
                  case '!=': currentCondMatch = rowNum !== condNum; break;
                  case '>': currentCondMatch = rowNum > condNum; break;
                  case '<': currentCondMatch = rowNum < condNum; break;
                  case '>=': currentCondMatch = rowNum >= condNum; break;
                  case '<=': currentCondMatch = rowNum <= condNum; break;
                  default: currentCondMatch = false;
                }
              } else {
                // Fallback to string if number conversion fails
                const rowStr = (colVal || '').toString().toLowerCase();
                const condStr = condVal.toLowerCase();
                switch (cond.operator) {
                  case '=': currentCondMatch = rowStr === condStr; break;
                  case '!=': currentCondMatch = rowStr !== condStr; break;
                  case '>': currentCondMatch = rowStr > condStr; break;
                  case '<': currentCondMatch = rowStr < condStr; break;
                  case '>=': currentCondMatch = rowStr >= condStr; break;
                  case '<=': currentCondMatch = rowStr <= condStr; break;
                  default: currentCondMatch = false;
                }
              }
            } else {
              // String comparisons
              const rowStr = (colVal !== undefined && colVal !== null ? colVal.toString() : '').toLowerCase();
              const condStr = condVal.toLowerCase();
              switch (cond.operator) {
                case '=': currentCondMatch = rowStr === condStr; break;
                case '!=': currentCondMatch = rowStr !== condStr; break;
                case '>': currentCondMatch = rowStr > condStr; break;
                case '<': currentCondMatch = rowStr < condStr; break;
                case '>=': currentCondMatch = rowStr >= condStr; break;
                case '<=': currentCondMatch = rowStr <= condStr; break;
                default: currentCondMatch = false;
              }
            }
          }
        }

        // Combine using Conjunction (left-to-right chaining)
        if (i === 0) {
          match = currentCondMatch;
        } else {
          const conj = cond.conjunction || 'AND';
          if (conj === 'OR') {
            match = match || currentCondMatch;
          } else {
            match = match && currentCondMatch;
          }
        }
      }

      return match;
    });
  }

  // 2. GROUP BY
  // Collapses rows sharing same group key, keeping the first encountered row
  if (groupBy && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], groupBy)) {
    const groupedMap = new Map();
    for (const row of processedRows) {
      const key = row[groupBy] !== undefined && row[groupBy] !== null ? row[groupBy].toString() : '';
      if (!groupedMap.has(key)) {
        groupedMap.set(key, row);
      }
    }
    processedRows = Array.from(groupedMap.values());
  }

  // 3. ORDER BY sorting
  if (orderBy && orderBy.column && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], orderBy.column)) {
    const colName = orderBy.column;
    const isAsc = orderBy.direction !== 'DESC';
    const isNumeric = columnTypes[colName] === 'numeric';

    processedRows.sort((a, b) => {
      const valA = a[colName];
      const valB = b[colName];

      if (valA === undefined || valA === null) return isAsc ? -1 : 1;
      if (valB === undefined || valB === null) return isAsc ? 1 : -1;

      if (isNumeric) {
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return isAsc ? numA - numB : numB - numA;
        }
      }

      // String fallback sorting
      const strA = valA.toString().toLowerCase();
      const strB = valB.toString().toLowerCase();
      return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
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

  // 5. SELECT column projection (mapping)
  if (selectColumns && selectColumns.length > 0) {
    processedRows = processedRows.map((row) => {
      const projected = {};
      selectColumns.forEach((col) => {
        projected[col] = row[col];
      });
      return projected;
    });
  }

  return processedRows;
}
