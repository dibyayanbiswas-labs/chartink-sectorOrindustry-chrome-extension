// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('ChartInk Sector Extension installed!');
    
    // Set default settings
    chrome.storage.sync.set({
        enabled: true,
        autoRefresh: false,
        sectorOrIndustry: "sector",
    });
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchSectorData') {
        fetchSectorData(request.symbol)
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
    }
});

// Function to fetch sector data from API
async function fetchSectorData(symbol) {
    // Try to get from cache first
    const cache = await chrome.storage.local.get(symbol);
    
    if (cache[symbol]) {
        const cacheTime = cache[symbol].timestamp;
        const now = Date.now();
        
        // Cache for 24 hours
        if (now - cacheTime < 24 * 60 * 60 * 1000) {
            console.log(`Using cached data for ${symbol}`);
            return cache[symbol].data;
        }
    }
    
    // Fetch from NSE API
    try {
        const data = await fetchFromNSE(symbol);
        
        // Only cache if we got valid data
        if (data.sector !== 'Unknown' && data.sector !== 'Error') {
            await chrome.storage.local.set({
                [symbol]: {
                    data: data,
                    timestamp: Date.now()
                }
            });
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return { sector: 'Error', industry: 'Error' };
    }
}

// Fetch from NSE with proper CORS handling
async function fetchFromNSE(symbol) {
    try {
        // NSE API endpoint
        const apiUrl = `https://www.nseindia.com/api/quote-equity?symbol=${symbol}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract sector and industry from the response
        const sector = data?.info?.sector || data?.industryInfo?.sector || 'Unknown';
        const industry = data?.info?.industry || data?.industryInfo?.industry || 'Unknown';

        console.log(`Fetched data for ${symbol}:`, { sector, industry });

        return {
            sector: sector,
            industry: industry
        };

    } catch (error) {
        console.error(`NSE API error for ${symbol}:`, error.message);
        
        // Return Unknown instead of Error for better UX
        return {
            sector: 'Unknown',
            industry: 'Unknown'
        };
    }
}
