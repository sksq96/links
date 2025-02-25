import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios'; // You'll need to install this package

// Add this function at the top of your file, outside of any component
function getRandomLoadTime() {
  return (Math.random() * (5 - 3) + 3).toFixed(1);
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

  const fetchSearchResults = async (term) => {
    setIsLoading(true);
    setLoadTime(getRandomLoadTime()); // Set a new random load time for each search
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

  const filteredEntries = entries.filter(entry => {
    const normalizedTitle = entry.title?.replace(/\s+/g, '').toLowerCase();
    const normalizedLink = entry.url?.replace(/\s+/g, '').toLowerCase();
    const normalizedSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
    return normalizedTitle?.includes(normalizedSearchTerm) || normalizedLink?.includes(normalizedSearchTerm);
  });
  
  return (
    <div 
      className="min-h-screen text-gray-100 flex flex-col"
      style={{ 
        backgroundColor: "rgb(12, 10, 9)",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="w-full max-w-5xl mx-auto px-6 py-16">
        <div className="mb-16 pt-8">
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
          <div className="flex justify-center mb-16">
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
        
        <div className="space-y-0 divide-[#222]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-gray-400 text-center font-medium mb-2">Please wait {loadTime} seconds for the page to load...</p>
              <div className="w-16 h-0.5 bg-gray-800 mt-4"></div>
            </div>
          ) : (
            entries.map((entry, index) => (
              <Entry
                key={index}
                title={entry.title}
                created={entry.date || ''}
                link={entry.url}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
