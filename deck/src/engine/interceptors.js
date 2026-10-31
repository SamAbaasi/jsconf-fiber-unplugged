// Lets the current slide take a "next" click for itself. The dialogue box uses
// this: a click while a line is still typing finishes the line instead of
// moving to the next step.

let nextHandler = null;

export function setNextInterceptor(fn) {
  nextHandler = fn;
  return () => {
    if (nextHandler === fn) nextHandler = null;
  };
}

// Returns true if the click was used up by the slide.
export function interceptNext() {
  return nextHandler ? nextHandler() === true : false;
}
