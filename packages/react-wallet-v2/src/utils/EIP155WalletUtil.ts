import EIP155ViemLib from '@/lib/EIP155ViemLib'
import { smartAccountWallets } from './SmartAccountUtil'
import { getWalletAddressFromParams } from './HelperUtil'
import SettingsStore from '@/store/SettingsStore'

export let wallet1: EIP155ViemLib
export let wallet2: EIP155ViemLib
export let eip155Wallets: Record<string, EIP155ViemLib>
export let eip155Addresses: string[]

let address1: string
let address2: string

/**
 * Utilities
 */
export function createOrRestoreEIP155Wallet() {
  const mnemonic1 = localStorage.getItem('EIP155_MNEMONIC_1')
  const mnemonic2 = localStorage.getItem('EIP155_MNEMONIC_2')

  if (mnemonic1 && mnemonic2) {
    wallet1 = EIP155ViemLib.init({ mnemonicArg: mnemonic1 })
    wallet2 = EIP155ViemLib.init({ mnemonicArg: mnemonic2 })
  } else {
    wallet1 = EIP155ViemLib.init({})
    wallet2 = EIP155ViemLib.init({})

    // Don't store mnemonic in local storage in a production project!
    localStorage.setItem('EIP155_MNEMONIC_1', wallet1.getMnemonic())
    localStorage.setItem('EIP155_MNEMONIC_2', wallet2.getMnemonic())
  }

  address1 = wallet1.getAddress()
  address2 = wallet2.getAddress()

  eip155Wallets = {
    [address1]: wallet1,
    [address2]: wallet2
  }
  eip155Addresses = Object.keys(eip155Wallets)

  return {
    eip155Wallets,
    eip155Addresses
  }
}

//TODO: Get wallet, EOA returns EIP155Lib which is similar to a viem account with various functions like getAddress, signTransaction etc...
/**
 * Get wallet for the address in params
 */
export const getWallet = async (params: any) => {
  const eoaWallet = eip155Wallets[getWalletAddressFromParams(eip155Addresses, params)]

  if (eoaWallet) {
    return eoaWallet
  }

  /**
   * Smart accounts
   */
  const chainId = params?.chainId?.split(':')[1]
  console.log('Chain ID', { chainId })
  console.log('PARAMS', { params })

  const address = getWalletAddressFromParams(
    Object.keys(smartAccountWallets)
      .filter(key => {
        const parts = key.split(':')
        return parts[0] === chainId
      })
      .map(key => {
        return key.split(':')[1]
      }),
    params
  )
  if (!address) {
    console.log('Library not initialized for requested address', {
      address,
      values: Object.keys(smartAccountWallets)
    })
    throw new Error('Library not initialized for requested address')
  }
  const lib = smartAccountWallets[`${chainId}:${address}`]
  if (lib) {
    return lib
  }
  console.log('Library not found', {
    target: `${chainId}:address`,
    values: Object.keys(smartAccountWallets)
  })
  throw new Error('Cannot find wallet for requested address')
}
