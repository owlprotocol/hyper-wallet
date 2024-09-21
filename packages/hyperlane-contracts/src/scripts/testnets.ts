import { Address, createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { scrollSepolia, bscTestnet } from "viem/chains";
import { GithubRegistry } from "@hyperlane-xyz/registry";
import {
    encodeCallRemoteWithOverrides,
    getLocalInterchainAccount,
    getRemoteInterchainAccount,
    quoteGasPayment,
} from "../InterchainAccountRouter.js";
import { defaultIsm as defaultIsmAbi } from "../artifacts/IMailbox.js";
import { domains } from "../artifacts/IRouter.js";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("Need PRIVATE_KEY");

interface InterchainAddresses {
    mailbox: Address;
    interchainAccountIsm: Address;
    interchainAccountRouter: Address;
}

const scrollSepoliaClient = createPublicClient({
    chain: scrollSepolia,
    transport: http(),
});

const bscTestnetClient = createPublicClient({
    chain: bscTestnet,
    transport: http(),
});

const scrollSepoliaWalletClient = createWalletClient({
    chain: scrollSepolia,
    transport: http(),
    //anvil
    account: privateKeyToAccount("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"),
});

const PROXY_DEPLOYED_URL = "https://proxy.hyperlane.xyz";
const registry = new GithubRegistry({
    proxyUrl: PROXY_DEPLOYED_URL,
});

export async function getInterchainChainAddresses(chainName: string) {
    const addresses = await registry.getChainAddresses(chainName);
    if (!addresses) throw new Error(`${chainName} addresses not found`);

    if (!addresses["mailbox"] || !addresses["interchainAccountIsm"] || !addresses["interchainAccountRouter"]) {
        console.log({ addresses });
        throw new Error(`${chainName} not supported`);
    }

    return addresses as any as InterchainAddresses;
}

async function main() {
    const scrollSepoliaAddresses = await getInterchainChainAddresses("scrollsepolia");
    const bscTestnetAddresses = await getInterchainChainAddresses("bsctestnet");

    // Get the interchain account address from the main chain using its owner
    const interchainAccountFromMain = await getRemoteInterchainAccount({
        publicClient: scrollSepoliaClient,
        remoteRouter: bscTestnetAddresses.interchainAccountRouter,
        remoteIsm: bscTestnetAddresses.interchainAccountIsm,
        mainRouter: scrollSepoliaAddresses.interchainAccountRouter,
        owner: scrollSepoliaWalletClient.account.address,
    });

    // Get interchain account address from the remote chain using the owner & origin
    const interchainAccountFromRemote = await getLocalInterchainAccount({
        publicClient: bscTestnetClient,
        origin: scrollSepolia.id,
        router: bscTestnetAddresses.interchainAccountRouter,
        owner: scrollSepoliaWalletClient.account.address,
        ism: bscTestnetAddresses.interchainAccountIsm,
    });

    //should be the same
    console.debug({ interchainAccountFromMain, interchainAccountFromRemote });

    // get default ISM
    const defaultIsm = await bscTestnetClient.readContract({
        address: bscTestnetAddresses.mailbox,
        abi: [defaultIsmAbi],
        functionName: "defaultIsm",
    });

    // we test out a simple read call from the interchain account
    const calls = [
        {
            to: bscTestnetAddresses.interchainAccountRouter,
            data: encodeFunctionData({
                abi: [domains],
                functionName: "domains",
            }),
        } as const,
    ];

    // call remote data
    const callRemoteData = encodeCallRemoteWithOverrides({
        destination: bscTestnet.id,
        router: scrollSepoliaAddresses.interchainAccountRouter,
        ism: defaultIsm,
        calls,
    });

    const remoteGasEstimate = await bscTestnetClient.estimateGas(calls[0]);

    console.log({ remoteGasEstimate });

    const gasQuote = await quoteGasPayment({
        publicClient: scrollSepoliaClient,
        destination: bscTestnet.id,
        gasLimit: remoteGasEstimate,
        router: scrollSepoliaAddresses.interchainAccountRouter,
    });

    console.log({ gasQuote });

    // 130%
    const gasQuoteOverestimate = (gasQuote * 13n) / 10n;
    //
    // //execute
    const hash = await scrollSepoliaWalletClient.sendTransaction({
        to: scrollSepoliaAddresses.interchainAccountRouter,
        data: callRemoteData,
        value: gasQuoteOverestimate,
    });

    console.debug({ hash });
    const receipt = await scrollSepoliaClient.waitForTransactionReceipt({ hash });
    console.debug({ receipt });
}

main();
