package io.gnosis.location_recovery

import android.app.Application
import com.mapbox.mapboxsdk.Mapbox
import com.squareup.moshi.Moshi
import com.squareup.picasso.Picasso
import io.gnosis.location_recovery.bridge.BridgeServer
import io.gnosis.location_recovery.data.FoamApi
import io.gnosis.location_recovery.repositories.*
import io.gnosis.location_recovery.ui.main.MainViewModel
import io.gnosis.location_recovery.ui.main.MainViewModelContract
import io.gnosis.location_recovery.ui.recover.RecoveryViewModel
import io.gnosis.location_recovery.ui.recover.RecoveryViewModelContract
import okhttp3.OkHttpClient
import org.koin.android.ext.android.inject
import org.koin.android.ext.koin.androidContext
import org.koin.android.viewmodel.dsl.viewModel
import org.koin.core.context.startKoin
import org.koin.dsl.module
import org.walletconnect.impls.FileWCSessionStore
import org.walletconnect.impls.WCSessionStore
import pm.gnosis.mnemonic.Bip39
import pm.gnosis.mnemonic.Bip39Generator
import pm.gnosis.mnemonic.android.AndroidWordListProvider
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.File

class RecoveryApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        Mapbox.getInstance(applicationContext, "pk.eyJ1IjoicmltZWlzc25lciIsImEiOiJjanpvdjN0ZzQwNjNxM2RuendsMml6dDY1In0.TYRMvGWCTtRVtbssumNc0w")

        // start Koin!
        startKoin {
            // Android context
            androidContext(this@RecoveryApplication)
            // modules
            modules(listOf(coreModule, apiModule, repositoryModule, viewModelModule))

            val bridge: BridgeServer by inject()
            bridge.init()
        }
    }

    private val coreModule = module {

        single { Picasso.get() }

        single { OkHttpClient.Builder().build() }

        single { Moshi.Builder().build() }

        single<WCSessionStore> { FileWCSessionStore(File(cacheDir, "session_store.json").apply { createNewFile() }, get()) }

        single { BridgeServer(get()).apply { start() } }

        single<Bip39> { Bip39Generator(AndroidWordListProvider(get())) }
    }

    private val repositoryModule = module {
        single<SessionRepository> { SessionRepositoryImpl(get(), get(), get()) }
        single<LocationRepository> { FoamLocationRepository(get()) }
    }

    private val viewModelModule = module {
        viewModel<MainViewModelContract> { MainViewModel(get(), get()) }
        viewModel<RecoveryViewModelContract> { RecoveryViewModel(get(), get()) }
    }

    private val apiModule = module {
        single<FoamApi> {
            Retrofit.Builder()
                .client(get())
                .baseUrl(FoamApi.BASE_URL)
                .addConverterFactory(MoshiConverterFactory.create(get()))
                .build()
                .create(FoamApi::class.java)
        }
    }
}
