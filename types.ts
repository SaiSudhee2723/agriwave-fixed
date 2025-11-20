

export interface ValidationResult {
  isValid: boolean;
  activityType: string;
  confidenceScore: number;
  pointsEarned: number;
  reasoning: string;
}

export interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface TeamMember {
  name: string;
  role?: string;
}

export interface UserProfile {
  id: string;
  googleId?: string; // Optional, can be linked later
  name: string;
  email: string;
  picture: string;
  phoneNumber?: string; // To be filled during profile setup
  place?: string; // Village or Town
  preferredLanguage?: string;
  dataSharingConsent?: boolean;
  isProfileComplete?: boolean;
  createdAt?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface ScoreHistoryItem {
  id: number;
  actionType: string;
  points: number;
  timestamp: string;
  validationConfidence: number;
}

export interface FarmerScore {
  currentScore: number;
  lifetimePoints: number;
  lastUpdated: string;
  history: ScoreHistoryItem[];
  rewards: string[]; // List of unlocked reward strings
  nextMilestone?: {
    points: number;
    reward: string;
  };
}

// --- Market Trend Types ---

export interface Market {
  id: number;
  name: string;
  district: string;
  distanceKm?: number;
}

export interface CropPriceData {
  id?: number;
  marketId: number;
  marketName: string;
  crop: string;
  price: number;
  unit: string;
  timestamp: string;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
}

export interface PriceAlert {
  id: number;
  crop: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isActive: boolean;
}

export interface MarketAdvice {
  action: 'SELL' | 'HOLD' | 'NEUTRAL';
  reason: string;
  confidence: number;
}

// --- Soil Health Types ---

export interface InputLog {
  id: number;
  date: string;
  type: 'Fertilizer' | 'Pesticide' | 'Organic' | 'Water' | 'Seeds';
  productName: string;
  quantity: string;
  notes?: string;
}

export interface SoilProfile {
  landId: string;
  surveyNumber: string;
  soilType: string;
  lastTestDate: string;
  acreage: number;
  phLevel: number;
  organicCarbon: number; // Percentage
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
  moisture: number; // Percentage
  inputHistory: InputLog[];
}

// --- Buyer Matchmaking Types ---

export interface Buyer {
  id: number;
  name: string;
  type: 'FPO' | 'Retailer' | 'Wholesaler' | 'Exporter';
  location: string;
  minScoreRequirement: number;
  cropsInterested: string[];
  isPremium: boolean;
  logo?: string;
  contactPhone?: string;
}

// --- Weather Types ---

export interface WeatherAdvisory {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action: string;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  rainChance: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  rainChance: number;
  weatherCode: number;
}

export interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    isDay: boolean;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  alerts: string[];
  advisory?: WeatherAdvisory;
}

// --- Crop Health Types ---

export interface CropHealthAnalysis {
  healthScore: number; // 0-100
  issues: string[]; // e.g., ["Nitrogen Deficiency", "Aphid Infestation"]
  recommendation: string;
  confidence: number;
  timestamp: string;
}

export interface NDVIGridPoint {
  val: number; // -1 to 1
  status: 'healthy' | 'moderate' | 'stressed';
}

export interface ParcelHealthData {
  parcelId: string;
  averageNDVI: number;
  lastScanDate: string;
  ndviGrid: NDVIGridPoint[][]; // 5x5 Grid for visualization
  stressZonesCount: number;
}

// --- Economics / Cost Tracking Types ---

export interface Expense {
  id: number;
  date: string;
  category: 'Fertilizer' | 'Pesticide' | 'Seeds' | 'Labor' | 'Fuel' | 'Machinery' | 'Other';
  amount: number;
  crop: string;
  notes?: string;
  season?: string;
}

export interface Income {
  id: number;
  date: string;
  source: string;
  amount: number;
  quantity?: number;
  unit?: string;
  crop: string;
  notes?: string;
  season?: string;
}

export interface CropPerformance {
  crop: string;
  totalCost: number;
  totalRevenue: number;
  soldQuantity: number;
  unit: string;
  breakEvenPrice: number;
  avgSellPrice: number;
  profitMargin: number;
  bestSellMonth: string;
}

export interface EconomicsDashboardData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashflow: { month: string; income: number; expense: number }[];
  cropPerformance: CropPerformance[];
  expensesByCategory: { category: string; amount: number; color?: string }[];
  recentTransactions: (Expense | Income & { transactionType: 'expense' | 'income' })[];
}

// --- Scheme Matching Types ---

export interface SchemeCriteria {
  minScore?: number;
  location?: string[]; // List of districts e.g., ["Mandya", "Mysore"]
  crops?: string[];
  minAcreage?: number;
}

export interface Scheme {
  id: number;
  name: string;
  type: 'Subsidy' | 'Loan' | 'Insurance';
  provider: string;
  description: string;
  benefits: string; // e.g., "50% off on equipment"
  criteria: SchemeCriteria;
  link?: string;
  deadline?: string;
  
  // Computed on frontend/backend match
  isEligible: boolean;
  matchReason?: string[];
  missingCriteria?: string[];
  hasApplied?: boolean;
}

// --- Social Feed Types ---

export interface FeedComment {
  id: number;
  postId: number;
  authorName: string;
  authorPic?: string;
  content: string;
  timestamp: string;
}

export interface FeedPost {
  id: number;
  authorId: number;
  authorName: string;
  authorPic?: string;
  authorLocation?: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  likesCount: number;
  hasLiked: boolean;
  commentsCount: number;
  timestamp: string;
  comments?: FeedComment[];
}

// --- Irrigation Planner Types ---

export interface IrrigationDay {
  date: string;
  dayName: string;
  status: 'water' | 'skip';
  volumeLiters: number;
  rainChance: number;
  reason: string; // "Heavy rain expected" or "Soil moisture low"
}

export interface IrrigationPlan {
  crop: string;
  totalWaterWeekly: number;
  waterSavedVsConventional: number; // Percentage
  schedule: IrrigationDay[];
  recommendation: string;
}

export enum AppSection {
  Home = 'home',
  Demo = 'demo',
  Features = 'features',
  Team = 'team',
  Market = 'market',
  Soil = 'soil',
  Buyers = 'buyers',
  CropHealth = 'crop_health',
  Economics = 'economics',
  Schemes = 'schemes',
  Feed = 'feed',
  Irrigation = 'irrigation'
}