import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity, ArrowRight, BadgeCheck, BarChart3,
  CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Coins, CookingPot, Flame, Heart, Leaf, ListChecks, LoaderCircle,
  Menu, Moon, MoreHorizontal, PackageOpen, Plus, Search, Settings2, ShoppingBag,
  ShoppingCart, Sparkles, Sun, Target, Trash2, Utensils, WandSparkles, X, Send,
} from 'lucide-react';
import {
  getGetDashboardQueryKey, getGetMealPlanQueryKey, getGetNutritionQueryKey,
  getGetPreferencesQueryKey, getGetRecipeQueryKey, getGetShoppingListQueryKey,
  getListFavoritesQueryKey, getListMealPlansQueryKey, getListPantryQueryKey,
  getListRecipesQueryKey, getSearchAppQueryKey, useAddFavorite, useAddPantryItem,
  useAddShoppingItem, useDeletePantryItem, useDeleteShoppingItem, useGenerateMealPlan,
  useGetDashboard, useGetMealPlan, useGetNutrition, useGetPreferences, useGetRecipe,
  useGetShoppingList, useHealthCheck, useListFavorites, useListMealPlans, useListPantry,
  useListRecipes, useRemoveFavorite, useReplacePlanMeal, useSavePreferences,
  useSearchApp, useUpdatePantryItem, useUpdateShoppingItem,
} from '@workspace/api-client-react';
import type { PantryItemInput, PreferencesInput, Recipe, ShoppingItemInput, ShoppingList } from '@workspace/api-client-react';
import type { ReactNode } from 'react';

const queryClient = new QueryClient();
const navItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/planner', label: 'Meal planner', icon: CalendarDays },
  { href: '/recipes', label: 'Recipes', icon: CookingPot },
  { href: '/pantry', label: 'My pantry', icon: PackageOpen },
  { href: '/shopping-list', label: 'Shopping list', icon: ShoppingCart },
  { href: '/nutrition', label: 'Nutrition', icon: Activity },
  { href: '/favorites', label: 'Saved recipes', icon: Heart },
  { href: '/history', label: 'Plan history', icon: Clock3 },
];

const money = (value?: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value ?? 0);
const prettyDate = (date?: string) => date ? new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today';
const cap = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('nutriplan-theme');
    const next = saved === 'dark';
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('nutriplan-theme', next ? 'dark' : 'light');
  };
  return <button type="button" className="icon-button" onClick={toggle} aria-label="Toggle color theme" data-testid="button-theme">
    {dark ? <Sun size={17} /> : <Moon size={17} />}
  </button>;
}

