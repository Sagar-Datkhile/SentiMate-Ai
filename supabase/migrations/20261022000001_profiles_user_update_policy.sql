-- Migration: Allow authenticated users to update their own permitted profile fields
-- Enforces that role, activation status, and email cannot be changed by the user.

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM profiles p WHERE p.id = auth.uid())
    AND email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid())
);
