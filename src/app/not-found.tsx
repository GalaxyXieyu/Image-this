import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h2 style={{ fontSize: 20, margin: 0 }}>页面不存在</h2>
      <p style={{ marginTop: 8, color: '#555' }}>你访问的页面未找到。</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
          返回首页
        </Link>
      </p>
    </div>
  );
}

