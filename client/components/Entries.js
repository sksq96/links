import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios'; // You'll need to install this package
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Add this function at the top of your file, outside of any component
function getRandomLoadTime() {
  return (Math.random() * (5 - 3) + 3).toFixed(1);
}

// Add a collection of dad jokes
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

// Function to get a random dad joke
function getRandomDadJoke() {
  const randomIndex = Math.floor(Math.random() * dadJokes.length);
  return dadJokes[randomIndex];
}

function Entry({ title, created, link }) {
  let formattedDate = '';
  if (created) {
    try {
      const dateObj = new Date(created);
      if (!isNaN(dateObj.getTime())) {
        const easternTime = dateObj.toLocaleString('en-US', { timeZone: 'America/New_York' });
        const date = easternTime.split(',')[0];
        formattedDate = new Date(date).toISOString().split('T')[0];
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

export function Entries({ database, supabase }) {
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadTime, setLoadTime] = useState(getRandomLoadTime());
  const [dadJoke, setDadJoke] = useState(getRandomDadJoke());
  const [activeTab, setActiveTab] = useState("links");

  const fetchSearchResults = async (term) => {
    setIsLoading(true);
    setLoadTime(getRandomLoadTime()); // Set a new random load time for each search
    setDadJoke(getRandomDadJoke()); // Set a new random dad joke for each search
    try {
      const response = await axios.get('https://sksq96--search-app-searchapp-search.modal.run', {
        params: { term }
      });
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching search results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove or update the useEffect hook
  // If you want to load initial data, you can use it like this:
  useEffect(() => {
    fetchSearchResults(''); // Fetch initial results with an empty search term
  }, []); // Empty dependency array means this effect runs once when the component mounts

  const handleSearchChange = debounce((event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    fetchSearchResults(term);
  }, 300);

  // Filter entries based on search term
  const filteredEntries = entries.filter(entry => {
    const normalizedTitle = entry.title?.replace(/\s+/g, '').toLowerCase();
    const normalizedLink = entry.url?.replace(/\s+/g, '').toLowerCase();
    const normalizedSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
    return normalizedTitle?.includes(normalizedSearchTerm) || normalizedLink?.includes(normalizedSearchTerm);
  });

  // Separate entries into arxiv and non-arxiv
  const arxivEntries = filteredEntries.filter(entry => 
    entry.url?.toLowerCase().includes('arxiv')
  );
  
  const nonArxivEntries = filteredEntries.filter(entry => 
    !entry.url?.toLowerCase().includes('arxiv')
  );
  
  return (
    <div 
      className="min-h-screen text-gray-100 flex flex-col"
      style={{ 
        backgroundColor: "rgb(12, 10, 9)",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="w-full max-w-5xl mx-auto px-6 py-16">
        <div className="mb-8 pt-8">
          <h1 
            className="text-4xl md:text-5xl text-center text-white mb-8 font-serif" 
            style={{ 
              fontFamily: "'Times New Roman', Times, serif",
              fontWeight: 500,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 10px rgba(255,255,255,0.05)'
            }}
          >
            Shubham's Internet*
          </h1>
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder="Search"
              onChange={handleSearchChange}
              className="w-full max-w-2xl p-3 bg-[#111] border border-[#333] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-700 focus:border-gray-600 transition-all duration-300 shadow-lg font-medium"
              style={{ 
                fontFamily: "system-ui, sans-serif",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
              }}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-400 text-center font-medium mb-2">"{dadJoke}"</p>
            <div className="w-16 h-0.5 bg-gray-800 mt-4"></div>
          </div>
        ) : (
          <Tabs defaultValue="links" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-[#111] border border-[#333]">
              <TabsTrigger 
                value="links" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white"
              >
                Links ({nonArxivEntries.length})
              </TabsTrigger>
              <TabsTrigger 
                value="arxiv" 
                className="data-[state=active]:bg-[#222] data-[state=active]:text-white"
              >
                Arxiv ({arxivEntries.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="links" className="space-y-0 divide-[#222]">
              {nonArxivEntries.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No links found</p>
              ) : (
                nonArxivEntries.map((entry, index) => (
                  <Entry
                    key={index}
                    title={entry.title}
                    created={entry.date || ''}
                    link={entry.url}
                  />
                ))
              )}
            </TabsContent>
            
            <TabsContent value="arxiv" className="space-y-0 divide-[#222]">
              {arxivEntries.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No arxiv papers found</p>
              ) : (
                arxivEntries.map((entry, index) => (
                  <Entry
                    key={index}
                    title={entry.title}
                    created={entry.date || ''}
                    link={entry.url}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
