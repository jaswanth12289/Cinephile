export const transitionPreset = {
  duration: 0.25,
  ease: "easeOut",
};

export const hoverScale = 1.02;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transitionPreset,
};

export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: transitionPreset,
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: transitionPreset,
};

export const tapAnimation = {
  whileTap: { scale: 0.98 },
};

export const hoverAnimation = {
  whileHover: { scale: hoverScale },
  whileTap: { scale: 0.98 },
  transition: transitionPreset,
};
