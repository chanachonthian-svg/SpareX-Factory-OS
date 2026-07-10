import { Topbar } from "@/components/os/Topbar";
import { AssetUnderDevelopment } from "@/components/asset/AssetUnderDevelopment";
// The full APM workspace is built and ready — to re-enable, swap the import + render below:
// import { AssetWorkspace } from "@/components/asset/AssetWorkspace";

export const metadata = { title: "AssetIQ" };

export default function AssetsPage() {
  return (
    <>
      <Topbar title="AssetIQ™" subtitle="Asset performance management · under development · Powered by SpareX" />
      <AssetUnderDevelopment />
      {/* <AssetWorkspace /> */}
    </>
  );
}
