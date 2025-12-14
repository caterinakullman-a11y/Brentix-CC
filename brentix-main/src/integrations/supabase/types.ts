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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_tool_settings: {
        Row: {
          correlation_radar_enabled: boolean | null
          created_at: string | null
          frequency_analyzer_enabled: boolean | null
          frequency_lookback_days: number | null
          id: string
          micro_pattern_enabled: boolean | null
          momentum_pulse_enabled: boolean | null
          momentum_sensitivity: number | null
          reversal_meter_enabled: boolean | null
          risk_per_minute_enabled: boolean | null
          smart_exit_enabled: boolean | null
          timing_score_enabled: boolean | null
          updated_at: string | null
          user_id: string
          volatility_window_enabled: boolean | null
          volatility_window_hours: number | null
        }
        Insert: {
          correlation_radar_enabled?: boolean | null
          created_at?: string | null
          frequency_analyzer_enabled?: boolean | null
          frequency_lookback_days?: number | null
          id?: string
          micro_pattern_enabled?: boolean | null
          momentum_pulse_enabled?: boolean | null
          momentum_sensitivity?: number | null
          reversal_meter_enabled?: boolean | null
          risk_per_minute_enabled?: boolean | null
          smart_exit_enabled?: boolean | null
          timing_score_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          volatility_window_enabled?: boolean | null
          volatility_window_hours?: number | null
        }
        Update: {
          correlation_radar_enabled?: boolean | null
          created_at?: string | null
          frequency_analyzer_enabled?: boolean | null
          frequency_lookback_days?: number | null
          id?: string
          micro_pattern_enabled?: boolean | null
          momentum_pulse_enabled?: boolean | null
          momentum_sensitivity?: number | null
          reversal_meter_enabled?: boolean | null
          risk_per_minute_enabled?: boolean | null
          smart_exit_enabled?: boolean | null
          timing_score_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          volatility_window_enabled?: boolean | null
          volatility_window_hours?: number | null
        }
        Relationships: []
      }
      auto_triggers: {
        Row: {
          action: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          threshold_type: string
          threshold_value: number
          trigger_type: string
          triggered_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          threshold_type?: string
          threshold_value: number
          trigger_type: string
          triggered_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          threshold_type?: string
          threshold_value?: number
          trigger_type?: string
          triggered_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backtest_runs: {
        Row: {
          avg_loss: number | null
          avg_win: number | null
          created_at: string | null
          end_date: string
          equity_curve: Json | null
          gross_loss: number | null
          gross_profit: number | null
          id: string
          losing_trades: number | null
          max_consecutive_losses: number | null
          max_drawdown_percent: number | null
          net_profit: number | null
          profit_factor: number | null
          rule_id: string | null
          start_date: string
          total_trades: number | null
          trades: Json | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          avg_loss?: number | null
          avg_win?: number | null
          created_at?: string | null
          end_date: string
          equity_curve?: Json | null
          gross_loss?: number | null
          gross_profit?: number | null
          id?: string
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_drawdown_percent?: number | null
          net_profit?: number | null
          profit_factor?: number | null
          rule_id?: string | null
          start_date: string
          total_trades?: number | null
          trades?: Json | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          avg_loss?: number | null
          avg_win?: number | null
          created_at?: string | null
          end_date?: string
          equity_curve?: Json | null
          gross_loss?: number | null
          gross_profit?: number | null
          id?: string
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_drawdown_percent?: number | null
          net_profit?: number | null
          profit_factor?: number | null
          rule_id?: string | null
          start_date?: string
          total_trades?: number | null
          trades?: Json | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backtest_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "trading_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      conditional_orders: {
        Row: {
          created_at: string | null
          direction: string
          executed_at: string | null
          execution_result: Json | null
          expires_at: string | null
          id: string
          initial_trigger_price: number | null
          instrument_id: string | null
          limit_price: number | null
          order_type: string
          peak_price: number | null
          quantity: number
          status: string | null
          trailing_percent: number | null
          trigger_price: number | null
          triggered_at: string | null
          trough_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          executed_at?: string | null
          execution_result?: Json | null
          expires_at?: string | null
          id?: string
          initial_trigger_price?: number | null
          instrument_id?: string | null
          limit_price?: number | null
          order_type: string
          peak_price?: number | null
          quantity: number
          status?: string | null
          trailing_percent?: number | null
          trigger_price?: number | null
          triggered_at?: string | null
          trough_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          executed_at?: string | null
          execution_result?: Json | null
          expires_at?: string | null
          id?: string
          initial_trigger_price?: number | null
          instrument_id?: string | null
          limit_price?: number | null
          order_type?: string
          peak_price?: number | null
          quantity?: number
          status?: string | null
          trailing_percent?: number | null
          trigger_price?: number | null
          triggered_at?: string | null
          trough_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditional_orders_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          best_trade_profit_sek: number | null
          buy_signals: number | null
          close_price: number | null
          created_at: string | null
          daily_change_percent: number | null
          date: string
          gross_loss_sek: number | null
          gross_profit_sek: number | null
          high_price: number | null
          id: string
          losing_trades: number | null
          low_price: number | null
          net_profit_sek: number | null
          open_price: number | null
          sell_signals: number | null
          total_signals: number | null
          total_trades: number | null
          win_rate: number | null
          winning_trades: number | null
          worst_trade_loss_sek: number | null
        }
        Insert: {
          best_trade_profit_sek?: number | null
          buy_signals?: number | null
          close_price?: number | null
          created_at?: string | null
          daily_change_percent?: number | null
          date: string
          gross_loss_sek?: number | null
          gross_profit_sek?: number | null
          high_price?: number | null
          id?: string
          losing_trades?: number | null
          low_price?: number | null
          net_profit_sek?: number | null
          open_price?: number | null
          sell_signals?: number | null
          total_signals?: number | null
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
          worst_trade_loss_sek?: number | null
        }
        Update: {
          best_trade_profit_sek?: number | null
          buy_signals?: number | null
          close_price?: number | null
          created_at?: string | null
          daily_change_percent?: number | null
          date?: string
          gross_loss_sek?: number | null
          gross_profit_sek?: number | null
          high_price?: number | null
          id?: string
          losing_trades?: number | null
          low_price?: number | null
          net_profit_sek?: number | null
          open_price?: number | null
          sell_signals?: number | null
          total_signals?: number | null
          total_trades?: number | null
          win_rate?: number | null
          winning_trades?: number | null
          worst_trade_loss_sek?: number | null
        }
        Relationships: []
      }
      data_exports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date_from: string
          date_to: string
          download_url: string | null
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size_bytes: number | null
          id: string
          record_count: number | null
          resolution: string
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date_from: string
          date_to: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          file_size_bytes?: number | null
          id?: string
          record_count?: number | null
          resolution: string
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date_from?: string
          date_to?: string
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size_bytes?: number | null
          id?: string
          record_count?: number | null
          resolution?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emergency_stops: {
        Row: {
          close_all_positions: boolean | null
          created_at: string | null
          disable_auto_trading: boolean | null
          id: string
          is_active: boolean | null
          reason: string | null
          triggered_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          close_all_positions?: boolean | null
          created_at?: string | null
          disable_auto_trading?: boolean | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          triggered_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          close_all_positions?: boolean | null
          created_at?: string | null
          disable_auto_trading?: boolean | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          triggered_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      equity_curve: {
        Row: {
          created_at: string | null
          cumulative_profit_loss_percent: number
          cumulative_profit_loss_sek: number
          daily_profit_loss_percent: number
          daily_profit_loss_sek: number
          date: string
          ending_capital_sek: number
          id: string
          losing_trades: number | null
          max_drawdown_percent: number | null
          max_drawdown_sek: number | null
          starting_capital_sek: number
          trades_count: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          cumulative_profit_loss_percent: number
          cumulative_profit_loss_sek: number
          daily_profit_loss_percent: number
          daily_profit_loss_sek: number
          date: string
          ending_capital_sek: number
          id?: string
          losing_trades?: number | null
          max_drawdown_percent?: number | null
          max_drawdown_sek?: number | null
          starting_capital_sek: number
          trades_count?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          cumulative_profit_loss_percent?: number
          cumulative_profit_loss_sek?: number
          daily_profit_loss_percent?: number
          daily_profit_loss_sek?: number
          date?: string
          ending_capital_sek?: number
          id?: string
          losing_trades?: number | null
          max_drawdown_percent?: number | null
          max_drawdown_sek?: number | null
          starting_capital_sek?: number
          trades_count?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          endpoint: string | null
          error_message: string
          error_type: string
          id: string
          metadata: Json | null
          severity: string
          stack_trace: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint?: string | null
          error_message: string
          error_type: string
          id?: string
          metadata?: Json | null
          severity?: string
          stack_trace?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string | null
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json | null
          severity?: string
          stack_trace?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      frequency_analysis_results: {
        Row: {
          accuracy_percent: number | null
          analysis_period_end: string | null
          analysis_period_start: string | null
          created_at: string | null
          id: string
          interval_name: string
          interval_seconds: number
          noise_ratio: number | null
          optimal_score: number | null
          return_percent: number | null
          trade_count: number | null
          user_id: string | null
        }
        Insert: {
          accuracy_percent?: number | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          created_at?: string | null
          id?: string
          interval_name: string
          interval_seconds: number
          noise_ratio?: number | null
          optimal_score?: number | null
          return_percent?: number | null
          trade_count?: number | null
          user_id?: string | null
        }
        Update: {
          accuracy_percent?: number | null
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          created_at?: string | null
          id?: string
          interval_name?: string
          interval_seconds?: number
          noise_ratio?: number | null
          optimal_score?: number | null
          return_percent?: number | null
          trade_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      historical_prices: {
        Row: {
          created_at: string | null
          date: string
          id: string
          price: number
          series_id: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          price: number
          series_id?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          price?: number
          series_id?: string | null
          source?: string | null
        }
        Relationships: []
      }
      instrument_pairs: {
        Row: {
          bear_instrument_id: string | null
          bull_instrument_id: string | null
          correlation_score: number | null
          created_at: string | null
          hedge_efficiency: number | null
          id: string
          issuer_match: boolean | null
          leverage_match: boolean | null
          recommended: boolean | null
          updated_at: string | null
          volume_ratio: number | null
        }
        Insert: {
          bear_instrument_id?: string | null
          bull_instrument_id?: string | null
          correlation_score?: number | null
          created_at?: string | null
          hedge_efficiency?: number | null
          id?: string
          issuer_match?: boolean | null
          leverage_match?: boolean | null
          recommended?: boolean | null
          updated_at?: string | null
          volume_ratio?: number | null
        }
        Update: {
          bear_instrument_id?: string | null
          bull_instrument_id?: string | null
          correlation_score?: number | null
          created_at?: string | null
          hedge_efficiency?: number | null
          id?: string
          issuer_match?: boolean | null
          leverage_match?: boolean | null
          recommended?: boolean | null
          updated_at?: string | null
          volume_ratio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "instrument_pairs_bear_instrument_id_fkey"
            columns: ["bear_instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instrument_pairs_bull_instrument_id_fkey"
            columns: ["bull_instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          avanza_id: string
          avg_volume_30d: number | null
          correlation_30d: number | null
          created_at: string | null
          currency: string | null
          current_price: number | null
          daily_change_percent: number | null
          exchange: string | null
          id: string
          is_active: boolean | null
          isin: string | null
          issuer: string | null
          leverage: number | null
          name: string
          spread_percent: number | null
          type: string
          underlying_asset: string | null
          updated_at: string | null
        }
        Insert: {
          avanza_id: string
          avg_volume_30d?: number | null
          correlation_30d?: number | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          daily_change_percent?: number | null
          exchange?: string | null
          id?: string
          is_active?: boolean | null
          isin?: string | null
          issuer?: string | null
          leverage?: number | null
          name: string
          spread_percent?: number | null
          type: string
          underlying_asset?: string | null
          updated_at?: string | null
        }
        Update: {
          avanza_id?: string
          avg_volume_30d?: number | null
          correlation_30d?: number | null
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          daily_change_percent?: number | null
          exchange?: string | null
          id?: string
          is_active?: boolean | null
          isin?: string | null
          issuer?: string | null
          leverage?: number | null
          name?: string
          spread_percent?: number | null
          type?: string
          underlying_asset?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      market_events: {
        Row: {
          actual_price_impact: number | null
          created_at: string | null
          data: Json | null
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          expected_impact: Database["public"]["Enums"]["event_impact"] | null
          id: string
          sentiment_score: number | null
          source: string | null
          source_url: string | null
          timestamp: string
          title: string
        }
        Insert: {
          actual_price_impact?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          expected_impact?: Database["public"]["Enums"]["event_impact"] | null
          id?: string
          sentiment_score?: number | null
          source?: string | null
          source_url?: string | null
          timestamp: string
          title: string
        }
        Update: {
          actual_price_impact?: number | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          expected_impact?: Database["public"]["Enums"]["event_impact"] | null
          id?: string
          sentiment_score?: number | null
          source?: string | null
          source_url?: string | null
          timestamp?: string
          title?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          actual_change_percent: number | null
          actual_direction: string | null
          created_at: string | null
          features: Json | null
          id: string
          model_version: string
          predicted_change_percent: number | null
          predicted_direction: string
          prediction_correct: boolean | null
          probability: number
          timestamp: string
        }
        Insert: {
          actual_change_percent?: number | null
          actual_direction?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          model_version: string
          predicted_change_percent?: number | null
          predicted_direction: string
          prediction_correct?: boolean | null
          probability: number
          timestamp: string
        }
        Update: {
          actual_change_percent?: number | null
          actual_direction?: string | null
          created_at?: string | null
          features?: Json | null
          id?: string
          model_version?: string
          predicted_change_percent?: number | null
          predicted_direction?: string
          prediction_correct?: boolean | null
          probability?: number
          timestamp?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          amount_sek: number | null
          created_at: string | null
          direction: string | null
          entry_price: number
          entry_timestamp: string
          exit_price: number | null
          exit_timestamp: string | null
          id: string
          instrument_type: string | null
          notes: string | null
          position_value_sek: number
          profit_loss_percent: number | null
          profit_loss_sek: number | null
          quantity: number
          signal_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_sek?: number | null
          created_at?: string | null
          direction?: string | null
          entry_price: number
          entry_timestamp: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: string
          instrument_type?: string | null
          notes?: string | null
          position_value_sek: number
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          quantity: number
          signal_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_sek?: number | null
          created_at?: string | null
          direction?: string | null
          entry_price?: number
          entry_timestamp?: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: string
          instrument_type?: string | null
          notes?: string | null
          position_value_sek?: number
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          quantity?: number
          signal_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_definitions: {
        Row: {
          avg_return_percent: number | null
          category: string
          created_at: string | null
          description: string | null
          direction: string
          id: string
          is_active: boolean | null
          name: string
          parameters: Json | null
          pattern_type: string
          success_rate: number | null
          timeframe: string | null
        }
        Insert: {
          avg_return_percent?: number | null
          category: string
          created_at?: string | null
          description?: string | null
          direction: string
          id?: string
          is_active?: boolean | null
          name: string
          parameters?: Json | null
          pattern_type: string
          success_rate?: number | null
          timeframe?: string | null
        }
        Update: {
          avg_return_percent?: number | null
          category?: string
          created_at?: string | null
          description?: string | null
          direction?: string
          id?: string
          is_active?: boolean | null
          name?: string
          parameters?: Json | null
          pattern_type?: string
          success_rate?: number | null
          timeframe?: string | null
        }
        Relationships: []
      }
      pattern_occurrences: {
        Row: {
          actual_return_percent: number | null
          confidence: number
          created_at: string | null
          direction: string
          end_date: string
          entry_price: number | null
          id: string
          metadata: Json | null
          outcome: string | null
          pattern_name: string
          pattern_type: string
          start_date: string
          stop_loss: number | null
          target_price: number | null
        }
        Insert: {
          actual_return_percent?: number | null
          confidence: number
          created_at?: string | null
          direction: string
          end_date: string
          entry_price?: number | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          pattern_name: string
          pattern_type: string
          start_date: string
          stop_loss?: number | null
          target_price?: number | null
        }
        Update: {
          actual_return_percent?: number | null
          confidence?: number
          created_at?: string | null
          direction?: string
          end_date?: string
          entry_price?: number | null
          id?: string
          metadata?: Json | null
          outcome?: string | null
          pattern_name?: string
          pattern_type?: string
          start_date?: string
          stop_loss?: number | null
          target_price?: number | null
        }
        Relationships: []
      }
      patterns: {
        Row: {
          actual_direction: string | null
          actual_magnitude: number | null
          confidence: number
          created_at: string | null
          end_timestamp: string
          expected_direction: string | null
          expected_magnitude: number | null
          id: string
          metadata: Json | null
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          start_timestamp: string
          verified: boolean | null
        }
        Insert: {
          actual_direction?: string | null
          actual_magnitude?: number | null
          confidence: number
          created_at?: string | null
          end_timestamp: string
          expected_direction?: string | null
          expected_magnitude?: number | null
          id?: string
          metadata?: Json | null
          pattern_type: Database["public"]["Enums"]["pattern_type"]
          start_timestamp: string
          verified?: boolean | null
        }
        Update: {
          actual_direction?: string | null
          actual_magnitude?: number | null
          confidence?: number
          created_at?: string | null
          end_timestamp?: string
          expected_direction?: string | null
          expected_magnitude?: number | null
          id?: string
          metadata?: Json | null
          pattern_type?: Database["public"]["Enums"]["pattern_type"]
          start_timestamp?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      price_data: {
        Row: {
          close: number
          created_at: string | null
          data_quality: string | null
          high: number
          id: string
          low: number
          open: number
          source: string | null
          timestamp: string
          volume: number | null
        }
        Insert: {
          close: number
          created_at?: string | null
          data_quality?: string | null
          high: number
          id?: string
          low: number
          open: number
          source?: string | null
          timestamp: string
          volume?: number | null
        }
        Update: {
          close?: number
          created_at?: string | null
          data_quality?: string | null
          high?: number
          id?: string
          low?: number
          open?: number
          source?: string | null
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rule_backtest_results: {
        Row: {
          avg_hold_duration_seconds: number | null
          avg_trade_sek: number | null
          best_trade_sek: number | null
          calculation_time_ms: number | null
          created_at: string | null
          data_points_analyzed: number | null
          equity_curve: Json
          error_message: string | null
          gross_loss_sek: number
          gross_profit_sek: number
          id: string
          initial_capital_sek: number
          losing_trades: number
          max_drawdown_percent: number | null
          max_drawdown_sek: number | null
          position_size_sek: number
          profit_factor: number | null
          rule_conditions: Json
          rule_id: string | null
          rule_name: string
          simulated_trades: Json
          status: string | null
          test_period_end: string
          test_period_start: string
          total_profit_loss_percent: number
          total_profit_loss_sek: number
          total_trades: number
          user_id: string
          win_rate: number
          winning_trades: number
          worst_trade_sek: number | null
        }
        Insert: {
          avg_hold_duration_seconds?: number | null
          avg_trade_sek?: number | null
          best_trade_sek?: number | null
          calculation_time_ms?: number | null
          created_at?: string | null
          data_points_analyzed?: number | null
          equity_curve?: Json
          error_message?: string | null
          gross_loss_sek?: number
          gross_profit_sek?: number
          id?: string
          initial_capital_sek: number
          losing_trades?: number
          max_drawdown_percent?: number | null
          max_drawdown_sek?: number | null
          position_size_sek: number
          profit_factor?: number | null
          rule_conditions: Json
          rule_id?: string | null
          rule_name: string
          simulated_trades?: Json
          status?: string | null
          test_period_end: string
          test_period_start: string
          total_profit_loss_percent?: number
          total_profit_loss_sek?: number
          total_trades?: number
          user_id: string
          win_rate?: number
          winning_trades?: number
          worst_trade_sek?: number | null
        }
        Update: {
          avg_hold_duration_seconds?: number | null
          avg_trade_sek?: number | null
          best_trade_sek?: number | null
          calculation_time_ms?: number | null
          created_at?: string | null
          data_points_analyzed?: number | null
          equity_curve?: Json
          error_message?: string | null
          gross_loss_sek?: number
          gross_profit_sek?: number
          id?: string
          initial_capital_sek?: number
          losing_trades?: number
          max_drawdown_percent?: number | null
          max_drawdown_sek?: number | null
          position_size_sek?: number
          profit_factor?: number | null
          rule_conditions?: Json
          rule_id?: string | null
          rule_name?: string
          simulated_trades?: Json
          status?: string | null
          test_period_end?: string
          test_period_start?: string
          total_profit_loss_percent?: number
          total_profit_loss_sek?: number
          total_trades?: number
          user_id?: string
          win_rate?: number
          winning_trades?: number
          worst_trade_sek?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_backtest_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "trading_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_combination_stats: {
        Row: {
          avg_profit_per_trade: number | null
          combination_hash: string
          combination_score: number | null
          confidence_level: number | null
          id: string
          improvement_vs_baseline_percent: number | null
          profit_factor: number | null
          rule_ids: string[]
          rule_names: string[]
          sample_size_sufficient: boolean | null
          total_profit_loss_sek: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          avg_profit_per_trade?: number | null
          combination_hash: string
          combination_score?: number | null
          confidence_level?: number | null
          id?: string
          improvement_vs_baseline_percent?: number | null
          profit_factor?: number | null
          rule_ids: string[]
          rule_names: string[]
          sample_size_sufficient?: boolean | null
          total_profit_loss_sek?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          avg_profit_per_trade?: number | null
          combination_hash?: string
          combination_score?: number | null
          confidence_level?: number | null
          id?: string
          improvement_vs_baseline_percent?: number | null
          profit_factor?: number | null
          rule_ids?: string[]
          rule_names?: string[]
          sample_size_sufficient?: boolean | null
          total_profit_loss_sek?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      rule_performance_stats: {
        Row: {
          avg_hold_duration_seconds: number | null
          avg_loss_per_trade: number | null
          avg_profit_per_trade: number | null
          best_trade_sek: number | null
          first_trade_at: string | null
          id: string
          last_trade_at: string | null
          losing_trades: number | null
          performance_score: number | null
          profit_factor: number | null
          rule_id: string | null
          rule_name: string | null
          total_profit_loss_sek: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
          worst_trade_sek: number | null
        }
        Insert: {
          avg_hold_duration_seconds?: number | null
          avg_loss_per_trade?: number | null
          avg_profit_per_trade?: number | null
          best_trade_sek?: number | null
          first_trade_at?: string | null
          id?: string
          last_trade_at?: string | null
          losing_trades?: number | null
          performance_score?: number | null
          profit_factor?: number | null
          rule_id?: string | null
          rule_name?: string | null
          total_profit_loss_sek?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
          worst_trade_sek?: number | null
        }
        Update: {
          avg_hold_duration_seconds?: number | null
          avg_loss_per_trade?: number | null
          avg_profit_per_trade?: number | null
          best_trade_sek?: number | null
          first_trade_at?: string | null
          id?: string
          last_trade_at?: string | null
          losing_trades?: number | null
          performance_score?: number | null
          profit_factor?: number | null
          rule_id?: string | null
          rule_name?: string | null
          total_profit_loss_sek?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
          worst_trade_sek?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_performance_stats_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "trading_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_recommendations: {
        Row: {
          actioned_at: string | null
          confidence_score: number | null
          created_at: string | null
          current_value: Json | null
          expected_improvement_percent: number | null
          expires_at: string | null
          id: string
          reasoning: string
          recommendation_type: string
          rule_id: string | null
          rule_ids: string[] | null
          status: string | null
          suggested_value: Json | null
          supporting_data: Json | null
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          actioned_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_value?: Json | null
          expected_improvement_percent?: number | null
          expires_at?: string | null
          id?: string
          reasoning: string
          recommendation_type: string
          rule_id?: string | null
          rule_ids?: string[] | null
          status?: string | null
          suggested_value?: Json | null
          supporting_data?: Json | null
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          actioned_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_value?: Json | null
          expected_improvement_percent?: number | null
          expires_at?: string | null
          id?: string
          reasoning?: string
          recommendation_type?: string
          rule_id?: string | null
          rule_ids?: string[] | null
          status?: string | null
          suggested_value?: Json | null
          supporting_data?: Json | null
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          auto_executed: boolean | null
          confidence: number
          created_at: string | null
          current_price: number
          executed: boolean | null
          executed_at: string | null
          execution_result: Json | null
          id: string
          indicators_used: Json | null
          is_active: boolean | null
          probability_down: number
          probability_up: number
          reasoning: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          stop_loss: number | null
          strength: Database["public"]["Enums"]["signal_strength"]
          target_price: number | null
          timestamp: string
        }
        Insert: {
          auto_executed?: boolean | null
          confidence: number
          created_at?: string | null
          current_price: number
          executed?: boolean | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          indicators_used?: Json | null
          is_active?: boolean | null
          probability_down: number
          probability_up: number
          reasoning?: string | null
          signal_type: Database["public"]["Enums"]["signal_type"]
          stop_loss?: number | null
          strength: Database["public"]["Enums"]["signal_strength"]
          target_price?: number | null
          timestamp: string
        }
        Update: {
          auto_executed?: boolean | null
          confidence?: number
          created_at?: string | null
          current_price?: number
          executed?: boolean | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          indicators_used?: Json | null
          is_active?: boolean | null
          probability_down?: number
          probability_up?: number
          reasoning?: string | null
          signal_type?: Database["public"]["Enums"]["signal_type"]
          stop_loss?: number | null
          strength?: Database["public"]["Enums"]["signal_strength"]
          target_price?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      storage_settings: {
        Row: {
          backfill_completed: boolean | null
          backfill_completed_at: string | null
          backfill_records_imported: number | null
          backfill_started_at: string | null
          created_at: string | null
          current_storage_bytes: number | null
          id: string
          last_calculated_at: string | null
          last_export_at: string | null
          max_storage_bytes: number | null
          total_exports: number | null
          updated_at: string | null
          warning_threshold_percent: number | null
        }
        Insert: {
          backfill_completed?: boolean | null
          backfill_completed_at?: string | null
          backfill_records_imported?: number | null
          backfill_started_at?: string | null
          created_at?: string | null
          current_storage_bytes?: number | null
          id?: string
          last_calculated_at?: string | null
          last_export_at?: string | null
          max_storage_bytes?: number | null
          total_exports?: number | null
          updated_at?: string | null
          warning_threshold_percent?: number | null
        }
        Update: {
          backfill_completed?: boolean | null
          backfill_completed_at?: string | null
          backfill_records_imported?: number | null
          backfill_started_at?: string | null
          created_at?: string | null
          current_storage_bytes?: number | null
          id?: string
          last_calculated_at?: string | null
          last_export_at?: string | null
          max_storage_bytes?: number | null
          total_exports?: number | null
          updated_at?: string | null
          warning_threshold_percent?: number | null
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          atr_14: number | null
          bollinger_lower: number | null
          bollinger_middle: number | null
          bollinger_upper: number | null
          created_at: string | null
          ema_12: number | null
          ema_26: number | null
          id: string
          macd: number | null
          macd_histogram: number | null
          macd_signal: number | null
          momentum_10: number | null
          price_data_id: string
          roc_10: number | null
          rsi_14: number | null
          sma_10: number | null
          sma_20: number | null
          sma_5: number | null
          sma_50: number | null
          timestamp: string
        }
        Insert: {
          atr_14?: number | null
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          ema_12?: number | null
          ema_26?: number | null
          id?: string
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          momentum_10?: number | null
          price_data_id: string
          roc_10?: number | null
          rsi_14?: number | null
          sma_10?: number | null
          sma_20?: number | null
          sma_5?: number | null
          sma_50?: number | null
          timestamp: string
        }
        Update: {
          atr_14?: number | null
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          ema_12?: number | null
          ema_26?: number | null
          id?: string
          macd?: number | null
          macd_histogram?: number | null
          macd_signal?: number | null
          momentum_10?: number | null
          price_data_id?: string
          roc_10?: number | null
          rsi_14?: number | null
          sma_10?: number | null
          sma_20?: number | null
          sma_5?: number | null
          sma_50?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_indicators_price_data_id_fkey"
            columns: ["price_data_id"]
            isOneToOne: false
            referencedRelation: "price_data"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_execution_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          result: Json | null
          retry_count: number | null
          signal_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          result?: Json | null
          retry_count?: number | null
          signal_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          result?: Json | null
          retry_count?: number | null
          signal_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_queue_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_rule_snapshot: {
        Row: {
          active_rule_ids: string[]
          created_at: string | null
          hold_duration_seconds: number | null
          id: string
          profit_loss_percent: number | null
          profit_loss_sek: number | null
          rule_conditions: Json
          rule_names: string[]
          trade_id: string
          trade_type: string
          triggered_rule_ids: string[] | null
        }
        Insert: {
          active_rule_ids?: string[]
          created_at?: string | null
          hold_duration_seconds?: number | null
          id?: string
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          rule_conditions?: Json
          rule_names?: string[]
          trade_id: string
          trade_type: string
          triggered_rule_ids?: string[] | null
        }
        Update: {
          active_rule_ids?: string[]
          created_at?: string | null
          hold_duration_seconds?: number | null
          id?: string
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          rule_conditions?: Json
          rule_names?: string[]
          trade_id?: string
          trade_type?: string
          triggered_rule_ids?: string[] | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string | null
          entry_price: number
          entry_timestamp: string
          exit_price: number | null
          exit_timestamp: string | null
          id: string
          notes: string | null
          position_value_sek: number
          profit_loss_percent: number | null
          profit_loss_sek: number | null
          quantity: number
          signal_id: string | null
          status: Database["public"]["Enums"]["trade_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_price: number
          entry_timestamp: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: string
          notes?: string | null
          position_value_sek: number
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          quantity: number
          signal_id?: string | null
          status?: Database["public"]["Enums"]["trade_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_price?: number
          entry_timestamp?: string
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: string
          notes?: string | null
          position_value_sek?: number
          profit_loss_percent?: number | null
          profit_loss_sek?: number | null
          quantity?: number
          signal_id?: string | null
          status?: Database["public"]["Enums"]["trade_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_rules: {
        Row: {
          action_config: Json
          backtest_results: Json | null
          conditions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_suggested: boolean | null
          last_triggered_at: string | null
          logic_operator: string
          name: string
          priority: number | null
          rule_type: string
          stop_loss_percent: number | null
          take_profit_percent: number | null
          trailing_stop: boolean | null
          trigger_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_config?: Json
          backtest_results?: Json | null
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_suggested?: boolean | null
          last_triggered_at?: string | null
          logic_operator?: string
          name: string
          priority?: number | null
          rule_type?: string
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          trailing_stop?: boolean | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_config?: Json
          backtest_results?: Json | null
          conditions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_suggested?: boolean | null
          last_triggered_at?: string | null
          logic_operator?: string
          name?: string
          priority?: number | null
          rule_type?: string
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          trailing_stop?: boolean | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_instrument_pairs: {
        Row: {
          counterweight_instrument_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          primary_instrument_id: string | null
          user_id: string
        }
        Insert: {
          counterweight_instrument_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_instrument_id?: string | null
          user_id: string
        }
        Update: {
          counterweight_instrument_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          primary_instrument_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_instrument_pairs_counterweight_instrument_id_fkey"
            columns: ["counterweight_instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_instrument_pairs_primary_instrument_id_fkey"
            columns: ["primary_instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_trading_enabled: boolean | null
          avanza_account_id: string | null
          avanza_instrument_id: string | null
          created_at: string | null
          current_capital_sek: number | null
          enable_email_notifications: boolean | null
          enable_push_notifications: boolean | null
          enable_sms_notifications: boolean | null
          id: string
          initial_capital_sek: number | null
          max_position_size_percent: number | null
          notify_daily_summary: boolean | null
          notify_new_signals: boolean | null
          notify_sound_enabled: boolean | null
          notify_trade_executed: boolean | null
          onboarding_completed: boolean | null
          paper_balance: number | null
          paper_starting_balance: number | null
          paper_trading_enabled: boolean | null
          phone_number: string | null
          position_size_sek: number | null
          preferred_bear_id: string | null
          preferred_bull_id: string | null
          show_loading_skeletons: boolean | null
          stop_loss_percent: number | null
          take_profit_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_trading_enabled?: boolean | null
          avanza_account_id?: string | null
          avanza_instrument_id?: string | null
          created_at?: string | null
          current_capital_sek?: number | null
          enable_email_notifications?: boolean | null
          enable_push_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          id?: string
          initial_capital_sek?: number | null
          max_position_size_percent?: number | null
          notify_daily_summary?: boolean | null
          notify_new_signals?: boolean | null
          notify_sound_enabled?: boolean | null
          notify_trade_executed?: boolean | null
          onboarding_completed?: boolean | null
          paper_balance?: number | null
          paper_starting_balance?: number | null
          paper_trading_enabled?: boolean | null
          phone_number?: string | null
          position_size_sek?: number | null
          preferred_bear_id?: string | null
          preferred_bull_id?: string | null
          show_loading_skeletons?: boolean | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_trading_enabled?: boolean | null
          avanza_account_id?: string | null
          avanza_instrument_id?: string | null
          created_at?: string | null
          current_capital_sek?: number | null
          enable_email_notifications?: boolean | null
          enable_push_notifications?: boolean | null
          enable_sms_notifications?: boolean | null
          id?: string
          initial_capital_sek?: number | null
          max_position_size_percent?: number | null
          notify_daily_summary?: boolean | null
          notify_new_signals?: boolean | null
          notify_sound_enabled?: boolean | null
          notify_trade_executed?: boolean | null
          onboarding_completed?: boolean | null
          paper_balance?: number | null
          paper_starting_balance?: number | null
          paper_trading_enabled?: boolean | null
          phone_number?: string | null
          position_size_sek?: number | null
          preferred_bear_id?: string | null
          preferred_bull_id?: string | null
          show_loading_skeletons?: boolean | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pending_trades: {
        Row: {
          avanza_account_id: string | null
          avanza_instrument_id: string | null
          confidence: number | null
          created_at: string | null
          current_price: number | null
          position_size_sek: number | null
          queue_id: string | null
          signal_id: string | null
          signal_type: Database["public"]["Enums"]["signal_type"] | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_execution_queue_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_storage_usage: { Args: never; Returns: number }
      cleanup_old_queue_items: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      create_signal_atomic: {
        Args: {
          p_confidence: number
          p_current_price: number
          p_indicators_used: Json
          p_probability_down: number
          p_probability_up: number
          p_reasoning: string
          p_signal_type: string
          p_stop_loss: number
          p_strength: string
          p_target_price: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_exports: { Args: never; Returns: number }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      promote_to_admin: { Args: { user_email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      event_impact: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
      event_type:
        | "EIA_REPORT"
        | "OPEC_DECISION"
        | "API_REPORT"
        | "NEWS"
        | "SANCTION"
        | "GEOPOLITICAL"
        | "PRODUCTION"
        | "OTHER"
      pattern_type:
        | "DOUBLE_TOP"
        | "DOUBLE_BOTTOM"
        | "HEAD_SHOULDERS"
        | "INVERSE_HEAD_SHOULDERS"
        | "TRIANGLE_ASCENDING"
        | "TRIANGLE_DESCENDING"
        | "CHANNEL_UP"
        | "CHANNEL_DOWN"
        | "BREAKOUT"
        | "BREAKDOWN"
        | "RECURRING_MINUTE"
        | "OTHER"
      signal_strength: "STRONG" | "MODERATE" | "WEAK"
      signal_type: "BUY" | "SELL" | "HOLD"
      trade_status: "OPEN" | "CLOSED" | "CANCELLED"
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
      event_impact: ["HIGH", "MEDIUM", "LOW", "UNKNOWN"],
      event_type: [
        "EIA_REPORT",
        "OPEC_DECISION",
        "API_REPORT",
        "NEWS",
        "SANCTION",
        "GEOPOLITICAL",
        "PRODUCTION",
        "OTHER",
      ],
      pattern_type: [
        "DOUBLE_TOP",
        "DOUBLE_BOTTOM",
        "HEAD_SHOULDERS",
        "INVERSE_HEAD_SHOULDERS",
        "TRIANGLE_ASCENDING",
        "TRIANGLE_DESCENDING",
        "CHANNEL_UP",
        "CHANNEL_DOWN",
        "BREAKOUT",
        "BREAKDOWN",
        "RECURRING_MINUTE",
        "OTHER",
      ],
      signal_strength: ["STRONG", "MODERATE", "WEAK"],
      signal_type: ["BUY", "SELL", "HOLD"],
      trade_status: ["OPEN", "CLOSED", "CANCELLED"],
    },
  },
} as const
