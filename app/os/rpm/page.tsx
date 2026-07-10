import { Topbar } from "@/components/os/Topbar";
import { RpmWorkspace } from "@/components/rpm/RpmWorkspace";

export const metadata = { title: "RPM Intelligence" };

export default function RpmPage() {
  return (
    <>
      <Topbar
        title="RPM Intelligence™"
        subtitle="Rotating machinery health · vibration, temperature & current · Powered by SpareX"
      />
      <RpmWorkspace />
    </>
  );
}
