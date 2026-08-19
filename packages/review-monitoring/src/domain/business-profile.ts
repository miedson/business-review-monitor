export type BusinessProfileAccount = {
  id: string;
  name: string;
  username: string;
  accountName?: string;
};

export type BusinessProfileLocation = {
  id: string;
  accountId: string;
  name: string;
  storeCode?: string;
  isVerified?: boolean;
};
