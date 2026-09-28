export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlanId = "free" | "starter" | "pro";

export type CreditTransactionType =
  | "grant"
  | "debit"
  | "refund"
  | "purchase";

export type GenerationStatus = "succeeded" | "failed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          plan: PlanId;
          credits: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: PlanId;
          credits?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: PlanId;
          credits?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: CreditTransactionType;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: CreditTransactionType;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          description?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          prompt: string;
          output: string | null;
          model: string;
          tokens_used: number;
          credits_used: number;
          status: GenerationStatus;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          prompt: string;
          output?: string | null;
          model: string;
          tokens_used?: number;
          credits_used?: number;
          status?: GenerationStatus;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          output?: string | null;
          tokens_used?: number;
          status?: GenerationStatus;
          error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_credits: {
        Args: { p_amount: number; p_description?: string };
        Returns: number;
      };
      grant_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: CreditTransactionType;
          p_description?: string;
          p_metadata?: Json;
        };
        Returns: number;
      };
      refund_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_description?: string;
        };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CreditTransaction =
  Database["public"]["Tables"]["credit_transactions"]["Row"];
export type Generation = Database["public"]["Tables"]["generations"]["Row"];
