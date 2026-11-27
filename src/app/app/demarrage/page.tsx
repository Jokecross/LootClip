import { redirect } from "next/navigation";

/* L'ancien tutoriel console n'a plus de sens depuis le pivot « lien → clips » : on va droit au studio. */
export default function Demarrage() {
  redirect("/app/creer");
}
