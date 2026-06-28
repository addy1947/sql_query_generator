function migrateConditions(conditions) {
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
}

/**
 * Generates an SQL query string based on configuration.
 *
 * @param {Object} params
 * @param {string} params.tableName Name of the table (sanitized CSV filename)
 * @param {string[]} params.selectColumns Columns to include (empty array implies *)
 * @param {Object[]} params.conditions WHERE conditions (either legacy flat or nested groups)
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
  join, // { enabled, type, tableName, leftKey, rightKey }
  columnAggregates = {},
  columnAliases = {}
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
    const cols = selectColumns.map(col => {
      let formatted = formatCol(col);
      const agg = columnAggregates[col];
      if (agg && agg !== 'None') {
        formatted = `${agg.toUpperCase()}(${formatted})`;
      }
      const alias = columnAliases[col];
      if (alias && alias.trim()) {
        formatted = `${formatted} AS \`${alias.trim()}\``;
      }
      return formatted;
    }).join(', ');
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
  const groups = migrateConditions(conditions);
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
    sql += '\nWHERE ';
    const groupStrings = validGroups.map((group, groupIdx) => {
      const ruleStrings = group.rules.map((rule) => {
        const col = formatCol(rule.column);
        const op = rule.operator;
        const type = columnTypes[rule.column] || 'string';

        let valStr;
        if (op === 'IS NULL' || op === 'IS NOT NULL') {
          valStr = '';
        } else if (op === 'IN' || op === 'NOT IN') {
          const parts = rule.value.split(',').map((v) => v.trim());
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
          // Standard scalar operators
          if (type === 'numeric') {
            const num = Number(rule.value);
            valStr = isNaN(num) ? ` '${rule.value.replace(/'/g, "''")}'` : ` ${rule.value}`;
          } else {
            valStr = ` '${rule.value.replace(/'/g, "''")}'`;
          }
        }
        return `${col} ${op}${valStr}`;
      });

      const groupLogic = group.logic || 'AND';
      const innerSQL = ruleStrings.join(` ${groupLogic} `);

      const conjunction = group.conjunction || 'AND';
      const prefix = groupIdx > 0 ? `\n  ${conjunction} ` : '';
      if (group.rules.length === 1) {
        return `${prefix}${ruleStrings[0]}`;
      }
      return `${prefix}(${innerSQL})`;
    });
    sql += groupStrings.join('');
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
  // - keywords (SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT, OFFSET, ASC, DESC, AND, OR, LIKE, IN, NOT, IS, NULL, AS, COUNT, SUM, AVG, MIN, MAX, JOIN)
  // - numbers
  // - operators/commas
  // - whitespaces/newlines
  const tokenRegex = /('(?:''|[^'])*'|`[^`]+`|\b(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET|ASC|DESC|AND|OR|LIKE|IN|NOT|IS|NULL|AS|COUNT|SUM|AVG|MIN|MAX|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+OUTER\s+JOIN|JOIN)\b|\b\d+(?:\.\d+)?\b|[=><!]+|,|\s+|\S+)/gi;

  const tokens = sql.split(tokenRegex);

  const keywords = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'ASC', 'DESC', 'AND', 'OR', 'LIKE', 'IN', 'NOT', 'IS', 'NULL', 'AS',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'FULL OUTER JOIN', 'JOIN'
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
        <span key={index} className="text-[#16A34A] font-mono font-semibold">
          {token}
        </span>
      );
    }

    // 3. Backtick identifier (column/table)
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <span key={index} className="text-[#44403C] font-mono font-medium">
          {token}
        </span>
      );
    }

    // 4. Keyword
    const upperToken = token.toUpperCase().replace(/\s+/g, ' ');
    if (keywords.has(upperToken)) {
      return (
        <span key={index} className="text-[#D27B55] font-bold uppercase">
          {token}
        </span>
      );
    }

    // 5. Number
    if (/^\b\d+(?:\.\d+)?\b$/.test(token)) {
      return (
        <span key={index} className="text-[#7C3AED] font-mono font-semibold">
          {token}
        </span>
      );
    }

    // 6. Operators or commas
    if (/^[=><!]+$/.test(token) || token === ',') {
      return (
        <span key={index} className="text-[#78716C] font-semibold">
          {token}
        </span>
      );
    }

    // 7. General text
    return (
      <span key={index} className="text-[#1C1917]">
        {token}
      </span>
    );
  });
}
