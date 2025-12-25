# ChartInk Sector Column Extension

Chrome extension that automatically adds Sector/Industry columns to ChartInk stock tables.

## Features

- Automatically adds Sector or Industry column to ChartInk tables
- Highlights if 3 or more similar sector with unique color
- Fetches data from NSE (National Stock Exchange)
- 24-hour caching to reduce API calls
- Toggle between Sector and Industry results

## Installation

1. Download the extension
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

## Usage

1. Navigate to any ChartInk page with a stock table
2. The extension automatically adds the Sector/Industry column
3. Click the extension icon to:
   - Enable/disable the extension
   - Toggle between Sector and Industry view
   - Refresh data
   - Clear cache

## Privacy

This extension:
- Only runs on chartink.com
- Fetches data from nseindia.com
- Stores data locally in your browser
- Does not collect or transmit any personal information

## License

MIT License

## Test Everything

- Extension loads without errors
- Works on ChartInk
- Popup functions correctly
- Toggle between Sector/Industry works
- Highlights if 3 or more similar sector with unique color
- Refresh and Clear Cache work
- Icons display properly
- No console errors

## Images
![Chartink Sector Column](https://github.com/dblabs25/chartink-sectorOrindustry-chrome-extension/blob/main/images/sector.png)
![Chartink Industry Column](https://github.com/dblabs25/chartink-sectorOrindustry-chrome-extension/blob/main/images/industry.png)