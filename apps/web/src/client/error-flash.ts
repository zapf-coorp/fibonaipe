let armed: HTMLElement | null = null;
let listening = false;

function arm(target: EventTarget | null): void {
  if (!(target instanceof Element)) return;
  const item = target.closest("button, a, input, select, label, [role='button']");
  if (item instanceof HTMLElement) armed = item;
}

function listen(): void {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("pointerdown", (event) => arm(event.target), true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      arm(event.target);
    },
    true,
  );
}

export function beginErrorFlash(): HTMLElement | null {
  listen();
  const element = armed;
  armed = null;
  return element;
}

listen();

export function showErrorFlash(element: HTMLElement | null): void {
  if (!element?.isConnected) return;
  element.classList.remove("errorFlash");
  void element.offsetWidth;
  element.classList.add("errorFlash");
  window.setTimeout(() => element.classList.remove("errorFlash"), 680);
}
