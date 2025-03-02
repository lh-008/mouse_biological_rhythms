const chartsModule = (function() {
    // Initialize tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "rgba(255, 255, 255, 0.95)")
        .style("border", "1px solid #ddd")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)");
    
    // color scheme
    const activityColor = "#4682B4";    // Steel blue for activity
    const tempColor = "#E67E22";        // Softer orange for temperature
    const lightOnColor = "#FFFAEB";     // Warm light color for light periods
    const lightOffColor = "#EAEEF2";    // Subtle gray for dark periods
    
    // Store current hourly data
    let currentHourlyData = [];
    
    // Function to create the 24-hour activity chart
    function createActivityChart(hourlyData = currentHourlyData) {    
        const margin = {top: 50, right: 60, bottom: 60, left: 60};
        const width = document.getElementById('activityChart').clientWidth - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;
        
        // Clear previous chart if any
        d3.select("#activityChart").html("");
        
        const svg = d3.select("#activityChart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Add chart title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("24-Hour Activity and Temperature Pattern");
        
        // X scale
        const x = d3.scaleLinear()
            .domain([0, 23])
            .range([0, width]);
        
        // Y scale for activity
        const activityRange = calculateYAxisRange(
            hourlyData, 
            d => d.avgActivity, 
            0,    // minimum should never be below 0
            60,   // reasonable upper bound
            0.15  // 15% padding
        );
  
        const yActivity = d3.scaleLinear()
            .domain(activityRange)
            .range([height, 0]);
  
        // For temperature Y-axis
        const tempRange = calculateYAxisRange(
            hourlyData, 
            d => d.avgTemp, 
            35.0,  // reasonable lower bound for mouse temperature
            39.0,  // reasonable upper bound for mouse temperature
            0.1    // 10% padding
        );
  
        const yTemp = d3.scaleLinear()
            .domain(tempRange)
            .range([height, 0]);
        
        // Add backgrounds to indicate light/dark periods
        hourlyData.forEach((d, i) => {
            if (i < hourlyData.length - 1) {
                svg.append("rect")
                    .attr("x", x(d.hour))
                    .attr("width", x(d.hour + 1) - x(d.hour))
                    .attr("y", 0)
                    .attr("height", height)
                    .attr("fill", d.isLightOn ? lightOnColor : lightOffColor)
                    .attr("opacity", 0.7);
            }
        });
        
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
            .call(d3.axisLeft(yActivity)
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
        
        // Add left Y axis for activity
        svg.append("g")
            .call(d3.axisLeft(yActivity))
            .selectAll("text")
            .style("font-size", "11px");
        
        // Add left Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Activity Level");
        
        // Add right Y axis for temperature
        svg.append("g")
            .attr("transform", `translate(${width},0)`)
            .call(d3.axisRight(yTemp).tickFormat(d => `${d.toFixed(1)}`))
            .selectAll("text")
            .style("font-size", "11px");
        
        // Add right Y axis label
        svg.append("text")
            .attr("transform", "rotate(90)")
            .attr("y", -width - margin.right + 15)
            .attr("x", height/2)
            .attr("dy", "0em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Body Temperature (°C)");
        
        // Add activity line with smoother curve
        svg.append("path")
            .datum(hourlyData)
            .attr("fill", "none")
            .attr("stroke", activityColor)
            .attr("stroke-width", 3.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x(d.hour))
                .y(d => yActivity(d.avgActivity))
            );
        
        // Add temperature line with smoother curve
        svg.append("path")
            .datum(hourlyData)
            .attr("fill", "none")
            .attr("stroke", tempColor)
            .attr("stroke-width", 3.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x(d.hour))
                .y(d => yTemp(d.avgTemp))
            );
        
        // Add circles for activity data points
        svg.selectAll(".activity-dot")
            .data(hourlyData)
            .enter()
            .append("circle")
            .attr("class", "activity-dot")
            .attr("cx", d => x(d.hour))
            .attr("cy", d => yActivity(d.avgActivity))
            .attr("r", 6)
            .attr("fill", activityColor)
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
                    
                tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                             <strong>Activity:</strong> ${d.avgActivity.toFixed(1)}<br>
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
        
        // Add circles for temperature data points
        svg.selectAll(".temp-dot")
            .data(hourlyData)
            .enter()
            .append("circle")
            .attr("class", "temp-dot")
            .attr("cx", d => x(d.hour))
            .attr("cy", d => yTemp(d.avgTemp))
            .attr("r", 6)
            .attr("fill", tempColor)
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
                    
                tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                             <strong>Temperature:</strong> ${d.avgTemp.toFixed(2)}°C<br>
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
        
        // Add legend
        const legendData = [
            { label: "Activity", color: activityColor, type: "line" },
            { label: "Temperature", color: tempColor, type: "line" },
            { label: "Light On", color: lightOnColor, type: "rect" },
            { label: "Light Off", color: lightOffColor, type: "rect" }
        ];
        
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 130}, 10)`);
        
        // Background for legend
        legend.append("rect")
            .attr("width", 120)
            .attr("height", 100)
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
    
    // Function to create bar charts for light vs dark comparison
    function createLightDarkCharts() {
        const data = window.dataModule.getLightDarkData();
        
        // Activity chart
        const activityMargin = {top: 40, right: 30, bottom: 70, left: 60};
        const activityWidth = document.getElementById('lightDarkActivityChart').clientWidth - activityMargin.left - activityMargin.right;
        const activityHeight = 300 - activityMargin.top - activityMargin.bottom;
        
        d3.select("#lightDarkActivityChart").html("");
        
        const activitySvg = d3.select("#lightDarkActivityChart")
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
            .text("Activity Comparison: Light vs Dark");
        
        // X scale for activity
        const activityX = d3.scaleBand()
            .domain(data.map(d => d.condition))
            .range([0, activityWidth])
            .padding(0.4);
        
        // Y scale for activity
        const activityY = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgActivity) * 1.2])
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
        
        // Create gradient for bars
        const activityGradient = activitySvg.append("defs")
            .append("linearGradient")
            .attr("id", "activity-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
            
        activityGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#3498db")
            .attr("stop-opacity", 1);
            
        activityGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#2980b9")
            .attr("stop-opacity", 0.8);
        
        // Add bars for activity with animation
        activitySvg.selectAll(".activity-bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "activity-bar")
            .attr("x", d => activityX(d.condition))
            .attr("width", activityX.bandwidth())
            .attr("y", activityHeight) // Start from bottom for animation
            .attr("height", 0)         // Start with height 0 for animation
            .attr("fill", (d, i) => i === 0 ? "#34495e" : "url(#activity-gradient)")
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
            .transition()
            .duration(800)
            .attr("y", d => activityY(d.avgActivity))
            .attr("height", d => activityHeight - activityY(d.avgActivity));
        
        // Add labels for activity bars
        activitySvg.selectAll(".activity-label")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "activity-label")
            .attr("x", d => activityX(d.condition) + activityX.bandwidth()/2)
            .attr("y", d => activityY(d.avgActivity) - 10)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("opacity", 0)
            .text(d => d.avgActivity.toFixed(1))
            .transition()
            .delay(800)
            .duration(500)
            .style("opacity", 1);
        
        // Temperature chart
        const tempMargin = {top: 40, right: 30, bottom: 70, left: 60};
        const tempWidth = document.getElementById('lightDarkTempChart').clientWidth - tempMargin.left - tempMargin.right;
        const tempHeight = 300 - tempMargin.top - tempMargin.bottom;
        
        d3.select("#lightDarkTempChart").html("");
        
        const tempSvg = d3.select("#lightDarkTempChart")
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
            .text("Temperature Comparison: Light vs Dark");
        
        // X scale for temperature
        const tempX = d3.scaleBand()
            .domain(data.map(d => d.condition))
            .range([0, tempWidth])
            .padding(0.4);
        
        // Y scale for temperature
        const tempY = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgTemp) * 1.05]) // Start from 0, add 5% padding at top
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
            .attr("y", -tempMargin.left + 5)
            .attr("x", -tempHeight / 2 )
            .attr("dy", "1em") 
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Average Body Temperature (°C)");
        
        // Create gradient for bars
        const tempGradient = tempSvg.append("defs")
            .append("linearGradient")
            .attr("id", "temp-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
            
        tempGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#e74c3c")
            .attr("stop-opacity", 1);
            
        tempGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#c0392b")
            .attr("stop-opacity", 0.8);
        
        // Add bars for temperature with animation
        tempSvg.selectAll(".temp-bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "temp-bar")
            .attr("x", d => tempX(d.condition))
            .attr("width", tempX.bandwidth())
            .attr("y", tempHeight) // Start from bottom for animation
            .attr("height", 0)     // Start with height 0 for animation
            .attr("fill", (d, i) => i === 0 ? "#34495e" : "url(#temp-gradient)")
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
            .transition()
            .duration(800)
            .attr("y", d => tempY(d.avgTemp))
            .attr("height", d => tempHeight - tempY(d.avgTemp));
        
        // Add labels for temperature bars
        tempSvg.selectAll(".temp-label")
            .data(data)
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
            .transition() // Add animation
            .delay(800)
            .duration(500)
            .style("opacity", 1);
    }
    
    //helper function for flexible y-axis range
    function calculateYAxisRange(data, valueFn, defaultMin, defaultMax, paddingFactor = 0.1) {
        // Get actual min and max from data
        const values = data.map(valueFn);
        const dataMin = d3.min(values);
        const dataMax = d3.max(values);
    
        // Calculate the range with padding
        const range = dataMax - dataMin;
        const padding = range * paddingFactor;
    
        const min = Math.min(defaultMin, dataMin - padding);
        const max = Math.max(defaultMax, dataMax + padding);
        return [min, max];
    }

    // Function to update charts based on selected mouse and day
    async function updateCharts(mouseId, day) {
        try {
            // Get data for the selected mouse and day
            const mouseData = await window.dataModule.getMouseDayData(mouseId, day);
            
            // Process data into hourly averages
            const hourlyAverages = window.dataModule.calculateHourlyAverages(mouseData);
            
            // Store current data
            currentHourlyData = hourlyAverages;
            
            // Update charts with new data
            createActivityChart(hourlyAverages);
            
            return hourlyAverages;
        } catch (error) {
            console.error("Error updating charts:", error);
            // Return empty array to indicate error
            return [];
        }
    }
    
    // Update gender statistic cards
    async function updateGenderCards() {
        try {
            const stats = await window.dataModule.getGenderStats();
            
            // Update male stats
            document.querySelector('.male-card .stat-value:nth-of-type(1)').textContent = stats.male.avgActivity.toFixed(1);
            document.querySelector('.male-card .stat-value:nth-of-type(2)').textContent = stats.male.avgTemp.toFixed(1) + '°C';
            
            // Update female stats
            document.querySelector('.female-card .stat-value:nth-of-type(1)').textContent = stats.female.avgActivity.toFixed(1);
            document.querySelector('.female-card .stat-value:nth-of-type(2)').textContent = stats.female.avgTemp.toFixed(1) + '°C';
        } catch (error) {
            console.error("Error updating gender cards:", error);
        }
    }
    
    return {
        createActivityChart,
        createLightDarkCharts,
        updateCharts,
        updateGenderCards,
        getCurrentData: () => currentHourlyData
    };
})();

window.chartsModule = chartsModule;