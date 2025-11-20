




/**
 * SERVER IMPLEMENTATION (Node.js + Express + Passport)
 * 
 * Dependencies required:
 * npm install express passport passport-google-oauth20 pg jsonwebtoken cookie-parser cors dotenv
 */

const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Setup (PostgreSQL) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize DB Tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        picture TEXT,
        phone_number VARCHAR(20),
        place VARCHAR(255),
        preferred_language VARCHAR(50) DEFAULT 'english',
        data_sharing_consent BOOLEAN DEFAULT FALSE,
        is_email_verified BOOLEAN DEFAULT FALSE,
        is_phone_verified BOOLEAN DEFAULT FALSE,
        consent_timestamp TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farming_scores (
        farmer_id INTEGER PRIMARY KEY REFERENCES farmers(id),
        current_score INTEGER DEFAULT 0,
        lifetime_points INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        action_type VARCHAR(100),
        points_awarded INTEGER,
        validation_confidence INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Market Tables
      CREATE TABLE IF NOT EXISTS markets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        district VARCHAR(100),
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION
      );

      CREATE TABLE IF NOT EXISTS crop_prices (
        id SERIAL PRIMARY KEY,
        market_id INTEGER REFERENCES markets(id),
        crop VARCHAR(50),
        price NUMERIC(10, 2),
        unit VARCHAR(10) DEFAULT 'kg',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_alerts (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        crop VARCHAR(50),
        target_price NUMERIC(10, 2),
        condition VARCHAR(10), -- 'above', 'below'
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Weather Subscriptions
      CREATE TABLE IF NOT EXISTS weather_subscriptions (
        farmer_id INTEGER PRIMARY KEY REFERENCES farmers(id),
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        place_name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_alert_sent TIMESTAMP
      );

      -- Crop Health Logs
      CREATE TABLE IF NOT EXISTS crop_health_logs (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        parcel_id VARCHAR(50),
        health_score INTEGER,
        issues TEXT, -- JSON string
        recommendation TEXT,
        confidence INTEGER,
        image_url TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Cost & Input Tracking Tables
      CREATE TABLE IF NOT EXISTS farm_expenses (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        date DATE,
        category VARCHAR(50), -- Fertilizer, Labor, etc.
        amount NUMERIC(10, 2),
        crop VARCHAR(50),
        season VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS farm_incomes (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        date DATE,
        source VARCHAR(50), -- Market Sale, Subsidy
        amount NUMERIC(10, 2),
        quantity NUMERIC(10, 2) DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'kg',
        crop VARCHAR(50),
        season VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Schemes & Matching Tables
      CREATE TABLE IF NOT EXISTS schemes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(50), -- Subsidy, Loan, Insurance
        provider VARCHAR(255),
        description TEXT,
        benefits TEXT,
        criteria JSONB, -- { minScore: 50, location: ["Mandya"], crops: ["Tomato"] }
        link TEXT,
        deadline DATE
      );

      CREATE TABLE IF NOT EXISTS scheme_applications (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        scheme_id INTEGER REFERENCES schemes(id),
        status VARCHAR(50) DEFAULT 'applied', -- applied, approved, rejected
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Social Feed Tables
      CREATE TABLE IF NOT EXISTS feed_posts (
        id SERIAL PRIMARY KEY,
        farmer_id INTEGER REFERENCES farmers(id),
        content TEXT,
        image_url TEXT,
        audio_url TEXT,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feed_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
        farmer_id INTEGER REFERENCES farmers(id),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS feed_likes (
        post_id INTEGER REFERENCES feed_posts(id) ON DELETE CASCADE,
        farmer_id INTEGER REFERENCES farmers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, farmer_id)
      );
    `);

    // Add columns if not exists (migration style for updates)
    try {
      await pool.query("ALTER TABLE farm_incomes ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 0");
      await pool.query("ALTER TABLE farm_incomes ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg'");
    } catch(e) { /* ignore */ }

    // Seed Markets if empty
    const markets = await pool.query('SELECT count(*) FROM markets');
    if (parseInt(markets.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO markets (name, district) VALUES 
        ('Mandya APMC', 'Mandya'),
        ('Kolar Market', 'Kolar'),
        ('Mysore Bandipalya', 'Mysore'),
        ('Bangalore KR Market', 'Bangalore')
      `);
      console.log("Markets seeded.");
    }

    // Seed Schemes if empty
    const schemes = await pool.query('SELECT count(*) FROM schemes');
    if (parseInt(schemes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO schemes (name, type, provider, description, benefits, criteria, link, deadline) VALUES 
        ('PM-KISAN Samman Nidhi', 'Subsidy', 'Govt of India', 'Income support for small landholding farmers.', '₹6,000 per year', '{"minScore": 0, "maxAcreage": 5}', 'https://pmkisan.gov.in', '2025-12-31'),
        ('Drip Irrigation Subsidy', 'Subsidy', 'Karnataka Dept of Agriculture', 'Subsidies for installing drip irrigation systems.', '90% subsidy on equipment', '{"minScore": 40, "location": ["Mandya", "Kolar", "Mysore"], "crops": ["Sugarcane", "Tomato", "Banana"]}', 'https://raitamitra.karnataka.gov.in', '2024-10-30'),
        ('Agri Gold Loan', 'Loan', 'SBI', 'Low interest loans for crop production against gold.', 'Interest rate 7%, Quick Disbursement', '{"minScore": 80}', 'https://sbi.co.in', '2025-03-31'),
        ('Pradhan Mantri Fasal Bima Yojana', 'Insurance', 'AIC of India', 'Crop insurance against non-preventable natural risks.', 'Full crop value coverage', '{"minScore": 20, "crops": ["Paddy", "Ragi", "Groundnut"]}', 'https://pmfby.gov.in', '2024-08-15')
      `);
      console.log("Schemes seeded.");
    }

    console.log("Database tables initialized.");
  } catch (err) {
    console.error('DB Init Error:', err);
  }
};
initDB();

// --- HELPER: Seasonality Logic ---
const getBestSellWindow = (crop) => {
  // Simple mock seasonality logic for India
  const map = {
    'Tomato': 'May-June',
    'Onion': 'Dec-Jan',
    'Potato': 'Feb-March',
    'Rice': 'Nov-Dec',
    'Wheat': 'April-May',
    'Ragi': 'Jan-Feb',
    'Chilli': 'March-April',
    'Sugarcane': 'Oct-March'
  };
  return map[crop] || 'Post-Harvest';
};

// --- MODERATION HELPER ---
const MODERATION_KEYWORDS = ['abuse', 'hate', 'violence', 'spam', 'scam', 'fake', 'kill', 'stupid'];
const moderateContent = (text) => {
  if (!text) return true;
  const lower = text.toLowerCase();
  for (const word of MODERATION_KEYWORDS) {
    if (lower.includes(word)) return false;
  }
  return true;
};

// --- SCORING RULES & ENGINE ---
const SCORING_RULES = {
  'watering': 5,
  'irrigation': 8, // Optimization
  'fertilizer': 10, // Organic preferred
  'sowing': 10,
  'harvesting': 15,
  'pest_control': 7,
  'soil_care': 6,
  'proof_upload': 3, // Generic photo/voice proof
  'default': 5
};

const REWARDS_MILESTONES = [
  { score: 50, reward: "Basic Loan Eligibility" },
  { score: 100, reward: "Sustainable Farming Badge" },
  { score: 150, reward: "Input Store Discount (10%)" },
  { score: 200, reward: "Premium Buyer Access" }
];

const calculatePoints = (actionType, confidence) => {
  // Normalize action string to find key
  const key = Object.keys(SCORING_RULES).find(k => actionType.toLowerCase().includes(k)) || 'default';
  let points = SCORING_RULES[key];
  
  // Confidence multiplier: if confidence < 70, reduce points
  if (confidence < 70) points = Math.floor(points * 0.5);
  if (confidence > 90) points += 1; // Bonus for high confidence

  return points;
};

const getUnlockedRewards = (score) => {
  return REWARDS_MILESTONES.filter(m => score >= m.score).map(m => m.reward);
};

const getNextMilestone = (score) => {
  return REWARDS_MILESTONES.find(m => score < m.score) || null;
};

// --- WEATHER & ALERTS ENGINE ---
const generateWeatherAdvisory = (current, hourly) => {
  if (current.precipitation > 5 || hourly.precipitation_probability[0] > 60) {
    return { level: 'warning', title: 'Heavy Rain Alert', message: 'High chance of rain in the next few hours.', action: 'Postpone irrigation.' };
  }
  if (current.temperature_2m > 35) {
    return { level: 'critical', title: 'Heatwave Alert', message: 'Temperatures exceeding 35°C.', action: 'Irrigate in evening.' };
  }
  if (current.wind_speed_10m > 25) {
    return { level: 'warning', title: 'High Wind Alert', message: 'Wind speeds are high.', action: 'Avoid spraying pesticides.' };
  }
  if (current.relative_humidity_2m > 90) {
    return { level: 'info', title: 'High Humidity', message: 'Moisture levels high.', action: 'Watch for fungal diseases.' };
  }
  return null;
};

// Background Job: Check weather
const startWeatherMonitor = () => {
  setInterval(async () => {
    try {
      const subs = await pool.query('SELECT * FROM weather_subscriptions WHERE is_active = TRUE');
      if (subs.rows.length === 0) return;
      for (const sub of subs.rows) {
         const simTemp = 28 + Math.random() * 10; 
         const simRain = Math.random() > 0.8;
         // Mock alert sending logic
      }
    } catch (e) { console.error("Weather Monitor Error", e); }
  }, 60000 * 60);
};
startWeatherMonitor();


// --- MOCK MARKET PRICE GENERATOR ---
const startPriceGenerator = () => {
  const crops = ['Tomato', 'Onion', 'Potato', 'Chilli', 'Ragi'];
  setInterval(async () => {
    try {
      const marketRes = await pool.query('SELECT id FROM markets');
      const markets = marketRes.rows;
      if (markets.length === 0) return;
      for (const market of markets) {
        for (const crop of crops) {
          let basePrice = { 'Tomato': 20, 'Onion': 30, 'Potato': 25, 'Chilli': 80, 'Ragi': 35 }[crop] || 20;
          const variance = (Math.random() * 0.2) - 0.1; 
          const price = (basePrice * (1 + variance)).toFixed(2);
          await pool.query('INSERT INTO crop_prices (market_id, crop, price) VALUES ($1, $2, $3)', [market.id, crop, price]);
        }
      }
      await pool.query("DELETE FROM crop_prices WHERE timestamp < NOW() - INTERVAL '7 days'");
    } catch (e) { console.error("Price Generator Error", e); }
  }, 60000);
};
startPriceGenerator();

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({limit: '10mb'}));
app.use(cookieParser());
app.use(passport.initialize());

// --- Passport Config ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true 
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const state = req.query.state ? JSON.parse(req.query.state) : {};
      if (state.action === 'link' && state.userId) {
        const existing = await pool.query('SELECT * FROM farmers WHERE google_id = $1', [profile.id]);
        if (existing.rows.length > 0 && existing.rows[0].id != state.userId) return done(null, false, { message: 'Account already linked.' });
        const update = await pool.query(`UPDATE farmers SET google_id = $1, email = COALESCE(email, $2), picture = COALESCE(picture, $3), is_email_verified = TRUE, updated_at = NOW() WHERE id = $4 RETURNING *`, [profile.id, profile.emails[0].value, profile.photos[0].value, state.userId]);
        return done(null, update.rows[0]);
      } else {
        let res = await pool.query('SELECT * FROM farmers WHERE google_id = $1', [profile.id]);
        let user = res.rows[0];
        if (!user) {
          const emailRes = await pool.query('SELECT * FROM farmers WHERE email = $1', [profile.emails[0].value]);
          if (emailRes.rows.length > 0) {
             user = emailRes.rows[0];
             await pool.query('UPDATE farmers SET google_id = $1, is_email_verified = TRUE WHERE id = $2', [profile.id, user.id]);
          } else {
             const insert = await pool.query('INSERT INTO farmers (google_id, email, name, picture, is_email_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING *', [profile.id, profile.emails[0].value, profile.displayName, profile.photos[0].value]);
             user = insert.rows[0];
             await pool.query('INSERT INTO farming_scores (farmer_id) VALUES ($1)', [user.id]);
          }
        }
        return done(null, user);
      }
    } catch (err) { return done(err, null); }
  }
));

// --- Auth Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

app.get('/auth/link/google', authenticateJWT, (req, res, next) => {
    const state = JSON.stringify({ action: 'link', userId: req.user.id });
    passport.authenticate('google', { scope: ['profile', 'email'], state, prompt: 'select_account' })(req, res, next);
});

app.get('/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login?error=failed' }), (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user.id, google_id: user.google_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const isProfileComplete = user.phone_number && user.place;
    const redirectPath = isProfileComplete ? '/dashboard' : '/profile-setup';
    res.redirect(`${process.env.FRONTEND_URL}${redirectPath}?token=${token}`);
});

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else { res.sendStatus(401); }
};

// --- API Routes ---

// Profile & Score
app.get('/api/v1/farmers/me', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM farmers WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/v1/farmers/me', authenticateJWT, async (req, res) => {
  const { phone_number, place, preferred_language, data_sharing_consent, is_email_verified, is_phone_verified } = req.body;
  try {
    const result = await pool.query(
      `UPDATE farmers SET phone_number = $1, place = $2, preferred_language = $3, data_sharing_consent = $4, is_email_verified = $5, is_phone_verified = $6, consent_timestamp = NOW(), updated_at = NOW() WHERE id = $7 RETURNING *`,
      [phone_number, place, preferred_language, data_sharing_consent, is_email_verified, is_phone_verified, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Update failed' }); }
});

app.get('/api/v1/score/me', authenticateJWT, async (req, res) => {
  try {
    let scoreRes = await pool.query('SELECT * FROM farming_scores WHERE farmer_id = $1', [req.user.id]);
    if (scoreRes.rows.length === 0) {
      await pool.query('INSERT INTO farming_scores (farmer_id) VALUES ($1)', [req.user.id]);
      scoreRes = await pool.query('SELECT * FROM farming_scores WHERE farmer_id = $1', [req.user.id]);
    }
    const scoreData = scoreRes.rows[0];
    const historyRes = await pool.query(`SELECT id, action_type as "actionType", points_awarded as points, validation_confidence as "validationConfidence", timestamp FROM score_history WHERE farmer_id = $1 ORDER BY timestamp DESC LIMIT 20`, [req.user.id]);
    const rewards = getUnlockedRewards(scoreData.current_score);
    const nextMilestone = getNextMilestone(scoreData.current_score);

    res.json({
      farmer_id: req.user.id,
      currentScore: scoreData.current_score,
      lifetimePoints: scoreData.lifetime_points,
      lastUpdated: scoreData.last_updated,
      history: historyRes.rows,
      rewards: rewards,
      nextMilestone: nextMilestone ? { points: nextMilestone.score, reward: nextMilestone.reward } : null
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch score' }); }
});

app.post('/api/v1/score/update', authenticateJWT, async (req, res) => {
  const { action_type, confidence } = req.body;
  try {
    const points = calculatePoints(action_type, confidence);
    await pool.query('BEGIN');
    await pool.query('INSERT INTO score_history (farmer_id, action_type, points_awarded, validation_confidence) VALUES ($1, $2, $3, $4)', [req.user.id, action_type, points, confidence]);
    const updateRes = await pool.query('UPDATE farming_scores SET current_score = current_score + $1, lifetime_points = lifetime_points + $1, last_updated = NOW() WHERE farmer_id = $2 RETURNING current_score, lifetime_points', [points, req.user.id]);
    await pool.query('COMMIT');
    const newScore = updateRes.rows[0].current_score;
    const rewards = getUnlockedRewards(newScore);
    res.json({ success: true, pointsAdded: points, newScore: newScore, newLifetimePoints: updateRes.rows[0].lifetime_points, unlockedRewards: rewards });
  } catch (err) { await pool.query('ROLLBACK'); res.status(500).json({ error: 'Score update failed' }); }
});

// Market Trends
app.get('/api/v1/markets/prices', async (req, res) => {
  const { crop, district } = req.query;
  try {
    let query = `SELECT cp.*, m.name as market_name, m.district FROM crop_prices cp JOIN markets m ON cp.market_id = m.id WHERE cp.timestamp IN (SELECT MAX(timestamp) FROM crop_prices GROUP BY market_id, crop)`;
    const params = [];
    if (crop) { query += ` AND cp.crop = $1`; params.push(crop); }
    const latestPrices = await pool.query(query, params);
    const enriched = await Promise.all(latestPrices.rows.map(async (p) => {
      const prevRes = await pool.query(`SELECT price FROM crop_prices WHERE market_id = $1 AND crop = $2 AND timestamp < NOW() - INTERVAL '1 day' ORDER BY timestamp DESC LIMIT 1`, [p.market_id, p.crop]);
      const prevPrice = prevRes.rows[0] ? parseFloat(prevRes.rows[0].price) : parseFloat(p.price);
      const currPrice = parseFloat(p.price);
      let trend = 'stable';
      if (currPrice > prevPrice) trend = 'up';
      if (currPrice < prevPrice) trend = 'down';
      return {
        marketId: p.market_id,
        marketName: p.market_name,
        crop: p.crop,
        price: currPrice,
        unit: p.unit,
        timestamp: p.timestamp,
        trend,
        changePercent: prevPrice > 0 ? parseFloat((((currPrice - prevPrice) / prevPrice) * 100).toFixed(1)) : 0
      };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({error: "Market data fetch failed"}); }
});

app.get('/api/v1/markets/history', async (req, res) => {
  const { crop, marketId, days = 7 } = req.query;
  try {
    const result = await pool.query(`SELECT price, timestamp FROM crop_prices WHERE market_id = $1 AND crop = $2 AND timestamp > NOW() - INTERVAL '${days} days' ORDER BY timestamp ASC`, [marketId, crop]);
    res.json(result.rows.map(r => ({ price: parseFloat(r.price), date: r.timestamp })));
  } catch (e) { res.status(500).json({error: "History fetch failed"}); }
});

app.post('/api/v1/markets/alerts', authenticateJWT, async (req, res) => {
  const { crop, targetPrice, condition } = req.body;
  try {
    const result = await pool.query(`INSERT INTO price_alerts (farmer_id, crop, target_price, condition) VALUES ($1, $2, $3, $4) RETURNING *`, [req.user.id, crop, targetPrice, condition]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({error: "Failed to create alert"}); }
});

app.get('/api/v1/markets/alerts', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM price_alerts WHERE farmer_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({error: "Failed to fetch alerts"}); }
});

// Weather API
app.get('/api/v1/weather', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({error: "Missing lat/lng"});
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`);
    if (!response.ok) throw new Error("Weather API failed");
    const data = await response.json();
    const alerts = [];
    if (data.current.precipitation > 0) alerts.push("Rain detected.");
    const hourly = data.hourly.time.slice(0, 24).map((time, index) => ({
      time: new Date(time).toLocaleTimeString([], { hour: '2-digit', hour12: true }),
      temp: data.hourly.temperature_2m[index],
      rainChance: data.hourly.precipitation_probability[index],
      weatherCode: data.hourly.weather_code[index]
    })).filter((_, i) => i % 3 === 0);
    const daily = data.daily.time.map((time, index) => ({
      date: new Date(time).toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
      maxTemp: data.daily.temperature_2m_max[index],
      minTemp: data.daily.temperature_2m_min[index],
      rainChance: data.daily.precipitation_probability_max[index],
      weatherCode: data.daily.weather_code[index]
    }));
    const advisory = generateWeatherAdvisory(data.current, data.hourly);
    res.json({ current: { temp: data.current.temperature_2m, humidity: data.current.relative_humidity_2m, windSpeed: data.current.wind_speed_10m, weatherCode: data.current.weather_code, isDay: data.current.is_day === 1 }, hourly, daily, alerts, advisory });
  } catch (error) { res.status(500).json({error: "Failed to fetch weather"}); }
});

app.post('/api/v1/alerts/weather', authenticateJWT, async (req, res) => {
  const { lat, lng, placeName, enable } = req.body;
  try {
    if (enable) {
      await pool.query(`INSERT INTO weather_subscriptions (farmer_id, lat, lng, place_name, is_active) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT (farmer_id) DO UPDATE SET lat = $2, lng = $3, place_name = $4, is_active = TRUE`, [req.user.id, lat, lng, placeName]);
      res.json({success: true, message: "Subscribed to weather alerts"});
    } else {
      await pool.query('UPDATE weather_subscriptions SET is_active = FALSE WHERE farmer_id = $1', [req.user.id]);
      res.json({success: true, message: "Unsubscribed from weather alerts"});
    }
  } catch (e) { res.status(500).json({error: "Subscription failed"}); }
});

app.get('/api/v1/alerts/weather', authenticateJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT is_active FROM weather_subscriptions WHERE farmer_id = $1', [req.user.id]);
    res.json({ isSubscribed: result.rows.length > 0 && result.rows[0].is_active });
  } catch(e) { res.status(500).json({ error: "Status check failed" }); }
});

