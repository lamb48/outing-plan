-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AlterTable
ALTER TABLE plans
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- EnableRLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id);

-- CreatePolicy
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- CreatePolicy
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id);

-- CreatePolicy
CREATE POLICY "Users can delete own profile" ON users
  FOR DELETE
  USING (auth.uid()::text = id);

-- EnableRLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- CreatePolicy
CREATE POLICY "Users can create own plans" ON plans
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- CreatePolicy
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- CreatePolicy
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE
  USING (auth.uid()::text = user_id);
