-- ============================================================
-- LEAD by NEN — 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. leads RLS: 승인된 멤버도 읽을 수 있게
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved_members_read_leads" ON leads;
CREATE POLICY "approved_members_read_leads" ON leads
  FOR SELECT USING (
    auth.uid() = host_id OR
    EXISTS (
      SELECT 1 FROM member_approvals ma
      WHERE ma.member_id = auth.uid()
        AND ma.host_id = leads.host_id
        AND ma.status IN ('approved', 'admin')
    )
  );

-- host write
DROP POLICY IF EXISTS "host_write_leads" ON leads;
CREATE POLICY "host_write_leads" ON leads
  FOR ALL USING (auth.uid() = host_id);

-- 2. host_profiles 테이블
CREATE TABLE IF NOT EXISTS host_profiles (
  id           UUID PRIMARY KEY,
  display_name TEXT,
  company      TEXT,
  instagram    TEXT,
  bio          TEXT,
  photo_url    TEXT,
  roles        TEXT[] DEFAULT '{}',
  genres       TEXT[] DEFAULT '{}',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "host_profiles_read" ON host_profiles;
DROP POLICY IF EXISTS "host_profiles_write" ON host_profiles;
CREATE POLICY "host_profiles_read" ON host_profiles FOR SELECT USING (true);
CREATE POLICY "host_profiles_write" ON host_profiles FOR ALL USING (auth.uid() = id);

-- 3. friendships
CREATE TABLE IF NOT EXISTS friendships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_read"   ON friendships;
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
CREATE POLICY "friendships_read"   ON friendships FOR SELECT USING (auth.uid()=requester_id OR auth.uid()=recipient_id);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT WITH CHECK (auth.uid()=requester_id);
CREATE POLICY "friendships_update" ON friendships FOR UPDATE USING (auth.uid()=requester_id OR auth.uid()=recipient_id);

-- 4. conversations
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1   UUID NOT NULL,
  participant_2   UUID NOT NULL,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_read"  ON conversations;
DROP POLICY IF EXISTS "conversations_write" ON conversations;
CREATE POLICY "conversations_read"  ON conversations FOR SELECT USING (auth.uid()=participant_1 OR auth.uid()=participant_2);
CREATE POLICY "conversations_write" ON conversations FOR ALL   USING (auth.uid()=participant_1 OR auth.uid()=participant_2);

-- 5. messages
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL,
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_read"   ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_read" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id=conversation_id AND (participant_1=auth.uid() OR participant_2=auth.uid()))
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  auth.uid()=sender_id AND
  EXISTS (SELECT 1 FROM conversations WHERE id=conversation_id AND (participant_1=auth.uid() OR participant_2=auth.uid()))
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations WHERE id=conversation_id AND (participant_1=auth.uid() OR participant_2=auth.uid()))
);

-- 6. Enable realtime for messages & conversations
ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversations;
