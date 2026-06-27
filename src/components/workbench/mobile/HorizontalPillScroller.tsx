export function HorizontalPillScroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}
