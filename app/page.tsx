'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PWAInstaller from "./components/PWAInstaller";

// Custom Typewriter component for one-by-one letter effect with Framer Motion
const TypewriterTitle = ({ text, speed = 100 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayText('');
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        // Blink cursor for 3 seconds then hide
        setTimeout(() => setShowCursor(false), 3000);
      }
    }, speed);

    return () => {
      clearInterval(typeInterval);
      setShowCursor(true);
    };
  }, [text, speed]);

  return (
    <motion.h1 
      className="text-6xl md:text-7xl font-bold text-[#F9E4AD] mb-8"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <span className="font-mono">{displayText}</span>
      {showCursor && <motion.span 
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block ml-1"
      >
        |
      </motion.span>}
    </motion.h1>
  );
};

export default function Home() {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const titles = [
    "Magna Coders",
    "Build. Collaborate. Solve.",
    "Code the Future",
    "Join the Revolution"
  ];
  
  // Available tech icons: 1-30 (some missing like 22, 25)
  const availableIcons = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,23,24,26,27,28,29,30];
  const techIcons = Array.from({ length: 60 }, (_, i) => {
    const iconIndex = i % availableIcons.length;
    return availableIcons[iconIndex];
  });

  // Generate random positions for particle effects
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2
  }));

  useEffect(() => {
    // Simulate loading sequence
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    // Cycle through different titles every 6 seconds
    const titleInterval = setInterval(() => {
      setCurrentTitleIndex(prev => (prev + 1) % titles.length);
    }, 6000);

    return () => {
      clearTimeout(loadingTimer);
      clearInterval(titleInterval);
    };
  }, [titles.length]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Loading Animation */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <div className="relative">
              {/* Animated logo or symbol */}
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="w-24 h-24 border-4 border-[#E70008] rounded-full"
              >
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    className="w-8 h-8 bg-[#FF9940] rounded-full" 
                  />
                </motion.div>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-[#F9E4AD] font-mono text-sm whitespace-nowrap"
              >
                Loading Magna...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated background tech icons */}
      <div className="falling-symbols absolute w-full h-full pointer-events-none">
        {techIcons.map((num, index) => (
          <motion.div 
            key={`${num}-${index}`} 
            className="symbol"
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 0.3, y: 0 }}
            transition={{ 
              delay: index * 0.05 + 2.2, 
              duration: 1,
              ease: "easeOut"
            }}
          >
            <motion.img 
              src={`/tech icons/${num}.svg`} 
              alt={`Tech icon ${num}`}
              className="w-8 h-8 opacity-30 transition-all duration-300 cursor-pointer"
              whileHover={{ 
                scale: 1.5, 
                opacity: 0.8,
                rotate: 360,
                filter: "brightness(1.2)"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          </motion.div>
        ))}
      </div>
      
      <motion.main 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          <TypewriterTitle 
            key={currentTitleIndex} 
            text={titles[currentTitleIndex]} 
            speed={80} 
          />
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.8, ease: "easeOut" }}
            className="text-2xl text-[#FF9940] mb-12 font-sans"
          >
            Where developers, designers, and problem-solvers unite to create tech solutions for real-world challenges.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.3, duration: 0.8, ease: "easeOut" }}
            className="flex gap-6 justify-center"
          >
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(231, 0, 8, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-[#E70008] text-[#F9E4AD] font-bold rounded-full hover:bg-[#D60007] transition-all duration-200 shadow-lg font-sans"
            >
              Start Collaborating
            </motion.button>
            <motion.a 
              href="/create-account"
              whileHover={{ scale: 1.05, backgroundColor: "#E70008", color: "#F9E4AD" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 border-2 border-[#E70008] text-[#F9E4AD] font-bold rounded-full transform transition-all duration-200 font-sans cursor-pointer"
            >
              Join Community
            </motion.a>
          </motion.div>
        </motion.div>
      </motion.main>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.8, duration: 0.8, ease: "easeOut" }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20"
      >
        <motion.a 
          href="/about" 
          whileHover={{ scale: 1.05, backgroundColor: "#D60007" }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-[#E70008] text-[#F9E4AD] font-bold rounded-full transition-all duration-200 shadow-lg"
        >
          About Us
        </motion.a>
      </motion.div>
      
      <PWAInstaller />
    </div>
  );
}
