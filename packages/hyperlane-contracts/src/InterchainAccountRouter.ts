import { Address, encodeFunctionData, Hex, padHex, PublicClient } from "viem";
import {
    getRemoteInterchainAccount_address_address_address as getRemoteInterchainAccountAbi,
    getLocalInterchainAccount_uint32_bytes32_bytes32_address as getLocalInterchainAccountAbi,
    callRemoteWithOverrides as callRemoteWithOverridesAbi,
} from "./artifacts/InterchainAccountRouter.js";

export interface GetRemoteInterchainAccountParams {
    publicClient: PublicClient;
    router: Address;
    owner: Address;
    ism: Address;
}

//TODO: Implement synchronous CREATE2 based version
export async function getRemoteInterchainAccount(params: GetRemoteInterchainAccountParams): Promise<Address> {
    const { publicClient, router, owner, ism } = params;
    return publicClient.readContract({
        address: router,
        abi: [getRemoteInterchainAccountAbi],
        functionName: "getRemoteInterchainAccount",
        args: [owner, router, ism],
    });
}

export interface GetLocalInterchainAccountParams {
    publicClient: PublicClient;
    origin: number;
    router: Address;
    owner: Address;
    ism: Address;
}

//TODO: Implement synchronous CREATE2 based version
export async function getLocalInterchainAccount(params: GetLocalInterchainAccountParams): Promise<Address> {
    const { publicClient, router, owner, ism, origin } = params;

    const ownerBytes32 = padHex(owner, { size: 32 });
    const routerBytes32 = padHex(router, { size: 32 });

    return publicClient.readContract({
        address: router,
        abi: [getLocalInterchainAccountAbi],
        functionName: "getLocalInterchainAccount",
        args: [origin, ownerBytes32, routerBytes32, ism],
    });
}

export interface EncodeCallRemoteWithOverridesParams {
    destination: number;
    router: Address;
    ism: Address;
    calls: { to: Address; value?: bigint; data: Hex }[];
}

/**
 * Encode `callRemoteWithOverrides` call
 * @param params
 * @returns data
 */
export function encodeCallRemoteWithOverrides(params: EncodeCallRemoteWithOverridesParams): Hex {
    const { destination, router, ism, calls } = params;

    const routerBytes32 = padHex(router, { size: 32 });
    const ismBytes32 = padHex(ism, { size: 32 });

    return encodeFunctionData({
        abi: [callRemoteWithOverridesAbi],
        functionName: "callRemoteWithOverrides",
        args: [
            destination,
            routerBytes32,
            ismBytes32,
            calls.map((c) => {
                return {
                    to: padHex(c.to, { size: 32 }),
                    value: c.value ?? 0n,
                    data: c.data,
                };
            }),
        ],
    });
}
