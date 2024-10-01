import { LitElement, html, css } from 'lit';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import {OSM, TileWMS} from 'ol/source';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { WMTS } from 'ol/source'
import svg from '@dataforsyningen/designsystem/assets/icons.svg';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import { Style, Stroke, Fill } from 'ol/style.js';
import GML2 from 'ol/format/GML2.js';
import GML3 from 'ol/format/GML3.js';
import GML32 from 'ol/format/GML32.js'
import { register } from 'ol/proj/proj4';
import { get } from 'ol/proj';
import proj4 from 'proj4';

// Define and register the projection for EPSG:25832
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +axis=enu');
// Define the http URI form of EPSG:25832 as named alias
proj4.defs('http://www.opengis.net/def/crs/EPSG/0/25832', proj4.defs('EPSG:25832'));
register(proj4);

// Get the EPSG:25832 projection
const epsg25832 = get('EPSG:25832');

// Check the axis orientation
const axisOrientation = epsg25832.getAxisOrientation();
console.log('EPSG:25832 Axis Orientation:', axisOrientation); // Should output 'enu'


class MapViewer extends LitElement {
  static styles = css`
      #map-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          position: relative;
      }

      .map {
          width: 100%;
          height: 100%;
      }

      #controls {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      button, label {
          width: 40px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 0.3s, transform 0.2s;
      }

      button:hover, label:hover {
          background-color: #f0f0f0;
          transform: scale(1.1);
      }

      button svg, label svg {
          width: 20px;
          height: 20px;
          fill: #333;
      }

      input[type="file"] {
          display: none;
      }
  `;

  constructor() {
    super();
    this.showSecondMap = false;
  }

  firstUpdated() {
    this.initMaps();
  }

  initMaps() {
    this.map1 = new Map({
      target: this.shadowRoot.getElementById('map1'),
      layers: [
        new TileLayer({
          opacity: 1.0,
          title: 'Skærmkortet',
          type: 'base',
          visible: true,
          source: new WMTS({
            url: 'https://api.dataforsyningen.dk/topo_skaermkort_daempet_DAF?token=9ca510be3c4eca89b1333cadbaa60c36',
            layer: 'topo_skaermkort_daempet',
            matrixSet: 'View1',
            format: 'image/jpeg',
            style: 'default',
            size: [256, 256],
            axisOrientation: 'enu',
            tileGrid: new WMTSTileGrid({
              extent: [120000, 5900000, 1000000, 6500000],
              resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2],
              matrixIds: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
            })
          })
        }),
      ],
      view: new View({
        center: [600000, 6225000],
        zoom: 8,
        projection: epsg25832  // Ensure correct projection is set
      }),
      controls: [], // Remove default controls
    });

    // Secondary map initialization (hidden initially)
    this.map2 = new Map({
      target: this.shadowRoot.getElementById('map2'),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
      controls: [], // Remove default controls
    });

    this.shadowRoot.getElementById('map2').style.display = 'none';
  }

  toggleSecondMap() {
    this.showSecondMap = !this.showSecondMap;
    this.shadowRoot.getElementById('map2').style.display = this.showSecondMap ? 'block' : 'none';
  }

  zoomIn() {
    const view = this.map1.getView();
    view.setZoom(view.getZoom() + 1);
  }

  zoomOut() {
    const view = this.map1.getView();
    view.setZoom(view.getZoom() - 1);
  }

  uploadGML(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.loadGML(reader.result);
      };
      reader.readAsText(file);
    }
  }

  loadGML(gmlString) {
    let format;

    // You could also check for specific version info in the file if needed
    if (this.isGML32(gmlString)) {
      format = new GML32();
    } else {
      format = new GML3();
    }
    console.log('GML content:', gmlString);

    let features;
    try {
      features = format.readFeatures(gmlString, {
        featureProjection: 'EPSG:25832',  // Ensure the correct projection is used
        dataProjection: 'EPSG:25832',  // Use dataProjection if your GML file specifies the data projection
      });
    } catch (error) {
      console.error('Error parsing GML:', error);
      return;
    }

    const vectorSource = new VectorSource({
      features: features,
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    this.map1.addLayer(vectorLayer);

    const extent = vectorSource.getExtent();
    if (!isNaN(extent[0]) && !isNaN(extent[2])) {
      this.map1.getView().fit(extent, { size: this.map1.getSize(), maxZoom: 18 });
    } else {
      console.error('Invalid extent:', extent);
    }
  }

  isGML32(gmlString) {
    // Simple check to identify GML 3.2, adjust according to your actual file structure.
    return gmlString.includes('gml32') || gmlString.includes('http://www.opengis.net/gml/3.2');
  }

  render() {
    return html`
      <div id="map-container">
        <div id="map1" class="map"></div>
        <div id="map2" class="map"></div>

        <div id="controls">
        <!--
          <button @click="${this.toggleSecondMap}" title="Toggle Second Map">
            <svg>
              <use href="${svg}#frame-dual"></use>
            </svg>
          </button>
          -->
          <button @click="${this.zoomIn}" title="Zoom In">
            <svg>
              <use href="${svg}#plus"></use>
            </svg>
          </button>
          <button @click="${this.zoomOut}" title="Zoom Out">
            <svg>
              <use href="${svg}#minus"></use>
            </svg>
          </button>
          <input type="file" id="file-input" @change="${this.uploadGML}" />
          <label for="file-input" title="Upload GML">
            <svg>
              <use href="${svg}#arrow-up"></use>
            </svg>
          </label>
        </div>
      </div>
    `;
  }
}

customElements.define('map-viewer', MapViewer);