function Sidebar({ location }: { location: string }) {
  return <aside className="sidebar">
    <Link href="/" className="brand-lockup" data-testid="link-home">
      <span className="brand-mark"><Leaf size={20} /></span>
      <span><strong>NutriPlan AI</strong><small>Plan smarter. Eat better. Spend less.</small></span>
    </Link>
    <p className="nav-caption">YOUR KITCHEN</p>
    <nav className="nav-stack" aria-label="Main navigation">
      {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${location === href || (href === '/recipes' && location.startsWith('/recipes/')) ? 'active' : ''}`} data-testid={`link-${href.slice(1)}`}>
        <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
      </Link>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-tip"><span className="tip-orb"><Sparkles size={15} /></span><div><strong>A little less waste</strong><p>Use what you have first. Your pantry is part of every plan.</p></div></div>
      <Link href="/settings" className={`nav-link ${location === '/settings' ? 'active' : ''}`} data-testid="link-settings"><Settings2 size={17} /><span>Preferences</span></Link>
      <div className="profile-chip"><div className="profile-avatar">M</div><div><strong>My kitchen</strong><small>Personal plan</small></div><MoreHorizontal size={17} className="ml-auto opacity-60" /></div>
    </div>
  </aside>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  return <div className="app-shell">
    <Sidebar location={location} />
    <div className="mobile-topbar">
      <Link href="/" className="brand-lockup compact"><span className="brand-mark"><Leaf size={18} /></span><strong>NutriPlan AI</strong></Link>
      <div className="flex items-center gap-2"><ThemeToggle /><button type="button" className="icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open navigation" data-testid="button-menu">{mobileMenu ? <X size={18} /> : <Menu size={18} />}</button></div>
    </div>
    {mobileMenu && <div className="mobile-menu"><nav>{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileMenu(false)} className="nav-link" data-testid={`mobile-link-${href.slice(1)}`}><Icon size={17} />{label}</Link>)}<Link href="/settings" onClick={() => setMobileMenu(false)} className="nav-link"><Settings2 size={17} />Preferences</Link></nav></div>}
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>MY KITCHEN</span><ChevronRight size={13} /><strong>{navItems.find(n => n.href === location)?.label ?? (location === '/' ? 'Welcome' : cap(location.split('/')[1]))}</strong></div>
        <div className="topbar-tools"><GlobalSearch /><ThemeToggle /><Link href="/settings" className="top-avatar" aria-label="Preferences" data-testid="link-account">M</Link></div>
      </header>
      {children}
      <NutriAssistant />
    </main>
    <nav className="mobile-nav" aria-label="Quick navigation">
      {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href ? 'selected' : ''} data-testid={`mobile-tab-${href.slice(1)}`}><Icon size={18} /><span>{label === 'Meal planner' ? 'Plan' : label === 'Overview' ? 'Home' : label === 'My pantry' ? 'Pantry' : label === 'Shopping list' ? 'List' : 'Recipes'}</span></Link>)}
    </nav>
  </div>;
}

function GlobalSearch() {
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ q: search.trim() }), [search]);
  const query = useSearchApp(params, { query: { enabled: search.trim().length > 1, queryKey: getSearchAppQueryKey(params) } });
  const [open, setOpen] = useState(false);
  return <div className="global-search-wrap">
    <Search size={16} className="search-glyph" />
    <input aria-label="Search recipes and pages" data-testid="input-global-search" placeholder="Search anything..." value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }} />
    {search && <button className="search-clear" type="button" onClick={() => { setSearch(''); setOpen(false); }} aria-label="Clear search"><X size={14} /></button>}
      {open && search.trim().length > 1 && <div className="search-popover">
      {query.isLoading ? <div className="search-state">Searching…</div> : query.isError ? <div className="search-state">Search is unavailable right now.</div> : (query.data ?? []).length ? (query.data ?? []).map(result => <Link key={`${result.type}-${result.id}`} href={result.type === 'recipe' ? `/recipes/${result.id}` : result.type === 'pantry' ? '/pantry' : result.type === 'plan' ? '/history' : result.type === 'page' ? result.id : '/dashboard'} onClick={() => { setOpen(false); setSearch(''); }} className="search-result"><span className="result-type">{result.type}</span><span><strong>{result.title}</strong><small>{result.description}</small></span><ArrowRight size={15} /></Link>) : <div className="search-state">No matches found.</div>}
    </div>}
  </div>;
}

type AssistantMessage = { role: 'assistant' | 'user'; text: string };
function NutriAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Hi! I can update your plan, adjust preferences, or find a lower-cost dinner. What would help today?' },
  ]);
  const prefs = useGetPreferences();
  const plans = useListMealPlans();
  const generate = useGenerateMealPlan();
  const save = useSavePreferences();
  const replace = useReplacePlanMeal();
  const qc = useQueryClient();
  const busy = generate.isPending || save.isPending || replace.isPending;
  const say = (text: string) => setMessages(previous => [...previous, { role: 'assistant', text }]);
  const refreshPlanViews = (planId?: string) => {
    qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    qc.invalidateQueries({ queryKey: getGetNutritionQueryKey() });
    if (planId) qc.invalidateQueries({ queryKey: getGetMealPlanQueryKey(planId) });
  };
  const regenerate = (optimizeBudget: boolean, response: string) => {
    generate.mutate({ data: { duration: plans.data?.[0]?.duration ?? 7, optimizeBudget } }, {
      onSuccess: plan => {
        refreshPlanViews(plan.id);
        say(`${response} Your updated plan is ready.`);
      },
      onError: () => say('I couldn’t build that plan with the current constraints. Try relaxing a preference or budget limit.'),
    });
  };
  const updatePreference = (changes: Partial<PreferencesInput>, response: string) => {
    if (!prefs.data) {
      say('Your preferences are still loading. Try again in a moment.');
      return;
    }
    save.mutate({ data: { ...(prefs.data as PreferencesInput), ...changes } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
        regenerate(true, response);
      },
      onError: () => say('I couldn’t save that preference. Your existing plan is unchanged.'),
    });
  };
  const handlePrompt = (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || busy) return;
    setMessages(previous => [...previous, { role: 'user', text: prompt }]);
    setInput('');
    const text = prompt.toLowerCase();
    const activePlan = plans.data?.[0];

    if (text.includes('tomato')) {
      const current = prefs.data?.excludedIngredients ?? [];
      const excludedIngredients = current.some(item => item.toLowerCase() === 'tomato')
        ? current
        : [...current, 'tomato'];
      updatePreference({ excludedIngredients }, 'I added tomato to your ingredients to avoid.');
      return;
    }
    if (text.includes('protein')) {
      const protein = (prefs.data?.protein ?? 100) + 20;
      updatePreference({ protein, autoNutrition: false }, `I raised your daily protein target to ${protein} g.`);
      return;
    }
    if (text.includes('south indian')) {
      updatePreference({ cuisine: 'South Indian' }, 'I set South Indian as your preferred cuisine.');
      return;
    }
    if (text.includes('replace') && text.includes('dinner')) {
      const dinner = activePlan?.days.flatMap(day => day.meals).find(meal => meal.mealType.toLowerCase() === 'dinner');
      if (!activePlan || !dinner) {
        say('There isn’t a planned dinner to replace yet. Generate a meal plan first.');
        return;
      }
      replace.mutate({ planId: activePlan.id, data: { mealId: dinner.id } }, {
        onSuccess: () => {
          refreshPlanViews(activePlan.id);
          say('I replaced the first dinner in your current plan with the lowest-cost safe alternative.');
        },
        onError: () => say('I couldn’t replace that dinner without breaking your current diet or budget rules.'),
      });
      return;
    }
    if (text.includes('pantry') || text.includes('what i have') || text.includes('ingredients at home')) {
      regenerate(false, 'I made a fresh plan with your pantry items in mind.');
      return;
    }
    if (text.includes('cheaper') || text.includes('budget') || text.includes('under ₹') || text.includes('under rs')) {
      regenerate(true, 'I prioritized lower-cost recipes while keeping your dietary filters.');
      return;
    }
    say('Try “make this plan cheaper,” “increase protein,” “I don’t have tomatoes,” “use my pantry,” “set South Indian cuisine,” or “replace dinner.”');
  };
  return <div className="assistant-dock">
    {open && <section className="assistant-panel surface" aria-label="NutriPlan assistant" data-testid="panel-assistant">
      <header className="assistant-header"><span className="assistant-mark"><Sparkles size={17} /></span><div><strong>NutriPlan Assistant</strong><small>Plan changes save to your kitchen</small></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close assistant" data-testid="button-close-assistant"><X size={16} /></button></header>
      <div className="assistant-messages" aria-live="polite">{messages.map((message, index) => <p key={`${message.role}-${index}`} className={`assistant-message ${message.role}`} data-testid={`assistant-message-${index}`}>{message.text}</p>)}{busy && <p className="assistant-message assistant" role="status">Updating your kitchen…</p>}</div>
      <div className="assistant-suggestions">{['Make this plan cheaper', 'Increase protein', 'Use my pantry'].map(prompt => <button key={prompt} type="button" disabled={busy} onClick={() => handlePrompt(prompt)} data-testid={`assistant-suggestion-${prompt.toLowerCase().replaceAll(' ', '-')}`}>{prompt}</button>)}</div>
      <form className="assistant-compose" onSubmit={event => { event.preventDefault(); handlePrompt(input); }}>
        <Input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask for a plan change…" aria-label="Message NutriPlan Assistant" data-testid="input-assistant-prompt" />
        <Button type="submit" disabled={busy || !input.trim()} aria-label="Send message" data-testid="button-send-assistant"><Send size={16} /></Button>
      </form>
    </section>}
    <Button className="assistant-launcher" onClick={() => setOpen(value => !value)} aria-expanded={open} data-testid="button-open-assistant"><Sparkles size={17} /> Ask NutriPlan</Button>
  </div>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="display-title page-heading">{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-title-action">{action}</div>}</div>;
}
function LoadingState({ label = 'Loading your kitchen…' }: { label?: string }) {
  return <div className="loading-state" role="status"><div className="skeleton h-5 w-40" /><div className="skeleton h-28 w-full" /><div className="skeleton h-28 w-full" /><span>{label}</span></div>;
}
function ErrorState({ retry, message = 'We couldn’t load this just now.' }: { retry?: () => void; message?: string }) {
  return <div className="empty-state error-state"><div className="empty-icon"><CircleHelp size={22} /></div><h3>A small kitchen hiccup</h3><p>{message}</p>{retry && <Button variant="outline" onClick={retry} data-testid="button-retry">Try again</Button>}</div>;
}
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Leaf size={22} /></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function StatCard({ label, value, detail, icon: Icon, accent = 'green' }: { label: string; value: string; detail: string; icon: typeof Activity; accent?: string }) {
  return <div className="stat-card surface fade-up"><div className={`stat-icon ${accent}`}><Icon size={18} /></div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function RecipeCard({ recipe, favorite = false, onFavorite }: { recipe: Recipe; favorite?: boolean; onFavorite?: () => void }) {
  return <article className="recipe-card surface fade-up">
    <Link href={`/recipes/${recipe.id}`} className="recipe-visual" data-testid={`link-recipe-${recipe.id}`}>
      {recipe.image ? <img src={recipe.image} alt="" loading="lazy" /> : <div className="recipe-placeholder"><Leaf size={30} /><span>{recipe.cuisine || 'From your kitchen'}</span></div>}
      <span className="recipe-time"><Clock3 size={13} />{recipe.cookingTime} min</span>
    </Link>
    {onFavorite && <button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} type="button" onClick={onFavorite} aria-label={favorite ? 'Remove from saved recipes' : 'Save recipe'} data-testid={`button-favorite-${recipe.id}`}><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /></button>}
    <div className="recipe-info"><p className="recipe-meta">{recipe.cuisine} <span>·</span> {recipe.diet?.[0] || 'Balanced'}</p>
      <Link href={`/recipes/${recipe.id}`} className="recipe-name">{recipe.name}</Link><p className="recipe-description">{recipe.description}</p>
      <div className="recipe-foot"><span><Flame size={14} />{recipe.nutrition?.calories ?? 0} kcal</span><span><Coins size={14} />{money(recipe.cost)}</span></div>
    </div>
  </article>;
}

function LandingPage() {
  const health = useHealthCheck();
  return <div className="page-wrap landing-page">
    <section className="landing-hero">
      <div className="hero-copy"><span className="hero-kicker"><span className="status-dot" />YOUR KITCHEN, BETTER PLANNED</span>
        <h1 className="display-title">Good food starts<br />with <em>what you have.</em></h1>
        <p className="hero-tagline">Plan smarter. Eat better. Spend less.</p>
        <p>NutriPlan turns the ingredients in your kitchen and the goals that matter to you into a week of meals that make sense.</p>
        <div className="hero-actions"><Link href="/onboarding" className="button-link primary-action" data-testid="link-get-started">Build my meal plan <ArrowRight size={17} /></Link><Link href="/dashboard" className="text-link" data-testid="link-view-dashboard">Go to my kitchen <ChevronRight size={16} /></Link></div>
        <div className="hero-proof"><div className="proof-icon"><BadgeCheck size={16} /></div><span><strong>Made for real life</strong><small>Allergies, budgets, busy nights included.</small></span></div>
      </div>
      <div className="hero-art" aria-label="Meal planning preview">
        <div className="art-leaf leaf-one"><Leaf size={78} /></div><div className="art-leaf leaf-two"><Leaf size={53} /></div>
        <div className="hero-plate"><div className="plate-rim"><div className="food-center"><span className="food-orzo"></span><span className="food-tomato"></span><span className="food-greens"></span><span className="food-herb"></span></div></div></div>
        <div className="float-card float-card-top"><span className="float-check"><Check size={14} /></span><span><strong>Fits your budget</strong><small>Meals under $4.20 / serving</small></span></div>
        <div className="float-card float-card-bottom"><span className="float-leaf"><Leaf size={16} /></span><span><strong>Uses your pantry</strong><small>{health.isSuccess ? 'Kitchen is ready to plan' : 'Built around what you own'}</small></span></div>
        <div className="hero-stamp"><Sparkles size={15} /><span>Thoughtful<br />by design</span></div>
      </div>
    </section>
    <section className="landing-strip"><div><strong>Nutrition that fits</strong><span>Goals shaped around you</span></div><div><strong>Spend with a plan</strong><span>Budgets that stay realistic</span></div><div><strong>Waste a little less</strong><span>Ingredients already at home</span></div><div><strong>Cook on your terms</strong><span>Recipes for your schedule</span></div></section>
    <section className="landing-how"><div className="section-intro"><p className="eyebrow">A BETTER KIND OF MEAL PLAN</p><h2 className="display-title">Your life is the recipe.</h2><p>Skip the generic menus. Start with the details that make your kitchen yours.</p></div>
      <div className="how-grid"><div className="how-card"><span>01</span><div className="how-icon"><Target size={20} /></div><h3>Set the things that matter</h3><p>Nutrition goals, allergies, cook time, servings and the number you want to spend.</p></div><div className="how-card"><span>02</span><div className="how-icon amber"><PackageOpen size={20} /></div><h3>Tell us what’s on hand</h3><p>Keep a simple pantry list so your plan can put those ingredients to good use.</p></div><div className="how-card"><span>03</span><div className="how-icon blue"><WandSparkles size={20} /></div><h3>Make a week that works</h3><p>Get practical meal ideas and a shopping list that fills only the gaps.</p></div></div>
    </section>
    <section className="landing-cta"><div><p className="eyebrow">START WITH YOUR KITCHEN</p><h2 className="display-title">A good week is<br />closer than you think.</h2></div><Link href="/onboarding" className="button-link cta-button" data-testid="link-start-planning">Set up your preferences <ArrowRight size={17} /></Link><div className="cta-ornament"><Leaf size={115} /></div></section>
    <footer className="landing-footer"><Link href="/" className="brand-lockup compact"><span className="brand-mark"><Leaf size={17} /></span><strong>NutriPlan AI</strong></Link><span>Thoughtful meals. A lighter grocery run.</span><Link href="/settings" className="footer-link">Your preferences</Link></footer>
  </div>;
}

function DashboardPage() {
  const query = useGetDashboard();
  const dashboard = query.data;
  const [, setLocation] = useLocation();
  return <div className="page-wrap">
    {query.isLoading ? <LoadingState label="Setting the table…" /> : query.isError || !dashboard ? <ErrorState retry={() => query.refetch()} message="Your kitchen overview is taking a moment to arrive." /> : <>
      <PageTitle eyebrow="TUESDAY, A FRESH START" title="Your kitchen, at a glance." description="A little structure for a good week of eating." action={<Button onClick={() => setLocation('/planner')} data-testid="button-plan-week"><Sparkles size={16} /> Plan my week</Button>} />
      <div className="stats-grid">
        <StatCard label="Planned calories today" value={`${dashboard.weeklyNutrition?.consumed?.calories ?? 0}`} detail={`of ${dashboard.preferences?.calories ?? 0} kcal target`} icon={Flame} accent="blue" />
        <StatCard label="Planned protein today" value={`${dashboard.weeklyNutrition?.consumed?.protein ?? 0} g`} detail={`of ${dashboard.preferences?.protein ?? 0} g target`} icon={Activity} accent="sage" />
        <StatCard label="Weekly budget" value={money(dashboard.currentPlan?.budget, dashboard.preferences?.currency)} detail={`${money(dashboard.currentPlan?.estimatedCost, dashboard.preferences?.currency)} estimated spend`} icon={Coins} />
        <StatCard label="Budget remaining" value={money((dashboard.currentPlan?.budget ?? 0) - (dashboard.currentPlan?.estimatedCost ?? 0), dashboard.preferences?.currency)} detail="After this meal plan" icon={ShoppingBag} accent="peach" />
      </div>
      <div className="dashboard-columns">
        <section className="surface dashboard-plan">
          <div className="section-head"><div><p className="eyebrow">THIS WEEK</p><h2 className="section-title">Your meal plan</h2></div><Link href="/planner" className="inline-link">Open planner <ArrowRight size={15} /></Link></div>
          {dashboard.currentPlan?.days?.length ? <div className="day-list">{dashboard.currentPlan.days.slice(0, 4).map((day, idx) => <div className="day-row" key={day.date || idx}><span className="day-date">{prettyDate(day.date)}</span><div className="day-meals">{day.meals?.slice(0, 2).map(meal => <Link key={meal.id} href={`/recipes/${meal.recipe.id}`} className="meal-row"><span className="meal-type">{meal.mealType}</span><strong>{meal.recipe.name}</strong><span className="meal-price">{money(meal.recipe.cost)}</span></Link>)}{!day.meals?.length && <span className="quiet">No meals planned yet</span>}</div></div>)}</div> : <EmptyState title="Your week is wide open" text="Create a meal plan around your goals, pantry and budget." action={<Button onClick={() => setLocation('/planner')}>Build a plan</Button>} />}
        </section>
        <div className="dashboard-aside">
          <section className="surface today-card"><div className="section-head"><div><p className="eyebrow">ON THE MENU</p><h2 className="section-title">Today</h2></div><span className="today-pill">{dashboard.todayMeals?.length ?? 0} meals</span></div>
            {dashboard.todayMeals?.length ? dashboard.todayMeals.map(meal => <Link key={meal.id} href={`/recipes/${meal.recipe.id}`} className="today-meal"><span className="meal-dot"><Utensils size={15} /></span><span><small>{meal.mealType}</small><strong>{meal.recipe.name}</strong></span><ChevronRight size={16} /></Link>) : <p className="quiet">Nothing planned for today. Give your week a head start.</p>}
          </section>
          <section className="expiry-card"><div className="expiry-head"><span><Clock3 size={16} /></span><div><p className="eyebrow">USE IT SOON</p><h3>Freshness check</h3></div></div>
            {dashboard.expiringItems?.length ? dashboard.expiringItems.slice(0, 4).map(item => <div key={item.id} className="expiry-row"><span>{item.name}</span><small>{item.expiryDate ? `Best by ${prettyDate(item.expiryDate)}` : 'Use soon'}</small></div>) : <p className="quiet">Your pantry looks fresh. Nice work.</p>}
            <Link href="/pantry" className="expiry-link">View pantry <ArrowRight size={14} /></Link>
          </section>
        </div>
      </div>
      <section className="nutrition-teaser surface"><div className="nutrition-teaser-copy"><p className="eyebrow">A QUICK CHECK-IN</p><h2 className="section-title">A little progress adds up.</h2><p>Keep an eye on the nutrients that support your goals, without overthinking every bite.</p><Link href="/nutrition" className="inline-link">View nutrition trends <ArrowRight size={15} /></Link></div><div className="mini-bars">{dashboard.weeklyNutrition?.weekly?.slice(-7).map((day, i) => <div key={`${day.day}-${i}`}><span style={{ height: `${Math.min(100, Math.max(9, (day.nutrition?.calories ?? 0) / Math.max(1, dashboard.weeklyNutrition.target?.calories ?? 1800) * 80))}%` }} /><small>{day.day.slice(0, 2)}</small></div>)}</div><div className="mini-target"><span>Today’s target</span><strong>{dashboard.weeklyNutrition?.target?.calories ?? dashboard.preferences.calories}</strong><small>calories</small></div></section>
    </>}</div>;
}

const defaultPrefs: PreferencesInput = { goal: 'Build Muscle', diet: 'Vegetarian', budget: 1500, budgetPeriod: 'weekly', currency: 'INR', calories: 2200, protein: 120, carbs: 250, fat: 70, fiber: 30, allergies: [], excludedIngredients: [], cuisine: 'South Indian', cookingTime: 30, mealsPerDay: 3, servings: 1, autoNutrition: true };
function PreferencesPage({ onboarding = false }: { onboarding?: boolean }) {
  const query = useGetPreferences();
  const save = useSavePreferences();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const steps = ['Goal', 'Diet', 'Allergies', 'Budget', 'Cuisine', 'Schedule', 'Servings'];
  const form = useForm<PreferencesInput>({ defaultValues: defaultPrefs });
  useEffect(() => { if (query.data) form.reset(query.data as PreferencesInput); }, [query.data, form]);
  const submit = (values: PreferencesInput) => {
    const payload: PreferencesInput = { ...values, budget: Number(values.budget), calories: Number(values.calories), protein: Number(values.protein), carbs: Number(values.carbs), fat: Number(values.fat), fiber: Number(values.fiber), cookingTime: Number(values.cookingTime), mealsPerDay: Number(values.mealsPerDay), servings: Number(values.servings), allergies: Array.isArray(values.allergies) ? values.allergies : String(values.allergies ?? '').split(',').map(x => x.trim()).filter(Boolean), excludedIngredients: Array.isArray(values.excludedIngredients) ? values.excludedIngredients : String(values.excludedIngredients ?? '').split(',').map(x => x.trim()).filter(Boolean) };
    save.mutate({ data: payload }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); if (onboarding) setLocation('/dashboard'); } });
  };
  const commaList = (field: 'allergies' | 'excludedIngredients', placeholder: string, testId: string) => {
    const registered = form.register(field, { setValueAs: value => Array.isArray(value) ? value : String(value ?? '').split(',').map(item => item.trim()).filter(Boolean) });
    return <Input {...registered} placeholder={placeholder} data-testid={testId} />;
  };
  return <div className="page-wrap">
    {query.isLoading ? <LoadingState label="Loading your preferences…" /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : <>
      <PageTitle eyebrow={onboarding ? 'LET’S MAKE THIS YOURS' : 'YOUR MEAL PLAN, YOUR RULES'} title={onboarding ? 'Start with what matters.' : 'Your preferences'} description={onboarding ? 'Seven quick steps make your first plan feel like your own.' : 'Adjust your nutrition, budget and kitchen rhythm any time.'} />
      <div className="preference-layout">
        <div className="preference-aside surface"><div className="preference-art"><div className="pref-circle"><Target size={30} /></div><span className="pref-leaf"><Leaf size={26} /></span></div><p className="eyebrow">STEP {step + 1} OF 7</p><h2>{['Start with your goal.', 'Choose how you like to eat.', 'Keep every suggestion safe.', 'Set a budget that feels right.', 'Pick flavors you enjoy.', 'Make room for real life.', 'Plan for your table.'][step]}</h2><p>These are starting points, not rules. Change them whenever your week does.</p><div className="pref-note"><CheckCircle2 size={17} /><span>Your choices shape every recipe suggestion and shopping list.</span></div></div>
        <Form {...form}><form className="prefs-form surface" onSubmit={form.handleSubmit(submit)}>
          <div className="wizard-progress" aria-label="Preference setup steps">{steps.map((label, index) => <button key={label} type="button" className={`wizard-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`} onClick={() => setStep(index)} data-testid={`button-wizard-step-${index + 1}`}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></button>)}</div>
          {step === 0 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">01</span><div><h2>What would you like to work toward?</h2><p>Choose the goal that best fits your next few weeks.</p></div></div><label className="form-field"><span className="field-label">Primary goal</span><select {...form.register('goal')} data-testid="select-goal"><option>Build Muscle</option><option>Maintain Weight</option><option>Lose Weight</option><option>Eat Healthier</option></select></label></section>}
          {step === 1 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">02</span><div><h2>How do you like to eat?</h2><p>Set your dietary pattern and nutrition targets.</p></div></div><label className="form-field"><span className="field-label">Dietary pattern</span><select {...form.register('diet')} data-testid="select-diet"><option>Vegetarian</option><option>Vegan</option><option>Eggetarian</option><option>Non-Vegetarian</option><option>Custom</option></select></label><div className="form-grid macro-fields">{(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field, i) => <label className="form-field" key={field}><span className="field-label">{['Daily calories', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)'][i]}</span><Input type="number" min="0" {...form.register(field)} data-testid={`input-${field}`} /></label>)}</div><label className="switch-row"><span><strong>Calculate macro targets automatically</strong><small>Use your calorie target to estimate balanced protein, carbs, fat and fiber.</small></span><input type="checkbox" className="toggle-control" {...form.register('autoNutrition')} data-testid="switch-auto-nutrition" /></label></section>}
          {step === 2 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">03</span><div><h2>Any ingredients to avoid?</h2><p>Allergies are applied as hard recipe filters.</p></div></div><div className="form-grid">{[['allergies', 'Allergies', 'Peanuts, shellfish', 'input-allergies'], ['excludedIngredients', 'Ingredients to avoid', 'Cilantro, mushrooms', 'input-excluded']].map(([field, label, placeholder, id]) => <label className="form-field" key={field}><span className="field-label">{label}</span>{commaList(field as 'allergies' | 'excludedIngredients', placeholder, id)}<small>Separate multiple items with commas.</small></label>)}</div></section>}
          {step === 3 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">04</span><div><h2>What’s your food budget?</h2><p>Meal and shopping costs use your chosen currency.</p></div></div><div className="form-grid"><label className="form-field"><span className="field-label">Budget amount</span><Input type="number" min="0" step="1" {...form.register('budget')} data-testid="input-budget" /></label><label className="form-field"><span className="field-label">Budget period</span><select {...form.register('budgetPeriod')} data-testid="select-budget-period"><option value="daily">Per day</option><option value="weekly">Per week</option><option value="monthly">Per month</option></select></label><label className="form-field"><span className="field-label">Currency</span><select {...form.register('currency')} data-testid="select-currency"><option value="INR">INR — Indian Rupee</option></select></label></div></section>}
          {step === 4 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">05</span><div><h2>Which flavors do you enjoy?</h2><p>We’ll lean toward these cuisines when there’s a good fit.</p></div></div><label className="form-field"><span className="field-label">Favorite cuisine</span><select {...form.register('cuisine')} data-testid="select-cuisine"><option>South Indian</option><option>North Indian</option><option>Indian</option><option>Mediterranean</option><option>Asian</option><option>Western</option><option>Mixed</option></select></label></section>}
          {step === 5 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">06</span><div><h2>How much time do you have?</h2><p>We’ll prioritize recipes that fit your usual schedule.</p></div></div><div className="form-grid"><label className="form-field"><span className="field-label">Maximum cooking time</span><select {...form.register('cookingTime')} data-testid="input-cooking-time"><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select></label><label className="form-field"><span className="field-label">Meals per day</span><select {...form.register('mealsPerDay')} data-testid="input-meals-per-day">{[2, 3, 4, 5].map(value => <option value={value} key={value}>{value} meals</option>)}</select></label></div></section>}
          {step === 6 && <section className="form-section"><div className="form-section-heading"><span className="number-badge">07</span><div><h2>Who’s coming to the table?</h2><p>Choose the number of servings for each meal.</p></div></div><label className="form-field"><span className="field-label">Servings per meal</span><select {...form.register('servings')} data-testid="input-servings">{[1, 2, 3, 4, 5, 6, 8, 10, 12].map(value => <option value={value} key={value}>{value} {value === 1 ? 'serving' : 'servings'}</option>)}</select></label></section>}
          {save.isError && <p className="inline-error" role="alert">Couldn’t save those changes. Please try again.</p>}
          <div className="form-actions wizard-actions"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(index => Math.max(0, index - 1))} data-testid="button-wizard-back"><ChevronLeft size={16} /> Back</Button><span><CheckCircle2 size={15} /> Step {step + 1} of 7</span>{step < 6 ? <Button type="button" onClick={() => setStep(index => Math.min(6, index + 1))} data-testid="button-wizard-next">Continue <ArrowRight size={16} /></Button> : <Button type="submit" disabled={save.isPending} data-testid="button-save-preferences">{save.isPending && <LoaderCircle className="animate-spin" size={16} />}{onboarding ? 'Save and continue' : 'Save preferences'}<Check size={16} /></Button>}</div>
        </form></Form>
      </div>
    </>}
  </div>;
}

function PlannerPage() {
  const plans = useListMealPlans();
  const generate = useGenerateMealPlan();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get('planId') ?? '');
  const planId = selectedId || plans.data?.[0]?.id || '';
  const planQuery = useGetMealPlan(planId, { query: { enabled: !!planId, queryKey: getGetMealPlanQueryKey(planId) } });
  const replace = useReplacePlanMeal();
  const [duration, setDuration] = useState(7);
  const [optimize, setOptimize] = useState(true);
  const onGenerate = () => generate.mutate({ data: { duration, optimizeBudget: optimize } }, { onSuccess: plan => { setSelectedId(plan.id); qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } });
  const onReplace = (mealId: string) => replace.mutate({ planId, data: { mealId } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMealPlanQueryKey(planId) }); qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() }); } });
  return <div className="page-wrap">
    <PageTitle eyebrow="PLAN AHEAD, EAT WELL" title="Your week, sorted." description="Meals shaped around your nutrition goals, pantry and budget." action={<Button onClick={onGenerate} disabled={generate.isPending} data-testid="button-generate-plan">{generate.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}{generate.isPending ? 'Building your plan' : 'Generate a plan'}</Button>} />
    <div className="planner-control surface"><div className="planner-control-copy"><div className="control-icon"><CalendarDays size={18} /></div><span><strong>Build a week that works</strong><small>Choose how far ahead to plan and what to prioritize.</small></span></div><div className="planner-options"><label><span className="field-label">Plan length</span><select value={duration} onChange={e => setDuration(Number(e.target.value))} data-testid="select-plan-duration"><option value={3}>3 days</option><option value={5}>5 days</option><option value={7}>7 days</option><option value={14}>14 days</option></select></label><label className="checkbox-row"><Checkbox checked={optimize} onCheckedChange={v => setOptimize(Boolean(v))} data-testid="checkbox-optimize-budget" /><span>Prioritize my budget</span></label></div></div>
    {generate.isError && <div className="notice-error">Your plan couldn’t be generated. Check your preferences and try again.</div>}
    {plans.isLoading ? <LoadingState label="Finding a good rhythm for your week…" /> : plans.isError ? <ErrorState retry={() => plans.refetch()} /> : !plans.data?.length ? <EmptyState title="No meal plans yet" text="A few preferences are all we need to get your first week started." action={<Link href="/onboarding" className="button-link primary-action">Set my preferences <ArrowRight size={16} /></Link>} /> : planQuery.isLoading ? <LoadingState label="Opening your meal plan…" /> : planQuery.isError ? <ErrorState retry={() => planQuery.refetch()} /> : planQuery.data && <section className="plan-view">
      <div className="plan-summary surface"><div><p className="eyebrow">YOUR CURRENT PLAN</p><h2 className="section-title">{planQuery.data.duration}-day meal plan</h2><p>Created {prettyDate(planQuery.data.createdAt)}</p></div><div className="plan-summary-metrics"><div><small>Estimated total</small><strong>{money(planQuery.data.estimatedCost)}</strong></div><div><small>Budget</small><strong>{money(planQuery.data.budget)}</strong></div><div><small>Meals planned</small><strong>{planQuery.data.days.reduce((n, day) => n + day.meals.length, 0)}</strong></div></div></div>
      <div className="planner-days">{planQuery.data.days.map((day, i) => <article className="planner-day surface" key={day.date || i}><div className="planner-date"><span className="date-number">{String(i + 1).padStart(2, '0')}</span><div><strong>{prettyDate(day.date)}</strong><small>{day.meals.length} meals on the menu</small></div></div>
        <div className="planner-meals">{day.meals.map(meal => <div className="planner-meal" key={meal.id}><span className="planner-meal-type">{meal.mealType}</span><Link href={`/recipes/${meal.recipe.id}`} className="planner-meal-name">{meal.recipe.name}</Link><span className="planner-meal-detail"><Clock3 size={13} />{meal.recipe.cookingTime} min</span><span className="planner-meal-detail"><Flame size={13} />{meal.recipe.nutrition.calories} kcal · {meal.recipe.nutrition.protein} g protein</span><span className="planner-meal-detail"><Coins size={13} />Est. {money(meal.recipe.cost)}</span><button className="mini-action" onClick={() => onReplace(meal.id)} disabled={replace.isPending} aria-label={`Replace ${meal.recipe.name}`} data-testid={`button-replace-${meal.id}`}><WandSparkles size={15} /></button></div>)}</div>
      </article>)}</div>
    </section>}
  </div>;
}

function PantryPage() {
  const pantry = useListPantry();
  const add = useAddPantryItem();
  const update = useUpdatePantryItem();
  const remove = useDeletePantryItem();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pieces');
  const [category, setCategory] = useState('Produce');
  const [expiryDate, setExpiryDate] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: getListPantryQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; const data: PantryItemInput = { name: name.trim(), quantity: Number(quantity), unit, category, expiryDate: expiryDate || null }; if (editId) update.mutate({ itemId: editId, data }, { onSuccess: () => { refresh(); clear(); } }); else add.mutate({ data }, { onSuccess: () => { refresh(); clear(); } }); };
  const clear = () => { setAdding(false); setEditId(null); setName(''); setQuantity(1); setUnit('pieces'); setCategory('Produce'); setExpiryDate(''); };
  const edit = (item: { id: string; name: string; quantity: number; unit: string; category: string; expiryDate: string | null }) => { setEditId(item.id); setName(item.name); setQuantity(item.quantity); setUnit(item.unit); setCategory(item.category); setExpiryDate(item.expiryDate ?? ''); setAdding(true); };
  const groups = useMemo(() => (pantry.data ?? []).reduce<Record<string, typeof pantry.data>>((acc, item) => { (acc[item.category || 'Other'] ??= []).push(item); return acc; }, {}), [pantry.data]);
  return <div className="page-wrap">
    <PageTitle eyebrow="YOUR INGREDIENTS" title="A pantry that plans ahead." description="Keep track of what you have. Your meal plans will make it count." action={<Button onClick={() => { clear(); setAdding(true); }} data-testid="button-add-pantry"><Plus size={16} /> Add ingredient</Button>} />
    {adding && <form className="pantry-add-form surface" onSubmit={submit}><div className="pantry-form-title"><div><span className="eyebrow">{editId ? 'EDIT INGREDIENT' : 'ADD TO YOUR PANTRY'}</span><h2>{editId ? 'Update ingredient' : 'What’s in your kitchen?'}</h2></div><button type="button" className="icon-button" onClick={clear} aria-label="Close ingredient form"><X size={17} /></button></div>
      <div className="form-grid pantry-fields"><label className="form-field"><span className="field-label">Ingredient name</span><Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Brown rice" data-testid="input-pantry-name" /></label><label className="form-field"><span className="field-label">Quantity</span><Input type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(Number(e.target.value))} data-testid="input-pantry-quantity" /></label><label className="form-field"><span className="field-label">Unit</span><select value={unit} onChange={e => setUnit(e.target.value)} data-testid="select-pantry-unit">{['pieces', 'g', 'kg', 'oz', 'lb', 'cups', 'ml', 'l', 'cans', 'bunches'].map(x => <option key={x}>{x}</option>)}</select></label><label className="form-field"><span className="field-label">Category</span><select value={category} onChange={e => setCategory(e.target.value)} data-testid="select-pantry-category">{['Produce', 'Dairy', 'Meat & seafood', 'Grains', 'Canned goods', 'Spices', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label><label className="form-field"><span className="field-label">Use by (optional)</span><Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} data-testid="input-pantry-expiry" /></label></div>
      <div className="form-actions"><span>{(add.isError || update.isError) && <span className="inline-error">Couldn’t save this ingredient.</span>}</span><div className="flex gap-2"><Button type="button" variant="outline" onClick={clear}>Cancel</Button><Button type="submit" disabled={add.isPending || update.isPending} data-testid="button-submit-pantry">{add.isPending || update.isPending ? 'Saving…' : editId ? 'Save changes' : 'Add ingredient'}</Button></div></div>
    </form>}
    {pantry.isLoading ? <LoadingState label="Checking your pantry…" /> : pantry.isError ? <ErrorState retry={() => pantry.refetch()} /> : !pantry.data?.length ? <EmptyState title="Your pantry starts here" text="Add ingredients you already have. We’ll use them to make your plans smarter and reduce extra shopping." action={<Button onClick={() => setAdding(true)}><Plus size={16} /> Add your first ingredient</Button>} /> : <div className="pantry-layout"><section className="pantry-groups">{Object.entries(groups).map(([group, items]) => <div className="pantry-group surface" key={group}><div className="pantry-group-head"><div className="group-glyph"><Leaf size={16} /></div><h2>{group}</h2><span>{items?.length ?? 0}</span></div><div>{items?.map(item => <div className="pantry-item" key={item.id}><div className="ingredient-mark">{item.name.slice(0, 1).toUpperCase()}</div><div className="ingredient-name"><strong>{item.name}</strong><small>{item.expiryDate ? `Use by ${prettyDate(item.expiryDate)}` : 'No expiry date'}</small></div><div className="ingredient-qty"><strong>{item.quantity}</strong><small>{item.unit}</small></div><div className="ingredient-actions"><button className="mini-action" type="button" onClick={() => edit(item)} aria-label={`Edit ${item.name}`} data-testid={`button-edit-pantry-${item.id}`}><Settings2 size={15} /></button><button className="mini-action danger" type="button" onClick={() => { if (confirm(`Remove ${item.name} from your pantry?`)) remove.mutate({ itemId: item.id }, { onSuccess: refresh }); }} aria-label={`Delete ${item.name}`} data-testid={`button-delete-pantry-${item.id}`}><Trash2 size={15} /></button></div></div>)}</div></div>)}</section>
      <aside className="pantry-side"><div className="pantry-count-card"><span className="count-icon"><PackageOpen size={19} /></span><p className="eyebrow">IN YOUR KITCHEN</p><strong>{pantry.data.length}</strong><span>ingredients ready to cook</span></div><div className="pantry-note surface"><span className="tip-orb"><Sparkles size={15} /></span><h3>A useful little habit</h3><p>Add an expiry date to fresh ingredients. We’ll help you spot what should be used first.</p><Link href="/planner" className="inline-link">Plan with my pantry <ArrowRight size={15} /></Link></div></aside></div>}
  </div>;
}

function RecipesPage() {
  const [search, setSearch] = useState('');
  const [diet, setDiet] = useState('');
  const params = useMemo(() => ({ search: search.trim() || undefined, diet: diet || undefined }), [search, diet]);
  const recipes = useListRecipes(params);
  const favorites = useListFavorites();
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();
  const qc = useQueryClient();
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map(r => r.id)), [favorites.data]);
  const toggleFavorite = (id: string) => favoriteIds.has(id) ? removeFav.mutate({ recipeId: id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListFavoritesQueryKey() }) }) : addFav.mutate({ data: { recipeId: id } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListFavoritesQueryKey() }) });
  return <div className="page-wrap"><PageTitle eyebrow="COOK SOMETHING GOOD" title="Find your next favorite." description="Recipes filtered with your preferences in mind." />
    <div className="recipes-toolbar surface"><div className="recipe-search"><Search size={17} /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals or ingredients..." aria-label="Search recipes" data-testid="input-recipe-search" /></div><label className="diet-filter"><span>Diet</span><select value={diet} onChange={e => setDiet(e.target.value)} data-testid="select-recipe-diet"><option value="">All dietary styles</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="gluten-free">Gluten-free</option><option value="pescatarian">Pescatarian</option><option value="keto">Keto</option></select></label><span className="result-count">{recipes.data?.length ?? 0} recipes</span></div>
    {recipes.isLoading ? <div className="recipe-grid">{[0,1,2,3,4,5].map(i => <div className="surface p-3" key={i}><div className="skeleton h-40 w-full" /><div className="skeleton mt-4 h-4 w-3/4" /><div className="skeleton mt-2 h-4 w-1/2" /></div>)}</div> : recipes.isError ? <ErrorState retry={() => recipes.refetch()} /> : !recipes.data?.length ? <EmptyState title="No recipes found" text="Try another search or clear the diet filter to see more ideas." action={<Button variant="outline" onClick={() => { setSearch(''); setDiet(''); }}>Clear filters</Button>} /> : <div className="recipe-grid">{recipes.data.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} favorite={favoriteIds.has(recipe.id)} onFavorite={() => toggleFavorite(recipe.id)} />)}</div>}
    {(addFav.isError || removeFav.isError) && <p className="inline-error">Couldn’t update your saved recipes. Please try again.</p>}
  </div>;
}

function RecipeDetailPage() {
  const params = useParams<{ recipeId: string }>();
  const recipeId = params.recipeId ?? '';
  const recipe = useGetRecipe(recipeId, { query: { enabled: !!recipeId, queryKey: getGetRecipeQueryKey(recipeId) } });
  const favorites = useListFavorites();
  const add = useAddFavorite();
  const remove = useRemoveFavorite();
  const qc = useQueryClient();
  if (recipe.isLoading) return <div className="page-wrap"><LoadingState label="Finding the recipe…" /></div>;
  if (recipe.isError || !recipe.data) return <div className="page-wrap"><ErrorState retry={() => recipe.refetch()} message="We couldn’t find that recipe. It may have moved." /></div>;
  const item = recipe.data;
  const isFavorite = (favorites.data ?? []).some(x => x.id === item.id);
  const toggle = () => isFavorite ? remove.mutate({ recipeId: item.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListFavoritesQueryKey() }) }) : add.mutate({ data: { recipeId: item.id } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListFavoritesQueryKey() }) });
  return <div className="page-wrap detail-page"><Link href="/recipes" className="back-link" data-testid="link-back-recipes"><ChevronLeft size={16} /> All recipes</Link>
    <div className="detail-hero surface"><div className="detail-photo">{item.image ? <img src={item.image} alt={item.name} /> : <div className="recipe-placeholder large"><Leaf size={42} /><span>{item.cuisine}</span></div>}</div><div className="detail-copy"><p className="eyebrow">{item.cuisine} · {item.diet?.join(' / ') || 'A good everyday meal'}</p><h1 className="display-title">{item.name}</h1><p>{item.description}</p><div className="detail-pills"><span><Clock3 size={15} />{item.cookingTime} minutes</span><span><Flame size={15} />Est. {item.nutrition.calories} kcal</span><span><Coins size={15} />Est. {money(item.cost)} / serving</span><span><Utensils size={15} />Serves {item.servings}</span></div><Button variant={isFavorite ? 'secondary' : 'outline'} onClick={toggle} data-testid="button-save-recipe">{isFavorite ? <Check size={16} /> : <Heart size={16} />}{isFavorite ? 'Saved to favorites' : 'Save this recipe'}</Button></div></div>
    <div className="detail-columns"><section className="detail-section surface"><div className="section-head"><div><p className="eyebrow">WHAT YOU’LL NEED</p><h2 className="section-title">Ingredients</h2></div><span className="detail-small">For {item.servings} servings</span></div><div className="ingredient-list">{item.ingredients.map((ingredient, i) => <div className="detail-ingredient" key={`${ingredient.name}-${i}`}><span className="ingredient-check"><Check size={13} /></span><span>{ingredient.name}</span><strong>{ingredient.quantity} {ingredient.unit}</strong></div>)}</div></section>
      <section className="detail-section surface"><p className="eyebrow">LET’S MAKE IT</p><h2 className="section-title">The method</h2><div className="instruction-list">{item.instructions.map((instruction, i) => <div className="instruction-step" key={`${i}-${instruction.slice(0, 8)}`}><span>{String(i + 1).padStart(2, '0')}</span><p>{instruction}</p></div>)}</div></section>
      <aside className="nutrition-recipe-card surface"><p className="eyebrow">ESTIMATED NUTRITION / SERVING</p><h2 className="section-title">The good stuff</h2>{Object.entries(item.nutrition).map(([key, value]) => <div className="nutrition-line" key={key}><span>{cap(key)}</span><strong>~{value}{key === 'calories' ? ' kcal' : ' g'}</strong></div>)}{item.allergens?.length > 0 && <div className="allergen-note"><span>Contains</span><p>{item.allergens.join(', ')}</p></div>}</aside></div>
  </div>;
}

function ShoppingPage() {
  const plans = useListMealPlans();
  const planId = plans.data?.[0]?.id ?? '';
  const list = useGetShoppingList(planId, { query: { enabled: !!planId, queryKey: getGetShoppingListQueryKey(planId) } });
  const add = useAddShoppingItem();
  const update = useUpdateShoppingItem();
  const remove = useDeleteShoppingItem();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pieces');
  const [category, setCategory] = useState('Other');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: getGetShoppingListQueryKey(planId) });
  const clearEditor = () => { setAdding(false); setEditId(null); setName(''); setQuantity(1); setUnit('pieces'); setCategory('Other'); setEstimatedPrice(0); };
  const editItem = (item: NonNullable<typeof list.data>['items'][number]) => { setEditId(item.id); setName(item.name); setQuantity(item.quantity); setUnit(item.unit); setCategory(item.category); setEstimatedPrice(item.estimatedPrice); setAdding(true); };
  const toggle = (item: NonNullable<typeof list.data>['items'][number]) => {
    const data: ShoppingItemInput = { name: item.name, quantity: item.quantity, unit: item.unit, category: item.category, estimatedPrice: item.estimatedPrice, purchased: !item.purchased, planId };
    update.mutate({ itemId: item.id, data }, { onSuccess: refresh });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data: ShoppingItemInput = { name: name.trim(), quantity: Number(quantity), unit, category, estimatedPrice: Number(estimatedPrice), purchased: list.data?.items.find(item => item.id === editId)?.purchased ?? false, planId };
    if (editId) update.mutate({ itemId: editId, data }, { onSuccess: () => { refresh(); clearEditor(); } });
    else add.mutate({ data: { ...data, purchased: false } }, { onSuccess: () => { refresh(); clearEditor(); } });
  };
  const groups = useMemo(() => (list.data?.items ?? []).reduce<Record<string, ShoppingList['items']>>((acc, item) => { (acc[item.category || 'Other'] ??= []).push(item); return acc; }, {}), [list.data]);
  return <div className="page-wrap"><PageTitle eyebrow="READY WHEN YOU ARE" title="The grocery run, simplified." description="Everything your plan needs, minus what’s already in your pantry." action={list.data && <Button variant="outline" onClick={() => window.print()} data-testid="button-print-list"><ListChecks size={16} /> Print list</Button>} />
    {plans.isLoading || (planId && list.isLoading) ? <LoadingState label="Putting your list together…" /> : plans.isError || list.isError ? <ErrorState retry={() => { plans.refetch(); list.refetch(); }} /> : !planId || !list.data ? <EmptyState title="No list to shop from yet" text="Generate a meal plan first and we’ll gather the ingredients you need." action={<Link href="/planner" className="button-link primary-action">Make a meal plan <ArrowRight size={16} /></Link>} /> : <>
      <div className="shopping-summary surface"><div className="shopping-summary-icon"><ShoppingBag size={19} /></div><div><p className="eyebrow">YOUR SHOPPING LIST</p><h2>{list.data.items.filter(i => !i.purchased).length} things to pick up</h2><span>{Math.round(list.data.pantryCoverage)}% covered by your pantry</span></div><div className="shopping-total"><small>Estimated total</small><strong>{money(list.data.totalCost)}</strong></div><div className="coverage-ring" style={{ '--coverage': `${Math.max(0, Math.min(100, list.data.pantryCoverage))}%` } as React.CSSProperties}><span>{Math.round(list.data.pantryCoverage)}<small>%</small></span></div></div>
      <div className="shopping-layout"><section className="shopping-groups">{Object.entries(groups).map(([group, items]) => <div className="shopping-group surface" key={group}><div className="shopping-group-head"><h2>{group}</h2><span>{items?.filter(i => !i.purchased).length} left</span></div>{items?.map(item => <div key={item.id} className={`shopping-item ${item.purchased ? 'purchased' : ''}`}><Checkbox checked={item.purchased} onCheckedChange={() => toggle(item)} data-testid={`checkbox-shopping-${item.id}`} /><span className="shop-name">{item.name}</span><span className="shop-quantity">{item.quantity} {item.unit}</span><span className="shop-price">{money(item.estimatedPrice)}</span><button type="button" className="mini-action" onClick={() => editItem(item)} aria-label={`Edit ${item.name}`} data-testid={`button-edit-shopping-${item.id}`}><Settings2 size={14} /></button><button type="button" className="mini-action danger" onClick={() => remove.mutate({ itemId: item.id }, { onSuccess: refresh })} aria-label={`Remove ${item.name}`} data-testid={`button-delete-shopping-${item.id}`}><Trash2 size={14} /></button></div>)}</div>)}
        {adding ? <form className="quick-add surface" onSubmit={submit}><Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Shopping item…" aria-label="Shopping item name" data-testid="input-shopping-name" /><Input className="quantity-input" type="number" min="0.1" step="any" value={quantity} onChange={e => setQuantity(Number(e.target.value))} aria-label="Quantity" data-testid="input-shopping-quantity" /><select value={unit} onChange={e => setUnit(e.target.value)} aria-label="Unit" data-testid="select-shopping-unit"><option>pieces</option><option>g</option><option>kg</option><option>cups</option><option>cans</option></select><select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category" data-testid="select-shopping-category">{['Produce', 'Dairy', 'Protein', 'Grains', 'Spices', 'Other'].map(value => <option key={value}>{value}</option>)}</select><Input className="quantity-input" type="number" min="0" step="any" value={estimatedPrice} onChange={e => setEstimatedPrice(Number(e.target.value))} aria-label="Estimated price" data-testid="input-shopping-price" /><Button type="submit" disabled={add.isPending || update.isPending} data-testid="button-submit-shopping">{editId ? 'Save item' : 'Add item'}</Button><button type="button" className="icon-button" onClick={clearEditor} aria-label="Cancel editing"><X size={16} /></button></form> : <button className="add-shopping-row" onClick={() => { clearEditor(); setAdding(true); }} data-testid="button-add-shopping"><Plus size={16} /> Add something else</button>}
      </section><aside className="shopping-side surface"><p className="eyebrow">A FEW QUICK NUMBERS</p><div className="shop-stat"><span>List items</span><strong>{list.data.items.length}</strong></div><div className="shop-stat"><span>Already in pantry</span><strong>{Math.round(list.data.pantryCoverage)}%</strong></div><div className="shop-stat"><span>Still to buy</span><strong>{list.data.items.filter(i => !i.purchased).length}</strong></div><div className="shopping-side-note"><Leaf size={16} /><span>Items you’ve checked off are saved with this plan.</span></div></aside></div>
      {(add.isError || update.isError || remove.isError) && <p className="inline-error">A list update didn’t stick. Please try again.</p>}
    </>}
  </div>;
}

function FavoritesPage() {
  const favorites = useListFavorites();
  const remove = useRemoveFavorite();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [diet, setDiet] = useState('');
  const filtered = (favorites.data ?? []).filter(recipe =>
    (!search.trim() || `${recipe.name} ${recipe.cuisine} ${recipe.ingredients.map(item => item.name).join(' ')}`.toLowerCase().includes(search.toLowerCase()))
    && (!diet || recipe.diet.some(tag => tag.toLowerCase().includes(diet))),
  );
  return <div className="page-wrap"><PageTitle eyebrow="YOUR PERSONAL COOKBOOK" title="Recipes worth keeping." description="A small collection of ideas you can come back to." />
    {favorites.isLoading ? <LoadingState label="Opening your saved recipes…" /> : favorites.isError ? <ErrorState retry={() => favorites.refetch()} /> : !favorites.data?.length ? <EmptyState title="Your saved recipes live here" text="Browse recipes and save the ones you’d love to cook again." action={<Link href="/recipes" className="button-link primary-action">Explore recipes <ArrowRight size={16} /></Link>} /> : <>
      <div className="recipes-toolbar surface"><div className="recipe-search"><Search size={17} /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search saved recipes…" aria-label="Search saved recipes" data-testid="input-favorites-search" /></div><label className="diet-filter"><span>Diet</span><select value={diet} onChange={event => setDiet(event.target.value)} aria-label="Filter saved recipes by diet" data-testid="select-favorites-diet"><option value="">All diets</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="non-vegetarian">Non-vegetarian</option></select></label><span className="result-count">{filtered.length} saved</span></div>
      {!filtered.length ? <EmptyState title="No saved recipes match" text="Try a different search or dietary filter." action={<Button variant="outline" onClick={() => { setSearch(''); setDiet(''); }}>Clear filters</Button>} /> : <div className="recipe-grid">{filtered.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} favorite onFavorite={() => remove.mutate({ recipeId: recipe.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListFavoritesQueryKey() }) })} />)}</div>}
    </>}
  </div>;
}

function HistoryPage() {
  const plans = useListMealPlans();
  const generate = useGenerateMealPlan();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const recreate = (duration: number, optimizeBudget: boolean) => generate.mutate({ data: { duration, optimizeBudget } }, {
    onSuccess: plan => {
      qc.invalidateQueries({ queryKey: getListMealPlansQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      setLocation(`/planner?planId=${encodeURIComponent(plan.id)}`);
    },
  });
  return <div className="page-wrap"><PageTitle eyebrow="YOUR PLANNING JOURNAL" title="Weeks you’ve mapped out." description="Look back at your meal plans and pick up where you left off." action={<Link href="/planner" className="button-link primary-action">Plan another week <ArrowRight size={16} /></Link>} />
    {generate.isError && <p className="inline-error" role="alert">We couldn’t create that plan with the current preferences.</p>}
    {plans.isLoading ? <LoadingState label="Finding your past plans…" /> : plans.isError ? <ErrorState retry={() => plans.refetch()} /> : !plans.data?.length ? <EmptyState title="Your story starts with a plan" text="Plans you generate will be collected here for easy reference." action={<Link href="/planner" className="button-link primary-action">Make my first plan <ArrowRight size={16} /></Link>} /> : <div className="history-list">{plans.data.map((plan, i) => <article key={plan.id} className="history-card surface" data-testid={`card-history-${plan.id}`}><div className="history-index">{String(plans.data!.length - i).padStart(2, '0')}</div><div className="history-main"><p className="eyebrow">{prettyDate(plan.createdAt)}</p><h2>{plan.duration}-day meal plan</h2><span>{plan.days.reduce((n, d) => n + d.meals.length, 0)} meals · {plan.days.length} days</span></div><div className="history-metric"><small>Estimated spend</small><strong>{money(plan.estimatedCost)}</strong></div><div className="history-metric"><small>Budget</small><strong>{money(plan.budget)}</strong></div><div className="history-actions"><Link href={`/planner?planId=${encodeURIComponent(plan.id)}`} className="inline-link" data-testid={`link-history-${plan.id}`}>View <ArrowRight size={14} /></Link><Button variant="outline" size="sm" disabled={generate.isPending} onClick={() => recreate(plan.duration, true)} data-testid={`button-duplicate-plan-${plan.id}`}>Duplicate</Button><Button variant="secondary" size="sm" disabled={generate.isPending} onClick={() => recreate(plan.duration, false)} data-testid={`button-regenerate-plan-${plan.id}`}>Regenerate</Button></div></article>)}</div>}
  </div>;
}

function NutritionPage() {
  const nutrition = useGetNutrition();
  const data = nutrition.data;
  const nutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const;
  const [chartMetric, setChartMetric] = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories');
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly'>('weekly');
  const chartData = chartPeriod === 'daily'
    ? (data ? [{ day: 'Today', nutrition: data.consumed, cost: 0 }] : [])
    : data?.weekly ?? [];
  return <div className="page-wrap"><PageTitle eyebrow="YOUR NUTRITION, WITHOUT THE NOISE" title="Small steps, good momentum." description="A clear view of how your meals are tracking against your personal targets." action={<Link href="/settings" className="button-link outline-action"><Settings2 size={16} /> Adjust goals</Link>} />
    {nutrition.isLoading ? <LoadingState label="Gathering your nutrition overview…" /> : nutrition.isError || !data ? <ErrorState retry={() => nutrition.refetch()} /> : <>
      <section className="nutrition-overview surface"><div className="nutrition-overview-head"><div><p className="eyebrow">TODAY’S CHECK-IN</p><h2 className="section-title">On your way.</h2></div><span className="nutrition-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><div className="nutrient-cards">{nutrients.map((key, i) => { const target = data.target[key] ?? 0; const consumed = data.consumed[key] ?? 0; const pct = target ? Math.min(100, Math.round(consumed / target * 100)) : 0; return <div className="nutrient-card" key={key}><div className={`nutrient-icon tone-${i}`}><Activity size={16} /></div><div className="nutrient-title"><strong>{cap(key)}</strong><span>{key === 'calories' ? 'kcal' : 'g'}</span></div><div className="nutrient-values"><strong>{consumed.toLocaleString()}</strong><span>of {target.toLocaleString()}</span></div><div className="progress-track"><span style={{ width: `${pct}%` }} /></div><small>{pct}% of target</small></div>; })}</div></section>
      <div className="nutrition-bottom"><section className="weekly-chart surface"><div className="section-head"><div><p className="eyebrow">YOUR NUTRITION TRENDS</p><h2 className="section-title">{cap(chartMetric)} by day</h2></div><div className="chart-period-tabs" role="group" aria-label="Chart period">{(['daily', 'weekly'] as const).map(period => <button key={period} type="button" className={chartPeriod === period ? 'active' : ''} onClick={() => setChartPeriod(period)} data-testid={`button-chart-${period}`}>{cap(period)}</button>)}</div></div><div className="chart-metric-tabs" role="group" aria-label="Nutrient to chart">{(['calories', 'protein', 'carbs', 'fat'] as const).map(metric => <button key={metric} type="button" className={chartMetric === metric ? 'active' : ''} onClick={() => setChartMetric(metric)} data-testid={`button-chart-metric-${metric}`}>{cap(metric)}</button>)}</div>{chartData.length ? <div className="recharts-wrap"><ResponsiveContainer width="100%" height={245}><BarChart data={chartData} margin={{ top: 12, right: 8, left: -14, bottom: 4 }}><CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="4 4" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} /><Tooltip /><Bar dataKey={`nutrition.${chartMetric}`} fill="hsl(var(--primary))" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyState title="Your week will appear here" text="Nutrition trends appear when meal data is available." />}</section>
        <aside className="insights-card"><div className="insights-title"><span><Sparkles size={16} /></span><div><p className="eyebrow">A HELPFUL NUDGE</p><h2>What we noticed</h2></div></div>{data.insights?.length ? <ul>{data.insights.map((insight, i) => <li key={`${i}-${insight}`}><CheckCircle2 size={16} /><span>{insight}</span></li>)}</ul> : <p className="quiet">Keep planning and we’ll share useful patterns as they emerge.</p>}<Link href="/planner" className="insight-link">Plan your next meal <ArrowRight size={15} /></Link></aside></div>
      <section className="weekly-spend surface"><div><p className="eyebrow">SPEND WITH A PLAN</p><h2 className="section-title">Weekly food costs</h2><p>Estimated meal costs at a glance.</p></div><div className="spend-list">{data.weekly?.map((day, i) => <div key={`${day.day}-${i}`}><span>{day.day}</span><div className="spend-track"><i style={{ width: `${Math.min(100, day.cost / Math.max(1, ...data.weekly.map(x => x.cost)) * 100)}%` }} /></div><strong>{money(day.cost)}</strong></div>)}</div></section>
    </>}
  </div>;
}

function AppRoutes() {
  return <Shell><ErrorBoundary resetKey={useLocation()[0]}><Switch>
    <Route path="/" component={LandingPage} />
    <Route path="/onboarding"><PreferencesPage onboarding /></Route>
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/planner" component={PlannerPage} />
    <Route path="/pantry" component={PantryPage} />
    <Route path="/shopping-list" component={ShoppingPage} />
    <Route path="/recipes" component={RecipesPage} />
    <Route path="/recipes/:recipeId" component={RecipeDetailPage} />
    <Route path="/nutrition" component={NutritionPage} />
    <Route path="/favorites" component={FavoritesPage} />
    <Route path="/history" component={HistoryPage} />
    <Route path="/settings"><PreferencesPage /></Route>
    <Route component={NotFound} />
  </Switch></ErrorBoundary></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRoutes /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
