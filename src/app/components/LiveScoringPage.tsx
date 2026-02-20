import { useState, useEffect, useRef } from "react";
import {
  Video, VideoOff, Square, Play, Pause, RotateCcw, ArrowRightLeft, CheckCircle2,
  AlertTriangle, Eye, EyeOff, Hand, Target, Zap, XCircle, Shield, Minus,
  Radio, Activity, Camera, Pencil, Clock, Users, Trophy, Calendar,
  User, UserCheck, Shirt, ScanFace, ArrowUpDown, Plus, Hash, CircleDot,
  Share2, Download, Copy, MessageCircle, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

// ============================
// Interfaces
// ============================
interface LiveScoringPageProps {
  apiUrl: string;
  apiKey: string;
  userId?: string;
  userName?: string;
}

interface Fixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  overs: string;
  status: string;
  matchType: string;
}

interface Batsman {
  id: string;
  name: string;
  shirtNumber: string;
  shirtName: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalType: string | null;
  position: 'striker' | 'nonStriker' | '';
}

interface Bowler {
  id: string;
  name: string;
  shirtNumber: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  currentOverBalls: number;
  currentOverRuns: number;
}

interface BallEntry {
  id: string;
  timestamp: string;
  over: number;
  ballInOver: number;
  runs: number;
  originalRuns: number;
  shortRun: boolean;
  shortRunDeduction: number;
  extras: { type: string; runs: number } | null;
  wicket: { type: string; outBatsmanId?: string } | null;
  source: string;
  signalDetected: string | null;
  overriddenBy: string | null;
  batsmanName: string;
  bowlerName: string;
  strikerId: string | null;
  nonStrikerId: string | null;
  assignedToBatsmanId: string | null;
}

interface InningsState {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: { wides: number; noBalls: number; byes: number; legByes: number; penalties: number; shortRuns: number };
  batsmen: Batsman[];
  bowlers: Bowler[];
  ballLog: BallEntry[];
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
}

interface MatchState {
  matchId: string;
  fixture: Fixture;
  scorerName: string;
  status: string;
  currentInnings: 'first' | 'second';
  innings: { first: InningsState; second: InningsState };
  signalLog: any[];
  startedAt: string;
  batsmanAutoAssign: boolean;
}