// Crop Health API
app.get('/api/v1/crop-health', authenticateJWT, async (req, res) => {
  const { parcel_id } = req.query;
  try {
     const logs = await pool.query('SELECT * FROM crop_health_logs WHERE farmer_id = $1 ORDER BY timestamp DESC LIMIT 5', [req.user.id]);
     const ndviGrid = [];
     let stressZonesCount = 0;
     let totalNdvi = 0;
     for (let i=0; i<5; i++) {
       const row = [];
       for (let j=0; j<5; j++) {
          const isStressed = Math.random() > 0.9;
          const val = isStressed ? 0.2 + Math.random()*0.2 : 0.6 + Math.random()*0.3;
          let status = 'healthy';
          if (val < 0.4) { status = 'stressed'; stressZonesCount++; }
          else if (val < 0.6) { status = 'moderate'; }
          row.push({ val: parseFloat(val.toFixed(2)), status });
          totalNdvi += val;
       }
       ndviGrid.push(row);
     }
     const averageNDVI = parseFloat((totalNdvi / 25).toFixed(2));
     res.json({ parcelId: parcel_id || `PARCEL-${req.user.id}-01`, averageNDVI, lastScanDate: new Date().toISOString(), ndviGrid, stressZonesCount, logs: logs.rows.map(log => ({ ...log, issues: log.issues ? JSON.parse(log.issues) : [] })) });
  } catch (e) { res.status(500).json({ error: "Failed to fetch crop health" }); }
});

