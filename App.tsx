
import React, { useState, useEffect } from 'react';
import { 
  Menu, X, ChevronRight, Smartphone, 
  CloudRain, TrendingUp, Activity, ShieldCheck, 
  Droplets, Wind, User, Sprout, LogOut, Phone,
  Moon, Sun, Globe, Volume2, VolumeX, Users, MapPin,
  Scan, Gift
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DemoInteractive } from './components/DemoInteractive';
import { MarketTrends } from './components/MarketTrends';
import { SoilHealth } from './components/SoilHealth';
import { BuyerMatchmaking } from './components/BuyerMatchmaking';
import { CropHealthMonitor } from './components/CropHealthMonitor';
import { CostTracking } from './components/CostTracking';
import { SchemeMatching } from './components/SchemeMatching';
import { SocialFeed } from './components/SocialFeed';
import { Architecture } from './components/Architecture';
import { ProfileSetup } from './components/ProfileSetup';
import { IrrigationPlanner } from './components/IrrigationPlanner';
import { Card } from './components/ui/Card';
import { AuthModal } from './components/AuthModal'; // New Import
import { UserProfile } from './types';
import { LanguageProvider, useLanguage, Language } from './contexts/LanguageContext';
import { VoiceProvider, useVoice } from './contexts/VoiceContext';
import { WeatherWidget } from './components/WeatherWidget';
import { useScrollAnimation } from './hooks/useScrollAnimation';
import { FarmingAssistant } from './components/FarmingAssistant';

// --- CUSTOM LOGO ---
const AgriWaveLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Wave Blue */}
    <path d="M10 60 Q 30 80 50 60 T 90 60 V 90 H 10 V 60 Z" fill="#34d399" /> 
    <path d="M20 65 C 20 65, 40 85, 80 55 C 80 55, 90 50, 90 70 C 90 90, 50 95, 20 80 Z" fill="#059669" />
    
    {/* Leaf Green */}
    <path d="M50 10 C 50 10, 90 30, 90 60 C 90 60, 50 80, 50 80 C 50 80, 10 60, 10 30 C 10 30, 20 10, 50 10 Z" fill="#10b981" />
    
    {/* Circuit Lines White */}
    <path d="M50 15 V 75" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 30 L 70 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 45 L 30 35" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M50 60 L 70 50" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="70" cy="20" r="3" fill="white" />
    <circle cx="30" cy="35" r="3" fill="white" />
    <circle cx="70" cy="50" r="3" fill="white" />
  </svg>
);

