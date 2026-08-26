"use client";

import { Suspense } from "react";
import BookRootContent from "./book-root-content";

export default function BookRootPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900" />
      </div>
    }>
      <BookRootContent />
    </Suspense>
  );
}
