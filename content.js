console.log('ChartInk Sector Extension loaded!');

let extensionEnabled = true;
let sectorOrIndustry = 'sector';

// Load settings
chrome.storage.sync.get(['enabled', 'sectorOrIndustry'], (result) => {
    extensionEnabled = result.enabled !== false;
    sectorOrIndustry = result.sectorOrIndustry || 'sector';
    
    if (extensionEnabled) {
        addSectorColumn();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
        extensionEnabled = request.enabled;
        if (extensionEnabled) {
            addSectorColumn();
        } else {
            removeSectorColumn();
        }
    } else if (request.action === 'refresh') {
        removeSectorColumn();
        addSectorColumn();
    } else if (request.action === 'reloadData') {
        sectorOrIndustry = request.source;
        removeSectorColumn();
        addSectorColumn();
    } else if (request.action === 'updateColumnHeader') {
        // Update header text without reloading data
        updateColumnHeader(request.value);
    }
});

// Store all sector cells for later highlighting
let sectorCells = [];

async function addSectorColumn() {
    const table = document.querySelector('table.whitespace-nowrap');
    
    if (!table) {
        console.log('No table found');
        return;
    }
    
    if (document.querySelector('.sector-column')) {
        console.log('Sector column already exists');
        return;
    }
    
    // Reset cells array
    sectorCells = [];
    
    // Add header
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) {
        console.log('No header row found');
        return;
    }
    
    // Get current setting for header text
    chrome.storage.sync.get(['sectorOrIndustry'], (result) => {
        const headerText = result.sectorOrIndustry === 'industry' ? 'Industry' : 'Sector';
        
        // Create sector header
        const sectorHeader = document.createElement('th');
        sectorHeader.textContent = headerText;
        sectorHeader.className = 'sector-column';
        sectorHeader.style.cssText = 'padding: 12px; text-align: left; color: #64b5f6;';
        
        // Find the "Links" column header
        const headers = Array.from(headerRow.querySelectorAll('th'));
        const linksHeaderIndex = headers.findIndex(th => th.textContent.trim() === 'Links');
        
        if (linksHeaderIndex !== -1) {
            // Insert before Links column
            headers[linksHeaderIndex].parentNode.insertBefore(sectorHeader, headers[linksHeaderIndex]);
            console.log(`Inserted header "${headerText}" before Links column (index: ${linksHeaderIndex})`);
        } else {
            // If no Links column, append at the end
            headerRow.appendChild(sectorHeader);
            console.log(`Appended header "${headerText}" at the end`);
        }
    });
    
    // Add data rows
    const rows = table.querySelectorAll('tbody tr');
    console.log(`Found ${rows.length} rows to process`);
    
    for (const row of rows) {
        // Find symbol cell - it's the 3rd column (index 2)
        const cells = Array.from(row.querySelectorAll('td'));
        const symbolCell = cells[2]; // 0=Sr, 1=Stock Name, 2=Symbol
        
        if (!symbolCell) {
            console.log('Symbol cell not found in row');
            continue;
        }
        
        const symbol = symbolCell.textContent.trim();
        console.log(`Processing symbol: ${symbol}`);
        
        // Create new cell for sector
        const sectorCell = document.createElement('td');
        sectorCell.className = 'sector-column';
        sectorCell.style.cssText = 'padding: 12px;';
        sectorCell.textContent = 'Loading...';
        sectorCell.style.color = '#999';
        
        // Store cell for later highlighting
        sectorCells.push(sectorCell);
        
        // Find where to insert - same position as header
        const headers = Array.from(headerRow.querySelectorAll('th'));
        const linksHeaderIndex = headers.findIndex(th => th.textContent.trim() === 'Links');
        
        if (linksHeaderIndex !== -1) {
            // Insert at the same index as the header
            const insertBeforeCell = cells[linksHeaderIndex];
            if (insertBeforeCell) {
                row.insertBefore(sectorCell, insertBeforeCell);
            } else {
                row.appendChild(sectorCell);
            }
        } else {
            row.appendChild(sectorCell);
        }
        
        // Fetch sector data
        fetchSectorForSymbol(symbol, sectorCell);
    }
    
    console.log('Sector column added!');
}

// Function to update column header text without reloading data
function updateColumnHeader(value) {
    const headerText = value === 'industry' ? 'Industry' : 'Sector';
    const headerCell = document.querySelector('th.sector-column');
    
    if (headerCell) {
        headerCell.textContent = headerText;
        console.log(`Column header updated to: ${headerText}`);
    }
    
    // Also update all data cells to show the correct value
    updateDataCells(value);
}

// Function to update data cells to show sector or industry
function updateDataCells(value) {
    const dataCells = document.querySelectorAll('td.sector-column');
    
    dataCells.forEach(cell => {
        // Get the stored data from the cell's title attribute
        const title = cell.title;
        if (title && title.includes('Sector:') && title.includes('Industry:')) {
            const lines = title.split('\n');
            const sector = lines[0].replace('Sector: ', '').trim();
            const industry = lines[1].replace('Industry: ', '').trim();
            
            // Update cell text based on selection
            const displayValue = value === 'industry' ? industry : sector;
            cell.textContent = displayValue;
            
            // Update color
            if (displayValue === 'Unknown') {
                cell.style.color = '#999';
            } else if (displayValue === 'Error') {
                cell.style.color = '#f44336';
            } else {
                cell.style.fontWeight = '500';
            }
        }
    });
    
    console.log(`Updated ${dataCells.length} data cells to show: ${value}`);
    
    // Re-apply highlighting after update
    highlightRepeatedValues();
}

