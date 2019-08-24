import mapboxgl from 'mapbox-gl'
import Geohash from 'latlon-geohash'
import { ScatterplotLayer } from 'deck.gl'

let map
const size = 100

const pulsingDot = {
  width: size,
  height: size,
  data: new Uint8Array(size * size * 4),
  
  onAdd: function() {
    var canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.context = canvas.getContext('2d');
  },
  
  render: function() {
    var duration = 1000;
    var t = (performance.now() % duration) / duration;
    
    var radius = size / 2 * 0.3;
    var outerRadius = size / 2 * 0.7 * t + radius;
    var context = this.context;
    
    // draw inner circle
    context.beginPath();
    context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 100, 100, 1)';
    context.strokeStyle = 'white';
    context.lineWidth = 2 + 4 * (1 - t);
    context.fill();
    
    // update this image's data with data from the canvas
    this.data = context.getImageData(0, 0, this.width, this.height).data;
    
    // keep the map repainting
    map.triggerRepaint();
    
    // return `true` to let the map know that the image was updated
    return true;
  }
};

const BOUNDING_BOX = [
  [12, 50],
  [14, 54]
]

const FOAM_PENDING_COLOR = [46, 124, 230]
const FOAM_VERIFIED_COLOR = [38, 171, 95]
const FOAM_CHALLENGED_COLOR = [244, 128, 104]
const FOAM_REMOVED_COLOR = [255, 0, 0]

const getCenterPoint = (bounding_box) => (
  [(bounding_box[0][0] + bounding_box[1][0]) / 2, (bounding_box[0][1] + bounding_box[1][1]) / 2]
)

const getPointColor = (state) => {
  if (state && state.status && state.status.type) {
    if (state.status.type === "applied") { return FOAM_PENDING_COLOR }
    else if (state.status.type === "listing") { return FOAM_VERIFIED_COLOR }
    else if (state.status.type === "challenged") { return FOAM_CHALLENGED_COLOR }
  } else {
    return FOAM_REMOVED_COLOR
  }
}

const getPointCoords = (geohash) => {
  const coords = Geohash.decode(geohash)
  return [coords['lon'], coords['lat'], 0]
}

const searchPoints = async () => {
  const url = 'https://map-api-direct.foam.space/poi/filtered' +
    '?swLng=' + BOUNDING_BOX[0][0] +
    '&swLat=' + BOUNDING_BOX[0][1] +
    '&neLng=' + BOUNDING_BOX[1][0] +
    '&neLat=' + BOUNDING_BOX[1][1] +
    '&status=listing' +
    '&sort=most_value' +
    '&limit=500' +
    '&offset=0'

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers
    })
    let points
    if (response && response.status === 200) {
      points = await response.json()
      console.log(points)            
      const pointsStruct = points.map(p => (
        {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": getPointCoords(p.geohash),
          },
          "properties": {
            "description": p.name
          },
          "data": {
            "geohash": p.geohash,
            "name": p.name
          }
        }
      ))
      const geojson = {
        "id": "points",
        "type": "symbol",
        "source": {
          "type": "geojson",
          "data": {
            "type": "FeatureCollection",
            "features": pointsStruct
          }
        },
        "layout": {
          "icon-image": "pulsing-dot"
        }
      }
      return geojson
    }
    return []
  } catch (err) {
    console.error(err)
    return []
  }
}

export const setupMap = async (element) => {
  if (element !== null) {
    const geojson = await searchPoints()

    mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VybWFuOTIiLCJhIjoiY2p6cHB4NXd2MDI2djNjcnF4Y2E3NnpzMCJ9.ufsI1VW_rGWnHvTJ9VKvVA';
    map = new mapboxgl.Map({
      center: [13.363, 52.514],
      container: element,
      style: 'mapbox://styles/mapbox/dark-v10',
      zoom: 13,
      maxZoom: 16
    })

    map.on('load', () => {
      map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
      console.log(geojson)
      map.addLayer(geojson)
    })

    let popup

    map.on('click', 'points', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice()
      const description = e.features[0].properties.description

      // MUST USE REDUX HERE INSTEAD OF WINDOW, HAD NO TIME DURING HACKATHON
      window.point = description
    })
  
    map.on('mouseenter', 'points', (e) => {
      map.getCanvas().style.cursor = 'pointer'

      const coordinates = e.features[0].geometry.coordinates.slice()
      const description = e.features[0].properties.description

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }
      
      popup = new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(description)
        .addTo(map)
    })

    map.on('mouseleave', 'points', () => {
      map.getCanvas().style.cursor = ''
      if (popup) {
        popup.remove()
      }
    })
    
    return map
  }
}
