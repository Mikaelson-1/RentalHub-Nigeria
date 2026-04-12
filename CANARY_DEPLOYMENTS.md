# RentalHub Canary Deployments with Vercel Rolling Releases

Safely roll out new features to production with gradual traffic shifting using Vercel Rolling Releases.

---

## What is a Canary Deployment?

A canary deployment gradually shifts user traffic from the stable version to a new version, allowing you to:
- ✅ Detect issues early before 100% of users are affected
- ✅ Monitor performance and error rates in real production
- ✅ Rollback instantly if problems occur
- ✅ Build confidence before full rollout

**Example:**
```
Time 0:00    5% users → new version, 95% → stable version
Time 5:00   10% users → new version, 90% → stable version
Time 10:00  25% users → new version, 75% → stable version
Time 15:00  50% users → new version, 50% → stable version
Time 20:00 100% users → new version (fully rolled out)
```

---

## Prerequisites

- Vercel account (free tier or paid)
- RentalHub deployed on Vercel
- Sentry monitoring configured (for real-time error tracking)
- Access to Vercel project settings

---

## 1. Enable Rolling Releases in Vercel

### Step 1: Access Vercel Project Settings
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your RentalHub project
3. Click **Settings** tab
4. Go to **Deployments** section

### Step 2: Enable Rolling Releases
1. Find **Rolling Releases** setting
2. Toggle **Enable Rolling Releases** to ON
3. Configure default rollout settings:
   - **Initial Traffic**: 10% (recommended for safety)
   - **Increment**: 10% every 5 minutes
   - **Max Duration**: 30 minutes

### Step 3: Save Configuration
- Click **Save**
- Settings are now applied to all new deployments

---

## 2. Deploying with Canary

### Manual Canary Deployment

#### Option A: Via Vercel Dashboard (Easiest)
1. Go to **Deployments** tab
2. Connect to GitHub repository (if not already done)
3. Create a new git branch for your feature: `git checkout -b feature/new-ui`
4. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new UI components"
   git push origin feature/new-ui
   ```
5. In Vercel dashboard, you'll see a preview deployment
6. When ready for production:
   - Create a **Pull Request** on GitHub
   - Merge to `main` branch
7. Vercel automatically deploys to production with rolling release enabled
8. Monitor progress in Vercel Dashboard → **Deployments** → **Rolling Releases**

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI (if not already done)
npm i -g vercel

# Deploy with rolling release enabled
vercel deploy --prod

# View rolling release progress
vercel rollouts list

# Check current rollout status
vercel rollouts status
```

#### Option C: Via Git-Based Workflow (Recommended for Teams)
```bash
# 1. Create feature branch
git checkout -b feature/dark-mode

# 2. Make changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "feat: add dark mode support"
git push origin feature/dark-mode

# 4. Create Pull Request on GitHub
# (Link in terminal output or go to GitHub.com)

# 5. After code review, merge to main
# Vercel automatically triggers rolling release

# 6. Monitor deployment
# Go to https://vercel.com/dashboard/RentalHub → Deployments
```

---

## 3. Monitoring a Canary Rollout

### Real-Time Monitoring Checklist:

**During Rollout:**
- [ ] Check Vercel Deployment Progress
- [ ] Monitor error rate in Sentry
- [ ] Check performance metrics (p95 latency)
- [ ] Monitor server logs for warnings
- [ ] Check user reports/support tickets

### Vercel Dashboard View
```
Deployment: v1.2.3
Status: Rolling Release in Progress

Timeline:
├─ 00:00  10% traffic (new version)  ✓ No errors
├─ 05:00  20% traffic (new version)  ✓ Performance OK
├─ 10:00  30% traffic (new version)  ✓ Stable
├─ 15:00  50% traffic (new version)  ✓ All green
├─ 20:00  75% traffic (new version)  ✓ Metrics normal
└─ 25:00 100% traffic (new version)  ✓ Rollout complete
```

