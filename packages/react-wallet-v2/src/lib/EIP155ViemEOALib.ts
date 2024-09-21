import { createWalletClient, custom, Account, Address } from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount } from 'viem/accounts'
import { providers, Wallet } from 'ethers'
import { EIP155Wallet } from './EIP155Lib'
import { TransactionRequest, TransactionResponse } from '@ethersproject/providers'

interface IInitArgs {
    mnemonicArg?: string
}

/**
 * Library
 */
export default class EIP155ViemLib implements EIP155Wallet {
    mnemonic: string
    account: Account

    constructor(mnemonic: string) {
        this.mnemonic = mnemonic;
        this.account = mnemonicToAccount(mnemonic);
    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)
        return new EIP155ViemLib(mnemonic)
    }

    getMnemonic(): string {
        return this.mnemonic
    }

    getPrivateKey(): string {
        throw new Error("Unsupported getPrivateKey")
    }

    getAddress(): string {
        return this.account.address;
    }

    signMessage(message: string): Promise<string> {
        throw new Error("Unsupported signMessage()")
    }

    _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string> {
        throw new Error("Unsupported _signTypedData()")
    }

    connect(provider: providers.JsonRpcProvider): Wallet {
        const request = function request({ method, params }: { method: string, params?: any[] }) {
            return provider.send(method, params ?? [])
        }
        const transport = custom({ request })

        const walletClient = createWalletClient({
            account: this.account,
            transport
        })

        const mockWallet = {
            async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
                const hash = await walletClient.sendTransaction({
                    to: transaction.to as Address | undefined,
                    //@ts-expect-error
                    value: transaction.value ? BigInt(transaction.value) : 0n,
                    chain: null
                })
                //@ts-expect-error
                return {
                    from: walletClient.account.address,
                    hash
                }
            }
        } as Pick<Wallet, "sendTransaction">

        return mockWallet as Wallet;
    }

    signTransaction(transaction: providers.TransactionRequest): Promise<string> {
        throw new Error("Unsupported signTransaction()")
    }
}