// --- SUB COMPONENTS ---

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, className }) => (
  <div className={`bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-surface-800 hover:shadow-lg hover:shadow-primary-900/10 dark:hover:shadow-black/40 transition-all p-6 rounded-2xl border border-surface-100 dark:border-surface-700 group duration-300 ${className}`}>
    <div className="w-12 h-12 bg-primary-50 dark:bg-surface-800 rounded-xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 border border-primary-100 dark:border-surface-700">
      <Icon className="text-primary-600 dark:text-primary-400 w-6 h-6 group-hover:text-primary-500" />
    </div>
    <h3 className="font-bold text-surface-900 dark:text-surface-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{title}</h3>
    <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, text, className }: { number: string, title: string, text: string, className?: string }) => (
  <div className={`relative flex flex-col items-center text-center p-4 group ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-xl flex items-center justify-center mb-4 shadow-lg shadow-primary-200 dark:shadow-primary-900/30 transform group-hover:-translate-y-1 transition-transform duration-300">
      {number}
    </div>
    <h4 className="font-bold text-surface-800 dark:text-surface-200 mb-1">{title}</h4>
    <p className="text-xs text-surface-500 dark:text-surface-400 max-w-[150px]">{text}</p>
  </div>
);

const TeamMemberCard = ({ name, role, className }: { name: string, role?: string, className?: string }) => (
  <div className={`bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-surface-100 dark:border-surface-800 text-center hover:border-primary-200 dark:hover:border-primary-800 transition-colors ${className}`}>
    <div className="w-16 h-16 bg-surface-200 dark:bg-surface-700 rounded-full mx-auto mb-3 flex items-center justify-center">
      <User className="text-surface-400 dark:text-surface-500 w-8 h-8" />
    </div>
    <h4 className="font-bold text-surface-800 dark:text-surface-100">{name}</h4>
    {role && <p className="text-xs text-primary-600 dark:text-primary-400 uppercase tracking-wide font-semibold">{role}</p>}
  </div>
);

// --- MAIN APP CONTENT ---

const App: React.FC = () => {
  useScrollAnimation(); // Initialize scroll animations

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  
  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { voiceEnabled, toggleVoice } = useVoice();
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return (saved as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Initialize user from localStorage for persistence
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('gfarm_user_profile');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user profile", e);
      return null;
    }
  });

  useEffect(() => {
    if (user && user.preferredLanguage) {
      const lang = user.preferredLanguage as Language;
      if (['en', 'hi', 'kn', 'te', 'ta'].includes(lang)) {
        setLanguage(lang);
      }
    }
  }, [user, setLanguage]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('gfarm_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setIsMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLoginClick = () => {
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = (loggedInUser: UserProfile) => {
    setIsAuthOpen(false);
    setUser(loggedInUser);
    localStorage.setItem('gfarm_token', 'mock-token-' + Date.now());
  };

  const handleProfileSave = (updatedProfile: UserProfile) => {
    setUser(updatedProfile);
    localStorage.setItem('gfarm_user_profile', JSON.stringify(updatedProfile));
    if (updatedProfile.preferredLanguage) {
       setLanguage(updatedProfile.preferredLanguage as Language);
    }
    setTimeout(() => scrollTo('demo'), 100);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gfarm_user_profile');
    localStorage.removeItem('gfarm_token');
    setIsMenuOpen(false);
    scrollTo('home');
  };

  const languages: {code: Language, label: string}[] = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ' }, 
    { code: 'hi', label: 'हिंदी' },   
    { code: 'te', label: 'తెలుగు' }, 
    { code: 'ta', label: 'தமிழ்' }    
  ];

  const navItems = [
    'features', 
    'demo', 
    'market', 
    'feed', 
    'soil', 
    'schemes', 
    'irrigation', 
    'buyers', 
    'crophealth', 
    'economics'
  ];

  const getNavLabel = (key: string) => {
     const lookup = key === 'crophealth' ? 'nav_crop_health' : `nav_${key}`;
     return t(lookup);
  };

  if (user && !user.isProfileComplete) {
    return <ProfileSetup user={user} onSave={handleProfileSave} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-surface-800 dark:text-surface-100 font-sans selection:bg-primary-200 dark:selection:bg-primary-900 relative transition-colors duration-500">
      
      <FarmingAssistant user={user} />

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleAuthSuccess}
      />

      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl z-50 border-b border-surface-200 dark:border-surface-800 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo(0,0)}>
              <div className="bg-primary-50 dark:bg-primary-900/20 p-1.5 rounded-xl border border-primary-100 dark:border-primary-800 group-hover:scale-105 transition-transform">
                <AgriWaveLogo className="w-8 h-8" />
              </div>
              <span className="text-xl font-bold text-surface-900 dark:text-white tracking-tight hidden sm:block group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">AgriWave</span>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400 tracking-tight sm:hidden">AW</span>
            </div>
            
            <div className="hidden md:flex space-x-1 lg:space-x-4 items-center">
              {navItems.map((item) => (
                  <button 
                    key={item} 
                    onClick={() => scrollTo(item.toLowerCase())} 
                    className="px-3 py-2 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
                  >
                    {getNavLabel(item)}
                  </button>
              ))}
              
              <div className="h-4 w-px bg-surface-300 dark:bg-surface-700 mx-2"></div>

              {/* Language */}
              <div className="relative">
                <button 
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 transition-colors flex items-center gap-1"
                >
                   <Globe className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase">{language}</span>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-surface-900 rounded-xl shadow-xl shadow-primary-900/10 border border-surface-100 dark:border-surface-800 py-1 overflow-hidden">
                    {languages.map(l => (
                      <button 
                        key={l.code}
                        onClick={() => { setLanguage(l.code); setIsLangMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 ${language === l.code ? 'text-primary-600 font-bold' : 'text-surface-700 dark:text-surface-300'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice */}
              <button 
                onClick={toggleVoice} 
                className={`p-2 rounded-full transition-all ${voiceEnabled ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 ring-2 ring-primary-200 dark:ring-primary-800' : 'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400'}`}
                title="Toggle Voice Assistant"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Theme */}
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-secondary-400 transition-colors"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3 pl-2 animate-fade-in">
                   <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-primary-200 dark:border-primary-800 shadow-sm" />
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-surface-800 dark:text-surface-200 leading-none">{user.name}</span>
                     <span className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">Verified Farmer</span>
                   </div>
                   <button 
                    onClick={handleLogout} 
                    className="ml-2 text-surface-400 hover:text-red-500 transition-colors p-1"
                    title="Logout"
                   >
                     <LogOut className="w-4 h-4" />
                   </button>
                </div>
              ) : (
                <button 
                  onClick={handleLoginClick} 
                  className="flex items-center gap-2 bg-surface-900 dark:bg-white text-white dark:text-surface-900 px-5 py-2 rounded-full font-bold text-sm hover:bg-surface-800 dark:hover:bg-surface-100 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <User className="w-4 h-4" />
                  <span>{t('signin')}</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-3">
               <button 
                onClick={toggleVoice} 
                className={`p-2 rounded-full ${voiceEnabled ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'}`}
               >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
               </button>

               <button 
                  onClick={() => {
                    const nextLangIndex = (languages.findIndex(l => l.code === language) + 1) % languages.length;
                    setLanguage(languages[nextLangIndex].code);
                  }}
                  className="p-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-bold text-xs uppercase"
                >
                   {language}
                </button>
               <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-secondary-400"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
               {!user && (
                 <button onClick={handleLoginClick} className="p-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                   <User className="w-5 h-5" />
                 </button>
               )}
               {user && (
                 <img src={user.picture} alt="User" className="w-8 h-8 rounded-full border border-primary-200" />
               )}
               <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-surface-600 dark:text-surface-300 p-2">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-surface-900 border-t border-surface-100 dark:border-surface-800 shadow-lg absolute w-full">
            <div className="px-4 pt-4 pb-6 space-y-3">
              {user && (
                <div className="flex items-center gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
                   <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
                   <div>
                     <div className="font-bold text-surface-800 dark:text-surface-200">{user.name}</div>
                     <div className="text-xs text-surface-500 dark:text-surface-400">{user.email || user.phoneNumber}</div>
                   </div>
                </div>
              )}

              {navItems.map((item) => (
                 <button 
                   key={item} 
                   onClick={() => scrollTo(item.toLowerCase())} 
                   className="block w-full text-left px-4 py-3 text-surface-600 dark:text-surface-300 font-medium hover:bg-primary-50 dark:hover:bg-surface-800 rounded-xl transition-colors"
                 >
                   {getNavLabel(item)}
                 </button>
              ))}
              
              {user ? (
                 <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center gap-2">
                   <LogOut className="w-4 h-4" /> {t('signout')}
                 </button>
              ) : (
                <button onClick={handleLoginClick} className="w-full bg-primary-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary-200 dark:shadow-none">
                  <User className="w-4 h-4" /> {t('signin')}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Vivid Gradients */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[500px] h-[500px] bg-secondary-300 dark:bg-secondary-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[500px] h-[500px] bg-primary-300 dark:bg-primary-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-20 animate-pulse-slow"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <span className="animate-on-scroll animate-fade-down inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-primary-50/80 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-8 border border-primary-100 dark:border-primary-800 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            {t('hero_tag')}
          </span>
          
          <h1 className="animate-on-scroll animate-fade-up text-5xl md:text-7xl font-extrabold text-surface-900 dark:text-white mb-6 leading-[1.1] tracking-tight">
            {t('hero_title_1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 dark:from-primary-400 dark:via-primary-300 dark:to-secondary-400">
              {t('hero_title_2')}
            </span>
          </h1>
          
          <p className="animate-on-scroll animate-fade-up delay-100 text-lg md:text-xl text-surface-600 dark:text-surface-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero_desc')}
          </p>
          
          <div className="animate-on-scroll animate-zoom-in delay-200 flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => scrollTo('demo')} className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-500 transition-all shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-1 flex items-center justify-center gap-2">
              {user ? t('btn_dashboard') : t('btn_demo')} <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('features')} className="bg-white/80 dark:bg-surface-800/50 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-all hover:-translate-y-1 backdrop-blur-sm">
              {t('btn_features')}
            </button>
          </div>

          {/* Quick Stats Mockup */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { label: t('stat_farmers'), val: "1,204", icon: Users },
              { label: t('stat_activities'), val: "85k+", icon: Activity },
              { label: t('stat_rewards'), val: "₹2.4M", icon: ShieldCheck },
              { label: t('stat_villages'), val: "42", icon: MapPin }
            ].map((stat, i) => (
              <div key={i} className={`animate-on-scroll animate-fade-up delay-${(i+1)*100} bg-white/60 dark:bg-surface-900/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-surface-100 dark:border-surface-800 hover:border-primary-200 dark:hover:border-primary-800 transition-all group`}>
                <stat.icon className="w-5 h-5 text-primary-500 mb-2 mx-auto opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                <p className="text-3xl font-bold text-surface-800 dark:text-surface-100">{stat.val}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 font-semibold uppercase tracking-wide mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PROBLEM SECTION --- */}
      <section id="problem" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="animate-on-scroll animate-fade-up text-3xl font-bold text-surface-900 dark:text-white">{t('prob_title')}</h2>
            <p className="animate-on-scroll animate-fade-up delay-100 mt-4 text-surface-600 dark:text-surface-300 max-w-2xl mx-auto text-lg">
              {t('prob_desc')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t('prob_1_title'), desc: t('prob_1_desc'), icon: ShieldCheck, color: "red" },
              { title: t('prob_2_title'), desc: t('prob_2_desc'), icon: Activity, color: "orange" },
              { title: t('prob_3_title'), desc: t('prob_3_desc'), icon: TrendingUp, color: "blue" },
            ].map((item, i) => (
              <Card key={i} className={`animate-on-scroll animate-fade-up delay-${(i+1)*100} p-8 text-center hover:scale-105 transition-all duration-300 border-t-4 border-t-surface-200 dark:border-t-surface-700 hover:border-t-primary-500`}>
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-surface-50 dark:bg-surface-800`}>
                  <item.icon className={`w-8 h-8 text-surface-400 dark:text-surface-500`} />
                </div>
                <h3 className="text-xl font-bold text-surface-800 dark:text-surface-100 mb-3">{item.title}</h3>
                <p className="text-surface-500 dark:text-surface-400 leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --- DEMO SECTION (Main Feature) --- */}
      <section id="demo" className="py-24 bg-gradient-to-b from-primary-900/90 to-primary-950/95 backdrop-blur-md relative overflow-hidden">
        {/* Abstract BG patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <svg width="100%" height="100%">
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
           </svg>
        </div>
        
        {/* Glow effects */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <DemoInteractive user={user} />
        </div>
      </section>
      
      {/* --- SOCIAL FEED SECTION (New) --- */}
      <section id="feed" className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm transition-colors duration-300 border-b border-surface-100 dark:border-surface-800">
        <SocialFeed user={user} />
      </section>

       {/* --- CROP HEALTH SECTION --- */}
       <section id="crophealth" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300 border-b border-surface-100 dark:border-surface-800">
        <CropHealthMonitor user={user} />
      </section>

      {/* --- MARKET SECTION --- */}
      <section id="market" className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm transition-colors duration-300">
        <MarketTrends user={user} />
      </section>

       {/* --- SOIL HEALTH SECTION --- */}
      <section id="soil" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300 border-t border-surface-100 dark:border-surface-800">
        <SoilHealth user={user} />
      </section>

      {/* --- IRRIGATION SECTION --- */}
      <section id="irrigation" className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm transition-colors duration-300 border-t border-surface-100 dark:border-surface-800">
        <IrrigationPlanner user={user} />
      </section>

      {/* --- SCHEMES SECTION --- */}
      <section id="schemes" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300 border-t border-surface-100 dark:border-surface-800">
        <SchemeMatching user={user} />
      </section>

      {/* --- ECONOMICS SECTION --- */}
      <section id="economics" className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm transition-colors duration-300 border-t border-surface-100 dark:border-surface-800">
        <CostTracking user={user} />
      </section>

       {/* --- BUYER MATCHMAKING SECTION --- */}
      <section id="buyers" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300">
        <BuyerMatchmaking user={user} />
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="animate-on-scroll animate-fade-up text-3xl font-bold text-surface-900 dark:text-white">{t('feat_title')}</h2>
            <p className="animate-on-scroll animate-fade-up delay-100 text-surface-600 dark:text-surface-400 mt-2">{t('feat_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {icon: Smartphone, title: t('feat_1_title'), desc: t('feat_1_desc')},
              {icon: Activity, title: t('feat_2_title'), desc: t('feat_2_desc')},
              {icon: CloudRain, title: t('feat_3_title'), desc: t('feat_3_desc')},
              {icon: TrendingUp, title: t('feat_4_title'), desc: t('feat_4_desc')},
              {icon: Sprout, title: t('feat_5_title'), desc: t('feat_5_desc')},
              {icon: Users, title: t('feat_6_title'), desc: t('feat_6_desc')}
            ].map((feat, i) => (
              <FeatureCard key={i} className={`animate-on-scroll animate-zoom-in delay-${(i % 3)*100}`} icon={feat.icon} title={feat.title} description={feat.desc} />
            ))}
          </div>

          {/* Additional Feature Widgets Mockup */}
          <div className="mt-20 grid md:grid-cols-2 gap-8 items-start">
            {/* Weather Widget (INTEGRATED) */}
            <WeatherWidget className="animate-on-scroll animate-fade-right" />
            
            {/* Market Prompt Widget */}
             <Card className="animate-on-scroll animate-fade-left delay-200 p-8 flex flex-col justify-center items-center text-center border-dashed border-2 border-surface-200 dark:border-surface-700 bg-transparent shadow-none h-full min-h-[300px]">
                 <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-primary-500" />
                 </div>
                 <h3 className="font-bold text-xl text-surface-800 dark:text-white">Advanced Market Analytics</h3>
                 <p className="text-sm text-surface-500 dark:text-surface-400 mt-2 max-w-xs">
                    Detailed price trends, AI predictions and smart alerts are just a click away.
                 </p>
                 <button onClick={() => scrollTo('market')} className="mt-6 text-primary-600 font-bold hover:text-primary-700 flex items-center gap-2 group">
                    View Market Section <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                 </button>
             </Card>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="animate-on-scroll animate-fade-up text-3xl font-bold text-center text-surface-900 dark:text-white mb-16">{t('how_title')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary-200 dark:via-primary-800 to-transparent -z-10 transform translate-y-1/2 scale-x-90"></div>
            
            <Step className="animate-on-scroll animate-fade-right delay-0" number="1" title={t('step_1_title')} text={t('step_1_desc')} />
            <Step className="animate-on-scroll animate-fade-right delay-100" number="2" title={t('step_2_title')} text={t('step_2_desc')} />
            <Step className="animate-on-scroll animate-fade-right delay-200" number="3" title={t('step_3_title')} text={t('step_3_desc')} />
            <Step className="animate-on-scroll animate-fade-right delay-300" number="4" title={t('step_4_title')} text={t('step_4_desc')} />
          </div>
        </div>
      </section>

      {/* --- ARCHITECTURE --- */}
      <section className="py-24 bg-surface-50/60 dark:bg-surface-950/60 backdrop-blur-sm overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4">
           <div className="text-center mb-16">
            <h2 className="animate-on-scroll animate-fade-up text-3xl font-bold text-surface-900 dark:text-white">{t('arch_title')}</h2>
            <p className="animate-on-scroll animate-fade-up delay-100 text-surface-600 dark:text-surface-400 mt-2">{t('arch_desc')}</p>
          </div>
          <Architecture />
        </div>
      </section>

      {/* --- TEAM SECTION --- */}
      <section id="team" className="py-24 bg-white/60 dark:bg-surface-900/60 backdrop-blur-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
           <h2 className="animate-on-scroll animate-fade-up text-3xl font-bold text-surface-900 dark:text-white mb-4">{t('team_title')}</h2>
           <p className="animate-on-scroll animate-fade-up delay-100 text-surface-600 dark:text-surface-400 mb-12 max-w-2xl mx-auto">{t('team_desc')}</p>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <TeamMemberCard className="animate-on-scroll animate-zoom-in delay-0" name="Srujan" role="Lead Dev" />
              <TeamMemberCard className="animate-on-scroll animate-zoom-in delay-100" name="Samarth" role="AI Specialist" />
              <TeamMemberCard className="animate-on-scroll animate-zoom-in delay-200" name="Sudheer" role="Backend" />
              <TeamMemberCard className="animate-on-scroll animate-zoom-in delay-300" name="Prajwal" role="Frontend" />
           </div>

           <div className="animate-on-scroll animate-fade-up delay-400 mt-16 inline-flex items-center gap-2 text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-6 py-3 rounded-full border border-primary-100 dark:border-primary-800">
             <Phone className="w-5 h-5" />
             <span className="font-bold">Contact: 9663341218</span>
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-surface-950/95 backdrop-blur-md text-white py-16 border-t border-surface-900 relative z-10">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
          <div className="animate-on-scroll animate-fade-up">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary-500 p-1.5 rounded-lg">
                <AgriWaveLogo className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">AgriWave</span>
            </div>
            <p className="text-surface-400 text-sm leading-relaxed max-w-xs">
              Empowering farmers by turning daily actions into digital assets through advanced AI and satellite technology.
            </p>
          </div>
          <div className="animate-on-scroll animate-fade-up delay-100">
            <h4 className="font-bold mb-6 text-primary-400">Quick Links</h4>
            <ul className="space-y-3 text-sm text-surface-300">
              <li><button onClick={() => scrollTo('home')} className="hover:text-white hover:translate-x-1 transition-all">Home</button></li>
              <li><button onClick={() => scrollTo('features')} className="hover:text-white hover:translate-x-1 transition-all">{t('nav_features')}</button></li>
              <li><button onClick={() => scrollTo('demo')} className="hover:text-white hover:translate-x-1 transition-all">{t('nav_demo')}</button></li>
              <li><button onClick={() => scrollTo('market')} className="hover:text-white hover:translate-x-1 transition-all">{t('nav_market')}</button></li>
            </ul>
          </div>
          <div className="animate-on-scroll animate-fade-up delay-200">
            <h4 className="font-bold mb-6 text-primary-400">Contact Us</h4>
            <p className="text-sm text-surface-300 mb-2">AgriWave HQ</p>
            <p className="text-sm text-surface-300 mb-4">Bangalore, Karnataka, India</p>
            <div className="flex items-center gap-2 text-white bg-white/10 p-3 rounded-lg w-fit">
               <Phone className="w-4 h-4 text-primary-400" />
               <span className="font-mono text-sm">9663341218</span>
            </div>
          </div>
        </div>
        <div className="text-center text-surface-500 text-xs mt-16 pt-8 border-t border-surface-900">
          © {new Date().getFullYear()} AgriWave. {t('footer_rights')}
        </div>
      </footer>
    </div>
  );
};

export default App;
