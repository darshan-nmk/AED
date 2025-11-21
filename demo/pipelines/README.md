# Demo Pipeline Examples

This folder contains pre-configured pipeline examples for demonstrations.

## Available Demo Pipelines

### 1. Customer Sales Analysis (`customer_sales_analysis.json`)
**Purpose:** Demonstrates JOIN, FILTER, AGGREGATE, and SORT operations

**Flow:**
1. Load customers.csv
2. Load orders.csv  
3. Load products.csv
4. JOIN customers with orders (on customer_id)
5. JOIN with products (on product_id)
6. FILTER: Only completed orders
7. AGGREGATE: Total sales by country
8. SORT: By total amount (descending)

**Key Features:**
- Multi-table JOIN operations
- Data filtering
- Grouping and aggregation
- Sorting results

---

### 2. Product Performance Report (`product_performance.json`)
**Purpose:** Shows AI-powered validation and data quality checks

**Flow:**
1. Load orders.csv
2. Load products.csv
3. JOIN orders with products
4. AGGREGATE: Sales by product category
5. ADD COLUMN: Profit margin calculation
6. FILTER: Products with stock < 200
7. SORT: By revenue (descending)

**AI Features:**
- Column type inference
- Validation suggestions
- Error detection

---

### 3. Customer Segmentation (`customer_segmentation.json`)
**Purpose:** Demonstrates advanced transformations and AI suggestions

**Flow:**
1. Load customers.csv
2. FILTER: Age > 30
3. ADD COLUMN: Customer tier (based on premium status)
4. GROUP BY: Country
5. AGGREGATE: Count by country and tier
6. SORT: By customer count

**AI Features:**
- Automated column suggestions
- Data type validation
- Transformation recommendations

---

## How to Use

1. **Upload Sample Data:**
   - Navigate to the Editor page
   - Upload `customers.csv`, `orders.csv`, and `products.csv`

2. **Import Pipeline:**
   - Go to Pipelines page
   - Click "Import Pipeline"
   - Select one of the demo JSON files

3. **Run Pipeline:**
   - Open the pipeline in Editor
   - Click "Run Pipeline"
   - View results and logs

4. **Explore Features:**
   - Try modifying transformations
   - Use AI suggestions panel
   - Check validation warnings
   - Preview data at each step

## Expected Results

### Customer Sales Analysis
- Output: Sales totals grouped by country
- Columns: country, total_orders, total_revenue, avg_order_value
- Example: USA: 5 orders, $749.95 total

### Product Performance  
- Output: Top selling products with stock alerts
- Columns: product_name, category, total_sales, stock_quantity, profit_margin
- Highlights products needing restock

### Customer Segmentation
- Output: Customer distribution by country and membership tier
- Columns: country, tier, customer_count
- Insights: Premium vs regular customer distribution
