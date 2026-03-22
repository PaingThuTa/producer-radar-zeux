import React, { useState } from 'react';
import { api as base44 } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const tones = [
  { value: 'casual', label: 'Casual & Chill' },
  { value: 'professional', label: 'Professional' },
  { value: 'direct', label: 'Direct' },
  { value: 'complimentary', label: 'Complimentary' },
];

export default function MessageGenerator() {
  const [producerName, setProducerName] = useState('');
  const [style, setStyle] = useState('');
  const [tone, setTone] = useState('casual');
  const [offerType, setOfferType] = useState('loops');
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-priority_score', 100),
  });

  const generateMessages = async () => {
    setGenerating(true);
    const name = producerName || 'the producer';
    const s = style || 'melodic trap';
    const templates = [
      {
        text: `yo bro been vibing to your ${s} beats, im cooking ${offerType} with that same energy, thought you might fw them`,
        platform: 'Instagram DM',
      },
      {
        text: `hey ${name} your ${s} sound is hard, got some ${offerType} that would go crazy on your beats, lmk if you wanna check em out`,
        platform: 'Instagram DM',
      },
      {
        text: `bro your style is exactly what im working with rn, got ${offerType} in that ${s} vibe, would love to collab`,
        platform: 'Instagram DM',
      },
    ];
    setMessages(templates);
    setGenerating(false);
    toast.success('Templates generated (AI coming soon)');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Message Generator</h1>
        <p className="text-[#71717a] text-sm mt-1">Generate personalized networking DMs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <h2 className="text-sm font-semibold text-white">Message Settings</h2>
          </div>

          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Producer Name</label>
            <Select value={producerName} onValueChange={setProducerName}>
              <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                <SelectValue placeholder="Select or type producer name" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#27272a] max-h-[200px]">
                {ytProducers.filter(p => p.status === 'por contactar').map(p => (
                  <SelectItem key={p.id} value={p.name} className="text-white">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-[#71717a] mb-1.5 block">Style Reference</label>
            <Input value={style} onChange={e => setStyle(e.target.value)}
              placeholder="e.g., juice wrld type, melodic trap"
              className="bg-[#0f0f10] border-[#27272a] text-white text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                  {tones.map(t => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[#71717a] mb-1.5 block">Offering</label>
              <Select value={offerType} onValueChange={setOfferType}>
                <SelectTrigger className="bg-[#0f0f10] border-[#27272a] text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                  <SelectItem value="loops" className="text-white">Loops</SelectItem>
                  <SelectItem value="starters" className="text-white">Starters</SelectItem>
                  <SelectItem value="beats" className="text-white">Beats</SelectItem>
                  <SelectItem value="collab" className="text-white">Collab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generateMessages} disabled={generating}
            className="w-full bg-[#2563eb] hover:bg-[#3b82f6] text-white">
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Generate Messages</>
            )}
          </Button>
        </div>

        {/* Output Panel */}
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {messages.length === 0 && !generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#18181b] border border-[#27272a] rounded-xl p-12 text-center"
              >
                <MessageSquare className="w-8 h-8 text-[#27272a] mx-auto mb-3" />
                <p className="text-[#3f3f46] text-sm">Configure settings and generate messages</p>
              </motion.div>
            )}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-[#3f3f46] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                    {msg.platform && (
                      <p className="text-xs text-[#71717a] mt-2">Best for: {msg.platform}</p>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(msg.text)}
                    className="text-[#3f3f46] hover:text-[#3b82f6] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}