import { useState, useMemo } from 'react';
import { generateSQL } from '../utils/sqlGenerator';
import { executeQuery } from '../utils/queryExecutor';

/**
 * Custom React hook to orchestrate SQL query compilation, local memory execution,
 * warnings check, and output operations (clipboard copy & file download).
 *
 * @param {Object} params
 * @param {Object} params.activeFile Active main dataset details
 * @param {Object} params.secondaryFile Joined relation dataset details
 * @param {Object} params.queryConfig Builder steps selections state
 * @param {Object} params.joinConfig Stepper JOIN properties state
 * @param {Object} params.joinedData Preprocessed combined dataset headers, rows, and types
 */
export function useQueryGenerator({
  activeFile,
  secondaryFile,
  queryConfig,
  joinConfig,
  joinedData
}) {
  const [copySuccess, setCopySuccess] = useState(false);

  // 1. Compile SQL representation from settings
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
      join: joinParams,
      columnAggregates: queryConfig.columnAggregates,
      columnAliases: queryConfig.columnAliases
    });
  }, [activeFile, queryConfig, joinedData.columnTypes, joinConfig, secondaryFile]);

  // 2. Execute processed query results
  const queryResults = useMemo(() => {
    if (joinedData.rows.length === 0) return [];
    return executeQuery(
      joinedData.rows,
      queryConfig,
      joinedData.columnTypes
    );
  }, [joinedData.rows, queryConfig, joinedData.columnTypes]);

  // 3. GROUP BY Aggregations mismatch warning checks
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

  // 4. Output handlers
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

  return {
    sqlQuery,
    queryResults,
    showGroupByWarning,
    nonGroupedColumns,
    copySuccess,
    handleCopySQL,
    handleDownloadSQL
  };
}
