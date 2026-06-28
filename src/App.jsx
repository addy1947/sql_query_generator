import { useState, useMemo, useEffect } from 'react';
import { parseCSV } from './utils/csvParser';
import { useQueryGenerator } from './hooks/useQueryGenerator';
import './App.css';
import heroImage from './assets/hero.png';

// Component imports
import TableManager from './components/TableManager';
import WizardProgress from './components/WizardProgress';
import WizardCard from './components/WizardCard';
import SelectColumnsStep from './components/SelectColumnsStep';
import JoinTablesStep from './components/JoinTablesStep';
import WhereConditionsStep from './components/WhereConditionsStep';
import DatasetPreviews from './components/DatasetPreviews';
import SqlPreview from './components/SqlPreview';
import ResultsTable from './components/ResultsTable';
import SchemaVisualizer from './components/SchemaVisualizer';

const SAMPLE_EMPLOYEES = `id,name,department_id,salary
101,Alice Johnson,1,95000
102,Bob Smith,2,72000
103,Charlie Davis,1,110000
104,Diana Prince,3,68000
105,Evan Wright,2,80000`;

const SAMPLE_DEPARTMENTS = `dept_id,dept_name,location
1,Engineering,London
2,Sales,New York
3,Marketing,Paris
4,HR,Tokyo`;

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

