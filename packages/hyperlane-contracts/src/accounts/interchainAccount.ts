import { Account, Address, Client } from "viem";

export type InterchainAccount = Account<Address> & {
    originClient: Client;
    router: Address;
    remoteRouter: Address;
    remoteIsm: Address;
};
