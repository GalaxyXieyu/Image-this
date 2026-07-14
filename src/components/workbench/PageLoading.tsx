export function PageLoading() {
  return (
    <div className="h-full overflow-hidden bg-background" role="status" aria-label="页面加载中">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <div className="h-8 w-44 animate-pulse rounded-full bg-surface-muted" />
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="aspect-[4/3] animate-pulse rounded-[18px] border border-line bg-surface-muted"
              />
            ))}
          </div>
          <div className="hidden animate-pulse rounded-[18px] border border-line bg-surface-muted lg:block" />
        </div>
      </div>
      <span className="sr-only">页面加载中</span>
    </div>
  );
}
