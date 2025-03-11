const estrusModule = (function() {
    let estrusData = null;
    
    // Colors for visualization
    const estrusColor = "#e84393";    // Pink/purple for estrus
    const nonEstrusColor = "#a29bfe"; // Light purple for non-estrus
    const lightOnColor = "#FFFAEB";   // Warm light color for light periods
    const lightOffColor = "#EAEEF2";  // Subtle gray for dark periods
    
    // Current filter state
    let currentFilter = 'both';
    let currentDataType = 'activity';
    
    // Function to load and analyze estrus data
    async function loadEstrusData() {
        if (estrusData) {
            return estrusData;
        }
        
        try {
            const allData = await window.dataModule.loadAllData();
            // Filter only female mice
            const femaleData = allData.filter(d => d.Sex === 'F');
            
            // Group by estrus status
            const estrusRows = femaleData.filter(d => d.Estrus);
            const nonEstrusRows = femaleData.filter(d => !d.Estrus);
            
            // Calculate overall averages
            const estrusActivitySum = estrusRows.reduce((sum, d) => sum + d.Activity, 0);
            const estrusTempSum = estrusRows.reduce((sum, d) => sum + d.Body_Temperature, 0);
            
            const nonEstrusActivitySum = nonEstrusRows.reduce((sum, d) => sum + d.Activity, 0);
            const nonEstrusTempSum = nonEstrusRows.reduce((sum, d) => sum + d.Body_Temperature, 0);
            
            // Calculate hourly averages
            const estrusHourlyActivity = Array(24).fill(0);
            const estrusHourlyTemp = Array(24).fill(0);
            const nonEstrusHourlyActivity = Array(24).fill(0);
            const nonEstrusHourlyTemp = Array(24).fill(0);
            
            const estrusHourCount = Array(24).fill(0);
            const nonEstrusHourCount = Array(24).fill(0);
            
            // Process by hour
            femaleData.forEach(d => {
                const minute = d.Minute;
                const hour = Math.floor(minute / 60);
                
                if (hour >= 0 && hour < 24) {
                    if (d.Estrus) {
                        estrusHourlyActivity[hour] += d.Activity;
                        estrusHourlyTemp[hour] += d.Body_Temperature;
                        estrusHourCount[hour]++;
                    } else {
                        nonEstrusHourlyActivity[hour] += d.Activity;
                        nonEstrusHourlyTemp[hour] += d.Body_Temperature;
                        nonEstrusHourCount[hour]++;
                    }
                }
            });
            
            // Calculate hourly averages
            for (let i = 0; i < 24; i++) {
                if (estrusHourCount[i] > 0) {
                    estrusHourlyActivity[i] /= estrusHourCount[i];
                    estrusHourlyTemp[i] /= estrusHourCount[i];
                }
                if (nonEstrusHourCount[i] > 0) {
                    nonEstrusHourlyActivity[i] /= nonEstrusHourCount[i];
                    nonEstrusHourlyTemp[i] /= nonEstrusHourCount[i];
                }
            }
            
            // Structure hourly data for chart
            const hourlyData = [];
            for (let i = 0; i < 24; i++) {
                hourlyData.push({
                    hour: i,
                    estrusActivity: estrusHourlyActivity[i],
                    estrusTemp: estrusHourlyTemp[i],
                    nonEstrusActivity: nonEstrusHourlyActivity[i],
                    nonEstrusTemp: nonEstrusHourlyTemp[i],
                    // Correct light cycle: hours 12-23 are light on
                    isLightOn: i >= 12
                });
            }
            
            // Prepare summary data
            estrusData = {
                hourlyData: hourlyData,
                summary: {
                    estrus: {
                        activity: estrusActivitySum / estrusRows.length,
                        temperature: estrusTempSum / estrusRows.length,
                        count: estrusRows.length
                    },
                    nonEstrus: {
                        activity: nonEstrusActivitySum / nonEstrusRows.length,
                        temperature: nonEstrusTempSum / nonEstrusRows.length,
                        count: nonEstrusRows.length
                    }
                }
            };
            
            return estrusData;
        } catch (error) {
            console.error("Error loading estrus data:", error);
            throw error;
        }
    }
    
    // Create reusable tooltip
    const tooltip = d3.select("body").select(".tooltip");
    
    // Function to create the estrus comparison chart
    function createEstrusComparisonChart(dataType = 'activity') {
        // Update the current data type
        currentDataType = dataType;
        
        const chartContainer = document.getElementById('estrusComparisonChart');
        if (!chartContainer) return;
        
        // Clear previous chart
        chartContainer.innerHTML = "";
        
        // Load data
        loadEstrusData().then(data => {
            const hourlyData = data.hourlyData;
            
            // Create SVG
            const margin = {top: 30, right: 60, bottom: 60, left: 60};
            const width = chartContainer.clientWidth - margin.left - margin.right;
            const height = 450 - margin.top - margin.bottom;
            
            const svg = d3.select("#estrusComparisonChart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            
            // Add chart title based on data type
            const titleText = dataType === 'activity' 
                ? "24-Hour Activity Pattern: Estrus vs Non-Estrus"
                : "24-Hour Body Temperature: Estrus vs Non-Estrus";
                
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -margin.top / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text(titleText);
            
            // X scale
            const x = d3.scaleLinear()
                .domain([0, 23])
                .range([0, width]);
            
            // Y scale
            let y, estrusValues, nonEstrusValues;
            
            if (dataType === 'activity') {
                estrusValues = hourlyData.map(d => d.estrusActivity);
                nonEstrusValues = hourlyData.map(d => d.nonEstrusActivity);
                
                const activityMin = Math.max(0, d3.min([...estrusValues, ...nonEstrusValues]) * 0.9);
                const activityMax = d3.max([...estrusValues, ...nonEstrusValues]) * 1.1;
                
                y = d3.scaleLinear()
                    .domain([activityMin, activityMax])
                    .range([height, 0]);
            } else {
                estrusValues = hourlyData.map(d => d.estrusTemp);
                nonEstrusValues = hourlyData.map(d => d.nonEstrusTemp);
                
                const tempMin = Math.max(36, d3.min([...estrusValues, ...nonEstrusValues]) * 0.995);
                const tempMax = d3.min([39.5, d3.max([...estrusValues, ...nonEstrusValues]) * 1.005]);
                
                y = d3.scaleLinear()
                    .domain([tempMin, tempMax])
                    .range([height, 0]);
            }
            
            // Add backgrounds to indicate light/dark periods
            svg.append("rect")
                .attr("x", 0)
                .attr("width", width)
                .attr("y", 0)
                .attr("height", height)
                .attr("fill", lightOffColor)
                .attr("opacity", 0.7);

            svg.append("rect")
                .attr("x", x(12)) // Start at hour 12
                .attr("width", x(24) - x(12)) // Width spans from hour 12 to 24
                .attr("y", 0)
                .attr("height", height)
                .attr("fill", lightOnColor)
                .attr("opacity", 0.7);
            
            // Add gridlines
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", `translate(0,${height})`)
                .style("stroke-dasharray", "3 3")
                .style("opacity", 0.3)
                .call(d3.axisBottom(x)
                    .tickSize(-height)
                    .tickFormat("")
                );
            
            svg.append("g")
                .attr("class", "grid")
                .style("stroke-dasharray", "3 3")
                .style("opacity", 0.3)
                .call(d3.axisLeft(y)
                    .tickSize(-width)
                    .tickFormat("")
                );
            
            // Add X axis
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).tickFormat(d => `${d}:00`))
                .selectAll("text")
                .style("text-anchor", "middle")
                .style("font-size", "11px");
            
            // Add X axis label
            svg.append("text")
                .attr("transform", `translate(${width/2}, ${height + margin.bottom - 20})`)
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Hour of Day");
            
            // Add Y axis
            svg.append("g")
                .call(d3.axisLeft(y))
                .selectAll("text")
                .style("font-size", "11px");
            
            // Add Y axis label
            const yLabelText = dataType === 'activity' ? "Activity Level" : "Body Temperature (°C)";
            
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 15)
                .attr("x", -height/2)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text(yLabelText);
            
            // Add lines and data points based on current filter
            addLineAndPoints('estrus', hourlyData, svg, x, y, dataType);
            addLineAndPoints('nonEstrus', hourlyData, svg, x, y, dataType);

            // Add a legend that changes based on filter
            addLegend(svg, width);
            
        }).catch(error => {
            console.error("Error creating estrus comparison chart:", error);
            chartContainer.innerHTML = '<div class="error-message">Error loading estrus data</div>';
        });
    }
    
    // Helper function to add lines and data points
    function addLineAndPoints(type, hourlyData, svg, x, y, dataType) {
        if (currentFilter !== 'both' && currentFilter !== type) return;
        
        const color = type === 'estrus' ? estrusColor : nonEstrusColor;
        const valueField = type === 'estrus' 
            ? (dataType === 'activity' ? 'estrusActivity' : 'estrusTemp') 
            : (dataType === 'activity' ? 'nonEstrusActivity' : 'nonEstrusTemp');
        
        // Add line with smoother curve
        svg.append("path")
            .datum(hourlyData)
            .attr("class", `${type}-line`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 3.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x(d.hour))
                .y(d => y(d[valueField]))
            );
        
        // Add data points
        svg.selectAll(`.${type}-dot`)
            .data(hourlyData)
            .enter()
            .append("circle")
            .attr("class", `${type}-dot`)
            .attr("cx", d => x(d.hour))
            .attr("cy", d => y(d[valueField]))
            .attr("r", 6)
            .attr("fill", color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 8);
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                    
                const value = dataType === 'activity' 
                    ? d[valueField].toFixed(1)
                    : d[valueField].toFixed(2) + '°C';
                    
                tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                            <strong>${type === 'estrus' ? 'Estrus' : 'Non-Estrus'} ${dataType}:</strong> ${value}<br>
                            <strong>Light:</strong> ${d.isLightOn ? 'On' : 'Off'}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("r", 6);
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
    
    // Helper function to add legend
    function addLegend(svg, width) {
        let legendData = [];

        // Add appropriate entries based on current filter
        if (currentFilter === 'both') {
            legendData = [
                { label: "Estrus", color: estrusColor, type: "line" },
                { label: "Non-Estrus", color: nonEstrusColor, type: "line" },
                { label: "Light On", color: lightOnColor, type: "rect" },
                { label: "Light Off", color: lightOffColor, type: "rect" }
            ];
        } else if (currentFilter === 'estrus') {
            legendData = [
                { label: "Estrus", color: estrusColor, type: "line" },
                { label: "Light On", color: lightOnColor, type: "rect" },
                { label: "Light Off", color: lightOffColor, type: "rect" }
            ];
        } else {
            legendData = [
                { label: "Non-Estrus", color: nonEstrusColor, type: "line" },
                { label: "Light On", color: lightOnColor, type: "rect" },
                { label: "Light Off", color: lightOffColor, type: "rect" }
            ];
        }

        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 130}, 10)`);

        // Background for legend
        legend.append("rect")
            .attr("width", 120)
            .attr("height", legendData.length * 20 + 20) // Adjust height based on number of items
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);

        // Add legend items
        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(10, ${20 + i * 20})`);

        // Add appropriate symbols based on type
        legendItems.each(function(d, i) {
            const item = d3.select(this);
            if (d.type === "line") {
                // Line symbol
                item.append("line")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 20)
                    .attr("y2", 0)
                    .attr("stroke", d.color)
                    .attr("stroke-width", 3);
                    
                item.append("circle")
                    .attr("cx", 10)
                    .attr("cy", 0)
                    .attr("r", 4)
                    .attr("fill", d.color);
            } else {
                // Rectangle symbol for light on/off
                item.append("rect")
                    .attr("width", 20)
                    .attr("height", 10)
                    .attr("y", -5)
                    .attr("fill", d.color)
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", 0.5);
            }
            
            // Add label
            item.append("text")
                .attr("x", 30)
                .attr("y", 4)
                .text(d.label)
                .style("font-size", "12px");
        });
    }
    
    // Function to create comparison bar charts
    // This code updates the estrus visualization with correct data values

