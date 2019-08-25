package io.gnosis.location_recovery.ui.recover

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.DialogFragment
import androidx.lifecycle.LiveData
import androidx.lifecycle.Observer
import androidx.lifecycle.liveData
import androidx.lifecycle.viewModelScope
import io.gnosis.location_recovery.GnosisSafe
import io.gnosis.location_recovery.R
import io.gnosis.location_recovery.SimpleRecoveryModule
import io.gnosis.location_recovery.repositories.LocationRepository
import io.gnosis.location_recovery.repositories.SessionRepository
import io.gnosis.location_recovery.ui.base.BaseViewModel
import io.gnosis.location_recovery.ui.main.MainViewModelContract
import kotlinx.android.synthetic.main.screen_recover.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import okio.ByteString
import org.koin.android.viewmodel.ext.android.viewModel
import org.walleth.khex.toNoPrefixHexString
import pm.gnosis.crypto.HDNode
import pm.gnosis.crypto.KeyGenerator
import pm.gnosis.crypto.KeyPair
import pm.gnosis.crypto.utils.Sha3Utils
import pm.gnosis.crypto.utils.asEthereumAddressChecksumString
import pm.gnosis.mnemonic.Bip39
import pm.gnosis.mnemonic.Bip39Generator
import pm.gnosis.mnemonic.android.AndroidWordListProvider
import pm.gnosis.model.Solidity
import pm.gnosis.model.SolidityBase
import pm.gnosis.utils.*
import java.lang.IllegalStateException
import java.math.BigInteger

abstract class RecoveryViewModelContract : BaseViewModel() {
    abstract val state: LiveData<State>
    abstract fun recoverSafe(safeAddress: String, locations: List<String>)

    data class State(val loading: Boolean, val mnemonic: String?, var viewAction: ViewAction?)

    sealed class ViewAction {
        data class ShowMessage(val message: String) : ViewAction()
    }
}

