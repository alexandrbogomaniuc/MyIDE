import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { loadProjectSlice } from "./projectSlice";

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    backgroundColor: "#0b1017",
    title: "MyIDE",
    webPreferences: {
      preload: path.resolve(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const rendererPath = path.resolve(__dirname, "../../../30_app/shell/renderer/index.html");
  void window.loadFile(rendererPath);
}

app.disableHardwareAcceleration();
app.setAppUserModelId("dev.myide");

ipcMain.handle("myide:load-project-slice", async () => loadProjectSlice());

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
