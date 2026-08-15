export type BusinessProfileAccount = {
  id: string;
  name: string;
  accountName?: string;
};

export type BusinessProfileLocation = {
  id: string;
  accountId: string;
  name: string;
  storeCode?: string;
  isVerified?: boolean;
};
