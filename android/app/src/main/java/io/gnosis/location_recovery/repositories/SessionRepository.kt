package io.gnosis.location_recovery.repositories

import android.util.Log
import com.squareup.moshi.Moshi
import io.gnosis.location_recovery.bridge.BridgeServer
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import okhttp3.OkHttpClient
import org.walletconnect.Session
import org.walletconnect.impls.MoshiPayloadAdapter
import org.walletconnect.impls.OkHttpTransport
import org.walletconnect.impls.WCSession
import org.walletconnect.impls.WCSessionStore
import org.walleth.khex.toNoPrefixHexString
import java.lang.RuntimeException
import java.util.*
import kotlin.coroutines.resume
import kotlin.random.Random

interface SessionRepository {
    fun activeSessionAsync(): Deferred<SessionData?>

    fun createSessionAsync(): Deferred<String>

    fun disconnectSessionAsync(): Deferred<Boolean>

    fun sessionUpdatesChannel(): ReceiveChannel<SessionData>

    fun sendRequestAsync(method: String, params: List<Any>): Deferred<String>

    data class SessionData(val approvedAccounts: List<String>?, val peerName: String?)
}

class SessionRepositoryImpl(
    private val networkClient: OkHttpClient,
    private val moshi: Moshi,
    private val sessionStore: WCSessionStore
) : SessionRepository {
    // TODO session lock
    private var activeSession: WCSession? = null

    @ExperimentalCoroutinesApi
    override fun sessionUpdatesChannel(): ReceiveChannel<SessionRepository.SessionData> {
        val channel = Channel<SessionRepository.SessionData>()
        activateSession()
        val session = activeSession ?: throw IllegalStateException("No active session")
        val cb = object : Session.Callback {
            override fun handleMethodCall(call: Session.MethodCall) {}

            override fun sessionApproved() {
                channel.offer(SessionRepository.SessionData(session.approvedAccounts() ?: emptyList(), session.peerMeta()?.name))
            }

            override fun sessionClosed() {
                channel.offer(SessionRepository.SessionData(null, null))
            }

        }
        session.addCallback(cb)
        channel.invokeOnClose { session.removeCallback(cb) }
        channel.offer(SessionRepository.SessionData(session.approvedAccounts() ?: emptyList(), session.peerMeta()?.name))
        return channel
    }

    private fun activateSession() {
        activeSession?.let { return }
        val sessionInfo = sessionStore.list().firstOrNull() ?: return
        sessionFromConfig(sessionInfo.config).init()
    }

    override fun activeSessionAsync() = GlobalScope.async(Dispatchers.IO) {
        val sessions = sessionStore.list()
        Log.d("#####", "sessions $sessions")
        sessions.firstOrNull()?.let { SessionRepository.SessionData(it.approvedAccounts, it.peerData?.meta?.name) }
    }

    override fun createSessionAsync() = GlobalScope.async(Dispatchers.IO) {
        sessionStore.list().firstOrNull()?.let { throw IllegalStateException("Already a session active") }
        val key = ByteArray(32).also { Random.nextBytes(it) }.toNoPrefixHexString()
        val config = Session.Config(UUID.randomUUID().toString(), "http://localhost:${BridgeServer.PORT}", key)
        sessionFromConfig(config).offer()
        config.toWCUri()
    }

    override fun sendRequestAsync(method: String, params: List<Any>) = GlobalScope.async(Dispatchers.IO) {
        val session = activeSession ?: throw IllegalStateException("No active session")
        val id = System.nanoTime()
        suspendCancellableCoroutine<String> { cont ->
            session.performMethodCall(
                Session.MethodCall.Custom(
                    id, method, params
                )
            ) {
                it.error?.let {
                    cont.cancel(RuntimeException(it.message))
                } ?: run {
                    cont.resume(it.result as String)
                }
            }
        }

    }

    private fun sessionFromConfig(config: Session.Config): WCSession {
        val session = WCSession(
            config,
            MoshiPayloadAdapter(moshi),
            sessionStore,
            OkHttpTransport.Builder(networkClient, moshi),
            Session.PeerMeta(name = "Example App")
        )
        session.addCallback(object : Session.Callback {
            override fun handleMethodCall(call: Session.MethodCall) {}

            override fun sessionApproved() {}

            override fun sessionClosed() {
                @Suppress("DeferredResultUnused")
                disconnectSessionAsync()
            }

        })
        activeSession = session
        return session
    }

    override fun disconnectSessionAsync() = GlobalScope.async(Dispatchers.IO) {
        sessionStore.list().forEach { sessionStore.remove(it.config.handshakeTopic) }
        activeSession?.kill()
        activeSession = null
        true
    }

}
