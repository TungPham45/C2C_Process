import React, { FC, useEffect, useState } from 'react';
import { PRODUCT_API_URL, resolveAssetUrl } from '../config/api';

interface FollowersModalProps {
  shopId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export const FollowersModal: FC<FollowersModalProps> = ({ shopId, isOpen, onClose }) => {
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    const fetchFollowers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${PRODUCT_API_URL}/shops/${shopId}/followers`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setFollowers(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFollowers();
    return () => { isMounted = false; };
  }, [shopId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-[#e4e9f0] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Người theo dõi</h2>
          <button onClick={onClose} className="text-[#707882] hover:text-[#0f1d25] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 flex justify-center">
              <span className="material-symbols-outlined animate-spin text-[#00629d] text-3xl">progress_activity</span>
            </div>
          ) : followers.length === 0 ? (
            <div className="p-12 text-center text-[#707882]">
              <span className="material-symbols-outlined text-5xl text-[#e4e9f0] mb-3">group_off</span>
              <p className="text-sm">Chưa có ai theo dõi cửa hàng này.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f3f8]">
              {followers.map((f: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-4 hover:bg-[#f9fafc] transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#f0f3f8] overflow-hidden shrink-0 border border-[#e4e9f0]">
                    {f.user?.avatar_url ? (
                      <img src={resolveAssetUrl(f.user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-[#bfc7d3]">person</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0f1d25] text-sm">{f.user?.full_name || 'Người dùng ẩn danh'}</h3>
                    <p className="text-xs text-[#707882] mt-0.5">Theo dõi từ {new Date(f.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
