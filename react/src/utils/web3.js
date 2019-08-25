import Web3 from 'web3'
import Bip39 from 'bip39'
import HdKey from 'ethereumjs-wallet/hdkey'

let web3

export const getWeb3 = () => {
  return web3 || (window.web3 && new Web3(window.web3.currentProvider)) || (window.ethereum && new Web3(window.ethereum))
}

export const setProvider = async () => {
  let web3Provider

  if (window.ethereum) {
    web3Provider = window.ethereum
    await web3Provider.enable()
  } else if (window.web3) {
    web3Provider = window.web3.currentProvider
  }
  web3 = new Web3(web3Provider)
}

export const isEthAddress = (address) => {
  return getWeb3().utils.isAddress(address)
}

export const generateNewSafeOwners = (mnemonic) => {
  const owner1 = createAccountFromMnemonic(mnemonic, 0).getChecksumAddressString()
  const owner2 = createAccountFromMnemonic(mnemonic, 1).getChecksumAddressString()

  return [owner1, owner2]
}

export const createAccountFromMnemonic = (mnemonic, accountIndex) => {
  const seed = Bip39.mnemonicToSeed(mnemonic)
  const hdWallet = HdKey.fromMasterSeed(seed)
  const walletHdPath = "m/44'/60'/0'/0"
  const newAccount = hdWallet
    .derivePath(walletHdPath + '/' + accountIndex)
    .getWallet()

  return newAccount
}

setProvider()
