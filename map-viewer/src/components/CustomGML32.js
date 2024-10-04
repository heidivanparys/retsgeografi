import GML32 from 'ol/format/GML32.js';

class CustomGML32 extends GML32 {
    
    constructor(options) {
        super(options);
    }

    readFeatureElement(node, objectStack) {
        const feature = super.readFeatureElement(node, objectStack);
        feature.set('featureType', node.localName);
        return feature;
    }
}
export default CustomGML32;