# AI Investment Agent (NSE ETF Edition) 📈🤖

An intelligent, full-stack financial monitoring agent that combines real-time market data with Generative AI to optimize "Buy the Dip" strategies for Indian ETF investors.

![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![React](https://img.shields.io/badge/Frontend-React%2018-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![AI](https://img.shields.io/badge/AI-Gemini%20Flash-orange?logo=google-gemini)

## 🌟 Unique Features

- **Real-Time Market Intelligence**: Live tracking of NSE tickers (Nifty BeES, Midcap 150, Gold BeES) via Yahoo Finance API.
- **Smart Allocation Optimizer**: AI-driven engine that suggests overweighting specific assets based on monthly dip severity.
- **AI Sentiment Grounding**: Uses Google Gemini with live web-search capabilities to analyze global news and its direct impact on the Indian market.
- **Portfolio Health Gauge**: A custom metric calculating diversification risk and current market exposure.
- **Multi-Timeframe Comparative Analysis**: Visualize 1D, 1W, 1M, 3M, 6M, and 1Y performance in a single high-fidelity dashboard.
- **Telegram Integration**: Remote portfolio status and dip alerts via an integrated Telegram Bot.

## 🛠️ Tech Stack

- **Core**: TypeScript (A to Z type safety)
- **Frontend**: React 18, Tailwind CSS (Modern Brutalist Design)
- **Animations**: Framer Motion (Motion UI)
- **Visualization**: Recharts (Dynamic Sparklines)
- **Backend**: Express.js / Node.js
- **Intelligence**: Google Gemini SDK (Grounded Search)
- **Formatting**: Lucide React Icons

## 🚀 Key Features Breakdown

### 1. The "Buy The Dip" Engine
The system tracks the **Maximum Monthly Dip**. For example, if a Midcap 150 ETF hits a -7% trough, the AI identifies this as a "Value Zone" and provides technical suggestions on whether to increase SIP commitments or wait for further consolidation.

### 2. Portfolio Health Monitoring
Calculates a real-time health score. If your portfolio is heavily skewed or assets are hitting critical support levels, the health gauge shifts to Amber/Red, prompting immediate review.

### 3. Deep Sentiment Analysis
By combining raw ticker data with AI, the agent explains *why* the market is moving. It bridges the gap between headline news and your actual portfolio balance.
