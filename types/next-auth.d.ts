import "next-auth";

export type AppRole = "ADMIN" | "MEMBER" | "CEO" | "CTO";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: AppRole;
    };
  }
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}