/*
import { getWeb3 } from '../../utils/web3'

export const composeValidators = (...validators: Function[]) => (value: Field) => {
  return validators.reduce((error, validator) => error || validator(value), undefined)
}

export const mustBeEthereumAddress = (address) => {
  const isAddress: boolean = getWeb3().utils.isAddress(address)
  return isAddress ? undefined : 'Address should be a valid Ethereum address'
}
*/