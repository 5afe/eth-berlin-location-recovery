package io.gnosis.location_recovery.repositories

import com.fonfon.geohash.GeoHash
import io.gnosis.location_recovery.data.FoamApi
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.async

interface LocationRepository {
    fun loadLoactionsAsync(swLongitude: Double, swLatitude: Double, neLongitude: Double, neLatitude: Double): Deferred<List<Location>>
    data class Location(val id: String, val name: String, val geoHash: String, val latitude: Double, val longitude: Double)
}

class FoamLocationRepository(
    private val api: FoamApi
): LocationRepository {
    override fun loadLoactionsAsync(
        swLongitude: Double,
        swLatitude: Double,
        neLongitude: Double,
        neLatitude: Double
    ): Deferred<List<LocationRepository.Location>> = GlobalScope.async(Dispatchers.IO) {
        api.locations(
            swLongitude, swLatitude, neLongitude, neLatitude, "listing", "most_value", 1000, 0
        ).map {
            val location = GeoHash.fromString(it.geohash)
            LocationRepository.Location(it.listingHash, it.name, it.geohash, location.center.latitude, location.center.longitude)
        }
    }

}
