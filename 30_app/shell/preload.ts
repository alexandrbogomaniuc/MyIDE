import { contextBridge, ipcRenderer } from "electron";
import type { ProjectSliceBundle } from "./projectSlice";

contextBridge.exposeInMainWorld("myideApi", {
  loadProjectSlice: (): Promise<ProjectSliceBundle> => ipcRenderer.invoke("myide:load-project-slice")
});
