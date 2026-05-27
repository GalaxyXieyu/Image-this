/**
 * Workbench Root Page
 *
 * Redirects to the new homepage or scene workspace depending on auth state.
 * This is a transitional route during the rebuild.
 */

import { redirect } from "next/navigation";

export default function WorkbenchRootPage() {
  redirect("/");
}
