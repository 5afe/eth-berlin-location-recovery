import React from 'react'
import logo from '../../../../assets/logo.png'
import styles from './styles.module.css'

const Setup = () => (
  <div className={styles.setup}>
    <h1><img src={logo} alt="Logo" width='80px'/>Mapcovery</h1>
    <h3>Set up</h3>
    Set up mapcovery for your Gnosis Safe.
  </div>
)

export default Setup
