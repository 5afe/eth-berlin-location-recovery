import React, { useState, useEffect } from 'react'
import { setupMap } from './mapUtils'
import Modal from '../../components/Modal'
import MnemonicModal from './components/MnemonicModal'
import greenEarth from '../../assets/green_earth.png'
import Blockie from '../../components/Blockie'
import styles from './styles.module.css'

const Recover = (props) => {
  const [locations, setLocations] = useState([])
  const [showMnemonicModal, setShowMnemonicModal] = useState(false)

  let listener
  const mapRef = React.createRef()
  const safeAddress = props.history.location.state.safeAddress
  
  useEffect(() => {
    startListener()
    setupMap(mapRef.current)

    return () => clearInterval(listener)
  }, [])

  const startListener = () => {
    // SHOULD USE REDUX HERE INSTEAD OF WINDOW
    listener = setInterval(() => {
      if (window.point) {
        setLocations(oldLocations => [...oldLocations, window.point])
        delete window.point
      }
    }, 500);
  }

  const toggleMnemonicModal = () => {
    setShowMnemonicModal(!showMnemonicModal)
  }

  return (
    <React.Fragment>
      <div className={styles.recover}>
        <div className={styles.recoverPanel}>
          <h2>Confirm recovery locations</h2>
          <p>Identify your five locations to recover your Gnosis Safe below.</p>
          <div className={styles.wrapper}>
            <div className={styles.header}>
              {/*<Blockie address={safeAddress} diameter={24} />*/}
              <div>{safeAddress}</div>
            </div>
            <div className={styles.content}>
              {locations.map(l => (
                <div className={styles.location} key={l.geohash}>
                  <img src={greenEarth} className={styles.greenHearth} />
                  {l.description}
                </div>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                disabled={locations.length < 0}
                onClick={toggleMnemonicModal}
                className={styles.button}
              >
                Recover Wallet
              </button>
            </div>
          </div>
        </div>
        <div className={styles.mapWrapper}>
          <div ref={mapRef}></div>
        </div>
      </div>
      <Modal visible={showMnemonicModal}>
        <MnemonicModal
          locations={locations}
          safeAddress={safeAddress}
        />
      </Modal>
    </React.Fragment>
  )
}

export default Recover