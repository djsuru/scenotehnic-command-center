import {
  AnimatePresence,
  motion,
  type Transition,
  useAnimate,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Children, isValidElement, type ReactNode, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Motion helpers on framer-motion, with the house timing: a spring with no
 * bounce (no overshoot on text) that settles in about 350 ms.
 *
 * Each helper reads `useReducedMotion()`. For a person who asked for less
 * motion, it drops the movement and shows the final state at once, so a
 * caller needs no extra check. Content always renders.
 *
 * - `Reveal`: fades and rises one block in when it mounts.
 * - `Stagger` + `StaggerItem`: reveals a list or grid one item after another.
 * - `Presence`: animates keyed children in and out (list add and remove, or a
 *   section or page swap keyed by its id or route).
 * - `HoverLift`: lifts a card a little and deepens its shadow on hover.
 * - `SavePulse`: plays a short pulse each time `pulseKey` changes, for example
 *   when a save lands. Its children keep their state.
 * - `Collapse`: opens and closes a section by its height (a disclosure, a
 *   group of rows under a header button).
 */

const SPRING: Transition = { type: 'spring', bounce: 0, duration: 0.35 };

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds before the reveal starts. */
  delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay }}
    >
      {children}
    </motion.div>
  );
}

const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: SPRING },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Seconds between two items. A long list shortens it (`MAX_STAGGER_SECONDS`). */
  step?: number;
}

/**
 * The longest spread of a `Stagger`, in seconds. With the 350 ms item spring,
 * every entrance ends within about 0.85 s, inside the 1.2 s settle of the
 * thumbnail and visual-QA captures, so no capture shows a half-revealed list.
 */
export const MAX_STAGGER_SECONDS = 0.5;

/** The delay between two items: `step`, shortened so a long list keeps the cap. */
export function staggerStep(itemCount: number, step: number): number {
  return itemCount > 1 ? Math.min(step, MAX_STAGGER_SECONDS / (itemCount - 1)) : step;
}

/** The list or grid container. Put each item in a `StaggerItem`. */
export function Stagger({ children, className, step = 0.05 }: StaggerProps) {
  const reduceMotion = useReducedMotion() === true;
  const delay = staggerStep(Children.count(children), step);
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={STAGGER_ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

interface PresenceProps {
  /** Elements with a stable `key`. A changed key plays the exit, then the enter. */
  children: ReactNode;
  className?: string;
  /**
   * `popLayout` (default) lets the other items slide into place while one
   * leaves, for a list. `wait` lets the old element leave before the new one
   * enters, for a page or section swap.
   */
  mode?: 'popLayout' | 'wait';
}

export function Presence({ children, className, mode = 'popLayout' }: PresenceProps) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <AnimatePresence initial={false} mode={mode}>
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <motion.div
            key={child.key}
            className={className}
            layout={reduceMotion || mode === 'wait' ? false : 'position'}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={SPRING}
          >
            {child}
          </motion.div>
        ) : (
          child
        ),
      )}
    </AnimatePresence>
  );
}

interface HoverLiftProps {
  children: ReactNode;
  /** Defaults to `rounded-xl`, the radius of `ui/card`, so the shadow follows the card. */
  className?: string;
}

export function HoverLift({ children, className }: HoverLiftProps) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <motion.div
      className={cn('rounded-xl transition-shadow duration-300 hover:shadow-lg', className)}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={SPRING}
    >
      {children}
    </motion.div>
  );
}

interface SavePulseProps {
  children: ReactNode;
  className?: string;
  /** Change this value (a saved row id, a save counter) to play the pulse. */
  pulseKey: string | number | null | undefined;
}

export function SavePulse({ children, className, pulseKey }: SavePulseProps) {
  const reduceMotion = useReducedMotion() === true;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const previousKey = useRef(pulseKey);

  useEffect(() => {
    if (Object.is(previousKey.current, pulseKey)) {
      return;
    }
    previousKey.current = pulseKey;
    if (reduceMotion || scope.current == null) {
      return;
    }
    void animate(scope.current, { scale: [1, 1.03, 1] }, { duration: 0.3, ease: 'easeOut' });
  }, [pulseKey, reduceMotion, animate, scope]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}

interface CollapseProps {
  /** Shows the children when true. A change plays the open or close. */
  open: boolean;
  children: ReactNode;
  /** Put padding on the children, not here: the height animates on this element. */
  className?: string;
}

/**
 * Opens and closes its children by height (0 to auto) with a fade. The first
 * render shows the start state at once, so a section that starts open does not
 * animate on page load.
 */
export function Collapse({ open, children, className }: CollapseProps) {
  const reduceMotion = useReducedMotion() === true;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className={cn('overflow-hidden', className)}
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
          transition={SPRING}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
