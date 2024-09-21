import { createWalletClient, http, WalletClient, HDAccount, custom } from 'viem'
import { english, generateMnemonic } from 'viem/accounts'
import { mnemonicToAccount, hdKeyToAccount } from 'viem/accounts'
import { sepolia, scrollSepolia, bscTestnet, baseSepolia, optimismGoerli } from 'viem/chains'
import { providers } from 'ethers'
import { Chain } from 'viem'
import SettingsStore from '@/store/SettingsStore'
import { subscribeKey } from 'valtio/utils'

interface IInitArgs {
    mnemonicArg?: string
}

export interface EIP155ViemWallet {
    getMnemonic(): string
    getPrivateKey(): string
    getAddress(): string
    signMessage(message: string): Promise<string>
    _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
    connect(provider: providers.JsonRpcProvider): Promise<EIP155ViemWallet>
    signTransaction(transaction: providers.TransactionRequest): Promise<string>
}

export default class EIP155ViemLib implements EIP155ViemWallet {
    account: HDAccount
    mnemonic: string
    provider?: providers.JsonRpcProvider
    address?: string
    chain?: Chain

    constructor(mnemonic: string, account: HDAccount) {
        this.mnemonic = mnemonic
        this.account = account

        // default
        this.chain = optimismGoerli

        subscribeKey(SettingsStore.state, 'activeChainId', (eip155chainId) => {
            this.setChain(parseInt(eip155chainId.split(':')[1]));
        })

    }

    static init({ mnemonicArg }: IInitArgs) {
        const mnemonic = mnemonicArg || generateMnemonic(english)

        const account = mnemonicToAccount(mnemonic)

        return new EIP155ViemLib(mnemonic, account)
    }

    getMnemonic() {
        return this.mnemonic;
    }

    getPrivateKey() {
        // Only used for smartAccounts
        throw new Error('EIP155 - getPrivateKey');
        return '';
    }

    getAddress() {
        return this.account.address;
    }

    signMessage(message: string) {

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        return wallet.signMessage({
            message
        })
    }

    //@ts-expect-error
    _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
        throw new Error("Unsupported EIP155Lib._signTypedData")
        /*
        const primaryType = _primaryType ?? types[0];

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        return wallet.signTypedData({ account: this.account, domain, types, primaryType, message: data })
        */
    }

    setChain(chainId: number) {
        switch (chainId) {

            case 11155111:
                this.chain = sepolia;
                break;

            case 97:
                this.chain = bscTestnet;
                break;

            case 534351:
                this.chain = scrollSepolia;
                break;

            case 84532:
                this.chain = baseSepolia;
                break;

            case 420:
                this.chain = optimismGoerli;
                break;

            default:
                throw new Error(`connect provider's chainId: ${chainId} not supported`);
        }

    }

    //@ts-expect-error
    async connect(provider: providers.JsonRpcProvider) {
        throw new Error("Unsupported EIP155Lib.connect()")
    }

    async signTransaction(transaction: providers.TransactionRequest) {
        console.debug("Signing transaction");
        console.debug(transaction)
        //@ts-expect-error
        return this.account.signTransaction(transaction)
    }

    async sendTransaction(tx: any) {
        throw new Error("Unsupported EIP155Lib.sendTransaction()")
        console.log('sendTransaction', tx);

        const wallet = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });

        /*
        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http()
        });

        const gasPrice = await publicClient.getGasPrice();

        console.log('gasPrice', gasPrice);

        const finalTx = {
            from: tx.from as `0x${string}`,
            to: tx.to as `0x${string}`,
            data: tx.data,
            value: tx.value,
            // gasPrice,
            // maxFeePerGas: feeData.maxFeePerGas,
            // maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        };

        console.log(finalTx);
        */

        return wallet.sendTransaction(tx);
    }
} 