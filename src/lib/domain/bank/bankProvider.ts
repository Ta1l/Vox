import { parseCsv, type ImportedTransactionRow } from "@/lib/domain/imports/transactionImportService";

/** Adapter boundary: providers return normalized raw rows and never write financial records. */
export interface BankProvider {
  readonly providerName: string;
  fetchTransactions(): Promise<ImportedTransactionRow[]>;
}

export class CsvProvider implements BankProvider {
  readonly providerName = "csv";
  constructor(private readonly csv: string) {}
  async fetchTransactions() { return parseCsv(this.csv); }
}

export class ManualProvider implements BankProvider {
  readonly providerName = "manual";
  constructor(private readonly rows: ImportedTransactionRow[]) {}
  async fetchTransactions() { return this.rows.map((row) => ({ ...row })); }
}
