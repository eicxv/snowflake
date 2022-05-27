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
      () => false,
      (event: Event) => {
        const e = event as KeyboardEvent;
        return e.key === "Escape";
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

export function showError(err: unknown): void {
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
  h.innerHTML = message.header;
  p.innerHTML = message.content;
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

export function showCrop(init: {
  x: number;
  y: number;
  scale: number;
}): Promise<[boolean | null, { x: number; y: number; scale: number }]> {
  const promises = [];
  const { modal, content } = addModal(
    {
      header: "Zoom",
      content: "Select zoom factor and position.",
    },
    ["classNames"]
  );
  const zInput = numberInput("Zoom", [1, Infinity], 0.01, 1 / init.scale);
  content.appendChild(zInput[0]);
  zInput[1].focus();
  const xInput = numberInput("X", [-1, 1], 0.01, init.x);
  content.appendChild(xInput[0]);
  const yInput = numberInput("Y", [-1, 1], 0.01, init.y);
  content.appendChild(yInput[0]);
  content.appendChild(createCropSvg());
  const vp = document.getElementById("viewport") as SVGRectElement | null;
  if (!vp) {
    throw new Error("viewport not found");
  }
  const crop = new Viewport(xInput[1], yInput[1], zInput[1], vp);
  crop.update();
  const buttons = document.createElement("div");
  {
    const button = addButton("Confirm", ["confirm"]);
    promises.push(createPromiseFromDomEvent(button, "click", () => true));
    buttons.appendChild(button);
  }
  {
    const button = addButton("cancel", ["cancel"]);
    promises.push(createPromiseFromDomEvent(button, "click", () => false));
    buttons.appendChild(button);
  }
  content.appendChild(buttons);

  promises.push(
    createPromiseFromDomEvent(
      modal,
      "keydown",
      () => false,
      (event: Event) => {
        const e = event as KeyboardEvent;
        return e.key === "Escape";
      }
    )
  );
  return Promise.any(promises).then((value: boolean | null) => {
    modal.remove();
    return [value, { x: crop.x, y: crop.y, scale: crop.scale }];
  });
}

function numberInput(
  labelStr: string,
  bounds: [number, number],
  step: number,
  initial: number
): [HTMLElement, HTMLInputElement] {
  const [min, max] = bounds;
  const container = document.createElement("div");
  container.setAttribute(
    "style",
    "display: flex; flex-direction: row; justify-content: space-between; align-items: center;margin-top: 0.5rem;"
  );
  const label = document.createElement("label");
  setAttributes(label, {
    for: labelStr,
  });
  label.innerText = labelStr;

  const input = document.createElement("input");
  input.classList.add("input");
  setAttributes(input, {
    id: labelStr,
    type: "number",
    min: min.toString(),
    max: max.toString(),
    step: step.toString(),
    style: "margin-top: 0; width: 7rem;",
  });
  input.value = initial.toString();

  container.appendChild(label);
  container.appendChild(input);
  return [container, input];
}

function createCropSvg(): SVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "-1.1 -1.1 2.2 2.2");
  svg.setAttribute(
    "style",
    "margin: 0 auto; margin-top: 1rem; max-width: 40vh"
  );

  const bounds = document.createElementNS(ns, "rect");
  setAttributes(bounds, {
    id: "bounds",
    x: "-1",
    y: "-1",
    width: "2",
    height: "2",
    fill: "#ccc",
    stroke: "black",
    "stroke-width": "5",
    "vector-effect": "non-scaling-stroke",
  });
  svg.appendChild(bounds);

  const viewport = document.createElementNS(ns, "rect");
  setAttributes(viewport, {
    id: "viewport",
    x: "-1",
    y: "-1",
    width: "2",
    height: "2",
    fill: "#fff",
    stroke: "black",
    "stroke-width": "3",
    "vector-effect": "non-scaling-stroke",
    transform: "scale(1) translate(0, 0)",
  });
  svg.appendChild(viewport);

  for (let i = 0; i < 3; i++) {
    const line = document.createElementNS(ns, "line");
    setAttributes(line, {
      x1: "-0.3",
      y1: "0",
      x2: "0.3",
      y2: "0",
      stroke: "#222",
      "stroke-width": "5",
      "vector-effect": "non-scaling-stroke",
      transform: `rotate(${i * 60} 0 0)`,
    });
    svg.appendChild(line);
  }
  return svg;
}

function setAttributes(
  el: HTMLElement | SVGElement,
  attributes: { [key: string]: string }
): void {
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
}

class Viewport {
  _x: HTMLInputElement;
  _y: HTMLInputElement;
  _zoom: HTMLInputElement;
  viewport: SVGRectElement;
  bounds: {
    x: [number, number];
    y: [number, number];
    zoom: [number, number];
    scale: [number, number];
  };

  constructor(
    x: HTMLInputElement,
    y: HTMLInputElement,
    zoom: HTMLInputElement,
    viewport: SVGRectElement
  ) {
    this._x = x;
    this._y = y;
    this._zoom = zoom;
    this.viewport = viewport;
    this.bounds = {
      x: [-0.95, 0.95],
      y: [-0.95, 0.95],
      zoom: [1, Infinity],
      scale: [0, 1],
    };
    this.setListeners();
  }

  private setListeners(): void {
    this._x.addEventListener("change", () => {
      this.x = this.validate(parseFloat(this._x.value));
    });
    this._y.addEventListener("change", () => {
      this.y = this.validate(parseFloat(this._y.value));
    });
    this._zoom.addEventListener("change", () => {
      this.zoom = this.validate(parseFloat(this._zoom.value));
    });
  }

  private validate(v: number): number {
    if (isNaN(v) || !isFinite(v)) {
      return 0;
    }
    return v;
  }

  get x(): number {
    return parseFloat(this._x.value);
  }

  set x(v: number) {
    v = clamp(v, ...this.bounds.x);
    const bnd = Math.abs(1 - this.scale);
    v = clamp(v, -bnd, bnd);
    this._x.value = v.toString();
    this.update();
  }

  get y(): number {
    return parseFloat(this._y.value);
  }

  set y(v: number) {
    v = clamp(v, ...this.bounds.y);
    const bnd = Math.abs(1 - this.scale);
    v = clamp(v, -bnd, bnd);
    this._y.value = v.toString();
    this.update();
  }

  get scale(): number {
    return 1 / parseFloat(this._zoom.value);
  }

  set scale(v: number) {
    v = clamp(v, ...this.bounds.scale);
    if (Math.abs(this.x) > 1 - v) {
      this._x.value = (1 - Math.abs(v)).toString();
    }
    if (Math.abs(this.y) > 1 - v) {
      this._y.value = (1 - Math.abs(v)).toString();
    }
    this._zoom.value = (1 / v).toString();
    this.update();
  }

  get zoom(): number {
    return parseFloat(this._zoom.value);
  }

  set zoom(v: number) {
    this.scale = 1 / v;
  }

  update(): void {
    this.viewport.setAttribute("transform", this.toTransform());
  }

  private toTransform(): string {
    return `translate(${this.x}, ${-this.y}) scale(${this.scale})`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
