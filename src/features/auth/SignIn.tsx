import { redirect } from "next/navigation";
import { getSession, LOGIN_LINK_MINUTES } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { SignInForm } from "./components/SignInForm";

export async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  if (await getSession()) redirect("/");
  const { error } = await searchParams;
  return <SignInForm linkError={error !== undefined} minutes={LOGIN_LINK_MINUTES} devHint={!isProduction} />;
}
