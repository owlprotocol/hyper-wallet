/* eslint-disable @typescript-eslint/no-unused-vars */
import { Account, Address, Client, Hex } from "viem";
import { toAccount } from "viem/accounts";
import { encodeCallRemoteWithOverrides, EncodeCallRemoteWithOverridesParams } from "../InterchainAccountRouter.js";

export type ToInterchainAccountParameters = {
    /** Same chain as the account */
    // client: Client;
    /** Address */
    address: Address;
    /** Compute Address */
    // origin?: number;
    // router?: Address;
    // owner: Address;
    // ism: Address;
};

export async function toInterchainAccount(parameters: ToInterchainAccountParameters): Promise<Account> {
    const { client, address } = parameters;

    //TODO: Support optional address
    const accountAddress = address;
    /*
    let accountAddress: Address | undefined = address;

    if (!accountAddress) {
        //TODO: Add defaults if origin specified?
        if (!origin || !owner || !router || !ism) {
            throw new Error("No address: origin, owner, router, ism MUST be defined to compute");
        }
        //TODO: Use getAction to support extending the client with custom implementation
        accountAddress = await getLocalInterchainAccount(client, { origin, owner, router, ism });
    }
        */

    return toAccount({
        address: accountAddress,

        async signMessage({ message }) {
            throw new Error("Unsupported");
        },

        async signTransaction(transaction, { serializer }) {
            throw new Error("Unsupported");
        },

        async signTypedData(typedData) {
            throw new Error("Unsupported");
        },

        async encodeCalls(params: EncodeCallRemoteWithOverridesParams) {
            return encodeCallRemoteWithOverrides(params);
        },
    });
}
