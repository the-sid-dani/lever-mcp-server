# Rate Limiting Improvements for Lever MCP Server

## Current Situation

With the recent increase from 500 to 1000 candidates in advanced search, we need more robust rate limiting to avoid hitting Lever's API limits.

### Lever's Rate Limits
- **Steady state**: 10 requests/second per API key
- **Burst**: up to 20 requests/second
- **429 responses**: Require exponential backoff

### Current Implementation
- Advanced search: 300ms delay (3.3 req/s)
- Base client: 125ms delay (8 req/s)
- No concurrent request management
- Basic retry logic for 5xx errors

## Risks with Increased Search Volume

1. **Higher API call volume**:
   - 1000 candidates = 10 API calls per search
   - Multiple concurrent searches could exceed 10 req/s

2. **No global rate limiting**:
   - Each tool operates independently
   - No shared rate limit tracking

3. **Limited backoff strategy**:
   - No handling for 429 (Too Many Requests)
   - Fixed delays don't adapt to load

## Recommended Improvements

### 1. Token Bucket Implementation

```typescript
class TokenBucket {
  private tokens: number;
  private maxTokens: number = 20; // Burst capacity
  private refillRate: number = 10; // Tokens per second
  private lastRefill: number = Date.now();

  constructor() {
    this.tokens = this.maxTokens;
  }

  async consumeToken(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.consumeToken();
    }
    
    this.tokens--;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

### 2. Enhanced Rate Limiter with 429 Handling

```typescript
class EnhancedLeverClient extends LeverClient {
  private tokenBucket = new TokenBucket();
  
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    body?: any,
    retryCount: number = 0,
  ): Promise<T> {
    await this.tokenBucket.consumeToken();
    
    try {
      const response = await fetch(/* ... */);
      
      if (response.status === 429) {
        // Rate limited - use exponential backoff
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          
        console.warn(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        if (retryCount < 5) {
          return this.makeRequest<T>(method, endpoint, params, body, retryCount + 1);
        }
        throw new Error('Max retries exceeded due to rate limiting');
      }
      
      // Handle other responses...
    } catch (error) {
      // Handle errors...
    }
  }
}
```

### 3. Concurrent Request Management

```typescript
class RequestManager {
  private activeRequests = 0;
  private maxConcurrent = 5; // Limit concurrent requests
  private queue: Array<() => Promise<any>> = [];
  
  async execute<T>(request: () => Promise<T>): Promise<T> {
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activeRequests++;
    try {
      return await request();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }
  
  private processQueue(): void {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
```

### 4. Adaptive Search Strategy

For advanced search with 1000 candidates:

```typescript
// Dynamic delay based on current rate
const calculateDelay = (requestCount: number, elapsedTime: number): number => {
  const currentRate = requestCount / (elapsedTime / 1000);
  
  if (currentRate > 8) {
    return 500; // Slow down if approaching limit
  } else if (currentRate > 5) {
    return 300; // Current delay
  } else {
    return 200; // Can go faster if well below limit
  }
};

// Implement circuit breaker for search
class SearchCircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > 60000) { // 1 minute cooldown
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - too many rate limit errors');
      }
    }
    
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        this.failures++;
        this.lastFailure = Date.now();
        
        if (this.failures >= 3) {
          this.state = 'open';
        }
      }
      throw error;
    }
  }
}
```

## Implementation Priority

1. **Immediate**: Increase base delay to 200ms for safety margin
2. **Short-term**: Implement token bucket for global rate limiting
3. **Medium-term**: Add 429 handling with exponential backoff
4. **Long-term**: Full circuit breaker and adaptive delays

## Configuration Recommendations

```typescript
// Suggested configuration for different scenarios
const RATE_LIMIT_CONFIGS = {
  // Conservative - for shared API keys or high-volume operations
  conservative: {
    baseDelay: 300,      // 3.3 req/s
    maxConcurrent: 3,
    burstTokens: 10,
    searchLimit: 500     // Reduce back to 500 for safety
  },
  
  // Balanced - current recommendation
  balanced: {
    baseDelay: 200,      // 5 req/s
    maxConcurrent: 5,
    burstTokens: 15,
    searchLimit: 1000    // Keep current 1000
  },
  
  // Aggressive - only for dedicated API keys
  aggressive: {
    baseDelay: 125,      // 8 req/s
    maxConcurrent: 8,
    burstTokens: 20,
    searchLimit: 1000
  }
};
```

## Monitoring and Alerts

Add logging to track rate limit health:

```typescript
interface RateLimitMetrics {
  requestsPerMinute: number;
  averageDelay: number;
  rateLimitErrors: number;
  queueDepth: number;
}

// Log metrics every minute
setInterval(() => {
  const metrics = collectMetrics();
  if (metrics.requestsPerMinute > 500) {
    console.warn('High request rate detected:', metrics);
  }
  if (metrics.rateLimitErrors > 0) {
    console.error('Rate limit errors in last minute:', metrics.rateLimitErrors);
  }
}, 60000);
```

## Testing Rate Limits

Create a test tool to verify rate limiting:

```typescript
server.tool(
  "test_rate_limits",
  {
    requests: z.number().default(50),
    delay: z.number().default(100),
  },
  async (args) => {
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < args.requests; i++) {
      try {
        const reqStart = Date.now();
        await client.getOpportunities({ limit: 1 });
        results.push({
          request: i + 1,
          success: true,
          duration: Date.now() - reqStart
        });
      } catch (error) {
        results.push({
          request: i + 1,
          success: false,
          error: error.message
        });
      }
      
      if (args.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, args.delay));
      }
    }
    
    const totalTime = Date.now() - startTime;
    const actualRate = args.requests / (totalTime / 1000);
    
    return {
      totalRequests: args.requests,
      successfulRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      totalTimeSeconds: totalTime / 1000,
      actualRequestsPerSecond: actualRate,
      errors: results.filter(r => !r.success)
    };
  }
);
```

## Conclusion

While our current implementation is within Lever's rate limits, the increased search volume (1000 candidates) creates risk, especially with concurrent operations. Implementing these improvements will ensure stable operation even under heavy load.

The balanced configuration with 200ms delays and token bucket rate limiting provides the best trade-off between performance and safety. 