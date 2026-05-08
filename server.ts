import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Telegraf } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { getRealMarketData } from "./financialDataService.js";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// In-memory user portfolio state
// Using standard NSE symbols for easier lookup
let userEtfs = [
  { symbol: "NIFTYBEES", name: "Nifty 50 ETF", sipAmount: 1500, alerts: [] as any[] },
  { symbol: "MIRAMID150", name: "Midcap 150 ETF", sipAmount: 1500, alerts: [] as any[] },
  { symbol: "JUNIORBEES", name: "Next 50 ETF", sipAmount: 1500, alerts: [] as any[] },
  { symbol: "GOLDBEES", name: "Gold ETF", sipAmount: 500, alerts: [] as any[] },
];

// Initialize Gemini lazily
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

// Initialize Telegram Bot
const bot = process.env.TELEGRAM_BOT_TOKEN 
  ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN) 
  : null;

if (bot) {
  bot.start((ctx) => ctx.reply("Welcome to your AI Investment Agent! I will track your ETFs and alert you on dips. Type /status to get live portfolio data."));
  bot.command("status", async (ctx) => {
    try {
      const status = await getPortfolioStatus();
      let message = "📊 *Live Portfolio Status*\n\n";
      status.etfs.forEach(etf => {
        message += `*${etf.name}* (${etf.symbol}):\n`;
        message += `Price: ₹${etf.price.toFixed(2)} (${etf.change > 0 ? '📈' : '📉'} ${etf.change.toFixed(2)}%)\n`;
        message += `Max Monthly Dip: ${etf.maxMonthlyDip.toFixed(2)}%\n`;
        message += `💡 Suggestion: ${etf.aiSuggestion}\n\n`;
      });
      message += `\n🤖 *AI Insight*: ${status.recommendation}`;
      ctx.replyWithMarkdown(message);
    } catch (err) {
      ctx.reply("Sorry, I encountered an error fetching live data. Please try again later.");
    }
  });
  bot.launch();
  console.log("Telegram bot launched successfully.");
}

// Market Hours Helper (Mon-Fri, 9:15 AM - 3:30 PM IST)
function isMarketOpen() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const day = istTime.getUTCDay();
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;

  const marketOpenTime = 9 * 60 + 15;
  const marketCloseTime = 15 * 60 + 30;

  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = currentTimeInMinutes >= marketOpenTime && currentTimeInMinutes <= marketCloseTime;

  return isWeekday && isWithinHours;
}

// Main Portfolio Status Logic
async function getPortfolioStatus() {
  const marketOpen = isMarketOpen();
  
  // Deduplicate userEtfs by symbol
  const uniqueEtfs = Array.from(new Map(userEtfs.map(item => [item.symbol, item])).values());
  
  const etfs = await Promise.all(uniqueEtfs.map(async ue => {
    // Try to get real data
    const realData = await getRealMarketData(ue.symbol);
    
    // Fallback constants if API fails
    const price = realData?.price || 100;
    const change = realData?.change24h || 0;
    const stats = realData ? {
      oneDay: realData.oneDay,
      oneWeek: realData.oneWeek,
      oneMonth: realData.oneMonth,
      twoMonths: realData.twoMonths,
      threeMonths: realData.threeMonths,
      sixMonths: realData.sixMonths,
      oneYear: realData.oneYear
    } : {
      oneDay: 0, oneWeek: 0, oneMonth: 0, twoMonths: 0, threeMonths: 0, sixMonths: 0, oneYear: 0
    };
    const maxMonthlyDip = realData?.maxMonthlyDip || 0;

    // AI Suggestion Logic based on real dip
    let aiSuggestion = "";
    if (maxMonthlyDip < -7) {
      aiSuggestion = "A massive dip detected this month. Historically, after such a sharp localized correction, markets often stabilize. Suggestion: BUY aggressively if you have surplus, or ensure your SIP triggers now to capture the low NAV.";
    } else if (maxMonthlyDip < -4) {
      aiSuggestion = "Significant correction detected. This is a healthy entry point for long-term investors. Suggestion: Consider an extra one-time investment equal to 0.5x your SIP amount.";
    } else {
      aiSuggestion = "Standard market fluctuation. Suggestion: Maintain regular SIP discipline. No strategic changes required.";
    }

    // Check alerts
    const alerts = ue.alerts?.map((a: any) => {
      let triggered = a.triggered;
      if (!triggered && marketOpen) {
        if (a.type === 'PRICE_ABOVE' && price >= a.value) triggered = true;
        if (a.type === 'PRICE_BELOW' && price <= a.value) triggered = true;
        if (a.type === 'CHANGE_ABOVE' && change >= a.value) triggered = true;
        if (a.type === 'CHANGE_BELOW' && change <= a.value) triggered = true;
      }
      return { ...a, triggered };
    }) || [];

    return {
      ...ue,
      price,
      change,
      maxMonthlyDip,
      stats,
      aiSuggestion,
      history: realData?.history || [],
      alerts,
      isRealData: !!realData
    };
  }));

  const totalInvestment = etfs.reduce((acc, curr) => acc + curr.sipAmount, 0);
  const dipDetected = etfs.some(e => e.change <= -1.5);

  const healthScore = Math.min(100, Math.max(0, (etfs.length * 15) + 60 + (etfs.reduce((a, b) => a + b.maxMonthlyDip, 0) / (etfs.length || 1))));

  return {
    etfs,
    totalInvestment,
    lastUpdate: new Date().toISOString(),
    marketOpen,
    monthlyLowDetected: dipDetected,
    previousMonthDip: true,
    previousMonthAlert: "Monthly dip analyzer active. We track the local peaks and troughs in real-time.",
    recommendation: marketOpen 
      ? (dipDetected ? "Opportunity alert! Dips detected in tracked assets." : "Market active. Portfolio is stable.")
      : "Market CLOSED. Viewing last recorded accurate closing data.",
    sentiment: "Real-time market tracking enabled via Yahoo Finance.",
    healthScore
  };
}

