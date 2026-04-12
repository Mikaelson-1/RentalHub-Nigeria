# RentalHub Database Backups & Recovery

Your RentalHub database is hosted on **Neon**, which provides automatic daily backups.

---

## 1. Backup Configuration

### Automatic Backups (Neon Free Tier)
- **Frequency:** Daily
- **Retention:** 7 days
- **Automatic:** Yes, always enabled
- **Cost:** Included in free tier

### Backup Schedule
- Backups run at **01:00 UTC** daily
- Oldest backup deleted after 7 days
- No manual intervention needed

---

## 2. Verify Backups Are Working

### Check Backup Status:
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project: **RentalHub**
3. Click **Backups** tab
4. You should see:
   - ✅ List of recent daily backups
   - ✅ Backup timestamps (e.g., "2026-04-12 01:15 UTC")
   - ✅ Backup status ("Ready" = successful)

### Example Backup List:
```
2026-04-12  01:15  Ready  (latest)
2026-04-11  01:14  Ready
2026-04-10  01:12  Ready
2026-04-09  01:18  Ready
2026-04-08  01:14  Ready
2026-04-07  01:15  Ready
2026-04-06  01:14  Ready
```

---

## 3. Recovery Procedures

### Option A: Restore from Neon Backup (Recommended)

**1. In Neon Console:**
- Go to **Backups**
- Click **Restore** on desired backup
- Select restore point
- Choose branch to restore to (creates new branch)
- Takes 2-5 minutes

**2. Test the restored backup:**
```bash
# Connect to restored database
psql "postgresql://user:password@restored-host/neondb"

# Verify data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM properties;
```

**3. Switch application if needed:**
- Update DATABASE_URL in environment variables
- Redeploy application
- Verify data integrity

### Option B: Manual Backup Export

For extra safety, periodically export database dumps:

```bash
# Export full database
pg_dump $DATABASE_URL > backup-$(date +%Y-%m-%d-%H%M%S).sql

# Export specific table
pg_dump $DATABASE_URL -t users > users-backup.sql

# With compression (smaller file size)
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y-%m-%d).sql.gz
```

**Store these backups:**
- Cloud storage (AWS S3, Google Cloud Storage)
- GitHub encrypted secrets
- Local encrypted drive

---

## 4. Data Retention Policy

| Item | Retention | Action |
|------|-----------|--------|
| Database Backups | 7 days | Auto-deleted by Neon |
| User Data | Indefinite | Keep unless user requests deletion |
| Transaction Logs | 90 days | Retained by Neon for audit |
| File Uploads | Indefinite | Stored in Vercel Blob |

---

## 5. Disaster Recovery Plan

### If Database is Corrupted:
1. **Stop application** (prevent data loss)
2. **Restore from latest backup** (via Neon Console)
3. **Test restored data** (verify integrity)
4. **Update DATABASE_URL** (point to restored DB)
5. **Redeploy application** (with new connection)
6. **Verify functionality** (test critical features)

### Time to Recovery:
- Detection: 5 minutes
- Restore: 2-5 minutes
- Testing: 5 minutes
- **Total: ~15 minutes**

---

## 6. Backup Monitoring Checklist

- [ ] Backups appear in Neon Console
- [ ] Latest backup shows "Ready" status
- [ ] Backup timestamps match daily pattern
- [ ] Backup retention shows 7 days
- [ ] Test restore procedure monthly
- [ ] Document backup SLAs
- [ ] Alert on backup failure (optional - Neon emails)

---

## 7. Upgrade Path

### When to upgrade from free tier:

**Current:**
- Free tier (7-day retention)
- Good for development

**When to upgrade:**
- > 10 GB database size
- Need longer retention (30+ days)
- Want advanced features (read replicas)
- Critical production data

**Upgrade to:**
- Neon Pro: $19/month
- 30-day retention
- Priority support
- Performance insights

---

## 8. Testing Backup Recovery

### Monthly Test Procedure:
```bash
# 1. Trigger a test restore
# (in Neon Console, click Restore on yesterday's backup)

# 2. Create temporary branch with restored data
# (Neon creates new branch, no data loss)

# 3. Connect and verify:
psql "postgresql://user@restored/neondb" -c "SELECT COUNT(*) FROM users;"

# 4. Delete test branch when done
# (Neon provides cleanup option)
```

---

## 9. Important Notes

⚠️ **Backup is NOT:**
- A substitute for code version control (use GitHub)
- A substitute for application logs (use Sentry)
- A complete disaster recovery plan
- Real-time replication

✅ **Backup IS:**
- Daily snapshots of database state
- Recovery point for data corruption
- Protection against accidental deletion
- Compliant with industry standards

---

## 10. Contact & Resources

- **Neon Support:** https://neon.tech/docs
- **Restore Documentation:** https://neon.tech/docs/manage/backups
- **Status Page:** https://status.neon.tech

For questions or to test recovery, contact your database administrator.

---

**Last Verified:** April 12, 2026  
**Next Backup Test:** May 12, 2026  
**Backup Schedule:** Daily at 01:00 UTC
