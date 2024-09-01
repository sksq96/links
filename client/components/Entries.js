import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';
import axios from 'axios'; // You'll need to install this package

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
    <a href={link} target="_blank" className="flex justify-between text-secondary py-1 group text-md">
      <strong className="font-medium break-word sm:break-normal text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-500">{title}</strong>
      {formattedDate && <p className="font-berkeley whitespace-nowrap ml-4 sm:ml-12">{formattedDate}</p>}
    </a>
  );
}

export function Entries({ database, supabase }) {
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchSearchResults = async (term) => {
    setIsLoading(true);
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
    <div className="px-4 mt-24 pb-40 md:pb-8 flex justify-center">
      <div className="mx-auto max-w-5xl w-full">
        <div className="flex justify-center mb-4">
          <input
            type="text"
            placeholder="Search"
            onChange={handleSearchChange}
            className="placeholder-gray-600 p-2 border border-gray-400 rounded-md bg-[#fff2e3] w-full max-w-md"
          />
        </div>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          entries.map((entry, index) => (
            <Entry
              key={index}
              title={entry.title}
              created={entry.date || ''} // API doesn't provide this, so we're using an empty string as fallback
              link={entry.url}
            />
          ))
        )}
      </div>
    </div>
  );
}