class RecoveryViewModel(
    private val bip39: Bip39,
    private val sessionRepository: SessionRepository
) : RecoveryViewModelContract() {

    private val stateChannel = Channel<State>()

    override val state = liveData {
        loadInitialState()
        for (state in stateChannel) emit(state)
    }

    // Initial state
    private var currentState =
        State(
            loading = false,
            mnemonic = null,
            viewAction = null
        )

    private suspend fun updateState(newState: State) {
        // Clear already submitted viewAction
        if (currentState.viewAction == newState.viewAction) newState.viewAction = null
        Log.d("#####", "updateState $newState")
        currentState = newState
        stateChannel.send(newState)
    }

    private fun loadInitialState() {
        if (currentState.loading || currentState.mnemonic != null) return
        viewModelScope.launch {
            try {
                updateState(currentState.copy(loading = true))
                updateState(currentState.copy(loading = false, mnemonic = bip39.generateMnemonic(languageId = R.id.english)))
            } catch (e: Exception) {
                updateState(currentState.copy(loading = false, viewAction = ViewAction.ShowMessage("An error occurred!")))
                Log.d("#####", "error $e")
            }
        }
    }

    override fun recoverSafe(safeAddress: String, locations: List<String>) {
        if (currentState.loading) return
        viewModelScope.launch {
            try {
                updateState(currentState.copy(loading = true))
                if (locations.size != MainViewModelContract.REQUIRED_LOCATIONS) throw IllegalStateException("Invalid locations")
                val safe = safeAddress.asEthereumAddress() ?: run {
                    updateState(currentState.copy(loading = false, viewAction = ViewAction.ShowMessage("Please enter a valid Safe address!")))
                    return@launch
                }
                val hashedLocations = locations.map { Sha3Utils.keccak(it.toByteArray()).toNoPrefixHexString() }.sorted()
                val privateKey = KeyPair.fromPrivate(Sha3Utils.keccak(hashedLocations.joinToString(separator = "").hexToByteArray()))
                val recoverer = Solidity.Address(privateKey.address.asBigInteger())
                val module = GnosisSafe.GetModules.decode(
                    sessionRepository.sendRequestAsync(
                        "eth_call", listOf(
                            mapOf(
                                "to" to safe.asEthereumAddressString(),
                                "data" to GnosisSafe.GetModules.encode()
                            ), "latest"
                        )
                    ).await()
                ).param0.items.find { checkRecoverer(it, recoverer) } ?: run {
                    updateState(currentState.copy(loading = false, viewAction = ViewAction.ShowMessage("No valid recovery module found!")))
                    return@launch
                }
                val mnemonic = currentState.mnemonic ?: throw IllegalStateException("No mnemonic generated")
                val hdNode = KeyGenerator.masterNode(ByteString.of(*bip39.mnemonicToSeed(mnemonic)))
                val root = hdNode.derive(KeyGenerator.BIP44_PATH_ETHEREUM)
                val recoveryOwners = listOf(
                    Solidity.Address(root.deriveChild(0).keyPair.address.asBigInteger()),
                    Solidity.Address(root.deriveChild(1).keyPair.address.asBigInteger())
                )
                val hash = hash(module, recoveryOwners)
                val signature = privateKey.sign(hash)
                val response = sessionRepository.sendTransactionAsync(
                    module, BigInteger.ZERO, SimpleRecoveryModule.TriggerAndExecuteRecoveryWithoutDelay.encode(
                        Solidity.Bytes32(signature.r.toBytes(32)),
                        Solidity.Bytes32(signature.s.toBytes(32)),
                        Solidity.UInt8(signature.v.toInt().toBigInteger()),
                        SolidityBase.Vector(recoveryOwners)
                    )
                ).await()
                updateState(currentState.copy(loading = false, viewAction = ViewAction.ShowMessage("Call response $response")))
            } catch (e: Exception) {
                updateState(currentState.copy(loading = false, viewAction = ViewAction.ShowMessage("An error occurred!")))
                e.printStackTrace()
            }
        }
    }

    private suspend fun checkRecoverer(module: Solidity.Address, recoverer: Solidity.Address): Boolean =
        SimpleRecoveryModule.Recoverer.decode(
            sessionRepository.sendRequestAsync(
                "eth_call", listOf(
                    mapOf(
                        "to" to module.asEthereumAddressString(),
                        "data" to SimpleRecoveryModule.Recoverer.encode()
                    ), "latest"
                )
            ).await()
        ).param0 == recoverer

    private suspend fun hash(module: Solidity.Address, recoveryOwners: List<Solidity.Address>): ByteArray {
        val hashData = StringBuilder().append("1900")
        recoveryOwners.forEach {
            hashData.append(it.value.toString(16).padStart(64, '0'))
        }
        hashData.append(moduleNonce(module).encode())
        return Sha3Utils.keccak(hashData.toString().hexToByteArray())
    }

    private suspend fun moduleNonce(module: Solidity.Address) =
        SimpleRecoveryModule.Nonce.decode(
            sessionRepository.sendRequestAsync(
                "eth_call", listOf(
                    mapOf(
                        "to" to module.asEthereumAddressString(),
                        "data" to SimpleRecoveryModule.Nonce.encode()
                    ), "latest"
                )
            ).await()
        ).param0
}

class RecoveryDialog : DialogFragment() {

    private val viewModel: RecoveryViewModelContract by viewModel()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View =
        inflater.inflate(R.layout.screen_recover, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        screen_recover_recover_btn.setOnClickListener {
            viewModel.recoverSafe(screen_recover_safe_address_input.text.toString(), arguments?.getStringArrayList(ARGUMENT_LOCATIONS) ?: emptyList())
        }

        screen_recover_recovery_phrase.setOnLongClickListener {
            val clipboard = context?.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.primaryClip = ClipData.newPlainText("Recovery phrase", screen_recover_recovery_phrase.text)
            Toast.makeText(context, "Copied recovery phrase to clipboard", Toast.LENGTH_SHORT).show()
            true
        }
        viewModel.state.observe(this, Observer {
            screen_recover_recover_progress.isVisible = it.loading
            screen_recover_recover_btn.isEnabled = !it.loading
            screen_recover_recovery_phrase.text = it.mnemonic

            it.viewAction?.let { update -> performAction(update) }
        })
    }

    private fun performAction(viewAction: RecoveryViewModelContract.ViewAction) {
        when (viewAction) {
            is RecoveryViewModelContract.ViewAction.ShowMessage -> {
                Toast.makeText(context, viewAction.message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onStart() {
        super.onStart()
        dialog?.window?.setLayout(MATCH_PARENT, MATCH_PARENT)
    }

    companion object {
        private const val ARGUMENT_LOCATIONS = "arg.string_list.locations"
        fun createInstance(locations: List<LocationRepository.Location>) =
            RecoveryDialog().apply {
                arguments = Bundle().apply {
                    putStringArrayList(ARGUMENT_LOCATIONS, locations.mapTo(ArrayList(), { it.geoHash }))
                }
            }
    }
}
