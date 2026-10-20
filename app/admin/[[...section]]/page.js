import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/store.mjs";
import Admin from "@/components/Admin";
export const dynamic = "force-dynamic";
export default async function Page({ params }) {
  params = await params;
  const u = sessionUser((await cookies()).get("rylixs_session")?.value);
  if (u?.role !== "admin") redirect("/admin/login");
  return <Admin section={params.section?.[0] || "dashboard"} />;
}