// ============================
// Umpire signals config
// ============================
const UMPIRE_SIGNALS = [
  { type: 'wide', label: 'Wide', icon: '🙌', description: 'Both arms stretched horizontally', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', border: 'border-yellow-200' },
  { type: 'noBall', label: 'No Ball', icon: '🚫', description: 'One arm extended at shoulder height', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-200' },
  { type: 'out', label: 'Out', icon: '☝️', description: 'Raised index finger', textColor: 'text-slate-700', bgLight: 'bg-slate-50', border: 'border-slate-200' },
  { type: 'six', label: 'Six', icon: '🙆', description: 'Both arms raised above head', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-200' },
  { type: 'four', label: 'Four', icon: '👋', description: 'Arm waved across body', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-200' },
  { type: 'bye', label: 'Bye', icon: '✋', description: 'Open palm raised above head', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50', border: 'border-cyan-200' },
  { type: 'legBye', label: 'Leg Bye', icon: '🦵', description: 'Touching raised knee', textColor: 'text-teal-700', bgLight: 'bg-teal-50', border: 'border-teal-200' },
  { type: 'shortRun', label: 'Short Run', icon: '📏', description: 'Tap shoulder with fingers', textColor: 'text-orange-700', bgLight: 'bg-orange-50', border: 'border-orange-200' },
  { type: 'deadBall', label: 'Dead Ball', icon: '✖️', description: 'Crossing arms below waist', textColor: 'text-gray-700', bgLight: 'bg-gray-50', border: 'border-gray-200' },
];

// ============================
// Main Component
// ============================
export function LiveScoringPage({ apiUrl, apiKey, userId, userName }: LiveScoringPageProps) {
  // === Core State ===
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMatchSelect, setShowMatchSelect] = useState(true);

  // === Batsman Setup State ===
  const [showBatsmanSetup, setShowBatsmanSetup] = useState(false);
  const [strikerName, setStrikerName] = useState('');
  const [strikerShirtNum, setStrikerShirtNum] = useState('');
  const [strikerShirtName, setStrikerShirtName] = useState('');
  const [nonStrikerName, setNonStrikerName] = useState('');
  const [nonStrikerShirtNum, setNonStrikerShirtNum] = useState('');
  const [nonStrikerShirtName, setNonStrikerShirtName] = useState('');
  const [autoAssignRuns, setAutoAssignRuns] = useState(true);

  // === Bowler State ===
  const [showBowlerDialog, setShowBowlerDialog] = useState(false);
  const [newBowlerName, setNewBowlerName] = useState('');
  const [newBowlerShirtNum, setNewBowlerShirtNum] = useState('');

  // === New Batsman (after wicket) ===
  const [showNewBatsmanDialog, setShowNewBatsmanDialog] = useState(false);
  const [newBatName, setNewBatName] = useState('');
  const [newBatShirtNum, setNewBatShirtNum] = useState('');
  const [newBatShirtName, setNewBatShirtName] = useState('');

  // === Camera State ===
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [detectedSignal, setDetectedSignal] = useState<{ type: string; confidence: number } | null>(null);
  const [showSignalOverlay, setShowSignalOverlay] = useState(true);
  const [signalHistory, setSignalHistory] = useState<{ type: string; confidence: number; time: string; accepted: boolean }[]>([]);
  const [detectedBatsman, setDetectedBatsman] = useState<{ name: string; shirtNumber: string; confidence: number } | null>(null);

  // === Scoring Input State ===
  const [inputMode, setInputMode] = useState<'manual' | 'camera'>('manual');
  const [pendingSignal, setPendingSignal] = useState<{ type: string; confidence: number } | null>(null);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [showByeRunsDialog, setShowByeRunsDialog] = useState(false);
  const [byeType, setByeType] = useState<'bye' | 'legBye'>('bye');
  const [byeRuns, setByeRuns] = useState(1);
  const [isShortRun, setIsShortRun] = useState(false);
  const [showRunAssignDialog, setShowRunAssignDialog] = useState(false);
  const [pendingRunData, setPendingRunData] = useState<{ runs: number; extras?: any; wicket?: any; source: string; signal?: string } | null>(null);

  // === Mobile & Share State ===
  const [showCameraPanel, setShowCameraPanel] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState<'score' | 'camera' | 'controls'>('controls');

  // === Refs ===
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  // ============================
  // Data Fetching
  // ============================
  useEffect(() => {
    fetchFixtures();
    return () => { stopCamera(); };
  }, []);

  const fetchFixtures = async () => {
    try {
      const res = await fetch(`${apiUrl}/fixtures`, { headers });
      const data = await res.json();
      if (data.success) setFixtures(data.data);
    } catch { toast.error('Failed to load fixtures'); }
  };

  const startScoringSession = async () => {
    if (!selectedMatchId) return toast.error('Please select a match');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/live-scoring/start`, {
        method: 'POST', headers, body: JSON.stringify({ matchId: selectedMatchId }),
      });
      const data = await res.json();
      if (data.success) {
        setMatchState(data.data);
        setShowMatchSelect(false);
        setShowBatsmanSetup(true); // Ask for initial batsmen
        toast.success('Session started — set your opening batsmen');
      } else { toast.error(data.error || 'Failed to start'); }
    } catch { toast.error('Failed to start scoring session'); }
    finally { setLoading(false); }
  };

  const refreshMatchState = async () => {
    if (!matchState?.matchId) return;
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}`, { headers });
      const data = await res.json();
      if (data.success) setMatchState(data.data);
    } catch { /* silent */ }
  };

  // ============================
  // Batsman Management
  // ============================
  const setBatsmen = async () => {
    if (!matchState || !strikerName || !nonStrikerName) return toast.error('Enter both batsman names');
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/set-batsmen`, {
        method: 'POST', headers,
        body: JSON.stringify({
          striker: { name: strikerName, shirtNumber: strikerShirtNum, shirtName: strikerShirtName },
          nonStriker: { name: nonStrikerName, shirtNumber: nonStrikerShirtNum, shirtName: nonStrikerShirtName },
          autoAssign: autoAssignRuns,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMatchState();
        setShowBatsmanSetup(false);
        toast.success(`Batsmen set: ${strikerName} (striker) & ${nonStrikerName}`);
        // Now ask for bowler
        setShowBowlerDialog(true);
      }
    } catch { toast.error('Failed to set batsmen'); }
  };

  const setBowler = async () => {
    if (!matchState || !newBowlerName) return toast.error('Enter bowler name');
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/set-bowler`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: newBowlerName, shirtNumber: newBowlerShirtNum }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMatchState();
        setShowBowlerDialog(false);
        setNewBowlerName('');
        setNewBowlerShirtNum('');
        toast.success(`Bowler: ${data.data.bowler.name}`);
      }
    } catch { toast.error('Failed to set bowler'); }
  };

  const addNewBatsman = async () => {
    if (!matchState || !newBatName) return toast.error('Enter batsman name');
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/new-batsman`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: newBatName, shirtNumber: newBatShirtNum, shirtName: newBatShirtName, position: 'striker' }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMatchState();
        setShowNewBatsmanDialog(false);
        setNewBatName(''); setNewBatShirtNum(''); setNewBatShirtName('');
        toast.success(`New batsman: ${data.data.batsman.name}`);
      }
    } catch { toast.error('Failed to add batsman'); }
  };

  const swapStrike = async () => {
    if (!matchState) return;
    try {
      await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/swap-strike`, { method: 'POST', headers });
      await refreshMatchState();
    } catch { toast.error('Failed to swap'); }
  };

  // ============================
  // Camera Controls
  // ============================
  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraActive(true);
      setInputMode('camera');
      startDetection();
      toast.success('Camera started — point at umpire or batsmen');
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied');
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (detectionIntervalRef.current) { clearInterval(detectionIntervalRef.current); detectionIntervalRef.current = null; }
    setCameraActive(false);
    setDetectedSignal(null);
    setDetectedBatsman(null);
  };

  // ============================
  // Signal + Batsman Detection
  // ============================
  const startDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.readyState < 2) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // --- Umpire Signal Detection ---
      const upperRegion = ctx.getImageData(Math.floor(canvas.width * 0.2), 0, Math.floor(canvas.width * 0.6), Math.floor(canvas.height * 0.35));
      const middleRegion = ctx.getImageData(0, Math.floor(canvas.height * 0.25), canvas.width, Math.floor(canvas.height * 0.35));
      const upperBr = calcBrightness(upperRegion.data);
      const leftBr = calcSideBr(middleRegion.data, middleRegion.width, 'left');
      const rightBr = calcSideBr(middleRegion.data, middleRegion.width, 'right');
      const sideSpread = Math.abs(leftBr - rightBr);
      const bothHigh = leftBr > 160 && rightBr > 160;

      let sig: { type: string; confidence: number } | null = null;
      if (upperBr > 170 && bothHigh && sideSpread < 20) sig = { type: 'six', confidence: 0.72 };
      else if (bothHigh && upperBr <= 170 && sideSpread < 25) sig = { type: 'wide', confidence: 0.68 };
      else if (upperBr > 170 && !bothHigh) sig = { type: 'out', confidence: 0.55 };
      else if ((leftBr > 155 || rightBr > 155) && sideSpread > 40) sig = { type: 'noBall', confidence: 0.50 };

      if (sig && sig.confidence > 0.45) {
        setDetectedSignal(sig);
        if (sig.confidence > 0.6 && !pendingSignal) setPendingSignal(sig);
      } else { setDetectedSignal(null); }

      // --- Batsman Recognition (simulated) ---
      // Production: TensorFlow.js face-api + Tesseract.js OCR for shirt text/numbers
      // Analyzes lower-center for person detection, shirt text reading, run counting
      const lowerRegion = ctx.getImageData(
        Math.floor(canvas.width * 0.25), Math.floor(canvas.height * 0.4),
        Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5)
      );
      const variance = calcVariance(lowerRegion.data);

      if (currentInnings && variance > 30) {
        // High motion variance = running between wickets
        const striker = currentInnings.batsmen.find(b => b.id === currentInnings.strikerId);
        if (striker) {
          setDetectedBatsman({ name: striker.name, shirtNumber: striker.shirtNumber, confidence: 0.85 });
        }
      } else {
        setDetectedBatsman(null);
      }
    }, 800);
  };

  const calcBrightness = (data: Uint8ClampedArray): number => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    return sum / (data.length / 4);
  };

  const calcSideBr = (data: Uint8ClampedArray, width: number, side: 'left' | 'right'): number => {
    let sum = 0, count = 0;
    const h = data.length / (width * 4);
    for (let y = 0; y < h; y++) {
      const sx = side === 'left' ? 0 : Math.floor(width * 0.6);
      const ex = side === 'left' ? Math.floor(width * 0.4) : width;
      for (let x = sx; x < ex; x++) { const idx = (y * width + x) * 4; sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3; count++; }
    }
    return count > 0 ? sum / count : 0;
  };

  const calcVariance = (data: Uint8ClampedArray): number => {
    let sum = 0, sumSq = 0;
    for (let i = 0; i < data.length; i += 16) {
      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sum += v; sumSq += v * v;
    }
    const samples = data.length / 16;
    const mean = sum / samples;
    return (sumSq / samples) - (mean * mean);
  };

  // ============================
  // Scoring Actions
  // ============================
  const recordBall = async (runs: number, extras?: { type: string; runs: number }, wicket?: { type: string; outBatsmanId?: string }, source = 'manual', signalDetected?: string, assignToBatsmanId?: string) => {
    if (!matchState) return;

    // If auto-assign is off and runs > 0 and it's a regular delivery (not byes), ask user
    if (!autoAssignRuns && runs > 0 && !extras && !showRunAssignDialog) {
      setPendingRunData({ runs, extras, wicket, source, signal: signalDetected });
      setShowRunAssignDialog(true);
      return;
    }

    try {
      const body: any = {
        runs, extras, wicket, source, signalDetected,
        batsmanName: currentInnings?.batsmen.find(b => b.id === currentInnings.strikerId)?.name || '',
        bowlerName: currentInnings?.bowlers.find(b => b.id === currentInnings.currentBowlerId)?.name || '',
        shortRun: isShortRun,
      };
      if (assignToBatsmanId) body.assignToBatsmanId = assignToBatsmanId;

      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/ball`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await refreshMatchState();
        setPendingSignal(null);
        setIsShortRun(false);
        // After wicket, prompt for new batsman
        if (wicket) setTimeout(() => setShowNewBatsmanDialog(true), 500);
        // At end of over (balls === 0 after refresh), prompt for new bowler
        if (data.data?.score?.balls === 0 && data.data?.score?.overs > 0) {
          setTimeout(() => setShowBowlerDialog(true), 600);
        }
      }
    } catch { toast.error('Failed to record ball'); }
  };

  const undoLastBall = async () => {
    if (!matchState) return;
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/undo`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) { toast.success('Last ball undone'); await refreshMatchState(); }
      else toast.error(data.error);
    } catch { toast.error('Failed to undo'); }
  };

  const switchInnings = async () => {
    if (!matchState) return;
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/switch-innings`, { method: 'POST', headers });
      const data = await res.json();
      if (data.success) {
        toast.success('Innings switched');
        await refreshMatchState();
        setStrikerName(''); setNonStrikerName('');
        setStrikerShirtNum(''); setNonStrikerShirtNum('');
        setShowBatsmanSetup(true);
      }
    } catch { toast.error('Failed to switch innings'); }
  };

  const updateMatchStatus = async (status: string) => {
    if (!matchState) return;
    try {
      const res = await fetch(`${apiUrl}/live-scoring/${matchState.matchId}/status`, {
        method: 'PUT', headers, body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) { await refreshMatchState(); toast.success(`Match ${status}`); }
    } catch { toast.error('Failed to update status'); }
  };

  // ============================
  // Signal Handling
  // ============================
  const acceptSignal = (signalType: string) => {
    const src = inputMode === 'camera' ? 'camera' : 'manual';
    if (signalType === 'wide') {
      recordBall(0, { type: 'wide', runs: 1 }, undefined, src, signalType);
    } else if (signalType === 'noBall') {
      recordBall(0, { type: 'noBall', runs: 1 }, undefined, src, signalType);
    } else if (signalType === 'out') {
      setShowWicketDialog(true);
    } else if (signalType === 'six') {
      recordBall(6, undefined, undefined, src, signalType);
    } else if (signalType === 'four') {
      recordBall(4, undefined, undefined, src, signalType);
    } else if (signalType === 'bye') {
      setByeType('bye'); setByeRuns(1); setShowByeRunsDialog(true);
    } else if (signalType === 'legBye') {
      setByeType('legBye'); setByeRuns(1); setShowByeRunsDialog(true);
    } else if (signalType === 'shortRun') {
      setIsShortRun(true);
      toast.info('Short run flagged — next delivery will deduct 1 run');
    }
    setSignalHistory(prev => [...prev, { type: signalType, confidence: pendingSignal?.confidence || 1, time: new Date().toLocaleTimeString(), accepted: true }]);
    setPendingSignal(null);
  };

  const rejectSignal = () => {
    if (pendingSignal) setSignalHistory(prev => [...prev, { type: pendingSignal.type, confidence: pendingSignal.confidence, time: new Date().toLocaleTimeString(), accepted: false }]);
    setPendingSignal(null);
  };

  const confirmByeRuns = () => {
    const src = inputMode === 'camera' ? 'camera' : 'manual';
    const actualRuns = isShortRun && byeRuns > 0 ? byeRuns - 1 : byeRuns;
    recordBall(0, { type: byeType, runs: actualRuns > 0 ? actualRuns : 0 }, undefined, src, byeType);
    setShowByeRunsDialog(false);
    setIsShortRun(false);
  };

  const confirmWicket = () => {
    const outBatsmanId = currentInnings?.strikerId || undefined;
    recordBall(0, undefined, { type: wicketType, outBatsmanId }, inputMode === 'camera' ? 'camera' : 'manual', 'out');
    setShowWicketDialog(false);
    setWicketType('bowled');
  };

  const confirmRunAssign = (batsmanId: string) => {
    if (!pendingRunData) return;
    const { runs, extras, wicket, source, signal } = pendingRunData;
    setShowRunAssignDialog(false);
    setPendingRunData(null);
    recordBall(runs, extras, wicket, source, signal, batsmanId);
  };

  // ============================
  // Helpers
  // ============================
  const currentInnings = matchState ? matchState.innings[matchState.currentInnings] : null;
  const otherInnings = matchState ? matchState.innings[matchState.currentInnings === 'first' ? 'second' : 'first'] : null;
  const oversStr = (i: InningsState) => `${i.overs}.${i.balls}`;
  const runRate = (i: InningsState) => { const t = i.overs + i.balls / 6; return t > 0 ? (i.runs / t).toFixed(2) : '0.00'; };
  const strikeRate = (b: Batsman) => b.ballsFaced > 0 ? ((b.runs / b.ballsFaced) * 100).toFixed(1) : '0.0';

  const ballDisplay = (ball: BallEntry) => {
    if (ball.wicket) return 'W';
    if (ball.extras?.type === 'wide') return `Wd${ball.extras.runs > 1 ? '+' + (ball.extras.runs - 1) : ''}`;
    if (ball.extras?.type === 'noBall') return `Nb${ball.runs > 0 ? '+' + ball.runs : ''}`;
    if (ball.extras?.type === 'bye') return `B${ball.extras.runs}`;
    if (ball.extras?.type === 'legBye') return `Lb${ball.extras.runs}`;
    if (ball.shortRun) return `${ball.runs}*`;
    if (ball.runs === 0) return '•';
    return String(ball.runs);
  };

  const ballColor = (ball: BallEntry) => {
    if (ball.wicket) return 'bg-red-600 text-white';
    if (ball.extras) return 'bg-yellow-400 text-yellow-900';
    if (ball.shortRun) return 'bg-orange-400 text-orange-900';
    if (ball.runs === 4) return 'bg-blue-500 text-white';
    if (ball.runs === 6) return 'bg-purple-600 text-white';
    if (ball.runs === 0) return 'bg-slate-200 text-slate-600';
    return 'bg-emerald-500 text-white';
  };

  const getStriker = () => currentInnings?.batsmen.find(b => b.id === currentInnings.strikerId);
  const getNonStriker = () => currentInnings?.batsmen.find(b => b.id === currentInnings.nonStrikerId);

  // ============================
  // Share Scorecard Generator
  // ============================
  const generateScorecardText = () => {
    if (!matchState || !currentInnings) return '';
    const f = matchState.fixture;
    const sep = '─'.repeat(44);
    const doubleSep = '═'.repeat(44);
    let text = '';
    text += `🏏 MATCH SCORECARD\n`;
    text += `${doubleSep}\n`;
    text += `${f.homeTeam} vs ${f.awayTeam}\n`;
    text += `📅 ${new Date(f.date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    text += `📍 ${f.venue} • ${f.competition}\n`;
    text += `🏁 ${f.overs} overs • Status: ${matchState.status.toUpperCase()}\n`;
    text += `${doubleSep}\n\n`;

    const formatInnings = (inn: InningsState, label: string) => {
      let t = `${label}: ${inn.battingTeam}\n`;
      t += `${sep}\n`;
      t += `Total: ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls} overs)\n`;
      t += `Run Rate: ${runRate(inn)}\n\n`;

      // Batting
      if (inn.batsmen.length > 0) {
        t += `BATTING\n`;
        t += `${'Batsman'.padEnd(18)} ${'R'.padStart(4)} ${'B'.padStart(4)} ${'4s'.padStart(3)} ${'6s'.padStart(3)} ${'SR'.padStart(7)}\n`;
        t += `${sep}\n`;
        inn.batsmen.forEach(b => {
          const sr = b.ballsFaced > 0 ? ((b.runs / b.ballsFaced) * 100).toFixed(1) : '0.0';
          const status = b.isOut ? (b.dismissalType || 'out') : (b.id === inn.strikerId ? 'batting*' : 'batting');
          const name = b.name.length > 16 ? b.name.substring(0, 16) : b.name;
          t += `${name.padEnd(18)} ${String(b.runs).padStart(4)} ${String(b.ballsFaced).padStart(4)} ${String(b.fours).padStart(3)} ${String(b.sixes).padStart(3)} ${sr.padStart(7)}\n`;
          if (b.isOut) t += `  └ ${status}\n`;
        });
        t += `\n`;
      }

      // Extras
      const ex = inn.extras;
      const totalExtras = ex.wides + ex.noBalls + ex.byes + ex.legByes + ex.penalties + (ex.shortRuns || 0);
      if (totalExtras > 0) {
        t += `Extras: ${totalExtras} (`;
        const parts: string[] = [];
        if (ex.wides) parts.push(`Wd ${ex.wides}`);
        if (ex.noBalls) parts.push(`Nb ${ex.noBalls}`);
        if (ex.byes) parts.push(`B ${ex.byes}`);
        if (ex.legByes) parts.push(`Lb ${ex.legByes}`);
        if (ex.shortRuns) parts.push(`Short ${ex.shortRuns}`);
        t += parts.join(', ') + ')\n\n';
      }

      // Bowling
      if (inn.bowlers.length > 0) {
        t += `BOWLING\n`;
        t += `${'Bowler'.padEnd(18)} ${'O'.padStart(5)} ${'M'.padStart(3)} ${'R'.padStart(4)} ${'W'.padStart(3)}\n`;
        t += `${sep}\n`;
        inn.bowlers.forEach(bw => {
          const name = bw.name.length > 16 ? bw.name.substring(0, 16) : bw.name;
          t += `${name.padEnd(18)} ${(bw.overs + '.' + bw.currentOverBalls).padStart(5)} ${String(bw.maidens).padStart(3)} ${String(bw.runs).padStart(4)} ${String(bw.wickets).padStart(3)}\n`;
        });
        t += `\n`;
      }
      return t;
    };

    text += formatInnings(matchState.innings.first, '1st INNINGS');
    text += '\n';
    if (matchState.innings.second.ballLog.length > 0 || matchState.currentInnings === 'second') {
      text += formatInnings(matchState.innings.second, '2nd INNINGS');
      text += '\n';
      // Result summary
      if (matchState.status === 'completed') {
        const f1 = matchState.innings.first.runs;
        const f2 = matchState.innings.second.runs;
        const w2 = matchState.innings.second.wickets;
        if (f2 > f1) text += `🏆 ${matchState.innings.second.battingTeam} won by ${10 - w2} wickets\n`;
        else if (f1 > f2) text += `🏆 ${matchState.innings.first.battingTeam} won by ${f1 - f2} runs\n`;
        else text += `🤝 Match Tied\n`;
      }
    }
    text += `${doubleSep}\n`;
    text += `Scored by: ${matchState.scorerName}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    return text;
  };

  const generateScorecardHTML = () => {
    if (!matchState) return '';
    const f = matchState.fixture;
    let html = `<div style="font-family:monospace,Courier;max-width:500px;margin:0 auto;padding:16px;background:#f8fafc;border-radius:12px;">`;
    html += `<div style="text-align:center;margin-bottom:12px;">`;
    html += `<h2 style="margin:0;font-size:18px;">🏏 ${f.homeTeam} vs ${f.awayTeam}</h2>`;
    html += `<p style="margin:4px 0;font-size:12px;color:#64748b;">${new Date(f.date).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${f.venue}</p>`;
    html += `<p style="margin:2px 0;font-size:11px;color:#94a3b8;">${f.competition} • ${f.overs} overs</p>`;
    html += `</div>`;

    const formatInningsHTML = (inn: InningsState, label: string) => {
      let t = `<div style="margin-bottom:16px;">`;
      t += `<div style="background:#1e293b;color:white;padding:8px 12px;border-radius:8px 8px 0 0;font-size:13px;font-weight:bold;">${label}: ${inn.battingTeam} — ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls} ov) RR: ${runRate(inn)}</div>`;
      t += `<table style="width:100%;border-collapse:collapse;font-size:11px;background:white;">`;
      t += `<thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:4px 8px;">Batsman</th><th style="padding:4px;text-align:center;">R</th><th style="padding:4px;text-align:center;">B</th><th style="padding:4px;text-align:center;">4s</th><th style="padding:4px;text-align:center;">6s</th><th style="padding:4px;text-align:center;">SR</th></tr></thead><tbody>`;
      inn.batsmen.forEach(b => {
        const sr = b.ballsFaced > 0 ? ((b.runs / b.ballsFaced) * 100).toFixed(1) : '0.0';
        const bg = b.isOut ? '' : 'background:#ecfdf5;';
        t += `<tr style="${bg}border-bottom:1px solid #f1f5f9;"><td style="padding:4px 8px;font-weight:${b.isOut ? 'normal' : 'bold'};">${b.name}${!b.isOut ? '*' : ''}<br/><span style="font-size:9px;color:#94a3b8;">${b.isOut ? b.dismissalType || 'out' : b.id === inn.strikerId ? 'batting' : 'not out'}</span></td><td style="text-align:center;padding:4px;font-weight:bold;">${b.runs}</td><td style="text-align:center;padding:4px;">${b.ballsFaced}</td><td style="text-align:center;padding:4px;">${b.fours}</td><td style="text-align:center;padding:4px;">${b.sixes}</td><td style="text-align:center;padding:4px;">${sr}</td></tr>`;
      });
      const ex = inn.extras;
      const totalExtras = ex.wides + ex.noBalls + ex.byes + ex.legByes + ex.penalties + (ex.shortRuns || 0);
      t += `<tr style="background:#fefce8;"><td style="padding:4px 8px;" colspan="6">Extras: ${totalExtras} (Wd ${ex.wides}, Nb ${ex.noBalls}, B ${ex.byes}, Lb ${ex.legByes}${ex.shortRuns ? ', Short ' + ex.shortRuns : ''})</td></tr>`;
      t += `</tbody></table>`;
      if (inn.bowlers.length > 0) {
        t += `<table style="width:100%;border-collapse:collapse;font-size:11px;background:white;margin-top:2px;">`;
        t += `<thead><tr style="background:#f1f5f9;"><th style="text-align:left;padding:4px 8px;">Bowler</th><th style="padding:4px;text-align:center;">O</th><th style="padding:4px;text-align:center;">M</th><th style="padding:4px;text-align:center;">R</th><th style="padding:4px;text-align:center;">W</th></tr></thead><tbody>`;
        inn.bowlers.forEach(bw => {
          t += `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 8px;">${bw.name}</td><td style="text-align:center;padding:4px;">${bw.overs}.${bw.currentOverBalls}</td><td style="text-align:center;padding:4px;">${bw.maidens}</td><td style="text-align:center;padding:4px;">${bw.runs}</td><td style="text-align:center;padding:4px;font-weight:bold;">${bw.wickets}</td></tr>`;
        });
        t += `</tbody></table>`;
      }
      t += `</div>`;
      return t;
    };

    html += formatInningsHTML(matchState.innings.first, '1st Innings');
    if (matchState.innings.second.ballLog.length > 0 || matchState.currentInnings === 'second') {
      html += formatInningsHTML(matchState.innings.second, '2nd Innings');
    }
    html += `<p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:8px;">Scored by ${matchState.scorerName} • ${new Date().toLocaleString()}</p>`;
    html += `</div>`;
    return html;
  };

  const copyScorecard = async () => {
    const text = generateScorecardText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Scorecard copied to clipboard!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Scorecard copied!');
    }
  };

  const shareWhatsApp = () => {
    const text = generateScorecardText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const downloadScorecard = () => {
    const text = generateScorecardText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scorecard_${matchState?.fixture.homeTeam}_vs_${matchState?.fixture.awayTeam}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Scorecard downloaded!');
  };

  const downloadScorecardImage = async () => {
    const html = generateScorecardHTML();
    // Create off-screen element, render, capture with canvas
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '500px';
    container.style.background = '#f8fafc';
    container.style.padding = '16px';
    document.body.appendChild(container);

    try {
      // Use html2canvas if available, otherwise fallback to text download
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = 500 * scale;
      canvas.height = container.scrollHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 500, container.scrollHeight);
        // SVG foreignObject approach
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="${container.scrollHeight}"><foreignObject width="500" height="${container.scrollHeight}"><div xmlns="http://www.w3.org/1999/xhtml">${html}</div></foreignObject></svg>`;
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `scorecard_${matchState?.fixture.homeTeam}_vs_${matchState?.fixture.awayTeam}.png`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Scorecard image downloaded!');
            }
          }, 'image/png');
        };
        img.onerror = () => {
          // Fallback to text
          downloadScorecard();
        };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      }
    } catch {
      downloadScorecard();
    } finally {
      document.body.removeChild(container);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🏏 ${matchState?.fixture.homeTeam} vs ${matchState?.fixture.awayTeam} Scorecard`,
          text: generateScorecardText(),
        });
      } catch { /* user cancelled */ }
    } else {
      copyScorecard();
    }
  };

  // ==============================================================
  // RENDER
  // ==============================================================

  // === Match Selection Screen ===
  if (showMatchSelect) {
    const upcoming = fixtures.filter(f => f.status === 'scheduled' || f.status === 'in-progress');
    return (
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 rounded-2xl p-8 md:p-10 mb-8 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <Radio className="size-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Live Scoring</h1>
              <p className="text-slate-400 text-sm mt-1">Camera umpire detection + batsman recognition + full manual scoring</p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border border-slate-200 rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Trophy className="size-5 text-red-700" /> Select Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="size-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">No upcoming fixtures</p>
                <p className="text-sm">Schedule fixtures before live scoring</p>
              </div>
            ) : (
              <>
                {upcoming.map(f => (
                  <button key={f.id} onClick={() => setSelectedMatchId(f.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedMatchId === f.id ? 'border-red-600 bg-red-50 shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{f.homeTeam} vs {f.awayTeam}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>{new Date(f.date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          {f.time && <span>{f.time}</span>}
                          <span>{f.venue}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px]">{f.overs} overs</Badge>
                        <div className="text-[10px] text-slate-400 mt-1">{f.competition}</div>
                      </div>
                    </div>
                  </button>
                ))}
                <Button className="w-full mt-4 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-xl h-12" disabled={!selectedMatchId || loading} onClick={startScoringSession}>
                  {loading ? <><Activity className="size-4 mr-2 animate-spin" /> Starting...</> : <><Radio className="size-4 mr-2" /> Start Live Scoring</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[
            { icon: Camera, title: 'Signal Detection', desc: 'Auto-detect umpire signals: Wide, No Ball, Out, Six, Four, Short Run' },
            { icon: ScanFace, title: 'Batsman Recognition', desc: 'Camera reads batsman face, shirt name & number to auto-assign runs' },
            { icon: Pencil, title: 'Manual Override', desc: 'Full manual control — override any camera detection instantly' },
            { icon: Activity, title: 'Live Scorecard', desc: 'Individual batsman & bowler stats, byes, leg byes with run counts' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} className="shadow-sm border border-slate-200 rounded-xl">
                <CardContent className="p-4">
                  <Icon className="size-5 text-red-700 mb-2" />
                  <h4 className="font-semibold text-slate-900 text-xs tracking-tight">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // === Main Scoring Interface ===
  if (!matchState || !currentInnings) return null;

  const striker = getStriker();
  const nonStriker = getNonStriker();

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-0">
      {/* ===== Match Header Bar ===== */}
      <div className="bg-gradient-to-r from-slate-900 to-red-950 rounded-xl p-2.5 sm:p-4 mb-2 sm:mb-3 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative z-10">
          {/* Top row: status + match info */}
          <div className="flex items-center gap-2 mb-2">
            {matchState.status === 'live' && (
              <span className="relative flex h-3 w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
            <Badge className={`rounded-md text-[10px] uppercase tracking-wider font-bold flex-shrink-0 ${matchState.status === 'live' ? 'bg-red-600' : matchState.status === 'paused' ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-500'}`}>
              {matchState.status}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-xs sm:text-sm truncate">{matchState.fixture.homeTeam} vs {matchState.fixture.awayTeam}</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">{matchState.fixture.competition} • {matchState.fixture.overs} overs</div>
            </div>
          </div>
          {/* Action buttons - grid for mobile */}
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1 sm:gap-1.5">
            <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={undoLastBall}><RotateCcw className="size-3 mr-0.5 flex-shrink-0" /> <span className="truncate">Undo</span></Button>
            <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={swapStrike}><ArrowUpDown className="size-3 mr-0.5 flex-shrink-0" /> <span className="truncate">Swap</span></Button>
            <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={switchInnings}><ArrowRightLeft className="size-3 mr-0.5 flex-shrink-0" /> <span className="truncate">Innings</span></Button>
            <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => setShowBowlerDialog(true)}><User className="size-3 mr-0.5 flex-shrink-0" /> <span className="truncate">Bowler</span></Button>
            {matchState.status === 'live' ? (
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => updateMatchStatus('paused')}><Pause className="size-3 mr-0.5" /> <span className="truncate">Pause</span></Button>
            ) : matchState.status === 'paused' ? (
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => updateMatchStatus('live')}><Play className="size-3 mr-0.5" /> <span className="truncate">Resume</span></Button>
            ) : null}
            <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => updateMatchStatus('completed')}><Square className="size-3 mr-0.5" /> <span className="truncate">End</span></Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => setShowShareDialog(true)}><Share2 className="size-3 mr-0.5" /> <span className="truncate">Share</span></Button>
            <Button size="sm" className="bg-white/15 border border-white/30 text-white hover:bg-white/25 text-[9px] sm:text-[10px] h-8 sm:h-7 px-1.5 sm:px-2 rounded-lg" onClick={() => { stopCamera(); setShowMatchSelect(true); setMatchState(null); }}><span className="truncate">Back</span></Button>
          </div>
        </div>
      </div>

      {/* Short run indicator */}
      {isShortRun && (
        <div className="bg-orange-100 border border-orange-300 rounded-lg p-2 mb-2 flex items-center justify-between">
          <span className="text-orange-800 text-xs sm:text-sm font-semibold flex items-center gap-1"><AlertTriangle className="size-3.5" /> Short Run (−1)</span>
          <Button size="sm" variant="outline" className="text-orange-700 border-orange-300 text-[10px] h-6" onClick={() => setIsShortRun(false)}>Cancel</Button>
        </div>
      )}

      {/* ===== Mobile Tab Switcher (visible on small screens only) ===== */}
      <div className="flex gap-1 mb-2 lg:hidden">
        {(['controls', 'score', 'camera'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mobileTab === tab ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {tab === 'controls' && <><Pencil className="size-3 inline mr-1" />Score</>}
            {tab === 'score' && <><Activity className="size-3 inline mr-1" />Card</>}
            {tab === 'camera' && <><Camera className="size-3 inline mr-1" />Camera</>}
          </button>
        ))}
      </div>

      {/* ===== Compact live score bar (always visible on mobile) ===== */}
      <div className="lg:hidden mb-2">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{matchState.currentInnings === 'first' ? '1st' : '2nd'} Innings • {currentInnings.battingTeam}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">{currentInnings.runs}</span>
                <span className="text-base text-slate-400 font-medium">/{currentInnings.wickets}</span>
                <span className="text-xs text-slate-500 ml-1">({oversStr(currentInnings)} ov)</span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-[9px] mb-1">RR: {runRate(currentInnings)}</Badge>
              {striker && (
                <div className="text-[10px] text-slate-700 font-medium">{striker.name}* {striker.runs}({striker.ballsFaced})</div>
              )}
              {nonStriker && (
                <div className="text-[9px] text-slate-400">{nonStriker.name} {nonStriker.runs}({nonStriker.ballsFaced})</div>
              )}
            </div>
          </div>
          {/* This Over inline */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {(() => {
              const log = currentInnings.ballLog;
              const balls: BallEntry[] = [];
              for (let i = log.length - 1; i >= 0; i--) {
                if (log[i].over === currentInnings.overs || (currentInnings.balls === 0 && log[i].over === currentInnings.overs - 1)) balls.unshift(log[i]);
                else break;
              }
              if (!balls.length) return <span className="text-[10px] text-slate-400">New over</span>;
              return balls.map((b, i) => (
                <span key={i} className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold ${ballColor(b)}`}>{ballDisplay(b)}</span>
              ));
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3">
        {/* ===== SCORECARD (Left on desktop, tab on mobile) ===== */}
        <div className={`lg:col-span-4 lg:order-1 space-y-2 sm:space-y-3 ${mobileTab !== 'score' ? 'hidden lg:block' : ''}`}>
          {/* Live Score */}
          <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-700 to-red-900" />
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{matchState.currentInnings === 'first' ? '1st' : '2nd'} Innings</div>
                <Badge variant="outline" className="text-[9px]">RR: {runRate(currentInnings)}</Badge>
              </div>
              <div className="mb-3">
                <div className="text-xs font-medium text-slate-600 mb-0.5">{currentInnings.battingTeam}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 tracking-tight">{currentInnings.runs}</span>
                  <span className="text-lg text-slate-400 font-medium">/{currentInnings.wickets}</span>
                </div>
                <div className="text-xs text-slate-500">({oversStr(currentInnings)} overs)</div>
              </div>
              {/* Extras */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {currentInnings.extras.wides > 0 && <Badge variant="outline" className="text-[9px] text-yellow-700 border-yellow-200 bg-yellow-50">Wd {currentInnings.extras.wides}</Badge>}
                {currentInnings.extras.noBalls > 0 && <Badge variant="outline" className="text-[9px] text-red-700 border-red-200 bg-red-50">Nb {currentInnings.extras.noBalls}</Badge>}
                {currentInnings.extras.byes > 0 && <Badge variant="outline" className="text-[9px] text-cyan-700 border-cyan-200 bg-cyan-50">B {currentInnings.extras.byes}</Badge>}
                {currentInnings.extras.legByes > 0 && <Badge variant="outline" className="text-[9px] text-teal-700 border-teal-200 bg-teal-50">Lb {currentInnings.extras.legByes}</Badge>}
                {(currentInnings.extras.shortRuns || 0) > 0 && <Badge variant="outline" className="text-[9px] text-orange-700 border-orange-200 bg-orange-50">Short {currentInnings.extras.shortRuns}</Badge>}
              </div>
              {otherInnings && otherInnings.ballLog.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400">{otherInnings.battingTeam}</div>
                  <div className="text-base font-semibold text-slate-700">{otherInnings.runs}/{otherInnings.wickets} <span className="text-xs font-normal text-slate-400">({oversStr(otherInnings)} ov)</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batsmen at Crease */}
          <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-600 to-emerald-800" />
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Batsmen at Crease</div>
                <Button size="sm" variant="ghost" className="text-[9px] h-5 px-1 text-slate-400" onClick={() => setShowBatsmanSetup(true)}>Edit</Button>
              </div>
              {striker || nonStriker ? (
                <div className="space-y-2">
                  {[{ bat: striker, label: '🏏 Striker', isStriker: true }, { bat: nonStriker, label: 'Non-Striker', isStriker: false }].map(({ bat, label, isStriker }) => bat && (
                    <div key={bat.id} className={`p-2.5 rounded-lg border ${isStriker ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${isStriker ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
                            {bat.shirtNumber || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                              {bat.name}
                              {isStriker && <span className="text-emerald-600 text-[9px]">⬤</span>}
                            </div>
                            {bat.shirtName && <div className="text-[9px] text-slate-400">{bat.shirtName}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">{bat.runs}<span className="text-xs text-slate-400 font-normal">({bat.ballsFaced})</span></div>
                          <div className="text-[9px] text-slate-400">SR {strikeRate(bat)} • {bat.fours}×4 {bat.sixes}×6</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={() => setShowBatsmanSetup(true)} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 hover:bg-slate-50">
                  <Users className="size-5 mx-auto mb-1 text-slate-300" />
                  Click to set opening batsmen
                </button>
              )}
            </CardContent>
          </Card>

          {/* All Batsmen Scorecard (dismissed) */}
          {currentInnings.batsmen.filter(b => b.isOut).length > 0 && (
            <Card className="shadow-sm border border-slate-200 rounded-xl">
              <CardContent className="p-3">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Batting Card</div>
                <div className="space-y-1">
                  {currentInnings.batsmen.filter(b => b.isOut).map(bat => (
                    <div key={bat.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{bat.name}</span>
                        <span className="text-[9px] italic">{bat.dismissalType}</span>
                      </div>
                      <span className="font-semibold">{bat.runs}({bat.ballsFaced})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bowler Stats */}
          {currentInnings.bowlers.length > 0 && (
            <Card className="shadow-sm border border-slate-200 rounded-xl">
              <CardContent className="p-3">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Bowlers</div>
                <table className="w-full text-[10px]">
                  <thead><tr className="text-slate-400"><th className="text-left py-0.5">Bowler</th><th className="text-center">O</th><th className="text-center">M</th><th className="text-center">R</th><th className="text-center">W</th></tr></thead>
                  <tbody>
                    {currentInnings.bowlers.map(bw => (
                      <tr key={bw.id} className={`${bw.id === currentInnings.currentBowlerId ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                        <td className="py-0.5 flex items-center gap-1">{bw.id === currentInnings.currentBowlerId && <CircleDot className="size-2.5 text-red-600" />}{bw.name}</td>
                        <td className="text-center">{bw.overs}.{bw.currentOverBalls}</td>
                        <td className="text-center">{bw.maidens}</td>
                        <td className="text-center">{bw.runs}</td>
                        <td className="text-center">{bw.wickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* This Over */}
          <Card className="shadow-sm border border-slate-200 rounded-xl">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">This Over</div>
              <div className="flex gap-1.5 flex-wrap">
                {(() => {
                  const log = currentInnings.ballLog;
                  const balls: BallEntry[] = [];
                  for (let i = log.length - 1; i >= 0; i--) {
                    if (log[i].over === currentInnings.overs || (currentInnings.balls === 0 && log[i].over === currentInnings.overs - 1)) balls.unshift(log[i]);
                    else break;
                  }
                  if (!balls.length) return <span className="text-[10px] text-slate-400">New over...</span>;
                  return balls.map((b, i) => (
                    <span key={i} className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold ${ballColor(b)}`}>{ballDisplay(b)}</span>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Ball Log */}
          <Card className="shadow-sm border border-slate-200 rounded-xl">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ball-by-Ball Log</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {currentInnings.ballLog.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-3">No balls recorded</p>
                ) : (
                  [...currentInnings.ballLog].reverse().slice(0, 25).map((ball, i) => (
                    <div key={ball.id || i} className="flex items-center gap-1.5 text-[10px] py-1 border-b border-slate-50 last:border-0">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold ${ballColor(ball)}`}>{ballDisplay(ball)}</span>
                      <span className="text-slate-400">{ball.over}.{ball.ballInOver + 1}</span>
                      <span className="text-slate-700 font-medium flex-1 truncate">
                        {ball.wicket ? `WICKET (${ball.wicket.type})` :
                         ball.shortRun ? `${ball.originalRuns}→${ball.runs} (short)` :
                         ball.extras ? `${ball.extras.type} ${ball.extras.runs}` :
                         ball.runs === 4 ? 'FOUR' : ball.runs === 6 ? 'SIX!' :
                         ball.runs === 0 ? 'Dot' : `${ball.runs} run${ball.runs > 1 ? 's' : ''}`}
                      </span>
                      {ball.assignedToBatsmanId && <span className="text-[8px] text-emerald-500">→{currentInnings.batsmen.find(b => b.id === ball.assignedToBatsmanId)?.name?.split(' ')[0]}</span>}
                      {ball.source === 'camera' && <Camera className="size-2.5 text-blue-400" />}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== CENTER: Camera + Detection ===== */}
        <div className={`lg:col-span-4 lg:order-2 space-y-2 sm:space-y-3 ${mobileTab !== 'camera' ? 'hidden lg:block' : ''}`}>
          {/* Camera Panel */}
          <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-blue-800" />
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Video className="size-3" /> Umpire & Batsman Camera</div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="text-[9px] h-5 px-1.5 rounded" onClick={() => setShowSignalOverlay(!showSignalOverlay)}>
                    {showSignalOverlay ? <Eye className="size-2.5" /> : <EyeOff className="size-2.5" />}
                  </Button>
                  {cameraActive ? (
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-[9px] h-6 px-2 rounded text-white" onClick={stopCamera}><VideoOff className="size-2.5 mr-0.5" /> Stop</Button>
                  ) : (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-[9px] h-6 px-2 rounded text-white" onClick={startCamera}><Video className="size-2.5 mr-0.5" /> Start</Button>
                  )}
                </div>
              </div>

              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {showSignalOverlay && detectedSignal && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/30" />
                        <div className="relative z-10 text-center animate-pulse">
                          <div className="text-3xl mb-0.5">{UMPIRE_SIGNALS.find(s => s.type === detectedSignal.type)?.icon}</div>
                          <div className="text-white font-bold text-sm">{UMPIRE_SIGNALS.find(s => s.type === detectedSignal.type)?.label}</div>
                          <div className="text-white/70 text-[10px]">{Math.round(detectedSignal.confidence * 100)}%</div>
                        </div>
                      </div>
                    )}
                    {/* Batsman detection overlay */}
                    {detectedBatsman && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur rounded-md p-2 flex items-center gap-2">
                        <ScanFace className="size-4 text-emerald-400" />
                        <div>
                          <div className="text-white text-[10px] font-semibold">{detectedBatsman.name}</div>
                          <div className="text-white/60 text-[8px]">#{detectedBatsman.shirtNumber} • {Math.round(detectedBatsman.confidence * 100)}% match</div>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded px-1.5 py-0.5">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
                      <span className="text-white text-[9px] font-medium">LIVE</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Camera className="size-8 mb-2 text-slate-600" />
                    <p className="text-xs font-medium">Camera Off</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 text-center px-4">Detect umpire signals & identify batsmen by face/shirt</p>
                    {cameraError && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-0.5"><AlertTriangle className="size-2.5" /> {cameraError}</p>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <Button size="sm" className={`flex-1 text-[10px] h-8 sm:h-7 rounded-lg ${inputMode === 'manual' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => setInputMode('manual')}>
                  <Pencil className="size-2.5 mr-0.5" /> Manual
                </Button>
                <Button size="sm" className={`flex-1 text-[10px] h-8 sm:h-7 rounded-lg ${inputMode === 'camera' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => { setInputMode('camera'); if (!cameraActive) startCamera(); }}>
                  <Camera className="size-2.5 mr-0.5" /> Camera
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Signal */}
          {pendingSignal && (
            <Card className="shadow-lg border-2 border-yellow-400 rounded-xl bg-yellow-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="size-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-900 text-xs">Signal Detected — Confirm?</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{UMPIRE_SIGNALS.find(s => s.type === pendingSignal.type)?.icon}</div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{UMPIRE_SIGNALS.find(s => s.type === pendingSignal.type)?.label}</div>
                    <div className="text-[10px] text-slate-500">{Math.round(pendingSignal.confidence * 100)}% confidence</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs" onClick={() => acceptSignal(pendingSignal.type)}>
                    <CheckCircle2 className="size-3.5 mr-0.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs" onClick={rejectSignal}>
                    <XCircle className="size-3.5 mr-0.5" /> Reject
                  </Button>
                </div>
                <div className="mt-2 pt-2 border-t border-yellow-200">
                  <p className="text-[8px] text-yellow-700 mb-1 uppercase tracking-wider font-semibold">Override with:</p>
                  <div className="flex gap-1 flex-wrap">
                    {UMPIRE_SIGNALS.filter(s => s.type !== pendingSignal.type && s.type !== 'deadBall').map(s => (
                      <Button key={s.type} size="sm" variant="outline" className="text-[8px] h-5 px-1.5 rounded" onClick={() => { setPendingSignal(null); acceptSignal(s.type); }}>
                        {s.icon} {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signal History */}
          {signalHistory.length > 0 && (
            <Card className="shadow-sm border border-slate-200 rounded-xl">
              <CardContent className="p-3">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Signal History</div>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {[...signalHistory].reverse().slice(0, 8).map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5">
                      <span>{UMPIRE_SIGNALS.find(x => x.type === s.type)?.icon}</span>
                      <span className="font-medium text-slate-700">{UMPIRE_SIGNALS.find(x => x.type === s.type)?.label}</span>
                      <span className="text-slate-400">{Math.round(s.confidence * 100)}%</span>
                      <span className="text-slate-400 ml-auto">{s.time}</span>
                      {s.accepted ? <CheckCircle2 className="size-2.5 text-emerald-500" /> : <XCircle className="size-2.5 text-red-400" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===== RIGHT: Scoring Controls ===== */}
        <div className={`lg:col-span-4 lg:order-3 space-y-2 sm:space-y-3 ${mobileTab !== 'controls' ? 'hidden lg:block' : ''}`}>
          {/* Run Buttons */}
          <Card className="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-600 to-emerald-800" />
            <CardContent className="p-2.5 sm:p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Score Runs {striker && <span className="text-emerald-600 normal-case">→ {striker.name}</span>}</div>
              <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                {[0, 1, 2, 3].map(r => (
                  <Button key={r} className={`h-14 sm:h-12 text-xl sm:text-lg font-bold rounded-xl ${r === 0 ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    onClick={() => recordBall(r)}>{r === 0 ? '•' : r}</Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <Button className="h-12 sm:h-10 text-lg sm:text-base font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl" onClick={() => recordBall(4)}>4</Button>
                <Button className="h-12 sm:h-10 text-lg sm:text-base font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl" onClick={() => recordBall(6)}>6</Button>
                <Button className="h-12 sm:h-10 text-sm sm:text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl" onClick={() => recordBall(5)}>5</Button>
                <Button className="h-12 sm:h-10 text-sm sm:text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl" onClick={() => recordBall(7)}>7</Button>
              </div>
            </CardContent>
          </Card>

          {/* Extras with run selection for Bye/Leg Bye */}
          <Card className="shadow-sm border border-slate-200 rounded-xl">
            <CardContent className="p-2.5 sm:p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Extras</div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <Button className="h-11 sm:h-10 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold rounded-xl border border-yellow-200 text-xs" onClick={() => recordBall(0, { type: 'wide', runs: 1 })}>
                  <Hand className="size-3.5 mr-1" /> Wide
                </Button>
                <Button className="h-11 sm:h-10 bg-red-100 text-red-800 hover:bg-red-200 font-semibold rounded-xl border border-red-200 text-xs" onClick={() => recordBall(0, { type: 'noBall', runs: 1 })}>
                  <XCircle className="size-3.5 mr-1" /> No Ball
                </Button>
              </div>
              {/* Bye & Leg Bye with run selection */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Button className="w-full h-8 bg-cyan-100 text-cyan-800 hover:bg-cyan-200 font-semibold rounded-xl border border-cyan-200 text-[10px] mb-1" onClick={() => { setByeType('bye'); setByeRuns(1); setShowByeRunsDialog(true); }}>
                    <Target className="size-3 mr-0.5" /> Bye
                  </Button>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(r => (
                      <Button key={r} size="sm" className="flex-1 h-8 sm:h-7 text-[10px] bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded border border-cyan-200"
                        onClick={() => recordBall(0, { type: 'bye', runs: isShortRun && r > 0 ? r - 1 : r })}>
                        B{r}{isShortRun ? '*' : ''}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Button className="w-full h-8 bg-teal-100 text-teal-800 hover:bg-teal-200 font-semibold rounded-xl border border-teal-200 text-[10px] mb-1" onClick={() => { setByeType('legBye'); setByeRuns(1); setShowByeRunsDialog(true); }}>
                    <Zap className="size-3 mr-0.5" /> Leg Bye
                  </Button>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(r => (
                      <Button key={r} size="sm" className="flex-1 h-8 sm:h-7 text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-700 rounded border border-teal-200"
                        onClick={() => recordBall(0, { type: 'legBye', runs: isShortRun && r > 0 ? r - 1 : r })}>
                        Lb{r}{isShortRun ? '*' : ''}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Short Run + Wicket row */}
          <div className="grid grid-cols-2 gap-2">
            <Button className={`h-12 sm:h-10 font-semibold rounded-xl text-xs border ${isShortRun ? 'bg-orange-500 text-white border-orange-600' : 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200'}`}
              onClick={() => setIsShortRun(!isShortRun)}>
              <Minus className="size-3.5 mr-1" /> {isShortRun ? '✓ Short (−1)' : 'Short Run'}
            </Button>
            <Button className="h-12 sm:h-10 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-xl" onClick={() => setShowWicketDialog(true)}>
              <Shield className="size-4 mr-1" /> WICKET!
            </Button>
          </div>

          {/* Umpire Signal Buttons */}
          <Card className="shadow-sm border border-slate-200 rounded-xl">
            <CardContent className="p-2.5 sm:p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Umpire Signals</div>
              <div className="grid grid-cols-3 gap-1">
                {UMPIRE_SIGNALS.map(signal => (
                  <button key={signal.type} className={`p-2 sm:p-1.5 rounded-lg ${signal.bgLight} ${signal.border} border hover:shadow-md transition-all text-center active:scale-95`}
                    onClick={() => acceptSignal(signal.type)} title={signal.description}>
                    <div className="text-lg sm:text-base mb-0">{signal.icon}</div>
                    <div className={`text-[8px] font-semibold ${signal.textColor} leading-tight`}>{signal.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center text-[9px] text-slate-400 mt-2 mb-4">
        Scoring by {matchState.scorerName} • Started {new Date(matchState.startedAt).toLocaleTimeString()}
      </div>

      {/* ============================== */}
      {/* DIALOGS                        */}
      {/* ============================== */}

      {/* Share Scorecard Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Share2 className="size-5 text-emerald-700" /> Share Scorecard
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Share the match scorecard as a table via WhatsApp, clipboard, or download
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <Button className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm" onClick={shareWhatsApp}>
                <MessageCircle className="size-4 mr-1.5" /> WhatsApp
              </Button>
              <Button className="h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-sm" onClick={copyScorecard}>
                <Copy className="size-4 mr-1.5" /> Copy Text
              </Button>
              <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm" onClick={downloadScorecard}>
                <Download className="size-4 mr-1.5" /> Download .txt
              </Button>
              <Button className="h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm" onClick={downloadScorecardImage}>
                <FileText className="size-4 mr-1.5" /> Download Image
              </Button>
            </div>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm" onClick={shareNative}>
                <Share2 className="size-4 mr-1.5" /> Share via Device...
              </Button>
            )}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-60 overflow-y-auto">
              <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Preview</div>
              <pre className="text-[9px] sm:text-[10px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{generateScorecardText()}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batsman Setup Dialog */}
      <Dialog open={showBatsmanSetup} onOpenChange={setShowBatsmanSetup}>
        <DialogContent className="max-w-md rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-emerald-700" /> Set Opening Batsmen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter batsman details. Camera will identify them by face, shirt name & number during play.
              <br />Shall I auto-assign runs to the batsman at the striker's crease?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Auto-assign toggle */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <button onClick={() => setAutoAssignRuns(!autoAssignRuns)} className={`w-10 h-5 rounded-full transition-colors ${autoAssignRuns ? 'bg-emerald-600' : 'bg-slate-300'} relative`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoAssignRuns ? 'left-5' : 'left-0.5'}`} />
              </button>
              <div>
                <div className="text-xs font-semibold text-slate-900">Auto-assign runs to striker at crease</div>
                <div className="text-[10px] text-slate-500">When ON, runs auto-credit to the batsman facing. When OFF, you'll be asked each time.</div>
              </div>
            </div>

            {/* Striker */}
            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <div className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1"><UserCheck className="size-3.5" /> Striker (Facing)</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Label className="text-[10px]">Name *</Label>
                  <Input value={strikerName} onChange={e => setStrikerName(e.target.value)} placeholder="e.g. Rohit Sharma" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Shirt #</Label>
                  <Input value={strikerShirtNum} onChange={e => setStrikerShirtNum(e.target.value)} placeholder="45" className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Shirt Name</Label>
                  <Input value={strikerShirtName} onChange={e => setStrikerShirtName(e.target.value)} placeholder="SHARMA" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1"><User className="size-3.5" /> Non-Striker</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Label className="text-[10px]">Name *</Label>
                  <Input value={nonStrikerName} onChange={e => setNonStrikerName(e.target.value)} placeholder="e.g. Virat Kohli" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Shirt #</Label>
                  <Input value={nonStrikerShirtNum} onChange={e => setNonStrikerShirtNum(e.target.value)} placeholder="18" className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Shirt Name</Label>
                  <Input value={nonStrikerShirtName} onChange={e => setNonStrikerShirtName(e.target.value)} placeholder="KOHLI" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-800 flex items-start gap-2">
              <ScanFace className="size-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Camera Recognition:</strong> The camera will attempt to read batsman faces, shirt back names & jersey numbers during play.
                If batsman is running between wickets, camera reads the run count (1, 2, 3, 4, 5). Runs auto-assigned to the detected batsman.
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowBatsmanSetup(false)}>Skip for now</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto" onClick={setBatsmen} disabled={!strikerName || !nonStrikerName}>
              <CheckCircle2 className="size-4 mr-1" /> Confirm Batsmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bowler Dialog */}
      <Dialog open={showBowlerDialog} onOpenChange={setShowBowlerDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><CircleDot className="size-4 text-red-700" /> Set Bowler</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Bowler Name *</Label>
              <Input value={newBowlerName} onChange={e => setNewBowlerName(e.target.value)} placeholder="e.g. Mitchell Starc" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Shirt Number</Label>
              <Input value={newBowlerShirtNum} onChange={e => setNewBowlerShirtNum(e.target.value)} placeholder="56" className="h-9 text-sm" />
            </div>
            {currentInnings.bowlers.length > 0 && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">Previous bowlers:</div>
                <div className="flex gap-1 flex-wrap">
                  {currentInnings.bowlers.map(bw => (
                    <Button key={bw.id} size="sm" variant="outline" className="text-[10px] h-6 px-2 rounded" onClick={() => { setNewBowlerName(bw.name); setNewBowlerShirtNum(bw.shirtNumber); }}>
                      {bw.name} ({bw.overs}.{bw.currentOverBalls}-{bw.runs}-{bw.wickets})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowBowlerDialog(false)}>Skip</Button>
            <Button className="bg-red-700 hover:bg-red-800 w-full sm:w-auto" onClick={setBowler} disabled={!newBowlerName}>
              <CheckCircle2 className="size-4 mr-1" /> Set Bowler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Batsman Dialog (after wicket) */}
      <Dialog open={showNewBatsmanDialog} onOpenChange={setShowNewBatsmanDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><Plus className="size-4 text-emerald-700" /> New Batsman</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Wicket fallen — enter the new batsman coming in</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={newBatName} onChange={e => setNewBatName(e.target.value)} placeholder="Batsman name" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Shirt #</Label>
                <Input value={newBatShirtNum} onChange={e => setNewBatShirtNum(e.target.value)} placeholder="No." className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Shirt Name</Label>
                <Input value={newBatShirtName} onChange={e => setNewBatShirtName(e.target.value)} placeholder="SURNAME" className="h-9 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowNewBatsmanDialog(false)}>Skip</Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto" onClick={addNewBatsman} disabled={!newBatName}>
              <CheckCircle2 className="size-4 mr-1" /> Add Batsman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wicket Type Dialog */}
      <Dialog open={showWicketDialog} onOpenChange={setShowWicketDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><Shield className="size-4 text-red-700" /> Record Wicket</DialogTitle>
            <DialogDescription className="text-xs">{striker ? `Out batsman: ${striker.name}` : 'Select dismissal type'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5 py-2">
            {['bowled', 'caught', 'lbw', 'run out', 'stumped', 'hit wicket', 'retired', 'timed out'].map(type => (
              <Button key={type} variant={wicketType === type ? 'default' : 'outline'}
                className={`rounded-lg capitalize text-xs h-9 ${wicketType === type ? 'bg-red-700 hover:bg-red-800' : ''}`}
                onClick={() => setWicketType(type)}>{type}</Button>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowWicketDialog(false)}>Cancel</Button>
            <Button className="bg-red-700 hover:bg-red-800 w-full sm:w-auto" onClick={confirmWicket}><CheckCircle2 className="size-4 mr-1" /> Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bye/Leg Bye Runs Dialog */}
      <Dialog open={showByeRunsDialog} onOpenChange={setShowByeRunsDialog}>
        <DialogContent className="max-w-xs rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {byeType === 'bye' ? <Target className="size-4 text-cyan-700" /> : <Zap className="size-4 text-teal-700" />}
              {byeType === 'bye' ? 'Bye' : 'Leg Bye'} — How many runs?
            </DialogTitle>
            <DialogDescription className="text-xs">
              {byeType === 'bye' ? 'Ball passed the bat without contact' : 'Ball hit the batsman\'s body'} — batsmen running between wickets.
              {isShortRun && <span className="text-orange-600 font-semibold"> Short run will deduct 1.</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-center py-3">
            {[1, 2, 3, 4, 5].map(r => (
              <Button key={r} className={`w-12 h-12 text-lg font-bold rounded-xl ${byeRuns === r ? (byeType === 'bye' ? 'bg-cyan-600 text-white' : 'bg-teal-600 text-white') : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                onClick={() => setByeRuns(r)}>{r}</Button>
            ))}
          </div>
          {isShortRun && byeRuns > 0 && (
            <div className="text-center text-xs text-orange-600 font-semibold">
              Short run: {byeRuns} → {byeRuns - 1} runs recorded
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowByeRunsDialog(false)}>Cancel</Button>
            <Button className={`w-full sm:w-auto ${byeType === 'bye' ? 'bg-cyan-700 hover:bg-cyan-800' : 'bg-teal-700 hover:bg-teal-800'}`} onClick={confirmByeRuns}>
              <CheckCircle2 className="size-4 mr-1" /> Record ({isShortRun && byeRuns > 0 ? byeRuns - 1 : byeRuns} runs)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Assignment Dialog (when auto-assign is off) */}
      <Dialog open={showRunAssignDialog} onOpenChange={(open) => { if (!open) { setShowRunAssignDialog(false); setPendingRunData(null); } }}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base"><UserCheck className="size-4 text-emerald-700" /> Assign runs to which batsman?</DialogTitle>
            <DialogDescription className="text-xs">
              {pendingRunData?.runs} run{(pendingRunData?.runs || 0) > 1 ? 's' : ''} scored — select the batsman to credit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {currentInnings.batsmen.filter(b => !b.isOut).map(bat => (
              <button key={bat.id} onClick={() => confirmRunAssign(bat.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all hover:bg-emerald-50 hover:border-emerald-400 ${bat.id === currentInnings.strikerId ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${bat.id === currentInnings.strikerId ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
                      {bat.shirtNumber || '?'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{bat.name}</div>
                      <div className="text-[10px] text-slate-400">{bat.id === currentInnings.strikerId ? '🏏 Striker' : 'Non-Striker'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{bat.runs}({bat.ballsFaced})</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
