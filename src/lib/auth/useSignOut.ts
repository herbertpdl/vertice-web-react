import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/auth";

/**
 * Clears the session cookie (server-side) and the query cache, then goes to `to` (`/login` by
 * default). The returned function takes no arguments, so it can be an `onClick` as is.
 */
export function useSignOut(to = "/login") {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function signOut() {
    await logout();
    queryClient.clear();
    router.push(to);
    router.refresh();
  };
}
