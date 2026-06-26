# Query Generator Enhancements Reference

This file outlines the visual and architectural query generator improvements introduced to the project workspace. All features operate **100% locally in the browser** without any server dependencies, keeping data fully private.

---

## 🚀 Added Features

### 1. SQL Aggregations & Function Support
* **What it does:** Allows grouping data and calculating calculations like sums, counts, averages, minimums, and maximums over row categories.
* **Aggregates Supported:**
  * `COUNT`: Counts non-blank records in a group.
  * `SUM` (Numeric columns only): Sums numeric values.
  * `AVG` (Numeric columns only): Calculates averages of values.
  * `MIN`: Standard minimum (lexicographical or numeric).
  * `MAX`: Standard maximum (lexicographical or numeric).
* **How to use it:**
  1. Under **Step 1: SELECT Columns**, check a checkbox to select a column.
  2. Click the new **Function** dropdown that appears inside the column card.
  3. Select your desired aggregate function. (Numeric functions are automatically hidden for text columns).
  4. Ensure a **GROUP BY** column is configured in the Results panel toolbar if combining aggregated and non-aggregated selection columns (or leave GROUP BY unselected to aggregate the entire dataset into a single row).

### 2. Custom Column Aliasing (`AS` keyword)
* **What it does:** Allows giving columns custom name labels (e.g. renaming `employees.salary` to `base_pay` or `SUM(employees.salary)` to `total_payroll`).
* **How to use it:**
  1. Under **Step 1: SELECT Columns**, check a checkbox to select a column.
  2. Locate the **Alias (AS)** text field that appears inside the selected column's card.
  3. Enter a custom name.
  4. The generated SQL syntax will compile with `AS alias_name`, and the client-side execution table headers will automatically rename to your alias. Sorting (ORDER BY) will also resolve and sort using this alias.

### 3. Expanded Join Types (`RIGHT JOIN` & `FULL OUTER JOIN`)
* **What it does:** Supports relational joining across multiple tables where left/right table records do not necessarily line up.
* **Join Directions Supported:**
  * `INNER JOIN`: Keep records matching in both tables.
  * `LEFT JOIN`: Keep all primary rows, padding non-matching secondary fields with nulls.
  * `RIGHT JOIN` (New): Keep all secondary rows, padding non-matching primary fields with nulls.
  * `FULL OUTER JOIN` (New): Keep all rows from both tables, matching columns where values correspond, and padding unmatched spaces.
* **How to use it:**
  1. Load at least two CSV files.
  2. Under **Step 2: JOIN Tables**, check **Enable Relational Table JOIN**.
  3. Select your secondary join table and configure matching key pairs.
  4. Click the **Join Direction** dropdown and choose either `RIGHT JOIN` or `FULL OUTER JOIN`.

### 4. Saved Query Presets (Save & Load)
* **What it does:** Persists query selections, joins, filters, sorting, and limits to the browser's `localStorage` so configurations are not lost on refresh.
* **How to use it:**
  1. Build your query using the stepper.
  2. In the left sidebar under the **Workspace Tables** list, locate the **Saved Query Presets** section.
  3. Type a descriptive name in the input box (e.g., `Active London Employees`).
  4. Click **Save Current** or press **Enter**.
  5. The query saves instantly. To restore it later, click its name in the saved queries inventory. To delete a preset, click its trashcan icon.

### 5. Interactive Schema Map (ERD)
* **What it does:** Renders a visual schematic representing all loaded tables, their headers, their data types, and highlights their relations in real-time.
* **Visual Elements:**
* Displays table cards side-by-side inside an interactive, collapsible dashboard card.
* Shows column items styled with type badges (Amber circles for numeric columns, Indigo circles for string columns).
* Draws a smooth, glowing cubic bezier connector curve linking join key columns when table joins are active.
* Displays a floating join type indicator badge (e.g. `INNER JOIN`, `FULL OUTER JOIN`) directly on top of the connection path.
* The path animates with a glowing pulse and flowing dash pattern to signify an active database mapping.
* **How to use it:**
  1. Simply load one or more CSV files. The schema cards render automatically under **Workspace Schema Map (ERD)**.
  2. Configure a JOIN connection in Step 2: you will instantly see the glowing connector line trace between the matched columns.

### 6. Simple vs. Advanced Mode Toggle
* **What it does:** Simplifies the visual interface for beginners by hiding complex configurations (aggregations, aliases, RIGHT/FULL outer joins, ERD visualizer, presets, and GROUP BY) while preserving active advanced configurations under the hood.
* **Landing Page Comparison Section:**
  * Displays a full-width visual grid comparing Simple Mode and Advanced Mode features on the empty workspace landing page.
  * States explicitly that both modes are **100% Free** and process data **100% locally** on the client side (full local side privacy).
* **Warning Safety Banner:**
  * If the user configures advanced features (e.g., aliases or full joins) in Advanced Mode, and then switches back to Simple Mode, their advanced configurations are **not erased**.
  * Instead, a prominent Indigo warning banner is displayed directly above the generated SQL query preview.
  * The banner states: *"Query contains advanced configurations (aggregations, aliases, or joins)."*
  * It includes a quick-action **[Switch to Advanced]** button to easily jump back to Advanced Mode and restore full visual controls.
* **How to use it:**
  1. Toggle **Switch to Advanced / Advanced Mode: ON** in the header next to the Reset Workspace button.
  2. The ERD schema visualizer, query presets, aggregations, aliases, and outer join modes become visible.
  3. Toggle it back off: the visual controls hide, but active configurations continue to compile. Click **Switch to Advanced** on the warning banner to show the advanced controls again.

### 7. Logical Filter Groups (OR Clause System) - Both Modes
* **What it does:** Enables building complex logical condition sets grouped inside parentheses (e.g., `(A AND B) OR (C AND D)` or `A AND (B OR C)`) rather than chaining conditions in a single flat list.
* **Visual Elements:**
  * Conditions are constructed inside rounded filter group card containers.
  * Inside each group:
    * Select logic dropdown: `ALL (AND)` vs `ANY (OR)` to define how rules inside the group are evaluated.
  * Across multiple groups:
    * Select conjunction dropdown: `AND` vs `OR` to define how groups link sequentially.
    * Parentheses are automatically generated around each group in the compiled SQL code, resolving operator precedence correctly.
  * Works in both Simple and Advanced modes.
* **How to use it:**
  1. Navigate to **Step 3: WHERE Conditions**.
  2. Click **Add Filter Group** to create a parenthesized logical group container.
  3. Click **Add Rule to Group** to add column conditions (Column, Operator, Value) inside a specific container.
  4. Toggle group matching to `ANY (OR)` to join rules using OR clauses, or keep it on `ALL (AND)`.
  5. If multiple groups exist, choose the connector operator (`AND` / `OR`) in group headers.


---

## ⚡ User & System Impact

1. **Enhanced Data Summarization:** Users are no longer limited to simple filtering. They can now calculate metrics directly on their CSV data (such as finding department counts or average salaries) on-the-fly.
2. **True Client-Side SQL Engine:** The client-side virtual database simulator in `queryExecutor.js` was refactored into a full aggregation compiler, supporting complex SQL groupings, aggregate lookups, and aliased sorting pipelines.
3. **Workspace Memory and Preservation:** Local query configurations are now fully recoverable. Users can switch between files or reload their browser tab without having to re-configure multi-step query filters.
4. **Adaptive UX for Diverse Skill Levels:** Simple Mode keeps the interface friendly and focused for standard SELECT/JOIN/WHERE queries, while Advanced Mode unleashes full aggregation and schema visualization power, ensuring both sets of users can co-exist without losing work.

