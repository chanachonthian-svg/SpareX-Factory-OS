import { Topbar } from "@/components/os/Topbar";
import { VortiqModule } from "@/components/vortiq/VortiqModule";

export const metadata = { title: "Vortiq Compressed Air" };

export default function VortiqPage() {
  return (
    <>
      <Topbar title="Vortiq Compressed Air" subtitle="Compressed-air efficiency, leaks & pressure · Powered by SpareX" />
      <main className="p-5 lg:p-8">
        <VortiqModule />
      </main>
    </>
  );
}
