'use client';

import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SpringOptions,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_HEIGHT = 64;

type DockProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockInjectedProps = {
  width?: MotionValue<number>;
  isHovered?: MotionValue<number>;
};

type DockItemProps = {
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type DockLabelProps = DockInjectedProps & {
  className?: string;
  children: ReactNode;
};

type DockIconProps = DockInjectedProps & {
  className?: string;
  children: ReactNode;
};

type DockContextType = {
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  magnification: number;
  distance: number;
};

const DockContext = createContext<DockContextType | undefined>(undefined);

function useDock() {
  const context = useContext(DockContext);
  if (!context) throw new Error('useDock must be used within a Dock');
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const isHovered = useMotionValue(0);
  const maxHeight = useMemo(
    () => Math.max(panelHeight, magnification + magnification / 2 + 4),
    [magnification, panelHeight],
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  // why: `m` + domAnimation carrega só animações, exit e gestos; o `motion` completo inclui drag e layout sem uso aqui.
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        style={{ height, scrollbarWidth: 'none' }}
        className="mx-2 flex max-w-full items-end overflow-x-auto"
      >
        <m.div
          onMouseMove={({ clientX }) => {
            isHovered.set(1);
            mouseX.set(clientX);
          }}
          onMouseLeave={() => {
            isHovered.set(0);
            mouseX.set(Number.POSITIVE_INFINITY);
          }}
          className={cn(
            'mx-auto flex w-fit gap-3 rounded-2xl px-3',
            className,
          )}
          style={{ height: panelHeight }}
          role="toolbar"
          aria-label="Ações do editor"
        >
          <DockContext.Provider value={{ mouseX, spring, distance, magnification }}>
            {children}
          </DockContext.Provider>
        </m.div>
      </m.div>
    </LazyMotion>
  );
}

function DockItem({ children, className, label, onClick, disabled }: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { distance, magnification, mouseX, spring } = useDock();
  const isHovered = useMotionValue(0);
  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return value - rect.x - rect.width / 2;
  });
  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40],
  );
  const width = useSpring(widthTransform, spring);

  return (
    <m.button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{ width, height: width }}
      onClick={onClick}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={cn(
        'relative inline-flex aspect-square items-center justify-center rounded-full',
        className,
      )}
    >
      {Children.map(children, (child) =>
        isValidElement<DockInjectedProps>(child)
          ? cloneElement(child, { width, isHovered })
          : child,
      )}
    </m.button>
  );
}

function DockLabel({ children, className, isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    return isHovered.on('change', (latest) => setIsVisible(latest === 1));
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.span
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.16 }}
          className={cn(
            'absolute -top-7 left-1/2 z-10 w-max -translate-x-1/2 rounded-md border px-2 py-1 text-xs shadow-lg',
            className,
          )}
          role="tooltip"
        >
          {children}
        </m.span>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, width }: DockIconProps) {
  const fallbackWidth = useMotionValue(40);
  const widthTransform = useTransform(width ?? fallbackWidth, (value) => value / 2);

  return (
    <m.span
      style={{ width: widthTransform }}
      className={cn('flex h-full items-center justify-center', className)}
    >
      {children}
    </m.span>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
