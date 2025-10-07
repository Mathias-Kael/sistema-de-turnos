-- Enable RLS on all relevant tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

-- OPTIONAL: ensure no legacy permissive policies
-- (Comment out if you already cleaned them)
-- DROP POLICY IF EXISTS "Allow all" ON businesses;

-- BUSINESS POLICIES --------------------------------------------------
-- Public read via share token (active, not expired)
CREATE POLICY public_read_business_by_share_token ON businesses
FOR SELECT USING (
  -- share_token must match JWT claim custom token OR passed via anon access logic.
  -- Since anon client can't set headers for policy, we check only token column here.
  -- Additional temporal validation (expires) is done in app, but you can inline it if you add current_timestamp <= share_token_expires_at.
  share_token IS NOT NULL
);

-- Authenticated owner access (example: if you later add owner_id)
-- Placeholder restrictive policy (deny by default). Adjust when you add auth.
-- CREATE POLICY owner_full_access ON businesses
-- FOR ALL USING (auth.role() = 'authenticated' AND auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- EMPLOYEES ----------------------------------------------------------
CREATE POLICY select_employees ON employees FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = employees.business_id
      AND b.share_token IS NOT NULL
  )
);
-- TODO: Add authenticated policies for insert/update/delete when owner model defined.

-- SERVICES -----------------------------------------------------------
CREATE POLICY select_services ON services FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = services.business_id
      AND b.share_token IS NOT NULL
  )
);

-- BOOKINGS (only readable in public mode if you later want anonymity; for now restrict) 
-- If you do NOT want public to see bookings, skip SELECT policy; only app with auth token can read.
-- For demonstration: allow selecting non-archived bookings of public business.
CREATE POLICY select_bookings_public ON bookings FOR SELECT USING (
  archived = false AND EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = bookings.business_id
      AND b.share_token IS NOT NULL
  )
);

-- SERVICE_EMPLOYEES (support reading service -> employee mapping)
CREATE POLICY select_service_employees ON service_employees FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM services s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = service_employees.service_id
      AND b.share_token IS NOT NULL
  )
);

-- BOOKING_SERVICES (services inside bookings)
CREATE POLICY select_booking_services ON booking_services FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings bk
    JOIN businesses b ON b.id = bk.business_id
    WHERE bk.id = booking_services.booking_id
      AND b.share_token IS NOT NULL
      AND bk.archived = false
  )
);

-- NOTE: Mutating policies (INSERT/UPDATE/DELETE) for authenticated owners should be added once you map auth.uid() to a business owner field.
-- Until then RLS will block writes via anon key (which is desirable for public surface). The admin panel must authenticate properly later.

-- Suggested future enhancements (not executed here):
-- * Add column owner_id UUID to businesses.
-- * Add policies for full CRUD for owner on all tables.
-- * Add stricter share_token policy (status = 'active' AND (expires IS NULL OR now() <= expires)).
