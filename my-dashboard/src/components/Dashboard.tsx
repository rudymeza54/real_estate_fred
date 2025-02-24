import { useState, useEffect } from 'react';

// Comprehensive Type Definitions
interface Observation {
  date: string;
  value: string;
}

interface ProcessedMetricData {
  date: string;
  month: string;
  value: number;
}

interface CombinedData {
  date: string;
  month: string;
  priceIndex: number | null;
  inventory: number | null;
  mortgageRate: number | null;
  constructionSpend: number | null;
  bankruptcies: number | null;
}

// FRED API service with proxy
const PROXY_URL = 'http://localhost:4000/api/fred';

const fredService = {
  async getSeries(seriesId: string, params: Record<string, string | number> = {}) {
    try {
      const queryParams = new URLSearchParams(params as Record<string, string>);
      const response = await fetch(`${PROXY_URL}/${seriesId}?${queryParams}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching series ${seriesId}:`, error);
      throw error;
    }
  },
};

const SERIES_IDS = {
  priceIndex: 'CSUSHPINSA',
  inventory: 'MSACSR',
  mortgageRate: 'MORTGAGE30US',
  constructionSpend: 'TLRESCONS',
  bankruptcies: 'BUSLOANS',
};

const Dashboard = () => {
  const [,setChartData] = useState<CombinedData[]>([]);

  useEffect(() => {
    const fetchFredData = async () => {
      try {
        const today = new Date();
        const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), 1);
        const formattedDate = fiveYearsAgo.toISOString().split('T')[0];

        const commonParams = {
          observation_start: formattedDate,
          frequency: 'm',
        };

        const results = await Promise.allSettled([
          fredService.getSeries(SERIES_IDS.priceIndex, commonParams),
          fredService.getSeries(SERIES_IDS.inventory, commonParams),
          fredService.getSeries(SERIES_IDS.mortgageRate, commonParams),
          fredService.getSeries(SERIES_IDS.constructionSpend, commonParams),
          fredService.getSeries(SERIES_IDS.bankruptcies, commonParams),
        ]);

        const [priceIndex, inventory, mortgageRate, construction, bankruptcy] = results.map(
          (r) => (r.status === 'fulfilled' ? r.value : { observations: [] })
        );

        const processedPriceIndex = priceIndex.observations.map((obs: Observation) => ({
          date: obs.date,
          month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: parseFloat(obs.value),
        }));

        const processedInventory = inventory.observations.map((obs: Observation) => ({
          date: obs.date,
          month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: parseFloat(obs.value),
        }));

        const processedMortgageRate = mortgageRate.observations.map((obs: Observation) => ({
          date: obs.date,
          month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: parseFloat(obs.value),
        }));

        const processedConstruction = construction.observations.map((obs: Observation) => ({
          date: obs.date,
          month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: parseFloat(obs.value),
        }));

        const processedBankruptcy = bankruptcy.observations.map((obs: Observation) => ({
          date: obs.date,
          month: new Date(`${obs.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: parseFloat(obs.value),
        }));

        const allDates = [
          ...processedPriceIndex.map((i: ProcessedMetricData) => i.date),
          ...processedInventory.map((i: ProcessedMetricData) => i.date),
          ...processedMortgageRate.map((i: ProcessedMetricData) => i.date),
          ...processedConstruction.map((i: ProcessedMetricData) => i.date),
          ...processedBankruptcy.map((i: ProcessedMetricData) => i.date),
        ].sort();

        const combined = allDates.map((date) => {
          const priceItem = processedPriceIndex.find((i: ProcessedMetricData) => i.date === date);
          const inventoryItem = processedInventory.find((i: ProcessedMetricData) => i.date === date);
          const mortgageItem = processedMortgageRate.find((i: ProcessedMetricData) => i.date === date);
          const constructionItem = processedConstruction.find((i: ProcessedMetricData) => i.date === date);
          const bankruptcyItem = processedBankruptcy.find((i: ProcessedMetricData) => i.date === date);

          return {
            date,
            month: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
            priceIndex: priceItem ? priceItem.value : null,
            inventory: inventoryItem ? inventoryItem.value : null,
            mortgageRate: mortgageItem ? mortgageItem.value : null,
            constructionSpend: constructionItem ? constructionItem.value : null,
            bankruptcies: bankruptcyItem ? bankruptcyItem.value : null,
          };
        });

        setChartData(combined);
      } catch (err) {
        console.error('Error fetching FRED data:', err);
      }
    };

    fetchFredData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Render your UI here */}
    </div>
  );
};

export default Dashboard;