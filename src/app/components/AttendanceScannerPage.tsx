import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Clock,
  RotateCcw,
  Search,
  UserCheck,
  AlertTriangle,
  Loader2,
  Trash2,
  ScanFace,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";

interface MemberWithPhoto {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhoto: string;
  faceDescriptor: number[] | null;
}

interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  sessionType: string;
  matchConfidence: number | null;
  markedBy: string;
  createdAt: string;
}

interface MatchResult {
  member: MemberWithPhoto;
  confidence: number;
}

interface AttendanceScannerPageProps {
  apiUrl: string;
  apiKey: string;
  userId: string;
  userName: string;
  userRole: string;
}

export function AttendanceScannerPage({
  apiUrl,
  apiKey,
  userId,
  userName,
  userRole,
}: AttendanceScannerPageProps) {
  const [membersWithPhotos, setMembersWithPhotos] = useState<MemberWithPhoto[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState("training");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [allMembers, setAllMembers] = useState<MemberWithPhoto[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load members with photos and today's attendance
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, attendanceRes, allMembersRes] = await Promise.all([
        fetch(`${apiUrl}/members/with-photos`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch(`${apiUrl}/attendance?date=${selectedDate}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch(`${apiUrl}/users`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);

      const membersData = await membersRes.json();
      const attendanceData = await attendanceRes.json();
      const allMembersData = await allMembersRes.json();

      if (membersData.success) {
        setMembersWithPhotos(membersData.members);
      }
      if (attendanceData.success) {
        setTodayAttendance(attendanceData.data);
      }
      if (allMembersData.success) {
        setAllMembers(allMembersData.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          profilePhoto: null,
          faceDescriptor: null,
        })));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setCameraStream(stream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Could not access camera. Check permissions.");
    }
  }, [facingMode, cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const captureAndCompare = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const capturedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(capturedDataUrl);
    stopCamera();

    // Compare against stored photos
    setProcessing(true);
    setScanning(true);

    try {
      // Use pixel-based histogram comparison (works without external ML libraries)
      const results = await compareWithStoredPhotos(capturedDataUrl);
      setMatchResults(results);

      if (results.length > 0 && results[0].confidence >= 0.5) {
        toast.success(`Found ${results.length} potential match(es)!`);
      } else {
        toast.info("No strong matches found. Try manual selection or retake the photo.");
      }
    } catch (error) {
      console.error("Error comparing photos:", error);
      toast.error("Error during photo comparison");
    } finally {
      setProcessing(false);
      setScanning(false);
    }
  };

  // Image comparison using color histogram matching
  const compareWithStoredPhotos = async (capturedDataUrl: string): Promise<MatchResult[]> => {
    const capturedHistogram = await getImageHistogram(capturedDataUrl);
    if (!capturedHistogram) return [];

    const results: MatchResult[] = [];

    for (const member of membersWithPhotos) {
      if (!member.profilePhoto) continue;

      try {
        const memberHistogram = await getImageHistogram(member.profilePhoto);
        if (!memberHistogram) continue;

        // Compare using histogram correlation
        const similarity = compareHistograms(capturedHistogram, memberHistogram);
        results.push({ member, confidence: similarity });
      } catch (error) {
        console.error(`Error comparing with ${member.name}:`, error);
      }
    }

    // Sort by confidence, highest first
    results.sort((a, b) => b.confidence - a.confidence);

    // Return top 5 matches
    return results.slice(0, 5);
  };

  // Extract color histogram from an image
  const getImageHistogram = (dataUrl: string): Promise<number[] | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 100; // Resize for performance
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Create color histogram (16 bins per channel = 4096 total bins)
        const bins = 16;
        const histogram = new Array(bins * bins * bins).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          const r = Math.floor(data[i] / (256 / bins));
          const g = Math.floor(data[i + 1] / (256 / bins));
          const b = Math.floor(data[i + 2] / (256 / bins));
          histogram[r * bins * bins + g * bins + b]++;
        }

        // Normalize
        const total = (size * size);
        for (let i = 0; i < histogram.length; i++) {
          histogram[i] /= total;
        }

        resolve(histogram);
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  // Compare two histograms using correlation coefficient
  const compareHistograms = (h1: number[], h2: number[]): number => {
    const n = h1.length;
    let sumH1 = 0, sumH2 = 0;
    for (let i = 0; i < n; i++) {
      sumH1 += h1[i];
      sumH2 += h2[i];
    }
    const meanH1 = sumH1 / n;
    const meanH2 = sumH2 / n;

    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < n; i++) {
      const d1 = h1[i] - meanH1;
      const d2 = h2[i] - meanH2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }

    const den = Math.sqrt(den1 * den2);
    if (den === 0) return 0;

    // Convert correlation (-1 to 1) to similarity (0 to 1)
    return (num / den + 1) / 2;
  };

  const handleMarkAttendance = async (member: MemberWithPhoto | { id: string; name: string }, confidence?: number) => {
    // Check if already marked
    if (todayAttendance.find((r) => r.memberId === member.id)) {
      toast.info(`${member.name} is already marked present for today`);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          memberId: member.id,
          memberName: member.name,
          date: selectedDate,
          sessionType,
          matchConfidence: confidence || null,
          markedBy: userName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTodayAttendance((prev) => [...prev, data.data]);
        toast.success(`✅ ${member.name} marked present!`);
      } else {
        toast.error(data.error || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    }
  };

  const handleDeleteAttendance = async (recordId: string) => {
    try {
      const response = await fetch(`${apiUrl}/attendance/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const data = await response.json();
      if (data.success) {
        setTodayAttendance((prev) => prev.filter((r) => r.id !== recordId));
        toast.success("Attendance record removed");
      } else {
        toast.error(data.error || "Failed to remove record");
      }
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Failed to remove record");
    }
  };

  const handleScanAgain = () => {
    setCapturedImage(null);
    setMatchResults([]);
    startCamera();
  };

  const isAlreadyMarked = (memberId: string) =>
    todayAttendance.some((r) => r.memberId === memberId);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-600";
    if (confidence >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return "default";
    if (confidence >= 0.5) return "secondary";
    return "destructive";
  };

  // Filter all members for manual search
  const filteredManualMembers = allMembers.filter(
    (m) =>
      m.name?.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.firstName?.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.lastName?.toLowerCase().includes(manualSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(manualSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="size-12 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance scanner...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-red-900 to-red-800 text-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ScanFace className="size-8" />
              <div>
                <CardTitle className="text-2xl md:text-3xl">Photo Attendance Scanner</CardTitle>
                <CardDescription className="text-red-100">
                  Scan member photos to quickly mark training attendance
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2 self-start md:self-auto">
              {todayAttendance.length} Present
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="flex items-center gap-2 mb-2">
                <Calendar className="size-4" />
                Date
              </Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="size-4" />
                Session Type
              </Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="match">Match</SelectItem>
                  <SelectItem value="nets">Nets Practice</SelectItem>
                  <SelectItem value="meeting">Club Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={showManualDialog ? () => setShowManualDialog(false) : () => setShowManualDialog(true)}
                variant="outline"
                className="gap-2"
              >
                <UserCheck className="size-4" />
                Manual Mark
              </Button>
            </div>
          </div>

          {membersWithPhotos.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">No member photos found</p>
                  <p className="text-sm text-yellow-700">
                    Members need to upload profile photos before face scanning can work.
                    Ask members to add a photo during signup or from their profile.
                    You can still use <strong>Manual Mark</strong> to record attendance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Area */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Camera / Captured Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-5" />
              {capturedImage ? "Captured Photo" : cameraActive ? "Camera Active" : "Photo Scanner"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Camera/Image view */}
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full h-full object-cover"
                  />
                ) : cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-56 border-2 border-white/60 rounded-xl">
                        <div className="w-full h-1 bg-green-400/60 animate-pulse mt-2" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                    <Camera className="size-16 mb-3" />
                    <p className="text-sm">Camera not started</p>
                    <p className="text-xs mt-1">Click "Start Camera" to begin scanning</p>
                  </div>
                )}

                {processing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Loader2 className="size-10 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium">Comparing photos...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Controls */}
              <div className="flex flex-wrap gap-2 justify-center">
                {!cameraActive && !capturedImage && (
                  <Button onClick={startCamera} className="gap-2 bg-red-900 hover:bg-red-800">
                    <Camera className="size-4" />
                    Start Camera
                  </Button>
                )}

                {cameraActive && !capturedImage && (
                  <>
                    <Button
                      onClick={() => {
                        stopCamera();
                        setFacingMode((p) => (p === "user" ? "environment" : "user"));
                        setTimeout(startCamera, 200);
                      }}
                      variant="outline"
                      size="icon"
                      title="Switch camera"
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button onClick={captureAndCompare} className="gap-2 bg-green-600 hover:bg-green-700 px-6">
                      <ScanFace className="size-5" />
                      Scan & Compare
                    </Button>
                    <Button onClick={stopCamera} variant="outline">
                      Cancel
                    </Button>
                  </>
                )}

                {capturedImage && !processing && (
                  <>
                    <Button onClick={handleScanAgain} className="gap-2 bg-red-900 hover:bg-red-800">
                      <RotateCcw className="size-4" />
                      Scan Again
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Match Results
            </CardTitle>
            <CardDescription>
              {matchResults.length > 0
                ? `Found ${matchResults.length} potential match(es)`
                : "Scan a member to see matches"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ScanFace className="size-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No scan results yet</p>
                <p className="text-sm mt-1">
                  Start the camera and scan a member's face to find matches
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchResults.map((result, idx) => (
                  <div
                    key={result.member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      idx === 0 && result.confidence >= 0.5
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Member photo */}
                    <div className="size-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-200">
                      {result.member.profilePhoto ? (
                        <img
                          src={result.member.profilePhoto}
                          alt={result.member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                          {result.member.firstName?.[0]}
                          {result.member.lastName?.[0]}
                        </div>
                      )}
                    </div>

                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{result.member.name}</p>
                      <p className="text-xs text-gray-500 truncate">{result.member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getConfidenceBadge(result.confidence)}>
                          {Math.round(result.confidence * 100)}% match
                        </Badge>
                        {isAlreadyMarked(result.member.id) && (
                          <Badge variant="outline" className="text-green-700 border-green-300">
                            ✓ Present
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {!isAlreadyMarked(result.member.id) ? (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAttendance(result.member, result.confidence)}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="size-4" />
                        Mark
                      </Button>
                    ) : (
                      <CheckCircle2 className="size-6 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Today's Attendance List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="size-5 text-red-900" />
              <div>
                <CardTitle>
                  Attendance - {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>
                  {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} session •{" "}
                  {todayAttendance.length} member(s) present
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="size-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No attendance recorded yet</p>
              <p className="text-sm mt-1">Scan members or use manual mark to record attendance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Match Confidence</TableHead>
                    <TableHead>Marked By</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAttendance.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{record.memberName}</TableCell>
                      <TableCell>
                        {record.matchConfidence ? (
                          <span className={getConfidenceColor(record.matchConfidence)}>
                            {Math.round(record.matchConfidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">Manual</span>
                        )}
                      </TableCell>
                      <TableCell>{record.markedBy}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteAttendance(record.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Mark Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-red-900" />
              Manual Attendance
            </DialogTitle>
            <DialogDescription>
              Search and mark members as present manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Search by name or email..."
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              autoFocus
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredManualMembers.length === 0 ? (
                <p className="text-center text-gray-400 py-6">
                  {manualSearch ? "No members found" : "Start typing to search members"}
                </p>
              ) : (
                filteredManualMembers.slice(0, 20).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    {isAlreadyMarked(member.id) ? (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        ✓ Present
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          handleMarkAttendance(member);
                        }}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="size-4" />
                        Mark Present
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
