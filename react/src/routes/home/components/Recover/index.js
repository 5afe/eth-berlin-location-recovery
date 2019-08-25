import React, { useState } from 'react'
import { Redirect } from 'react-router-dom'
import { RECOVER_URL } from '../../../routes'
// import { Form } from 'react-final-form'
// import TextField from '../../../../components/forms/TextField'
// import { composeValidators, mustBeEthereumAddress } from '../../../../components/forms/validators'
import styles from './styles.module.css'

const Recover = () => {
  const [safeAddress, setSafeAddress] = useState('')
  const [ready, setReady] = useState(false)

  const submit = (e) => {
    if (safeAddress !== null && safeAddress !== '') {
      setReady(true)
    }
    else {
      e.preventDefault()
      // show error here
    }
  }

  const updateSafeAddress = (e) => {
    const safeAddress = e.target.value
    setSafeAddress(safeAddress)
  }

  if (ready) {
    return (
      <Redirect to={{
        pathname: RECOVER_URL,
        state: {
          safeAddress
        }
      }}/>
    )
  }

  return (
    <div className={styles.recover}>
      <h1>Recover</h1>
      <div className={styles.title}>
        Restore your Gnosis Safe by entering your Gnosis Safe address.
      </div>
      {/* <Form
        onSubmit={submit}
        render={(handleSubmit) => (
          <TextField
            validate={composeValidators(mustBeEthereumAddress)}
            placeholder="0x..."
          />
        )}
      /> */}
      <form onSubmit={submit}>
        <input
          type="text"
          onChange={updateSafeAddress}
          className={styles.textInput}
          placeholder="0x..."
        />
      </form>
    </div>
  )
}

export default Recover
