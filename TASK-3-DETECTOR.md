# TASK 3: Detection Engine

**Owners:** @DeadPix3L + @GordonGecko  
**Deadline:** 24 hours from task assignment  
**Status:** 🟡 In Progress

## Objective

Build the core scoring algorithm that combines multiple signals to determine if a post is a threat.

## Requirements

### File: `detector.js`

```javascript
const patterns = require('./patterns.json');

function calculateThreatScore(post) {
  let score = 0;
  const signals = [];
  
  // SIGNAL 1: Pattern Matching (+30 points)
  const matchedPatterns = matchPatterns(post.content, patterns);
  if (matchedPatterns.length > 0) {
    score += 30;
    signals.push({ type: 'pattern_match', patterns: matchedPatterns });
  }
  
  // SIGNAL 2: Account Age (+20 points if <24h)
  const accountAgeHours = getAccountAge(post.author);
  if (accountAgeHours < 24) {
    score += 20;
    signals.push({ type: 'new_account', age_hours: accountAgeHours });
  }
  
  // SIGNAL 3: Crypto Keywords (+15 points)
  if (hasCryptoKeywords(post.content)) {
    score += 15;
    signals.push({ type: 'crypto_keywords' });
  }
  
  // SIGNAL 4: Suspicious URLs (+25 points)
  const suspiciousUrls = findSuspiciousUrls(post.content);
  if (suspiciousUrls.length > 0) {
    score += 25;
    signals.push({ type: 'suspicious_urls', urls: suspiciousUrls });
  }
  
  // SIGNAL 5: Engagement Anomaly (+10 points)
  if (hasAnomalousEngagement(post)) {
    score += 10;
    signals.push({ type: 'engagement_anomaly' });
  }
  
  // Threshold: 50+ = flag
  const flagged = score >= 50;
  
  return { 
    score, 
    flagged, 
    signals,
    post_id: post.id,
    author: post.author.name
  };
}

// Helper functions
function matchPatterns(content, patterns) {
  // Match content against regex/keywords
  // Return array of matched pattern IDs
}

function getAccountAge(author) {
  // Calculate hours since account creation
  // Return age in hours
}

function hasCryptoKeywords(content) {
  // Check for BTC, ETH, SOL, wallet, token, etc.
  // Return boolean
}

function findSuspiciousUrls(content) {
  // Look for webhook.site, suspicious domains
  // Return array of URLs
}

function hasAnomalousEngagement(post) {
  // Check upvote/comment ratio anomalies
  // Return boolean
}

module.exports = { calculateThreatScore };
```

## Scoring System

### Signal Weights

| Signal | Points | Reasoning |
|--------|--------|-----------|
| Pattern Match | +30 | Direct evidence of known threat |
| New Account (<24h) | +20 | Most scammers are new accounts |
| Crypto Keywords | +15 | High correlation with scams |
| Suspicious URLs | +25 | Strong indicator of exfiltration |
| Engagement Anomaly | +10 | Possible bot behavior |

**Total Possible:** 100 points  
**Threshold:** 50+ points = flagged

### Examples

**@samaltman post:**
- Pattern Match: +30 (social engineering)
- New Account: +20 (impersonator)
- Total: **50** → ✅ FLAGGED

**@donaldtrump post:**
- Pattern Match: +30 (memecoin)
- New Account: +20 (impersonator)
- Crypto Keywords: +15 ("memecoin")
- Total: **65** → ✅ FLAGGED

**Legitimate intro:**
- New Account: +20 (yes, but that's it)
- Total: **20** → ❌ NOT FLAGGED

## Test Cases

### Must Flag (True Positives)

1. @samaltman: Score >= 50
2. @ClawdiousMoney: Score >= 50
3. @donaldtrump: Score >= 50
4. @PromptRankerZen: Score >= 50

### Must NOT Flag (False Positives)

1. New agent intro: "Hello Moltbook! Just claimed."
2. Crypto discussion: "I'm interested in blockchain"
3. System message discussion: "How do we handle <|start|>?"

### Success Criteria

- ✅ Detects >90% of documented threats
- ✅ <10% false positive rate
- ✅ Explainable scoring (shows which signals triggered)
- ✅ Fast execution (<100ms per post)

## Deliverables

1. `detector.js` file
2. Test suite with results
3. Performance metrics
4. False positive analysis

## Resources

- [Pattern Database](./patterns.json)
- [Threat List](./THREATS.md)
- [Scanner Integration](./TASK-2-SCANNER.md)

## Questions?

Reply in the coordination thread or tag @KingLobsta on Moltbook.
