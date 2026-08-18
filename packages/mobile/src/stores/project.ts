import { setLocation } from "@/services/server-store";
import { eventStore } from "./store";
import { syncLocation } from "./sync";

/**
 * Activate a project by its canonical directory. Session creation and the
 * composer catalog read `_defaultLocation`, so switching retargets both;
 * `syncLocation` re-fetches the location's suggestion catalog and global
 * blockers. The resolved location (which may gain a workspace ID) is persisted
 * so the picker can mark it as the last-chosen project.
 */
export async function selectProject(directory: string) {
  eventStore.setState((s) => {
    s._defaultLocation = { directory, workspaceID: undefined };
  });
  await syncLocation().catch(() => undefined);
  await setLocation(eventStore.getState()._defaultLocation);
}

/**
 * Fall back to the server's default location (daemon working directory) when
 * the server knows no projects yet.
 */
export async function activateDefaultLocation() {
  eventStore.setState((s) => {
    s._defaultLocation = { directory: "" };
  });
  await syncLocation().catch(() => undefined);
  await setLocation(eventStore.getState()._defaultLocation);
}
