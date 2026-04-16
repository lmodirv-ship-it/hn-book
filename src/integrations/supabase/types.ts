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
      card_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          layout_config: Json
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          layout_config?: Json
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          layout_config?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          max_uses: number
          max_uses_per_user: number
          min_order_amount: number
          updated_at: string
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number
          max_uses_per_user?: number
          min_order_amount?: number
          updated_at?: string
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number
          max_uses_per_user?: number
          min_order_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          total_orders: number | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      logos: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_recommendations: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_active: boolean
          priority: number
          type: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          type?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          priority?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_recommendations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          book_id: string
          created_at: string
          id: string
          order_id: string
          price: number
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          order_id: string
          price?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          order_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          order_number: string
          payment_method: string | null
          product_id: string | null
          shipping_address: string | null
          shipping_country: string | null
          shipping_email: string | null
          shipping_name: string | null
          shipping_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          order_number: string
          payment_method?: string | null
          product_id?: string | null
          shipping_address?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          order_number?: string
          payment_method?: string | null
          product_id?: string | null
          shipping_address?: string | null
          shipping_country?: string | null
          shipping_email?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      page_customizations: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          page_slug: string
          properties: Json
          section_id: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug: string
          properties?: Json
          section_id: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          page_slug?: string
          properties?: Json
          section_id?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          country: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          max_pages: number
          min_pages: number
          paper_type: string
          price_per_page: number
          priority: number
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          max_pages?: number
          min_pages?: number
          paper_type?: string
          price_per_page?: number
          priority?: number
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          max_pages?: number
          min_pages?: number
          paper_type?: string
          price_per_page?: number
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      print_orders: {
        Row: {
          address: string
          city: string
          company: string
          country: string
          created_at: string
          customer_name: string
          email: string
          id: string
          job_title: string
          logo_id: string | null
          notes: string | null
          paper_type: string
          phone: string
          print_type: string
          quantity: number
          status: string
          template_id: string
          total_price: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          city?: string
          company?: string
          country?: string
          created_at?: string
          customer_name: string
          email?: string
          id?: string
          job_title?: string
          logo_id?: string | null
          notes?: string | null
          paper_type?: string
          phone: string
          print_type?: string
          quantity?: number
          status?: string
          template_id: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          company?: string
          country?: string
          created_at?: string
          customer_name?: string
          email?: string
          id?: string
          job_title?: string
          logo_id?: string | null
          notes?: string | null
          paper_type?: string
          phone?: string
          print_type?: string
          quantity?: number
          status?: string
          template_id?: string
          total_price?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_orders_logo_id_fkey"
            columns: ["logo_id"]
            isOneToOne: false
            referencedRelation: "logos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_orders_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "card_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_documents: {
        Row: {
          confidence: number | null
          created_at: string
          custom_prompt: string | null
          engines_used: string[] | null
          extracted_text: string | null
          file_name: string
          file_size_kb: number | null
          file_type: string | null
          id: string
          metadata: Json | null
          structured_data: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          custom_prompt?: string | null
          engines_used?: string[] | null
          extracted_text?: string | null
          file_name: string
          file_size_kb?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          structured_data?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          custom_prompt?: string | null
          engines_used?: string[] | null
          extracted_text?: string | null
          file_name?: string
          file_size_kb?: number | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          structured_data?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          is_primary: boolean | null
          product_id: string
          public_url: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          is_primary?: boolean | null
          product_id: string
          public_url: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          is_primary?: boolean | null
          product_id?: string
          public_url?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          category: string
          category_id: string | null
          created_at: string
          deal_ends_in: number | null
          description: string | null
          features: string[] | null
          id: string
          image: string
          is_active: boolean | null
          is_flash_deal: boolean | null
          name: string
          original_price: number | null
          page_count: number | null
          pdf_url: string
          price: number
          reference_code: string | null
          short_description: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          deal_ends_in?: number | null
          description?: string | null
          features?: string[] | null
          id?: string
          image?: string
          is_active?: boolean | null
          is_flash_deal?: boolean | null
          name: string
          original_price?: number | null
          page_count?: number | null
          pdf_url: string
          price?: number
          reference_code?: string | null
          short_description?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          category_id?: string | null
          created_at?: string
          deal_ends_in?: number | null
          description?: string | null
          features?: string[] | null
          id?: string
          image?: string
          is_active?: boolean | null
          is_flash_deal?: boolean | null
          name?: string
          original_price?: number | null
          page_count?: number | null
          pdf_url?: string
          price?: number
          reference_code?: string | null
          short_description?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount?: number
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          plan: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          plan?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          plan?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json
          errors_count: number
          fixes_count: number
          id: string
          skipped_count: number
          total_issues: number
          triggered_by: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          details?: Json
          errors_count?: number
          fixes_count?: number
          id?: string
          skipped_count?: number
          total_issues?: number
          triggered_by?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json
          errors_count?: number
          fixes_count?: number
          id?: string
          skipped_count?: number
          total_issues?: number
          triggered_by?: string
        }
        Relationships: []
      }
      upload_jobs: {
        Row: {
          created_at: string
          file_name: string
          id: string
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      file_type: "image" | "pdf" | "other"
      order_status: "pending" | "processing" | "completed" | "cancelled"
      subscription_status: "active" | "expired" | "cancelled"
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
    Enums: {
      app_role: ["admin", "user"],
      file_type: ["image", "pdf", "other"],
      order_status: ["pending", "processing", "completed", "cancelled"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const
