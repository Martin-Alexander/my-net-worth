import React, { useEffect, useState } from 'react';
import './App.css';
import { Chart, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Transaction, TransactionParams, TransactionType } from './transactions/transaction';
import { PaymentTransaction } from './transactions/paymentTransaction';
import { ConversionTransaction } from './transactions/conversionTransaction';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export enum Currency {
  CAD = 'CAD',
  BTC = 'BTC',
  ETH = 'ETH'
}

interface NetWorthDay {
  value: number;
  time: Date;
}

interface ExchangeRate {
  pair: 'CAD_BTC' | 'CAD_ETH';
  midMarketRate: number;
  createdAt: string;
}

const oneDay = 86400000;

// Assumes historicalExchangeRates is sorted from ealiest to latest
const getValueInCad = (amount: number, time: Date, historicalExchangeRates: ExchangeRate[]): number => {
  const firstHistoricalExchangeRateAfterTime = historicalExchangeRates.find((dynamicExchangeRate) => {
    if (new Date(dynamicExchangeRate.createdAt) >= time) {
      return true;
    } else {
      return false;
    }
  });

  if (firstHistoricalExchangeRateAfterTime) {
    return amount * firstHistoricalExchangeRateAfterTime.midMarketRate;
  } else {
    return 0;
  }
}

// Assumes walletAtTimes is sorted from ealiest to latest
const getHistoricalWallet = (time: Date, walletAtTimes: HistoricalWallet[]): HistoricalWallet => {
  const foundWallet = walletAtTimes.find((walletAtTimes) => {
    if (walletAtTimes.time >= time) {
      return true;
    } else {
      return false;
    }
  });

  if (foundWallet) {
    return foundWallet;
  } else {
    throw new Error();
  }
}

// A snapshot of your wallet at a specific time
interface HistoricalWallet {
  cad_amount: number;
  eth_amount: number;
  btc_amount: number;
  time: Date;
}

function App() {
  const [netWorths, setNetWorths] = useState<NetWorthDay[]>([]);
  const [cadBtcExchangeRates, setCadBtcExchangeRates] = useState<ExchangeRate[]>([]);
  const [cadEthExchangeRates, setCadEthExchangeRates] = useState<ExchangeRate[]>([]);
  const [selectedTimeScale, setSelectedTimeScale] = useState<'all-time' | 'past-year' | 'past-month'>('all-time');

  useEffect(() => {
    // sorted from earliest to latest
    fetch('https://shakepay.github.io/programming-exercise/web/rates_CAD_BTC.json')
      .then(repsonse => repsonse.json())
      .then(setCadBtcExchangeRates);
  }, []);

  useEffect(() => {
    // sorted from earliest to latest
    fetch('https://shakepay.github.io/programming-exercise/web/rates_CAD_ETH.json')
      .then(repsonse => repsonse.json())
      .then(setCadEthExchangeRates);
  }, []);

  useEffect(() => {
    const currentWallet = {
      [Currency.CAD]: 0,
      [Currency.ETH]: 0,
      [Currency.BTC]: 0
    }

    fetch('https://shakepay.github.io/programming-exercise/web/transaction_history.json')
      .then(repsonse => repsonse.json())
      .then((data: TransactionParams[]) => {

        // use #reverse() to sort from earliest to latest
        const transactions: Array<ConversionTransaction | PaymentTransaction> = data.reverse().map((transactionParam) => {
          if (transactionParam.type === TransactionType.Conversion) {
            return new ConversionTransaction(transactionParam)
          } else {
            return new PaymentTransaction(transactionParam);
          }
        });

        const walletAtTimes: HistoricalWallet[] = [];

        transactions.forEach((transaction) => {
          if (transaction.isConversion()) {
            currentWallet[transaction.from.currency] -= transaction.from.amount;
            currentWallet[transaction.to.currency] += transaction.to.amount;
          } else {
            if (transaction.isCredit()) {
              currentWallet[transaction.currency] += transaction.amount
            } else if (transaction.isDebit()) {
              currentWallet[transaction.currency] -= transaction.amount
            } else {
              throw new Error();
            }
          }

          walletAtTimes.push({
            time: transaction.getCreatedAt(),
            btc_amount: currentWallet[Currency.BTC],
            cad_amount: currentWallet[Currency.CAD],
            eth_amount: currentWallet[Currency.ETH]
          })
        });

        const dateOfFirstTransaction: Date = new Date(transactions[0].getCreatedAt());
        dateOfFirstTransaction.setHours(0, 0, 0, 0);
        const dateOfLastTransaction: Date = new Date(transactions[transactions.length - 1].getCreatedAt());

        const netWorthPerDayFromFirstToLastTransaction: NetWorthDay[] = [];

        for (let currentDate = dateOfFirstTransaction; currentDate < dateOfLastTransaction; currentDate = new Date(currentDate.getTime() + oneDay)) {
          const walletAtTime = getHistoricalWallet(currentDate, walletAtTimes);

          const btcValueInCad = getValueInCad(walletAtTime.btc_amount, currentDate, cadBtcExchangeRates);
          const ethValueInCad = getValueInCad(walletAtTime.eth_amount, currentDate, cadEthExchangeRates);

          netWorthPerDayFromFirstToLastTransaction.push({
            time: currentDate,
            value: btcValueInCad + ethValueInCad + walletAtTime.cad_amount
          });
        }

        setNetWorths(netWorthPerDayFromFirstToLastTransaction)
      });
  }, []);

  if (netWorths.length === 0 || cadBtcExchangeRates.length === 0 || cadEthExchangeRates.length === 0) {
    return (
      <div className='App'>
        Loading data...
      </div>
    );
  } else {
    let startingIndex: number;

    if (selectedTimeScale === 'past-month') {
      startingIndex = netWorths.length - 30;
    } else if (selectedTimeScale == 'past-year') {
      startingIndex = netWorths.length - 365;
    } else {
      startingIndex = 0;
    }

    return (
      <div className='App'>
        <Line data={{
          labels: netWorths.map(netWorth => new Date(netWorth.time).toLocaleDateString()).slice(startingIndex),
          datasets: [
            {
              label: 'net worth CAD',
              data: netWorths.map(netWorth => netWorth.value).slice(startingIndex)
            }
          ]
        }} />

        <button className={selectedTimeScale === 'all-time' ? 'outline-black' : ''} onClick={() => setSelectedTimeScale('all-time')}>All time</button>
        <button className={selectedTimeScale === 'past-year' ? 'outline-black' : ''} onClick={() => setSelectedTimeScale('past-year')}>Past Year</button>
        <button className={selectedTimeScale === 'past-month' ? 'outline-black' : ''} onClick={() => setSelectedTimeScale('past-month')}>Past Month</button>
      </div>
    )
  }
}

export default App;
