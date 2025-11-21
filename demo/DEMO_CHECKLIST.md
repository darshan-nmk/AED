# Quick Demo Checklist

## ⚡ 5-Minute Quick Demo

Perfect for brief presentations or quick feature showcases.

### Setup (30 seconds)
- [ ] Backend running: `http://localhost:8000`
- [ ] Frontend running: `http://localhost:5173`
- [ ] Logged in with demo account
- [ ] Dark theme enabled for better visibility

### Demo Flow (4.5 minutes)

#### 1. Upload Data (30 seconds)
- [ ] Upload `customers.csv`
- [ ] Show data preview modal
- [ ] Point out automatic column type detection

#### 2. Build Simple Pipeline (2 minutes)
- [ ] Drag LOAD node → configure with customers.csv
- [ ] Drag FILTER node → age > 30
- [ ] Drag SORT node → by age, descending
- [ ] Save as "Customer Age Filter"

**Key talking point:** "Build complex ETL in minutes, not hours"

#### 3. Execute & View Results (1.5 minutes)
- [ ] Click "Run Pipeline"
- [ ] Show real-time execution logs
- [ ] Navigate to Runs page
- [ ] View results and download CSV

**Key talking point:** "Full audit trail and instant results"

#### 4. Show AI Features (30 seconds)
- [ ] Open suggestions panel
- [ ] Show column recommendations
- [ ] Demonstrate validation warnings

**Key talking point:** "AI helps you build better pipelines faster"

---

## 🎯 15-Minute Full Demo

For detailed feature walkthroughs and stakeholder presentations.

### Part 1: Introduction (2 min)
- [ ] Show login/registration
- [ ] Quick tour of navigation
- [ ] Show settings page

### Part 2: Data Upload (2 min)
- [ ] Upload all 3 demo files
- [ ] Show file management
- [ ] Preview each dataset

### Part 3: Build Complex Pipeline (6 min)
- [ ] LOAD customers, orders, products
- [ ] JOIN customers ← orders (customer_id)
- [ ] JOIN result ← products (product_id)
- [ ] FILTER status = 'completed'
- [ ] AGGREGATE by country (SUM, COUNT, AVG)
- [ ] SORT by total_revenue DESC
- [ ] Save as "Sales Analysis"

### Part 4: Execution & Monitoring (3 min)
- [ ] Run pipeline
- [ ] Show live progress
- [ ] View complete logs
- [ ] Preview output data
- [ ] Download results

### Part 5: Advanced Features (2 min)
- [ ] Show All Runs page
- [ ] Demonstrate pipeline management
- [ ] Highlight AI suggestions
- [ ] Show profile/settings

---

## 📋 Pre-Demo Testing Checklist

Run this before any presentation:

### Backend Health Check
```powershell
# Test database connection
curl http://localhost:8000/api/v1/health

# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Frontend Health Check
- [ ] Login page loads without errors
- [ ] Can register new account
- [ ] Editor page renders correctly
- [ ] Node palette displays all 24 nodes
- [ ] File upload dialog works
- [ ] Theme toggle works

### Data Preparation
- [ ] Demo CSV files in `demo/sample_data/`
- [ ] No existing test data in uploads folder
- [ ] Database has demo user account
- [ ] All tables initialized (users, pipelines, runs, settings)

### Browser Setup
- [ ] Clear browser cache
- [ ] Open developer console (check for errors)
- [ ] Disable browser extensions that might interfere
- [ ] Zoom level at 110-125%
- [ ] Bookmark demo pages for quick navigation

---

## 🎬 Demo Script Template

Use this for consistent presentations:

### Opening (30 seconds)
> "Today I'll show you AED - a visual ETL platform that makes data transformation accessible to everyone. No coding required."

### Problem Statement (30 seconds)
> "Traditional ETL tools are either too expensive, too complex, or require extensive programming knowledge. AED changes that."

### Solution Demo (12-18 minutes)
[Follow checklist above based on time available]

### Key Value Props to Emphasize
✅ **Visual Design** - Drag and drop, no code  
✅ **AI-Powered** - Smart suggestions and validation  
✅ **Fast** - Build pipelines in minutes  
✅ **Transparent** - See logs, preview data at every step  
✅ **Free** - Open source, MIT license  
✅ **Modern** - Built with latest technologies  

### Closing (1 minute)
> "AED democratizes ETL. Whether you're an analyst, engineer, or business user, you can build production-grade data pipelines without writing a single line of code."

**Call to Action:**
- GitHub: github.com/darshan-nmk/AED
- Try it: 5-minute Docker setup
- Contribute: Open source & welcoming PRs

---

## 💥 Common Demo Pitfalls to Avoid

### ❌ Don't:
- Rush through upload step (show data preview!)
- Skip explaining JOIN configuration
- Forget to highlight AI suggestions
- Ignore execution logs
- Miss showing the results
- Use overly complex first example
- Forget to save the pipeline

### ✅ Do:
- Pause after each transformation to explain
- Show both success AND error scenarios
- Highlight the suggestions panel actively
- Preview data at multiple steps
- Demonstrate download functionality
- Start simple, build complexity
- Engage audience with questions

---

## 🎯 Audience-Specific Adjustments

### For Technical Audience (Developers/Engineers)
- Show architecture diagram
- Highlight FastAPI + React stack
- Demonstrate API endpoints
- Show Docker setup
- Discuss scalability and extensibility
- Mention CI/CD pipeline

### For Business Audience (Managers/Analysts)
- Focus on no-code aspect
- Emphasize time savings
- Show business use cases (sales, inventory)
- Highlight audit trails and governance
- Discuss cost savings vs commercial tools
- Show ease of use

### For Mixed Audience
- Start with business value
- Show visual demo first
- Then dive into technical details
- Q&A for deep dives

---

## 📊 Success Metrics

Track these during demo:

- ⏱️ **Time to build pipeline:** Aim for < 5 minutes
- 🎯 **Audience engagement:** Ask 2-3 questions during demo
- ✅ **Feature coverage:** Show at least 10 of 24 node types
- 💡 **AI highlights:** Demonstrate 5+ AI suggestions
- 📈 **Impact statement:** "10x faster than traditional ETL"

---

## 🔧 Troubleshooting Guide

### Issue: Pipeline fails to run
**Solution:** Check backend logs, verify data is uploaded correctly

### Issue: JOIN doesn't work
**Solution:** Ensure column names match exactly, show column list

### Issue: Slow performance
**Solution:** Use smaller demo datasets (already optimized)

### Issue: UI freezes
**Solution:** Refresh browser, check console for errors

### Issue: Can't upload files
**Solution:** Verify backend uploads directory exists and is writable

---

## 📝 Post-Demo Follow-up

Send to attendees:
- [ ] Link to GitHub repository
- [ ] Demo video recording (if recorded)
- [ ] Sample data files
- [ ] Quick start guide from README
- [ ] Contact info for questions

---

**Remember: Practice makes perfect! Run through this checklist 2-3 times before presenting. 🚀**
