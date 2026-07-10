import { notFound } from "next/navigation";

// Any URL that no localized route matched renders the localized 404.
export default function CatchAllNotFound() {
  notFound();
}
