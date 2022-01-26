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
import { Transaction, TransactionParams, TransactionType } from './records/transaction';
import { PaymentTransaction } from './records/paymentTransaction';
import { ConversionTransaction } from './records/conversionTransaction';

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

interface NetWorthChange {
  value: number;
  time: Date;
}

interface NetWorthDay {
  value: number;
  time: Date;
}

interface ExchangeRate {
  pair: 'CAD_BTC';
  midMarketRate: number;
  createdAt: string;
}

const exchangeRates = {
  CAD_BTC: 0.00002151,
  BTC_CAD: 46472.34,
  CAD_ETH: 0.000324136057692875,
  ETH_CAD: 3085.12,
  USD_BTC: 0.00002716,
  BTC_USD: 36810.04,
  USD_ETH: 0.000409233117599274,
  ETH_USD: 2443.59,
  BTC_ETH: 15.062509414068384,
  ETH_BTC: 0.06639,
  CAD_USD: 0.79,
  USD_CAD: 1.26
}

const oneDay = 86400000;

// lock this down edge cases
// Assumes dynamicExchangeRates is sorted by time
const getValueInCad = (amount: number, currency: Currency, time?: Date, dynamicExchangeRates?: ExchangeRate[]): number => {
  if (time && dynamicExchangeRates) {
    const firstDynamicExchangeRatesAfterTime = dynamicExchangeRates.find((dynamicExchangeRate) => {
      if (new Date(dynamicExchangeRate.createdAt) >= time) {
        return true;
      } else {
        return false;
      }
    });

    if (firstDynamicExchangeRatesAfterTime) {
      return amount * firstDynamicExchangeRatesAfterTime.midMarketRate;
    } else {
      return 0;
    }

  } else {
    switch(currency) {
      case Currency.BTC: return amount * exchangeRates.BTC_CAD;
      case Currency.ETH: return amount * exchangeRates.ETH_CAD;
      case Currency.CAD: return amount;
      default: return 0;
    }
  }
}

// More efficient algo possible
// Assumes netWorthChanges is sorted by time
const getNetWorthAtTime = (time: Date, netWorthChanges: NetWorthChange[]): number => {
  const firstNetWorthChangeAfterTime = netWorthChanges.find((networthChange) => {
    if (networthChange.time >= time) {
      return true;
    } else {
      return false;
    }
  });

  if (firstNetWorthChangeAfterTime) {
    return firstNetWorthChangeAfterTime.value;
  } else {
    return 0;
  }
}

function App() {
  const [netWorths, setNetWorths] = useState<NetWorthDay[]>([]);
  const [cadBtcExchangeRates, setCadBtcExchangeRates] = useState<ExchangeRate[]>([]);
  const [cadEthExchangeRates, setCadEthExchangeRates] = useState<ExchangeRate[]>([]);

  useEffect(() => {
    fetch('https://shakepay.github.io/programming-exercise/web/rates_CAD_BTC.json')
      .then(repsonse => repsonse.json())
      .then(setCadBtcExchangeRates);
  }, []);

  useEffect(() => {
    fetch('https://shakepay.github.io/programming-exercise/web/rates_CAD_ETH.json')
      .then(repsonse => repsonse.json())
      .then(setCadEthExchangeRates);
  }, []);

  const getHistoricalExchangeRate = (currency: Currency): ExchangeRate[] => {
    if (currency === Currency.BTC) {
      return cadBtcExchangeRates;
    } else if (currency === Currency.ETH) {
      return cadEthExchangeRates;
    } else {
      return [];
    }
  }

  useEffect(() => {
    fetch('https://shakepay.github.io/programming-exercise/web/transaction_history.json')
      .then(repsonse => repsonse.json())
      .then((data: TransactionParams[]) => {

        const transactions: Array<ConversionTransaction | PaymentTransaction> = Transaction.sortByCreatedAt(data.map((transactionParam) => {
          if (transactionParam.type === TransactionType.Conversion) {
            return new ConversionTransaction(transactionParam)
          } else {
            return new PaymentTransaction(transactionParam);
          }
        }));

        let currentNetWorthInCad: number = 0;

        const netWorthChanges: NetWorthChange[] = [];

        transactions.forEach((transaction) => {
          if (transaction.isConversion()) {
            const fromValue = getValueInCad(transaction.from.amount, transaction.from.currency);
            const toValue = getValueInCad(transaction.to.amount, transaction.to.currency);

            currentNetWorthInCad -= fromValue;
            currentNetWorthInCad += toValue;
          } else {
            if (transaction.isCredit()) {
              currentNetWorthInCad += getValueInCad(transaction.amount, transaction.currency);
            } else if (transaction.isDebit()) {
              currentNetWorthInCad -= getValueInCad(transaction.amount, transaction.currency);
            } else {
              throw new Error();
            }
          }

          netWorthChanges.push({
            value: currentNetWorthInCad,
            time: transaction.getCreatedAt()
          });
        });

        const dateOfFirstTransaction: Date = new Date(transactions[0].getCreatedAt());
        dateOfFirstTransaction.setHours(0, 0, 0, 0);
        const dateOfLastTransaction: Date = new Date(transactions[transactions.length - 1].getCreatedAt());

        const netWorthPerDayFromFirstToLastTransaction: NetWorthDay[] = [];

        for (let currentDate = dateOfFirstTransaction; currentDate < dateOfLastTransaction; currentDate = new Date(currentDate.getTime() + oneDay)) {
          const netWorth = getNetWorthAtTime(currentDate, netWorthChanges);

          netWorthPerDayFromFirstToLastTransaction.push({
            time: currentDate,
            value: netWorth
          });
        }

        setNetWorths(netWorthPerDayFromFirstToLastTransaction)
      });
  }, [])


  if (netWorths.length === 0 || cadBtcExchangeRates.length === 0 || cadEthExchangeRates.length === 0) {
    return (
      <div className='App'>
        Loading data...
      </div>
    );
  } else {
    return (
      <div className='App'>
        <Line data={{
          labels: netWorths.map(netWorth => new Date(netWorth.time).toLocaleDateString()),
          datasets: [
            {
              label: 'net worth CAD',
              data: netWorths.map(netWorth => netWorth.value)
            }
          ]
        }} />
      </div>
    )
  }
}

export default App;
