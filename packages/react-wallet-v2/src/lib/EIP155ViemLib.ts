import {
    createWalletClient,
    custom,
    Account,
    Address,
    WalletClient,
    Transport,
    http,
    createPublicClient,
    zeroAddress,
    Chain,
    PublicClient,
    Hex
} from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount } from 'viem/accounts'
import { providers, Wallet } from 'ethers'
import {
    getLocalInterchainAccount,
    getRemoteInterchainAccount,
    InterchainAccount,
    sendTransaction,
    writeContract
} from '@owlprotocol/hyperlane-contracts'
import { EIP155Wallet } from './EIP155Lib'
import { TransactionRequest, TransactionResponse } from '@ethersproject/providers'
import { bscTestnet, scrollSepolia } from 'viem/chains'

interface IInitArgs {
    mnemonicArg?: string
}

const origin = bscTestnet
const originChainName = 'bsctestnet'

const remote = scrollSepolia
const remoteChainName = 'scrollsepolia'

const originAddresses = {
    mailbox: '0xF9F6F5646F478d5ab4e20B0F910C92F1CCC9Cc6D',
    interchainAccountIsm: '0xa9D8Ec959F34272B1a56D09AF00eeee58970d3AE',
    interchainAccountRouter: '0x6d2B3e304E58c2a19f1492E7cf15CaF63Ce6e0d2'
} as const

const remoteAddresses = {
    mailbox: '0x3C5154a193D6e2955650f9305c8d80c18C814A68',
    interchainAccountIsm: '0xE023239c8dfc172FF008D8087E7442d3eBEd9350',
    interchainAccountRouter: '0xe17c37212d785760E8331D4A4395B17b34Ba8cDF'
} as const

interface InterchainAddresses {
    mailbox: Address
    interchainAccountIsm: Address
    interchainAccountRouter: Address
}

/**
 * Library
 */
export default class EIP155ViemLib implements EIP155Wallet {
    mnemonic: string
    account: Account
    originWalletClient: WalletClient<Transport, Chain, Account>
    originPublicClient: PublicClient<Transport, Chain>

    constructor(mnemonic: string) {
        this.mnemonic = mnemonic
        this.account = mnemonicToAccount(mnemonic)

        this.originWalletClient = createWalletClient({
            chain: origin,
            transport: http(),
            account: this.account
        })

        this.originPublicClient = createPublicClient({
            chain: origin,
            transport: http(),
        })
    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)
        return new EIP155ViemLib(mnemonic)
    }

    getMnemonic(): string {
        return this.mnemonic
    }

    getPrivateKey(): string {
        throw new Error('Unsupported getPrivateKey')
    }

    getAddress(): string {
        return this.account.address
    }

    async getIcaAddress(): Promise<Address> {
        const icaAddress = await getRemoteInterchainAccount({
            publicClient: this.originPublicClient as any,
            mainRouter: originAddresses.interchainAccountRouter,
            owner: this.originWalletClient.account.address,
            remoteIsm: remoteAddresses.interchainAccountIsm,
            remoteRouter: remoteAddresses.interchainAccountRouter
        })
        return icaAddress;
    }

    signMessage(message: string): Promise<string> {
        throw new Error('Unsupported signMessage()')
    }

    _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string> {
        throw new Error('Unsupported _signTypedData()')
    }

    connect(provider: providers.JsonRpcProvider): Wallet {
        const request = function request({ method, params }: { method: string; params?: any[] }) {
            return provider.send(method, params ?? [])
        }
        const transport = custom({ request })

        const remoteClient = createPublicClient({
            transport
        })

        const originWalletClient = this.originWalletClient

        const mockWallet = {
            async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
                const icaAddress = await getLocalInterchainAccount({
                    publicClient: remoteClient as any,
                    origin: origin.id,
                    router: remoteAddresses.interchainAccountRouter,
                    owner: originWalletClient.account.address,
                    ism: remoteAddresses.interchainAccountIsm
                })

                const ica: InterchainAccount = {
                    address: icaAddress,
                    router: remoteAddresses.interchainAccountRouter,
                    ism: zeroAddress,
                    originClient: originWalletClient,
                    originRouter: originAddresses.interchainAccountRouter
                } as any

                //the remote wallet client
                const remoteWalletClient = createWalletClient({
                    chain: remote,
                    transport,
                    account: ica as Account
                }).extend(client => {
                    return {
                        // @ts-expect-error
                        sendTransaction: params => sendTransaction(client, params),
                        // @ts-expect-error
                        writeContract: params => writeContract(client, params)
                    }
                }) as unknown as WalletClient<Transport, Chain, Account>

                const hash = await remoteWalletClient.sendTransaction({
                    to: transaction.to as Address | undefined,
                    //@ts-expect-error
                    value: transaction.value ? BigInt(transaction.value) : 0n,
                    data: transaction.data as Hex | undefined,
                    chain: null
                })
                //@ts-expect-error
                return {
                    from: ica.address,
                    hash
                }
            }
        } as Pick<Wallet, 'sendTransaction'>

        return mockWallet as Wallet
    }

    signTransaction(transaction: providers.TransactionRequest): Promise<string> {
        throw new Error('Unsupported signTransaction()')
    }
}

