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
        wifi_ssid: string;
        wifi_password: string;
        google_review_url: string | null;
        logo_url: string | null;
        primary_color: string;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
