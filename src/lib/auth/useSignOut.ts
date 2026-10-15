import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api/auth";

/** Clears the session cookie (server-side) and the query cache, then goes to /login. */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function signOut() {
    await logout();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  };
}
