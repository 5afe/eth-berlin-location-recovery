import React from 'react'
import classNames from 'classnames/bind'
import styles from './styles.module.css'

const cx = classNames.bind(styles)

const Modal = ({ visible, children }) => (
  <div className={cx(styles.background, visible ? styles.visible : styles.notVisible)}>
    <div className={styles.modal}>
      {children}
    </div>
  </div>
)

export default Modal
