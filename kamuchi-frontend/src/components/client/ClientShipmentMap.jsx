import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Mock geocoding for common locations in the Kamuchi routes
const LOCATION_COORDS = {
    'Algeciras': [36.1408, -5.4562],
    'Tanger': [35.7595, -5.8340],
    'Port Tanger Méditerranée': [35.8914, -5.5033],
    'Casablanca': [33.5731, -7.5898],
    'Agadir': [30.4278, -9.5981],
    'Safi': [32.2994, -9.2372],
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3851, 2.1734],
};

const ClientShipmentMap = ({ shipment }) => {
    if (!shipment) return null;

    // Detect route points from shipment location or destination
    // For now, let's use location as current and destination as target
    const currentLocationName = shipment.location || 'Tanger';
    const destinationName = shipment.sortie || 'Casablanca';

    const startPos = LOCATION_COORDS[currentLocationName] || LOCATION_COORDS['Tanger'];
    const endPos = LOCATION_COORDS[destinationName] || LOCATION_COORDS['Casablanca'];

    return (
        <div className="shipment-map-card card">
            <div className="card-header">
                <h3><Navigation size={18} /> Real-time Trajectory</h3>
                <span className="location-badge">{currentLocationName} → {destinationName}</span>
            </div>
            <div className="map-wrapper" style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
                <MapContainer center={startPos} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={startPos}>
                        <Popup>Current Location: {currentLocationName}</Popup>
                    </Marker>
                    <Marker position={endPos}>
                        <Popup>Destination: {destinationName}</Popup>
                    </Marker>
                    <Polyline positions={[startPos, endPos]} color="#0f3460" weight={3} dashArray="10, 10" />
                </MapContainer>
            </div>
            <div className="map-footer">
                <p>Status: <strong style={{color: '#10b981'}}>{shipment.status}</strong></p>
                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
        </div>
    );
};

export default ClientShipmentMap;
