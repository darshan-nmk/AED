# Demo Content Overview

This directory contains everything needed for AED presentations and demos.

## 📁 Directory Structure

```
demo/
├── sample_data/          # Sample CSV files for demos
│   ├── customers.csv     # 10 customer records
│   ├── orders.csv        # 15 order records
│   └── products.csv      # 8 product records
│
├── pipelines/            # Pre-built pipeline examples
│   └── README.md         # Pipeline documentation
│
├── PRESENTATION_GUIDE.md # Complete demo script (15-20 min)
└── README.md            # This file
```

## 🎯 Quick Start

### For Presenters:
1. Read `PRESENTATION_GUIDE.md` for complete demo script
2. Upload sample data from `sample_data/` folder
3. Follow the step-by-step guide
4. Total demo time: 15-20 minutes

### For Testing:
1. Copy CSV files to backend uploads folder:
   ```powershell
   Copy-Item demo/sample_data/*.csv backend/uploads/
   ```
2. Use these files to test transformations
3. Verify all 24 node types work correctly

## 📊 Sample Data Description

### customers.csv (10 records)
- **Columns:** customer_id, name, email, country, registration_date, age, premium_member
- **Use Cases:** Customer segmentation, demographic analysis, membership tracking
- **Countries:** USA, UK, Spain, Japan, France, Egypt, Mexico, China, Poland, Canada

### orders.csv (15 records)
- **Columns:** order_id, customer_id, product_id, order_date, quantity, total_amount, status
- **Use Cases:** Sales analysis, order tracking, revenue calculations
- **Date Range:** March 2024
- **Statuses:** completed, pending, shipped, cancelled

### products.csv (8 records)
- **Columns:** product_id, product_name, category, price, stock_quantity, supplier
- **Use Cases:** Inventory management, product performance, supplier analysis
- **Categories:** Electronics, Appliances, Sports, Home, Accessories

## 🔗 Relationships

```
customers (customer_id) ←→ orders (customer_id)
products (product_id)   ←→ orders (product_id)
```

This enables JOIN demonstrations showing:
- Customer purchase history
- Product sales by customer
- Revenue by country/category
- Inventory vs. sales analysis

## 🎬 Demo Scenarios

### Scenario 1: Sales Analysis
**Pipeline:** customers → orders → products (JOIN) → FILTER(completed) → AGGREGATE(by country) → SORT

**Output:** Total sales and order count by country

### Scenario 2: Inventory Alert
**Pipeline:** products → orders (JOIN) → FILTER(stock < 200) → SORT(by stock)

**Output:** Products needing restock

### Scenario 3: Customer Segmentation
**Pipeline:** customers → FILTER(age > 30) → GROUP BY(country, premium_member)

**Output:** Customer distribution by demographics

## 💡 Tips for Effective Demos

1. **Start Simple:** Begin with single-file LOAD → FILTER → SORT
2. **Build Complexity:** Add JOINs and AGGREGATEs progressively
3. **Show AI Features:** Highlight suggestions panel at each step
4. **Demonstrate Errors:** Intentionally create validation errors to show error handling
5. **Preview Data:** Use data preview at multiple transformation steps
6. **Monitor Execution:** Show real-time logs and progress tracking

## 📈 Expected Results

### Customer Sales Analysis (Combined Data)
```
country | total_orders | total_revenue | avg_order_value
--------|--------------|---------------|----------------
USA     | 5            | 749.95        | 149.99
UK      | 2            | 239.96        | 119.98
Japan   | 1            | 99.99         | 99.99
...
```

### Top Products by Revenue
```
product_name         | category    | total_sales | units_sold
---------------------|-------------|-------------|------------
Wireless Headphones  | Electronics | 449.97      | 3
Smart Watch          | Electronics | 749.95      | 5
Coffee Maker         | Appliances  | 149.95      | 5
```

### Customer Segments
```
country | premium_member | customer_count
--------|----------------|---------------
USA     | true           | 1
UK      | true           | 1
France  | false          | 1
...
```

## 🚀 Advanced Demo Ideas

1. **Data Quality Check:**
   - Show NULL detection
   - Demonstrate duplicate removal
   - Highlight validation warnings

2. **Complex Transformations:**
   - Nested aggregations
   - Multiple JOINs
   - Conditional ADD COLUMN

3. **Performance Monitoring:**
   - Show execution time for each node
   - Compare different transformation approaches
   - Demonstrate pipeline optimization

4. **Collaboration Features:**
   - Save and share pipelines
   - Version control (manual naming)
   - Export/import pipeline JSON

## 📝 Customization

To create your own demo data:

1. **Keep it realistic** - Use business-relevant scenarios
2. **Keep it small** - 10-20 records per file for quick demos
3. **Show variety** - Include different data types, nulls, duplicates
4. **Enable joins** - Ensure foreign key relationships exist
5. **Include edge cases** - Dates, special characters, large numbers

## 🎓 Training Materials

Use these datasets for:
- User training sessions
- Documentation screenshots
- Tutorial videos
- Testing new features
- Performance benchmarking

## 📞 Support

For questions about demo content:
- Check `PRESENTATION_GUIDE.md` for detailed walkthrough
- Review main `README.md` for feature documentation
- See `pipelines/README.md` for pipeline examples

---

**Ready to present? Start with `PRESENTATION_GUIDE.md`! 🎯**