// API Routes
app.get("/api/portfolio", async (req, res) => {
  try {
    const status = await getPortfolioStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio status" });
  }
});

app.post("/api/portfolio/etfs", (req, res) => {
  const { symbol, name, sipAmount } = req.body;
  if (!symbol || !name) return res.status(400).json({ error: "Missing symbol or name" });
  
  const existingIndex = userEtfs.findIndex(e => e.symbol === symbol);
  const newEtf = { 
    symbol, 
    name, 
    sipAmount: Number(sipAmount) || 0, 
    alerts: [] as any[]
  };
  
  if (existingIndex > -1) {
    userEtfs[existingIndex] = newEtf;
  } else {
    userEtfs.push(newEtf);
  }
  
  res.json({ success: true, etfs: userEtfs });
});

app.delete("/api/portfolio/etfs/:symbol", (req, res) => {
  userEtfs = userEtfs.filter(e => e.symbol !== req.params.symbol);
  res.json({ success: true, etfs: userEtfs });
});

app.patch("/api/portfolio/etfs/:symbol", (req, res) => {
  const { sipAmount } = req.body;
  const etf = userEtfs.find(e => e.symbol === req.params.symbol);
  if (etf) {
    if (sipAmount !== undefined) etf.sipAmount = Number(sipAmount);
  }
  res.json({ success: true, etfs: userEtfs });
});

app.post("/api/portfolio/etfs/:symbol/alerts", (req, res) => {
  const { type, value } = req.body;
  const etf = userEtfs.find(e => e.symbol === req.params.symbol);
  if (!etf) return res.status(404).json({ error: "ETF not found" });
  
  const newAlert = {
    id: Math.random().toString(36).substr(2, 9),
    type,
    value: Number(value),
    triggered: false
  };
  
  if (!etf.alerts) etf.alerts = [];
  etf.alerts.push(newAlert);
  res.json({ success: true, etfs: userEtfs });
});

app.delete("/api/portfolio/etfs/:symbol/alerts/:alertId", (req, res) => {
  const etf = userEtfs.find(e => e.symbol === req.params.symbol);
  if (!etf) return res.status(404).json({ error: "ETF not found" });
  
  if (etf.alerts) {
    etf.alerts = etf.alerts.filter((a: any) => a.id !== req.params.alertId);
  }
  res.json({ success: true, etfs: userEtfs });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const status = await getPortfolioStatus();
    const marketInfo = status.etfs.map(e => `${e.name} Price: ₹${e.price}, 24h: ${e.change}%, Max Dip: ${e.maxMonthlyDip}%`).join("\n");
    
    const totalSip = status.totalInvestment;
    const allocation = status.etfs.map(e => `${e.symbol}: ₹${e.sipAmount} (${((e.sipAmount / totalSip) * 100).toFixed(1)}%)`).join(", ");
    
    let ai;
    try {
      ai = getGenAI();
    } catch (e: any) {
      return res.json({ 
        analysis: `⚠️ [DEMO MODE: API Key Missing]\n\nYour Allocation:\n${allocation}\n\nLive Data Context:\n${marketInfo}\n\nMarket Insight: Indian ETFs like Nifty 50 and Midcap 150 are showing specific trends. Refer to the 'AI Suggestion' in the asset table for immediate technical advice based on the ${status.monthlyLowDetected ? 'dips' : 'current stability'}.`,
        isMock: true
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the current market sentiment for these Indian ETFs based on this real-time data:\n${marketInfo}\n\nUser's Current Allocation:\n${allocation}\n\nGlobal Context: Use Google Search to find actual news from the last 24-48 hours affecting the Indian stock market (NSE) and GIFT Nifty. Provide specific reasons for any volatility and suggest if the user should rebalance their current allocation towards any specific asset.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to analyze sentiment" });
  }
});

app.post("/api/predict", async (req, res) => {
  try {
    const status = await getPortfolioStatus();
    const marketInfo = status.etfs.map(e => `${e.name} (Max Monthly Dip: ${e.maxMonthlyDip}%)`).join(", ");

    let ai;
    try {
      ai = getGenAI();
    } catch (e: any) {
      return res.json({ 
        prediction: `⚠️ [DEMO MODE: API Key Missing]\n\nCurrent Market: ${marketInfo}\n\nPrediction: Based on current ${status.marketOpen ? 'live' : 'historical'} patterns, expect a 1-2% consolidation phase in the next 10 days as oscillators reset from the current ${status.monthlyLowDetected ? 'dip' : 'range'}.`,
        isMock: true
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Predict potential market dips for these Indian ETFs for the next 30 days:\n${marketInfo}\n\nUse Google Search to find current news affecting these indices. Consider seasonal trends and upcoming economic data releases. Provide specific dates and estimated dip percentages.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    res.json({ prediction: response.text });
  } catch (error: any) {
    console.error("Gemini Prediction Error:", error);
    res.status(500).json({ error: "Failed to generate prediction" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
