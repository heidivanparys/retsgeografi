// MapViewer.js

import { LitElement, html, css } from 'lit';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer } from 'ol/layer';
import { OSM, WMTS } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import svg from '@dataforsyningen/designsystem/assets/icons.svg'
import { Style, Stroke, Fill } from 'ol/style.js';
import GML32 from 'ol/format/GML32.js';
import { register } from 'ol/proj/proj4';
import { get } from 'ol/proj';
import proj4 from 'proj4';
import CustomGML32 from './CustomGML32.js';

// Define and register the projection for EPSG:25832
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs +axis=enu');
proj4.defs('http://www.opengis.net/def/crs/EPSG/0/25832', proj4.defs('EPSG:25832'));
register(proj4);

// Get the EPSG:25832 projection
const epsg25832 = get('EPSG:25832');

class MapViewer extends LitElement {
  static styles = css`
      
      htm, div {
          font-family: Helvetica;
      }
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

      #layer-toggles {
          position: absolute;
          width: auto !important;
          height: auto !important;
          bottom: 20px;
          left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .control-label {
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

      button, label {

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

      #layer-toggles {
          display: flex;
          flex-direction: column;
          gap: 5px;
      }
  `;

  constructor() {
    super();
    this.showSecondMap = false;
    this.vectorLayers = [];  // Store added vector layers
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

  uploadFiles(event) {
    const files = event.target.files;
    const gmlFile = [...files].find(file => file.name.endsWith('.gml'));
    const xsdFile = [...files].find(file => file.name.endsWith('.xsd'));

    if (gmlFile) {
      const gmlReader = new FileReader();
      gmlReader.onload = () => this.loadGML(gmlReader.result);
      gmlReader.readAsText(gmlFile);

    } else if (xsdFile) {
      const xsdReader = new FileReader();
      xsdReader.onload = () => this.loadXSD(xsdReader.result);
      xsdReader.readAsText(xsdFile);
    }
  }

  loadGML(gmlString) {
    const format = new CustomGML32();  // Assuming GML 3.2 format
    let features;

    try {
      // Read features from the GML file
      features = format.readFeatures(gmlString, {
        featureProjection: 'EPSG:25832',  // Ensure the correct projection is used
        dataProjection: 'EPSG:25832',  // Use dataProjection if your GML file specifies the data projection
      });
    } catch (error) {
      console.error('Error parsing GML:', error);
      return;
    }
    console.log('Loaded features:', features)

    // Group features by 'type' property, with a fallback for undefined names
    const featureGroups = {};
    features.forEach(feature => {
      // get property featureType set by CustomGML32
      const featureType = feature.get('featureType') || 'Unnamed Type';  // Use fallback for undefined types
      if (!featureGroups[featureType]) {
        featureGroups[featureType] = [];
      }
      featureGroups[featureType].push(feature);
    });

    // For each group, create a vector layer and add a checkbox for toggling its visibility
    Object.keys(featureGroups).forEach(featureType => {
      const vectorSource = new VectorSource({
        features: featureGroups[featureType],
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        title: featureType,  // Set the feature type as the title for the toggle control
        visible: true,  // Set the layer to be visible by default
      });

      // Add the layer to the map
      this.map1.addLayer(vectorLayer);
      this.vectorLayers.push(vectorLayer);  // Store the layer for later toggling

      // Dynamically create a checkbox for toggling this layer
      const layerToggles = this.shadowRoot.getElementById('layer-toggles');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;  // Set to checked by default (layer is visible)
      checkbox.addEventListener('change', () => this.toggleLayer(vectorLayer));

      // Create a label for the checkbox
      const label = document.createElement('label');
      label.textContent = featureType;  // Display the feature type as the label text
      label.prepend(checkbox);  // Add the checkbox to the label

      // Append the label (with checkbox) to the toggle controls section
      layerToggles.appendChild(label);
    });
  }


  loadXSD(xsdString) {
    const descriptions = this.parseXSD(xsdString);
    console.log('Parsed XSD descriptions:', descriptions);
  }

  parseXSD(xsdString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xsdString, "application/xml");

    const descriptions = {};

    // Extract top-level elements
    const elements = xmlDoc.getElementsByTagName('element');
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const name = element.getAttribute('name');
      const type = element.getAttribute('type');
      const doc = this.extractDocumentation(element);

      if (name && type) {
        descriptions[name] = { type, doc };
      }
    }

    // Extract complex types and their sequences
    const complexTypes = xmlDoc.getElementsByTagName('complexType');
    for (let i = 0; i < complexTypes.length; i++) {
      const complexType = complexTypes[i];
      const typeName = complexType.getAttribute('name');
      const sequence = complexType.getElementsByTagName('sequence')[0];

      if (sequence) {
        const childElements = sequence.getElementsByTagName('element');
        descriptions[typeName] = [];

        for (let j = 0; j < childElements.length; j++) {
          const child = childElements[j];
          const childName = child.getAttribute('name');
          const childType = child.getAttribute('type');
          const childDoc = this.extractDocumentation(child);

          if (childName && childType) {
            descriptions[typeName].push({ name: childName, type: childType, doc: childDoc });
          }
        }
      }
    }

    return descriptions;
  }

  extractDocumentation(element) {
    const annotation = element.getElementsByTagName('annotation')[0];
    if (annotation) {
      const documentation = annotation.getElementsByTagName('documentation')[0];
      if (documentation) {
        return documentation.textContent.trim();
      }
    }
    return null;
  }


  toggleLayer(layer) {
    layer.setVisible(!layer.getVisible());
  }

  render() {
    return html`
      <div id="map-container">
        <div id="map1" class="map"></div>
        <div id="layer-toggles"></div>


        <div id="controls">
          <button class="control-label" @click="${this.zoomIn}" title="Zoom In">
            <svg>
              <use href="${svg}#plus"></use>
            </svg>
          </button>
          <button class="control-label" @click="${this.zoomOut}" title="Zoom Out">
            <svg>
              <use href="${svg}#minus"></use>
            </svg>
          </button>
          <input type="file" id="file-input" multiple @change="${this.uploadFiles}" />
          <label class="control-label" for="file-input" title="Upload GML & XSD">
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
