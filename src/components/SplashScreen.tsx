'use client';

import { useEffect, useState } from 'react';
import Spinner from './Spinner';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500); // 2.5 ثانية

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-200  flex flex-col items-center justify-center z-50 text-white">
        {/* ✅ شعار متحرك مع نبض مستمر */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="mb-6"
        >
          <Image
            src="/logo.png"
            alt="GFC Tracker Logo"
            width={120}
            height={120}
            priority
            className="rounded-full shadow-lg"
          />
        </motion.div>

        {/* ✅ سبينر مع نص */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
