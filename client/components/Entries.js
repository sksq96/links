import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dadJokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "What do you call a fake noodle? An impasta!",
  "How do you organize a space party? You planet!",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
  "I used to play piano by ear, but now I use my hands."
];

function Entry({ title, created, link }) {
  let formattedDate = '';
  if (created) {
    try {
      const dateObj = new Date(created);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/New_York' }).split(',')[0]).toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
  }

  return (
    <a href={link} target="_blank" className="flex justify-between items-center py-4 border-b border-[#222] group hover:bg-[#111] transition-all duration-300 px-1">
      <strong className="font-medium text-gray-200 group-hover:text-white transition-colors duration-300">{title}</strong>
      {formattedDate && <p className="text-gray-500 whitespace-nowrap ml-4 sm:ml-12 text-sm font-mono opacity-80 group-hover:opacity-100 transition-opacity duration-300">{formattedDate}</p>}
    </a>
  );
}

export function Entries() {
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dadJoke, setDadJoke] = useState(dadJokes[Math.floor(Math.random() * dadJokes.length)]);

  const fetchSearchResults = async (term) => {
    setIsLoading(true);
    setDadJoke(dadJokes[Math.floor(Math.random() * dadJokes.length)]);
    try {
      const { data } = await axios.get('https://sksq96--search-app-searchapp-search.modal.run', { params: { term } });
      setEntries(data);
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSearchResults(''); }, []);

  const handleSearchChange = debounce(e => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    fetchSearchResults(term);
  }, 300);

  const filteredEntries = entries.filter(entry => {
    const title = entry.title?.replace(/\s+/g, '').toLowerCase() || '';
    const url = entry.url?.replace(/\s+/g, '').toLowerCase() || '';
    const term = searchTerm.replace(/\s+/g, '').toLowerCase();
    return title.includes(term) || url.includes(term);
  });

  const mlKeywords = ['rl ', 'ml ', 'ai ', 'llm', 'model', 'tech', 'sft', 'deepseek', 'cuda', 'agi', 'torch', 'training', 'agent', 'bert', 'gpu', 'llama', 'jax', 'transformer', 'reinforcement', 'gradient', 'tensor', 'neural', 'token', 'anthropic', 'machine learning', 'grpo', 'gpt', 'github', 'hugging', 'deepmind', 'attention', 'openai'];
  
  const isMLRelated = (entry) => {
    const title = entry.title?.toLowerCase() || '';
    const url = entry.url?.toLowerCase() || '';
    return mlKeywords.some(keyword => title.includes(keyword) || url.includes(keyword));
  };

  // Create disjoint sets of entries
  // First priority: Arxiv entries
  const arxivEntries = filteredEntries.filter(entry => entry.url?.toLowerCase().includes('arxiv'));
  
  // Second priority: ML entries (excluding any already in arxiv)
  const mlEntries = filteredEntries.filter(entry => 
    !entry.url?.toLowerCase().includes('arxiv') && 
    isMLRelated(entry)
  );
  
  // Third priority: All other entries
  const nonSpecialEntries = filteredEntries.filter(entry => 
    !entry.url?.toLowerCase().includes('arxiv') && 
    !isMLRelated(entry)
  );
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col" style={{ backgroundColor: "rgb(12, 10, 9)", backgroundAttachment: "fixed" }}>
      <div className="w-full max-w-5xl mx-auto px-6 py-16">
        <div className="mb-8 pt-8">
          <h1 className="text-4xl md:text-5xl text-center text-white mb-8 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontWeight: 500, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(255,255,255,0.05)' }}>Shubham's Internet*</h1>
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder="Search"
              onChange={handleSearchChange}
              className="w-full max-w-2xl p-3 bg-[#111] border border-[#333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-gray-600 transition-all duration-300 shadow-lg font-medium"
              style={{ fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-400 text-center font-medium mb-2">"{dadJoke}"</p>
            <div className="w-16 h-0.5 bg-gray-800 mt-4"></div>
          </div>
        ) : (
          <Tabs defaultValue="links" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 bg-[#111] border border-[#333]">
              <TabsTrigger value="links" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">Links ({nonSpecialEntries.length})</TabsTrigger>
              <TabsTrigger value="ml" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">ML ({mlEntries.length})</TabsTrigger>
              <TabsTrigger value="arxiv" className="data-[state=active]:bg-[#222] data-[state=active]:text-white">Arxiv ({arxivEntries.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="links" className="space-y-0 divide-[#222]">
              {nonSpecialEntries.length === 0 ? 
                <p className="text-gray-400 text-center py-8">No links found</p> : 
                nonSpecialEntries.map((entry, index) => <Entry key={index} title={entry.title} created={entry.date || ''} link={entry.url} />)
              }
            </TabsContent>
            
            <TabsContent value="ml" className="space-y-0 divide-[#222]">
              {mlEntries.length === 0 ? 
                <p className="text-gray-400 text-center py-8">No ML-related content found</p> : 
                mlEntries.map((entry, index) => <Entry key={index} title={entry.title} created={entry.date || ''} link={entry.url} />)
              }
            </TabsContent>
            
            <TabsContent value="arxiv" className="space-y-0 divide-[#222]">
              {arxivEntries.length === 0 ? 
                <p className="text-gray-400 text-center py-8">No arxiv papers found</p> : 
                arxivEntries.map((entry, index) => <Entry key={index} title={entry.title} created={entry.date || ''} link={entry.url} />)
              }
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
