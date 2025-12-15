'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>页面发生错误</h2>
      <p style={{ marginTop: 8, color: '#555' }}>可以尝试刷新或点击下方按钮重试。</p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          marginTop: 12,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #ddd',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        重试
      </button>
      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', color: '#999' }}>{error?.message}</pre>
    </div>
  );
}

