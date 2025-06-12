'use client';

import { useEffect, useState, useRef } from 'react';
import { connectSocket } from '@/lib/socketClient';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<any>(null);
  useEffect(() => {
    const markMessagesAsRead = async () => {
      await fetch('/api/chat/read', { method: 'POST' });
    };
  
    const fetchMessages = async () => {
      const res = await fetch('/api/chat/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setCurrentUserId(data.currentUserId);
        markMessagesAsRead();
      }
    };
  
    fetchMessages();
  
    socketRef.current = connectSocket();
    socketRef.current.on('new-message', (message: any) => {
    const audio = new Audio('/sounds/notification.wav');
    
    audio.play();

    setMessages((prev) => [...prev, message]);
    markMessagesAsRead();
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);
  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch('/api/chat/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setCurrentUserId(data.currentUserId);
      }
    };

    fetchMessages();

    socketRef.current = connectSocket();
    socketRef.current.on('new-message', (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleSend = async () => {
    let imageUrl = '';

    if (image) {
      const formData = new FormData();
      formData.append('file', image);

      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      imageUrl = uploadData.url;
    }

    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toUserId: 2, // مثلا مدير الشعبة
        messageText: newMessage,
        imageUrl,
      }),
    });

    setNewMessage('');
    setImage(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto text-right">
      <h1 className="text-2xl font-bold mb-6">محادثة حية</h1>

      <div className="h-[500px] overflow-y-scroll border mb-6 p-4 bg-gray-100 flex flex-col gap-2">
        {messages.map((msg, index) => {
          const isMe = msg.FromUserID === currentUserId;
          return (
            <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs p-2 rounded-lg ${isMe ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}>
                <p>{msg.MessageText}</p>
                {msg.ImageUrl && (
                  <img src={msg.ImageUrl} alt="صورة" className="mt-2 rounded max-h-40" />
                )}
                <small className="block mt-1 text-xs">
                {new Date(msg.SentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.IsRead ? ' ✅✅' : ''}
                </small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="اكتب رسالتك..."
          className="border p-2 rounded flex-1"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          className="hidden"
        />
        <button onClick={() => fileInputRef.current?.click()} className="bg-gray-300 px-4 rounded">
          📷
        </button>
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 rounded">
          إرسال
        </button>
      </div>
    </div>
  );
}
