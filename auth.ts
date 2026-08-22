import { authOptions } from "@/lib/auth";

export { authOptions };

// Server-side auth helper for App Router
import { getServerSession } from "next-auth";

export async function auth() {
  return getServerSession(authOptions);
}
