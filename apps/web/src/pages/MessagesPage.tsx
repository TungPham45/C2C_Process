import { FC, useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';

interface Conversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  shop_id: number;
  last_message_preview: string | null;
  updated_at: string;
  unread_count_buyer: number;
  unread_count_seller: number;
  buyer_name?: string;
  seller_name?: string;
  shop_name?: string;
}

interface Message {
  id: number;
  sender_id: number;
  sender_role: string;
  content: string;
  sent_at: string;
  is_read?: boolean;
  message_type?: string;
}

export const MessagesPage: FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentConvId, setCurrentConvId] = useState<number | null>(null);
  const [chatText, setChatText] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('c2c_user');
    if (!userStr) {
      navigate('/login');
      return;
    }
    setCurrentUser(JSON.parse(userStr));
  }, [navigate]);

  useEffect(() => {
    const convIdStr = searchParams.get('convId');
    if (convIdStr) {
      setCurrentConvId(parseInt(convIdStr));
    }
  }, [searchParams]);

  // Polling Conversations
  useEffect(() => {
    if (!currentUser) return;
    const fetchConvs = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch('/api/chat/conversations', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
        }
      } catch (e) {}
    };
    fetchConvs();
    const interval = setInterval(fetchConvs, 1500);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Polling Messages
  useEffect(() => {
    if (!currentUser || !currentConvId) return;
    const fetchMsgs = async () => {
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (e) {}
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 1500);
    return () => clearInterval(interval);
  }, [currentUser, currentConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !currentConvId) return;

    const token = localStorage.getItem('c2c_token');
    const content = chatText;
    setChatText('');
    
    // Optimistic update
    const optimisticMsg: Message = {
      id: Date.now(),
      sender_id: currentUser.id,
      sender_role: 'buyer', // doesn't matter much for display since ID matches
      content,
      sent_at: new Date().toISOString(),
      is_read: false,
      message_type: 'text'
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, message_type: 'text' })
      });
    } catch (err) {
      alert("Lỗi khi gửi tin nhắn");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentConvId) return;
    
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('c2c_token');
      const uploadRes = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const url = uploadData.url;
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender_id: currentUser.id,
          sender_role: 'buyer',
          content: url,
          sent_at: new Date().toISOString(),
          is_read: false,
          message_type: type
        }]);

        await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: url, message_type: type })
        });
      } else {
        alert('Có lỗi xảy ra khi tải file lên.');
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi tải file lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const currentConv = conversations.find(c => c.id === currentConvId);

  return (
    <MarketplaceLayout>
      <div className="bg-[#f0f3f8] overflow-hidden" style={{ height: 'calc(100vh - 128px)' }}>
        <div className="max-w-[1280px] mx-auto px-4 py-8 h-full">
          <div className="bg-white rounded-[2rem] shadow-sm border border-[#e4e9f0] h-full flex overflow-hidden">
            
            {/* Sidebar (Conversations List) */}
            <div className="w-1/3 border-r border-[#e4e9f0] flex flex-col">
              <div className="p-6 border-b border-[#e4e9f0] bg-[#f9fafc]">
                <h2 className="text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">Tin nhắn</h2>
                <p className="text-xs text-[#707882] mt-1">Kết nối trực tiếp nhanh chóng</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-[#707882] text-sm">Chưa có tin nhắn nào.</div>
                ) : (
                  conversations.map(conv => {
                    const isMyShop = conv.seller_id === currentUser?.id;
                    const unread = isMyShop ? conv.unread_count_seller : conv.unread_count_buyer;
                    const isActive = currentConvId === conv.id;
                    return (
                      <div 
                        key={conv.id}
                        onClick={() => {
                          navigate(`/messages?convId=${conv.id}`);
                          setConversations(prev => prev.map(c => c.id === conv.id ? { 
                            ...c, 
                            unread_count_buyer: isMyShop ? c.unread_count_buyer : 0,
                            unread_count_seller: isMyShop ? 0 : c.unread_count_seller
                          } : c));
                        }}
                        className={`p-5 flex items-center gap-4 cursor-pointer transition-colors border-b border-[#f5faff] ${isActive ? 'bg-[#e0efff]' : 'hover:bg-[#f9fafc]'}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-[#f0f3f8] text-[#00629d] flex items-center justify-center relative flex-shrink-0 border border-[#e4e9f0]">
                          <span className="material-symbols-outlined">{isMyShop ? 'face' : 'storefront'}</span>
                          {unread > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#d32f2f] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                              {unread}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-[#0f1d25] truncate">
                            {isMyShop ? (conv.buyer_name || `Người mua #${conv.buyer_id}`) : (conv.shop_name || `Shop #${conv.shop_id}`)}
                          </h4>
                          <p className={`text-sm truncate ${unread > 0 ? 'text-[#0f1d25] font-bold' : 'text-[#707882]'}`}>
                            {conv.last_message_preview || "Bắt đầu cuộc trò chuyện..."}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${!currentConvId ? 'bg-[#f9fafc]' : 'bg-white'}`}>
              {!currentConvId ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-[#707882]">
                    <div className="w-24 h-24 bg-[#e0efff] rounded-full flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-4xl text-[#00629d]">chat_bubble</span>
                    </div>
                    <p className="font-bold text-lg text-[#0f1d25] mb-2 font-['Plus_Jakarta_Sans']">Tin nhắn của bạn</p>
                    <p className="text-sm">Chọn một đoạn chat để bắt đầu trò chuyện</p>
                 </div>
              ) : (
                 <>
                   {/* Chat Header */}
                   <div className="px-8 py-5 border-b border-[#e4e9f0] flex items-center justify-between bg-white shadow-sm z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#f0f3f8] text-[#00629d] flex items-center justify-center border border-[#e4e9f0]">
                          <span className="material-symbols-outlined">{currentConv?.seller_id === currentUser?.id ? 'face' : 'storefront'}</span>
                        </div>
                        <div>
                          <h3 className="font-black text-lg text-[#0f1d25]">
                              {currentConv?.seller_id === currentUser?.id ? (currentConv?.buyer_name || `Người mua #${currentConv?.buyer_id}`) : (currentConv?.shop_name || `Shop #${currentConv?.shop_id}`)}
                          </h3>
                        </div>
                      </div>
                   </div>

                   {/* Chat Body */}
                   <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-8 bg-[#f9fafc] space-y-6">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-50">
                           <p className="text-sm font-semibold text-[#707882]">Hãy gửi lời chào đầu tiên!</p>
                        </div>
                      ) : (
                        messages.map((msg, index) => {
                          const isMine = msg.sender_id === currentUser?.id;
                          // Determine if this is the last message sent by the user
                          const isLastMyMsg = isMine && (
                            index === messages.length - 1 || 
                            messages.slice(index + 1).findIndex(m => m.sender_id === currentUser?.id) === -1
                          );
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[70%] px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                                 isMine 
                                   ? 'bg-[#00629d] text-white rounded-2xl rounded-tr-sm' 
                                   : 'bg-white text-[#0f1d25] border border-[#e4e9f0] rounded-2xl rounded-tl-sm'
                               }`}>
                                 {msg.message_type === 'image' ? (
                                  <img 
                                    src={msg.content} 
                                    alt="Đính kèm" 
                                    className="max-w-[200px] sm:max-w-[300px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => setSelectedImage(msg.content)}
                                  />
                                 ) : msg.message_type === 'video' ? (
                                  <video src={msg.content} controls className="max-w-[200px] sm:max-w-[300px] rounded-xl" />
                                 ) : (
                                  msg.content
                                 )}
                               </div>
                               <div className="text-[10px] text-[#707882] mt-1.5 font-medium px-1 flex items-center gap-1">
                                 {new Date(msg.sent_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                 {isLastMyMsg && (
                                   <>
                                     <span className="w-1 h-1 bg-[#dbeaf5] rounded-full mx-0.5"></span>
                                     <span className={msg.is_read ? 'text-[#00629d] font-bold' : 'text-[#707882]'}>
                                       {msg.is_read ? 'Đã xem' : 'Đã gửi'}
                                     </span>
                                   </>
                                 )}
                               </div>
                            </div>
                          );
                        })
                      )}
                      <div />
                   </div>

                   {/* Chat Input */}
                   <div className="p-6 bg-white border-t border-[#e4e9f0]">
                      <form onSubmit={handleSendMessage} className="flex items-center gap-4 relative">
                         {isUploading && (
                          <div className="absolute -top-12 left-0 right-0 flex justify-center">
                            <span className="bg-white px-4 py-2 rounded-full text-xs font-bold text-[#00629d] shadow-sm border border-[#e4e9f0] flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-[#00629d] border-t-transparent rounded-full animate-spin"></span>
                              Đang gửi file...
                            </span>
                          </div>
                         )}
                         <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*,video/*" 
                          onChange={handleFileUpload} 
                         />
                         <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-12 h-12 rounded-full text-[#707882] hover:bg-[#f0f3f8] hover:text-[#00629d] transition-colors flex items-center justify-center flex-shrink-0"
                         >
                           <span className="material-symbols-outlined">attach_file</span>
                         </button>
                         <div className="flex-1 relative">
                            <input 
                              type="text" 
                              value={chatText}
                              onChange={e => setChatText(e.target.value)}
                              placeholder="Nhập tin nhắn..." 
                              className="w-full h-14 bg-[#f0f3f8] border-none rounded-full px-6 pr-6 text-[#0f1d25] font-medium focus:ring-2 focus:ring-[#00629d] outline-none"
                            />
                         </div>
                         <button 
                           type="submit" 
                           disabled={!chatText.trim()}
                           className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-sm ${chatText.trim() ? 'bg-[#00629d] text-white hover:bg-[#004e7c]' : 'bg-[#e4e9f0] text-[#707882] cursor-not-allowed'}`}
                         >
                            <span className="material-symbols-outlined">send</span>
                         </button>
                      </form>
                   </div>
                 </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>
          <img 
            src={selectedImage} 
            alt="Phóng to" 
            className="max-w-full max-h-full object-contain select-none" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </MarketplaceLayout>
  );
};
