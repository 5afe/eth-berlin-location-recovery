package io.gnosis.location_recovery.ui.main

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.Observer
import com.google.gson.JsonPrimitive
import com.mapbox.mapboxsdk.camera.CameraPosition
import com.mapbox.mapboxsdk.geometry.LatLng
import com.mapbox.mapboxsdk.maps.Style
import com.mapbox.mapboxsdk.plugins.annotation.CircleManager
import com.mapbox.mapboxsdk.plugins.annotation.CircleOptions
import io.gnosis.location_recovery.R
import io.gnosis.location_recovery.repositories.LocationRepository
import kotlinx.android.synthetic.main.screen_main.*
import org.koin.android.viewmodel.ext.android.viewModel

class MainActivity : AppCompatActivity() {

    private val viewModel: MainViewModelContract by viewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.screen_main)

        screen_main_connect_btn.isVisible = false
        screen_main_connect_btn.setOnClickListener {
            viewModel.performAction(MainViewModelContract.Action.StartSession)
        }
        screen_main_disconnect_btn.isVisible = false
        screen_main_disconnect_btn.setOnClickListener {
            viewModel.performAction(MainViewModelContract.Action.DisconnectSession)
        }
        screen_main_enable_location_recovery_btn.setOnClickListener {
            viewModel.performAction(MainViewModelContract.Action.EnableLocationRecovery)
        }
        viewModel.state.observe(this, Observer {
            screen_main_bottom_sheet.isVisible = it.sessionActive
            screen_main_account_info_group.isVisible = it.sessionActive
            it.connectedAccount?.let { account ->
                screen_main_account_address_img.setAddress(account.address)
                screen_main_account_address_lbl.text = account.displayAddress
                screen_main_account_name_lbl.text = account.displayName ?: "Unknown client"
            } ?: run {
                screen_main_account_address_img.setAddress(null)
                screen_main_account_address_lbl.text = null
                screen_main_account_name_lbl.text = "Waiting for client information"
            }
            screen_main_connect_btn.isVisible = !it.sessionActive

            it.viewAction?.let { update -> performAction(update) }

            updateLocations(it.displayedLocations)

            updateSelectedLocations(it.selectedLocations)
        })

        screen_main_bottom_sheet.setOnClickListener {
            // Catch clicks
        }
        screen_main_map_view.onCreate(savedInstanceState)
        setupMap()
    }

    private var manager: CircleManager? = null
    private var locationsId: String? = null
    private var locationMap: Map<String, LocationRepository.Location>? = null

    private fun setupMap() {
        screen_main_map_view.getMapAsync { map ->
            map.addOnCameraIdleListener {
                map.projection.visibleRegion.latLngBounds.let {
                    viewModel.performAction(
                        MainViewModelContract.Action.UpdateLocations(
                            it.southWest.longitude,
                            it.southWest.latitude,
                            it.northEast.longitude,
                            it.northEast.latitude
                        )
                    )
                }
            }
            map.setStyle(Style.DARK) { style ->
                map.cameraPosition = CameraPosition.Builder().target(LatLng(52.4988732, 13.4346469)).zoom(10.0).build()
                val manager = CircleManager(screen_main_map_view, map, style)
                manager.addClickListener { point ->
                    locationMap?.get(point.data?.asString)?.let { location ->
                        Log.d("#####", "$location")
                        viewModel.performAction(MainViewModelContract.Action.SelectLocation(location))
                    }
                }
                manager.addLongClickListener { point ->
                    locationMap?.get(point.data?.asString)?.let { location ->
                        Toast.makeText(this, location.name, Toast.LENGTH_SHORT).show()
                    }
                }
                this.manager = manager
                renderLocations()
            }
        }
    }

    private fun updateLocations(locations: MainViewModelContract.Locations) {
        if (locationsId == locations.id) return
        locationsId = locations.id
        locationMap = locations.data.associateBy { it.id }
        renderLocations()
    }

    private fun renderLocations() {
        val manager = manager ?: return
        locationMap?.values?.map {
            CircleOptions()
                .withLatLng(LatLng(it.latitude, it.longitude))
                .withCircleRadius(10f)
                .withCircleOpacity(0.5f)
                .withCircleColor("#D81B60")
                .withData(JsonPrimitive(it.id))
        }?.let {
            manager.deleteAll()
            manager.create(it)
        }
    }

    private fun updateSelectedLocations(selected: List<LocationRepository.Location>) {
        screen_main_enable_location_recovery_btn.isVisible = selected.size >= MainViewModelContract.REQUIRED_LOCATIONS
        screen_main_map_view_location_summary.text = getString(R.string.x_selected_locations, selected.size, MainViewModelContract.REQUIRED_LOCATIONS)
        setupLocationView(screen_main_map_view_location_1, selected.getOrNull(0))
        setupLocationView(screen_main_map_view_location_2, selected.getOrNull(1))
        setupLocationView(screen_main_map_view_location_3, selected.getOrNull(2))
        setupLocationView(screen_main_map_view_location_4, selected.getOrNull(3))
        setupLocationView(screen_main_map_view_location_5, selected.getOrNull(4))
    }

    private fun setupLocationView(textView: TextView, location: LocationRepository.Location?) {
        location?.let {
            textView.text = location.name
            textView.setOnClickListener { viewModel.performAction(MainViewModelContract.Action.RemoveLocation(location)) }
        } ?: run {
            textView.text = getString(R.string.select_location)
            textView.setOnClickListener(null)
        }
    }

    override fun onStart() {
        super.onStart()
        screen_main_map_view.onStart()
    }

    override fun onResume() {
        super.onResume()
        screen_main_map_view.onResume()
    }

    override fun onPause() {
        screen_main_map_view.onPause()
        super.onPause()
    }

    override fun onStop() {
        screen_main_map_view.onStop()
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        screen_main_map_view.onSaveInstanceState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onLowMemory() {
        screen_main_map_view.onLowMemory()
        super.onLowMemory()
    }

    override fun onDestroy() {
        screen_main_map_view.onDestroy()
        super.onDestroy()
    }

    private fun performAction(viewAction: MainViewModelContract.ViewAction) {
        when (viewAction) {
            is MainViewModelContract.ViewAction.OpenUri -> {
                val i = Intent(Intent.ACTION_VIEW)
                i.data = Uri.parse(viewAction.uri)
                startActivity(i)
            }
            is MainViewModelContract.ViewAction.ShowMessage -> {
                Toast.makeText(this, viewAction.message, Toast.LENGTH_SHORT).show()
            }
        }
    }
}
