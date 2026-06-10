# SQL Query Generator & Local CSV Executor

An interactive, premium client-side web application designed to load multiple CSV datasets, visually configure complex relational SQL queries through an intuitive wizard, preview highlighted SQL, execute queries locally in the browser, and export resulting data.

Built using **React 19**, **Tailwind CSS v4**, and **Vite**.

---

## 🚀 Key Features

* **Multi-File Relational CSV Management**: Load, manage, and inspect multiple CSV files in-memory simultaneously. Automatic data type inference (numeric vs. string) for columns.
* **Step-by-Step SQL Wizard**:
  * **Step 1: SELECT Columns**: Search, filter, and pick columns. Columns are color-coded by detected data type.
  * **Step 2: JOIN Configuration**: Visually configure `INNER JOIN`, `LEFT JOIN`, or `RIGHT JOIN` relations between tables using specified columns.
  * **Step 3: WHERE Conditions**: Formulate nested conditions with operators (`=`, `!=`, `>`, `<`, `IN`, `LIKE`, `IS NULL`, etc.) and choose conjunctions (`AND` / `OR`).
* **Advanced Post-Processing (LIMIT & OFFSET)**:
  * Configure sorting (`ORDER BY`) and group-by keys (`GROUP BY`) with non-aggregated selection warnings.
  * Define record limit slicing (`LIMIT`).
  * Paginated queries support (`OFFSET`), displaying query slices next to limits.
* **Local In-Browser SQL Execution**: Custom SQL query executor engine that filters, groups, sorts, and slices dataset rows 100% on the client side with zero server dependencies.
* **Premium Syntax Highlighted Live Preview**: A custom colorized SQL highlighting panel (inspired by Dracula/Tokyo Night) displaying syntax tokens in real-time.
* **Spreadsheet-Styled Previews & Outputs**:
  * CSV inputs and results display in responsive grid-styled spreadsheet tables.
  * Smart column alignment (numbers align right; strings align left).
* **Exporting Handlers**:
  * Download filtered/joined query results as compliant **CSV** (escapes commas, quotes, and newlines following **RFC 4180** standards).
  * Download results as structured, indented **JSON**.
* **Modern Design & Layout**:
  * Split-viewport layout (`lg` screens lock scroll heights to viewport with dual independent configuration and preview/results scroll columns).
  * Dark-mode palette (`#0a0a0c`), custom micro-animations, and custom slim scrollbars.

---

## 🛠️ Project Structure

```
├── src
│   ├── App.css
│   ├── App.jsx                 # App Entry Point & Wizard State Orchestrator
│   ├── index.css               # Core Styles, Custom Scrollbars, and Theme
│   ├── main.jsx                # DOM mounting
│   ├── components/             # Reusable UI Components
│   │   ├── DatasetPreviews.jsx # Grid view for loaded CSV tables
│   │   ├── JoinTablesStep.jsx  # Card view for JOIN configuration
│   │   ├── ResultsTable.jsx    # Table outputs, post-processing tools, and export buttons
│   │   ├── SelectColumnsStep.jsx # Column selector card
│   │   ├── SqlPreview.jsx      # Highlighted SQL query generator card
│   │   ├── TableManager.jsx    # Left-panel CSV upload and table inventory
│   │   ├── WhereConditionsStep.jsx # Conditions filters editor card
│   │   ├── WizardCard.jsx      # Wizard step wrapper container
│   │   └── WizardProgress.jsx  # Top stepper tracker progress indicator
│   └── utils/                  # Helper Utilities & Execution Engine
│       ├── csvParser.js        # RFC 4180-compliant CSV parser with type detection
│       ├── queryExecutor.js    # Client-side SQL-like executor engine
│       └── sqlGenerator.jsx    # SQL string compiler & token-based syntax highlighter
├── test_offset.js              # Integration test script for query limits and offsets
└── vite.config.js              # Vite configuration with Tailwind CSS v4 support
```

---

## ⚡ Setup & Development

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (recommended version `v18+` or `v20+`).

### Installation
Clone the repository and install the dependencies:
```bash
# Clone the repository
git clone https://github.com/addy1947/sql_query_generator.git
cd sql_query_generator

# Install dependencies
npm install
```

### Run the Development Server
Launch the local dev server at `http://localhost:5173`:
```bash
npm run dev
```

### Build for Production
Bundle the project into a highly optimized, production-ready `/dist` package:
```bash
npm run build
```

### Linter Check
Ensure everything conforms to project quality standards:
```bash
npm run lint
```

---

## 🧪 Slicing & OFFSET Testing
The query executor supports strict paging limits. You can run the CLI integration test script to verify query execution logic:
```bash
npx vite-node test_offset.js
```
The test verifies:
1. SQL generated with `LIMIT 2 OFFSET 2`.
2. Exact matching results (retrieving indices 3 and 4) from the mock array database.

---

## 🎨 Design Philosophy & UX Highlights
* **Zero-Placeholder Policy**: The application provides a **"Try with Sample Relational Data"** button to load structured mock employees and departments datasets instantly.
* **Layout Constraints**: The dashboard layout is fully fluid and uses custom responsive rules to split configuration steps on the left from live results on the right on larger screens, maximizing workspace efficiency.
* **Focus States**: Active wizard cards receive high-contrast white-bordered focus rings and indigo progress line accents.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
