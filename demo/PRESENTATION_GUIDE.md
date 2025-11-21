# AED Presentation Demo Guide

## 🎯 Presentation Overview
**Duration:** 15-20 minutes  
**Audience:** Technical stakeholders, Product managers, Data engineers  
**Goal:** Showcase AED's no-code ETL capabilities with AI-powered features

---

## 📋 Pre-Demo Checklist

- [ ] Backend server running (`http://localhost:8000`)
- [ ] Frontend running (`http://localhost:5173`)
- [ ] Database initialized (MySQL running)
- [ ] Demo data files ready in `demo/sample_data/`
- [ ] Browser with demo account logged in
- [ ] Second browser tab for documentation (README.md)

---

## 🎬 Demo Script

### Part 1: Introduction (2 minutes)

**Opening Statement:**
> "AED - Automated ETL Designer is a visual, no-code platform that enables anyone to build complex data pipelines without writing code. It combines drag-and-drop simplicity with AI-powered intelligence to automate data transformation workflows."

**Key Points to Highlight:**
- ✅ 24 built-in transformation nodes
- ✅ Visual pipeline designer
- ✅ AI-powered suggestions and validation
- ✅ Real-time execution and monitoring
- ✅ No coding required

---

### Part 2: User Authentication (1 minute)

**Steps:**
1. Show Login page
2. Register new account (or login with existing)
3. Briefly show Profile page features:
   - Edit profile information
   - Change password
   - Theme toggle (light/dark)

**Talking Points:**
> "Security is built-in with JWT authentication. Users can manage their profiles and preferences easily."

---

### Part 3: Settings Configuration (1 minute)

**Steps:**
1. Navigate to Settings page
2. Show configuration options:
   - Workspace name
   - Pipeline timeout settings
   - Email notifications toggle

**Talking Points:**
> "Each user can customize their workspace settings. Pipeline timeouts prevent runaway processes, and notifications keep teams informed."

---

### Part 4: Data Upload (2 minutes)

**Steps:**
1. Navigate to Editor page
2. Click "Upload File"
3. Upload all three demo files:
   - `customers.csv` (10 records)
   - `orders.csv` (15 records)
   - `products.csv` (8 records)
4. Show file preview modal for each

**Talking Points:**
> "Data ingestion is simple - just upload CSV files. AED automatically detects column types and shows previews. Notice how it validates data quality immediately."

**Key Observations:**
- Show column count and row count
- Point out data type detection
- Mention file size handling (up to 100MB)

---

### Part 5: Building a Pipeline (5-7 minutes)

#### Demo Pipeline: "Customer Sales Analysis"

**Step 1: Add Source Nodes**
1. Drag "LOAD" node from palette (3 times)
2. Configure each to load:
   - Node 1: customers.csv
   - Node 2: orders.csv
   - Node 3: products.csv
3. Show node configuration panel

**Talking Point:**
> "The node palette on the left contains all 24 transformation types. Simply drag and drop to build your pipeline."

---

**Step 2: JOIN Customers with Orders**
1. Drag "JOIN" node to canvas
2. Connect customers node → JOIN
3. Connect orders node → JOIN
4. Configure:
   - Left dataset: customers
   - Right dataset: orders
   - Join type: INNER
   - Join column: customer_id

**Talking Point:**
> "The JOIN transformation supports all SQL-style joins: inner, left, right, and outer. Notice how the AI suggests matching columns based on their names."

**AI Feature Highlight:**
> "See the suggestions panel? It's recommending that we join on 'customer_id' because it detected the common column. This is AI-powered intelligence at work."

---

**Step 3: JOIN with Products**
1. Drag another "JOIN" node
2. Connect previous JOIN → new JOIN
3. Connect products node → new JOIN
4. Configure:
   - Join column: product_id
   - Join type: INNER

**Talking Point:**
> "We can chain transformations seamlessly. This creates a complete view combining customer, order, and product data."

---

**Step 4: Filter Completed Orders**
1. Drag "FILTER" node
2. Connect from previous JOIN
3. Configure:
   - Column: status
   - Condition: EQUALS
   - Value: "completed"

**Talking Point:**
> "Filtering is intuitive. We support 8 comparison operators: equals, not equals, greater than, less than, contains, starts with, ends with, and regex."

---

**Step 5: Aggregate Sales by Country**
1. Drag "AGGREGATE" node
2. Configure:
   - Group by: country
   - Aggregations:
     * COUNT(order_id) → total_orders
     * SUM(total_amount) → total_revenue
     * AVG(total_amount) → avg_order_value

**Talking Point:**
> "The aggregate node supports 6 functions: sum, average, min, max, count, and count distinct. You can add multiple aggregations in one step."

---

**Step 6: Sort Results**
1. Drag "SORT" node
2. Configure:
   - Column: total_revenue
   - Order: DESCENDING

**Talking Point:**
> "Finally, we sort to see which countries generate the most revenue."

---

**Step 7: Save Pipeline**
1. Click "Save Pipeline"
2. Name: "Customer Sales Analysis"
3. Add description: "Analyzes sales performance by country"

---

### Part 6: Pipeline Execution (3 minutes)

