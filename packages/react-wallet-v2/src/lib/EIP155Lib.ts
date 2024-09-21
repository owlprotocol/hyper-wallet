import { providers, Wallet } from 'ethers'

/**
 * Types
 */
interface IInitArgs {
  mnemonic?: string
}
export interface EIP155Wallet {
  getMnemonic(): string
  getPrivateKey(): string
  getAddress(): string
  signMessage(message: string): Promise<string>
  _signTypedData(domain: any, types: any, data: any, _primaryType?: string): Promise<string>
  connect(provider: providers.JsonRpcProvider): Wallet
  signTransaction(transaction: providers.TransactionRequest): Promise<string>
}

//TODO: Wallet (signer) class, need to convert a viem walletClient to something with a similar interface
//TODO: Instead of taking an ethers Wallet in the constructor, it should take a viem Account
// you can create a viem Account from a mnemonic using https://viem.sh/docs/accounts/local/mnemonicToAccount
// the connect() function is important as unlike ethers, viem decouples accounts from wallets (connected to chain)
// - connect() should keep track internally of the ethers provider
// - the provider can then be used to get the necessary chainId for operations like signTransaction

/**
 * Library
 */
export default class EIP155Lib implements EIP155Wallet {
  wallet: Wallet

  constructor(wallet: Wallet) {
    this.wallet = wallet
  }

  static init({ mnemonic }: IInitArgs) {
    const wallet = mnemonic ? Wallet.fromMnemonic(mnemonic) : Wallet.createRandom()

    return new EIP155Lib(wallet)
  }

  getMnemonic() {
    return this.wallet.mnemonic.phrase
  }

  getPrivateKey() {
    return this.wallet.privateKey
  }

  getAddress() {
    return this.wallet.address
  }

  signMessage(message: string) {
    return this.wallet.signMessage(message)
  }

  _signTypedData(domain: any, types: any, data: any, _primaryType?: string) {
    return this.wallet._signTypedData(domain, types, data)
  }

  connect(provider: providers.JsonRpcProvider) {
    return this.wallet.connect(provider)
  }

  signTransaction(transaction: providers.TransactionRequest) {
    return this.wallet.signTransaction(transaction)
  }
}
