import { contextBridge, ipcRenderer } from "electron";
import type { ProjectSliceBundle } from "./projectSlice";
import type { ShellCreateProjectInput, ShellCreateProjectResult } from "../workspace/createProject";

contextBridge.exposeInMainWorld("myideApi", {
  loadProjectSlice: (): Promise<ProjectSliceBundle> => ipcRenderer.invoke("myide:load-project-slice"),
  createProject: (input: ShellCreateProjectInput): Promise<ShellCreateProjectResult> => ipcRenderer.invoke("myide:create-project", input)
});
