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
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          nickname: string
          photo_kind: string | null
          photo_path: string | null
          position: Database["public"]["Enums"]["player_position"]
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          nickname: string
          photo_kind?: string | null
          photo_path?: string | null
          position: Database["public"]["Enums"]["player_position"]
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          nickname?: string
          photo_kind?: string | null
          photo_path?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
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
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      match_attendance: {
        Row: {
          group_id: string
          match_id: string
          member_id: string
          team: number | null
        }
        Insert: {
          group_id: string
          match_id: string
          member_id: string
          team?: number | null
        }
        Update: {
          group_id?: string
          match_id?: string
          member_id?: string
          team?: number | null
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
      matches: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          played_on: string
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
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
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
      award_card_value: {
        Args: { average: number; bonus: number }
        Returns: number
      }
      close_match: {
        Args: { target_match: string; theme_key?: string }
        Returns: number
      }
      compute_match_awards: {
        Args: { target_match: string; theme_key: string }
        Returns: number
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
          target_group: string
          team_numbers: number[]
        }
        Returns: string
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
      get_invite: {
        Args: { code: string }
        Returns: {
          group_id: string
          group_name: string
        }[]
      }
      get_match_submissions: {
        Args: { target_group: string }
        Returns: {
          match_id: string
          submitted: number
        }[]
      }
      is_group_member: { Args: { target_group: string }; Returns: boolean }
      is_group_organizer: { Args: { target_group: string }; Returns: boolean }
      join_group: {
        Args: {
          code: string
          member_nickname: string
          member_position: Database["public"]["Enums"]["player_position"]
        }
        Returns: string
      }
      set_member_role: {
        Args: {
          new_role: Database["public"]["Enums"]["member_role"]
          target_member: string
        }
        Returns: undefined
      }
    }
    Enums: {
      award_kind: "craque" | "gol" | "bola_murcha"
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
      award_kind: ["craque", "gol", "bola_murcha"],
      match_status: ["open", "closed"],
      member_role: ["organizer", "player"],
      player_position: ["FIX", "ALA", "PIV", "GOL"],
    },
  },
} as const
