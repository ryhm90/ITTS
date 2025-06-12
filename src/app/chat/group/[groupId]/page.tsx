'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { connectSocket } from '@/lib/socketClient';

export default function GroupChatPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      const res = await fetch(`/api/chat/group/${groupId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setGroupName(data.groupName);
        setGroupMembers(data.members);
        setInviteLink(`${window.location.origin}/chat/group/invite/${data.inviteCode}`);
      }
    };

    fetchGroupData();

    socketRef.current = connectSocket();
    socketRef.current.on(`group-${groupId}`, (message: any) => {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play();
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on(`group-${groupId}-notification`, (notif: any) => {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play();
      alert(notif.message);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [groupId]);

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
        groupId,
        messageText: newMessage,
        imageUrl,
      }),
    });

    setNewMessage('');
    setImage(null);
  };

  const handleLeaveGroup = async () => {
    if (confirm('هل أنت متأكد أنك تريد مغادرة المجموعة؟')) {
      await fetch(`/api/chat/groups/${groupId}/leave`, { method: 'POST' });
      router.push('/chat/group/select');
    }
  };

  const handleDeleteGroup = async () => {
    if (confirm('هل أنت متأكد من حذف المجموعة نهائيًا؟')) {
      await fetch(`/api/chat/groups/${groupId}/delete`, { method: 'DELETE' });
      alert('تم حذف المجموعة');
      router.push('/chat/group/select');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto text-right">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{groupName || `#${groupId}`}</h1>
          {inviteLink && (
            <div className="mt-2 text-sm">
              رابط الدعوة: <a href={inviteLink} className="text-blue-600 underline">{inviteLink}</a>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleLeaveGroup}
            className="bg-red-600 text-white py-2 px-4 rounded"
          >
            مغادرة المجموعة
          </button>
          <button
            onClick={handleDeleteGroup}
            className="bg-red-700 text-white py-2 px-4 rounded"
          >
            حذف المجموعة
          </button>
          <button
  onClick={() => router.push(`/chat/group/${groupId}/settings`)}
  className="bg-yellow-500 text-white py-2 px-4 rounded"
>
  تعديل إعدادات المجموعة
</button>
        </div>
      </div>

      {/* رسائل المجموعة */}
      <div className="h-[500px] overflow-y-scroll border mb-6 p-4 bg-gray-100 flex flex-col gap-2">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-2 rounded-lg ${msg.isMe ? 'bg-blue-500 text-white' : 'bg-gray-300 text-black'}`}>
              <p className="font-semibold mb-1">{msg.FromUserName || 'مستخدم'}</p>

              <p>{msg.MessageText}</p>

              {msg.ImageUrl?.endsWith('.jpg') || msg.ImageUrl?.endsWith('.png') ? (
                <img src={msg.ImageUrl} alt="صورة" className="mt-2 rounded max-h-40" />
              ) : msg.ImageUrl ? (
                <a href={msg.ImageUrl} target="_blank" className="block text-blue-600 underline mt-2">
                  تحميل الملف
                </a>
              ) : null}

              <small className="block mt-1 text-xs">
                {new Date(msg.SentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </small>
            </div>
          </div>
        ))}
      </div>

      {/* إرسال رسالة جديدة */}
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
          📎
        </button>
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 rounded">
          إرسال
        </button>
      </div>

      {/* عرض أعضاء المجموعة */}
      <h2 className="text-xl font-bold mt-10 mb-4">أعضاء المجموعة:</h2>
      <div className="grid grid-cols-2 gap-4">
        {groupMembers.map((member: any) => (
          <div key={member.UserID} className="border p-2 rounded bg-white">
            <div className="font-semibold">{member.FullName}</div>
            <div className="text-sm">{member.IsAdmin ? 'مشرف' : 'عضو'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
