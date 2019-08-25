import TruffleContract from 'truffle-contract'
import Web3 from 'web3'
import GnosisSafe from '../contracts/GnosisSafe.json'
import RecoveryModule from '../contracts/RecoveryModule.json'
import { getWeb3 } from './web3'

export const safeRecoveryCall = async (safeAddress, recoveryOwners, r, s, v) => {
  // This contract doexn't executes a transaction, just a call
  const safeContract = TruffleContract(GnosisSafe)
  const provider = new Web3.providers.HttpProvider(
    'https://rinkeby.infura.io/v3/' + process.env.REACT_APP_INFURA_PROJECT_ID
  )
  safeContract.setProvider(provider)

  // This contract executes a transaction
  const recoveryModuleContract = TruffleContract(RecoveryModule)
  const web3Provider = getWeb3().currentProvider
  recoveryModuleContract.setProvider(web3Provider)

  try {
    const instance = await safeContract.at(safeAddress)
    const modules = await instance.getModules.call()
    const recoveryModuleAddress = modules[0]
    console.log('moduleAddress', recoveryModuleAddress)
    
    const instance2 = await recoveryModuleContract.at(recoveryModuleAddress)
    const from = (await getWeb3().eth.getAccounts())[0]
    const result = await instance2.triggerAndExecuteRecoveryWithoutDelay(r, s, v, recoveryOwners, { from })

    console.log('result:', result)
  } catch (err) {
    console.error(err)
  }
}

export const getRecoveryModuleNonce = async (safeAddress) => {
  // This contract doexn't executes a transaction, just a call
  const safeContract = TruffleContract(GnosisSafe)
  const provider = new Web3.providers.HttpProvider(
    'https://rinkeby.infura.io/v3/' + process.env.REACT_APP_INFURA_PROJECT_ID
  )
  safeContract.setProvider(provider)

  // This contract executes a transaction
  const recoveryModuleContract = TruffleContract(RecoveryModule)
  const web3Provider = getWeb3().currentProvider
  recoveryModuleContract.setProvider(web3Provider)

  try {
    const instance = await safeContract.at(safeAddress)
    const modules = await instance.getModules.call()
    const recoveryModuleAddress = modules[0]

    const instance2 = await recoveryModuleContract.at(recoveryModuleAddress)
    const nonce = await instance2.nonce()
    console.log('nonce', nonce, recoveryModuleAddress)
    return nonce.toString()
  } catch (err) {
    console.error(err)
  }
}
