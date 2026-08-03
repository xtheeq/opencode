import type { Blocker } from "@/stores/store";
import { FormCard } from "./form-card";
import { PermissionCard } from "./permission-card";

export function BlockerDock({ blocker }: { blocker: Blocker }) {
  if (blocker.kind === "permission")
    return <PermissionCard request={blocker.request} />;
  return <FormCard form={blocker.request} />;
}
