import React from 'react'
import styles from './styles.module.css'
import Setup from './components/Setup'
import Recover from './components/Recover'

const Home = () => (
  <div className={styles.page}>
    <div className={styles.left}>
      <Setup/>
    </div>
    <div className={styles.right}>
      <Recover />
    </div>
  </div>
)

export default Home
