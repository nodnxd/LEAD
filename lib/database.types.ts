// Supabase 스키마에서 생성한 타입. 손으로 고치지 말 것.
// 재생성: Supabase MCP의 generate_typescript_types, 또는
//   npx supabase gen types typescript --project-id laebobhsuwzknboyqsyo

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          host_id: string | null
          id: string
          links: Json | null
          name: string
          nationality: string | null
          photo_url: string | null
          role: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          host_id?: string | null
          id?: string
          links?: Json | null
          name: string
          nationality?: string | null
          photo_url?: string | null
          role?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          host_id?: string | null
          id?: string
          links?: Json | null
          name?: string
          nationality?: string | null
          photo_url?: string | null
          role?: string | null
        }
        Relationships: []
      }
      availability_picks: {
        Row: {
          created_at: string | null
          day: number
          id: string
          member_id: string
          poll_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          day: number
          id?: string
          member_id: string
          poll_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          day?: number
          id?: string
          member_id?: string
          poll_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_picks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_picks_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "availability_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_polls: {
        Row: {
          blocked_days: number[]
          created_at: string | null
          excluded_members: string[] | null
          final_day: number | null
          final_days: number[]
          host_id: string
          id: string
          is_open: boolean
          month: string
          project: string | null
          title: string | null
        }
        Insert: {
          blocked_days?: number[]
          created_at?: string | null
          excluded_members?: string[] | null
          final_day?: number | null
          final_days?: number[]
          host_id: string
          id?: string
          is_open?: boolean
          month: string
          project?: string | null
          title?: string | null
        }
        Update: {
          blocked_days?: number[]
          created_at?: string | null
          excluded_members?: string[] | null
          final_day?: number | null
          final_days?: number[]
          host_id?: string
          id?: string
          is_open?: boolean
          month?: string
          project?: string | null
          title?: string | null
        }
        Relationships: []
      }
      availability_submissions: {
        Row: {
          member_id: string
          poll_id: string
          submitted_at: string | null
        }
        Insert: {
          member_id: string
          poll_id: string
          submitted_at?: string | null
        }
        Update: {
          member_id?: string
          poll_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_submissions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "availability_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          id: string
          role: string
          song_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role?: string
          song_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: []
      }
      copyright_profiles: {
        Row: {
          address: string | null
          email: string | null
          id: string
          ipi: string | null
          ipi_base: string | null
          legal_name: string | null
          phone: string | null
          pro: string | null
          publisher_ipi: string | null
          publisher_ipi_base: string | null
          publisher_name: string | null
          publisher_pro: string | null
          signature_data: string | null
          signature_name: string | null
          stage_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          id: string
          ipi?: string | null
          ipi_base?: string | null
          legal_name?: string | null
          phone?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_ipi_base?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          signature_data?: string | null
          signature_name?: string | null
          stage_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          id?: string
          ipi?: string | null
          ipi_base?: string | null
          legal_name?: string | null
          phone?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_ipi_base?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          signature_data?: string | null
          signature_name?: string | null
          stage_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      demo_tracks: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_url: string
          id: string
          member_id: string | null
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          member_id?: string | null
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          member_id?: string | null
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_tracks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          id: string
          recipient_id: string
          requester_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipient_id: string
          requester_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string | null
        }
        Relationships: []
      }
      guest_approvals: {
        Row: {
          created_at: string | null
          guest_id: string
          host_id: string
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id: string
          host_id: string
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string
          host_id?: string
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      guestbook: {
        Row: {
          author_id: string
          author_name: string | null
          body: string
          created_at: string | null
          id: string
          owner_id: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          body: string
          created_at?: string | null
          id?: string
          owner_id: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          body?: string
          created_at?: string | null
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          artist_name: string
          company: string | null
          created_at: string | null
          demo_link: string | null
          email: string
          genre_etc: string | null
          genres: string[] | null
          id: string
          instagram: string | null
          memo: string | null
          name: string
          phone: string | null
          photo_url: string | null
          profile_completed: boolean | null
          roles: string[] | null
          status: string | null
        }
        Insert: {
          artist_name: string
          company?: string | null
          created_at?: string | null
          demo_link?: string | null
          email: string
          genre_etc?: string | null
          genres?: string[] | null
          id: string
          instagram?: string | null
          memo?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          roles?: string[] | null
          status?: string | null
        }
        Update: {
          artist_name?: string
          company?: string | null
          created_at?: string | null
          demo_link?: string | null
          email?: string
          genre_etc?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          memo?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          roles?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
      host_approvals: {
        Row: {
          created_at: string | null
          email: string | null
          host_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          host_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          host_id?: string
          status?: string | null
        }
        Relationships: []
      }
      host_grants: {
        Row: {
          created_at: string | null
          email: string
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      host_profiles: {
        Row: {
          bio: string | null
          company: string | null
          display_name: string | null
          folders: string[] | null
          genres: string[] | null
          id: string
          instagram: string | null
          photo_url: string | null
          roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          display_name?: string | null
          folders?: string[] | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          photo_url?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          display_name?: string | null
          folders?: string[] | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          photo_url?: string | null
          roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      host_settings: {
        Row: {
          host_id: string
          project_order: Json | null
          team_order: Json | null
        }
        Insert: {
          host_id: string
          project_order?: Json | null
          team_order?: Json | null
        }
        Update: {
          host_id?: string
          project_order?: Json | null
          team_order?: Json | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string | null
          email: string
          host_id: string
          id: string
          joined_at: string | null
          product: string
          profile_id: string | null
          project: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          email: string
          host_id: string
          id?: string
          joined_at?: string | null
          product?: string
          profile_id?: string | null
          project?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          host_id?: string
          id?: string
          joined_at?: string | null
          product?: string
          profile_id?: string | null
          project?: string | null
          status?: string
        }
        Relationships: []
      }
      lead_announcements: {
        Row: {
          content: string | null
          created_at: string | null
          host_id: string
          id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          host_id: string
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          host_id?: string
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          album_type: string | null
          artist: string
          content: string | null
          content_en: string | null
          created_at: string | null
          deadline: string | null
          deadline2: string | null
          gender: string | null
          group_type: string | null
          host_id: string
          id: string
          kind: string | null
          links: string[] | null
          memo: string | null
          reference_url: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          album_type?: string | null
          artist: string
          content?: string | null
          content_en?: string | null
          created_at?: string | null
          deadline?: string | null
          deadline2?: string | null
          gender?: string | null
          group_type?: string | null
          host_id: string
          id?: string
          kind?: string | null
          links?: string[] | null
          memo?: string | null
          reference_url?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          album_type?: string | null
          artist?: string
          content?: string | null
          content_en?: string | null
          created_at?: string | null
          deadline?: string | null
          deadline2?: string | null
          gender?: string | null
          group_type?: string | null
          host_id?: string
          id?: string
          kind?: string | null
          links?: string[] | null
          memo?: string | null
          reference_url?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      member_approvals: {
        Row: {
          created_at: string | null
          host_id: string
          id: string
          member_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          host_id: string
          id?: string
          member_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          host_id?: string
          id?: string
          member_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_approvals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          artist_name: string
          bio: string | null
          company: string | null
          created_at: string | null
          demo_link: string | null
          email: string
          gender: string | null
          genre_etc: string | null
          genres: string[] | null
          id: string
          instagram: string | null
          links: Json | null
          memo: string | null
          name: string
          phone: string | null
          photo_url: string | null
          profile_completed: boolean | null
          roles: string[] | null
          status: string | null
        }
        Insert: {
          artist_name: string
          bio?: string | null
          company?: string | null
          created_at?: string | null
          demo_link?: string | null
          email: string
          gender?: string | null
          genre_etc?: string | null
          genres?: string[] | null
          id: string
          instagram?: string | null
          links?: Json | null
          memo?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          roles?: string[] | null
          status?: string | null
        }
        Update: {
          artist_name?: string
          bio?: string | null
          company?: string | null
          created_at?: string | null
          demo_link?: string | null
          email?: string
          gender?: string | null
          genre_etc?: string | null
          genres?: string[] | null
          id?: string
          instagram?: string | null
          links?: Json | null
          memo?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          roles?: string[] | null
          status?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string | null
          created_at: string | null
          host_id: string | null
          id: string
          is_global: boolean | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_global?: boolean | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
        }
        Relationships: []
      }
      pitch_files: {
        Row: {
          bpm: number | null
          created_at: string | null
          duration: number | null
          file_hash: string | null
          file_name: string | null
          file_url: string
          folder: string | null
          genre: string | null
          hidden: boolean | null
          host_id: string
          id: string
          key: string | null
          pitch_id: string
          tags: string[] | null
          vocal_gender: string | null
        }
        Insert: {
          bpm?: number | null
          created_at?: string | null
          duration?: number | null
          file_hash?: string | null
          file_name?: string | null
          file_url: string
          folder?: string | null
          genre?: string | null
          hidden?: boolean | null
          host_id: string
          id?: string
          key?: string | null
          pitch_id: string
          tags?: string[] | null
          vocal_gender?: string | null
        }
        Update: {
          bpm?: number | null
          created_at?: string | null
          duration?: number | null
          file_hash?: string | null
          file_name?: string | null
          file_url?: string
          folder?: string | null
          genre?: string | null
          hidden?: boolean | null
          host_id?: string
          id?: string
          key?: string | null
          pitch_id?: string
          tags?: string[] | null
          vocal_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_files_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          archived: boolean | null
          artist_name: string
          bpm: number | null
          contact: string
          created_at: string | null
          duration: number | null
          file_hash: string | null
          file_name: string | null
          file_url: string | null
          genre: string | null
          hidden: boolean | null
          host_id: string
          id: string
          lead_id: string | null
          member_id: string | null
          message: string | null
          status: string | null
          status_log: Json | null
          vocal_gender: string | null
        }
        Insert: {
          archived?: boolean | null
          artist_name: string
          bpm?: number | null
          contact: string
          created_at?: string | null
          duration?: number | null
          file_hash?: string | null
          file_name?: string | null
          file_url?: string | null
          genre?: string | null
          hidden?: boolean | null
          host_id: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          message?: string | null
          status?: string | null
          status_log?: Json | null
          vocal_gender?: string | null
        }
        Update: {
          archived?: boolean | null
          artist_name?: string
          bpm?: number | null
          contact?: string
          created_at?: string | null
          duration?: number | null
          file_hash?: string | null
          file_name?: string | null
          file_url?: string | null
          genre?: string | null
          hidden?: boolean | null
          host_id?: string
          id?: string
          lead_id?: string | null
          member_id?: string | null
          message?: string | null
          status?: string | null
          status_log?: Json | null
          vocal_gender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code: string | null
          attendance: string | null
          bgm_title: string | null
          bgm_url: string | null
          day_number: number | null
          featured_song_id: string | null
          gender: string | null
          host_id: string | null
          host_nickname: string | null
          hp_intro: string | null
          id: string
          links: Json | null
          member_user_id: string | null
          name: string
          order_index: number | null
          project: string | null
          role: string | null
          specialty: string | null
          team: string | null
          TEAM: string | null
          theme: Json | null
          user_id: string | null
        }
        Insert: {
          access_code?: string | null
          attendance?: string | null
          bgm_title?: string | null
          bgm_url?: string | null
          day_number?: number | null
          featured_song_id?: string | null
          gender?: string | null
          host_id?: string | null
          host_nickname?: string | null
          hp_intro?: string | null
          id?: string
          links?: Json | null
          member_user_id?: string | null
          name: string
          order_index?: number | null
          project?: string | null
          role?: string | null
          specialty?: string | null
          team?: string | null
          TEAM?: string | null
          theme?: Json | null
          user_id?: string | null
        }
        Update: {
          access_code?: string | null
          attendance?: string | null
          bgm_title?: string | null
          bgm_url?: string | null
          day_number?: number | null
          featured_song_id?: string | null
          gender?: string | null
          host_id?: string | null
          host_nickname?: string | null
          hp_intro?: string | null
          id?: string
          links?: Json | null
          member_user_id?: string | null
          name?: string
          order_index?: number | null
          project?: string | null
          role?: string | null
          specialty?: string | null
          team?: string | null
          TEAM?: string | null
          theme?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      released_works: {
        Row: {
          artist_name: string
          created_at: string | null
          id: string
          link: string
          member_id: string | null
          order_index: number | null
          song_title: string
        }
        Insert: {
          artist_name: string
          created_at?: string | null
          id?: string
          link: string
          member_id?: string | null
          order_index?: number | null
          song_title: string
        }
        Update: {
          artist_name?: string
          created_at?: string | null
          id?: string
          link?: string
          member_id?: string | null
          order_index?: number | null
          song_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "released_works_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          message: string
          song_id: string | null
          status: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          message: string
          song_id?: string | null
          status?: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          message?: string
          song_id?: string | null
          status?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_assignments: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          order_index: number | null
          profile_id: string
          project: string
          team: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          order_index?: number | null
          profile_id: string
          project: string
          team?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          order_index?: number | null
          profile_id?: string
          project?: string
          team?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          camp_name: string
          created_at: string | null
          day_number: number
          host_id: string | null
          id: string
          links: Json | null
          memo: string | null
          project: string
          roster: Json | null
        }
        Insert: {
          camp_name: string
          created_at?: string | null
          day_number: number
          host_id?: string | null
          id?: string
          links?: Json | null
          memo?: string | null
          project: string
          roster?: Json | null
        }
        Update: {
          camp_name?: string
          created_at?: string | null
          day_number?: number
          host_id?: string | null
          id?: string
          links?: Json | null
          memo?: string | null
          project?: string
          roster?: Json | null
        }
        Relationships: []
      }
      songs: {
        Row: {
          artist: string | null
          blocks: Json
          created_at: string | null
          created_by: string
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          blocks?: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          blocks?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      split_contributors: {
        Row: {
          address: string | null
          arrangement_share: number | null
          category: string | null
          composition_share: number | null
          consent_agreed: boolean | null
          created_at: string | null
          email: string | null
          id: string
          ipi: string | null
          ipi_base: string | null
          legal_name: string | null
          lyrics_share: number | null
          order_index: number | null
          phone: string | null
          pro: string | null
          publisher_ipi: string | null
          publisher_name: string | null
          publisher_pro: string | null
          share: number | null
          sheet_id: string
          sign_method: string | null
          sign_token: string | null
          signature_data: string | null
          signature_name: string | null
          signed: boolean | null
          signed_at: string | null
          signed_email: string | null
          signed_hash: string | null
          signed_ip: string | null
          signed_ua: string | null
          stage_name: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          arrangement_share?: number | null
          category?: string | null
          composition_share?: number | null
          consent_agreed?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          ipi?: string | null
          ipi_base?: string | null
          legal_name?: string | null
          lyrics_share?: number | null
          order_index?: number | null
          phone?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          share?: number | null
          sheet_id: string
          sign_method?: string | null
          sign_token?: string | null
          signature_data?: string | null
          signature_name?: string | null
          signed?: boolean | null
          signed_at?: string | null
          signed_email?: string | null
          signed_hash?: string | null
          signed_ip?: string | null
          signed_ua?: string | null
          stage_name?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          arrangement_share?: number | null
          category?: string | null
          composition_share?: number | null
          consent_agreed?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          ipi?: string | null
          ipi_base?: string | null
          legal_name?: string | null
          lyrics_share?: number | null
          order_index?: number | null
          phone?: string | null
          pro?: string | null
          publisher_ipi?: string | null
          publisher_name?: string | null
          publisher_pro?: string | null
          share?: number | null
          sheet_id?: string
          sign_method?: string | null
          sign_token?: string | null
          signature_data?: string | null
          signature_name?: string | null
          signed?: boolean | null
          signed_at?: string | null
          signed_email?: string | null
          signed_hash?: string | null
          signed_ip?: string | null
          signed_ua?: string | null
          stage_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_contributors_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "split_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      split_sheets: {
        Row: {
          aka: string | null
          album: string | null
          artist_name: string | null
          audio_name: string | null
          audio_path: string | null
          contains_sample: boolean | null
          created_at: string | null
          duration: string | null
          id: string
          isrc: string | null
          iswc: string | null
          locked: boolean | null
          locked_at: string | null
          notes: string | null
          owner_id: string
          sample_note: string | null
          signature_requested_at: string | null
          song_title: string | null
          updated_at: string | null
          version: number | null
          work_date: string | null
        }
        Insert: {
          aka?: string | null
          album?: string | null
          artist_name?: string | null
          audio_name?: string | null
          audio_path?: string | null
          contains_sample?: boolean | null
          created_at?: string | null
          duration?: string | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          locked?: boolean | null
          locked_at?: string | null
          notes?: string | null
          owner_id: string
          sample_note?: string | null
          signature_requested_at?: string | null
          song_title?: string | null
          updated_at?: string | null
          version?: number | null
          work_date?: string | null
        }
        Update: {
          aka?: string | null
          album?: string | null
          artist_name?: string | null
          audio_name?: string | null
          audio_path?: string | null
          contains_sample?: boolean | null
          created_at?: string | null
          duration?: string | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          locked?: boolean | null
          locked_at?: string | null
          notes?: string | null
          owner_id?: string
          sample_note?: string | null
          signature_requested_at?: string | null
          song_title?: string | null
          updated_at?: string | null
          version?: number | null
          work_date?: string | null
        }
        Relationships: []
      }
      user_products: {
        Row: {
          enabled_at: string | null
          product: string
          user_id: string
        }
        Insert: {
          enabled_at?: string | null
          product: string
          user_id: string
        }
        Update: {
          enabled_at?: string | null
          product?: string
          user_id?: string
        }
        Relationships: []
      }
      versions: {
        Row: {
          blocks: Json
          created_at: string | null
          created_by: string
          id: string
          note: string | null
          song_id: string
        }
        Insert: {
          blocks: Json
          created_at?: string | null
          created_by: string
          id?: string
          note?: string | null
          song_id: string
        }
        Update: {
          blocks?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          note?: string | null
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "versions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          id: number
          lang: string | null
          path: string | null
          referrer: string | null
          screen: string | null
          source: string | null
          ua: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: never
          lang?: string | null
          path?: string | null
          referrer?: string | null
          screen?: string | null
          source?: string | null
          ua?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: never
          lang?: string | null
          path?: string | null
          referrer?: string | null
          screen?: string | null
          source?: string | null
          ua?: string | null
        }
        Relationships: []
      }
      voting_sessions: {
        Row: {
          created_at: string | null
          host_id: string | null
          id: string
          is_open: boolean | null
          memo: string | null
          result: Json | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_open?: boolean | null
          memo?: string | null
          result?: Json | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          host_id?: string | null
          id?: string
          is_open?: boolean | null
          memo?: string | null
          result?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      works: {
        Row: {
          category: string
          client: string
          created_at: string
          featured: boolean
          id: string
          itunes_id: string | null
          link: string | null
          link_fixed: boolean
          role: string | null
          sort_order: number
          title: string | null
          updated_at: string
          visible: boolean
          youtube_id: string | null
        }
        Insert: {
          category: string
          client: string
          created_at?: string
          featured?: boolean
          id?: string
          itunes_id?: string | null
          link?: string | null
          link_fixed?: boolean
          role?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          visible?: boolean
          youtube_id?: string | null
        }
        Update: {
          category?: string
          client?: string
          created_at?: string
          featured?: boolean
          id?: string
          itunes_id?: string | null
          link?: string | null
          link_fixed?: boolean
          role?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          visible?: boolean
          youtube_id?: string | null
        }
        Relationships: []
      }
      workspace_admins: {
        Row: {
          admin_email: string
          admin_id: string | null
          created_at: string | null
          id: string
          workspace_id: string
        }
        Insert: {
          admin_email: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          workspace_id: string
        }
        Update: {
          admin_email?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      availability_toggle: {
        Args: {
          p_code: string
          p_day: number
          p_member: string
          p_on: boolean
          p_poll: string
        }
        Returns: undefined
      }
      availability_verify: {
        Args: { p_code: string; p_member: string }
        Returns: boolean
      }
      claim_invites: { Args: never; Returns: Json }
      find_guest_email: {
        Args: { p_name: string; p_phone: string }
        Returns: string
      }
      is_approved_member: { Args: { h: string; u: string }; Returns: boolean }
      is_split_contributor: { Args: { p_sheet_id: string }; Returns: boolean }
      is_split_owner: { Args: { p_sheet_id: string }; Returns: boolean }
      is_ws_admin: { Args: { uid: string; ws: string }; Returns: boolean }
      shares_team: { Args: { target: string }; Returns: boolean }
      split_get_by_token: { Args: { p_token: string }; Returns: Json }
      split_sign_by_token: {
        Args: {
          p_data: string
          p_hash: string
          p_name: string
          p_token: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
