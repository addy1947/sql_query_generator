
/**
 * Generates an SQL query string based on configuration.
 *
 * @param {Object} params
 * @param {string} params.tableName Name of the table (sanitized CSV filename)
 * @param {string[]} params.selectColumns Columns to include (empty array implies *)
 * @param {Object[]} params.conditions WHERE conditions (column, operator, value, conjunction)
 * @param {string} params.groupBy Optional GROUP BY column
 * @param {Object} params.orderBy Optional ORDER BY clause ({ column, direction })
 * @param {number|string} params.limit Optional LIMIT value
 * @param {number|string} params.offset Optional OFFSET value
 * @param {Record<string, 'numeric'|'string'>} params.columnTypes Auto-detected column types
 * @returns {string} The formatted SQL query string
 */
export function generateSQL({
  tableName,
  selectColumns,
  conditions,
  groupBy,
  orderBy,
  limit,
  offset,
  columnTypes,
  join // { enabled, type, tableName, leftKey, rightKey }
}) {
  const table = tableName
    ? tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    : 'my_table';

  let sql = '';

  const formatCol = (c) => {
    if (c.includes('.')) {
      const parts = c.split('.');
      return `\`${parts[0]}\`.\`${parts[1]}\``;
    }
    return `\`${c}\``;
  };

  // 1. SELECT
  if (!selectColumns || selectColumns.length === 0) {
    sql += 'SELECT *';
  } else {
    const cols = selectColumns.map(formatCol).join(', ');
    sql += `SELECT ${cols}`;
  }

  // 2. FROM
  sql += `\nFROM \`${table}\``;

  // 2.5 JOIN
  if (join && join.enabled && join.tableName && join.leftKey && join.rightKey) {
    const sTable = join.tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    sql += `\n${join.type || 'INNER JOIN'} \`${sTable}\` ON \`${table}\`.\`${join.leftKey}\` = \`${sTable}\`.\`${join.rightKey}\``;
  }

  // 3. WHERE
  const validConditions = conditions
    ? conditions.filter((cond) => {
        if (!cond.column) return false;
        if (cond.operator === 'IS NULL' || cond.operator === 'IS NOT NULL') return true;
        return cond.value !== undefined && cond.value !== null && cond.value.trim() !== '';
      })
    : [];

  if (validConditions.length > 0) {
    sql += '\nWHERE ';
    const condStrings = validConditions.map((cond, idx) => {
      const col = formatCol(cond.column);
      const op = cond.operator;
      const type = columnTypes[cond.column] || 'string';

      let valStr;
      if (op === 'IS NULL' || op === 'IS NOT NULL') {
        valStr = '';
      } else if (op === 'IN' || op === 'NOT IN') {
        const parts = cond.value.split(',').map((v) => v.trim());
        const formattedParts = parts.map((v) => {
          if (type === 'numeric') {
            const num = Number(v);
            return isNaN(num) ? `'${v.replace(/'/g, "''")}'` : v;
          } else {
            return `'${v.replace(/'/g, "''")}'`;
          }
        });
        valStr = ` (${formattedParts.join(', ')})`;
      } else {
        // Standard scalar operators (=, !=, >, <, etc. and LIKE, NOT LIKE)
        if (type === 'numeric') {
          const num = Number(cond.value);
          valStr = isNaN(num) ? ` '${cond.value.replace(/'/g, "''")}'` : ` ${cond.value}`;
        } else {
          valStr = ` '${cond.value.replace(/'/g, "''")}'`;
        }
      }

      const conjunction = cond.conjunction || 'AND';
      const prefix = idx > 0 ? `\n  ${conjunction} ` : '';
      return `${prefix}${col} ${op}${valStr}`;
    });
    sql += condStrings.join('');
  }

  // 4. GROUP BY
  if (groupBy) {
    sql += `\nGROUP BY ${formatCol(groupBy)}`;
  }

  // 5. ORDER BY
  if (orderBy && orderBy.column) {
    sql += `\nORDER BY ${formatCol(orderBy.column)} ${orderBy.direction || 'ASC'}`;
  }

  // 6. LIMIT
  if (limit !== undefined && limit !== null && limit !== '') {
    const numLimit = parseInt(limit, 10);
    if (!isNaN(numLimit) && numLimit >= 0) {
      sql += `\nLIMIT ${numLimit}`;

      // 7. OFFSET
      if (offset !== undefined && offset !== null && offset !== '') {
        const numOffset = parseInt(offset, 10);
        if (!isNaN(numOffset) && numOffset >= 0) {
          sql += `\nOFFSET ${numOffset}`;
        }
      }
    }
  }

  return sql;
}

/**
 * Safely parses and highlights SQL keywords, literals, and identifiers.
 * Returns React elements to prevent raw innerHTML rendering vulnerabilities.
 *
 * @param {string} sql The SQL query string
 * @returns {React.ReactNode[]} Array of React elements
 */
export function highlightSQL(sql) {
  if (!sql) return [];

  // SQL token regex matching:
  // - string literals (single quoted, handles escaped quotes)
  // - identifiers (backticked)
  // - keywords (SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT, OFFSET, ASC, DESC, AND, OR, LIKE, IN, NOT, IS, NULL)
  // - numbers
  // - operators/commas
  // - whitespaces/newlines
  const tokenRegex = /('(?:''|[^'])*'|`[^`]+`|\b(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET|ASC|DESC|AND|OR|LIKE|IN|NOT|IS|NULL)\b|\b\d+(?:\.\d+)?\b|[=><!]+|,|\s+|\S+)/gi;

  const tokens = sql.split(tokenRegex);

  const keywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'ASC', 'DESC', 'AND', 'OR', 'LIKE', 'IN', 'NOT', 'IS', 'NULL'
  ]);

  return tokens.map((token, index) => {
    if (!token) return null;

    // 1. Whitespace or Newline
    if (/^\s+$/.test(token)) {
      return <span key={index}>{token}</span>;
    }

    // 2. String literal
    if (token.startsWith("'") && token.endsWith("'")) {
      return (
        <span key={index} className="text-[#f1fa8c] font-mono font-medium">
          {token}
        </span>
      );
    }

    // 3. Backtick identifier (column/table)
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <span key={index} className="text-[#8be9fd] font-mono font-medium">
          {token}
        </span>
      );
    }

    // 4. Keyword
    const upperToken = token.toUpperCase().replace(/\s+/g, ' ');
    if (keywords.has(upperToken)) {
      return (
        <span key={index} className="text-[#ff79c6] font-bold uppercase">
          {token}
        </span>
      );
    }

    // 5. Number
    if (/^\b\d+(?:\.\d+)?\b$/.test(token)) {
      return (
        <span key={index} className="text-[#bd93f9] font-mono font-medium">
          {token}
        </span>
      );
    }

    // 6. Operators or commas
    if (/^[=><!]+$/.test(token) || token === ',') {
      return (
        <span key={index} className="text-[#ffb86c] font-medium">
          {token}
        </span>
      );
    }

    // 7. General text
    return (
      <span key={index} className="text-[#f8f8f2]">
        {token}
      </span>
    );
  });
}
