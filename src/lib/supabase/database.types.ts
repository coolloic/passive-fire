export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      assistant_usage: {
        Row: {
          message_count: number;
          user_id: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          message_count?: number;
          user_id: string;
          window_start: string;
        };
        Update: {
          message_count?: number;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assistant_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      crews: {
        Row: {
          id: string;
          name: string;
          team_leader_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          name: string;
          team_leader_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          team_leader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crews_team_leader_id_fkey";
            columns: ["team_leader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      escalation_lines: {
        Row: {
          escalation_id: string;
          id: string;
          product_id: string | null;
          quantity_short: number | null;
          reason: Database["public"]["Enums"]["escalation_line_reason"];
        };
        ComputedFields: never;
        Insert: {
          escalation_id: string;
          id?: string;
          product_id?: string | null;
          quantity_short?: number | null;
          reason: Database["public"]["Enums"]["escalation_line_reason"];
        };
        Update: {
          escalation_id?: string;
          id?: string;
          product_id?: string | null;
          quantity_short?: number | null;
          reason?: Database["public"]["Enums"]["escalation_line_reason"];
        };
        Relationships: [
          {
            foreignKeyName: "escalation_lines_escalation_id_fkey";
            columns: ["escalation_id"];
            isOneToOne: false;
            referencedRelation: "escalations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escalation_lines_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      escalation_notes: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          escalation_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          escalation_id: string;
          id?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          escalation_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escalation_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escalation_notes_escalation_id_fkey";
            columns: ["escalation_id"];
            isOneToOne: false;
            referencedRelation: "escalations";
            referencedColumns: ["id"];
          },
        ];
      };
      escalations: {
        Row: {
          id: string;
          planned_work_id: string;
          raised_at: string;
          raised_by: string;
          resolution: Database["public"]["Enums"]["escalation_resolution"] | null;
          resolution_comment: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          shortage_cleared_at_sync: boolean;
          state: Database["public"]["Enums"]["escalation_state"];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          planned_work_id: string;
          raised_at?: string;
          raised_by?: string;
          resolution?: Database["public"]["Enums"]["escalation_resolution"] | null;
          resolution_comment?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          shortage_cleared_at_sync?: boolean;
          state?: Database["public"]["Enums"]["escalation_state"];
        };
        Update: {
          id?: string;
          planned_work_id?: string;
          raised_at?: string;
          raised_by?: string;
          resolution?: Database["public"]["Enums"]["escalation_resolution"] | null;
          resolution_comment?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          shortage_cleared_at_sync?: boolean;
          state?: Database["public"]["Enums"]["escalation_state"];
        };
        Relationships: [
          {
            foreignKeyName: "escalations_planned_work_id_fkey";
            columns: ["planned_work_id"];
            isOneToOne: false;
            referencedRelation: "planned_work";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escalations_raised_by_fkey";
            columns: ["raised_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escalations_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expected_deliveries: {
        Row: {
          expected_date: string;
          id: string;
          product_id: string;
          quantity: number;
          received_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          expected_date: string;
          id?: string;
          product_id: string;
          quantity: number;
          received_at?: string | null;
        };
        Update: {
          expected_date?: string;
          id?: string;
          product_id?: string;
          quantity?: number;
          received_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expected_deliveries_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      nominated_solutions: {
        Row: {
          nominated_at: string;
          scenario_id: string;
          solution_id: string;
        };
        ComputedFields: never;
        Insert: {
          nominated_at?: string;
          scenario_id: string;
          solution_id: string;
        };
        Update: {
          nominated_at?: string;
          scenario_id?: string;
          solution_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nominated_solutions_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: true;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nominated_solutions_solution_id_fkey";
            columns: ["solution_id"];
            isOneToOne: false;
            referencedRelation: "solutions";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_work: {
        Row: {
          created_at: string;
          crew_id: string;
          id: string;
          site_id: string;
          work_date: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          crew_id: string;
          id?: string;
          site_id: string;
          work_date: string;
        };
        Update: {
          created_at?: string;
          crew_id?: string;
          id?: string;
          site_id?: string;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_work_crew_id_fkey";
            columns: ["crew_id"];
            isOneToOne: false;
            referencedRelation: "crews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_work_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      planned_work_items: {
        Row: {
          penetration_count: number;
          planned_work_id: string;
          scenario_id: string;
        };
        ComputedFields: never;
        Insert: {
          penetration_count: number;
          planned_work_id: string;
          scenario_id: string;
        };
        Update: {
          penetration_count?: number;
          planned_work_id?: string;
          scenario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_work_items_planned_work_id_fkey";
            columns: ["planned_work_id"];
            isOneToOne: false;
            referencedRelation: "planned_work";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planned_work_items_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
        ];
      };
      product_requirements: {
        Row: {
          is_sample: boolean;
          product_id: string;
          quantity_per_penetration: number;
          solution_id: string;
        };
        ComputedFields: never;
        Insert: {
          is_sample?: boolean;
          product_id: string;
          quantity_per_penetration: number;
          solution_id: string;
        };
        Update: {
          is_sample?: boolean;
          product_id?: string;
          quantity_per_penetration?: number;
          solution_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_requirements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_requirements_solution_id_fkey";
            columns: ["solution_id"];
            isOneToOne: false;
            referencedRelation: "solutions";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          is_sample: boolean;
          name: string;
          sku: string;
          unit: Database["public"]["Enums"]["product_unit"];
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_sample?: boolean;
          name: string;
          sku: string;
          unit: Database["public"]["Enums"]["product_unit"];
        };
        Update: {
          id?: string;
          is_sample?: boolean;
          name?: string;
          sku?: string;
          unit?: Database["public"]["Enums"]["product_unit"];
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_sample: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          is_sample?: boolean;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_sample?: boolean;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          insulation_minutes: number | null;
          integrity_minutes: number | null;
          label: string;
          orientation: string;
          service_size: string;
          service_type: string;
          site_id: string;
          substrate: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          insulation_minutes?: number | null;
          integrity_minutes?: number | null;
          label: string;
          orientation: string;
          service_size: string;
          service_type: string;
          site_id: string;
          substrate: string;
        };
        Update: {
          id?: string;
          insulation_minutes?: number | null;
          integrity_minutes?: number | null;
          label?: string;
          orientation?: string;
          service_size?: string;
          service_type?: string;
          site_id?: string;
          substrate?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenarios_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          id: string;
          is_sample: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_sample?: boolean;
          name: string;
        };
        Update: {
          id?: string;
          is_sample?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      solutions: {
        Row: {
          diameter_mm: number | null;
          height_mm: number | null;
          id: string;
          insulation_minutes: number | null;
          insulation_raw: string;
          integrity_minutes: number | null;
          integrity_raw: string;
          internal_code: string;
          orientation: string;
          parse_flags: string[];
          service_classification: string;
          service_size_raw: string;
          service_type_option: string;
          service_type_raw: string;
          shape: Database["public"]["Enums"]["solution_shape"];
          substrate_option: string;
          substrate_raw: string;
          substrate_thickness_mm: number | null;
          substrate_type: string | null;
          supplier: string;
          supplier_ref_code: string;
          width_mm: number | null;
        };
        ComputedFields: never;
        Insert: {
          diameter_mm?: number | null;
          height_mm?: number | null;
          id?: string;
          insulation_minutes?: number | null;
          insulation_raw: string;
          integrity_minutes?: number | null;
          integrity_raw: string;
          internal_code: string;
          orientation: string;
          parse_flags?: string[];
          service_classification: string;
          service_size_raw: string;
          service_type_option: string;
          service_type_raw: string;
          shape?: Database["public"]["Enums"]["solution_shape"];
          substrate_option: string;
          substrate_raw: string;
          substrate_thickness_mm?: number | null;
          substrate_type?: string | null;
          supplier: string;
          supplier_ref_code: string;
          width_mm?: number | null;
        };
        Update: {
          diameter_mm?: number | null;
          height_mm?: number | null;
          id?: string;
          insulation_minutes?: number | null;
          insulation_raw?: string;
          integrity_minutes?: number | null;
          integrity_raw?: string;
          internal_code?: string;
          orientation?: string;
          parse_flags?: string[];
          service_classification?: string;
          service_size_raw?: string;
          service_type_option?: string;
          service_type_raw?: string;
          shape?: Database["public"]["Enums"]["solution_shape"];
          substrate_option?: string;
          substrate_raw?: string;
          substrate_thickness_mm?: number | null;
          substrate_type?: string | null;
          supplier?: string;
          supplier_ref_code?: string;
          width_mm?: number | null;
        };
        Relationships: [];
      };
      stock: {
        Row: {
          product_id: string;
          quantity: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          product_id: string;
          quantity: number;
          updated_at?: string;
        };
        Update: {
          product_id?: string;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allocation_demand: {
        Args: { from_date: string };
        Returns: {
          created_at: string;
          is_own: boolean;
          planned_work_id: string;
          product_id: string;
          quantity: number;
          work_date: string;
        }[];
      };
      can_read_escalation: { Args: { target_escalation_id: string }; Returns: boolean };
      can_read_planned_work: { Args: { target_planned_work_id: string }; Returns: boolean };
      can_read_site: { Args: { target_site_id: string }; Returns: boolean };
      is_project_manager: { Args: Record<PropertyKey, never>; Returns: boolean };
      leads_crew: { Args: { target_crew_id: string }; Returns: boolean };
      raise_escalation: {
        Args: {
          p_id: string;
          p_lines: Json;
          p_note: string;
          p_planned_work_id: string;
          p_shortage_cleared: boolean;
        };
        Returns: {
          escalation_id: string;
          status: string;
        }[];
      };
      record_assistant_message: {
        Args: { max_per_hour: number };
        Returns: {
          allowed: boolean;
          retry_at: string;
        }[];
      };
    };
    Enums: {
      escalation_line_reason:
        "shortage" | "no_nominated_solution" | "no_product_requirement" | "no_stock_record";
      escalation_resolution:
        "stock_arriving" | "different_solution_nominated" | "planned_work_rescheduled";
      escalation_state: "open" | "resolved";
      product_unit: "each" | "cartridge" | "metre";
      solution_shape: "round" | "rectangular" | "linear" | "unknown";
      user_role: "team_leader" | "project_manager";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      escalation_line_reason: [
        "shortage",
        "no_nominated_solution",
        "no_product_requirement",
        "no_stock_record",
      ],
      escalation_resolution: [
        "stock_arriving",
        "different_solution_nominated",
        "planned_work_rescheduled",
      ],
      escalation_state: ["open", "resolved"],
      product_unit: ["each", "cartridge", "metre"],
      solution_shape: ["round", "rectangular", "linear", "unknown"],
      user_role: ["team_leader", "project_manager"],
    },
  },
} as const;
