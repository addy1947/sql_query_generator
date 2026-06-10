import { useState, useMemo, useEffect } from 'react';
import { parseCSV } from './utils/csvParser';
import { generateSQL } from './utils/sqlGenerator';
import { executeQuery } from './utils/queryExecutor';
import './App.css';

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
    conditions: [],    // { id, column, operator, value, conjunction }
    groupBy: '',
    orderBy: { column: '', direction: 'ASC' },
    limit: '',
    offset: ''
  });

  // Expandable state for original CSV previews
  const [showCsvPreviewId, setShowCsvPreviewId] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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
    const isLeftJoin = joinConfig.type === 'LEFT JOIN';
    
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

    const rows = [];
    for (const pRow of activeFile.rows) {
      const pVal = pRow[leftKey];
      let matches = [];

      if (pVal !== undefined && pVal !== null && pVal !== '') {
        matches = secondaryFile.rows.filter(sRow => {
          const sVal = sRow[rightKey];
          if (sVal === undefined || sVal === null || sVal === '') return false;
          return sVal.toString().toLowerCase() === pVal.toString().toLowerCase();
        });
      }

      if (matches.length > 0) {
        for (const mRow of matches) {
          rows.push({
            ...prefixRow(pRow, primaryPrefix),
            ...prefixRow(mRow, secondaryPrefix)
          });
        }
      } else if (isLeftJoin) {
        // Build null row representation for secondary columns
        const nullSecondary = {};
        secondaryFile.headers.forEach(h => {
          nullSecondary[`${secondaryPrefix}.${h}`] = '';
        });
        rows.push({
          ...prefixRow(pRow, primaryPrefix),
          ...nullSecondary
        });
      }
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

      return {
        ...prev,
        selectColumns: validSelects,
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
        conditions: [
          {
            id: 'cond-1',
            column: `${ePrefix}.salary`,
            operator: '>',
            value: '70000',
            conjunction: 'AND'
          }
        ],
        groupBy: '',
        orderBy: { column: `${ePrefix}.salary`, direction: 'DESC' },
        limit: '10'
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

  const filteredHeaders = useMemo(() => {
    return joinedData.headers.filter(h => 
      h.toLowerCase().includes(searchColumnQuery.toLowerCase())
    );
  }, [joinedData.headers, searchColumnQuery]);

  // ----------------------------------------------------
  // Condition Handlers (Step 3)
  // ----------------------------------------------------
  const handleAddCondition = () => {
    setQueryConfig(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: Date.now().toString(),
          column: joinedData.headers[0] || '',
          operator: '=',
          value: '',
          conjunction: 'AND'
        }
      ]
    }));
  };

  const handleRemoveCondition = (id) => {
    setQueryConfig(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id)
    }));
  };

  const handleConditionChange = (id, field, val) => {
    setQueryConfig(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === id ? { ...c, [field]: val } : c
      )
    }));
  };

  // ----------------------------------------------------
  // Live SQL Generator & Query Executor
  // ----------------------------------------------------
  const sqlQuery = useMemo(() => {
    if (!activeFile) return '';
    
    const joinParams = {
      enabled: joinConfig.enabled && !!secondaryFile && !!joinConfig.leftKey && !!joinConfig.rightKey,
      type: joinConfig.type,
      tableName: secondaryFile ? secondaryFile.nameWithoutExt : '',
      leftKey: joinConfig.leftKey,
      rightKey: joinConfig.rightKey
    };

    return generateSQL({
      tableName: activeFile.nameWithoutExt,
      selectColumns: queryConfig.selectColumns,
      conditions: queryConfig.conditions,
      groupBy: queryConfig.groupBy,
      orderBy: queryConfig.orderBy,
      limit: queryConfig.limit,
      offset: queryConfig.offset,
      columnTypes: joinedData.columnTypes,
      join: joinParams
    });
  }, [activeFile, queryConfig, joinedData.columnTypes, joinConfig, secondaryFile]);

  const queryResults = useMemo(() => {
    if (joinedData.rows.length === 0) return [];
    return executeQuery(
      joinedData.rows,
      queryConfig,
      joinedData.columnTypes
    );
  }, [joinedData.rows, queryConfig, joinedData.columnTypes]);

  // GROUP BY Aggregate warning check
  const showGroupByWarning = useMemo(() => {
    if (!queryConfig.groupBy) return false;
    if (queryConfig.selectColumns.length === 0) return true;
    const hasNonGroupedSelections = queryConfig.selectColumns.some(col => col !== queryConfig.groupBy);
    return hasNonGroupedSelections;
  }, [queryConfig.groupBy, queryConfig.selectColumns]);

  const nonGroupedColumns = useMemo(() => {
    if (!queryConfig.groupBy) return [];
    if (queryConfig.selectColumns.length === 0) {
      return joinedData.headers.filter(h => h !== queryConfig.groupBy);
    }
    return queryConfig.selectColumns.filter(col => col !== queryConfig.groupBy);
  }, [queryConfig.groupBy, queryConfig.selectColumns, joinedData.headers]);

  // ----------------------------------------------------
  // Output utilities
  // ----------------------------------------------------
  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(sqlQuery);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadSQL = () => {
    const element = document.createElement('a');
    const fileBlob = new Blob([sqlQuery], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(fileBlob);
    
    const nameWithoutExt = activeFile ? activeFile.nameWithoutExt : 'query';
    element.download = `${nameWithoutExt}.sql`;
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ----------------------------------------------------
  // Rendering Helpers
  // ----------------------------------------------------
  const renderStepSummary = (stepNum) => {
    switch (stepNum) {
      case 1:
        return queryConfig.selectColumns.length === 0
          ? 'SELECT * (All columns)'
          : `SELECT ${queryConfig.selectColumns.join(', ')}`;
      case 2:
        return joinConfig.enabled && secondaryFile && joinConfig.leftKey && joinConfig.rightKey
          ? `${joinConfig.type} \`${secondaryFile.nameWithoutExt}\` ON \`${activeFile.nameWithoutExt}\`.\`${joinConfig.leftKey}\` = \`${secondaryFile.nameWithoutExt}\`.\`${joinConfig.rightKey}\``
          : 'No relational join configured';
      case 3: {
        const activeConds = queryConfig.conditions.filter(c => 
          c.column && (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL' || (c.value !== undefined && c.value !== null && c.value.trim() !== ''))
        );
        if (activeConds.length === 0) return 'No filters applied';
        return activeConds.map((c, i) => {
          const conj = i > 0 ? ` ${c.conjunction} ` : '';
          const valText = (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL') ? '' : ` '${c.value}'`;
          return `${conj}${c.column} ${c.operator}${valText}`;
        }).join('');
      }
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-200 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      {/* Top navbar (Full-Screen Width) */}
      <header className="border-b border-zinc-900 bg-[#0a0a0c]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-zinc-200 text-zinc-950 flex items-center justify-center font-bold shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-white block">SQL builder</span>
              <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-medium">In-Browser Relational Engine</span>
            </div>
          </div>
          {files.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 text-zinc-100 font-medium transition-all duration-200 flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Reset Workspace</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-none flex flex-col min-h-0">
        {/* Error notification */}
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-6 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-xs whitespace-pre-line flex items-start space-x-3 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-semibold block text-white">Parser notifications:</span>
              <p className="leading-relaxed mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {files.length === 0 ? (
          /* Empty Upload State */
          <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl w-full text-center">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">
                  SQL Query Builder
                </h1>
                <p className="mt-3 text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                  Upload one or more CSV files, configure joins, build query rules visually, and execute them instantly in your browser.
                </p>
              </div>

              <div className="relative border border-zinc-800 hover:border-zinc-700 bg-[#0c0c0e] rounded-xl p-10 transition-all duration-300">
                <input
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFileUpload}
                  id="csv-file-input"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-zinc-200">Drag & drop your CSV file(s) here</span>
                    <span className="block text-xs text-zinc-500 mt-1">or click to select multiple files</span>
                  </div>
                  <div className="inline-flex items-center space-x-2 text-[10px] text-zinc-400 bg-[#0a0a0c] px-3 py-1 rounded-full border border-zinc-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                    <span>Purely client-side CSV parsing (RFC 4180)</span>
                  </div>
                </div>
              </div>

              {/* Try with sample data */}
              <div className="mt-6 text-center">
                <span className="text-zinc-700 text-xs font-mono block mb-3">&mdash; OR &mdash;</span>
                <button
                  type="button"
                  onClick={handleLoadSampleDatasets}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-950/50 transition-all duration-200 cursor-pointer flex items-center space-x-2 mx-auto"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Try with Sample Relational Data</span>
                </button>
              </div>
              
              <div className="mt-12 text-center text-[10px] text-zinc-400 font-mono">
                Your files never touch any servers. 100% in-browser processing.
              </div>
            </div>
          </div>
        ) : (
          /* 2. SQL Generator Workspace (Independent scrolls on large screens) */
          <div className="flex-grow w-full max-w-none flex-1 flex flex-col min-h-0">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full min-h-0 lg:h-[calc(100vh-4rem)] lg:overflow-hidden px-4 sm:px-6 lg:px-8 py-6">
              
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
                  />
                  
                  <WizardProgress wizardStep={wizardStep} />

                  <div className="space-y-4">
                    {[1, 2, 3].map((stepIndex) => {
                      let title = '';
                      if (stepIndex === 1) title = 'Step 1: SELECT Columns';
                      if (stepIndex === 2) title = 'Step 2: JOIN Tables (Optional)';
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
                            <SelectColumnsStep
                              searchColumnQuery={searchColumnQuery}
                              setSearchColumnQuery={setSearchColumnQuery}
                              handleSelectAllColumns={handleSelectAllColumns}
                              handleDeselectAllColumns={handleDeselectAllColumns}
                              filteredHeaders={filteredHeaders}
                              queryConfig={queryConfig}
                              joinedData={joinedData}
                              handleToggleColumn={handleToggleColumn}
                            />
                          )}

                          {stepIndex === 2 && (
                            <JoinTablesStep
                              joinConfig={joinConfig}
                              setJoinConfig={setJoinConfig}
                              files={files}
                              activeFileId={activeFileId}
                              activeFile={activeFile}
                              secondaryFile={secondaryFile}
                            />
                          )}

                          {stepIndex === 3 && (
                            <WhereConditionsStep
                              queryConfig={queryConfig}
                              joinedData={joinedData}
                              handleConditionChange={handleConditionChange}
                              handleRemoveCondition={handleRemoveCondition}
                              handleAddCondition={handleAddCondition}
                            />
                          )}

                          {/* Footer Action Buttons inside Active Card */}
                          <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                              disabled={stepIndex === 1}
                              className={`px-3 py-1.5 rounded text-[10px] font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                                stepIndex === 1
                                  ? 'text-zinc-500 bg-zinc-900/10 cursor-not-allowed border border-zinc-900'
                                  : 'text-zinc-100 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 shadow-sm'
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
                                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[10px] font-bold shadow-sm shadow-indigo-900/25 flex items-center space-x-1 cursor-pointer transition-all"
                              >
                                <span>Continue</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-1.5 text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-[10px] font-semibold">
                                <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <footer className="border-t border-zinc-900 py-6 mt-12 bg-[#070708] rounded-xl px-4 flex-shrink-0">
                  <div className="w-full text-center text-[10px] text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="font-mono">
                      &copy; {new Date().getFullYear()} SQL Builder - Zero-dependency & Private
                    </div>
                    <div className="flex items-center space-x-3">
                      <span>React + Tailwind CSS v4</span>
                      <span className="text-zinc-800">|</span>
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
                />
                
                <ResultsTable
                  queryResults={queryResults}
                  queryConfig={queryConfig}
                  setQueryConfig={setQueryConfig}
                  joinedData={joinedData}
                  showGroupByWarning={showGroupByWarning}
                  nonGroupedColumns={nonGroupedColumns}
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
