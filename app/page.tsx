'use client';

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PWAInstaller from "./components/PWAInstaller";
import { 
  IconBolt, 
  IconMessageCircle, 
  IconRocket, 
  IconPalette,
  IconUsers,
  IconUserPlus
} from "@tabler/icons-react";

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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const titles = [
    "Magna Coders",
    "Build. Collaborate. Solve.",
    "Code the Future",
    "Join the Revolution"
  ];

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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
      {/* Mouse-following glow effect */}
      <motion.div
        className="fixed w-96 h-96 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(231, 0, 8, 0.1) 0%, transparent 70%)',
          left: mousePosition.x - 192,
          top: mousePosition.y - 192,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Floating Tech Symbols and Letters */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {Array.from({ length: 15 }, (_, i) => (
          <motion.div
            key={`float-${i}`}
            className="absolute text-[#E70008] opacity-20 font-mono font-bold"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, Math.random() * 360, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 5,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          >
            {['<', '>', '{', '}', '/', '*', '+', '=', '&', '#', '@', '$', '%', '^', '~'][i] || 'M'}
          </motion.div>
        ))}
      </div>
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
        className="relative z-10 min-h-screen p-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 min-h-screen items-center max-w-7xl mx-auto">
          {/* Left Side - Hero Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
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
              className="flex gap-6 justify-center lg:justify-start"
            >
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(231, 0, 8, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-[#E70008] text-[#F9E4AD] font-bold rounded-full hover:bg-[#D60007] transition-all duration-200 shadow-lg font-sans flex items-center gap-2"
              >
                <IconUsers size={18} />
                Start Collaborating
              </motion.button>
              <motion.a 
                href="/create-account"
                whileHover={{ scale: 1.05, backgroundColor: "#E70008", color: "#F9E4AD" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 border-2 border-[#E70008] text-[#F9E4AD] font-bold rounded-full transform transition-all duration-200 font-sans cursor-pointer flex items-center gap-2"
              >
                <IconUserPlus size={18} />
                Join Community
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Right Side - Dynamic Sections */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 3.5, duration: 1, ease: "easeOut" }}
            className="space-y-8"
          >
            {/* What's Happening Inside (Living Pulse) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3.8, duration: 0.8, ease: "easeOut" }}
              className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6"
            >
              <motion.h3 
                className="text-2xl font-bold text-[#F9E4AD] mb-4 flex items-center gap-2"
                animate={{ 
                  textShadow: ["0 0 10px rgba(249, 228, 173, 0.3)", "0 0 20px rgba(249, 228, 173, 0.6)", "0 0 10px rgba(249, 228, 173, 0.3)"]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.div 
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="text-[#E70008]"
                >
                  <IconBolt size={24} />
                </motion.div>
                What's Happening Inside
              </motion.h3>
              
              <div className="space-y-3">
                {[
                  { icon: IconMessageCircle, text: "12 new members joined today", delay: 4.0 },
                  { icon: IconRocket, text: "3 projects started this week", delay: 4.2 },
                  { icon: IconPalette, text: "UX Lab released a new design system", delay: 4.4 }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: item.delay, duration: 0.6, ease: "easeOut" }}
                    className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-gray-600/30"
                  >
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1],
                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        delay: index * 0.5,
                        ease: "easeInOut" 
                      }}
                      className="text-[#E70008]"
                    >
                      <item.icon size={24} />
                    </motion.div>
                    <span className="text-[#FF9940] font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Faces of the Revolution Preview */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.6, duration: 0.8, ease: "easeOut" }}
              className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-[#F9E4AD] mb-4">Faces of the Revolution</h3>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 4.8 + i * 0.1, duration: 0.4, ease: "backOut" }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-12 h-12 bg-gradient-to-br from-[#E70008] to-[#FF9940] rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer"
                  >
                    {String.fromCharCode(65 + i)}
                  </motion.div>
                ))}
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 5.6, duration: 0.6 }}
                className="text-[#FF9940] text-sm mt-3"
              >
                1,200+ builders shaping African tech
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
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
