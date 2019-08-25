package io.gnosis.location_recovery.ui.main

import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.liveData
import androidx.lifecycle.viewModelScope
import io.gnosis.location_recovery.repositories.LocationRepository
import io.gnosis.location_recovery.repositories.SessionRepository
import io.gnosis.location_recovery.ui.base.BaseViewModel
import io.gnosis.location_recovery.utils.asMiddleEllipsized
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.Channel.Factory.UNLIMITED
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.walleth.khex.toNoPrefixHexString
import pm.gnosis.crypto.KeyPair
import pm.gnosis.crypto.utils.Sha3Utils
import pm.gnosis.crypto.utils.asEthereumAddressChecksumString
import pm.gnosis.model.Solidity
import pm.gnosis.utils.asBigInteger
import pm.gnosis.utils.asEthereumAddress
import pm.gnosis.utils.hexToByteArray
import java.util.*

abstract class MainViewModelContract : BaseViewModel() {
    abstract val state: LiveData<State>

    abstract fun performAction(action: Action)

    data class State(
        val connecting: Boolean,
        val sessionActive: Boolean,
        val connectedAccount: Account?,
        val displayedLocations: Locations,
        val selectedLocations: List<LocationRepository.Location>,
        var viewAction: ViewAction?
    )

    data class Locations(val data: List<LocationRepository.Location>, val id: String = UUID.randomUUID().toString())

    data class Account(val address: Solidity.Address, val displayAddress: String, val displayName: String?)

    sealed class Action {
        object LoadSession : Action()
        object StartSession : Action()
        object DisconnectSession : Action()
        object EnableLocationRecovery : Action()
        data class SelectLocation(val location: LocationRepository.Location) : Action()
        data class RemoveLocation(val location: LocationRepository.Location) : Action()
        data class UpdateLocations(val swLongitude: Double, val swLatitude: Double, val neLongitude: Double, val neLatitude: Double) : Action()
    }

    sealed class ViewAction {
        data class OpenUri(val uri: String) : ViewAction()
        data class ShowMessage(val message: String) : ViewAction()
    }

    companion object {
        const val REQUIRED_LOCATIONS = 5
    }
}

