type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      restaurants: Table<{
        id: string;
        slug: string;
        name: string;
        tagline: string;
        description: string;
        address: string;
        city: string;
        phone: string;
        hours: string;
        hero_image: string;
        initials: string;
        wifi_name: string | null;
        wifi_ssid: string | null;
        wifi_password: string | null;
        google_review_url: string | null;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
        instagram_url: string | null;
        enable_menu: boolean;
        enable_ordering: boolean;
        enable_feedback: boolean;
        enable_google_reviews: boolean;
        loyalty_enabled: boolean;
        loyalty_type: string;
        loyalty_reward_goal: number;
        loyalty_reward_description: string;
        loyalty_points_per_amount: number;
        loyalty_points_goal: number;
        enable_call_waiter: boolean;
        enable_request_bill: boolean;
        enable_wifi: boolean;
        enable_reservations: boolean;
        reservation_opening_time: string;
        reservation_closing_time: string;
        reservation_slot_duration: number;
        reservation_max_party_size: number;
        reservation_max_days_advance: number;
        reservation_auto_confirm: boolean;
        is_published: boolean;
        onboarding_step: number;
        created_at: string;
      }>;
      restaurant_admins: Table<{
        restaurant_id: string;
        user_id: string;
        created_at: string;
      }>;
      menu_categories: Table<{
        id: string;
        restaurant_id: string;
        name: string;
        icon: string | null;
        image_url: string | null;
        sort_order: number;
        created_at: string;
      }>;
      menu_items: Table<{
        id: string;
        restaurant_id: string;
        category_id: string;
        name: string;
        description: string;
        price: number;
        pricing_variants: { name: string; price: number }[] | null;
        image_url: string | null;
        dietary_tags: string[];
        is_available: boolean;
        sort_order: number;
        created_at: string;
      }>;
      tables: Table<{
        id: string;
        restaurant_id: string;
        table_number: string;
        unique_code: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
      orders: Table<{
        id: string;
        restaurant_id: string;
        table_id: string | null;
        table_number: string;
        customer_phone: string | null;
        status: "pending" | "preparing" | "ready" | "served" | "cancelled";
        total_amount: number;
        notes: string | null;
        created_at: string;
        updated_at: string;
        status_updated_at: string;
      }>;
      order_items: Table<{
        id: string;
        order_id: string;
        menu_item_id: string | null;
        item_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        special_instructions: string | null;
        created_at: string;
      }>;
      service_requests: Table<{
        id: string;
        restaurant_id: string;
        table_id: string | null;
        table_number: string;
        type: "call_waiter" | "request_bill";
        status: "pending" | "acknowledged" | "completed";
        created_at: string;
        updated_at: string;
      }>;
      reservations: Table<{
        id: string;
        restaurant_id: string;
        guest_name: string;
        phone: string;
        party_size: number;
        reservation_date: string;
        reservation_time: string;
        table_id: string | null;
        notes: string | null;
        status: "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
        created_at: string;
        updated_at: string;
      }>;
      feedback: Table<{
        id: string;
        restaurant_id: string;
        table_id: string | null;
        rating: number;
        comment: string | null;
        guest_name: string | null;
        contact: string | null;
        phone: string | null;
        table_label: string | null;
        review_prompted: boolean;
        resolved_at: string | null;
        created_at: string;
      }>;
      loyalty_members: Table<{
        id: string;
        restaurant_id: string;
        table_id: string | null;
        full_name: string;
        email: string | null;
        phone: string | null;
        stamps: number;
        reward_goal: number;
        created_at: string;
      }>;
      guest_links: Table<{
        id: string;
        restaurant_id: string;
        kind: "qr" | "nfc";
        token: string;
        table_label: string | null;
        created_at: string;
      }>;
      restaurant_page_views: Table<{
        id: string;
        restaurant_id: string;
        table_id: string | null;
        table_label: string | null;
        viewed_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      is_restaurant_admin: {
        Args: { p_restaurant_id: string };
        Returns: boolean;
      };
      consume_rate_limit: {
        Args: {
          p_key: string;
          p_max_attempts: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      admin_analytics_summary: {
        Args: { p_restaurant_id: string; p_since: string | null };
        Returns: {
          total_scans: number;
          loyalty_members: number;
          feedback_total: number;
          average_rating: number;
          review_prompts: number;
        }[];
      };
      admin_add_loyalty_stamp: {
        Args: { p_restaurant_id: string; p_member_id: string };
        Returns: { id: string; stamps: number; reward_goal: number }[];
      };
      place_guest_order: {
        Args: {
          p_restaurant_id: string;
          p_table_id: string;
          p_unique_code: string;
          p_customer_phone: string | null;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: {
          id: string;
          total_amount: number;
          table_number: string;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