let loadedCellsCount = 0;

async function fetchSectorForSymbol(symbol, cell) {
    try {
        // Send message to background script to fetch data
        chrome.runtime.sendMessage(
            { action: 'fetchSectorData', symbol: symbol },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Message error:', chrome.runtime.lastError);
                    cell.textContent = 'Error';
                    cell.style.color = '#f44336';
                    return;
                }
                
                if (response && response.success) {
                    const { sector, industry } = response.data;
                    
                    // Store both values in the cell's title for later switching
                    cell.title = `Sector: ${sector}\nIndustry: ${industry}`;
                    
                    // Get current setting
                    chrome.storage.sync.get(['sectorOrIndustry'], (result) => {
                        const displayValue = result.sectorOrIndustry === 'industry' ? industry : sector;
                        cell.textContent = displayValue;
                        
                        // Color coding
                        if (displayValue === 'Unknown') {
                            cell.style.color = '#999';
                        } else if (displayValue === 'Error') {
                            cell.style.color = '#f44336';
                        } else {
                            cell.style.fontWeight = '500';
                        }
                        
                        // Track loaded cells
                        loadedCellsCount++;
                        
                        // When all cells are loaded, apply highlighting
                        if (loadedCellsCount === sectorCells.length) {
                            console.log('All sectors loaded, applying highlighting...');
                            setTimeout(() => highlightRepeatedValues(), 500);
                        }
                    });
                } else {
                    cell.textContent = 'Error';
                    cell.style.color = '#f44336';
                    
                    loadedCellsCount++;
                    if (loadedCellsCount === sectorCells.length) {
                        setTimeout(() => highlightRepeatedValues(), 500);
                    }
                }
            }
        );
    } catch (error) {
        console.error(`Error fetching sector for ${symbol}:`, error);
        cell.textContent = 'Error';
        cell.style.color = '#f44336';
    }
}

// NEW: Function to highlight repeated values (3+ occurrences)
function highlightRepeatedValues() {
    const dataCells = document.querySelectorAll('td.sector-column');
    
    // Count occurrences of each value
    const valueCounts = {};
    
    dataCells.forEach(cell => {
        const value = cell.textContent.trim();
        
        // Skip Loading, Error, and Unknown
        if (value === 'Loading...' || value === 'Error' || value === 'Unknown' || value === '') {
            return;
        }
        
        valueCounts[value] = (valueCounts[value] || 0) + 1;
    });
    
    // Find values that appear 3+ times
    const repeatedValues = Object.keys(valueCounts).filter(value => valueCounts[value] >= 3);
    
    console.log('Value counts:', valueCounts);
    console.log('Values appearing 3+ times:', repeatedValues);
    
    // Apply highlighting
    dataCells.forEach(cell => {
        const value = cell.textContent.trim();
        
        if (repeatedValues.includes(value)) {
            // Apply highlight with a subtle background
            cell.style.backgroundColor = getHighlightColor(value);
            cell.style.borderRadius = '4px';
            cell.style.padding = '8px 12px';
            
            // Add a small badge showing count
            const count = valueCounts[value];
            if (!cell.querySelector('.count-badge')) {
                const badge = document.createElement('span');
                badge.className = 'count-badge';
                badge.textContent = ` (${count})`;
                badge.style.cssText = `
                    font-size: 10px;
                    opacity: 0.7;
                    margin-left: 4px;
                `;
                cell.appendChild(badge);
            }
        } else {
            // Remove highlighting for values that don't repeat enough
            cell.style.backgroundColor = '';
            const badge = cell.querySelector('.count-badge');
            if (badge) badge.remove();
        }
    });
    
    // Log statistics
    if (repeatedValues.length > 0) {
        console.log(`Highlighted ${repeatedValues.length} repeated values`);
    }
}

// NEW: Get highlight color based on value
function getHighlightColor(value) {
    // Use a hash function to get consistent colors for same values
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Predefined pastel colors for better readability
    const colors = [
        'rgba(233, 71, 95, 0.6)',  
        'rgba(46, 234, 61, 0.6)',
        'rgba(59, 163, 237, 0.6)',
        'rgba(222, 179, 37, 0.6)', 
        'rgba(227, 156, 238, 0.6)',
        'rgba(38, 184, 203, 0.6)',
        'rgba(187, 129, 36, 0.6)',
        'rgba(46, 68, 195, 0.6)',
    ];
    
    return colors[Math.abs(hash) % colors.length];
}

function removeSectorColumn() {
    document.querySelectorAll('.sector-column').forEach(el => el.remove());
    sectorCells = [];
    loadedCellsCount = 0;
    console.log('Sector column removed');
}

// Watch for dynamic content
const observer = new MutationObserver(() => {
    if (extensionEnabled && !document.querySelector('.sector-column')) {
        console.log('Table changed, re-adding sector column');
        loadedCellsCount = 0;
        addSectorColumn();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});