const estrusModule = (function() {
    let estrusData = null;
    
    // Colors for visualization
    const estrusColor = "#e84393";    // Pink/purple for estrus
    const nonEstrusColor = "#a29bfe"; // Light purple for non-estrus
    
    // Current filter state
    let currentFilter = 'both';
    
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
    
    // Function to create the estrus comparison chart
    function createEstrusComparisonChart(dataType = 'activity') {
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
                .attr("fill", "#EAEEF2")
                .attr("opacity", 0.7);

            svg.append("rect")
                .attr("x", x(12)) // Start at hour 12
                .attr("width", x(24) - x(12)) // Width spans from hour 12 to 24
                .attr("y", 0)
                .attr("height", height)
                .attr("fill", "#FFFAEB")
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
                .attr("transform", `translate(${width/2}, ${height + margin.bottom - 10})`)
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
            
            // Create tooltip
            const tooltip = d3.select("body").select(".tooltip");
            
            // Add estrus line with smoother curve (only if filter includes estrus)
            if (currentFilter === 'both' || currentFilter === 'estrus') {
                svg.append("path")
                    .datum(hourlyData)
                    .attr("class", "estrus-line")
                    .attr("fill", "none")
                    .attr("stroke", estrusColor)
                    .attr("stroke-width", 3.5)
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round")
                    .attr("d", d3.line()
                        .curve(d3.curveMonotoneX)
                        .x(d => x(d.hour))
                        .y(d => dataType === 'activity' ? y(d.estrusActivity) : y(d.estrusTemp))
                    );
            }
            
            // Add non-estrus line with smoother curve (only if filter includes non-estrus)
            if (currentFilter === 'both' || currentFilter === 'nonEstrus') {
                svg.append("path")
                    .datum(hourlyData)
                    .attr("class", "non-estrus-line")
                    .attr("fill", "none")
                    .attr("stroke", nonEstrusColor)
                    .attr("stroke-width", 3.5)
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round")
                    .attr("d", d3.line()
                        .curve(d3.curveMonotoneX)
                        .x(d => x(d.hour))
                        .y(d => dataType === 'activity' ? y(d.nonEstrusActivity) : y(d.nonEstrusTemp))
                    );
            }
            
            // Add circles for estrus data points (only if filter includes estrus)
            if (currentFilter === 'both' || currentFilter === 'estrus') {
                svg.selectAll(".estrus-dot")
                    .data(hourlyData)
                    .enter()
                    .append("circle")
                    .attr("class", "estrus-dot")
                    .attr("cx", d => x(d.hour))
                    .attr("cy", d => dataType === 'activity' ? y(d.estrusActivity) : y(d.estrusTemp))
                    .attr("r", 6)
                    .attr("fill", estrusColor)
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
                            ? d.estrusActivity.toFixed(1)
                            : d.estrusTemp.toFixed(2) + '°C';
                            
                        tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                                    <strong>Estrus ${dataType}:</strong> ${value}<br>
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
            
            // Add circles for non-estrus data points (only if filter includes non-estrus)
            if (currentFilter === 'both' || currentFilter === 'nonEstrus') {
                svg.selectAll(".non-estrus-dot")
                    .data(hourlyData)
                    .enter()
                    .append("circle")
                    .attr("class", "non-estrus-dot")
                    .attr("cx", d => x(d.hour))
                    .attr("cy", d => dataType === 'activity' ? y(d.nonEstrusActivity) : y(d.nonEstrusTemp))
                    .attr("r", 6)
                    .attr("fill", nonEstrusColor)
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
                            ? d.nonEstrusActivity.toFixed(1)
                            : d.nonEstrusTemp.toFixed(2) + '°C';
                            
                        tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                                    <strong>Non-Estrus ${dataType}:</strong> ${value}<br>
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
            
            // Add a legend that changes based on filter
            let legendData = [];

            // Add appropriate entries based on current filter
            if (currentFilter === 'both') {
                legendData = [
                    { label: "Estrus", color: estrusColor, type: "line" },
                    { label: "Non-Estrus", color: nonEstrusColor, type: "line" },
                    { label: "Light On", color: "#FFFAEB", type: "rect" },
                    { label: "Light Off", color: "#EAEEF2", type: "rect" }
                ];
            } else if (currentFilter === 'estrus') {
                legendData = [
                    { label: "Estrus", color: estrusColor, type: "line" },
                    { label: "Light On", color: "#FFFAEB", type: "rect" },
                    { label: "Light Off", color: "#EAEEF2", type: "rect" }
                ];
            } else {
                legendData = [
                    { label: "Non-Estrus", color: nonEstrusColor, type: "line" },
                    { label: "Light On", color: "#FFFAEB", type: "rect" },
                    { label: "Light Off", color: "#EAEEF2", type: "rect" }
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
        }).catch(error => {
            console.error("Error creating estrus comparison chart:", error);
            chartContainer.innerHTML = '<div class="error-message">Error loading estrus data</div>';
        });
    }
    
    // Function to create comparison bar charts
    function createEstrusBarCharts() {
        // Load data
        loadEstrusData().then(data => {
            const summaryData = [
                { condition: "Non-Estrus", avgActivity: data.summary.nonEstrus.activity, avgTemp: data.summary.nonEstrus.temperature },
                { condition: "Estrus", avgActivity: data.summary.estrus.activity, avgTemp: data.summary.estrus.temperature }
            ];
            
            // Activity chart
            const activityMargin = {top: 40, right: 30, bottom: 70, left: 60};
            const activityWidth = document.getElementById('estrusActivityChart').clientWidth - activityMargin.left - activityMargin.right;
            const activityHeight = 300 - activityMargin.top - activityMargin.bottom;
            
            d3.select("#estrusActivityChart").html("");
            
            const activitySvg = d3.select("#estrusActivityChart")
                .append("svg")
                .attr("width", activityWidth + activityMargin.left + activityMargin.right)
                .attr("height", activityHeight + activityMargin.top + activityMargin.bottom)
                .append("g")
                .attr("transform", `translate(${activityMargin.left},${activityMargin.top})`);
            
            // Add title
            activitySvg.append("text")
                .attr("x", activityWidth / 2)
                .attr("y", -activityMargin.top / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text("Activity Comparison: Estrus vs Non-Estrus");
            
            // X scale for activity
            const activityX = d3.scaleBand()
                .domain(summaryData.map(d => d.condition))
                .range([0, activityWidth])
                .padding(0.4);
            
            // Y scale for activity
            const activityY = d3.scaleLinear()
                .domain([0, d3.max(summaryData, d => d.avgActivity) * 1.2])
                .range([activityHeight, 0]);
            
            // Add gridlines
            activitySvg.append("g")
                .attr("class", "grid")
                .style("stroke-dasharray", "3 3")
                .style("opacity", 0.3)
                .call(d3.axisLeft(activityY)
                    .tickSize(-activityWidth)
                    .tickFormat("")
                );
            
            // Add X axis for activity
            activitySvg.append("g")
                .attr("transform", `translate(0,${activityHeight})`)
                .call(d3.axisBottom(activityX))
                .selectAll("text")
                .style("text-anchor", "middle")
                .style("font-size", "12px");
            
            // Add Y axis for activity
            activitySvg.append("g")
                .call(d3.axisLeft(activityY))
                .selectAll("text")
                .style("font-size", "11px");
            
            // Add Y axis label for activity
            activitySvg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -activityMargin.left + 15)
                .attr("x", -activityHeight/2)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Average Activity Level");
            
            // Create tooltip
            const tooltip = d3.select("body").select(".tooltip");
            
            // Add bars for activity with animation
            activitySvg.selectAll(".activity-bar")
                .data(summaryData)
                .enter()
                .append("rect")
                .attr("class", "activity-bar")
                .attr("x", d => activityX(d.condition))
                .attr("width", activityX.bandwidth())
                .attr("y", activityHeight) // Start from bottom for animation
                .attr("height", 0)         // Start with height 0 for animation
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
                        
                    tooltip.html(`<strong>${d.condition}</strong><br>Average Activity: ${d.avgActivity.toFixed(1)}`)
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
                .transition() // Add animation
                .duration(800)
                .attr("y", d => activityY(d.avgActivity))
                .attr("height", d => activityHeight - activityY(d.avgActivity));
            
            // Add labels for activity bars
            activitySvg.selectAll(".activity-label")
                .data(summaryData)
                .enter()
                .append("text")
                .attr("class", "activity-label")
                .attr("x", d => activityX(d.condition) + activityX.bandwidth()/2)
                .attr("y", d => activityY(d.avgActivity) - 10)
                .attr("text-anchor", "middle")
                .style("font-weight", "bold")
                .style("font-size", "14px")
                .style("opacity", 0) // Start invisible for animation
                .text(d => d.avgActivity.toFixed(1))
                .transition() // Add animation
                .delay(800)
                .duration(500)
                .style("opacity", 1);
            
            // Temperature chart
            const tempMargin = {top: 40, right: 30, bottom: 70, left: 60};
            const tempWidth = document.getElementById('estrusTempChart').clientWidth - tempMargin.left - tempMargin.right;
            const tempHeight = 300 - tempMargin.top - tempMargin.bottom;
            
            d3.select("#estrusTempChart").html("");
            
            const tempSvg = d3.select("#estrusTempChart")
                .append("svg")
                .attr("width", tempWidth + tempMargin.left + tempMargin.right)
                .attr("height", tempHeight + tempMargin.top + tempMargin.bottom)
                .append("g")
                .attr("transform", `translate(${tempMargin.left},${tempMargin.top})`);
            
            // Add title
            tempSvg.append("text")
                .attr("x", tempWidth / 2)
                .attr("y", -tempMargin.top / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-weight", "bold")
                .text("Temperature Comparison: Estrus vs Non-Estrus");
            
            // X scale for temperature
            const tempX = d3.scaleBand()
                .domain(summaryData.map(d => d.condition))
                .range([0, tempWidth])
                .padding(0.4);
            
            // Y scale for temperature
            const tempY = d3.scaleLinear()
                .domain([0, d3.max(summaryData, d => d.avgTemp) * 1.05])
                .range([tempHeight, 0]);
            
            // Add gridlines
            tempSvg.append("g")
                .attr("class", "grid")
                .style("stroke-dasharray", "3 3")
                .style("opacity", 0.3)
                .call(d3.axisLeft(tempY)
                    .tickSize(-tempWidth)
                    .tickFormat("")
                );
            
            // Add X axis for temperature
            tempSvg.append("g")
                .attr("transform", `translate(0,${tempHeight})`)
                .call(d3.axisBottom(tempX))
                .selectAll("text")
                .style("text-anchor", "middle")
                .style("font-size", "12px");
            
            // Add Y axis for temperature
            tempSvg.append("g")
                .call(d3.axisLeft(tempY))
                .selectAll("text")
                .style("font-size", "11px");
            
            // Add Y axis label for temperature
            tempSvg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -tempMargin.left)
                .attr("x", -tempHeight/2)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Average Body Temperature (°C)");
            
            // Add bars for temperature with animation
            tempSvg.selectAll(".temp-bar")
                .data(summaryData)
                .enter()
                .append("rect")
                .attr("class", "temp-bar")
                .attr("x", d => tempX(d.condition))
                .attr("width", tempX.bandwidth())
                .attr("y", tempHeight) // Start from bottom for animation
                .attr("height", 0)     // Start with height 0 for animation
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
                        
                    tooltip.html(`<strong>${d.condition}</strong><br>Average Temperature: ${d.avgTemp.toFixed(2)}°C`)
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
                .transition() // Add animation
                .duration(800)
                .attr("y", d => tempY(d.avgTemp))
                .attr("height", d => tempHeight - tempY(d.avgTemp));
            
            // Add labels for temperature bars
            tempSvg.selectAll(".temp-label")
                .data(summaryData)
                .enter()
                .append("text")
                .attr("class", "temp-label")
                .attr("x", d => tempX(d.condition) + tempX.bandwidth()/2)
                .attr("y", d => tempY(d.avgTemp) - 10)
                .attr("text-anchor", "middle")
                .style("font-weight", "bold")
                .style("font-size", "14px")
                .style("opacity", 0) // Start invisible for animation
                .text(d => d.avgTemp.toFixed(2) + "°C")
                .transition()
                .delay(800)
                .duration(500)
                .style("opacity", 1);
        }).catch(error => {
            console.error("Error creating estrus bar charts:", error);
            document.getElementById('estrusActivityChart').innerHTML = '<div class="error-message">Error loading estrus data</div>';
            document.getElementById('estrusTempChart').innerHTML = '<div class="error-message">Error loading estrus data</div>';
        });
    }
    
    // Update the chart based on data type selection
    function updateEstrusChartType(dataType) {
        createEstrusComparisonChart(dataType);
    }
    
    // Function to update the data filter
    function updateDataFilter(filter) {
        currentFilter = filter;
        
        // Get the current data type from active button
        const activeBtn = document.querySelector('.mode-btn.active');
        const dataType = activeBtn && activeBtn.id === 'temperatureModeBtn' ? 'temperature' : 'activity';
        
        // Redraw chart with new filter
        createEstrusComparisonChart(dataType);
    }
    
    return {
        loadEstrusData,
        createEstrusComparisonChart,
        createEstrusBarCharts,
        updateEstrusChartType,
        updateDataFilter
    };
})();

window.estrusModule = estrusModule;