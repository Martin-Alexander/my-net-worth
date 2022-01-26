import { Currency } from "../App";
import { Transaction, TransactionParams } from "./transaction";

export class ConversionTransaction extends Transaction {
  readonly from: {
    currency: Currency;
    amount: number;
  }
  readonly to: {
    currency: Currency;
    amount: number;
  }

  constructor(params: TransactionParams) {
    super(params);

    this.from = params.from;
    this.to = params.to as { currency: Currency; amount: number; };
  }

  public isConversion(): this is ConversionTransaction {
    return true;
  }
}