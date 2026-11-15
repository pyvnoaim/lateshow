import { redirect } from "next/navigation";
import { getSession, LOGIN_CODE_MINUTES } from "@/lib/auth";
import { SignInForm } from "./components/SignInForm";
import { nextWithQuery, safeNext } from "@/lib/safeNext";

export async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = nextWithQuery(safeNext(params.next), params);
  if (await getSession()) redirect(next);
  return <SignInForm minutes={LOGIN_CODE_MINUTES} next={next} />;
}
