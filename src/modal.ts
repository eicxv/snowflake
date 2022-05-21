import { ExtensionUnavailableError, WebglCreationError } from "./webgl/errors";

export function showModal(
  message: { header: string; content: string },
  settings: { confirm?: boolean; cancel?: boolean; input?: boolean } = {},
  classNames?: string[]
): Promise<[boolean | null, string | null]> {
  settings = { confirm: false, cancel: false, input: false, ...settings };
  const promises = [];
  const { modal, content } = addModal(message, classNames);

  const input = settings.input ? addInput(["input"]) : null;
  if (input) {
    content.appendChild(input);
    input.focus();
  }
  if (settings.confirm) {
    const button = addButton("Confirm", ["confirm"]);
    promises.push(createPromiseFromDomEvent(button, "click", () => true));
    content.appendChild(button);
    input || button.focus();
  }
  if (settings.cancel) {
    const button = addButton("cancel", ["cancel"]);
    promises.push(createPromiseFromDomEvent(button, "click", () => false));
    content.appendChild(button);
  }

  promises.push(
    createPromiseFromDomEvent(
      modal,
      "keydown",
      (e: Event) => (e as KeyboardEvent).key === "Enter",
      (event: Event) => {
        const e = event as KeyboardEvent;
        return e.key === "Escape" || e.key === "Enter";
      }
    )
  );
  return Promise.any(promises).then((value: boolean | null) => {
    modal.remove();
    if (input) {
      return [value, input.value];
    }
    return [value, null];
  });
}

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
  showModal({ header: "Webgl Error", content: message }, {}, ["error"]);
}

function addModal(
  message: {
    header: string;
    content: string;
  },
  classNames: string[] = []
): { modal: HTMLElement; content: HTMLElement } {
  const modal = document.createElement("div");
  modal.classList.add("modal");
  const content = document.createElement("div");
  content.classList.add("modal-content");
  content.classList.add(...classNames);
  const h = document.createElement("h1");
  const p = document.createElement("p");
  h.textContent = message.header;
  p.textContent = message.content;
  content.appendChild(h);
  content.appendChild(p);
  modal.appendChild(content);
  document.body.append(modal);
  return { modal, content };
}

function addButton(text: string, classNames: string[]): HTMLElement {
  const button = document.createElement("button");
  button.classList.add(...classNames);
  button.setAttribute("type", "button");
  button.textContent = text;
  return button;
}

function addInput(
  classNames: string[],
  placeholder: string = ""
): HTMLInputElement {
  const input = document.createElement("input");
  input.classList.add(...classNames);
  input.setAttribute("type", "number");
  input.setAttribute("min", "1");
  input.setAttribute("placeholder", placeholder);
  return input;
}

function createPromiseFromDomEvent<T>(
  eventTarget: EventTarget,
  eventName: string,
  value: (event: Event) => T,
  resolveCondition?: (event: Event) => boolean
): Promise<T> {
  return new Promise<T>((resolve) => {
    const handleEvent = (event: Event): void => {
      if (resolveCondition == null || resolveCondition(event)) {
        eventTarget.removeEventListener(eventName, handleEvent);
        resolve(value(event));
      }
    };

    eventTarget.addEventListener(eventName, handleEvent);
  });
}
