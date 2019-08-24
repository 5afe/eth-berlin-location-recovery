package io.gnosis.location_recovery.data

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import retrofit2.http.GET
import retrofit2.http.Query

interface FoamApi {
    /**
     * /poi/filtered?
     * swLng=13.293197926776429&
     * swLat=52.37604477943748&
     * neLng=13.57570349539273&
     * neLat=52.621597623485485&
     * status=listing
     * sort=most_value&
     * limit=500&
     * offset=0
     */
    @GET("poi/filtered")
    suspend fun locations(
        @Query("swLng") swLng: Double,
        @Query("swLat") swLat: Double,
        @Query("neLng") neLng: Double,
        @Query("neLat") neLat: Double,
        @Query("status") status: String,
        @Query("sort") sort: String,
        @Query("limit") limit: Long,
        @Query("offset") offset: Long
    ): List<FoamLocation>

    companion object {
        const val BASE_URL = "https://map-api-direct.foam.space/"
    }

    @JsonClass(generateAdapter = true)
    data class FoamLocation(
        @Json(name = "listingHash") val listingHash: String,
        @Json(name = "name") val name: String,
        @Json(name = "geohash") val geohash: String
    )
}
