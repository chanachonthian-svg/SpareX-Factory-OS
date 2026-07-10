import { Topbar } from "@/components/os/Topbar";
import { EnergyIntelligence } from "@/components/energy/EnergyIntelligence";

export const metadata = { title: "Energy Intelligence" };

export default function EnergyPage() {
  return (
    <>
      <Topbar title="EnergyAI™" subtitle="Energy intelligence · every kilowatt accounted for · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <EnergyIntelligence />
      </main>
    </>
  );
}
