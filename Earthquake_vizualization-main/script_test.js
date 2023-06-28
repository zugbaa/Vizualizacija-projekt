// Create the SVG container
const svg = d3.select("#map")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .style("background-color", "#333");

// Create a group to contain the map elements
const mapGroup = svg.append("g");

// Create a zoom behavior
const zoom = d3.zoom()
  .scaleExtent([1, 50])
  .translateExtent([[0, 0],[2000,1000]])
  .on("zoom", zoomed);

// Attach the zoom behavior to the SVG container
svg.call(zoom);


// Create a drag behavior
const drag = d3.drag()
  .on("start", dragStarted)
  .on("drag", dragged)
  .on("end", dragEnded);

// Attach the drag behavior to the map group
mapGroup.call(drag);

// Variables to store the current transform and scale
let currentTransform = d3.zoomIdentity;
let currentScale = 1;

// Function to handle zooming
function zoomed(event) {
  currentTransform = event.transform;
  currentScale = event.transform.k;

  // Adjust the radius and opacity of the circles based on the current scale
  const radius = 10 / currentScale;
  const opacity = currentScale <= 6 ? 0.5 : 0.3;

  mapGroup.attr("transform", currentTransform);

  if (currentScale <= 4) {
    mapGroup.selectAll("circle")
      .attr("r", function(d) {
        if (+d3.select(this).attr("data-magnitude") >= 8) {
          return radius;
        } else {
          return 0;
        }
      });    
  } else if (currentScale <= 5) {
    mapGroup.selectAll("circle")
      .attr("r", function(d) {
        if (+d3.select(this).attr("data-magnitude") >= 7) {
          return radius;
        } else {
          return 0;
        }
      });
  } else if (currentScale <= 16) {
    mapGroup.selectAll("circle")
      .attr("r", function(d) {
        if (+d3.select(this).attr("data-magnitude") >= 7) {
          return radius;
        } else {
          return 0;
        }
      });
  } else {
    mapGroup.selectAll("circle")
      .attr("r", radius);
  }
}

// Function to handle drag start
function dragStarted(event) {
  // Prevent zooming while dragging
  if (!event.active) svg.call(zoom);
}

// Function to handle dragging
function dragged(event) {
  const dx = event.dx / currentScale;
  const dy = event.dy / currentScale;

  currentTransform = currentTransform.translate(dx, dy);

  mapGroup.attr("transform", currentTransform);
}

// Function to handle drag end
function dragEnded(event) {
  // Enable zooming after dragging
  if (!event.active) svg.call(zoom.transform, currentTransform);
}

// Load the map data (e.g., TopoJSON)
d3.json("world.json").then(function (data) {
  // Convert the TopoJSON to GeoJSON
  const countries = topojson.feature(data, data.objects.countries);

  // Get the client's screen dimensions
  const screenWidth = 2000;
  const screenHeight = 1000;

  // Create a projection for the map based on the screen size
  const projection = d3.geoMercator()
    .fitSize([screenWidth, screenHeight], countries)
    .translate([screenWidth / 2, screenHeight / 2]); // Center the map

  // Create a path generator
  const path = d3.geoPath()
    .projection(projection);

  // Update the SVG container dimensions
  svg.attr("width", screenWidth).attr("height", screenHeight);

  // Render the map
  mapGroup.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("fill", function(d) {
      // Set the color based on the geometry type
      return d.geometry.type === "Polygon" || d.geometry.type === "MultiPolygon" ? "black" : "lightblue";
    });

  // Load the CSV data
  d3.csv("earthquake_data.csv").then(function (csvData) {
    // Process each data point
    csvData.forEach(function (d) {
      const longitude = +d.longitude;
      const latitude = +d.latitude;
      const magnitude = +d.magnitude;

      // Convert longitude and latitude to coordinates on the map
      const coordinates = projection([longitude, latitude]);

      // Function to map magnitude value to color
      function getColor(magnitudeValue) {
        if (magnitudeValue < 7) {
          return "green";   // Set color to green for magnitude less than 6
        } else if (magnitudeValue >= 7 && magnitudeValue < 8) {
          return "yellow";  // Set color to yellow for magnitude between 6 and 7
        } else if (magnitudeValue >= 8 && magnitudeValue < 9) {
          return "orange";  // Set color to orange for magnitude between 7 and 8
        } else if (magnitudeValue >= 9) {
          return "red";  // Set color to purple for magnitude greater than or equal to 9
        } else {
          return "#90EE90";    // Set color to gray for other cases
        }
      }

      // Function to handle mouseover event
      function circleMouseOver() {
        const radius = 12 / currentScale;
        const opacity = currentScale <= 6 ? 1 : 0.7;

        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", radius)
          .style("opacity", opacity);
      }

      // Function to handle mouseout event
      function circleMouseOut() {
        const radius = 10 / currentScale;
        const opacity = currentScale <= 6 ? 0.5 : 0.3;

        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", radius)
          .style("opacity", opacity);
      }

      function circleClick() {
        const magnitudeValue = +d3.select(this).attr("data-magnitude");
        const location = d.location;
        const time = d.date_time;
        const tsunami = d.tsunami;
        const magType = d.magType;
        const depth = d.depth;
        const latitude  = d.latitude ;
        const longitude = d.longitude;
        const popup = d3.select("#popup");
      
        // Show the pop-up
        popup.style("display", "block");
      
        popup.html(
          "<div class='popup-content'>" +
          "<h3>Earthquake Information</h3>" +
          "<p><strong>Magnitude:</strong> " + magnitudeValue + "</p>" +
          "<p><strong>Location:</strong> " + location + "</p>" +
          "<p><strong>Time:</strong> " + time + "</p>" +
          "<p><strong>Tsunami:</strong> " + tsunami + "</p>" +
          "<p><strong>Method used to calculate the preferred magnitude for the event:</strong> " + magType + "</p>" +
          "<p><strong>Depth:</strong> " + depth + "</p>" +
          "<p><strong>Latitude:</strong> " + latitude + "</p>" +
          "<p><strong>Longitude:</strong> " + longitude + "</p>" +
          "<button type='button' class='btn-close' aria-label='Close'></button>" +
          "</div>"
        );
        popup.select(".btn-close").on("click", closePopup);
      }
      // Function to handle close button click
      function closePopup() {
        const popup = d3.select("#popup");
        popup.html(""); // Remove the HTML content of the pop-up
        popup.style("display", "none");
      }

      // Append a circle for each data point
      mapGroup.append("circle")
        .attr("cx", coordinates[0])
        .attr("cy", coordinates[1])
        .attr("r", 10 / currentScale)
        .attr("data-magnitude", magnitude) // Add data-magnitude attribute
        .style("fill", getColor(magnitude))
        .style("opacity", currentScale <= 6 ? 0.5 : 0.3)
        .on("mouseover", circleMouseOver) // Add mouseover event listener
        .on("mouseout", circleMouseOut) // Add mouseout event listener
        .on("click", circleClick); // Add click event listener
    });
  });
});
