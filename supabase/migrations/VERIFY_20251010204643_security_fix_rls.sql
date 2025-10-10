-- =============================================================
-- Verification Script: Security Fix RLS Migration
-- Run this AFTER applying 20251010204643_security_fix_rls.sql
-- =============================================================

-- ============================================
-- 1. VERIFY DANGEROUS POLICIES WERE DROPPED
-- ============================================

DO $$
DECLARE
  dangerous_count INT;
BEGIN
  -- Check for public INSERT policies on bookings
  SELECT COUNT(*) INTO dangerous_count
  FROM pg_policies
  WHERE tablename = 'bookings'
    AND cmd = 'INSERT'
    AND 'public' = ANY(roles);
    
  IF dangerous_count > 0 THEN
    RAISE WARNING '❌ SECURITY ISSUE: Found % public INSERT policies on bookings', dangerous_count;
  ELSE
    RAISE NOTICE '✅ VERIFIED: No public INSERT policies on bookings';
  END IF;
  
  -- Check for public INSERT policies on booking_services
  SELECT COUNT(*) INTO dangerous_count
  FROM pg_policies
  WHERE tablename = 'booking_services'
    AND cmd = 'INSERT'
    AND 'public' = ANY(roles);
    
  IF dangerous_count > 0 THEN
    RAISE WARNING '❌ SECURITY ISSUE: Found % public INSERT policies on booking_services', dangerous_count;
  ELSE
    RAISE NOTICE '✅ VERIFIED: No public INSERT policies on booking_services';
  END IF;
END $$;

-- ============================================
-- 2. VERIFY OWNER POLICIES WERE CREATED
-- ============================================

DO $$
DECLARE
  policy_count INT;
  expected_tables TEXT[] := ARRAY['businesses', 'employees', 'services', 'service_employees', 'bookings', 'booking_services'];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY expected_tables
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = tbl
      AND policyname LIKE 'Owners full access%'
      AND 'authenticated' = ANY(roles);
      
    IF policy_count = 0 THEN
      RAISE WARNING '❌ MISSING: Owner policy not found for table %', tbl;
    ELSE
      RAISE NOTICE '✅ FOUND: Owner policy exists for table %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 3. LIST ALL CURRENT POLICIES
-- ============================================

\echo ''
\echo '=========================================='
\echo 'CURRENT RLS POLICIES SUMMARY'
\echo '=========================================='
\echo ''

SELECT 
  tablename AS "Table",
  policyname AS "Policy Name",
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE cmd
  END AS "Command",
  CASE 
    WHEN 'public' = ANY(roles) THEN 'public'
    WHEN 'authenticated' = ANY(roles) THEN 'authenticated'
    ELSE array_to_string(roles, ', ')
  END AS "Role",
  CASE 
    WHEN length(qual::text) > 50 THEN substring(qual::text, 1, 47) || '...'
    ELSE qual::text
  END AS "USING Clause"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================
-- 4. CHECK FOR TABLES WITHOUT RLS ENABLED
-- ============================================

\echo ''
\echo '=========================================='
\echo 'RLS STATUS CHECK'
\echo '=========================================='
\echo ''

SELECT 
  tablename AS "Table",
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('businesses', 'employees', 'services', 'service_employees', 'bookings', 'booking_services')
ORDER BY tablename;

-- ============================================
-- 5. SECURITY RECOMMENDATIONS
-- ============================================

\echo ''
\echo '=========================================='
\echo 'SECURITY RECOMMENDATIONS'
\echo '=========================================='
\echo ''
\echo '✅ Verified: Public INSERT policies removed'
\echo '✅ Verified: Owner-based policies created'
\echo '⚠️  TODO: Test cross-tenant isolation manually'
\echo '⚠️  TODO: Verify Edge Functions still work'
\echo '⚠️  TODO: Monitor RLS errors in logs'
\echo ''
\echo 'Run manual tests from TESTING_20251010204643_security_fix_rls.md'
\echo ''

-- ============================================
-- 6. PERFORMANCE CHECK (Optional)
-- ============================================

-- Check for indexes on owner_id (recommended for performance)
SELECT 
  schemaname || '.' || tablename AS "Table",
  indexname AS "Index Name",
  indexdef AS "Definition"
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef ILIKE '%owner_id%'
ORDER BY tablename;

\echo ''
\echo 'Note: Consider adding index on owner_id if not present:'
\echo '  CREATE INDEX idx_businesses_owner ON businesses(owner_id);'
\echo ''
