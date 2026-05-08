/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PriceAlert {
  id: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'CHANGE_ABOVE' | 'CHANGE_BELOW';
  value: number;
  triggered: boolean;
}

export interface ETFStats {
  oneDay: number;
  oneWeek: number;
  oneMonth: number;
  twoMonths: number;
  threeMonths: number;
  sixMonths: number;
  oneYear: number;
}

export interface ETFData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sipAmount: number;
  maxMonthlyDip: number;
  stats: ETFStats;
  history: PricePoint[];
  alerts?: PriceAlert[];
  aiSuggestion?: string;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PortfolioStatus {
  etfs: ETFData[];
  totalInvestment: number;
  lastUpdate: string;
  marketOpen: boolean;
  monthlyLowDetected: boolean;
  previousMonthDip: boolean;
  previousMonthAlert: string;
  recommendation: string;
  sentiment: string;
  healthScore: number;
}

export interface Alert {
  id: string;
  type: 'DIP' | 'DOUBLE_SIP' | 'SENTIMENT' | 'DAILY';
  message: string;
  timestamp: string;
}
