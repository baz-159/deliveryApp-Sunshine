let deliveryDaysData = {};

fetch('Suburb.json')
    .then(response => response.json())
    .then(data => deliveryDaysData = data)
    .catch(error => console.error('Error loading delivery days data:', error));


// Fixed Price Suburbs List
// Currently empty for Nunawading, but can be populated with suburbs and prices if needed in the future.
const fixedPriceSuburbs = {
    'Craigieburn': 90,
    'Roxburgh Park': 90,
    'Mernda': 90,
    'Doreen': 90
};

// Rest of your existing script.js code...


let map;
let directionsService;
let directionsRenderer;

// Function to initialize the map and the Autocomplete
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: { lat: -37.8136, lng: 144.9631 } // Centered at Melbourne
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Initialize the Autocomplete
    initAutocomplete();
}

// Initialize the Google Places Autocomplete
function initAutocomplete() {
    var victoriaBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-39.224089, 140.961681), // Southwest coordinates of Victoria
        new google.maps.LatLng(-33.981281, 150.014707)  // Northeast coordinates of Victoria
    );

    new google.maps.places.Autocomplete(
        document.getElementById('location'), 
        {
            types: ['geocode'],
            componentRestrictions: {'country': 'AU'},
            bounds: victoriaBounds
        }
    );
}


// Event listener for the form submission
document.getElementById('deliveryForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents the form from submitting the traditional way
    let customerLocation = document.getElementById('location').value;

    // Always calculate and display the route
    calculateAndDisplayRoute('308-320 Settlement Rd, Thomastown VIC 3074', customerLocation);

    let fixedPriceSuburb = Object.keys(fixedPriceSuburbs).find(suburb => customerLocation.includes(suburb));
    if (fixedPriceSuburb) {
        // Display the fixed price in a uniform format
        document.getElementById('result').innerText = 'Calculated Delivery Price: $' + fixedPriceSuburbs[fixedPriceSuburb] + ' plus GST';
    } else {
        // Perform regular distance calculation if not a fixed price suburb
        calculateDistance(customerLocation);
    }
});



// Function to calculate the distance using the Google Maps Distance Matrix Service
function calculateDistance(customerLocation) {
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
        {
            origins: ['308-320 Settlement Rd, Thomastown VIC 3074'],
            destinations: [customerLocation],
            travelMode: 'DRIVING',
            unitSystem: google.maps.UnitSystem.METRIC,
        }, callback);
}

// Callback function for the Distance Matrix Service
function callback(response, status) {
    if (status == 'OK') {
        var origins = response.originAddresses;
        var destinations = response.destinationAddresses;
        for (var i = 0; i < origins.length; i++) {
            var results = response.rows[i].elements;
            for (var j = 0; j < results.length; j++) {
                var element = results[j];
                var distance = element.distance.text;
                var duration = element.duration.text;
                var from = origins[i];
                var to = destinations[j];
                console.log('Distance from ' + from + ' to ' + to + ' is ' + distance + ' and will take approximately ' + duration);
                calculateDeliveryPrice(element.distance.value); // Pass the distance in meters
            }
        }
    } else {
        console.log('Error with distance matrix request:', status);
    }
}

// Function to calculate and display the route on the map
function calculateAndDisplayRoute(origin, destination) {
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: 'DRIVING',
        provideRouteAlternatives: false // Change this to false if you're not interested in alternatives
    }, function(response, status) {
        if (status === 'OK') {
            // Directly set the directions on the map without searching for the shortest route
            directionsRenderer.setDirections(response);

            // Assuming the first route is the standard route
            let standardRouteDistance = response.routes[0].legs[0].distance.value;

            // Check if destination is a fixed price suburb
            let destinationSuburb = Object.keys(fixedPriceSuburbs).find(suburb => destination.includes(suburb));
            
            if (destinationSuburb) {
                // Set the fixed price for the suburb
                document.getElementById('result').innerText = 'Calculated Delivery Price: $' + fixedPriceSuburbs[destinationSuburb] + ' plus GST';
            } else {
                // Use the distance of the standard route for calculating the delivery price for non-fixed price suburbs
                calculateDeliveryPrice(standardRouteDistance);
            }

            // New code to extract and display suburb name
            extractAndDisplaySuburb(destination);

        } else {
            console.error('Directions request failed due to ' + status);
        }
    });
}

// New function to extract and display the suburb name
function extractAndDisplaySuburb(destinationAddress) {
    let geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': destinationAddress }, function(results, status) {
        if (status === 'OK') {
            let suburb = '';
            for (let component of results[0].address_components) {
                if (component.types.includes('locality')) {
                    suburb = component.long_name.toUpperCase();
                    break;
                }
            }
            if (suburb && deliveryDaysData[suburb]) {
                let availableDays = Object.entries(deliveryDaysData[suburb])
                    .filter(([day, available]) => available)
                    .map(([day, _]) => day)
                    .join(", ");

                let resultTextElement = document.getElementById('result');
                resultTextElement.innerHTML += `<br><br> ${suburb}<br> Delivery Days: ${availableDays}`;
            } else {
                let resultTextElement = document.getElementById('result');
                resultTextElement.innerHTML += `<br><br> ${suburb}<br> Delivery information not available`;
            }
        } else {
            console.error('Geocode was not successful for the following reason: ' + status);
        }
    });
}




// Function to calculate and display the delivery price
function calculateDeliveryPrice(distanceInMeters) {
    var distanceInKm = distanceInMeters / 1000;
    var calculatedPrice;
    var extraMessage = "";

    if (distanceInKm > 105) {
        var additionalDistance = distanceInKm - 105;
        var additionalCharge = additionalDistance * 2.50;
        calculatedPrice = 310 + additionalCharge;
        calculatedPrice = Math.ceil(calculatedPrice / 10) * 10; // Round up to nearest $10
        extraMessage = "<br><br><strong>Please give us a call to confirm a specific day for delivery.<br><br>The below day is just an estimate.";
    } else {
        // Existing pricing logic for distances up to 105 km
    if (distanceInKm <= 5) {
        calculatedPrice = 70;
    } else if (distanceInKm <= 10) {
        calculatedPrice = 80;
    } else if (distanceInKm <= 15) {
        calculatedPrice = 90;
    } else if (distanceInKm <= 20) {
        calculatedPrice = 100;
    } else if (distanceInKm <= 25) {
        calculatedPrice = 110;
    } else if (distanceInKm <= 35) {
        calculatedPrice = 120;
    } else if (distanceInKm <= 45) {
        calculatedPrice = 130;
    } else if (distanceInKm <= 55) {
        calculatedPrice = 140;
    } else if (distanceInKm <= 65) {
        calculatedPrice = 160;
    } else if (distanceInKm <= 75) {
        calculatedPrice = 190;
    } else if (distanceInKm <= 85) {
        calculatedPrice = 230;
    } else if (distanceInKm <= 95) {
        calculatedPrice = 270;
    } else if (distanceInKm <= 105) {
        calculatedPrice = 310;
    } 
}
    // Display the result on the page
    var resultText = 'Calculated Delivery Price: $' + calculatedPrice + ' plus GST' + extraMessage;
    document.getElementById('result').innerHTML = resultText;
}
