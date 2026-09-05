import type { Metadata } from "next";
import { BackendGate } from "@/components/BackendGate";

export const metadata: Metadata = {
  title: "Admin Console · Team Schedule Dashboard",
  description: "Log team activity and Activity Report/MOM for the public Team Schedule Dashboard.",
};

export default function BackendPage() {
  return <BackendGate />;
}
