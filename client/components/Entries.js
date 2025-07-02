import { useState, useEffect, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios';
import Fuse from 'fuse.js';
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
  "I used to play piano by ear, but now I use my hands.",
  "Why did the coffee file a police report? It got mugged!",
  "I invented a new word: Plagiarism!",
  "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks!",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "What did the ocean say to the beach? Nothing, it just waved!",
  "Why did the bicycle fall over? Because it was two tired!",
  "What do you call a bear with no teeth? A gummy bear!",
  "Why did the math book look so sad? Because it had too many problems!",
  "What's orange and sounds like a parrot? A carrot!",
  "Why don't scientists trust stairs? Because they're always up to something!"
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
  const [showRandom, setShowRandom] = useState(false);
  const searchInputRef = useRef(null);
  
  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(entries, {
      keys: ['title', 'url'],
      threshold: 0.4, // Adjust for fuzziness (0 = exact, 1 = very fuzzy)
      includeScore: true,
      ignoreLocation: true, // Search anywhere in the string
      minMatchCharLength: 2,
    });
  }, [entries]);

  const fetchSearchResults = async (term) => {
    setIsLoading(true);
    setDadJoke(dadJokes[Math.floor(Math.random() * dadJokes.length)]);
    try {
      let allItems = [];
      let page = 1;
      let hasMore = true;
      
      // Fetch all pages to get all records
      while (hasMore) {
        const params = {
          page: page,
          perPage: 500, // Max per page
          sort: '-ogdate', // Sort by original date descending
        };
        
        // Add search filter if term is provided (only for first request)
        if (term && page === 1) {
          // PocketBase filter syntax for searching in title or link fields
          params.filter = `(title ~ "${term}" || link ~ "${term}")`;
        }
        
        const { data } = await axios.get('https://pb.voidterminal.app/api/collections/links/records', { params });
        
        allItems = [...allItems, ...data.items];
        
        // Check if there are more pages
        hasMore = data.page < data.totalPages;
        page++;
        
        // If searching, don't paginate (PocketBase will return filtered results)
        if (term) {
          hasMore = false;
        }
      }
      
      // Transform PocketBase response to match expected format
      const transformedData = allItems.map(item => ({
        url: item.link,
        title: item.title || item.link, // Use link as title if title is empty
        date: item.ogdate || item.created // Use ogdate if available, fallback to created
      }));
      
      console.log(`API returned ${transformedData.length} total records for term: "${term}"`);
      setEntries(transformedData);
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchSearchResults(''); 
    
    // Add global keyboard shortcut
    const handleKeyDown = (e) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select(); // Select all text for easy replacement
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  };
  
  const debouncedFetch = debounce((term) => {
    fetchSearchResults(term);
  }, 300);

  // Use fuzzy search for better results
  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    
    // Use Fuse.js for fuzzy search
    const results = fuse.search(searchTerm);
    return results.map(result => result.item);
  }, [searchTerm, fuse, entries]);
  
  // Get random entries for discovery
  const randomEntries = useMemo(() => {
    if (entries.length === 0) return [];
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [entries, showRandom]);
  
  // Get rotating suggested searches from all entries
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  
  const suggestedSearches = useMemo(() => {
    const suggestions = new Set();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'does', 'did', 'https', 'http', 'www', 'com']);
    
    // Sample from all entries, not just visible ones
    const sampleSize = Math.min(entries.length, 100);
    const sampledEntries = [...entries]
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize);
    
    sampledEntries.forEach(entry => {
      const words = entry.title.toLowerCase().split(/[\s\-_\/]+/);
      words.forEach(word => {
        const cleaned = word.replace(/[^a-z0-9]/g, '');
        if (cleaned.length > 3 && !commonWords.has(cleaned) && !cleaned.match(/^\d+$/)) {
          suggestions.add(cleaned);
        }
      });
    });
    
    // Get more suggestions and rotate through them
    const allSuggestions = Array.from(suggestions);
    const startIdx = suggestionIndex % Math.max(1, allSuggestions.length - 5);
    return allSuggestions.slice(startIdx, startIdx + 5);
  }, [entries, suggestionIndex]);
  
  // Rotate suggestions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex(prev => prev + 1);
    }, 8000); // Change every 8 seconds
    
    return () => clearInterval(interval);
  }, []);

  const mlKeywords = ['rl ', 'ml ', 'ai ', 'llm', 'model', 'tech', 'sft', 'deepseek', 'cuda', 'agi', 'torch', 'training', 'agent', 'bert', 'gpu', 'llama', 'jax', 'transformer', 'reinforcement', 'gradient', 'tensor', 'neural', 'token', 'anthropic', 'machine learning', 'grpo', 'gpt', 'github', 'hugging', 'deepmind', 'attention', 'openai'];
  
  const isMLRelated = (entry) => {
    const title = entry.title?.toLowerCase() || '';
    const url = entry.url?.toLowerCase() || '';
    return mlKeywords.some(keyword => title.includes(keyword)); // || url.includes(keyword));
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
              ref={searchInputRef}
              type="text"
              placeholder="Search (⌘K)"
              onChange={handleSearchChange}
              className="w-full max-w-2xl p-3 bg-[#111] border border-[#333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-gray-600 transition-all duration-300 shadow-lg font-medium"
              style={{ fontFamily: "system-ui, sans-serif", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
            />
          </div>
          
          {/* Discovery Features */}
          <div className="max-w-2xl mx-auto mb-6">
            {/* Suggested Searches - Dynamic and subtle */}
            {suggestedSearches.length > 0 && !searchTerm && !showRandom && (
              <div className="mb-3 transition-opacity duration-500">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-gray-600 text-xs mr-1">Try:</span>
                  {suggestedSearches.map((suggestion, idx) => (
                    <button
                      key={`${suggestion}-${suggestionIndex}`}
                      onClick={() => {
                        setSearchTerm(suggestion);
                        searchInputRef.current.value = suggestion;
                      }}
                      className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a] rounded transition-all animate-fadeIn"
                      style={{
                        animationDelay: `${idx * 50}ms`,
                        animation: 'fadeIn 0.3s ease-in-out'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Random Discovery */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowRandom(!showRandom)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {showRandom ? "Hide" : "Show"} random links for discovery →
              </button>
              
              {filteredEntries.length > 0 && (
                <p className="text-sm text-gray-500">
                  {searchTerm ? `Found ${filteredEntries.length} results` : `${filteredEntries.length} total links`}
                </p>
              )}
            </div>
            
            {/* Random Links */}
            {showRandom && randomEntries.length > 0 && (
              <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-lg">
                <p className="text-sm text-gray-400 mb-3">Random selections:</p>
                <div className="space-y-2">
                  {randomEntries.map((entry, idx) => (
                    <a 
                      key={idx} 
                      href={entry.url} 
                      target="_blank" 
                      className="block text-sm text-gray-300 hover:text-white truncate transition-colors"
                    >
                      {entry.title}
                    </a>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    setShowRandom(false);
                    setTimeout(() => setShowRandom(true), 50);
                  }}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-300"
                >
                  Refresh random links
                </button>
              </div>
            )}
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
