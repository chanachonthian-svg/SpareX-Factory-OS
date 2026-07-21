import { Topbar } from "@/components/os/Topbar";
import { OperationalTwin } from "@/components/optwin/OperationalTwin";

export const metadata = { title: "Digital Twin" };

export default function TwinPage() {
  return (
    <>
      <Topbar title="Digital Twin™" subtitle="The living operational model of your plant · Bangkok Plant 1" />
      <main className="p-5 lg:p-8">
        <OperationalTwin />
      </main>
    </>
  );
}
