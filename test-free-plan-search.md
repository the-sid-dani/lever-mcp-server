# Test Search for Cloudflare Free Plan

## The Error You Saw

```
"error": "Too many subrequests."
```

This is because your search was too broad for the free plan's 50 subrequest limit.

## Immediate Fix - Try This Search Instead

### Search 1: Mindshare & OMD Programmatic Traders
```javascript
lever_advanced_search({
  companies: "Mindshare, OMD",
  skills: "programmatic, trading, DSP",
  locations: "London, UK",
  limit: 20
})
```

### Search 2: GroupM Companies
```javascript
lever_advanced_search({
  companies: "GroupM, Wavemaker, MediaCom",
  skills: "programmatic advertising, RTB",
  locations: "United Kingdom",
  limit: 20
})
```

### Search 3: Other Agencies
```javascript
lever_advanced_search({
  companies: "Zenith, PHD, Havas Media",
  skills: "programmatic buying, DMP",
  locations: "UK, London",
  limit: 20
})
```

## Why This Works

- Each search is more targeted
- Searches ~1,500 candidates instead of trying to search 5,000+
- Stays within the 45 API call limit
- You get results instead of errors!

## Long-term Solution

If you need to search broadly across all 17 companies at once, upgrade to Cloudflare Workers Paid plan ($5/month) for 1,000 subrequests instead of 50.

## Quick Test

Try the first search above right now - it should work immediately! 