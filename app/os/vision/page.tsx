import { Topbar } from "@/components/os/Topbar";
import { VisionWorkspace } from "@/components/vision/VisionWorkspace";

export const metadata = { title: "VisionIQ" };

export default function VisionPage() {
  return (
    <>
      <Topbar
        title="VisionIQ™"
        subtitle="AI vision intelligence · from visual inspection to business intelligence · Powered by SpareX"
      />
      <VisionWorkspace />
    </>
  );
}
