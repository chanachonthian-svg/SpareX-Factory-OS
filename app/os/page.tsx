import { Topbar } from "@/components/os/Topbar";
import { FactoryBrainWorkspace } from "@/components/brain/FactoryBrainWorkspace";

export const metadata = { title: "Executive Dashboard" };

export default function FactoryBrain() {
  return (
    <>
      <Topbar title="Executive Dashboard" subtitle="Powered by Factory Brain™ · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <FactoryBrainWorkspace />
      </main>
    </>
  );
}
