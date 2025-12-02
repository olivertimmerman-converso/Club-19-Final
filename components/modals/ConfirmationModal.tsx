/**
 * Club 19 Sales OS - Confirmation Modal
 *
 * Reusable confirmation dialog for destructive actions
 * Black background, gold confirm button, keyboard accessible
 */

"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
}: ConfirmationModalProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;

      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && !isDestructive) {
        // Only allow Enter for non-destructive actions
        onConfirm();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onConfirm, onCancel, isDestructive, isLoading]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0A0A0A] rounded-2xl shadow-2xl max-w-md w-full border-2 border-[#F3DFA2] overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              {isDestructive && (
                <div className="flex items-center justify-center w-12 h-12 bg-[#F3DFA2]/10 rounded-full">
                  <AlertTriangle size={24} className="text-[#F3DFA2]" />
                </div>
              )}
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>
          </div>

          {/* Message */}
          <div className="px-6 py-6">
            <p className="text-gray-300 leading-relaxed">{message}</p>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-[#F3DFA2] text-[#0A0A0A] rounded-lg hover:bg-[#F3DFA2]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : confirmLabel}
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="px-6 pb-4 text-xs text-gray-500 text-center">
            Press <span className="font-mono bg-gray-800 px-1 rounded">Esc</span> to cancel
            {!isDestructive && (
              <>
                {" "}
                or <span className="font-mono bg-gray-800 px-1 rounded">Enter</span> to confirm
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
