import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, RotateCcw, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";

interface ProfilePhotoUploadProps {
  currentPhoto?: string | null;
  onPhotoChange: (photo: string | null) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
  showRemove?: boolean;
}

export function ProfilePhotoUpload({
  currentPhoto,
  onPhotoChange,
  size = "md",
  label = "Profile Photo",
  showRemove = true,
}: ProfilePhotoUploadProps) {
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "size-20",
    md: "size-32",
    lg: "size-40",
  };

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(
        "Could not access camera. Please ensure camera permissions are granted."
      );
    }
  }, [facingMode, cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  const handleOpenCamera = async () => {
    setShowCameraDialog(true);
    setCapturedImage(null);
    // Wait for dialog to open, then start camera
    setTimeout(() => startCamera(), 300);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setCapturedImage(null);
    setShowCameraDialog(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Make it square - use the smaller dimension
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 400;
    canvas.height = 400;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center crop to square
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, 400, 400);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleAcceptCapture = () => {
    if (capturedImage) {
      onPhotoChange(capturedImage);
      handleCloseCamera();
      toast.success("Photo captured successfully!");
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setTimeout(() => startCamera(), 100);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Resize and crop to square
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const offsetX = (img.width - minDim) / 2;
        const offsetY = (img.height - minDim) / 2;

        ctx.drawImage(img, offsetX, offsetY, minDim, minDim, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        onPhotoChange(dataUrl);
        toast.success("Photo uploaded successfully!");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    onPhotoChange(null);
    toast.success("Photo removed");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Camera className="size-4 text-red-900" />
        {label}
      </label>

      <div className="flex items-center gap-4">
        {/* Photo preview */}
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0`}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-center">
              <Camera className="size-8 mx-auto mb-1" />
              <span className="text-[10px]">No Photo</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenCamera}
            className="gap-2"
          >
            <Camera className="size-4" />
            Take Photo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="size-4" />
            Upload
          </Button>

          {showRemove && currentPhoto && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="size-4" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden canvas for capture processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => { if (!open) handleCloseCamera(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-red-900" />
              Take Profile Photo
            </DialogTitle>
            <DialogDescription>
              Position your face in the center and tap capture
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Camera view or captured image */}
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                  />
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 rounded-full border-2 border-white/50 border-dashed" />
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              {capturedImage ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetake}
                    className="gap-2"
                  >
                    <RotateCcw className="size-4" />
                    Retake
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAcceptCapture}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="size-4" />
                    Use This Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={switchCamera}
                    title="Switch camera"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    className="gap-2 bg-red-900 hover:bg-red-800 px-8"
                  >
                    <Camera className="size-5" />
                    Capture
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCamera}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
