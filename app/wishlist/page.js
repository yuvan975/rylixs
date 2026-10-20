import { Suspense } from "react";
import Catalog from "@/components/Catalog";
export default function Page() {
  return (
    <Suspense>
      <Catalog wishlist />
    </Suspense>
  );
}
