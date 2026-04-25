"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Send, User, Bot, Briefcase, MapPin, DollarSign, BrainCircuit, X } from "lucide-react";
import clsx from "clsx";

export default function Home() {
  const [jd, setJd] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  
  // Chat state per candidate: { candidateId: [{role: 'ai'|'user', content: string}] }
  const [chats, setChats] = useState<Record<string, any[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, selectedCandidate]);

  const handleMatch = async () => {
    if (!jd.trim()) return;
    setIsMatching(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd }),
      });
      const data = await res.json();
      if (data.candidates) {
        setCandidates(data.candidates);
        // Initialize chats with an opening message from AI
        const initialChats: any = {};
        data.candidates.forEach((c: any) => {
          initialChats[c.id] = [{
            role: 'ai',
            content: `Hi ${c.name.split(' ')[0]}, I saw your profile and your background in ${c.skills[0]} looks like a great fit for a role we have. Are you currently open to new opportunities?`
          }];
        });
        setChats(initialChats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMatching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedCandidate) return;
    
    const candidateId = selectedCandidate.id;
    const newMessage = { role: "user", content: chatInput };
    
    const updatedChat = [...(chats[candidateId] || []), newMessage];
    
    setChats(prev => ({ ...prev, [candidateId]: updatedChat }));
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedChat,
          candidate: selectedCandidate,
          jd
        }),
      });
      const data = await res.json();
      
      if (data.reply) {
        setChats(prev => ({
          ...prev,
          [candidateId]: [...prev[candidateId], { role: "ai", content: data.reply }]
        }));
      }

      if (data.interestScore !== undefined) {
        setCandidates(prev => prev.map(c => 
          c.id === candidateId ? { ...c, interestScore: data.interestScore } : c
        ));
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsChatting(false);
    }
  };

  const getCombinedScore = (c: any) => {
    // 60% match, 40% interest
    const match = c.matchScore || 0;
    const interest = c.interestScore || 0;
    if (interest === 0) return Math.round(match * 0.6); // Not yet assessed
    return Math.round((match * 0.6) + (interest * 0.4));
  };

  const sortedCandidates = [...candidates].sort((a, b) => getCombinedScore(b) - getCombinedScore(a));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <BrainCircuit className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight text-white">Catalyst</span>

          </div>
          <div className="text-sm text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Step 1: JD Input */}
        <AnimatePresence>
          {!candidates.length && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }}
              className="max-w-3xl mx-auto mt-12"
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Discover Top Talent Instantly
                </h1>
                <p className="text-neutral-400 text-lg">
                  Paste your Job Description. Catalyst will find the best matches and autonomously engage them to assess their interest.
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-2 shadow-2xl relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur" />
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="e.g. We are looking for a Senior Full Stack Engineer with 5+ years of React and Node.js..."
                  className="w-full h-64 bg-neutral-950 border border-neutral-800 rounded-xl p-6 text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none relative z-10 text-lg leading-relaxed"
                />
                <div className="flex justify-between items-center p-4 relative z-10">
                  <div className="text-sm text-neutral-500">
                    {jd.length} characters
                  </div>
                  <button
                    onClick={handleMatch}
                    disabled={isMatching || !jd.trim()}
                    className="bg-white text-black px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMatching ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin" />
                        Scouting...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Discover Candidates
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Dashboard */}
        {candidates.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-6 h-[calc(100vh-140px)]"
          >
            {/* Left Panel: Shortlist */}
            <div className={clsx(
              "flex flex-col gap-4 transition-all duration-500",
              selectedCandidate ? "w-1/2" : "w-full max-w-4xl mx-auto"
            )}>
              <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                <div>
                  <h2 className="text-xl font-bold">Ranked Shortlist</h2>
                  <p className="text-sm text-neutral-400">Showing {candidates.length} highly matched candidates</p>
                </div>
                <button 
                  onClick={() => {
                    setCandidates([]);
                    setSelectedCandidate(null);
                  }}
                  className="text-sm text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition"
                >
                  New Search
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sortedCandidates.map((c, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    className={clsx(
                      "group p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden",
                      selectedCandidate?.id === c.id 
                        ? "bg-neutral-800 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                        : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <img src={c.avatarUrl} alt={c.name} className="w-12 h-12 rounded-full border border-neutral-700 group-hover:border-emerald-500/50 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <span className="bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-neutral-700 shadow-sm">
                            #{i + 1}
                          </span>
                          {c.name}
                        </h3>
                        <p className="text-sm text-neutral-400 flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/> {c.role}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> {c.location}</span>
                        </p>
                        
                        <div className="flex gap-2 flex-wrap mt-3">
                          {c.skills.slice(0, 4).map((s: string) => (
                            <span key={s} className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                              {s}
                            </span>
                          ))}
                          {c.skills.length > 4 && (
                            <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-500 border border-neutral-700">
                              +{c.skills.length - 4}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 p-3 bg-black/40 rounded-lg border border-neutral-800/50">
                          <p className="text-sm text-emerald-400/90 leading-relaxed italic">
                            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                            {c.matchExplanation}
                          </p>
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex flex-col gap-2 items-end shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-medium text-emerald-400">{c.matchScore}%</div>
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Match</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className={clsx(
                              "text-sm font-medium",
                              c.interestScore === 0 ? "text-neutral-600" : 
                              c.interestScore > 70 ? "text-cyan-400" : "text-amber-400"
                            )}>
                              {c.interestScore === 0 ? "--" : `${c.interestScore}%`}
                            </div>
                            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Interest</div>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" 
                            style={{ width: `${getCombinedScore(c)}%` }} 
                          />
                        </div>
                        <div className="text-[10px] text-neutral-500 uppercase mt-1">Combined Score</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Panel: Chat Simulator */}
            {selectedCandidate && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-1/2 flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"
              >
                {/* Simulator Header */}
                <div className="p-4 border-b border-neutral-800 bg-neutral-950/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        Simulated Outreach
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">ROLEPLAY MODE</span>
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Chat as <strong>{selectedCandidate.name}</strong> to test the AI Recruiter.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCandidate(null)} className="text-neutral-500 hover:text-white transition p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {chats[selectedCandidate.id]?.map((msg, idx) => (
                    <div key={idx} className={clsx(
                      "flex max-w-[85%]",
                      msg.role === 'user' ? "ml-auto justify-end" : "mr-auto"
                    )}>
                      <div className={clsx(
                        "p-3 rounded-2xl text-sm leading-relaxed relative",
                        msg.role === 'user' 
                          ? "bg-emerald-600 text-white rounded-br-sm" 
                          : "bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-bl-sm"
                      )}>
                        {msg.role === 'ai' && (
                          <div className="absolute -left-3 top-1 text-xs">
                            <Bot className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex mr-auto max-w-[85%]">
                      <div className="p-4 rounded-2xl bg-neutral-800 border border-neutral-700 rounded-bl-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-neutral-950/50 border-t border-neutral-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={`Reply as ${selectedCandidate.name}...`}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-neutral-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isChatting}
                      className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
