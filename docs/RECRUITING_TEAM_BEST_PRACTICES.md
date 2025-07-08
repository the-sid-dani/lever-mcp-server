# Lever MCP Tool - Best Practices Guide for Recruiters

## 🎯 Quick Start

This tool allows you to search your Lever database using natural language through Claude Desktop. Simply ask Claude to find candidates like you would ask a colleague!

## 📋 Table of Contents
1. [Essential Tips](#essential-tips)
2. [Search Strategies](#search-strategies)
3. [Understanding Limitations](#understanding-limitations)
4. [Example Queries](#example-queries)
5. [Troubleshooting](#troubleshooting)

---

## Essential Tips

### 1. **Keep Searches Focused** 🎯
Claude Desktop has a context window limit. When searching:
- ❌ **Don't**: "Find all candidates in our database"
- ✅ **Do**: "Find programmatic traders from Mindshare and OMD in London"

### 2. **Break Down Complex Searches** 🔍
Instead of one massive search, use multiple targeted searches:
```
First: "Find programmatic traders from GroupM agencies"
Then: "Find programmatic traders from Publicis agencies"
```

### 3. **Be Specific About Requirements** 📝
The more specific you are, the better the results:
- Include specific skills: "DSP experience", "Google DV360", "The Trade Desk"
- Mention locations: "London", "UK", "Manchester"
- Name companies: "Mindshare", "OMD", "Zenith"

---

## Search Strategies

### 🏢 Company-Based Searches
```
Good: "Find people who worked at Mindshare, OMD, or GroupM"
Better: "Find programmatic traders who worked at Mindshare or OMD in the UK"
```

### 🛠️ Skills-Based Searches
```
Good: "Find candidates with programmatic experience"
Better: "Find candidates with DSP experience, specifically DV360 or The Trade Desk"
```

### 📍 Location-Based Searches
```
Good: "Find candidates in the UK"
Better: "Find digital media professionals in London or Manchester"
```

### 🎓 Combined Searches (Most Effective)
```
"Find programmatic traders with DSP experience who worked at 
major media agencies like GroupM or Publicis in London"
```

---

## Understanding Limitations

### ⏱️ Search Time Limits
- Searches timeout after **60 seconds**
- Scans up to **4,500 candidates** per search
- For larger searches, break them into smaller chunks

### 📊 Results Display
- Claude can only display a limited number of results at once
- Ask for "top 20" or "first 10" to keep responses manageable
- Request additional details on specific candidates

### 🔄 Rate Limiting
- The tool manages API rate limits automatically
- If you see "Too many subrequests", try:
  - Narrowing your search criteria
  - Searching fewer companies at once
  - Waiting a moment before the next search

---

## Example Queries

### ✅ Effective Queries

**For Programmatic Traders:**
```
"Find programmatic traders with experience at Mindshare, OMD, or 
GroupM in London who have worked with DSPs"
```

**For Account Managers:**
```
"Show me account managers from WPP agencies in the UK with 
client-side experience"
```

**For Recent Candidates:**
```
"Find candidates who applied in the last 3 months for digital 
marketing roles"
```

### ❌ Queries to Avoid

- "Show me all candidates" (too broad)
- "Find everyone with marketing experience" (too vague)
- "List all UK candidates from all agencies" (too large)

---

## Advanced Tips

### 1. **Use Follow-Up Questions** 💬
```
First: "Find programmatic traders from GroupM"
Then: "Show me more details about [specific candidate name]"
```

### 2. **Request Specific Information** 📋
```
"Find senior programmatic traders and show me their:
- Current company
- Years of experience
- Key skills
- Location"
```

### 3. **Filter by Stage** 🎯
```
"Find candidates in the 'lead-responded' stage who have 
programmatic experience"
```

### 4. **Email-Based Searches** 📧
If you have emails:
```
"Find the candidate with email john.doe@example.com"
```

---

## Troubleshooting

### 🚨 Common Issues and Solutions

**"No results found"**
- Try broader search terms
- Remove some criteria
- Check spelling of company names

**"Too many subrequests" error**
- Make your search more specific
- Search fewer companies at once
- Try again in a few moments

**"Connection timeout"**
- Search is too broad
- Break into smaller searches
- Be more specific with criteria

**Results seem incomplete**
- Ask Claude to search deeper
- Try different search terms
- Request a second search with different criteria

---

## 💡 Pro Tips

1. **Morning Searches**: System tends to be faster with less load
2. **Save Promising Candidates**: Ask Claude to list candidate IDs for follow-up
3. **Iterative Searching**: Start broad, then narrow based on results
4. **Context Preservation**: Keep searches in the same conversation for context

---

## 🎯 Quick Reference Card

### Search Template
```
"Find [role/level] with [specific skills] who worked at 
[companies] in [location] with experience in [areas]"
```

### Best Practices Checklist
- [ ] Keep searches under 20 companies
- [ ] Specify location when relevant
- [ ] Include 2-3 key skills maximum
- [ ] Ask for reasonable result limits (10-50)
- [ ] Break complex searches into parts
- [ ] Be specific but not overly narrow

---

## 📞 Need Help?

If you encounter issues:
1. Try rephrasing your search
2. Make it more specific
3. Break it into smaller searches
4. Ask Claude for search suggestions

Remember: The tool is designed to help you find the best candidates efficiently. Think of Claude as your recruiting assistant who knows your Lever database! 