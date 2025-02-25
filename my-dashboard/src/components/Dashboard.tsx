import React, { useState, useEffect } from 'react';
import { TrendingUp, Home, DollarSign, Building2, AlertTriangle } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

// At the top of your Dashboard.tsx file, add this import:
import { FRED_API_URL, HEALTH_CHECK_URL } from '../config';



// With this:
const PROXY_URL = FRED_API_URL;




// Define types for our data structures
interface Observation {
  date: string;
  value: string;
}

interface ApiResponse {
  observations: Observation[];
}

interface ProcessedDataPoint {
  date: string;
  month: string;
  value: number;
}

interface CombinedDataPoint {
  date: string;
  month: string;
  priceIndex: number | null;
  inventory: number | null;
  mortgageRate: number | null;
  constructionSpend: number | null;
  bankruptcies: number | null;
}

interface RegionalData {
  region: string;
  priceIndex: number;
  inventoryMonths: number;
  yearOverYearGrowth: number;
}

interface MarketTrend {
  quarter: string;
  residential: number;
  commercial: number;
  industrial: number;
}

interface MarketSegment {
  name: string;
  value: number;
  color: string;
}

interface MarketData {
  trends: MarketTrend[];
  segments: MarketSegment[];
}

interface MetricInfo {
  name: string;
  color: string;
  icon: React.ComponentType<any>;
}

interface MetricsMap {
  [key: string]: MetricInfo;
}

// Card Components
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-lg p-8 shadow">{children}</div>;
}

export function CardContent({ children }: { children: React.ReactNode }) {
  console.log("CardContent rendered");
  return <div className="p-6">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="border-b p-6 font-bold">{children}</div>;
}

export function CardTitle({ children, className = '' }: { 
  children: React.ReactNode, 
  className?: string 
}) {
  return <h2 className={`text-lg font-bold text-slate-700 ${className}`}>{children}</h2>;
}



