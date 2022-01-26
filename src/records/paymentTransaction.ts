import { ConversionTransaction } from "./conversionTransaction";
import { Transaction, TransactionParams } from "./transaction";

export class PaymentTransaction extends Transaction {
  readonly to?: {
    address?: string;
  }

  readonly from?: {}

  constructor(params: TransactionParams) {
    super(params);

    this.to = params.to as { address?: string; };
  }

  public isConversion(): this is ConversionTransaction {
    return false;
  }
}