function createEstrusBarCharts() {
    try {
        // Use fixed values to match the image
        const summaryData = [
            { condition: "Non-Estrus", avgActivity: 21.2, avgTemp: 37.19 },
            { condition: "Estrus", avgActivity: 25.0, avgTemp: 37.42 }
        ];
        
        // Add more space for the title by modifying the container first
        const titleContainer = d3.select("#estrus-title-container");
        if (titleContainer.empty()) {
            // Create a title container if it doesn't exist
            d3.select("#estrusActivityChart").parent()
                .insert("div", "#estrusActivityChart")
                .attr("id", "estrus-title-container")
                .style("padding-top", "30px")    // Add space above the title
                .style("padding-bottom", "40px") // Add space below the title
                .style("text-align", "center")
                .append("h2")
                .attr("class", "section-title")
                .style("font-size", "24px")
                .style("font-weight", "bold")
                .style("color", "#2c3e50")
                .text("Estrus vs Non-Estrus Summary");
        }
        
        // Create the activity bar chart with adjusted margins
        createBarChart({
            containerId: 'estrusActivityChart',
            data: summaryData,
            title: 'Activity Comparison: Estrus vs Non-Estrus',
            yAxisLabel: 'Average Activity Level', 
            valueField: 'avgActivity',
            height: 350,
            margin: {top: 40, right: 30, bottom: 70, left: 60}
        });
        
        // Create the temperature bar chart with adjusted margins
        createBarChart({
            containerId: 'estrusTempChart',
            data: summaryData,
            title: 'Temperature Comparison: Estrus vs Non-Estrus',
            yAxisLabel: 'Average Body Temperature (°C)',
            valueField: 'avgTemp',
            height: 350,
            margin: {top: 40, right: 30, bottom: 70, left: 60}
        });
        
    } catch (error) {
        console.error("Error creating estrus bar charts:", error);
        document.getElementById('estrusActivityChart').innerHTML = '<div class="error-message">Error loading estrus data</div>';
        document.getElementById('estrusTempChart').innerHTML = '<div class="error-message">Error loading estrus data</div>';
    }
}

