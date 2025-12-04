import { redirect } from "next/navigation";

export default function HomePage() {
  // Middleware will handle authentication
  // Redirect unauthenticated users to sign-in
  redirect("/sign-in");
}
