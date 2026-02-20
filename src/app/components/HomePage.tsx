import { useState, useEffect, useRef } from "react";
import { Users, Trophy, Zap, Calendar, MapPin, Mail, Heart, ArrowUpRight, Camera, FileText, BarChart3, Star, Award, Shield, Landmark, Upload, X, Save, Pencil, Plus, ExternalLink } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";

interface Sponsor {
  id: string;
  name: string;
  logo: string;
  message: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  website: string;
  active: boolean;
}

interface ClubStats {
  totalMembers: number;
  adultTeams: { mens: number; womens: number; total: number };
  youthTeams: { count: number; totalKids: number; teams: string[] };
  grounds: { count: number; names: string[] };
  totalFixtures: number;
  upcomingFixtures: number;
}

interface HomePageProps {
  apiUrl?: string;
  apiKey?: string;
  userRole?: string;
}

const TIER_CONFIG: Record<string, { gradient: string; border: string; badgeClass: string; label: string; logoSize: string }> = {
  platinum: { gradient: 'from-slate-100 via-gray-50 to-slate-100', border: 'border-2 border-slate-400 shadow-xl', badgeClass: 'bg-gradient-to-r from-gray-700 to-gray-900 text-white', label: 'Platinum Partner', logoSize: 'h-28 w-56' },
  gold: { gradient: 'from-yellow-50 via-amber-50 to-yellow-50', border: 'border-2 border-yellow-400 shadow-lg', badgeClass: 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white', label: 'Gold Sponsor', logoSize: 'h-24 w-48' },
  silver: { gradient: 'from-gray-50 via-slate-50 to-gray-50', border: 'border border-slate-300 shadow-md', badgeClass: 'bg-slate-500 text-white', label: 'Silver Sponsor', logoSize: 'h-20 w-40' },
  bronze: { gradient: 'from-orange-50 via-amber-50 to-orange-50', border: 'border border-orange-300 shadow', badgeClass: 'bg-orange-600 text-white', label: 'Bronze Sponsor', logoSize: 'h-16 w-36' },
};

const EMPTY_FORM = { name: '', logo: '', message: '', tier: 'silver', website: '' };

export function HomePage({ apiUrl, apiKey, userRole }: HomePageProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [clubStats, setClubStats] = useState<ClubStats | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [animatedStats, setAnimatedStats] = useState({ members: 0, teams: 0, youth: 0, fixtures: 0 });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Banner photo state
  const [bannerPhotos, setBannerPhotos] = useState<Array<{ id: string; url: string; caption: string; order: number }>>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (apiUrl) {
      fetchSponsors();
      fetchClubStats();
      fetchBannerPhotos();
    }
  }, [apiUrl]);

  // Auto-slideshow
  useEffect(() => {
    if (bannerPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % bannerPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerPhotos.length]);

  // Animate stats counters
  useEffect(() => {
    if (!clubStats) return;
    const targets = {
      members: clubStats.totalMembers,
      teams: clubStats.adultTeams.total,
      youth: clubStats.youthTeams.totalKids,
      fixtures: clubStats.totalFixtures,
    };
    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedStats({
        members: Math.round(targets.members * ease),
        teams: Math.round(targets.teams * ease),
        youth: Math.round(targets.youth * ease),
        fixtures: Math.round(targets.fixtures * ease),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [clubStats]);

  const fetchSponsors = async () => {
    try {
      const url = isAdmin && editMode ? `${apiUrl}/sponsors/all` : `${apiUrl}/sponsors`;
      const headers: Record<string, string> = {};
      if (isAdmin && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) setSponsors(data.data);
    } catch { /* silent */ }
  };

  const fetchClubStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/club-stats`);
      const data = await res.json();
      if (data.success) setClubStats(data.data);
    } catch { /* silent */ }
  };

  const fetchBannerPhotos = async () => {
    try {
      const res = await fetch(`${apiUrl}/banner-photos`);
      const data = await res.json();
      if (data.success) setBannerPhotos(data.data);
    } catch { /* silent */ }
  };

  const openAddDialog = () => {
    setEditingSponsor(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEditDialog = (s: Sponsor) => {
    setEditingSponsor(s);
    setForm({ name: s.name, logo: s.logo, message: s.message, tier: s.tier, website: s.website });
    setShowDialog(true);
  };

  const saveSponsor = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      const url = editingSponsor ? `${apiUrl}/sponsors/${editingSponsor.id}` : `${apiUrl}/sponsors`;
      const method = editingSponsor ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, active: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingSponsor ? 'Sponsor updated!' : 'Sponsor added!');
        setShowDialog(false);
        fetchSponsors();
      }
    } catch { toast.error('Failed to save sponsor'); }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm('Remove this sponsor?')) return;
    try {
      await fetch(`${apiUrl}/sponsors/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      toast.success('Sponsor removed');
      fetchSponsors();
    } catch { toast.error('Failed to delete'); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({ ...prev, logo: reader.result as string }));
      setLogoUploading(false);
    };
    reader.onerror = () => { toast.error('Failed to read file'); setLogoUploading(false); };
    reader.readAsDataURL(file);
  };

  const navigate = (tab: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: tab }));
  };

  const statItems = [
    { icon: Users, value: animatedStats.members, label: 'Active Members', color: 'from-blue-600 to-blue-800' },
    { icon: Trophy, value: animatedStats.teams, label: 'Adult Teams', color: 'from-red-700 to-red-900' },
    { icon: Zap, value: animatedStats.youth, label: 'Youth Players', color: 'from-emerald-600 to-emerald-800' },
    { icon: Calendar, value: animatedStats.fixtures, label: 'Season Fixtures', color: 'from-violet-600 to-violet-800' },
  ];

  const tierOrder: Array<'platinum' | 'gold' | 'silver' | 'bronze'> = ['platinum', 'gold', 'silver', 'bronze'];

  return (
    <div className="space-y-0">
      {/* ===== HERO BANNER WITH PHOTO SLIDESHOW ===== */}
      <div className="relative h-[480px] md:h-[540px] rounded-2xl overflow-hidden -mt-4 bg-slate-900">
        {/* Photo slideshow background */}
        {bannerPhotos.length > 0 ? (
          bannerPhotos.map((photo, i) => (
            <div
              key={photo.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                i === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={photo.url}
                alt={photo.caption || 'Cricket ground'}
                className="w-full h-full object-cover"
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900" />
        )}

        {/* Dark gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Slide indicators */}
        {bannerPhotos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {bannerPhotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentSlide ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Admin: subtle indicator to manage banner from Admin page */}
        {isAdmin && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'admin' }))}
              className="bg-black/40 hover:bg-black/60 backdrop-blur text-white/80 hover:text-white border border-white/20 text-xs rounded-full h-7 px-3 flex items-center gap-1.5 transition-all"
            >
              <Camera className="size-3" /> Manage Banner Photos
            </button>
          </div>
        )}

        {/* Hero text content */}
        <div className="absolute inset-0 flex items-center z-10">
          <div className="container mx-auto px-6 md:px-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-white/90">Season 2026 Now Open</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 leading-[1.1] tracking-tight drop-shadow-lg">
                Adamstown
              </h1>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 leading-[1.1] tracking-tight drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-red-400">
                Cricket Club
              </h1>

              <p className="text-base md:text-lg text-white/85 max-w-lg mb-8 leading-relaxed drop-shadow">
                A proud tradition of cricket excellence since 1950. Nurturing talent 
                across adults, youth, and ladies cricket in the heart of Leinster.
              </p>

              <div className="flex flex-wrap gap-3">
                <Button 
                  size="lg" 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3 rounded-lg shadow-lg shadow-red-900/40 transition-all hover:shadow-xl"
                  onClick={() => navigate('fixtures')}
                >
                  View Fixtures
                </Button>
                <Button 
                  size="lg" 
                  className="bg-white hover:bg-gray-100 text-slate-900 font-bold px-7 py-3 rounded-lg shadow-lg transition-all hover:shadow-xl"
                  onClick={() => navigate('login')}
                >
                  Join Our Club
                </Button>
                <Button 
                  size="lg" 
                  className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-7 py-3 rounded-lg shadow-lg transition-all"
                  onClick={() => navigate('club-flyer')}
                >
                  <FileText className="size-4 mr-1.5" /> Club Flyer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Photo caption */}
        {bannerPhotos.length > 0 && bannerPhotos[currentSlide]?.caption && (
          <div className="absolute bottom-4 right-4 z-20 text-white/40 text-xs backdrop-blur-sm bg-black/20 rounded px-2 py-1 flex items-center gap-1">
            <Camera className="size-3" /> {bannerPhotos[currentSlide].caption}
          </div>
        )}
      </div>

      {/* ===== LIVE STATS COUNTERS ===== */}
      <div className="relative -mt-16 z-10 px-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto">
          {statItems.map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <Card key={i} className="bg-white shadow-xl border border-slate-100 rounded-xl overflow-hidden hover:shadow-2xl transition-shadow">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${stat.color} text-white mb-3`}>
                    <StatIcon className="size-5 md:size-6" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1 tracking-wide uppercase">{stat.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ===== ABOUT + INFO ===== */}
      <div className="grid md:grid-cols-2 gap-5 mt-12">
        <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-700 to-red-900" />
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <Landmark className="size-5 text-red-800" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">About Our Club</h3>
            </div>
            <p className="text-slate-600 mb-4 leading-relaxed text-sm">
              Adamstown Cricket Club has been a cornerstone of local cricket for over 70 years. 
              We pride ourselves on fostering talent, promoting sportsmanship, and creating a 
              welcoming environment for players of all ages and skill levels.
            </p>
            <p className="text-slate-600 leading-relaxed text-sm">
              From competitive adult leagues to our thriving youth academy and ladies cricket, 
              we offer pathways for everyone who shares our passion for the game.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Cricket Leinster', 'Youth Development', 'Ladies Cricket', 'All Abilities'].map(tag => (
                <Badge key={tag} variant="outline" className="border-slate-200 text-slate-600 font-medium text-xs rounded-md">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <BarChart3 className="size-5 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Club at a Glance</h3>
            </div>
            <div className="space-y-0">
              {([
                { label: 'Established', value: '1950', icon: Calendar },
                { label: 'Home Ground', value: clubStats?.grounds.names[0] || 'Adamstown Oval', icon: MapPin },
                { label: "Men's Teams", value: clubStats?.adultTeams.mens || 2, icon: Trophy },
                { label: "Women's Teams", value: clubStats?.adultTeams.womens || 1, icon: Award },
                { label: 'Youth Teams', value: clubStats?.youthTeams.count || 7, icon: Zap },
                { label: 'Contact', value: 'info@adamstowncc.com', icon: Mail },
              ] as const).map((item, i) => {
                const ItemIcon = item.icon;
                return (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-600 flex items-center gap-2.5 text-sm">
                      <ItemIcon className="size-4 text-slate-400" /> {item.label}
                    </span>
                    <span className="text-slate-900 font-semibold text-sm">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== WHY JOIN US ===== */}
      <div className="mt-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight mb-2">Why Join Adamstown CC?</h2>
          <p className="text-slate-500 text-sm">Something for everyone — from beginners to seasoned players</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {([
            { icon: Trophy, title: 'Competitive Cricket', desc: 'Play in Cricket Leinster leagues across multiple divisions', color: 'bg-red-800', bg: 'bg-red-50', border: 'border-red-100' },
            { icon: Star, title: 'Youth Academy', desc: 'Structured coaching for Under 7 to Under 19 age groups', color: 'bg-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
            { icon: Heart, title: 'Ladies Cricket', desc: 'Growing women\'s cricket with dedicated teams and coaching', color: 'bg-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
            { icon: Users, title: 'Community Spirit', desc: 'Social events, friendships, and a welcoming club culture', color: 'bg-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          ] as const).map((item, i) => {
            const ItemIcon = item.icon;
            return (
              <Card key={i} className="group shadow-sm border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
                <CardContent className="p-6">
                  <div className={`w-11 h-11 rounded-xl ${item.bg} ${item.border} border flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <ItemIcon className={`size-5 ${item.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900 mb-1.5 tracking-tight">{item.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ===== UPCOMING SEASON QUICK VIEW ===== */}
      <div className="mt-14 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2 tracking-tight">2026 Season</h2>
              <p className="text-slate-400 text-sm md:text-base">The pitch is calling — are you ready?</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3.5 text-center min-w-[110px] border border-white/10">
                <div className="text-xl font-bold text-white">April</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Season Start</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3.5 text-center min-w-[110px] border border-white/10">
                <div className="text-xl font-bold text-white">September</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Season End</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3.5 text-center min-w-[110px] border border-white/10">
                <div className="text-xl font-bold text-white">{clubStats?.upcomingFixtures || '—'}</div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">Upcoming</div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button 
              className="bg-white hover:bg-gray-100 text-slate-900 font-semibold rounded-lg px-5 shadow-lg"
              onClick={() => navigate('fixtures')}
            >
              <Calendar className="size-4 mr-1.5" /> View Full Schedule
            </Button>
            <Button 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10 rounded-lg px-5"
              onClick={() => navigate('results')}
            >
              <BarChart3 className="size-4 mr-1.5" /> Latest Results
            </Button>
          </div>
        </div>
      </div>

      {/* ===== SPONSORS ===== */}
      <div className="mt-14 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Heart className="size-4" /> Our Sponsors
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setEditMode(!editMode); if (!editMode) fetchSponsors(); }}
                  className="rounded-lg text-xs h-7"
                >
                  {editMode ? <><Save className="size-3 mr-1" /> Done</> : <><Pencil className="size-3 mr-1" /> Edit</>}
                </Button>
                {editMode && (
                  <Button size="sm" className="rounded-lg text-xs h-7 bg-emerald-600 hover:bg-emerald-700" onClick={openAddDialog}>
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {sponsors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sponsorship opportunities available — info@adamstowncc.com</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {sponsors.map(sponsor => (
                <div key={sponsor.id} className="group relative flex flex-col items-center gap-1 min-w-[100px] max-w-[140px]">
                  {editMode && (
                    <div className="absolute -top-2 -right-2 flex gap-0.5 z-10">
                      <button onClick={() => openEditDialog(sponsor)} className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"><Pencil className="size-3" /></button>
                      <button onClick={() => deleteSponsor(sponsor.id)} className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700"><X className="size-3" /></button>
                    </div>
                  )}
                  <div className="h-12 w-24 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:shadow transition-shadow">
                    {sponsor.logo ? (
                      <img src={sponsor.logo} alt={sponsor.name} className="max-h-10 max-w-20 object-contain" />
                    ) : (
                      <Landmark className="size-5 text-slate-300" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{sponsor.name}</span>
                  {sponsor.website && (
                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"><ExternalLink className="size-2.5" /> Visit</a>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-400 mt-3 border-t border-slate-100 pt-2">
              Thank you to our sponsors for supporting Adamstown Cricket Club
            </p>
          </div>
        )}
      </div>

      {/* ===== SPONSOR DIALOG ===== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Sponsor Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company name" />
            </div>

            {/* Logo Upload / URL */}
            <div>
              <Label className="mb-2 block">Sponsor Logo</Label>
              {/* Preview */}
              <div className="flex items-center gap-4 mb-3">
                <div className="h-20 w-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo preview" className="max-h-16 max-w-28 object-contain" />
                  ) : (
                    <span className="text-gray-400 text-sm text-center">No logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="size-3 mr-1" /> {logoUploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  {form.logo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={() => setForm({ ...form, logo: '' })}
                    >
                      <X className="size-3 mr-1" /> Remove Logo
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span>or paste URL</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Input
                value={form.logo.startsWith('data:') ? '' : form.logo}
                onChange={e => setForm({ ...form, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="text-sm"
              />
            </div>

            <div>
              <Label>Thank You Message</Label>
              <Input value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Proud to support..." />
            </div>
            <div>
              <Label>Sponsorship Tier</Label>
              <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveSponsor} disabled={logoUploading}><Save className="size-4 mr-1.5" /> Save Sponsor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}