app.post('/api/v1/crop-health/photo', authenticateJWT, async (req, res) => {
  const { healthScore, issues, recommendation, confidence, parcelId } = req.body;
  try {
    const result = await pool.query(`INSERT INTO crop_health_logs (farmer_id, parcel_id, health_score, issues, recommendation, confidence) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [req.user.id, parcelId || 'DEFAULT', healthScore, JSON.stringify(issues), recommendation, confidence]);
    const log = result.rows[0];
    res.json({ success: true, health_score: log.health_score, issues: JSON.parse(log.issues), confidence: log.confidence });
  } catch (e) { res.status(500).json({ error: "Failed to save health record" }); }
});

// --- ECONOMICS / DASHBOARD API ---

app.post('/api/v1/economics/expense', authenticateJWT, async (req, res) => {
  const { date, category, amount, crop, season, notes } = req.body;
  try {
    const result = await pool.query(`INSERT INTO farm_expenses (farmer_id, date, category, amount, crop, season, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [req.user.id, date, category, amount, crop, season, notes]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed to add expense" }); }
});

app.post('/api/v1/economics/income', authenticateJWT, async (req, res) => {
  const { date, source, amount, quantity, unit, crop, season, notes } = req.body;
  try {
    const result = await pool.query(`INSERT INTO farm_incomes (farmer_id, date, source, amount, quantity, unit, crop, season, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [req.user.id, date, source, amount, quantity || 0, unit || 'kg', crop, season, notes]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed to add income" }); }
});

app.get('/api/v1/economics/summary', authenticateJWT, async (req, res) => {
   // Redirect to dashboard endpoint logic for backwards compatibility if needed, 
   // or keep simple summary. For now, we use the dashboard endpoint below for full details.
   res.redirect(`/api/v1/economics/dashboard?season=${req.query.season || ''}`);
});

app.get('/api/v1/economics/dashboard', authenticateJWT, async (req, res) => {
  const { season } = req.query;
  try {
    let expenseQuery = 'SELECT * FROM farm_expenses WHERE farmer_id = $1';
    let incomeQuery = 'SELECT * FROM farm_incomes WHERE farmer_id = $1';
    const params = [req.user.id];

    if (season) {
      expenseQuery += ' AND season = $2';
      incomeQuery += ' AND season = $2';
      params.push(season);
    }
    
    const expenses = await pool.query(expenseQuery, params);
    const incomes = await pool.query(incomeQuery, params);

    // 1. Totals
    const totalExpenses = expenses.rows.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalRevenue = incomes.rows.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    // 2. Cashflow (Monthly)
    const cashflowMap = {};
    [...expenses.rows, ...incomes.rows].forEach(tx => {
       const date = new Date(tx.date);
       const key = `${date.getFullYear()}-${date.getMonth()}`; // Unique Month Key
       const label = date.toLocaleString('default', { month: 'short' });
       
       if (!cashflowMap[key]) cashflowMap[key] = { month: label, income: 0, expense: 0, sort: date.getTime() };
       
       if (tx.category) cashflowMap[key].expense += parseFloat(tx.amount);
       else cashflowMap[key].income += parseFloat(tx.amount);
    });
    
    const cashflow = Object.values(cashflowMap).sort((a, b) => a.sort - b.sort);

    // 3. Crop Performance (Break-even & Best Sell)
    const cropStats = {};
    
    expenses.rows.forEach(ex => {
       if (!cropStats[ex.crop]) cropStats[ex.crop] = { cost: 0, revenue: 0, qty: 0, unit: 'kg' };
       cropStats[ex.crop].cost += parseFloat(ex.amount);
    });

    incomes.rows.forEach(inc => {
       if (!cropStats[inc.crop]) cropStats[inc.crop] = { cost: 0, revenue: 0, qty: 0, unit: inc.unit };
       cropStats[inc.crop].revenue += parseFloat(inc.amount);
       cropStats[inc.crop].qty += parseFloat(inc.quantity || 0);
       if(inc.unit) cropStats[inc.crop].unit = inc.unit;
    });

    const cropPerformance = Object.keys(cropStats).map(crop => {
       const stats = cropStats[crop];
       const breakEvenPrice = stats.qty > 0 ? stats.cost / stats.qty : 0;
       const avgSellPrice = stats.qty > 0 ? stats.revenue / stats.qty : 0;
       const profitMargin = stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0;
       
       return {
          crop,
          totalCost: stats.cost,
          totalRevenue: stats.revenue,
          soldQuantity: stats.qty,
          unit: stats.unit,
          breakEvenPrice,
          avgSellPrice,
          profitMargin,
          bestSellMonth: getBestSellWindow(crop)
       };
    });

    // 4. Categories
    const catMap = {};
    expenses.rows.forEach(ex => {
      catMap[ex.category] = (catMap[ex.category] || 0) + parseFloat(ex.amount);
    });
    const expensesByCategory = Object.keys(catMap).map(cat => ({ category: cat, amount: catMap[cat] }));

    const recentTransactions = [
      ...expenses.rows.map(e => ({ ...e, transactionType: 'expense' })),
      ...incomes.rows.map(i => ({ ...i, transactionType: 'income' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      cashflow,
      cropPerformance,
      expensesByCategory,
      recentTransactions
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});


// Scheme Matching
app.get('/api/v1/match/schemes', authenticateJWT, async (req, res) => {
  try {
     const userRes = await pool.query('SELECT * FROM farmers WHERE id = $1', [req.user.id]);
     const scoreRes = await pool.query('SELECT current_score FROM farming_scores WHERE farmer_id = $1', [req.user.id]);
     const applicationsRes = await pool.query('SELECT scheme_id FROM scheme_applications WHERE farmer_id = $1', [req.user.id]);
     const user = userRes.rows[0];
     const score = scoreRes.rows[0]?.current_score || 0;
     const appliedSchemeIds = applicationsRes.rows.map(a => a.scheme_id);
     const schemesRes = await pool.query('SELECT * FROM schemes');
     const matchedSchemes = schemesRes.rows.map(scheme => {
        const criteria = scheme.criteria || {};
        let isEligible = true;
        const matchReason = [];
        const missingCriteria = [];
        if (criteria.minScore && score < criteria.minScore) { isEligible = false; missingCriteria.push(`Min Score: ${criteria.minScore}`); } 
        else if (criteria.minScore) { matchReason.push("Good Credit Score"); }
        if (criteria.location && user.place) {
            const matchesLoc = criteria.location.some(loc => user.place.toLowerCase().includes(loc.toLowerCase()));
            if (!matchesLoc) { isEligible = false; missingCriteria.push(`Valid Districts: ${criteria.location.join(', ')}`); } 
            else { matchReason.push("Location Match"); }
        }
        if (criteria.crops) { matchReason.push("Crop Match"); }
        return { ...scheme, isEligible, matchReason, missingCriteria, hasApplied: appliedSchemeIds.includes(scheme.id) };
     });
     res.json(matchedSchemes);
  } catch (e) { res.status(500).json({ error: "Matching engine failed" }); }
});

app.post('/api/v1/match/apply', authenticateJWT, async (req, res) => {
  const { scheme_id } = req.body;
  try {
     const userRes = await pool.query('SELECT data_sharing_consent FROM farmers WHERE id = $1', [req.user.id]);
     if (!userRes.rows[0].data_sharing_consent) return res.status(403).json({ error: "Data sharing consent required to apply." });
     const exist = await pool.query('SELECT * FROM scheme_applications WHERE farmer_id = $1 AND scheme_id = $2', [req.user.id, scheme_id]);
     if (exist.rows.length > 0) return res.status(400).json({ error: "Already applied." });
     await pool.query('INSERT INTO scheme_applications (farmer_id, scheme_id, status) VALUES ($1, $2, $3)', [req.user.id, scheme_id, 'applied']);
     res.json({ success: true, message: "Application submitted successfully to partner." });
  } catch (e) { res.status(500).json({ error: "Application failed" }); }
});

// --- IRRIGATION PLANNER ---
app.post('/api/v1/irrigation/plan', async (req, res) => {
  const { crop, soilType, area, irrigationType, lat = 12.5, lng = 76.9 } = req.body;
  
  try {
     // 1. Get Weather (Using OpenMeteo)
     const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&timezone=auto&forecast_days=7`);
     if (!response.ok) throw new Error("Weather failed");
     const weather = await response.json();
     
     // 2. Crop Coefficients (Kc) - Simplified
     const cropKc = {
        'Tomato': 1.1, 'Rice': 1.2, 'Ragi': 0.8, 'Sugarcane': 1.2, 'Potato': 0.9, 'Onion': 0.8, 'Chilli': 1.0
     };
     const kc = cropKc[crop] || 1.0;

     // 3. Soil Efficiency (Retention)
     // Clay holds more water (so water less frequent but deeper). Sandy holds less.
     // We will adjust total needed by efficiency of the system.
     const efficiency = irrigationType === 'Drip' ? 0.90 : 0.60; // Drip is 90%, Flood 60%
     
     const schedule = [];
     let totalVol = 0;

     for (let i = 0; i < 7; i++) {
        const et0 = weather.daily.et0_fao_evapotranspiration[i] || 4.5; // mm/day
        const rain = weather.daily.precipitation_sum[i] || 0; // mm
        const date = weather.daily.time[i];
        
        // Crop Water Need = ETc = ETo * Kc
        let needMm = et0 * kc;
        
        // Net Need = Need - Effective Rain (assume 80% effective)
        let netNeedMm = needMm - (rain * 0.8);
        if (netNeedMm < 0) netNeedMm = 0;

        // Volume in Liters = mm * Area(sqm) * 1 (liter/mm/sqm)
        // 1 Acre = 4046.86 sqm
        const areaSqm = area * 4046.86;
        let volLiters = (netNeedMm / 1000) * areaSqm * 1000; // convert mm to m, then to L
        
        // Adjust for efficiency (Gross Irrigation Requirement)
        volLiters = volLiters / efficiency;

        const dayStatus = volLiters > 0 ? 'water' : 'skip';
        let reason = "Normal schedule";
        if (rain > 5) reason = "Heavy rain expected, skip watering.";
        else if (rain > 1) reason = "Light rain reduces need.";
        else if (weather.daily.temperature_2m_max[i] > 35) reason = "High heat, extra water needed.";

        schedule.push({
           date,
           dayName: new Date(date).toLocaleDateString('en-US', {weekday: 'short'}),
           status: dayStatus,
           volumeLiters: Math.round(volLiters),
           rainChance: rain > 0 ? 80 : 0, // approximate from sum
           reason
        });

        totalVol += volLiters;
     }
     
     // Calculate Savings vs Conventional (Flood = 50% eff vs Drip 90%)
     // If user selected Drip, we compare to Flood.
     // If user selected Flood, savings is 0 or negative recommendation.
     let savings = 0;
     if (irrigationType === 'Drip') {
        // Conv Volume would be (NetNeed / 0.50)
        // Drip Volume is (NetNeed / 0.90)
        // Saving % = 1 - (0.5/0.9) approx
        savings = 40; // approx 40% savings
     }

     res.json({
        crop,
        totalWaterWeekly: Math.round(totalVol),
        waterSavedVsConventional: savings,
        schedule,
        recommendation: irrigationType === 'Flood' ? "Consider switching to Drip Irrigation to save ~40% water." : "Drip system is optimized."
     });

  } catch (e) {
     console.error(e);
     res.status(500).json({error: "Planning failed"});
  }
});

// --- SOCIAL FEED API ---

app.get('/api/v1/feed', authenticateJWT, async (req, res) => {
  try {
    // Fetch posts with basic user info and like status
    const postsQuery = `
      SELECT fp.id, fp.farmer_id, fp.content, fp.image_url as "imageUrl", fp.audio_url as "audioUrl", 
             fp.likes_count as "likesCount", fp.created_at as timestamp,
             f.name as "authorName", f.picture as "authorPic", f.place as "authorLocation",
             EXISTS(SELECT 1 FROM feed_likes fl WHERE fl.post_id = fp.id AND fl.farmer_id = $1) as "hasLiked",
             (SELECT COUNT(*) FROM feed_comments fc WHERE fc.post_id = fp.id) as "commentsCount"
      FROM feed_posts fp
      JOIN farmers f ON fp.farmer_id = f.id
      ORDER BY fp.created_at DESC
      LIMIT 20
    `;
    const result = await pool.query(postsQuery, [req.user.id]);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load feed." });
  }
});

app.post('/api/v1/feed/post', authenticateJWT, async (req, res) => {
  const { content, image, audio } = req.body;
  
  // Moderation
  if (!moderateContent(content)) {
    return res.status(400).json({ error: "Content contains restricted keywords." });
  }

  try {
    // For demo, we store base64 images/audio directly or mock URLs. 
    // Ideally, upload to cloud storage and store URL.
    // Here we'll just assume text/urls for simplicity or basic storage if needed.
    // Truncating long base64 for DB perf in demo:
    const imageUrl = image ? image : null; 
    const audioUrl = audio ? audio : null;

    const result = await pool.query(`
      INSERT INTO feed_posts (farmer_id, content, image_url, audio_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [req.user.id, content, imageUrl, audioUrl]);
    
    res.json({ success: true, postId: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to post." });
  }
});

app.post('/api/v1/feed/like', authenticateJWT, async (req, res) => {
  const { postId } = req.body;
  try {
    // Check if already liked
    const check = await pool.query('SELECT * FROM feed_likes WHERE post_id = $1 AND farmer_id = $2', [postId, req.user.id]);
    
    if (check.rows.length > 0) {
       // Unlike
       await pool.query('DELETE FROM feed_likes WHERE post_id = $1 AND farmer_id = $2', [postId, req.user.id]);
       await pool.query('UPDATE feed_posts SET likes_count = likes_count - 1 WHERE id = $1', [postId]);
       res.json({ success: true, action: 'unliked' });
    } else {
       // Like
       await pool.query('INSERT INTO feed_likes (post_id, farmer_id) VALUES ($1, $2)', [postId, req.user.id]);
       await pool.query('UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
       res.json({ success: true, action: 'liked' });
    }
  } catch (e) {
    res.status(500).json({ error: "Action failed" });
  }
});

app.post('/api/v1/feed/comment', authenticateJWT, async (req, res) => {
  const { postId, content } = req.body;
  
  if (!moderateContent(content)) {
    return res.status(400).json({ error: "Comment contains restricted keywords." });
  }

  try {
    const result = await pool.query(`
      INSERT INTO feed_comments (post_id, farmer_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
    `, [postId, req.user.id, content]);
    
    // Fetch author details for immediate UI update
    const userRes = await pool.query('SELECT name, picture FROM farmers WHERE id = $1', [req.user.id]);
    
    res.json({ 
      success: true, 
      comment: {
        id: result.rows[0].id,
        postId,
        authorName: userRes.rows[0].name,
        authorPic: userRes.rows[0].picture,
        content,
        timestamp: result.rows[0].created_at
      }
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to comment" });
  }
});

app.get('/api/v1/feed/comments', authenticateJWT, async (req, res) => {
  const { postId } = req.query;
  try {
    const result = await pool.query(`
      SELECT fc.id, fc.post_id as "postId", fc.content, fc.created_at as timestamp,
             f.name as "authorName", f.picture as "authorPic"
      FROM feed_comments fc
      JOIN farmers f ON fc.farmer_id = f.id
      WHERE fc.post_id = $1
      ORDER BY fc.created_at ASC
    `, [postId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Assistant API
app.post('/api/v1/assistant/query', async (req, res) => {
  const { GoogleGenAI } = await import('@google/genai');
  const { text, audio, language = 'english', context } = req.body;
  if (!process.env.API_KEY) return res.status(500).json({ text: "Server configuration error: API Key missing" });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts = [];
    if (audio) { parts.push({ inlineData: { mimeType: "audio/mp3", data: audio } }); }
    const userContextStr = context ? `User Location: ${context.place}.` : "";
    const promptText = `${text ? `User Query: "${text}"` : "User provided audio query."} You are a friendly and practical Agricultural Assistant named 'AgriBot'. Context: ${userContextStr} Instructions: 1. Reply in ${language} language. 2. Keep answers short (max 3 sentences), simple, and encouraging for a farmer. 3. If asked about weather or prices, give general advice or ask for location if unknown. 4. Provide practical tips.`;
    parts.push({ text: promptText });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts } });
    res.json({ text: response.text, audio: null });
  } catch (e) { res.status(500).json({ text: "Sorry, I am unable to process your request at the moment." }); }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});