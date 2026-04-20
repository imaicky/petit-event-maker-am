-- Add admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set imatoru as admin
UPDATE profiles SET is_admin = true WHERE id = 'b72bb8d9-5112-44da-8a1a-e99290b9d482';

-- Allow admin to read all line_accounts
CREATE POLICY "line_accounts_admin_select"
  ON public.line_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admin to update all line_accounts
CREATE POLICY "line_accounts_admin_update"
  ON public.line_accounts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admin to insert line_accounts for other users
CREATE POLICY "line_accounts_admin_insert"
  ON public.line_accounts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Allow admin to delete line_accounts
CREATE POLICY "line_accounts_admin_delete"
  ON public.line_accounts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
