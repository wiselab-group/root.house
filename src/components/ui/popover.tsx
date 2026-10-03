"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 8,
  collisionBoundary,
  collisionPadding,
  collisionAvoidance,
  sticky,
  className,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    | "align"
    | "alignOffset"
    | "side"
    | "sideOffset"
    | "collisionBoundary"
    | "collisionPadding"
    | "collisionAvoidance"
    | "sticky"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-instant data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 outline-none",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

/**
 * A tail from the popup's edge to its anchor, filled with the popup's own
 * surface (`fill`) and outlined with its ring (`stroke`), so popup and tail
 * read as one shape. Drawn pointing up; rotated per side. Its box overlaps
 * the popup by 2px: the outline starts on the ring's line (y 11.5) and the
 * fill below it covers the ring between, so the seam disappears. Hidden
 * when the popup slid along the edge (`sticky`) too far to point at its
 * anchor. Must sit outside any scroll container inside the popup, or it
 * gets clipped.
 */
function PopoverArrow({
  className,
  fill = "fill-popover",
  stroke = "stroke-foreground/10",
  ...props
}: PopoverPrimitive.Arrow.Props & { fill?: string; stroke?: string }) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      className={cn(
        "flex data-uncentered:opacity-0 data-[side=bottom]:-top-3 data-[side=left]:-right-[19px] data-[side=left]:rotate-90 data-[side=right]:-left-[19px] data-[side=right]:-rotate-90 data-[side=top]:-bottom-3 data-[side=top]:rotate-180",
        className,
      )}
      {...props}
    >
      <svg
        width="28"
        height="14"
        viewBox="0 0 28 14"
        aria-hidden="true"
        className="overflow-visible"
      >
        <path
          d="M0 11.5C3.5 11.5 5.6 10.6 7.6 8.6L12.4 2.6Q14 0.8 15.6 2.6L20.4 8.6C22.4 10.6 24.5 11.5 28 11.5V14H0Z"
          className={fill}
        />
        <path
          d="M0 11.5C3.5 11.5 5.6 10.6 7.6 8.6L12.4 2.6Q14 0.8 15.6 2.6L20.4 8.6C22.4 10.6 24.5 11.5 28 11.5"
          fill="none"
          strokeWidth="1"
          className={stroke}
        />
      </svg>
    </PopoverPrimitive.Arrow>
  );
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverArrow, PopoverClose };
