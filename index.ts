import { AppRegistry } from "react-native";
import App from "./App";
import appConfig from "./app.json";

const appName = (appConfig as { expo?: { name?: string } }).expo?.name ?? "main";

// Register both the Expo app name and the default "main" entry to satisfy native expectations
AppRegistry.registerComponent(appName, () => App);
if (appName !== "main") {
  AppRegistry.registerComponent("main", () => App);
}
