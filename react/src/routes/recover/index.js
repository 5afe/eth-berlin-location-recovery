import React, { useState, useEffect } from 'react'
import { setupMap } from './mapUtils'
import styles from './styles.module.css'

const Recover = (props) => {
  const [locations, setLocations] = useState([])

  let listener
  const mapRef = React.createRef()
  const safeAddress = props.history.location.state.safeAddress
  
  useEffect(() => {
    startListener()
    const map = setupMap(mapRef.current)

    return () => clearInterval(listener)
  }, [])

  const startListener = () => {
    // MUST USE REDUX HERE INSTEAD OF WINDOW, HAD NO TIME DURING HACKATHON
    listener = setInterval(() => {
      if (window.point && window.point != '') {
        setLocations(oldLocations => [...oldLocations, window.point])
        window.point = ''
      }
    }, 500);
  }

  return (
    <div className={styles.recover}>
      <div className={styles.recoverPanel}>
        <h1>Confirm recovery locations</h1>
        <p>Identify your five locations to recover your Gnosis Safe below.</p>
        <p>{safeAddress}</p>
        <div>
          {locations.map(l => (
            <p key={l}>{l}</p>
          ))}
        </div>
        <div>
          {locations.length >= 5 && (
            <button>
              Recover
            </button>
          )}
        </div>
      </div>
      <div className={styles.mapWrapper}>
        <div ref={mapRef}></div>
      </div>
    </div>
  )
}

export default Recover