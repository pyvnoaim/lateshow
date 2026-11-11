import { redirect } from "next/navigation";
import { getSession, LOGIN_LINK_MINUTES } from "@/lib/auth";
import { SignInForm } from "./components/SignInForm";
import { safeNext } from "@/lib/safeNext";

export async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);
  return <SignInForm linkError={params.error !== undefined} minutes={LOGIN_LINK_MINUTES} next={next} />;
}