**Steps:**
1. Click "Run Pipeline"
2. Show real-time progress:
   - Execution logs appearing
   - Node status updates (pending → running → completed)
   - Progress percentage
3. Navigate to Runs page
4. Show run history with:
   - Status (success/failed)
   - Duration
   - Timestamp
5. Click on the run to view details:
   - Complete logs
   - Output preview
   - Download results

**Talking Points:**
> "Execution happens in real-time. You can see logs streaming as each node processes. The system validates each step before moving to the next."

> "All runs are tracked with complete audit trails. You can review logs, download results, and analyze performance."

---

### Part 7: AI Features Deep Dive (2-3 minutes)

**Feature 1: Column Suggestions**
1. Add new "ADD COLUMN" node
2. Show how AI suggests:
   - Column names
   - Data types
   - Possible transformations

**Feature 2: Validation Rules**
1. Create intentional error (e.g., JOIN on non-existent column)
2. Show validation warnings in suggestions panel
3. Demonstrate auto-correction

**Feature 3: Pipeline Suggestions**
1. Open suggestions panel
2. Show recommended next steps based on current pipeline

**Talking Points:**
> "AED uses 15 AI-powered rules to help you build better pipelines:"
- Column type inference
- Null value detection  
- Duplicate detection
- Join column recommendations
- Aggregation suggestions
- Filter optimization
- And more...

---

### Part 8: Advanced Features (2 minutes)

**Quick Demos:**

1. **Data Preview at Any Step**
   - Click any node
   - Show "Preview Data" option
   - Display sample rows

2. **Multiple Pipelines**
   - Navigate to Pipelines page
   - Show pipeline list
   - Demonstrate quick actions (edit, delete, duplicate)

3. **All Runs Tracking**
   - Show All Runs page
   - Filter by status/date
   - Show metrics dashboard potential

**Talking Points:**
> "You can preview data at any transformation step to validate your logic. The platform supports unlimited pipelines and tracks every execution."

---

### Part 9: Technical Architecture (1 minute)

**Show Architecture Diagram from README:**
- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Python
- Database: MySQL with Alembic migrations
- Queue: Redis + Celery for async tasks
- Containerized with Docker

**Talking Points:**
> "Built with modern, production-ready technologies. The architecture is scalable and enterprise-ready."

---

## 🎯 Closing Statement

> "AED democratizes ETL by making it accessible to everyone - not just developers. With visual design, AI assistance, and comprehensive monitoring, teams can build and maintain data pipelines 10x faster than traditional coding approaches."

**Call to Action:**
- GitHub: https://github.com/darshan-nmk/AED
- Try it yourself: Quick start in under 5 minutes
- MIT License: Open source and free to use

---

## 💡 Q&A Preparation

### Anticipated Questions:

**Q: How does it compare to Talend/Informatica?**
> "Unlike legacy ETL tools, AED is lightweight, modern, and completely free. It's designed for teams who want power without complexity."

**Q: Can it handle large datasets?**
> "Currently optimized for files up to 100MB. For production workloads, we recommend chunked processing or database connections (on roadmap)."

**Q: What about data security?**
> "All data is processed locally. User authentication with JWT, encrypted passwords, and role-based access control are built-in."

**Q: Can I extend it with custom transformations?**
> "Yes! The codebase is open source. New transformation nodes can be added by implementing the transformation interface."

**Q: Does it support real-time streaming?**
> "Currently batch-focused. Real-time streaming via Kafka/RabbitMQ is on the roadmap."

**Q: What databases can it connect to?**
> "MySQL is fully supported. PostgreSQL, MongoDB, and cloud data warehouses (Snowflake, BigQuery) are planned."

---

## 📊 Success Metrics to Highlight

- ✅ **24 transformation types** - covers 90% of common ETL scenarios
- ✅ **15 AI validation rules** - catches errors before execution
- ✅ **3-tier validation** - frontend, API, and runtime checks
- ✅ **Real-time execution** - see results as they happen
- ✅ **100% code coverage** - for critical components
- ✅ **Docker support** - deploy anywhere in minutes

---

## 🎨 Visual Presentation Tips

1. **Use Dark Theme** - Looks professional in presentations
2. **Zoom Browser** - Set to 110-125% for visibility
3. **Clear Console** - Clean browser console before demo
4. **Prepare Backup** - Have screenshots ready if live demo fails
5. **Practice Transitions** - Smooth navigation between pages
6. **Highlight Cursor** - Use cursor highlighting tool for screen sharing

---

## ⚡ Quick Recovery

### If Demo Breaks:

**Backend Error:**
- Switch to screenshots
- Show GitHub repository instead
- Explain architecture with README

**Frontend Error:**
- Refresh browser
- Use backup demo video (record one beforehand!)
- Fall back to code walkthrough

**Database Error:**
- Restart Docker containers
- Use pre-generated output CSV files
- Show mock data instead

---

## 📝 Follow-up Materials

After presentation, share:
- [ ] GitHub repository link
- [ ] Demo video recording
- [ ] Sample data files
- [ ] Quick start guide (README.md)
- [ ] Architecture diagram
- [ ] Roadmap document

---

**Good luck with your presentation! 🚀**
