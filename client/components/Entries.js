import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

function Entry({ title, created, link }) {
  const dateObj = new Date(created);
  const easternTime = dateObj.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const date = easternTime.split(',')[0];
  const formattedDate = new Date(date).toISOString().split('T')[0];

  return (
    <a href={link} target="_blank" className="flex justify-between text-secondary py-1 group text-md">
      <strong className="font-medium break-word sm:break-normal text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-500">{title}</strong>
      <p className="font-berkeley whitespace-nowrap ml-4 sm:ml-12">{formattedDate}</p>
    </a>
  );
}

export function Entries({ database, supabase }) {
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchPosts() {
    try {
      const response = await fetch('/links.jsonl');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const data = lines.map(line => {
        const entry = JSON.parse(line);
        return {
          title: entry.subject || entry.link,
          url: entry.link,
          notion_timestamp: entry.date,
        };
      });
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  }  

  useEffect(() => {
    fetchPosts();
  }, [database]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const handleShuffleClick = () => {
    if (filteredEntries.length > 0) {
      const randomEntry = filteredEntries[Math.floor(Math.random() * filteredEntries.length)];
      const modifiedUrl = randomEntry.url.replace(/pdf(?=.)/, "abs").replace(/v\d+$/, "");
      window.open(modifiedUrl, '_blank').focus();
    }
  };

  const filteredEntries = entries.filter(entry => {
    const normalizedTitle = entry.title?.replace(/\s+/g, '').toLowerCase();
    const normalizedLink = entry.url?.replace(/\s+/g, '').toLowerCase();
    const normalizedSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
    return normalizedTitle?.includes(normalizedSearchTerm) || normalizedLink?.includes(normalizedSearchTerm);
  });
  
  return (
    <div className="px-4 mt-24 pb-40 md:pb-8">
      <div className="mx-auto max-w-5xl">
        <input
          type="text"
          placeholder="Search"
          onChange={handleSearchChange}
          className="placeholder-gray-600 p-2 border border-gray-400 rounded-md mb-4 bg-[#fff2e3]"
        />
        <button
          onClick={handleShuffleClick}
          className="flex items-center justify-center gap-2 text-gray-600 p-2 border border-gray-400 rounded-md mb-4 float-right bg-[#fff2e3] hover:bg-indigo-100"
        >
          Shuffle
          <svg width="18" height="18" viewBox="0 0 92 92"><path d=""></path></svg>
        </button>
        {filteredEntries.map((entry, index) => (
          <Entry
            key={index}
            title={entry.title}
            created={entry.notion_timestamp}
            link={entry.url.replace(/pdf(?=.)/, "abs").replace(/v\d+$/, "")}
          />
        ))}
      </div>
    </div>
  );
}
