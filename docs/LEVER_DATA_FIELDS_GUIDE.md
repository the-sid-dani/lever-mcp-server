# Understanding Lever Search Results

## 📊 What You'll See in Results

When Claude returns candidates, you'll see information like this:

### Basic Information
- **Name**: Candidate's full name
- **Email**: Contact email (may show "N/A" if not available)
- **ID**: Unique identifier (use this to ask for more details)

### Status Information
- **Stage**: Where they are in your process
  - `lead-new`: Brand new candidate
  - `lead-contacted`: Initial outreach made
  - `lead-responded`: Candidate has responded
  - `applicant-new`: Applied to a position
  - `interviewing`: In interview process
  - `hired`: Successfully hired

### Company Information
- **Organizations**: All companies in their work history
- **Matched Company**: The company from your search that matched
- **Posting**: The job they applied to (if any)

### Other Details
- **Location**: Where they're based
- **Created**: When they entered your system
- **Tags**: Any labels applied to them

## 🎯 Using This Information

### To Get More Details
```
"Tell me more about [Candidate Name]"
"Show me the full profile for ID: [candidate-id]"
```

### To Filter Further
```
"From those results, show only the ones in 'lead-responded' stage"
"Which of these candidates are in London?"
```

### To Take Action
```
"Show me contact information for [Candidate Name]"
"What positions did [Candidate Name] apply for?"
```

## 💡 Pro Tip
Save the candidate IDs of interesting profiles - you can always ask Claude to look them up later! 