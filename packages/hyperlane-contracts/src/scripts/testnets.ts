import { Address, createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet, plumeTestnet } from "viem/chains";
import { GithubRegistry } from "@hyperlane-xyz/registry";
import {
    encodeCallRemoteWithOverrides,
    getLocalInterchainAccount,
    getRemoteInterchainAccount,
    quoteGasPayment,
} from "../InterchainAccountRouter.js";
import { defaultIsm as defaultIsmAbi } from "../artifacts/IMailbox.js";
import { domains } from "../artifacts/IRouter.js";

interface InterchainAddresses {
    mailbox: Address;
    interchainAccountIsm: Address;
    interchainAccountRouter: Address;
}

const bscTestnetClient = createPublicClient({
    chain: bscTestnet,
    transport: http(),
});

const plumeTestnetClient = createPublicClient({
    chain: plumeTestnet,
    transport: http(),
});

const bscTestnetWalletClient = createWalletClient({
    chain: bscTestnet,
    transport: http(),
    //anvil
    account: privateKeyToAccount("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"),
});

const PROXY_DEPLOYED_URL = "https://proxy.hyperlane.xyz";
export async function getInterchainChainAddresses(chainName: string) {
    const registry = new GithubRegistry({
        proxyUrl: PROXY_DEPLOYED_URL,
    });

    const addresses = await registry.getChainAddresses(chainName);
    if (!addresses) throw new Error(`${chainName} addresses not found`);

    if (!addresses["mailbox"] || addresses["interchainAccountIsm"] || addresses["interchainAccountRouter"]) {
        throw new Error(`${chainName} not supported`);
    }

    return addresses as any as InterchainAddresses;
}

async function main() {
    const bscTestnetAddresses = await getInterchainChainAddresses("bsctestnet");
    const plumeTestnetAddresses = await getInterchainChainAddresses("plumetestnet");

    // Get the interchain account address from the main chain using its owner
    const interchainAccountFromMain = await getRemoteInterchainAccount({
        publicClient: bscTestnetClient,
        remoteRouter: plumeTestnetAddresses.interchainAccountRouter,
        remoteIsm: plumeTestnetAddresses.interchainAccountIsm,
        mainRouter: bscTestnetAddresses.interchainAccountRouter,
        owner: bscTestnetWalletClient.account.address,
    });

    // Get interchain account address from the remote chain using the owner & origin
    const interchainAccountFromRemote = await getLocalInterchainAccount({
        publicClient: plumeTestnetClient,
        origin: bscTestnet.id,
        router: bscTestnetAddresses.interchainAccountRouter,
        owner: bscTestnetWalletClient.account.address,
        ism: bscTestnetAddresses.interchainAccountIsm,
    });

    //should be the same
    console.debug({ interchainAccountFromMain, interchainAccountFromRemote });

    // get default ISM
    const defaultIsm = await plumeTestnetClient.readContract({
        address: plumeTestnetAddresses.mailbox,
        abi: [defaultIsmAbi],
        functionName: "defaultIsm",
    });

    // we test out a simple read call from the interchain account
    const calls = [
        {
            to: plumeTestnetAddresses.interchainAccountRouter,
            data: encodeFunctionData({
                abi: [domains],
                functionName: "domains",
            }),
        } as const,
    ];

    // call remote data
    const callRemoteData = encodeCallRemoteWithOverrides({
        destination: plumeTestnet.id,
        router: bscTestnetAddresses.interchainAccountRouter,
        ism: defaultIsm,
        calls,
    });

    const gasQuote = await quoteGasPayment({
        publicClient: bscTestnetClient,
        destination: plumeTestnet.id,
        gasLimit: 100000000000000n,
        router: bscTestnetAddresses.interchainAccountRouter,
    });

    // 130%
    const gasQuoteOverestimate = (gasQuote * 130n) / 10n;

    //execute
    const hash = await bscTestnetWalletClient.sendTransaction({
        to: bscTestnetAddresses.interchainAccountRouter,
        data: callRemoteData,
        value: gasQuoteOverestimate,
    });

    console.debug({ hash });
    const receipt = await bscTestnetClient.waitForTransactionReceipt({ hash });
    console.debug({ receipt });
}

main();
