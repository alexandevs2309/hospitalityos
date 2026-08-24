"use client";

import { Suspense } from "react";
import GuestContent from "./guest-content";

export default function GuestPage() {
  return (
    <Suspense fallback={
      <div className="animate-fade-in min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    }>
      <GuestContent />
    </Suspense>
  );
}