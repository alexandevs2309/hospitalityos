"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BookRootContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("checkIn") && searchParams.get("checkOut")) {
      router.push(`/book/select?${searchParams.toString()}`);
    } else {
      router.push("/book/search");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="animate-spin w-8 h-8 rounded-full border-2 border-stone-200 border-t-stone-900" />
    </div>
  );
}
