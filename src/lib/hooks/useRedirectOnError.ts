import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";

const REDIRECT_CODES = new Set(["FORBIDDEN", "NOT_FOUND"]);

/** Bounces to `fallbackPath` when a query fails with a 403/404 from the BFF (e.g. someone else's student/plan/workout, or a deleted one). */
export function useRedirectOnError(error: unknown, fallbackPath: string) {
  const router = useRouter();

  useEffect(() => {
    if (error instanceof ApiError && REDIRECT_CODES.has(error.code)) {
      router.replace(fallbackPath);
    }
  }, [error, fallbackPath, router]);
}