const fredService = {
  async getSeries(seriesId: string, params: Record<string, any> = {}) {
    try {
      const queryParams = new URLSearchParams(params);
      console.log(`Fetching data for ${seriesId}...`);
      const response = await fetch(`${PROXY_URL}/${seriesId}?${queryParams}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response for ${seriesId}:`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched data for ${seriesId}`);
      return data;
    } catch (error) {
      console.error(`Error fetching series ${seriesId}:`, error);
      throw error;
    }
  }
};

// Mock data generator function
function generateMockData(): CombinedDataPoint[] {
  const startDate = new Date(new Date().getFullYear() - 5, 0, 1); // 5 years ago
  const data: CombinedDataPoint[] = [];
  
  for (let i = 0; i < 60; i++) { // 60 months = 5 years
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + i);
    
    const dateStr = currentDate.toISOString().split('T')[0];
    const monthStr = currentDate.toLocaleDateString('en-US', { month: 'short' });
    
    // Generate slightly realistic looking data with trends
    const basePriceIndex = 100 + i * 0.5 + Math.random() * 5;
    const baseInventory = 4 + Math.sin(i / 10) * 1.5 + Math.random() * 0.5;
    const baseMortgageRate = 3 + Math.sin(i / 15) * 1 + Math.random() * 0.3;
    const baseConstruction = 1200 + i * 10 + Math.sin(i / 8) * 100 + Math.random() * 50;
    const baseBankruptcies = 2000 + Math.sin(i / 12) * 200 + Math.random() * 100;
    
    data.push({
      date: dateStr,
      month: monthStr,
      priceIndex: parseFloat(basePriceIndex.toFixed(2)),
      inventory: parseFloat(baseInventory.toFixed(2)),
      mortgageRate: parseFloat(baseMortgageRate.toFixed(2)),
      constructionSpend: parseFloat(baseConstruction.toFixed(2)),
      bankruptcies: parseFloat(baseBankruptcies.toFixed(2))
    });
  }
  
  return data;
}

// Real estate FRED series IDs - Updated with valid series
const SERIES_IDS = {
  priceIndex: 'CSUSHPINSA',     // Case-Shiller Home Price Index
  inventory: 'MSACSR',          // Monthly Supply of Houses
  mortgageRate: 'MORTGAGE30US',  // 30-Year Fixed Rate Mortgage
  constructionSpend: 'TLRESCONS', // Total Residential Construction
  bankruptcies: 'BUSLOANS'      // Commercial and Industrial Loans (as proxy for bankruptcies)
};

const Dashboard = () => {
  // States for each metric
  const [_priceIndexData, setPriceIndexData] = useState<ProcessedDataPoint[]>([]);
  const [_inventoryData, setInventoryData] = useState<ProcessedDataPoint[]>([]);
  const [_mortgageRateData, setMortgageRateData] = useState<ProcessedDataPoint[]>([]);
  const [_constructionData, setConstructionData] = useState<ProcessedDataPoint[]>([]);
  const [_bankruptcyData, setBankruptcyData] = useState<ProcessedDataPoint[]>([]);
  
  // Combined data for charts
  const [chartData, setChartData] = useState<CombinedDataPoint[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<string>('priceIndex');
  
  const metrics: MetricsMap = {
    priceIndex: { 
      name: 'Price Index', 
      color: '#0f766e',
      icon: TrendingUp 
    },
    inventory: { 
      name: 'Inventory (months)', 
      color: '#0369a1',
      icon: Home
    },
    mortgageRate: { 
      name: 'Mortgage Rate (%)', 
      color: '#9333ea',
      icon: DollarSign
    },
    constructionSpend: { 
      name: 'Construction Spending', 
      color: '#0891b2',
      icon: Building2
    },
    bankruptcies: { 
      name: 'Business Loans', 
      color: '#4f46e5',
      icon: AlertTriangle
    }
  };

  // Fetch data from FRED
  useEffect(() => {
    const fetchFredData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if proxy server is running
        try {
          // With this:
          const healthResponse = await fetch(HEALTH_CHECK_URL);
          if (!healthResponse.ok) {
            throw new Error('Health check failed');
          }
          const healthData = await healthResponse.json();
          console.log('Proxy server health check:', healthData);
        } catch (proxyError) {
          console.error('Proxy server health check failed:', proxyError);
          throw new Error('Proxy server is not running or not responding. Please ensure the backend server is started.');
        }
        
        // Calculate date 5 years ago from today
        const today = new Date();
        const firstDayOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const fiveYearsAgo = new Date(firstDayOfThisMonth);
        fiveYearsAgo.setFullYear(firstDayOfThisMonth.getFullYear() - 5);
        const formattedDate = fiveYearsAgo.toISOString().split('T')[0];

        console.log("Observation start date:", formattedDate);

        // Common params for all requests
        const commonParams = {
          observation_start: formattedDate,
          frequency: 'm' // monthly data
        };

        console.log(`Fetching data from FRED API starting from ${formattedDate}...`);
        
        // Fetch all data in parallel with individual error handling
        const results = await Promise.allSettled([
          fredService.getSeries(SERIES_IDS.priceIndex, commonParams),
          fredService.getSeries(SERIES_IDS.inventory, commonParams),
          fredService.getSeries(SERIES_IDS.mortgageRate, commonParams),
          fredService.getSeries(SERIES_IDS.constructionSpend, commonParams),
          fredService.getSeries(SERIES_IDS.bankruptcies, commonParams)
        ]);
        
        console.log('FRED API requests completed:', results);
        
        // Check if any requests failed
        const failedRequests = results.filter(r => r.status === 'rejected');
        if (failedRequests.length > 0) {
          console.warn(`${failedRequests.length} out of ${results.length} requests failed`);
          failedRequests.forEach(f => console.error('Failed request:', (f as PromiseRejectedResult).reason));
        }
        
        // Process results even if some failed
        const [priceIndex, inventory, mortgageRate, construction, bankruptcy] = results.map(
          r => r.status === 'fulfilled' ? (r as PromiseFulfilledResult<ApiResponse>).value : { observations: [] }
        );
        
        // Process price index data
        const processedPriceIndex = priceIndex.observations
          ? priceIndex.observations.map((obs: Observation) => ({
              date: obs.date,
              month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { 
                month: 'short', 
                timeZone: 'UTC' 
              }),
              value: parseFloat(obs.value)
            }))
          : [];
        
        // Process inventory data
        const processedInventory = inventory.observations
          ? inventory.observations.map((obs: Observation) => ({
              date: obs.date,
              month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { 
                month: 'short', 
                timeZone: 'UTC' 
              }),
              value: parseFloat(obs.value)
            }))
          : [];
        
        // Process mortgage rate data
        const processedMortgageRate = mortgageRate.observations
          ? mortgageRate.observations.map((obs: Observation) => ({
              date: obs.date,
              month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { 
                month: 'short', 
                timeZone: 'UTC' 
              }),
              value: parseFloat(obs.value)
            }))
          : [];
        
        // Process construction spending data
        const processedConstruction = construction.observations
          ? construction.observations.map((obs: Observation) => ({
              date: obs.date,
              month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { 
                month: 'short', 
                timeZone: 'UTC' 
              }),
              value: parseFloat(obs.value)
            }))
          : [];
        
        // Process bankruptcy data
        const processedBankruptcy = bankruptcy.observations
          ? bankruptcy.observations.map((obs: Observation) => ({
              date: obs.date,
              month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { 
                month: 'short', 
                timeZone: 'UTC' 
              }),
              value: parseFloat(obs.value)
            }))
          : [];
        
        // Set individual data sets
        setPriceIndexData(processedPriceIndex);
        setInventoryData(processedInventory);
        setMortgageRateData(processedMortgageRate);
        setConstructionData(processedConstruction);
        setBankruptcyData(processedBankruptcy);
        
        // Check if we have data to combine
        const hasData = [
          processedPriceIndex, 
          processedInventory, 
          processedMortgageRate, 
          processedConstruction, 
          processedBankruptcy
        ].some(arr => arr.length > 0);
        
        if (!hasData) {
          throw new Error('No valid data received from FRED API');
        }
        
        // Combine data for charts (join on date)
        const allDates = [...new Set([
          ...processedPriceIndex.map((i: ProcessedDataPoint) => i.date),
          ...processedInventory.map((i: ProcessedDataPoint) => i.date),
          ...processedMortgageRate.map((i: ProcessedDataPoint) => i.date),
          ...processedConstruction.map((i: ProcessedDataPoint) => i.date),
          ...processedBankruptcy.map((i: ProcessedDataPoint) => i.date)
        ])].sort();
        
        const combined = allDates.map(date => {
          const priceItem = processedPriceIndex.find((i: ProcessedDataPoint) => i.date === date);
          const inventoryItem = processedInventory.find((i: ProcessedDataPoint) => i.date === date);
          const mortgageItem = processedMortgageRate.find((i: ProcessedDataPoint) => i.date === date);
          const constructionItem = processedConstruction.find((i: ProcessedDataPoint) => i.date === date);
          const bankruptcyItem = processedBankruptcy.find((i: ProcessedDataPoint) => i.date === date);
          
          return {
            date,
            month: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { 
              month: 'short', 
              timeZone: 'UTC' 
            }),
            priceIndex: priceItem ? priceItem.value : null,
            inventory: inventoryItem ? inventoryItem.value : null,
            mortgageRate: mortgageItem ? mortgageItem.value : null,
            constructionSpend: constructionItem ? constructionItem.value : null,
            bankruptcies: bankruptcyItem ? bankruptcyItem.value : null
          };
        });
        
        console.log('Combined data:', combined);
        setChartData(combined);
        
        // Example regional data (normally would come from another API)
        setRegionalData([
          { region: 'Northeast', priceIndex: 112, inventoryMonths: 4.2, yearOverYearGrowth: 5.6 },
          { region: 'Midwest', priceIndex: 98, inventoryMonths: 3.8, yearOverYearGrowth: 3.2 },
          { region: 'South', priceIndex: 106, inventoryMonths: 4.7, yearOverYearGrowth: 7.1 },
          { region: 'West', priceIndex: 118, inventoryMonths: 3.5, yearOverYearGrowth: 8.3 },
        ]);
        
        // Example market data (normally would come from another API)
        setMarketData({
          trends: [
            { quarter: 'Q1 2023', residential: 82, commercial: 76, industrial: 79 },
            { quarter: 'Q2 2023', residential: 85, commercial: 78, industrial: 83 },
            { quarter: 'Q3 2023', residential: 89, commercial: 81, industrial: 86 },
            { quarter: 'Q4 2023', residential: 93, commercial: 85, industrial: 89 },
            { quarter: 'Q1 2024', residential: 98, commercial: 88, industrial: 91 },
            { quarter: 'Q2 2024', residential: 103, commercial: 92, industrial: 94 },
          ],
          segments: [
            { name: 'Residential', value: 45, color: '#0891b2' },
            { name: 'Commercial', value: 30, color: '#0f766e' },
            { name: 'Industrial', value: 15, color: '#4f46e5' },
            { name: 'Land', value: 10, color: '#9333ea' },
          ]
        });
      } catch (err: unknown) {
        console.error('Error fetching FRED data:', err);
        
        // Generate mock data as fallback
        const mockData = generateMockData();
        setChartData(mockData);
        
        // Set market data
        setMarketData({
          trends: [
            { quarter: 'Q1 2023', residential: 82, commercial: 76, industrial: 79 },
            { quarter: 'Q2 2023', residential: 85, commercial: 78, industrial: 83 },
            { quarter: 'Q3 2023', residential: 89, commercial: 81, industrial: 86 },
            { quarter: 'Q4 2023', residential: 93, commercial: 85, industrial: 89 },
            { quarter: 'Q1 2024', residential: 98, commercial: 88, industrial: 91 },
            { quarter: 'Q2 2024', residential: 103, commercial: 92, industrial: 94 },
          ],
          segments: [
            { name: 'Residential', value: 45, color: '#0891b2' },
            { name: 'Commercial', value: 30, color: '#0f766e' },
            { name: 'Industrial', value: 15, color: '#4f46e5' },
            { name: 'Land', value: 10, color: '#9333ea' },
          ]
        });
        
        // Set regional data
        setRegionalData([
          { region: 'Northeast', priceIndex: 112, inventoryMonths: 4.2, yearOverYearGrowth: 5.6 },
          { region: 'Midwest', priceIndex: 98, inventoryMonths: 3.8, yearOverYearGrowth: 3.2 },
          { region: 'South', priceIndex: 106, inventoryMonths: 4.7, yearOverYearGrowth: 7.1 },
          { region: 'West', priceIndex: 118, inventoryMonths: 3.5, yearOverYearGrowth: 8.3 },
        ]);
        
        // Show a specific error message
        if (err instanceof Error && err.message.includes('Proxy server')) {
          setError(err.message);
        } else {
          setError('Failed to load economic data. Using mock data instead.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFredData();
  }, []);
  
  // Calculate trend percentage for each metric
  const calculateTrend = (data: CombinedDataPoint[], key: keyof CombinedDataPoint) => {
    if (!data || data.length < 2) return '0%';
    
    // Get last two valid values
    let latestValue: number | null = null;
    let previousValue: number | null = null;
    
    for (let i = data.length - 1; i >= 0; i--) {
      const currentValue = data[i][key];
      if (currentValue !== null && latestValue === null) {
        latestValue = currentValue as number;
        continue;
      }
      if (currentValue !== null && latestValue !== null && previousValue === null) {
        previousValue = currentValue as number;
        break;
      }
    }
    
    if (latestValue === null || previousValue === null) return 'N/A';
    
    const change = ((latestValue - previousValue) / previousValue) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };
  
  // Get latest value for a metric
  const getLatestValue = (data: CombinedDataPoint[], key: keyof CombinedDataPoint): number | string => {
    if (!data || !data.length) return 'N/A';
    
    // Find the most recent data point that has this value
    for (let i = data.length - 1; i >= 0; i--) {
      const value = data[i][key];
      if (value !== null) {
        return value as number;
      }
    }
    
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-800 p-8 mb-8">
        <div className="max-w-full mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-white">Real Estate Economic Indicators</h1>
              <p className="text-slate-300 mt-1">Performance metrics and market analysis</p>
            </div>
            <div className="text-right text-sm text-slate-300">
              <div>Last updated: {new Date().toLocaleDateString()}</div>
              <div>Data refreshes daily at 5 PM EST</div>
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg font-medium text-slate-600">Loading economic data...</div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64 flex-col space-y-4">
          <div className="text-lg font-medium text-red-600">{error}</div>
          <div className="text-sm text-slate-600">(Using mock data for visualization)</div>
        </div>
      ) : (
        <div className="max-w-full mx-auto px-8 space-y-8">
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(metrics).map(([key, metric]) => {
              const Icon = metric.icon;
              const latestValue = getLatestValue(chartData, key as keyof CombinedDataPoint);
              const trendValue = calculateTrend(chartData, key as keyof CombinedDataPoint);
              
              return (
                <div key={key} className="border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
                  <div className="p-4 px-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <Icon className="h-5 w-5 text-slate-600" color={metric.color} />
                      <h2 className="text-lg font-semibold text-slate-700">{metric.name}</h2>
                    </div>
                  </div>
                  <div className="p-4 pl-8">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-3xl font-bold text-slate-800 pr-8">
                          {typeof latestValue === 'number' ? latestValue.toLocaleString(undefined, {
                            maximumFractionDigits: 1
                          }) : latestValue}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {trendValue} from last month
                        </div>
                      </div>
                      <div className="w-32">
                        <ResponsiveContainer width="100%" height={50}>
                          <LineChart data={chartData.slice(-6)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Line 
                              type="monotone" 
                              dataKey={key} 
                              stroke={metric.color} 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


        <div className="border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Trends Over Time</h2>
        </div>
        <div className="p-6 pl-8">
        <div className="flex flex-wrap gap-2 mb-6" style={{ paddingBottom: "50px" }}>

            {Object.entries(metrics).map(([key, metric]) => (
                <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`px-2 py-1 text-sm border rounded ${
                    activeMetric === key
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}
                >
                {metric.name}
                </button>
            ))}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    tickFormatter={(dateStr: string) => {
                        const d = new Date(`${dateStr}T00:00:00Z`); // Parse in UTC
                        const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
                        const year = d.getFullYear();
                        
                        // Only show the year on January or if it's the first data point of the year
                        if (month === 'Jan' || d.getMonth() === 0) {
                        return `${month} ${year}`;
                        }
                        return month;
                    }}
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    minTickGap={15}
                    />
                    <YAxis 
                    stroke="#64748b"
                    tickFormatter={(value: any) => {
                        // Format the Y-axis values based on the active metric
                        if (activeMetric === 'mortgageRate') {
                        return `${value}%`;
                        } else if (activeMetric === 'constructionSpend' || activeMetric === 'bankruptcies') {
                        // Use abbreviations for large numbers
                        return value >= 1000 ? `${(value/1000).toFixed(1)}K` : value;
                        } else {
                        return value;
                        }
                    }}
                    />
                    <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb' 
                    }}
                    formatter={(value: any) => {
                        if (value === null || value === undefined) return ['N/A', metrics[activeMetric as keyof typeof metrics].name];
                        
                        // Format the value based on the active metric
                        if (activeMetric === 'mortgageRate') {
                        return [`${Number(value).toFixed(2)}%`, metrics[activeMetric as keyof typeof metrics].name];
                        } else if (activeMetric === 'constructionSpend' || activeMetric === 'bankruptcies') {
                        return [`${Number(value).toLocaleString()}`, metrics[activeMetric as keyof typeof metrics].name];
                        } else {
                        return [value.toFixed(2), metrics[activeMetric as keyof typeof metrics].name];
                        }
                    }}
                    labelFormatter={(dateStr: string) => {
                        const d = new Date(`${dateStr}T00:00:00Z`); // Parse in UTC
                        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
                    }}
                    />
                    <Line
                    type="monotone"
                    dataKey={activeMetric}
                    stroke={metrics[activeMetric as keyof typeof metrics].color}
                    strokeWidth={2}
                    dot={{r: 2}}
                    activeDot={{r: 4}}
                    />
                    <Legend />
                </LineChart>
                </ResponsiveContainer>
        </div>
        </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Regional Comparison</h2>
              </div>
              <div className="p-6 pl-8">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="region" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="priceIndex" name="Price Index" fill="#0f766e" />
                    <Bar dataKey="inventoryMonths" name="Inventory (months)" fill="#0369a1" />
                    <Bar dataKey="yearOverYearGrowth" name="YoY Growth (%)" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {marketData && (
              <div className="border border-slate-200 rounded-lg shadow-sm bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">Market Analysis</h2>
                </div>
                <div className="p-6 pl-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={marketData.trends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb'
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="residential" name="Residential" stroke="#0891b2" strokeWidth={2} />
                          <Line type="monotone" dataKey="commercial" name="Commercial" stroke="#0f766e" strokeWidth={2} />
                          <Line type="monotone" dataKey="industrial" name="Industrial" stroke="#4f46e5" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={marketData.segments}
                            cx="50%"
                            cy="50%"
                            innerRadius="40%"
                            outerRadius="70%"
                            paddingAngle={2}
                            dataKey="value"
                            label={({name, percent}: {name: string, percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {marketData.segments.map((entry: MarketSegment, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem'
                            }}
                            formatter={(value: number, name: string) => [
                              `${value}%`, 
                              name
                            ]}
                          />
 <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ 
                              fontSize: '0.75rem',
                              paddingTop: '10px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;