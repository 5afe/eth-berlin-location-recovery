import React, { useState, useEffect } from 'react'
import Bip39 from 'bip39'
import EthUtil from 'ethereumjs-util'
import abi from 'ethereumjs-abi'
import { Redirect } from 'react-router-dom'
import { createQrImage } from '../../../../utils/qrCode'
import { generateNewSafeOwners } from '../../../../utils/web3'
import { safeRecoveryCall, getRecoveryModuleNonce } from '../../../../utils/contract'
import { HOME_URL } from '../../../../routes/routes'
import styles from './styles.module.css'

const MnemonicModal = ({ safeAddress, locations }) => {
  const MNEMONIC = 'mnemonic'
  const QRCODES = 'qrcodes'
  const FINISHED = 'finished'
  
  const [mnemonic, setMnemonic] = useState(Bip39.generateMnemonic())
  const [state, setState] = useState(MNEMONIC)

  const safeAddressQrCode = React.createRef()
  const mnemonicQrCode = React.createRef()

  const nextState = () => {
    if (state === MNEMONIC) {
      setState(QRCODES)
    } else if (state === QRCODES) {
      setState(FINISHED)
    }
  }

  useEffect(() => {
      createQrImage(safeAddressQrCode.current, safeAddress, 3)
      createQrImage(mnemonicQrCode.current, mnemonic, 3)
  }, [state])

  const submit = async () => {
    try {
      const [owner1, owner2] = generateNewSafeOwners(mnemonic)

      const hashedGeohashes = '0x' + locations.map(l =>
        Buffer.from(EthUtil.sha3(l.geohash)).toString('hex')
      ).sort().join('')

      // This is used as the private key to sign the message sent to the contract
      const hashedHashedGeohashes = EthUtil.sha3(hashedGeohashes)

      const recoveryModuleNonce = await getRecoveryModuleNonce(safeAddress)
      const data = abi.soliditySHA3(
        ["bytes1", "bytes1", "address[]", "uint256"],
        [0x19, 0x00, [owner1, owner2], recoveryModuleNonce]
      )

      const rsv = EthUtil.ecsign(data, hashedHashedGeohashes)

      await safeRecoveryCall(safeAddress, [owner1, owner2], rsv.r, rsv.s, rsv.v)

      nextState()
    } catch (err) {
      console.error(err)
    }
  }

  if (state === FINISHED) {
    return <Redirect to={HOME_URL} />
  }
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2>Recovery process</h2>
      </div>
      <div className={styles.content}>
        {state === MNEMONIC && (
          <React.Fragment>
            <p>Write down this seed phrase to later recover your funds in the Gnosis Safe app.</p>
            <div className={styles.mnemonic}>
              {mnemonic && mnemonic.split(' ').map(word => (
                <div className={styles.word}>{word}</div>
              ))}
            </div>
          </React.Fragment>
        )}
        {state === QRCODES && (
          <div className={styles.qrCodes}>
            <p>Scan the Safe address:</p>
            <div ref={safeAddressQrCode} className={styles.qrCode}></div>
            <p>Scan the mnemonic phrase:</p>
            <div ref={mnemonicQrCode} className={styles.qrCode}></div>
          </div>
        )}
      </div>
      <div className={styles.footer}>
        {state === MNEMONIC && (
          <button onClick={nextState} className={styles.button}>
            I have a copy
          </button>
        )}
        {state === QRCODES && (
          <button onClick={submit} className={styles.button}>
            Recover Wallet
          </button>
        )}
        
      </div>
    </div>
  )
}

export default MnemonicModal
