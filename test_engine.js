/* global process */
import { executeQuery } from './src/utils/queryExecutor.js';

// Mock dataset
const employees = [
  { 'employees.id': '101', 'employees.name': 'Alice', 'employees.dept_id': '1', 'employees.salary': '95000' },
  { 'employees.id': '102', 'employees.name': 'Bob', 'employees.dept_id': '2', 'employees.salary': '72000' },
  { 'employees.id': '103', 'employees.name': 'Charlie', 'employees.dept_id': '1', 'employees.salary': '110000' },
  { 'employees.id': '104', 'employees.name': 'Diana', 'employees.dept_id': '3', 'employees.salary': '68000' },
  { 'employees.id': '105', 'employees.name': 'Evan', 'employees.dept_id': '2', 'employees.salary': '80000' },
  { 'employees.id': '106', 'employees.name': 'Frank', 'employees.dept_id': '2', 'employees.salary': 'invalid_num' }
];

const columnTypes = {
  'employees.id': 'numeric',
  'employees.name': 'string',
  'employees.dept_id': 'numeric',
  'employees.salary': 'numeric'
};

console.log('--- STARTING LOCAL ENGINE TESTS ---');

// Test Case 1: Simple Aggregations on all rows (no GROUP BY)
console.log('\nTest Case 1: SUM, AVG, COUNT, MIN, MAX without GROUP BY...');
const config1 = {
  selectColumns: ['employees.salary', 'employees.name'],
  columnAggregates: {
    'employees.salary': 'SUM',
    'employees.name': 'COUNT'
  },
  columnAliases: {
    'employees.salary': 'total_sal',
    'employees.name': 'emp_count'
  },
  conditions: [],
  groupBy: '',
  orderBy: { column: '', direction: 'ASC' }
};

const res1 = executeQuery(employees, config1, columnTypes);
console.log('Result:', res1);
if (res1.length === 1 && res1[0].total_sal === 425000 && res1[0].emp_count === 6) {
  console.log('✅ Test Case 1 Passed');
} else {
  console.error('❌ Test Case 1 Failed');
  process.exit(1);
}

// Test Case 2: GROUP BY with aggregates
console.log('\nTest Case 2: GROUP BY employees.dept_id with AVG salary...');
const config2 = {
  selectColumns: ['employees.dept_id', 'employees.salary'],
  columnAggregates: {
    'employees.salary': 'AVG'
  },
  columnAliases: {
    'employees.salary': 'avg_sal'
  },
  conditions: [],
  groupBy: 'employees.dept_id',
  orderBy: { column: 'employees.dept_id', direction: 'ASC' }
};

const res2 = executeQuery(employees, config2, columnTypes);
console.log('Result:', res2);
if (res2.length === 3 && res2[0].avg_sal === 102500 && res2[1].avg_sal === 76000 && res2[2].avg_sal === 68000) {
  console.log('✅ Test Case 2 Passed');
} else {
  console.error('❌ Test Case 2 Failed');
  process.exit(1);
}

// Test Case 3: Sorting by Aggregate Alias
console.log('\nTest Case 3: Order by aggregate alias avg_sal DESC...');
const config3 = {
  selectColumns: ['employees.dept_id', 'employees.salary'],
  columnAggregates: {
    'employees.salary': 'AVG'
  },
  columnAliases: {
    'employees.salary': 'avg_sal'
  },
  conditions: [],
  groupBy: 'employees.dept_id',
  orderBy: { column: 'employees.salary', direction: 'DESC' }
};

const res3 = executeQuery(employees, config3, columnTypes);
console.log('Result:', res3);
if (res3.length === 3 && res3[0].avg_sal === 102500 && res3[1].avg_sal === 76000 && res3[2].avg_sal === 68000) {
  console.log('✅ Test Case 3 Passed');
} else {
  console.error('❌ Test Case 3 Failed');
  process.exit(1);
}

// Test Case 4: Filter Groups (OR clause system) evaluation
console.log('\nTest Case 4: Filter Groups logic with OR block...');
const config4 = {
  selectColumns: ['employees.id', 'employees.name', 'employees.dept_id'],
  conditions: [
    {
      id: 'grp-1',
      conjunction: 'AND',
      logic: 'AND',
      rules: [
        { id: 'r1', column: 'employees.dept_id', operator: '=', value: '1' }
      ]
    },
    {
      id: 'grp-2',
      conjunction: 'AND',
      logic: 'OR',
      rules: [
        { id: 'r2', column: 'employees.salary', operator: '>', value: '100000' },
        { id: 'r3', column: 'employees.name', operator: '=', value: 'Alice' }
      ]
    }
  ],
  columnAggregates: {},
  columnAliases: {},
  groupBy: '',
  orderBy: { column: 'employees.id', direction: 'ASC' }
};

const res4 = executeQuery(employees, config4, columnTypes);
console.log('Result:', res4);
if (res4.length === 2 && res4[0]['employees.id'] === '101' && res4[1]['employees.id'] === '103') {
  console.log('✅ Test Case 4 Passed');
} else {
  console.error('❌ Test Case 4 Failed');
  process.exit(1);
}

console.log('\n--- ALL TESTS PASSED ---');
