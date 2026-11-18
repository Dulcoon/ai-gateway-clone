import { redirect } from "next/navigation";

// Induk /dashboard/media-providers dipindah ke /dashboard/media-providers/image
export default function MediaProvidersIndex() {
  redirect("/dashboard/media-providers/image");
}
