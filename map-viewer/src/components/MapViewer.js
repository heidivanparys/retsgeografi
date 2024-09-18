import { LitElement, html, css } from 'lit';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import GML2 from 'ol/format/GML2.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

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
    // Main map initialization
    this.map1 = new Map({
      target: this.shadowRoot.getElementById('map1'),
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
    const format = new GML2();
    const features = format.readFeatures(gmlString, {
      featureProjection: 'EPSG:3857',
    });

    const vectorSource = new VectorSource({
      features: features,
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    this.map1.addLayer(vectorLayer);
  }

  render() {
    return html`
      <div id="map-container">
        <div id="map1" class="map"></div>
        <div id="map2" class="map"></div>

        <div id="controls">
          <button @click="${this.toggleSecondMap}" title="Toggle Second Map">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3z"/>
            </svg>
          </button>
          <button @click="${this.zoomIn}" title="Zoom In">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 10h10v4H12v10h-4V14H2v-4h6V2h4z"/>
            </svg>
          </button>
          <button @click="${this.zoomOut}" title="Zoom Out">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M2 10h20v4H2z"/>
            </svg>
          </button>
          <input type="file" id="file-input" @change="${this.uploadGML}" />
          <label for="file-input" title="Upload GML">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M5 20h14v-2H5v2zm7-18L5 9h4v6h4V9h4L12 2z"/>
            </svg>
          </label>
        </div>
      </div>
    `;
  }
}

customElements.define('map-viewer', MapViewer);
