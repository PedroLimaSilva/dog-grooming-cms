import { mount } from "svelte";
import { registerSW } from "virtual:pwa-register";
import "./app.css";
import App from "./App.svelte";
import { handleDropboxOAuthRedirect } from "./lib/dropbox/oauthCallback";

registerSW({ immediate: true });

await handleDropboxOAuthRedirect();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
