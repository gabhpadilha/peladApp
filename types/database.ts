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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          id: string
          requested_at: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      award_reveals: {
        Row: {
          match_id: string
          member_id: string
          seen_at: string
        }
        Insert: {
          match_id: string
          member_id: string
          seen_at?: string
        }
        Update: {
          match_id?: string
          member_id?: string
          seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_reveals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_reveals_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          attributes: Json
          created_at: string
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["award_kind"]
          match_id: string
          member_id: string
          ovr: number | null
          position: Database["public"]["Enums"]["player_position"]
          score: number | null
          theme: string
          votes: number
        }
        Insert: {
          attributes?: Json
          created_at?: string
          group_id: string
          id?: string
          kind: Database["public"]["Enums"]["award_kind"]
          match_id: string
          member_id: string
          ovr?: number | null
          position: Database["public"]["Enums"]["player_position"]
          score?: number | null
          theme?: string
          votes: number
        }
        Update: {
          attributes?: Json
          created_at?: string
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["award_kind"]
          match_id?: string
          member_id?: string
          ovr?: number | null
          position?: Database["public"]["Enums"]["player_position"]
          score?: number | null
          theme?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "awards_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_group_id_match_id_fkey"
            columns: ["group_id", "match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["group_id", "id"]
          },
          {
            foreignKeyName: "awards_group_id_member_id_fkey"
            columns: ["group_id", "member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["group_id", "id"]
          },
        ]
      }
      card_skin_purchases: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_id: string
          price: number
          skin: string
          source: string
          transferred_at: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_id: string
          price: number
          skin: string
          source?: string
          transferred_at?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string
          price?: number
          skin?: string
          source?: string
          transferred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_skin_purchases_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_skin_purchases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          chu: number | null
          created_at: string
          def: number | null
          dri: number | null
          ela: number | null
          evaluator_id: string
          fis: number | null
          id: string
          match_id: string
          pas: number | null
          pes: number | null
          player_id: string
          pos: number | null
          ref: number | null
          rep: number | null
          sai: number | null
          vel: number | null
        }
        Insert: {
          chu?: number | null
          created_at?: string
          def?: number | null
          dri?: number | null
          ela?: number | null
          evaluator_id: string
          fis?: number | null
          id?: string
          match_id: string
          pas?: number | null
          pes?: number | null
          player_id: string
          pos?: number | null
          ref?: number | null
          rep?: number | null
          sai?: number | null
          vel?: number | null
        }
        Update: {
          chu?: number | null
          created_at?: string
          def?: number | null
          dri?: number | null
          ela?: number | null
          evaluator_id?: string
          fis?: number | null
          id?: string
          match_id?: string
          pas?: number | null
          pes?: number | null
          player_id?: string
          pos?: number | null
          ref?: number | null
          rep?: number | null
          sai?: number | null
          vel?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_match_id_evaluator_id_fkey"
            columns: ["match_id", "evaluator_id"]
            isOneToOne: false
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
          {
            foreignKeyName: "evaluations_match_id_player_id_fkey"
            columns: ["match_id", "player_id"]
            isOneToOne: false
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          award_id: string
          created_at: string
          group_id: string
          id: string
          member_id: string
        }
        Insert: {
          author_id: string
          award_id: string
          created_at?: string
          group_id: string
          id?: string
          member_id: string
        }
        Update: {
          author_id?: string
          award_id?: string
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: true
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          card_skin: string | null
          deactivated_at: string | null
          group_id: string
          id: string
          joined_at: string
          nickname: string
          photo_kind: string | null
          photo_path: string | null
          position: Database["public"]["Enums"]["player_position"]
          public_profile_at: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          welcome_bonus_seen_at: string | null
        }
        Insert: {
          card_skin?: string | null
          deactivated_at?: string | null
          group_id: string
          id?: string
          joined_at?: string
          nickname: string
          photo_kind?: string | null
          photo_path?: string | null
          position: Database["public"]["Enums"]["player_position"]
          public_profile_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          welcome_bonus_seen_at?: string | null
        }
        Update: {
          card_skin?: string | null
          deactivated_at?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          nickname?: string
          photo_kind?: string | null
          photo_path?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          public_profile_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          welcome_bonus_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_private: {
        Row: {
          admin_notes: string | null
          group_id: string
          owner_contact: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          group_id: string
          owner_contact?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          group_id?: string
          owner_contact?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_private_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_showcase: {
        Row: {
          group_id: string
          players: Json
          updated_at: string
        }
        Insert: {
          group_id: string
          players?: Json
          updated_at?: string
        }
        Update: {
          group_id?: string
          players?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_showcase_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          id: string
          invite_code: string
          listed_at: string | null
          name: string
          name_key: string
          pack_min_players: number
          packs_enabled: boolean
          plan: string
          play_time: string | null
          play_weekday: number | null
          slug: string | null
          state: string | null
          suspended_at: string | null
          usual_players: number | null
          venue: string | null
          weekly_round_limit: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          listed_at?: string | null
          name: string
          name_key: string
          pack_min_players?: number
          packs_enabled?: boolean
          plan?: string
          play_time?: string | null
          play_weekday?: number | null
          slug?: string | null
          state?: string | null
          suspended_at?: string | null
          usual_players?: number | null
          venue?: string | null
          weekly_round_limit?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          listed_at?: string | null
          name?: string
          name_key?: string
          pack_min_players?: number
          packs_enabled?: boolean
          plan?: string
          play_time?: string | null
          play_weekday?: number | null
          slug?: string | null
          state?: string | null
          suspended_at?: string | null
          usual_players?: number | null
          venue?: string | null
          weekly_round_limit?: number | null
        }
        Relationships: []
      }
      market_listings: {
        Row: {
          buyer_member_id: string | null
          created_at: string
          expires_at: string
          id: string
          price: number
          purchase_id: string
          seller_group_id: string
          seller_member_id: string
          skin: string
          sold_at: string | null
          status: string
        }
        Insert: {
          buyer_member_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          price: number
          purchase_id: string
          seller_group_id: string
          seller_member_id: string
          skin: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          buyer_member_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          price?: number
          purchase_id?: string
          seller_group_id?: string
          seller_member_id?: string
          skin?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_buyer_member_id_fkey"
            columns: ["buyer_member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "card_skin_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_seller_group_id_fkey"
            columns: ["seller_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_listings_seller_member_id_fkey"
            columns: ["seller_member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      match_attendance: {
        Row: {
          goals_checked_at: string | null
          group_id: string
          match_id: string
          member_id: string
          plays_in_goal: boolean | null
          reserve: boolean
          team: number
        }
        Insert: {
          goals_checked_at?: string | null
          group_id: string
          match_id: string
          member_id: string
          plays_in_goal?: boolean | null
          reserve?: boolean
          team: number
        }
        Update: {
          goals_checked_at?: string | null
          group_id?: string
          match_id?: string
          member_id?: string
          plays_in_goal?: boolean | null
          reserve?: boolean
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_attendance_group_id_match_id_fkey"
            columns: ["group_id", "match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["group_id", "id"]
          },
          {
            foreignKeyName: "match_attendance_group_id_member_id_fkey"
            columns: ["group_id", "member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["group_id", "id"]
          },
        ]
      }
      match_goal_confirmations: {
        Row: {
          confirmed: boolean
          created_at: string
          group_id: string
          match_id: string
          member_id: string
          voter_id: string
        }
        Insert: {
          confirmed: boolean
          created_at?: string
          group_id: string
          match_id: string
          member_id: string
          voter_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          group_id?: string
          match_id?: string
          member_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_goal_confirmations_group_id_match_id_fkey"
            columns: ["group_id", "match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["group_id", "id"]
          },
          {
            foreignKeyName: "match_goal_confirmations_match_id_member_id_fkey"
            columns: ["match_id", "member_id"]
            isOneToOne: false
            referencedRelation: "match_goals"
            referencedColumns: ["match_id", "member_id"]
          },
          {
            foreignKeyName: "match_goal_confirmations_match_id_voter_id_fkey"
            columns: ["match_id", "voter_id"]
            isOneToOne: false
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
        ]
      }
      match_goals: {
        Row: {
          goals: number
          group_id: string
          match_id: string
          member_id: string
          reported_by: string
          updated_at: string
        }
        Insert: {
          goals: number
          group_id: string
          match_id: string
          member_id: string
          reported_by: string
          updated_at?: string
        }
        Update: {
          goals?: number
          group_id?: string
          match_id?: string
          member_id?: string
          reported_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_goals_group_id_match_id_fkey"
            columns: ["group_id", "match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["group_id", "id"]
          },
          {
            foreignKeyName: "match_goals_match_id_member_id_fkey"
            columns: ["match_id", "member_id"]
            isOneToOne: true
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
          {
            foreignKeyName: "match_goals_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          played_on: string
          ratings_unlocked_at: string | null
          round: number
          score_a: number | null
          score_b: number | null
          status: Database["public"]["Enums"]["match_status"]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          played_on: string
          ratings_unlocked_at?: string | null
          round: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["match_status"]
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          played_on?: string
          ratings_unlocked_at?: string | null
          round?: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["match_status"]
        }
        Relationships: [
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_config: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      pack_rarity_coins: {
        Row: {
          coins: number
          rarity: string
        }
        Insert: {
          coins: number
          rarity: string
        }
        Update: {
          coins?: number
          rarity?: string
        }
        Relationships: []
      }
      pack_sets: {
        Row: {
          design: string
          month: string
          rarity: string
          skin: string
        }
        Insert: {
          design: string
          month: string
          rarity: string
          skin: string
        }
        Update: {
          design?: string
          month?: string
          rarity?: string
          skin?: string
        }
        Relationships: []
      }
      pack_tier_odds: {
        Row: {
          rarity: string
          tier: string
          weight: number
        }
        Insert: {
          rarity: string
          tier: string
          weight: number
        }
        Update: {
          rarity?: string
          tier?: string
          weight?: number
        }
        Relationships: []
      }
      packs: {
        Row: {
          coins_awarded: number
          created_at: string
          goal_choice_id: string | null
          group_id: string
          id: string
          match_id: string
          member_id: string
          month: string
          odds: Json
          opened_at: string | null
          rarity: string
          skin: string
          source: string
          tier: string
          was_duplicate: boolean | null
          was_forced: boolean
        }
        Insert: {
          coins_awarded?: number
          created_at?: string
          goal_choice_id?: string | null
          group_id: string
          id?: string
          match_id: string
          member_id: string
          month: string
          odds: Json
          opened_at?: string | null
          rarity: string
          skin: string
          source?: string
          tier: string
          was_duplicate?: boolean | null
          was_forced?: boolean
        }
        Update: {
          coins_awarded?: number
          created_at?: string
          goal_choice_id?: string | null
          group_id?: string
          id?: string
          match_id?: string
          member_id?: string
          month?: string
          odds?: Json
          opened_at?: string | null
          rarity?: string
          skin?: string
          source?: string
          tier?: string
          was_duplicate?: boolean | null
          was_forced?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "packs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_platform_admin: boolean
          terms_accepted_at: string | null
          terms_version: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_platform_admin?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_platform_admin?: boolean
          terms_accepted_at?: string | null
          terms_version?: string | null
          username?: string | null
        }
        Relationships: []
      }
      round_votes: {
        Row: {
          created_at: string
          kind: Database["public"]["Enums"]["award_kind"]
          match_id: string
          nominee_id: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          kind: Database["public"]["Enums"]["award_kind"]
          match_id: string
          nominee_id: string
          voter_id: string
        }
        Update: {
          created_at?: string
          kind?: Database["public"]["Enums"]["award_kind"]
          match_id?: string
          nominee_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_votes_match_id_nominee_id_fkey"
            columns: ["match_id", "nominee_id"]
            isOneToOne: false
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
          {
            foreignKeyName: "round_votes_match_id_voter_id_fkey"
            columns: ["match_id", "voter_id"]
            isOneToOne: false
            referencedRelation: "match_attendance"
            referencedColumns: ["match_id", "member_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_terms: {
        Args: { terms_version_accepted: string }
        Returns: undefined
      }
      award_card_value: {
        Args: { average: number; bonus: number }
        Returns: number
      }
      cancel_account_deletion: { Args: never; Returns: undefined }
      card_ovr: { Args: { vals: number[] }; Returns: number }
      close_match: {
        Args: { target_match: string; theme_key?: string }
        Returns: number
      }
      compute_match_awards: {
        Args: { target_match: string; theme_key: string }
        Returns: number
      }
      confirm_goals: {
        Args: {
          expected_goals?: number
          is_confirmed: boolean
          target_match: string
          target_member: string
        }
        Returns: undefined
      }
      count_my_unopened_packs: { Args: never; Returns: number }
      counted_evaluations: {
        Args: { target_group: string }
        Returns: {
          chu: number
          counted: boolean
          def: number
          dri: number
          ela: number
          evaluation_id: string
          fis: number
          match_id: string
          off_position: boolean
          pas: number
          pes: number
          played_on: string
          player_id: string
          pos: number
          received: number
          ref: number
          rep: number
          sai: number
          score: number
          vel: number
        }[]
      }
      create_group: {
        Args: {
          group_name: string
          member_nickname: string
          member_position: Database["public"]["Enums"]["player_position"]
        }
        Returns: string
      }
      create_match: {
        Args: {
          match_date: string
          present_member_ids: string[]
          reserve_flags: boolean[]
          target_group: string
          team_numbers: number[]
        }
        Returns: string
      }
      current_member_id: { Args: { target_group: string }; Returns: string }
      draw_round_packs: { Args: { target_match: string }; Returns: number }
      finish_goal_check: { Args: { target_match: string }; Returns: undefined }
      get_feed: {
        Args: { before?: string; max_rows?: number }
        Returns: {
          attributes: Json
          award_id: string
          card_position: Database["public"]["Enums"]["player_position"]
          card_skin: string
          city: string
          created_at: string
          group_id: string
          group_name: string
          is_mine: boolean
          kind: Database["public"]["Enums"]["award_kind"]
          member_id: string
          my_reaction: string
          nickname: string
          ovr: number
          photo_kind: string
          photo_path: string
          played_on: string
          post_id: string
          reactions: Json
          round: number
          score: number
          state: string
          theme: string
          votes: number
        }[]
      }
      accept_goal: {
        Args: { chosen_key: string; target_group: string }
        Returns: undefined
      }
      get_my_goals: {
        Args: { target_group: string }
        Returns: {
          accepted_at: string | null
          chosen: boolean
          completed_at: string | null
          label: string
          level: string
          option_key: string
          progress: number | null
          sort_order: number
          target: number
          tier: string
        }[]
      }
      get_group_goals: {
        Args: { target_group: string }
        Returns: {
          goals: number
          match_id: string
          member_id: string
          no_count: number
          reported_by: string
          yes_count: number
        }[]
      }
      get_group_scores: {
        Args: { target_group: string }
        Returns: {
          chu: number
          def: number
          dri: number
          ela: number
          evaluation_id: string
          fis: number
          match_id: string
          off_position: boolean
          pas: number
          pes: number
          player_id: string
          pos: number
          ref: number
          rep: number
          sai: number
          vel: number
        }[]
      }
      get_group_showcase: {
        Args: { target_group: string }
        Returns: {
          city: string
          group_id: string
          name: string
          play_time: string
          play_weekday: number
          players: Json
          state: string
          updated_at: string
        }[]
      }
      get_invite: {
        Args: { code: string }
        Returns: {
          group_id: string
          group_name: string
        }[]
      }
      get_listed_groups: {
        Args: never
        Returns: {
          active_players: number
          city: string
          group_id: string
          name: string
          play_time: string
          play_weekday: number
          public_players: number
          state: string
        }[]
      }
      get_market_listings: {
        Args: { target_group: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          is_mine: boolean
          price: number
          seller_group: string
          seller_nickname: string
          skin: string
        }[]
      }
      get_match_submissions: {
        Args: { target_group: string }
        Returns: {
          match_id: string
          submitted: number
        }[]
      }
      get_member_submissions: {
        Args: { target_group: string }
        Returns: {
          match_id: string
          member_id: string
        }[]
      }
      get_my_deletion_request: { Args: never; Returns: string }
      get_my_listings: {
        Args: { target_group: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          price: number
          purchase_id: string
          skin: string
          sold_at: string
          status: string
          buyer_nickname: string
          buyer_group: string
        }[]
      }
      get_my_market_income: { Args: { target_group: string }; Returns: number }
      get_my_packs: {
        Args: never
        Returns: {
          coins_awarded: number
          created_at: string
          match_id: string
          month: string
          odds: Json
          opened_at: string
          pack_id: string
          rarity: string
          round: number
          skin: string
          source: string
          tier: string
          was_duplicate: boolean
        }[]
      }
      get_public_awards: {
        Args: { target_member: string }
        Returns: {
          attributes: Json
          award_id: string
          card_position: Database["public"]["Enums"]["player_position"]
          created_at: string
          kind: Database["public"]["Enums"]["award_kind"]
          ovr: number
          played_on: string
          round: number
          score: number
          theme: string
          votes: number
        }[]
      }
      group_name_key: { Args: { group_name: string }; Returns: string }
      is_group_member: { Args: { target_group: string }; Returns: boolean }
      is_group_organizer: { Args: { target_group: string }; Returns: boolean }
      is_group_owner: { Args: { target_group: string }; Returns: boolean }
      join_group: {
        Args: {
          code: string
          member_nickname: string
          member_position: Database["public"]["Enums"]["player_position"]
        }
        Returns: string
      }
      market_buy: {
        Args: { buyer: string; earned: number; target_listing: string }
        Returns: string
      }
      market_cancel: {
        Args: { seller: string; target_listing: string }
        Returns: undefined
      }
      market_list: {
        Args: {
          ask_price: number
          hours?: number
          seller: string
          target_purchase: string
        }
        Returns: string
      }
      market_release_expired: {
        Args: { target_purchase: string }
        Returns: undefined
      }
      open_pack: {
        Args: { target_pack: string }
        Returns: {
          coins_awarded: number
          rarity: string
          skin: string
          was_duplicate: boolean
        }[]
      }
      pack_round_ranking: {
        Args: { target_match: string }
        Returns: {
          member_id: string
          round_rank: number
          tier: string
        }[]
      }
      publish_award: { Args: { target_award: string }; Returns: string }
      ratings_open: { Args: { target_match: string }; Returns: boolean }
      rename_group: {
        Args: { new_name: string; target_group: string }
        Returns: undefined
      }
      report_goals: {
        Args: {
          goal_count: number
          target_match: string
          target_member: string
        }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: undefined }
      round_score: {
        Args: {
          chu: number
          def: number
          dri: number
          ela: number
          fis: number
          legacy_score: number
          match_date: string
          pas: number
          pes: number
          pos: number
          ref: number
          rep: number
          sai: number
          vel: number
        }
        Returns: number
      }
      set_member_active: {
        Args: { active: boolean; target_member: string }
        Returns: undefined
      }
      set_member_role: {
        Args: {
          new_role: Database["public"]["Enums"]["member_role"]
          target_member: string
        }
        Returns: undefined
      }
      set_reaction: {
        Args: { reaction: string; target_post: string }
        Returns: undefined
      }
      set_round_position: {
        Args: { in_goal: boolean; target_match: string; target_member: string }
        Returns: number
      }
      unlock_ratings: { Args: { target_match: string }; Returns: undefined }
      unpublish_post: { Args: { target_post: string }; Returns: undefined }
      update_match_roster: {
        Args: {
          present_member_ids: string[]
          reserve_flags: boolean[]
          target_match: string
          team_numbers: number[]
        }
        Returns: undefined
      }
    }
    Enums: {
      award_kind:
        | "craque"
        | "gol"
        | "bola_murcha"
        | "drible"
        | "atacante"
        | "defensor"
        | "goleiro"
        | "fair_play"
        | "fominha"
        | "time_da_semana"
        | "jogador_do_mes"
        | "foguete"
        | "garcom"
        | "motor"
        | "criativo"
        | "goleador"
        | "campeao_do_mes"
      match_status: "open" | "closed"
      member_role: "organizer" | "player"
      player_position: "FIX" | "ALA" | "PIV" | "GOL"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      award_kind: [
        "craque",
        "gol",
        "bola_murcha",
        "drible",
        "atacante",
        "defensor",
        "goleiro",
        "fair_play",
        "fominha",
        "time_da_semana",
        "jogador_do_mes",
        "foguete",
        "garcom",
        "motor",
        "criativo",
        "goleador",
        "campeao_do_mes",
      ],
      match_status: ["open", "closed"],
      member_role: ["organizer", "player"],
      player_position: ["FIX", "ALA", "PIV", "GOL"],
    },
  },
} as const
