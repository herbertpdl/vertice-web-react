import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "@/lib/api/auth";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
}
