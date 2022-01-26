import { Currency } from "../App";
import { ConversionTransaction } from "./conversionTransaction";
import { PaymentTransaction } from "./paymentTransaction";

export enum TransactionType {
  ExternalAccount = 'external account',
  Peer = 'peer',
  Conversion = 'conversion'
}

export enum TransationDirection {
  Credit = 'credit',
  Debit = 'debit'
}


export interface TransactionParams {
  createdAt: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  direction: TransationDirection | null;
  from: {
    currency: Currency;
    amount: number;
  }
  to: {
    currency: Currency;
    amount: number;
  } | {
    toAddress: string;
  }
}

export class Transaction {
  public static sortByCreatedAt(transactions: Array<ConversionTransaction | PaymentTransaction>): Array<ConversionTransaction | PaymentTransaction> {
    return transactions.sort((a, b) => a.getCreatedAt().getTime() - b.getCreatedAt().getTime());
  }

  private _createdAt: string;
  private _createdAtCached: Date | null;
  readonly amount: number;
  readonly currency: Currency;
  readonly type: TransactionType;
  readonly direction: TransationDirection | null;

  constructor(params: TransactionParams) {
    this._createdAt = params.createdAt;
    this._createdAtCached = null;
    this.amount = params.amount;
    this.currency = params.currency;
    this.type = params.type;
    this.direction = params.direction;
  }

  public isCredit(): boolean {
    if (this.direction === TransationDirection.Credit) {
      return true;
    } else {
      return false;
    }
  }

  public isDebit(): boolean {
    if (this.direction === TransationDirection.Debit) {
      return true;
    } else {
      return false;
    }
  }

  public getCreatedAt(): Date {
    if (this._createdAtCached === null) {
      this._createdAtCached = new Date(this._createdAt);
    } 

    return new Date(this._createdAtCached);
  }
}