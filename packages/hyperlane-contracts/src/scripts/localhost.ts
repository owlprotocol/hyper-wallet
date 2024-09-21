import { Chain, createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "viem/chains";
import {
    encodeCallRemoteWithOverrides,
    getLocalInterchainAccount,
    getRemoteInterchainAccount,
} from "../InterchainAccountRouter.js";
import { defaultIsm as defaultIsmAbi } from "../artifacts/IMailbox.js";
import { domains } from "../artifacts/IRouter.js";

// Constants for local setup
const MAILBOX_ADDRESS_LOCALHOST = "0x12975173B87F7595EE45dFFb2Ab812ECE596Bf84";
const INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST = "0x29a79095352a718B3D7Fe84E1F14E9F34A35598e";
const ISM_ADDRESS_LOCALHOST = "0x05B4CB126885fb10464fdD12666FEb25E2563B76";

const localMainChain = { ...localhost, id: 31337 };
const localRemoteChain = {
    ...localhost,
    id: 31338,
    rpcUrls: { default: { http: ["http://127.0.0.1:8546"] } },
} as Chain;

const localMainClient = createPublicClient({
    chain: localMainChain,
    transport: http(),
});

const localRemoteClient = createPublicClient({
    chain: localRemoteChain,
    transport: http(),
});

const localMainWalletClient = createWalletClient({
    chain: localMainChain,
    transport: http(),
    //anvil
    account: privateKeyToAccount("0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"),
});

// Get the interchain account address from the main chain using its owner
const interchainAccountFromMain = await getRemoteInterchainAccount({
    publicClient: localMainClient,
    router: INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST,
    owner: localMainWalletClient.account.address,
    ism: ISM_ADDRESS_LOCALHOST,
});

// Get interchain account address from the remote chain using the owner & origin
const interchainAccountFromRemote = await getLocalInterchainAccount({
    publicClient: localRemoteClient,
    origin: localMainChain.id,
    router: INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST,
    owner: localMainWalletClient.account.address,
    ism: ISM_ADDRESS_LOCALHOST,
});

//should be the same
console.debug({ interchainAccountFromMain, interchainAccountFromRemote });

// get default ISM
const defaultIsm = await localRemoteClient.readContract({
    address: MAILBOX_ADDRESS_LOCALHOST,
    abi: [defaultIsmAbi],
    functionName: "defaultIsm",
});

// we test out a simple read call from the interchain account
const calls = [
    {
        to: INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST,
        data: encodeFunctionData({
            abi: [domains],
            functionName: "domains",
        }),
    } as const,
];

// call remote data
const callRemoteData = encodeCallRemoteWithOverrides({
    destination: localRemoteChain.id,
    router: INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST,
    ism: defaultIsm,
    calls,
});

//execute
const hash = await localMainWalletClient.sendTransaction({
    to: INTERCHAIN_ACCOUNT_ROUTER_ADDRESS_LOCALHOST,
    data: callRemoteData,
});

console.debug({ hash });
const receipt = await localMainClient.waitForTransactionReceipt({ hash });
console.debug({ receipt });