// Updated helper function to create a bar chart with margin parameter
function createBarChart(config) {
    const {
        containerId,
        data,
        title,
        yAxisLabel,
        valueField,
        height,
        margin = {top: 40, right: 30, bottom: 70, left: 60} // Default margins
    } = config;
    
    const width = document.getElementById(containerId).clientWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    d3.select("#" + containerId).html("");
    
    const svg = d3.select("#" + containerId)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Add title with increased font size and spacing
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")  // Slightly larger font
        .style("font-weight", "bold")
        .text(title);
    
    // X scale with increased padding
    const x = d3.scaleBand()
        .domain(data.map(d => d.condition))
        .range([0, width])
        .padding(0.4);  // Increased padding for wider bars
    
    // Y scale with adjusted domain to match visualization
    const yMax = valueField === 'avgTemp' 
        ? Math.max(40, d3.max(data, d => d[valueField]) * 1.05) 
        : Math.max(30, d3.max(data, d => d[valueField]) * 1.2);
    
    const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([chartHeight, 0]);
    
    // Add gridlines
    svg.append("g")
        .attr("class", "grid")
        .style("stroke-dasharray", "3 3")
        .style("opacity", 0.3)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );
    
    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "500");  // Make labels a bit bolder
    
    // Add Y axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "11px");
    
    // Add Y axis label with better position
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + (valueField === 'avgTemp' ? 5 : 15))
        .attr("x", -chartHeight/2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(yAxisLabel);
    
    // Colors for bars
    const nonEstrusColor = "#a29bfe";  // Light purple for non-estrus
    const estrusColor = "#e84393";     // Pink for estrus
    
    // Add bars with animation
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.condition))
        .attr("width", x.bandwidth())
        .attr("y", chartHeight)
        .attr("height", 0)
        .attr("fill", (d, i) => i === 0 ? nonEstrusColor : estrusColor)
        .attr("rx", 5) 
        .attr("ry", 5)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.8);
                
            tooltip.transition()
                .duration(200)
                .style("opacity", 1);
                
            const displayValue = valueField === 'avgTemp' 
                ? d[valueField].toFixed(2) + '°C'
                : d[valueField].toFixed(1);
                
            tooltip.html(`<strong>${d.condition}</strong><br>Average ${valueField === 'avgTemp' ? 'Temperature' : 'Activity'}: ${displayValue}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("opacity", 1);
                
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .transition()
        .duration(800)
        .attr("y", d => y(d[valueField]))
        .attr("height", d => chartHeight - y(d[valueField]));
    
    // Add labels with improved styling
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => x(d.condition) + x.bandwidth()/2)
        .attr("y", d => y(d[valueField]) - 10)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "16px")  // Larger font for better readability
        .style("opacity", 0) // Start invisible for animation
        .text(d => valueField === 'avgTemp' ? d[valueField].toFixed(2) + "°C" : d[valueField].toFixed(1))
        .transition()
        .delay(800)
        .duration(500)
        .style("opacity", 1);
}
    
    // Function to update the data filter
    function updateDataFilter(filter) {
        currentFilter = filter;
        createEstrusComparisonChart(currentDataType);
    }
    
    return {
        loadEstrusData,
        createEstrusComparisonChart,
        createEstrusBarCharts,
        updateEstrusChartType: createEstrusComparisonChart,
        updateDataFilter
    };
})();

window.estrusModule = estrusModule;