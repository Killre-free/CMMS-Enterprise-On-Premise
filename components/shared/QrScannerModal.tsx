"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, CameraOff } from "lucide-react";

interface QrScannerModalProps {
  title: string;
  cameraDeniedText: string;
  cancelText: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Opens the device camera and continuously scans frames for a QR/barcode
// using a pure-JS decoder (jsQR) so it works on any browser/device with
// getUserMedia support, not just ones with the native BarcodeDetector API.
export function QrScannerModal({ title, cameraDeniedText, cancelText, onDetected, onClose }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanFrame();
      } catch {
        if (!cancelled) setError(cameraDeniedText);
      }
    }

    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        onDetected(result.data);
        return;
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium">{title}</h3>
          <button type="button" onClick={onClose} aria-label={cancelText} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <CameraOff size={24} />
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          {cancelText}
        </button>
      </div>
    </div>
  );
}
