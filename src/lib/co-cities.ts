/**
 * Ciudades de Colombia con coordenadas [longitud, latitud] para ubicarlas en el
 * mapa (react-simple-maps) SIN geocodificar ni consumir APIs de mapas.
 * Cubre las capitales de departamento y algunas ciudades principales.
 */

export const CO_CITIES: Record<string, [number, number]> = {
  'Bogotá': [-74.0721, 4.711],
  'Medellín': [-75.5636, 6.2518],
  'Cali': [-76.532, 3.4516],
  'Barranquilla': [-74.7813, 10.9685],
  'Cartagena': [-75.5144, 10.391],
  'Cúcuta': [-72.5078, 7.8939],
  'Bucaramanga': [-73.1198, 7.1193],
  'Pereira': [-75.6961, 4.8133],
  'Santa Marta': [-74.199, 11.2408],
  'Ibagué': [-75.2322, 4.4389],
  'Manizales': [-75.5138, 5.0703],
  'Villavicencio': [-73.6266, 4.142],
  'Pasto': [-77.2811, 1.2136],
  'Montería': [-75.8814, 8.7479],
  'Neiva': [-75.2819, 2.9273],
  'Armenia': [-75.6811, 4.5389],
  'Popayán': [-76.6132, 2.4448],
  'Valledupar': [-73.2532, 10.4631],
  'Sincelejo': [-75.3978, 9.3047],
  'Tunja': [-73.362, 5.5353],
  'Riohacha': [-72.9072, 11.5444],
  'Florencia': [-75.6113, 1.6144],
  'Yopal': [-72.3959, 5.3378],
  'Quibdó': [-76.6612, 5.6919],
  'Mocoa': [-76.6483, 1.1519],
  'Arauca': [-70.7591, 7.0847],
  'San Andrés': [-81.7006, 12.5847],
  'Leticia': [-69.9406, -4.2153],
  'Inírida': [-67.9239, 3.8653],
  'Mitú': [-70.234, 1.2538],
  'Puerto Carreño': [-67.4859, 6.189],
  'Soacha': [-74.2168, 4.5794],
};

export const CO_CITY_NAMES = Object.keys(CO_CITIES).sort((a, b) => a.localeCompare(b));