function App() {
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  const [files, setFiles] = useState([]); // Array of parsed files: { id, name, nameWithoutExt, size, totalRows, headers, rows, columnTypes }
  const [activeFileId, setActiveFileId] = useState('');
  const [error, setError] = useState('');
  const [searchColumnQuery, setSearchColumnQuery] = useState('');

  // Wizard active step (1 to 3)
  const [wizardStep, setWizardStep] = useState(1);

  // Table join config
  const [joinConfig, setJoinConfig] = useState({
    enabled: false,
    type: 'INNER JOIN',
    tableId: '', // Secondary table ID
    leftKey: '', // Primary table join key
    rightKey: '' // Secondary table join key
  });

  // SQL query configs
  const [queryConfig, setQueryConfig] = useState({
    selectColumns: [], // Empty means SELECT *
    columnAggregates: {}, // Key: column name, Value: aggregate function ('COUNT', 'SUM', etc.)
    columnAliases: {}, // Key: column name, Value: alias string
    conditions: [],    // { id, column, operator, value, conjunction }
    groupBy: '',
    orderBy: { column: '', direction: 'ASC' },
    limit: '',
    offset: ''
  });

  // Expandable state for original CSV previews
  const [showCsvPreviewId, setShowCsvPreviewId] = useState('');

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  const hasAdvancedConfigs = useMemo(() => {
    const hasAggs = queryConfig.selectColumns.some(col => queryConfig.columnAggregates[col] && queryConfig.columnAggregates[col] !== 'None');
    const hasAliases = queryConfig.selectColumns.some(col => queryConfig.columnAliases[col] && queryConfig.columnAliases[col].trim() !== '');
    const hasRightFullJoin = joinConfig.enabled && (joinConfig.type === 'RIGHT JOIN' || joinConfig.type === 'FULL OUTER JOIN');
    const hasGrpBy = !!queryConfig.groupBy;
    return hasAggs || hasAliases || hasRightFullJoin || hasGrpBy;
  }, [queryConfig, joinConfig]);


  // Preset Query Saving / Loading
  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('sql_query_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSavePreset = (presetName) => {
    if (!presetName || !presetName.trim()) return;
    const newPreset = {
      name: presetName.trim(),
      id: Date.now().toString(),
      queryConfig,
      joinConfig
    };
    setPresets(prev => {
      const updated = [...prev.filter(p => p.name.toLowerCase() !== presetName.trim().toLowerCase()), newPreset];
      localStorage.setItem('sql_query_presets', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLoadPreset = (presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.queryConfig) {
      setQueryConfig(preset.queryConfig);
    }
    if (preset.joinConfig) {
      setJoinConfig(preset.joinConfig);
    }
  };

  const handleDeletePreset = (presetId) => {
    setPresets(prev => {
      const updated = prev.filter(p => p.id !== presetId);
      localStorage.setItem('sql_query_presets', JSON.stringify(updated));
      return updated;
    });
  };


  // ----------------------------------------------------
  // Derived / Memoized State
  // ----------------------------------------------------
  const activeFile = useMemo(() => {
    return files.find(f => f.id === activeFileId) || null;
  }, [files, activeFileId]);

  const secondaryFile = useMemo(() => {
    return files.find(f => f.id === joinConfig.tableId) || null;
  }, [files, joinConfig.tableId]);

  // Combined relational dataset calculation (Local Join Engine)
  const joinedData = useMemo(() => {
    if (!activeFile) {
      return { headers: [], rows: [], columnTypes: {} };
    }

    const isJoinConfigured =
      joinConfig.enabled &&
      joinConfig.tableId &&
      secondaryFile &&
      joinConfig.leftKey &&
      joinConfig.rightKey;

    if (!isJoinConfigured) {
      return {
        headers: activeFile.headers,
        rows: activeFile.rows,
        columnTypes: activeFile.columnTypes
      };
    }

    const leftKey = joinConfig.leftKey;
    const rightKey = joinConfig.rightKey;
    const joinType = joinConfig.type;

    const primaryPrefix = activeFile.nameWithoutExt;
    const secondaryPrefix = secondaryFile.nameWithoutExt;

    // Build joined headers list with prefixes to prevent name collisions
    const headers = [
      ...activeFile.headers.map(h => `${primaryPrefix}.${h}`),
      ...secondaryFile.headers.map(h => `${secondaryPrefix}.${h}`)
    ];

    // Build joined column types with prefixes
    const columnTypes = {};
    activeFile.headers.forEach(h => {
      columnTypes[`${primaryPrefix}.${h}`] = activeFile.columnTypes[h];
    });
    secondaryFile.headers.forEach(h => {
      columnTypes[`${secondaryPrefix}.${h}`] = secondaryFile.columnTypes[h];
    });

    const prefixRow = (rowObj, prefix) => {
      const resultObj = {};
      for (const key in rowObj) {
        resultObj[`${prefix}.${key}`] = rowObj[key];
      }
      return resultObj;
    };

    // Helper to generate empty rows for padding
    const emptyPrimary = {};
    activeFile.headers.forEach(h => {
      emptyPrimary[`${primaryPrefix}.${h}`] = '';
    });
    const emptySecondary = {};
    secondaryFile.headers.forEach(h => {
      emptySecondary[`${secondaryPrefix}.${h}`] = '';
    });

    const rows = [];
    const matchedSecondaryIndices = new Set();

    // Loop through primary rows
    for (const pRow of activeFile.rows) {
      const pVal = pRow[leftKey];
      let matches = [];

      if (pVal !== undefined && pVal !== null && pVal !== '') {
        secondaryFile.rows.forEach((sRow, sIdx) => {
          const sVal = sRow[rightKey];
          if (sVal !== undefined && sVal !== null && sVal !== '') {
            if (sVal.toString().toLowerCase() === pVal.toString().toLowerCase()) {
              matches.push({ row: sRow, index: sIdx });
            }
          }
        });
      }

      if (matches.length > 0) {
        for (const matchInfo of matches) {
          matchedSecondaryIndices.add(matchInfo.index);
          rows.push({
            ...prefixRow(pRow, primaryPrefix),
            ...prefixRow(matchInfo.row, secondaryPrefix)
          });
        }
      } else {
        // No match: add if LEFT or FULL JOIN
        if (joinType === 'LEFT JOIN' || joinType === 'FULL OUTER JOIN') {
          rows.push({
            ...prefixRow(pRow, primaryPrefix),
            ...emptySecondary
          });
        }
      }
    }

    // Unmatched secondary rows for RIGHT or FULL JOIN
    if (joinType === 'RIGHT JOIN' || joinType === 'FULL OUTER JOIN') {
      secondaryFile.rows.forEach((sRow, sIdx) => {
        if (!matchedSecondaryIndices.has(sIdx)) {
          rows.push({
            ...emptyPrimary,
            ...prefixRow(sRow, secondaryPrefix)
          });
        }
      });
    }

    return { headers, rows, columnTypes };
  }, [joinConfig, activeFile, secondaryFile]);

  // Schema self-healing: clears or resets query configurations when headers schema changes
  useEffect(() => {
    if (joinedData.headers.length === 0) return;

    setQueryConfig(prev => {
      const validSelects = prev.selectColumns.filter(col => joinedData.headers.includes(col));

      const validConditions = prev.conditions.map(cond => {
        if (!joinedData.headers.includes(cond.column)) {
          return { ...cond, column: joinedData.headers[0] || '', value: '' };
        }
        return cond;
      });

      const validGroupBy = joinedData.headers.includes(prev.groupBy) ? prev.groupBy : '';
      const validOrderByCol = joinedData.headers.includes(prev.orderBy.column) ? prev.orderBy.column : '';

      // Clean up aggregates/aliases for invalid/removed columns
      const validAggregates = {};
      const validAliases = {};
      validSelects.forEach(col => {
        if (prev.columnAggregates && prev.columnAggregates[col]) {
          validAggregates[col] = prev.columnAggregates[col];
        }
        if (prev.columnAliases && prev.columnAliases[col]) {
          validAliases[col] = prev.columnAliases[col];
        }
      });

      return {
        ...prev,
        selectColumns: validSelects,
        columnAggregates: validAggregates,
        columnAliases: validAliases,
        conditions: validConditions,
        groupBy: validGroupBy,
        orderBy: { ...prev.orderBy, column: validOrderByCol },
        offset: ''
      };
    });
  }, [joinedData.headers]);

  // ----------------------------------------------------
  // Handler Actions
  // ----------------------------------------------------
  const processCSVText = (text, filename, sizeInBytes) => {
    const parsed = parseCSV(text);
    if (parsed.headers.length === 0) {
      throw new Error(`Could not find headers in file: ${filename}`);
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const cleanTableName = nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    return {
      id: fileId,
      name: filename,
      nameWithoutExt: cleanTableName,
      size: (sizeInBytes / 1024).toFixed(1) + ' KB',
      totalRows: parsed.rows.length,
      headers: parsed.headers,
      rows: parsed.rows,
      columnTypes: parsed.columnTypes
    };
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    setError('');
    const newParsedFiles = [];
    let processedCount = 0;

    uploadedFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const parsedObj = processCSVText(text, f.name, f.size);
          newParsedFiles.push(parsedObj);
        } catch (err) {
          setError(prev => (prev ? prev + '\n' : '') + err.message);
        } finally {
          processedCount++;
          if (processedCount === uploadedFiles.length) {
            if (newParsedFiles.length > 0) {
              setFiles(prev => {
                const updated = [...prev, ...newParsedFiles];
                // Set first uploaded file as active if none was set
                if (!activeFileId) {
                  setActiveFileId(newParsedFiles[0].id);
                  // Setup initial condition column default
                  setQueryConfig(q => ({
                    ...q,
                    conditions: [{
                      id: 'cond-1',
                      column: newParsedFiles[0].headers[0] || '',
                      operator: '=',
                      value: '',
                      conjunction: 'AND'
                    }]
                  }));
                }
                return updated;
              });
            }
          }
        }
      };
      reader.readAsText(f);
    });
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      // Adjust active table ID if necessary
      if (activeFileId === fileId) {
        const nextActive = filtered[0] ? filtered[0].id : '';
        setActiveFileId(nextActive);
        if (nextActive) {
          const targetFile = filtered[0];
          setQueryConfig(q => ({
            ...q,
            conditions: [{
              id: 'cond-1',
              column: targetFile.headers[0] || '',
              operator: '=',
              value: '',
              conjunction: 'AND'
            }]
          }));
        }
      }
      return filtered;
    });

    // Reset join configurations referencing this deleted file
    if (joinConfig.tableId === fileId) {
      setJoinConfig({
        enabled: false,
        type: 'INNER JOIN',
        tableId: '',
        leftKey: '',
        rightKey: ''
      });
    }
  };

  const handleLoadSampleDatasets = () => {
    setError('');
    try {
      const parsedEmployees = processCSVText(SAMPLE_EMPLOYEES, 'employees.csv', 200);
      const parsedDepartments = processCSVText(SAMPLE_DEPARTMENTS, 'departments.csv', 120);

      setFiles([parsedEmployees, parsedDepartments]);
      setActiveFileId(parsedEmployees.id);

      setJoinConfig({
        enabled: true,
        type: 'INNER JOIN',
        tableId: parsedDepartments.id,
        leftKey: 'department_id',
        rightKey: 'dept_id'
      });

      const ePrefix = parsedEmployees.nameWithoutExt;
      const dPrefix = parsedDepartments.nameWithoutExt;

      setQueryConfig({
        selectColumns: [
          `${ePrefix}.name`,
          `${dPrefix}.dept_name`,
          `${ePrefix}.salary`,
          `${dPrefix}.location`
        ],
        columnAggregates: {},
        columnAliases: {},
        conditions: [
          {
            id: 'group-sample-1',
            conjunction: 'AND',
            logic: 'AND',
            rules: [
              {
                id: 'cond-1',
                column: `${ePrefix}.salary`,
                operator: '>',
                value: '70000'
              }
            ]
          }
        ],
        groupBy: '',
        orderBy: { column: `${ePrefix}.salary`, direction: 'DESC' },
        limit: '10',
        offset: ''
      });

      setWizardStep(3); // Start user at Step 3 (WHERE)
    } catch (err) {
      setError(`Failed to load sample tables: ${err.message}`);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setActiveFileId('');
    setError('');
    setWizardStep(1);
    setJoinConfig({
      enabled: false,
      type: 'INNER JOIN',
      tableId: '',
      leftKey: '',
      rightKey: ''
    });
    setQueryConfig({
      selectColumns: [],
      columnAggregates: {},
      columnAliases: {},
      conditions: [],
      groupBy: '',
      orderBy: { column: '', direction: 'ASC' },
      limit: '',
      offset: ''
    });
  };

  // ----------------------------------------------------
  // Select Column Handlers (Step 1)
  // ----------------------------------------------------
  const handleToggleColumn = (col) => {
    setQueryConfig(prev => {
      const isSelected = prev.selectColumns.includes(col);
      const selectColumns = isSelected
        ? prev.selectColumns.filter(c => c !== col)
        : [...prev.selectColumns, col];
      return { ...prev, selectColumns };
    });
  };

  const handleSelectAllColumns = () => {
    setQueryConfig(prev => ({
      ...prev,
      selectColumns: [...joinedData.headers]
    }));
  };

  const handleDeselectAllColumns = () => {
    setQueryConfig(prev => ({
      ...prev,
      selectColumns: []
    }));
  };

  const handleUpdateColumnAggregate = (col, val) => {
    setQueryConfig(prev => ({
      ...prev,
      columnAggregates: {
        ...prev.columnAggregates,
        [col]: val
      }
    }));
  };

  const handleUpdateColumnAlias = (col, val) => {
    setQueryConfig(prev => ({
      ...prev,
      columnAliases: {
        ...prev.columnAliases,
        [col]: val
      }
    }));
  };

  const filteredHeaders = useMemo(() => {
    return joinedData.headers.filter(h =>
      h.toLowerCase().includes(searchColumnQuery.toLowerCase())
    );
  }, [joinedData.headers, searchColumnQuery]);

  // ----------------------------------------------------
  // Condition Handlers (Step 3) - Filter Groups System
  // ----------------------------------------------------
  const handleAddFilterGroup = () => {
    setQueryConfig(prev => {
      const newGroup = {
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        conjunction: 'AND',
        logic: 'AND',
        rules: [
          {
            id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            column: joinedData.headers[0] || '',
            operator: '=',
            value: ''
          }
        ]
      };
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: [...currentGroups, newGroup]
      };
    });
  };

  const handleRemoveFilterGroup = (groupId) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: currentGroups.filter(g => g.id !== groupId)
      };
    });
  };

  const handleGroupLogicChange = (groupId, logic) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: currentGroups.map(g =>
          g.id === groupId ? { ...g, logic } : g
        )
      };
    });
  };

  const handleGroupConjunctionChange = (groupId, conjunction) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: currentGroups.map(g =>
          g.id === groupId ? { ...g, conjunction } : g
        )
      };
    });
  };

  const handleAddRuleToGroup = (groupId) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: currentGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              rules: [
                ...g.rules,
                {
                  id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  column: joinedData.headers[0] || '',
                  operator: '=',
                  value: ''
                }
              ]
            };
          }
          return g;
        })
      };
    });
  };

  const handleRemoveRuleFromGroup = (groupId, ruleId) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      const updatedGroups = currentGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            rules: g.rules.filter(r => r.id !== ruleId)
          };
        }
        return g;
      }).filter(g => g.rules.length > 0);

      return {
        ...prev,
        conditions: updatedGroups
      };
    });
  };

  const handleRuleChange = (groupId, ruleId, field, val) => {
    setQueryConfig(prev => {
      const currentGroups = migrateConditions(prev.conditions);
      return {
        ...prev,
        conditions: currentGroups.map(g => {
          if (g.id === groupId) {
            return {
              ...g,
              rules: g.rules.map(r =>
                r.id === ruleId ? { ...r, [field]: val } : r
              )
            };
          }
          return g;
        })
      };
    });
  };

  // ----------------------------------------------------
  // Live SQL Generator & Query Executor
  // ----------------------------------------------------
  const {
    sqlQuery,
    queryResults,
    showGroupByWarning,
    nonGroupedColumns,
    copySuccess,
    handleCopySQL,
    handleDownloadSQL
  } = useQueryGenerator({
    activeFile,
    secondaryFile,
    queryConfig,
    joinConfig,
    joinedData
  });

  // ----------------------------------------------------
  // Rendering Helpers
  // ----------------------------------------------------
  const renderStepSummary = (stepNum) => {
    switch (stepNum) {
      case 1:
        return joinConfig.enabled && secondaryFile && joinConfig.leftKey && joinConfig.rightKey
          ? `${joinConfig.type} \`${secondaryFile.nameWithoutExt}\` ON \`${activeFile.nameWithoutExt}\`.\`${joinConfig.leftKey}\` = \`${secondaryFile.nameWithoutExt}\`.\`${joinConfig.rightKey}\``
          : 'No relational join configured';
      case 2:
        return queryConfig.selectColumns.length === 0
          ? 'SELECT * (All columns)'
          : `SELECT ${queryConfig.selectColumns.join(', ')}`;
      case 3: {
        const groups = migrateConditions(queryConfig.conditions);
        const activeGroups = groups.map(g => {
          const validRules = g.rules.filter(r =>
            r.column && (r.operator === 'IS NULL' || r.operator === 'IS NOT NULL' || (r.value !== undefined && r.value !== null && r.value.trim() !== ''))
          );
          return { ...g, rules: validRules };
        }).filter(g => g.rules.length > 0);

        if (activeGroups.length === 0) return 'No filters applied';

        return activeGroups.map((g, idx) => {
          const groupConj = idx > 0 ? ` ${g.conjunction} ` : '';
          const innerStr = g.rules.map(r => {
            const valText = (r.operator === 'IS NULL' || r.operator === 'IS NOT NULL') ? '' : ` '${r.value}'`;
            return `${r.column} ${r.operator}${valText}`;
          }).join(` ${g.logic} `);
          return `${groupConj}(${innerStr})`;
        }).join('');
      }
      default:
        return '';
    }
  };

  return (
    <div className="lg:h-screen lg:overflow-hidden bg-brand-primary text-brand-text-dark flex flex-col font-sans selection:bg-brand-accent/25 selection:text-brand-text-dark">
      {/* Top navbar (Floating Pill on Light background) */}
      <header className="w-full px-4 sm:px-6 lg:px-8 py-3 bg-brand-primary z-50 flex justify-center border-b border-brand-border/40">
        <div className="w-full max-w-6xl px-6 h-14 bg-brand-dark rounded-full flex items-center justify-between shadow-lg text-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accent text-white flex items-center justify-center font-bold shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-xs sm:text-sm tracking-tight text-white block leading-none">NexGenQuery</span>
              <span className="text-[8px] text-zinc-400 uppercase tracking-widest block font-medium mt-1 leading-none">In-Browser Relational Engine</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Switch to Advanced Mode Toggle */}
            <button
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className={`text-[10px] px-3.5 py-1.5 rounded-full border font-semibold transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-sm ${isAdvancedMode
                  ? 'bg-brand-accent hover:bg-brand-accent-hover border-transparent text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                }`}
            >
              <svg className={`w-3 h-3 transition-transform duration-300 ${isAdvancedMode ? 'rotate-180 text-white' : 'text-zinc-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{isAdvancedMode ? 'Advanced: ON' : 'Switch Advanced'}</span>
            </button>

            <div className="hidden sm:flex items-center space-x-1 text-[9px] font-mono text-emerald-400 border border-emerald-950 bg-emerald-950/20 px-2.5 py-1 rounded-full">
              <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" />
              </svg>
              <span>100% Client-Side</span>
            </div>

            {files.length > 0 && (
              <button
                onClick={handleReset}
                className="text-[10px] px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-medium transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-none flex flex-col min-h-0 lg:overflow-hidden">
        {/* Error notification */}
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-6 p-4 rounded-xl bg-brand-card border border-brand-accent/20 text-brand-text-dark text-xs whitespace-pre-line flex items-start space-x-3 shadow-sm animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block text-brand-text-dark">Parser notifications:</span>
              <p className="leading-relaxed mt-0.5 text-brand-text-muted">{error}</p>
            </div>
          </div>
        )}

        {files.length === 0 ? (
          /* Empty Upload State (Scroll Snap Pages) */
          <div className="flex-grow w-full overflow-y-auto snap-y snap-mandatory scroll-smooth h-[calc(100vh-5rem)] scrollbar-none bg-brand-primary">

            {/* Page 1: Main Upload & Mockup Section */}
            <section className="snap-start min-h-[calc(100vh-5rem)] flex-shrink-0 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full relative">
              <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-center lg:text-left">

                {/* Left Column: Title, Tagline, Upload Box, and Sample Trigger */}
                <div className="lg:col-span-5 space-y-6">
                  <div>

                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-text-dark leading-tight">
                      AI SQL Query <span className="text-brand-accent block sm:inline">Generator</span>
                    </h1>
                    <p className="mt-4 text-brand-text-muted text-sm leading-relaxed max-w-md mx-auto lg:mx-0">
                      Convert your text instructions into SQL queries or input a query to have it explained. Supports MySQL, PostgreSQL, Supabase, BigQuery, and more.
                    </p>
                  </div>

                  {/* Horizontal Checklist from screenshot */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 py-2 text-xs font-medium text-brand-text-muted">
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>100% Free to try</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>10+ SQL dialects</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Instant results</span>
                    </div>
                  </div>

                  <div className="relative border border-brand-border hover:border-brand-accent/40 bg-brand-card rounded-2xl p-8 transition-all duration-300 max-w-md mx-auto lg:mx-0 shadow-md shadow-brand-border/40 group">
                    <input
                      type="file"
                      multiple
                      accept=".csv"
                      onChange={handleFileUpload}
                      id="csv-file-input"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center space-y-4">
                      <div className="w-11 h-11 rounded-xl bg-brand-primary border border-brand-border flex items-center justify-center mx-auto transition-colors group-hover:bg-brand-accent-light/50">
                        <svg className="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-brand-text-dark">Drag & drop CSV(s) here</span>
                        <span className="block text-xs text-brand-text-muted mt-1">or click to browse local files</span>
                      </div>
                      <div className="inline-flex items-center space-x-1 text-[9px] text-brand-text-muted bg-brand-primary px-2.5 py-0.5 rounded border border-brand-border font-mono">
                        <span>RFC 4180 parsing engine</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-3 max-w-md mx-auto lg:mx-0">
                    <button
                      type="button"
                      onClick={handleLoadSampleDatasets}
                      className="px-5 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent-hover active:bg-brand-accent-hover text-white text-xs font-bold shadow-md shadow-brand-accent/20 transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 w-full animate-pulse-slow"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Try with Sample Relational Data</span>
                    </button>

                    <div className="text-[10px] text-brand-text-muted font-mono flex items-center justify-center lg:justify-start space-x-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Zero server logs - 100% processed locally.</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Premium Mockup Window of App NexGenQuery */}
                <div className="lg:col-span-7 flex justify-center w-full">
                  <div className="w-full bg-brand-card border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-lg lg:max-w-none shadow-brand-border/40">
                    {/* Mock macOS Window Header */}
                    <div className="px-4 py-3 border-b border-brand-border bg-brand-primary/60 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                        <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                        <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
                        <span className="pl-2.5 font-mono text-[10px] text-brand-text-muted tracking-wider">GENERATED_QUERY.SQL</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] bg-brand-primary border border-brand-border text-brand-text-muted px-2 py-0.5 rounded font-mono">SQLite-compatible</span>
                      </div>
                    </div>
                    {/* Mock SQL Highlight Preview */}
                    <div className="p-4 bg-brand-primary/20 flex items-center justify-center min-h-[160px]">
                      <img
                        src={heroImage}
                        alt="SQL query preview illustration"
                        className="rounded border border-brand-border max-w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-300 shadow-md"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Pulsing scroll-down indicator at bottom center */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1 text-brand-text-muted font-mono text-[9px] uppercase tracking-wider animate-bounce">
                <span>Compare Modes</span>
                <svg className="w-3.5 h-3.5 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </section>

            {/* Page 2: Simple Mode vs Advanced Mode Comparison Section */}
            <section className="snap-start min-h-[calc(100vh-5rem)] flex-shrink-0 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 w-full border-t border-brand-border bg-brand-primary">
              <div className="w-full max-w-4xl mx-auto text-left">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-text-dark">
                    Compare Workspace Modes
                  </h2>
                  <p className="text-xs sm:text-sm text-brand-text-muted mt-3 leading-relaxed">
                    Choose the workspace layout that matches your workflow. Toggle modes anytime in the top header menu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                  {/* Simple Mode Card */}
                  <div className="p-6 rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark">Simple Mode</h3>
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-brand-primary border border-brand-border text-brand-accent">PRICE: FREE</span>
                      </div>
                      <p className="text-[11px] text-brand-text-muted leading-relaxed mb-6">
                        A clean, visual relational builder designed for quick queries, general table joins, and sequential filters without advanced analytical clutter.
                      </p>
                      <ul className="space-y-2.5 text-[10px] text-brand-text-muted">
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Standard SQL select steps (JOIN Tables, SELECT Columns, WHERE Conditions)</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Standard Joins: INNER JOIN and LEFT JOIN options</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Standard sequential filter rules with OR groups support</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Instant client-side CSV export and interactive results preview</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-8 pt-4 border-t border-brand-border/60 flex items-center justify-between text-[8px] text-brand-text-muted font-mono">
                      <span>PROCESSING: 100% LOCAL</span>
                      <span>PRIVACY: SECURE</span>
                    </div>
                  </div>

                  {/* Advanced Mode Card */}
                  <div className="p-6 rounded-xl border border-brand-accent/20 bg-brand-accent-light/20 hover:bg-brand-accent-light/35 hover:border-brand-accent/40 transition-all duration-300 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">Advanced Mode</h3>
                        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-brand-primary border border-brand-border text-brand-accent">PRICE: FREE</span>
                      </div>
                      <p className="text-[11px] text-brand-text-muted leading-relaxed mb-6">
                        Unlocks visual database diagrams, query presets, aggregations, aliases, and robust group-by analytics for power users.
                      </p>
                      <ul className="space-y-2.5 text-[10px] text-brand-text-muted">
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span><strong>Interactive ERD Map:</strong> Real-time visual table connections and relations</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span><strong>SQL Aggregates & Aliases:</strong> COUNT, SUM, AVG, MIN, MAX & custom AS labels</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span><strong>Expanded Joins:</strong> RIGHT JOIN and FULL OUTER JOIN capabilities</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span><strong>Query Presets:</strong> Persist and reload multi-step queries in LocalStorage</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <svg className="w-3.5 h-3.5 text-brand-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                          <span><strong>GROUP BY Analytics:</strong> Summarize results over matching categories</span>
                        </li>
                      </ul>
                    </div>
                    <div className="mt-8 pt-4 border-t border-brand-border/60 flex items-center justify-between text-[8px] text-brand-text-muted font-mono">
                      <span>PROCESSING: 100% LOCAL</span>
                      <span>PRIVACY: SECURE</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        ) : (
          /* 2. SQL Generator Workspace (Independent scrolls on large screens) */
          <div className="flex-grow w-full max-w-none flex-1 flex flex-col min-h-0 lg:overflow-hidden bg-brand-primary">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full min-h-0 lg:h-full lg:overflow-hidden px-4 sm:px-6 lg:px-8 py-6">

              {/* Left Panel: Table Manager, Steps Wizard + CSV Previews (Scrollable Column) */}
              <div className="lg:col-span-6 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-4 pb-6 scrollbar-thin flex flex-col justify-between min-h-0 text-left">
                <div className="space-y-6 flex-grow">
                  <TableManager
                    files={files}
                    activeFileId={activeFileId}
                    setActiveFileId={setActiveFileId}
                    handleRemoveFile={handleRemoveFile}
                    handleFileUpload={handleFileUpload}
                    joinConfig={joinConfig}
                    presets={presets}
                    handleSavePreset={handleSavePreset}
                    handleLoadPreset={handleLoadPreset}
                    handleDeletePreset={handleDeletePreset}
                    isAdvancedMode={isAdvancedMode}
                  />

                  {isAdvancedMode && (
                    <SchemaVisualizer
                      files={files}
                      activeFile={activeFile}
                      secondaryFile={secondaryFile}
                      joinConfig={joinConfig}
                    />
                  )}

                  <WizardProgress wizardStep={wizardStep} />

                  <div className="space-y-4">
                    {[1, 2, 3].map((stepIndex) => {
                      let title = '';
                      if (stepIndex === 1) title = 'Step 1: JOIN Tables (Optional)';
                      if (stepIndex === 2) title = 'Step 2: SELECT Columns';
                      if (stepIndex === 3) title = 'Step 3: WHERE Conditions';

                      return (
                        <WizardCard
                          key={stepIndex}
                          stepIndex={stepIndex}
                          wizardStep={wizardStep}
                          setWizardStep={setWizardStep}
                          title={title}
                          summary={renderStepSummary(stepIndex)}
                        >
                          {stepIndex === 1 && (
                            <JoinTablesStep
                              joinConfig={joinConfig}
                              setJoinConfig={setJoinConfig}
                              files={files}
                              activeFileId={activeFileId}
                              activeFile={activeFile}
                              secondaryFile={secondaryFile}
                              isAdvancedMode={isAdvancedMode}
                            />
                          )}

                          {stepIndex === 2 && (
                            <SelectColumnsStep
                              searchColumnQuery={searchColumnQuery}
                              setSearchColumnQuery={setSearchColumnQuery}
                              handleSelectAllColumns={handleSelectAllColumns}
                              handleDeselectAllColumns={handleDeselectAllColumns}
                              filteredHeaders={filteredHeaders}
                              queryConfig={queryConfig}
                              joinedData={joinedData}
                              handleToggleColumn={handleToggleColumn}
                              handleUpdateColumnAggregate={handleUpdateColumnAggregate}
                              handleUpdateColumnAlias={handleUpdateColumnAlias}
                              isAdvancedMode={isAdvancedMode}
                            />
                          )}

                          {stepIndex === 3 && (
                            <WhereConditionsStep
                              queryConfig={queryConfig}
                              joinedData={joinedData}
                              handleAddGroup={handleAddFilterGroup}
                              handleRemoveGroup={handleRemoveFilterGroup}
                              handleGroupLogicChange={handleGroupLogicChange}
                              handleGroupConjunctionChange={handleGroupConjunctionChange}
                              handleAddRule={handleAddRuleToGroup}
                              handleRemoveRule={handleRemoveRuleFromGroup}
                              handleRuleChange={handleRuleChange}
                              isAdvancedMode={isAdvancedMode}
                            />
                          )}

                          {/* Footer Action Buttons inside Active Card */}
                          <div className="pt-3 border-t border-brand-border flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                              disabled={stepIndex === 1}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center space-x-1 cursor-pointer ${stepIndex === 1
                                  ? 'text-brand-text-muted bg-brand-primary/50 cursor-not-allowed border border-brand-border/60'
                                  : 'text-brand-text-dark bg-white hover:bg-brand-primary border border-brand-border shadow-sm'
                                }`}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                              </svg>
                              <span>Back</span>
                            </button>

                            {stepIndex < 3 ? (
                              <button
                                type="button"
                                onClick={() => setWizardStep(prev => Math.min(3, prev + 1))}
                                className="px-4 py-2 rounded-lg bg-brand-accent hover:bg-brand-accent-hover active:bg-brand-accent-hover text-white text-[10px] font-bold shadow-sm shadow-brand-accent/15 flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <span>Continue</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-1.5 text-brand-accent bg-brand-accent-light border border-brand-accent/20 px-3 py-1.5 rounded-lg text-[10px] font-semibold">
                                <svg className="w-3.5 h-3.5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Wizard Complete</span>
                              </div>
                            )}
                          </div>
                        </WizardCard>
                      );
                    })}
                  </div>

                  <DatasetPreviews
                    files={files}
                    showCsvPreviewId={showCsvPreviewId}
                    setShowCsvPreviewId={setShowCsvPreviewId}
                  />
                </div>

                {/* Left Panel Inner Footer */}
                <footer className="border border-brand-border py-6 mt-12 bg-brand-card rounded-xl px-4 flex-shrink-0 shadow-sm">
                  <div className="w-full text-center text-[10px] text-brand-text-muted flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="font-mono">
                      &copy; {new Date().getFullYear()} NexGenQuery - Zero-dependency & Private
                    </div>
                    <div className="flex items-center space-x-3">
                      <span>React + Tailwind CSS v4</span>
                      <span className="text-brand-border">|</span>
                      <span>Local sandbox environment</span>
                    </div>
                  </div>
                </footer>
              </div>

              {/* Right Panel: Live SQL Code + Execution Output (Scrollable Column) */}
              <div className="lg:col-span-6 space-y-6 lg:h-full lg:overflow-y-auto lg:pl-4 pb-6 scrollbar-thin min-h-0">
                <SqlPreview
                  sqlQuery={sqlQuery}
                  handleCopySQL={handleCopySQL}
                  handleDownloadSQL={handleDownloadSQL}
                  copySuccess={copySuccess}
                  isAdvancedMode={isAdvancedMode}
                  setIsAdvancedMode={setIsAdvancedMode}
                  hasAdvancedConfigs={hasAdvancedConfigs}
                />

                <ResultsTable
                  queryResults={queryResults}
                  queryConfig={queryConfig}
                  setQueryConfig={setQueryConfig}
                  joinedData={joinedData}
                  showGroupByWarning={showGroupByWarning}
                  nonGroupedColumns={nonGroupedColumns}
                  isAdvancedMode={isAdvancedMode}
                />
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
