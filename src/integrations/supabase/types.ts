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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          model: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ai_role"]
          tokens: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["ai_role"]
          tokens?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ai_role"]
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: number
          ip: unknown
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: number
          ip?: unknown
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: number
          ip?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          monthly_demand_usd: number | null
          preferred_incoterms: string[]
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          monthly_demand_usd?: number | null
          preferred_incoterms?: string[]
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          monthly_demand_usd?: number | null
          preferred_incoterms?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_prices: {
        Row: {
          commodity: string
          currency: string
          id: string
          market: string | null
          price_usd: number
          recorded_at: string
          source: string | null
          unit: string
        }
        Insert: {
          commodity: string
          currency?: string
          id?: string
          market?: string | null
          price_usd: number
          recorded_at?: string
          source?: string | null
          unit?: string
        }
        Update: {
          commodity?: string
          currency?: string
          id?: string
          market?: string | null
          price_usd?: number
          recorded_at?: string
          source?: string | null
          unit?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          employees: number | null
          founded: number | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string | null
          owner_id: string
          phone: string | null
          rating: number
          slug: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employees?: number | null
          founded?: number | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id?: string | null
          owner_id: string
          phone?: string | null
          rating?: number
          slug?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          employees?: number | null
          founded?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          owner_id?: string
          phone?: string | null
          rating?: number
          slug?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          auto_execute: boolean
          buyer_company_id: string
          created_at: string
          document_url: string | null
          end_date: string | null
          id: string
          signed_hash: string | null
          smart_terms: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          supplier_company_id: string
          title: string
          updated_at: string
          value_usd: number
        }
        Insert: {
          auto_execute?: boolean
          buyer_company_id: string
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          signed_hash?: string | null
          smart_terms?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supplier_company_id: string
          title: string
          updated_at?: string
          value_usd?: number
        }
        Update: {
          auto_execute?: boolean
          buyer_company_id?: string
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          signed_hash?: string | null
          smart_terms?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          supplier_company_id?: string
          title?: string
          updated_at?: string
          value_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      country_regulations: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          id: string
          import_tariff_pct: number | null
          notes: string | null
          product_category: string
          required_docs: string[]
          restrictions: string | null
          vat_pct: number | null
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          id?: string
          import_tariff_pct?: number | null
          notes?: string | null
          product_category: string
          required_docs?: string[]
          restrictions?: string | null
          vat_pct?: number | null
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          id?: string
          import_tariff_pct?: number | null
          notes?: string | null
          product_category?: string
          required_docs?: string[]
          restrictions?: string | null
          vat_pct?: number | null
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          base: string
          fetched_at: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          fetched_at?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      farms: {
        Row: {
          area_hectares: number | null
          certifications: string[]
          country: string | null
          created_at: string
          crops: string[]
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organization_id: string | null
          owner_id: string
          region: string | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          certifications?: string[]
          country?: string | null
          created_at?: string
          crops?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organization_id?: string | null
          owner_id: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          certifications?: string[]
          country?: string | null
          created_at?: string
          crops?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organization_id?: string | null
          owner_id?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          low_stock_threshold: number
          product_id: string
          quantity: number
          reserved: number
          unit: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          low_stock_threshold?: number
          product_id: string
          quantity?: number
          reserved?: number
          unit?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          low_stock_threshold?: number
          product_id?: string
          quantity?: number
          reserved?: number
          unit?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_usd: number
          buyer_company_id: string
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          order_id: string | null
          paid_at: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          supplier_company_id: string
          updated_at: string
        }
        Insert: {
          amount_usd: number
          buyer_company_id: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_company_id: string
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          buyer_company_id?: string
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          subject?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          proposed_currency: string | null
          proposed_incoterm: Database["public"]["Enums"]["incoterm"] | null
          proposed_lead_time_days: number | null
          proposed_price: number | null
          quotation_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          proposed_currency?: string | null
          proposed_incoterm?: Database["public"]["Enums"]["incoterm"] | null
          proposed_lead_time_days?: number | null
          proposed_price?: number | null
          quotation_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          proposed_currency?: string | null
          proposed_incoterm?: Database["public"]["Enums"]["incoterm"] | null
          proposed_lead_time_days?: number | null
          proposed_price?: number | null
          quotation_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          total_usd: number | null
          unit: string
          unit_price_usd: number
        }
        Insert: {
          id?: string
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          total_usd?: number | null
          unit?: string
          unit_price_usd: number
        }
        Update: {
          id?: string
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          total_usd?: number | null
          unit?: string
          unit_price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_company_id: string
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          currency: string
          discount_pct: number
          discount_usd: number
          eta: string | null
          id: string
          incoterms: string | null
          notes: string | null
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_usd: number
          supplier_company_id: string
          tax_pct: number
          tax_usd: number
          total_usd: number
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_pct?: number
          discount_usd?: number
          eta?: string | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_usd?: number
          supplier_company_id: string
          tax_pct?: number
          tax_usd?: number
          total_usd?: number
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_pct?: number
          discount_usd?: number
          eta?: string | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_usd?: number
          supplier_company_id?: string
          tax_pct?: number
          tax_usd?: number
          total_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          organization_id: string
          prefs: Json
          updated_at: string
        }
        Insert: {
          organization_id: string
          prefs?: Json
          updated_at?: string
        }
        Update: {
          organization_id?: string
          prefs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_usd: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_usd?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_certifications: {
        Row: {
          cert_type: string
          company_id: string | null
          created_at: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuer: string | null
          product_id: string | null
          verified: boolean
        }
        Insert: {
          cert_type: string
          company_id?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          product_id?: string | null
          verified?: boolean
        }
        Update: {
          cert_type?: string
          company_id?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          product_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_certifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          moq: number
          name: string
          origin_country: string | null
          price_usd: number
          search: unknown
          sku: string | null
          stock: number
          supplier_company_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          moq?: number
          name: string
          origin_country?: string | null
          price_usd: number
          search?: unknown
          sku?: string | null
          stock?: number
          supplier_company_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          moq?: number
          name?: string
          origin_country?: string | null
          price_usd?: number
          search?: unknown
          sku?: string | null
          stock?: number
          supplier_company_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_organization_id: string | null
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_organization_id?: string | null
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_organization_id?: string | null
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_organization_id_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          currency: string
          id: string
          incoterm: Database["public"]["Enums"]["incoterm"]
          lead_time_days: number | null
          notes: string | null
          payment_terms: string | null
          quantity: number
          rfq_id: string
          status: Database["public"]["Enums"]["quotation_status"]
          supplier_company_id: string | null
          supplier_id: string
          unit_price: number
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          incoterm: Database["public"]["Enums"]["incoterm"]
          lead_time_days?: number | null
          notes?: string | null
          payment_terms?: string | null
          quantity: number
          rfq_id: string
          status?: Database["public"]["Enums"]["quotation_status"]
          supplier_company_id?: string | null
          supplier_id: string
          unit_price: number
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          incoterm?: Database["public"]["Enums"]["incoterm"]
          lead_time_days?: number | null
          notes?: string | null
          payment_terms?: string | null
          quantity?: number
          rfq_id?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          supplier_company_id?: string | null
          supplier_id?: string
          unit_price?: number
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_company_id_fkey"
            columns: ["supplier_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          file_url: string | null
          generated_at: string
          id: string
          kind: string
          name: string
          params: Json
          user_id: string
        }
        Insert: {
          file_url?: string | null
          generated_at?: string
          id?: string
          kind: string
          name: string
          params?: Json
          user_id: string
        }
        Update: {
          file_url?: string | null
          generated_at?: string
          id?: string
          kind?: string
          name?: string
          params?: Json
          user_id?: string
        }
        Relationships: []
      }
      rfqs: {
        Row: {
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          destination_country: string | null
          destination_port: string | null
          id: string
          incoterm: Database["public"]["Enums"]["incoterm"] | null
          product_category: string | null
          product_name: string
          quantity: number
          quotations_count: number
          required_certifications: string[]
          status: Database["public"]["Enums"]["rfq_status"]
          target_price: number | null
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          buyer_company_id?: string | null
          buyer_id: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          destination_country?: string | null
          destination_port?: string | null
          id?: string
          incoterm?: Database["public"]["Enums"]["incoterm"] | null
          product_category?: string | null
          product_name: string
          quantity: number
          quotations_count?: number
          required_certifications?: string[]
          status?: Database["public"]["Enums"]["rfq_status"]
          target_price?: number | null
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          destination_country?: string | null
          destination_port?: string | null
          id?: string
          incoterm?: Database["public"]["Enums"]["incoterm"] | null
          product_category?: string | null
          product_name?: string
          quantity?: number
          quotations_count?: number
          required_certifications?: string[]
          status?: Database["public"]["Enums"]["rfq_status"]
          target_price?: number | null
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking: {
        Row: {
          id: string
          location: string | null
          note: string | null
          occurred_at: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
        }
        Insert: {
          id?: string
          location?: string | null
          note?: string | null
          occurred_at?: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
        }
        Update: {
          id?: string
          location?: string | null
          note?: string | null
          occurred_at?: string
          shipment_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_arrival: string | null
          carrier: string | null
          created_at: string
          destination: string | null
          eta: string | null
          id: string
          mode: Database["public"]["Enums"]["shipment_mode"]
          order_id: string
          origin: string | null
          progress: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          updated_at: string
          value_usd: number
        }
        Insert: {
          actual_arrival?: string | null
          carrier?: string | null
          created_at?: string
          destination?: string | null
          eta?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"]
          order_id: string
          origin?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          updated_at?: string
          value_usd?: number
        }
        Update: {
          actual_arrival?: string | null
          carrier?: string | null
          created_at?: string
          destination?: string | null
          eta?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["shipment_mode"]
          order_id?: string
          origin?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          updated_at?: string
          value_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          inventory_id: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty: number
          performed_by: string | null
          previous_qty: number
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
          related_movement_id: string | null
          unit: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number
          performed_by?: string | null
          previous_qty?: number
          product_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          related_movement_id?: string | null
          unit?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          new_qty?: number
          performed_by?: string | null
          previous_qty?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          related_movement_id?: string | null
          unit?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_related_movement_id_fkey"
            columns: ["related_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          certifications: string[]
          company_id: string
          created_at: string
          lead_time_days: number | null
          monthly_capacity_mt: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          certifications?: string[]
          company_id: string
          created_at?: string
          lead_time_days?: number | null
          monthly_capacity_mt?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          certifications?: string[]
          company_id?: string
          created_at?: string
          lead_time_days?: number | null
          monthly_capacity_mt?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_participants: {
        Row: {
          thread_id: string
          user_id: string
        }
        Insert: {
          thread_id: string
          user_id: string
        }
        Update: {
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_documents: {
        Row: {
          created_at: string
          doc_name: string
          doc_type: string
          file_url: string | null
          id: string
          issued_date: string | null
          notes: string | null
          order_id: string | null
          shipment_id: string | null
          status: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          doc_name: string
          doc_type: string
          file_url?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          order_id?: string | null
          shipment_id?: string | null
          status?: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          doc_name?: string
          doc_type?: string
          file_url?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          order_id?: string | null
          shipment_id?: string | null
          status?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          created_at: string
          id: number
          kind: string
          meta: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          kind: string
          meta?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          kind?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          capacity_mt: number | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity_mt?: number | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity_mt?: number | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_records: {
        Row: {
          conditions: string | null
          humidity: number | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          rain_mm: number | null
          recorded_at: string
          source: string | null
          temp_c: number | null
          wind_kph: number | null
        }
        Insert: {
          conditions?: string | null
          humidity?: number | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          rain_mm?: number | null
          recorded_at?: string
          source?: string | null
          temp_c?: number | null
          wind_kph?: number | null
        }
        Update: {
          conditions?: string | null
          humidity?: number | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          rain_mm?: number | null
          recorded_at?: string
          source?: string | null
          temp_c?: number | null
          wind_kph?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_order: {
        Args: { _order: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      is_thread_member: {
        Args: { _thread: string; _user: string }
        Returns: boolean
      }
      owns_company: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      ai_role: "user" | "assistant" | "system" | "tool"
      app_role:
        | "admin"
        | "farmer"
        | "supplier"
        | "buyer"
        | "exporter"
        | "importer"
        | "investor"
      company_type:
        | "exporter"
        | "importer"
        | "buyer"
        | "supplier"
        | "farm"
        | "logistics"
        | "other"
      contract_status: "draft" | "active" | "completed" | "terminated"
      incoterm:
        | "EXW"
        | "FCA"
        | "FAS"
        | "FOB"
        | "CFR"
        | "CIF"
        | "CPT"
        | "CIP"
        | "DAP"
        | "DPU"
        | "DDP"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void"
      notification_kind:
        | "system"
        | "order"
        | "shipment"
        | "invoice"
        | "message"
        | "ai"
        | "weather"
        | "market"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method:
        | "wire"
        | "card"
        | "ach"
        | "crypto"
        | "letter_of_credit"
        | "other"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
      quotation_status:
        | "submitted"
        | "under_negotiation"
        | "accepted"
        | "rejected"
        | "expired"
        | "withdrawn"
      rfq_status: "draft" | "open" | "closed" | "awarded" | "cancelled"
      shipment_mode: "sea" | "air" | "land" | "multimodal"
      shipment_status:
        | "preparing"
        | "in_transit"
        | "customs"
        | "delivered"
        | "delayed"
        | "cancelled"
      stock_movement_type:
        | "in"
        | "out"
        | "adjust"
        | "transfer_in"
        | "transfer_out"
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
      ai_role: ["user", "assistant", "system", "tool"],
      app_role: [
        "admin",
        "farmer",
        "supplier",
        "buyer",
        "exporter",
        "importer",
        "investor",
      ],
      company_type: [
        "exporter",
        "importer",
        "buyer",
        "supplier",
        "farm",
        "logistics",
        "other",
      ],
      contract_status: ["draft", "active", "completed", "terminated"],
      incoterm: [
        "EXW",
        "FCA",
        "FAS",
        "FOB",
        "CFR",
        "CIF",
        "CPT",
        "CIP",
        "DAP",
        "DPU",
        "DDP",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "void"],
      notification_kind: [
        "system",
        "order",
        "shipment",
        "invoice",
        "message",
        "ai",
        "weather",
        "market",
      ],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: [
        "wire",
        "card",
        "ach",
        "crypto",
        "letter_of_credit",
        "other",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
      quotation_status: [
        "submitted",
        "under_negotiation",
        "accepted",
        "rejected",
        "expired",
        "withdrawn",
      ],
      rfq_status: ["draft", "open", "closed", "awarded", "cancelled"],
      shipment_mode: ["sea", "air", "land", "multimodal"],
      shipment_status: [
        "preparing",
        "in_transit",
        "customs",
        "delivered",
        "delayed",
        "cancelled",
      ],
      stock_movement_type: [
        "in",
        "out",
        "adjust",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
