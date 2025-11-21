"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

interface WeChatQRCodeProps {
  onClose: () => void;
}

export default function WeChatQRCode({ onClose }: WeChatQRCodeProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white p-8 rounded-lg shadow-xl text-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">扫码联系客服</h3>
        <div className="flex gap-8">
          <div>
            <Image src="/客服1.jpg" alt="客服1" width={150} height={150} />
            <p className="mt-2">客服1</p>
          </div>
          <div>
            <Image src="/客服2.jpg" alt="客服2" width={150} height={150} />
            <p className="mt-2">客服2</p>
          </div>
        </div>
        <Button onClick={onClose} className="mt-6">关闭</Button>
      </div>
    </div>
  );
}
