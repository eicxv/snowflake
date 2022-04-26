import { ExtensionUnavailableError, WebglCreationError } from "./webgl/errors";

export function displayError(err: unknown): void {
  let message;
  if (err instanceof WebglCreationError) {
    message =
      "Failed to create Webgl2 context. Ensure Webgl2 is supported on this device and browser.";
  } else if (err instanceof ExtensionUnavailableError) {
    message = `Required Webgl extension "${err.extensionName}" is unavailable.`;
  } else {
    throw err;
  }
  const div = document.createElement("div");
  div.classList.add("error");
  const h = document.createElement("h1");
  const p = document.createElement("p");
  h.textContent = "Webgl Error";
  p.textContent = message;
  div.appendChild(h);
  div.appendChild(p);
  document.body.append(div);
}
