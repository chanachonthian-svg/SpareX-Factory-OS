import { Topbar } from "@/components/os/Topbar";
import { PqWorkflow } from "@/components/energy/PqWorkflow";

export const metadata = { title: "Power Quality Intelligence" };

export default function PowerQualityPage() {
  return (
    <>
      <Topbar
        title="Power Quality Intelligence™"
        subtitle="Harmonics · THD · disturbance analytics · Powered by SpareX"
      />
      <main className="p-5 lg:p-8">
        <PqWorkflow />
      </main>
    </>
  );
}