### Sentry Monitoring
1. Go to [Sentry Dashboard](https://sentry.io)
2. Create alert rule:
   - **If** error count > 10 in 5 minutes
   - **Then** notify team immediately

---

## 4. Instant Rollback

If something goes wrong, **rollback immediately:**

### Rollback via Vercel Dashboard:
1. Go to **Deployments** tab
2. Find the rolling release in progress
3. Click **Rollback to Previous**
4. Confirm rollback
5. Vercel immediately shifts all traffic back to stable version

### Rollback via CLI:
```bash
# Instant rollback to previous version
vercel rollouts rollback <rollout-id>
```

### Time to Rollback:
- **Detection**: 2-5 minutes (via Sentry alerts)
- **Rollback Execution**: < 30 seconds
- **Total Impact**: < 5 minutes

---

## 5. Deployment Scenarios

### Scenario 1: Safe Feature Release
```
Deploy new payment system:

Time  Traffic  Status        Action
0:00  10%      No errors     Continue
5:00  20%      No errors     Continue
10:00 30%      1 error       INVESTIGATE
      → Investigate error
      → If critical: Rollback
      → If minor: Continue monitoring
15:00 50%      All good      Continue
20:00 100%     Success       Deployment complete
```

### Scenario 2: Critical Bug Detected
```
Deploy new authentication:

Time  Traffic  Status           Action
0:00  10%      No errors        Continue
5:00  20%      No errors        Continue
10:00 30%      Error rate 5%    ALERT!
      → Sentry notifies team
      → Team checks logs
      → Decision: ROLLBACK
      → Vercel rolls back immediately
      → All users on stable version
```

### Scenario 3: Performance Regression
```
Deploy optimized database queries:

Time  Traffic  Status              Action
0:00  10%      p95 = 150ms        ✓ Good
5:00  20%      p95 = 160ms        ✓ OK
10:00 30%      p95 = 500ms        ⚠️ WARNING
      → Performance degradation detected
      → Team investigates
      → Decision: ROLLBACK & FIX
      → Roll back to stable
      → Fix query optimization
      → Re-deploy after fix
```

---

## 6. Best Practices

### Before Deployment:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code reviewed and approved
- [ ] Feature documented
- [ ] Database migrations tested
- [ ] Sentry alerts configured

### During Rollout:
- [ ] Monitor Sentry dashboard
- [ ] Watch Vercel metrics (response time, errors)
- [ ] Be available to respond to alerts
- [ ] Have rollback plan ready

### After Rollout:
- [ ] Verify all users on new version
- [ ] Post in team Slack #deployments
- [ ] Document any issues found
- [ ] Clean up feature branch

### Incident Response:
```
If error detected:

1. Immediate (< 1 min):
   - Trigger rollback
   - Notify team in Slack

2. Short-term (< 5 min):
   - Gather logs and errors
   - Identify root cause
   - Create incident ticket

3. Medium-term (< 1 hour):
   - Fix the issue
   - Run full test suite
   - Prepare for re-deployment

4. Long-term:
   - Post-mortem analysis
   - Prevent similar issues
   - Update testing procedures
```

---

## 7. Deployment Configuration

### vercel.json Configuration (Optional)

For custom rolling release settings, add to `vercel.json`:

```json
{
  "rollouts": {
    "enabled": true,
    "initialPercentage": 10,
    "increment": 10,
    "intervalSeconds": 300,
    "maxDurationMinutes": 30,
    "failureThreshold": {
      "errorRate": 5,
      "duration": 300
    }
  }
}
```

**Parameters:**
- `initialPercentage`: Start with 10% traffic
- `increment`: Increase by 10% every 5 minutes
- `maxDurationMinutes`: Complete within 30 minutes
- `errorRate`: Auto-rollback if > 5% errors
- `duration`: Over 5 minutes

---

## 8. Integration with CI/CD

### GitHub Actions Workflow:

```yaml
name: Deploy with Canary

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:all

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm install -g vercel
          vercel deploy --prod --token $VERCEL_TOKEN

      - name: Monitor rollout
        run: |
          echo "Deployment started with canary rollout"
          echo "Monitor at: https://vercel.com/dashboard/RentalHub"
```

---

## 9. Monitoring Commands

### View All Deployments:
```bash
vercel list deployments
```

### View Rolling Release Status:
```bash
vercel rollouts status
```

### View Deployment Logs:
```bash
vercel logs <deployment-id>
```

---

## 10. Troubleshooting

### Rollout Stuck at 10%
- Check Sentry for errors
- Review recent code changes
- Check database migrations
- Verify environment variables

### Rollout Auto-Rolled Back
- Check Sentry for error details
- Review failed requests
- Check performance metrics
- Fix issue and re-deploy

### Need to Cancel Rollout
```bash
# Immediately cancel ongoing rollout
vercel rollouts cancel

# Or rollback to previous version
vercel rollouts rollback
```

---

## 11. Success Metrics

**Good Sign:**
- ✅ No errors in Sentry
- ✅ Response times stable
- ✅ No user complaints
- ✅ Rollout proceeds smoothly

**Warning Signs:**
- ⚠️ Error rate increasing
- ⚠️ Response time degrading
- ⚠️ User complaints in support
- ⚠️ Database slow queries

**Action Triggers:**
- 🔴 > 5% error rate → Rollback
- 🔴 p95 > 2s → Investigate
- 🔴 Database locked → Rollback
- 🔴 Authentication failing → Rollback

---

## 12. Next Steps

1. **First Canary (This Week):**
   - Deploy small bug fix with canary enabled
   - Monitor for 30 minutes
   - Gain confidence with the process

2. **Feature Canary (Next Week):**
   - Deploy new feature with canary
   - Test gradually with real users
   - Gather feedback and metrics

3. **Crisis Response (Ongoing):**
   - Practice rollback procedures
   - Ensure team knows how to respond
   - Keep runbooks updated

---

## Resources

- [Vercel Rolling Releases Docs](https://vercel.com/docs/deployments/rolling-releases)
- [Sentry Alerts Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Blue-Green Deployment Pattern](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Canary Deployment Pattern](https://martinfowler.com/bliki/CanaryRelease.html)

---

**Last Updated:** April 12, 2026  
**Status:** Production Ready  
**Next Review:** May 12, 2026
