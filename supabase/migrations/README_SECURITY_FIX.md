# 🔒 Security Fix: RLS Migration Guide

## ⚠️ CRITICAL SECURITY UPDATE

**Migration**: `20251010204643_security_fix_rls.sql`  
**Priority**: 🔴 HIGH - Apply ASAP  
**Impact**: Eliminación de políticas INSERT públicas inseguras

---

## 🎯 What This Fixes

### Before (Vulnerable)
```
Public User (anon key)
  ↓
  Direct INSERT to bookings ❌ INSECURE
  ↓
  Database accepts without validation
```

### After (Secure)
```
Public User (anon key)
  ↓
  Calls Edge Function 'public-bookings' ✅ VALIDATED
  ↓
  Edge Function validates token + data
  ↓
  Service Role Key → Database (bypass RLS)
```

---

## 📋 Changes Summary

| Table | Before | After |
|-------|--------|-------|
| **bookings** | ❌ Public INSERT allowed | ✅ Only via Edge Function |
| **booking_services** | ❌ Public INSERT allowed | ✅ Only via Edge Function |
| **businesses** | ⚠️ No owner validation | ✅ `owner_id = auth.uid()` |
| **employees** | ⚠️ No owner validation | ✅ Via business.owner_id |
| **services** | ⚠️ No owner validation | ✅ Via business.owner_id |

---

## 🚀 Deployment Steps

### 1. Apply Migration

```bash
# Option A: Supabase CLI (recommended)
cd supabase
supabase db push

# Option B: Dashboard
# Copy content of 20251010204643_security_fix_rls.sql
# Paste in Supabase Dashboard → SQL Editor → Execute
```

### 2. Verify Migration

```bash
# Run verification script
supabase db execute -f migrations/VERIFY_20251010204643_security_fix_rls.sql

# Expected output:
# ✅ VERIFIED: No public INSERT policies on bookings
# ✅ VERIFIED: No public INSERT policies on booking_services
# ✅ FOUND: Owner policy exists for table businesses
# ...
```

### 3. Manual Testing

Follow checklist in [`TESTING_20251010204643_security_fix_rls.md`](./TESTING_20251010204643_security_fix_rls.md):

- [ ] Test 1: Admin CRUD with authenticated user
- [ ] Test 2: Public SELECT with share_token
- [ ] Test 3: Public INSERT blocked (expected error)
- [ ] Test 4: Public booking via Edge Function works
- [ ] Test 5: Cross-tenant protection verified
- [ ] Test 6: Admin Edge Functions with JWT work

### 4. Monitor

```bash
# Watch Supabase logs for RLS errors
supabase logs -f

# Expected: Only blocked public INSERT attempts (this is working correctly)
# Not expected: Errors from Edge Functions or admin operations
```

---

## 🔍 Technical Details

### Policies Dropped (Insecure)

```sql
DROP POLICY "Public insert bookings to shared businesses" ON bookings;
DROP POLICY "Public insert booking_services for shared bookings" ON booking_services;
```

### Policies Created (Secure)

```sql
-- Example: Businesses table
CREATE POLICY "Owners full access businesses"
ON businesses FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Repeated pattern for: employees, services, service_employees, bookings, booking_services
```

### How It Works

1. **Public Users (anon key)**
   - ✅ SELECT: Allowed via `share_token` validation
   - ❌ INSERT: **BLOCKED** by RLS
   - ❌ UPDATE/DELETE: BLOCKED by RLS
   
2. **Authenticated Users (JWT)**
   - ✅ SELECT: Only their own data (`owner_id = auth.uid()`)
   - ✅ INSERT: Only to their own business
   - ✅ UPDATE: Only their own data
   - ✅ DELETE: Only their own data

3. **Edge Functions (service_role)**
   - ✅ BYPASS RLS: Full access for validated operations
   - `public-bookings`: Validates token, then INSERTs
   - `admin-*`: Validates JWT, then performs operations

---

## 🧪 Testing Checklist

### Pre-Deployment
- [x] Migration SQL reviewed
- [x] Verification script created
- [x] Testing plan documented
- [x] Rollback plan prepared

### Post-Deployment (Manual)
- [ ] Apply migration successfully
- [ ] Run verification script
- [ ] Test admin CRUD operations
- [ ] Test public booking flow
- [ ] Test cross-tenant isolation
- [ ] Monitor logs for 24h

---

## 🆘 Troubleshooting

### Issue: "row-level security policy" error

**Scenario**: Legitimate operation failing with RLS error

**Solution**:
1. Check if operation should use Edge Function instead of direct DB call
2. Verify JWT is being passed correctly in headers
3. Confirm `owner_id` matches `auth.uid()`

```javascript
// ❌ Wrong: Direct INSERT from client
await supabase.from('bookings').insert({ ... });

// ✅ Correct: Via Edge Function
await fetch('/functions/v1/public-bookings', { 
  method: 'POST',
  body: JSON.stringify({ token, ... })
});
```

### Issue: Admin can't modify their own data

**Scenario**: Authenticated owner getting permission denied

**Debug**:
```sql
-- Check if owner_id is set correctly
SELECT id, name, owner_id FROM businesses WHERE id = 'your-business-id';

-- Check if JWT contains correct user_id
SELECT auth.uid(); -- Run this while logged in as admin
```

**Solution**:
- Ensure `owner_id` in businesses table matches the authenticated user's ID
- Verify JWT is being sent in Authorization header
- Check Edge Function validates JWT correctly

### Issue: Public bookings not working

**Scenario**: Public users can't book appointments

**Debug**:
1. Check Edge Function logs: `supabase functions logs public-bookings`
2. Verify share_token is active: 
   ```sql
   SELECT share_token_status FROM businesses WHERE share_token = 'xxx';
   ```
3. Test Edge Function directly with curl:
   ```bash
   curl -X POST https://[project].supabase.co/functions/v1/public-bookings \
     -H "apikey: [anon-key]" \
     -H "Content-Type: application/json" \
     -d '{"token":"xxx", ...}'
   ```

---

## 🔄 Rollback (Emergency Only)

If migration causes critical issues:

```sql
-- Temporarily re-enable public INSERT (insecure, for emergency only)
CREATE POLICY "TEMP_Public_insert_bookings"
ON bookings FOR INSERT TO public
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses
    WHERE status = 'active' AND share_token IS NOT NULL
  )
);

-- IMPORTANT: This is a temporary fix. Schedule proper resolution ASAP.
```

After rollback:
1. Notify team immediately
2. Investigate root cause
3. Fix issues in code/Edge Functions
4. Re-apply security migration

---

## 📚 Related Files

- **Migration**: [`20251010204643_security_fix_rls.sql`](./20251010204643_security_fix_rls.sql)
- **Verification**: [`VERIFY_20251010204643_security_fix_rls.sql`](./VERIFY_20251010204643_security_fix_rls.sql)
- **Testing Guide**: [`TESTING_20251010204643_security_fix_rls.md`](./TESTING_20251010204643_security_fix_rls.md)
- **E2E Tests**: [`../../e2e/security-rls.spec.ts`](../../e2e/security-rls.spec.ts)

---

## 📞 Support

If you encounter issues:

1. Check **Supabase Dashboard → Logs**
2. Review **Edge Functions logs**
3. Consult **TESTING_20251010204643_security_fix_rls.md**
4. Run **VERIFY_20251010204643_security_fix_rls.sql**

---

**Last Updated**: 2025-10-10  
**Author**: Security Team  
**Status**: ✅ Ready for Deployment
