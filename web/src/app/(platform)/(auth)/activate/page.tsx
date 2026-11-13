"use client";

import { useEffect } from "react";
import { SkeletonLines } from "@/components/ui/Skeleton";

/** Activation emails sent before the move link here. Forward to /activate-account/ with the same query. */
export default function OldActivatePage() {
  useEffect(() => {
    window.location.replace(`/activate-account/${window.location.search}`);
  }, []);
  return <SkeletonLines lines={3} />;
}
