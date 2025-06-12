'use client';

export default function Spinner({ message = "جارٍ التحميل..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="w-16 h-16 rounded-full border-4 border-t-4 border-t-transparent animate-spin bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 border-solid"
           style={{
             borderTopColor: 'transparent',
             borderRightColor: '#3b82f6',
             borderBottomColor: '#8b5cf6',
             borderLeftColor: '#ec4899',
           }}>
      </div>
      <p className="mt-4 text-white font-semibold text-lg animate-pulse">{message}</p>
    </div>
  );
}
