import type { Metadata } from "next";
import { BackendGate } from "@/components/BackendGate";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Admin Console · ${BRAND_NAME}`,
  description: `Log team activity and Activity Report/MOM for ${BRAND_NAME}.`,
};

export default function BackendPage() {
  return <BackendGate />;
}