class MainViewModel(
    private val sessionRepository: SessionRepository,
    private val locationRepository: LocationRepository
) : MainViewModelContract() {
    private val inChannel = Channel<Action>(UNLIMITED)
    private val stateChannel = Channel<State>()

    override val state = liveData {
        inChannel.send(Action.LoadSession)
        process()
        for (state in stateChannel) emit(state)
    }

    // Initial state
    private var currentState =
        State(
            connecting = false,
            sessionActive = false,
            connectedAccount = null,
            displayedLocations = Locations(emptyList()),
            selectedLocations = emptyList(),
            viewAction = null
        )

    private suspend fun updateState(newState: State) {
        // Clear already submitted viewAction
        if (currentState.viewAction == newState.viewAction) newState.viewAction = null
        Log.d("#####", "updateState $newState")
        currentState = newState
        stateChannel.send(newState)
    }

    override fun performAction(action: Action) {
        viewModelScope.launch {
            inChannel.send(action)
        }
    }

    private fun process() {
        viewModelScope.launch {
            for (action in inChannel) {
                Log.d("#####", "nextAction $action")
                when (action) {
                    Action.LoadSession -> loadActiveSession()
                    Action.StartSession -> startSession()
                    Action.DisconnectSession -> disconnectSession()
                    Action.EnableLocationRecovery -> enableLocationRecovery()
                    is Action.SelectLocation -> selectLocation(action.location)
                    is Action.RemoveLocation -> removeLocation(action.location)
                    is Action.UpdateLocations -> updateLocations(action)
                }
            }
        }
    }

    private fun accountFromSession(session: SessionRepository.SessionData): Account? =
        session.approvedAccounts?.firstOrNull()?.let {
            val address = it.asEthereumAddress() ?: return@let null
            Account(address, address.asEthereumAddressChecksumString().asMiddleEllipsized(4), session.peerName)
        }

    private fun State.inactive() = copy(sessionActive = false, connectedAccount = null)

    /*
     * Watch Session
     */

    private var watcherJob: Job? = null

    private suspend fun watchSession() {
        watcherJob?.cancel()
        watcherJob = null
        val channel = withContext(viewModelScope.coroutineContext) { sessionRepository.sessionUpdatesChannel() }
        watcherJob = viewModelScope.launch {
            for (session in channel) {
                updateState(session.approvedAccounts?.let {
                    currentState.copy(sessionActive = true, connectedAccount = accountFromSession(session))
                } ?: currentState.inactive())
            }
        }.also {
            it.invokeOnCompletion { channel.cancel() }
        }
    }

    /*
     * Load Session Info
     */

    private suspend fun loadActiveSession() {
        if (currentState.connecting) return // Already connecting
        updateState(currentState.copy(connecting = true))
        val activeSession = sessionRepository.activeSessionAsync()
        viewModelScope.launch {
            try {
                activeSession.await()?.let { session ->
                    updateState(currentState.copy(sessionActive = true, connectedAccount = accountFromSession(session)))
                    watchSession()
                } ?: run {
                    updateState(currentState.inactive())
                }
            } catch (e: Exception) {
                updateState(currentState.inactive())
                Log.d("#####", "error $e")
            } finally {
                updateState(currentState.copy(connecting = false))
            }
        }
    }

    /*
     * Start Session
     */

    private suspend fun startSession() {
        if (currentState.connecting || currentState.sessionActive) return // Already connecting or active
        updateState(currentState.copy(connecting = true))
        val createSession = sessionRepository.createSessionAsync()
        viewModelScope.launch {
            try {
                val uri = createSession.await()
                watchSession()
                updateState(currentState.copy(sessionActive = true, viewAction = ViewAction.OpenUri(uri)))
            } catch (e: Exception) {
                Log.d("#####", "error $e")
            } finally {
                updateState(currentState.copy(connecting = false))
            }
        }
    }

    /*
     * Disconnect Session
     */

    private suspend fun disconnectSession() {
        val disconnectSession = sessionRepository.disconnectSessionAsync()
        viewModelScope.launch {
            try {
                if (disconnectSession.await()) {
                    updateState(currentState.inactive())
                }
            } catch (e: Exception) {
                Log.d("#####", "error $e")
            }
        }
    }

    /*
     * Location recovery
     */

    private suspend fun selectLocation(location: LocationRepository.Location) {
        try {
            currentState.selectedLocations.apply {
                if (size >= REQUIRED_LOCATIONS) {
                    updateState(currentState.copy(viewAction = ViewAction.ShowMessage("Maximum number of locations selected!")))
                    return
                }
                if (find { it.geoHash == location.geoHash } != null) {
                    updateState(currentState.copy(viewAction = ViewAction.ShowMessage("Location already included!")))
                    return
                }
                updateState(
                    currentState.copy(
                        selectedLocations = toMutableList().apply { add(location) },
                        viewAction = ViewAction.ShowMessage("Added ${location.name} to selected locations")
                    )
                )
            }
        } catch (e: Exception) {
            updateState(currentState.copy(viewAction = ViewAction.ShowMessage("An error occurred!")))
            Log.d("#####", "error $e")
        }
    }

    private suspend fun removeLocation(location: LocationRepository.Location) {
        try {
            currentState.selectedLocations.apply {
                val newLocations = toMutableList()
                if (!newLocations.remove(location)) {
                    updateState(currentState.copy(viewAction = ViewAction.ShowMessage("Location not found!")))
                    return
                }
                updateState(currentState.copy(selectedLocations = newLocations))
            }
        } catch (e: Exception) {
            updateState(currentState.copy(viewAction = ViewAction.ShowMessage("An error occurred!")))
            Log.d("#####", "error $e")
        }
    }

    private suspend fun updateLocations(action: Action.UpdateLocations) {
        try {
            updateState(
                currentState.copy(
                    displayedLocations = Locations(
                        locationRepository.loadLoactionsAsync(
                            action.swLongitude,
                            action.swLatitude,
                            action.neLongitude,
                            action.neLatitude
                        ).await()
                    )
                )
            )
        } catch (e: Exception) {
            updateState(currentState.copy(viewAction = ViewAction.ShowMessage("An error occurred!")))
            Log.d("#####", "error $e")
        }
    }

    private suspend fun enableLocationRecovery() {
        try {
            val account = currentState.connectedAccount ?: throw IllegalStateException("No active account")
            val locations = currentState.selectedLocations
            if (locations.size != REQUIRED_LOCATIONS) throw IllegalStateException("Incorrect number of locations")
            val hashedLocations = locations.map { Sha3Utils.keccak(it.geoHash.toByteArray()).toNoPrefixHexString() }.sorted()
            val privateKey = KeyPair.fromPrivate(Sha3Utils.keccak(hashedLocations.joinToString().hexToByteArray()))
            val result = sessionRepository.sendRequestAsync(
                "gs_enableSimpleRecovery",
                listOf(
                    account.address.asEthereumAddressChecksumString(),
                    Solidity.Address(privateKey.address.asBigInteger()).asEthereumAddressChecksumString(),
                    0L
                )
            ).await()
            updateState(currentState.copy(selectedLocations = emptyList(), viewAction = ViewAction.ShowMessage("Successfully setup recovery")))
            Log.d("#####", "result $result")
        } catch (e: Exception) {
            updateState(currentState.copy(viewAction = ViewAction.ShowMessage("An error occurred!")))
            Log.d("#####", "error $e")
        }
    }
}
