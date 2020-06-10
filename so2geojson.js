/*
 Conversion of schema.org spatial information to GeoJSON.
 
 Draft version.
 
 Assumes framing of schema.org content has occurred.
*/
function parseElevation(elevs) {
  if (isFloat(elevs)) {
    return elevs;
  }
  try {
  	return parseFloat(elevs)
  } catch(e) {
    // Handle units
  }
  let parts = elevs.split(" ");
  let units = parts[1].toLowerCase();
  let value = parseFloat(parts[0].replace(",",""));
  let conversion = {
    "m":1.0,
    "ft":3.28084
  }
  return value * conversion[units];
}

function schemaCoordStringToCoords(gs) {
  var coords = gs.split(" ");
  for (var i=0; i<coords.length; i++) {
    coords[i] = parseFloat(coords[i]);
  }
	return coords  
}

function schemaCoordStringToPoints(gs, elev) {
  let coords = schemaCoordStringToCoords(gs);
  let points = [];
  for (var i=0; i<coords.length; i+=2) {
    let coord = [coords[i+1], coords[i]];
    if (elev !== null) {
      coord.push(elev)
    }
  	points.push(coord);
  }
  return points
}

function schemaCoordStringToPolygon(gs, elev) {
	return [schemaCoordStringToPoints(gs, elev)];
}

function boxToPolygon(box, elev) {
  var points = schemaCoordStringToCoords(box);
	var poly = [];
  poly.push([points[1], points[0]])
  poly.push([points[1], points[2]])
  poly.push([points[3], points[2]])
  poly.push([points[3], points[0]])
  if (elev !== null) {
    for (var i=0; i<poly.length; i++) {
      let c = poly[i];
      poly[i].push(elev);
      poly[i] = c;
    }
  }
  return [poly];
}

function GeoShapeToGeometry(shp) {
  let geom = {};
  let elev = null;
  try {
    elev = parseElevation(shp.elevation);
  } catch(e) {
    // no elevation
  }
  if ("box" in shp) {
  	geom.type = "Polygon";
    geom.coordinates = boxToPolygon(shp.box, elev);
  } else if ("circle" in shp) {
    //TODO: circles are funky in geojson
  } else if ("polygon" in shp) {
  	geom.type = "Polygon";
    geom.coordinates = schemaCoordStringToPolygon(shp.line, elev);
  } else if ("line" in shp) {
  	geom.type = "LineString";
    geom.coordinates = schemaCoordStringToPoints(shp.line, elev);
  }
  return geom;
}

function GeoCoordinatesToGeoJSON(cds) {
	let geom = {
    type:"Point",
    coordinates: [
    	parseFloat(cds.longitude),
      parseFloat(cds.latitude)
    ]
  };
  try {
    let elev = parseElevation(cds.elevation);
    geom.coordinates.push(elev);
  } catch(e) {
  	//no elevation
  }
  return geom;
}

function placeToGeoJSON(place) {
  var feat = {
    type:"Feature",
    properties:{},
    geometry:{}
  }
  //TODO: place may itself have latitude, longitude etc, though
  //oddly, no elevation....
  if (place.geo["@type"] === "GeoShape") {
    feat.geometry = GeoShapeToGeometry(place.geo)
  } else if (place.geo["@type"] === "GeoCoordinates") {
  	feat.geometry = GeoCoordinatesToGeoJSON(place.geo);
  }
  if ("address" in place.geo){
    feat.properties.address = place.geo.address;
  }
  if ("addressCountry" in place.geo){
    feat.properties.country = place.geo.addressCountry;
  }
  if ("postalCode" in place.geo){
    feat.properties.postalCode = place.geo.postalCode;
  }
  return feat;
}
