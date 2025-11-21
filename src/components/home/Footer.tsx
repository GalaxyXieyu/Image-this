"use client";

import { useState } from "react";
import WeChatQRCode from "./WeChatQRCode";

export default function Footer() {
  const [showQRCode, setShowQRCode] = useState(false);

  return (
    <>
      <footer className="bg-gray-100 text-gray-800 py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">博捷科技</h3>
            <p className="text-gray-600">专业提供化妆品定制、批量生产、样品申请和设计咨询服务</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">联系我们</h3>
            <ul className="space-y-2 text-gray-600">
              <li>电话: <a href="tel:16626181662" className="hover:text-amber-600">16626181662</a></li>
              <li>邮箱: <a href="mailto:1216278493@qq.com" className="hover:text-amber-600">1216278493@qq.com</a></li>
              <li>地址: 广东省汕头市金平区岐山街道寨头南澳路F栋1号</li>
              <li>
                <button 
                  onClick={() => setShowQRCode(true)} 
                  className="text-amber-600 hover:underline"
                >
                  微信客服
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">服务支持</h3>
            <ul className="space-y-2 text-gray-600">
              <li><a href="#" className="hover:text-amber-600">产品定制</a></li>
              <li><a href="#" className="hover:text-amber-600">批量生产</a></li>
              <li><a href="#" className="hover:text-amber-600">样品申请</a></li>
              <li><a href="#" className="hover:text-amber-600">设计咨询</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 text-center mt-8 border-t pt-6">
          <p className="text-gray-500">© 2024 Imagine This. 专业AI图像处理平台.</p>
        </div>
      </footer>
      {showQRCode && <WeChatQRCode onClose={() => setShowQRCode(false)} />}
    </>
  );
}
