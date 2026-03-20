import { contextBridge, ipcRenderer } from "electron";
import type { ProjectSliceBundle } from "./projectSlice";
import type { ShellCreateProjectInput, ShellCreateProjectResult } from "../workspace/createProject";
import type { EditableProjectData, SaveEditableProjectResult } from "../workspace/editableProject";
import { buildPropertyPanelViewModel, type PropertyPanelInput, type PropertyPanelViewModel } from "../ui/adapters/PropertyPanelAdapter";

contextBridge.exposeInMainWorld("myideApi", {
  loadProjectSlice: (selectedProjectId?: string): Promise<ProjectSliceBundle> => ipcRenderer.invoke("myide:load-project-slice", selectedProjectId),
  createProject: (input: ShellCreateProjectInput): Promise<ShellCreateProjectResult> => ipcRenderer.invoke("myide:create-project", input),
  saveProjectEditor: (projectId: string, data: EditableProjectData): Promise<SaveEditableProjectResult> => ipcRenderer.invoke("myide:save-project-editor", projectId, data),
  buildPropertyPanelViewModel: (input: PropertyPanelInput): PropertyPanelViewModel => buildPropertyPanelViewModel(input)
});
