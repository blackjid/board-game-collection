"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  sessionCode: string;
  onClose: () => void;
}

export default function QRCodeModal({ sessionCode, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  // Use NEXT_PUBLIC_BASE_URL if set, otherwise fall back to window.location.origin
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const joinUrl = `${baseUrl}/pick/join?code=${sessionCode}`;

  useEffect(() => {
    if (canvasRef.current && joinUrl) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    }
  }, [joinUrl]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = sessionCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-stone-700">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white mb-2">Invite Players</h2>
          <p className="text-stone-400 text-sm">
            Scan the QR code or share the session code
          </p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 mb-6 flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        {/* Session Code */}
        <div className="mb-6">
          <p className="text-stone-500 text-xs uppercase tracking-wider mb-2 text-center">
            Session Code
          </p>
          <button
            onClick={handleCopyCode}
            className="w-full bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-xl py-4 px-6 text-center transition-all group"
          >
            <span className="text-3xl font-black tracking-[0.3em] text-amber-400 group-hover:text-amber-300">
              {sessionCode}
            </span>
            <span className="block text-stone-500 text-xs mt-1">
              {copied ? "Copied!" : "Tap to copy"}
            </span>
          </button>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 py-3 rounded-xl font-medium transition-colors mb-4"
        >
          Copy Join Link
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-3 rounded-xl font-medium transition-colors"
        >
          Close
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
